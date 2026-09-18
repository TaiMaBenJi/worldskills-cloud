#!/bin/sh
# CloudStudy APK 全量重建（幂等）—— study.html → 设备侧 aapt2 → dex → 签名 → 安装 → 归档
#
# 用法（必须后台派发，不要前台跑）:
#   nohup sh /var/minis/shared/cloudstudy-apk/tools/rebuild_apk.sh >/dev/null 2>&1 &
#   然后 file_read 读脚本自写的日志: tools/logs/rebuild.<ts>.log（末行 REBUILD_RESULT=OK/FAIL）
#
# 关键约束（血泪）:
#   - 设备侧 aapt2 link 要 1-3 分钟 → 后台跑 + BUILD_DONE 标记，不能只看产物是否存在
#   - 设备侧 pm install 从 alpine-rootfs 路径读取（沙箱 /tmp = 设备 .../alpine-rootfs/tmp）
#   - 签名用自有正式证书 tools/cloudstudy-release.keystore（口令 CloudStudy@2026，务必保管！）
set -u
TOOLS=/var/minis/shared/cloudstudy-apk/tools
SRC=/var/minis/shared/cloudstudy-apk/src
WORK=/tmp/cloudbuild
DEVWORK=/data/data/com.openminis.app/files/alpine-rootfs/tmp/cloudbuild
OUT=/var/minis/shared/cloudstudy-apk/CloudStudy-v1.0.apk
LOGDIR="$TOOLS/logs"
mkdir -p "$LOGDIR"
LOG="$LOGDIR/rebuild.$(date +%Y%m%d-%H%M%S).log"
: > "$LOG"

log() { echo "[$(date +%T)] $*" | tee -a "$LOG"; }
fail() { log "!! FAILED: $*"; echo "REBUILD_RESULT=FAIL" >> "$LOG"; exit 1; }
run() { log "run: $*"; "$@" >> "$LOG" 2>&1 || fail "$*"; }

log "LOG=$LOG"
log "== 1/8 build_liquid.py → study.html"
run timeout 900 python3 /var/minis/shared/worldskills-cloud/tools/build_liquid.py
[ -s /var/minis/shared/worldskills-cloud/study.html ] || fail "study.html 为空"

log "== 2/8 铺工作目录 $WORK"
rm -rf "$WORK"
mkdir -p "$WORK/assets" "$WORK/res"
cp "$SRC/AndroidManifest.xml" "$SRC/build_dev.sh" "$WORK/" || fail "cp 工程文件"
cp -r "$SRC/smali" "$WORK/smali" || fail "cp smali"
cp -r "$SRC/res/." "$WORK/res/" || fail "cp res"
cp /var/minis/shared/worldskills-cloud/study.html "$WORK/assets/study.html" || fail "cp study.html"
log "assets/study.html = $(stat -c %s "$WORK/assets/study.html") bytes"

log "== 3/8 smali → classes.dex"
cd "$WORK" || fail "cd work"
run java -jar "$TOOLS/jars/smali.jar" assemble "$WORK/smali" -o "$WORK/classes.dex"
[ -s "$WORK/classes.dex" ] || fail "classes.dex 为空"

log "== 4/8 设备侧 aapt2 compile+link（后台 + 标记）"
android-shizuku-cli exec "cd $DEVWORK && rm -f out.apk res.zip build.log && setsid sh build_dev.sh > build.log 2>&1 < /dev/null & echo LAUNCHED" >> "$LOG" 2>&1 \
  || fail "aapt2 派发失败（Shizuku 桥？）"
i=0
while [ "$i" -lt 150 ]; do
  if grep -q BUILD_DONE "$WORK/build.log" 2>/dev/null; then break; fi
  if grep -qE 'COMPILE_FAIL|LINK_FAIL' "$WORK/build.log" 2>/dev/null; then
    fail "aapt2 内部失败: $(cat "$WORK/build.log")"
  fi
  i=$((i + 1))
  sleep 2
done
[ "$i" -lt 150 ] || fail "aapt2 超时（300s 未见 BUILD_DONE）"
log "aapt2 完成，out.apk = $(stat -c %s "$WORK/out.apk") bytes"

log "== 5/8 合并 classes.dex"
run python3 "$TOOLS/add_dex.py" "$WORK/out.apk" "$WORK/classes.dex" "$WORK/unsigned.apk"

log "== 6/8 uber-apk-signer 签名"
run java -jar /var/minis/shared/cloudstudy-apk/tools/jars/uas.jar --apks /tmp/cloudbuild/unsigned.apk --ks /var/minis/shared/cloudstudy-apk/tools/cloudstudy-release.keystore --ksAlias cloudstudy --ksPass 'CloudStudy@2026' --ksKeyPass 'CloudStudy@2026' --skipZipAlign
SIGNED="$WORK/unsigned-signed.apk"
[ -s "$SIGNED" ] || fail "签名产物缺失"

log "== 7/8 安装到设备"
android-shizuku-cli exec "pm install -r $DEVWORK/unsigned-signed.apk" >> "$LOG" 2>&1 || fail "pm install"

log "== 8/8 启动验证 + 归档"
android-shizuku-cli exec "monkey -p com.cloudstudy.app -c android.intent.category.LAUNCHER 1" >> "$LOG" 2>&1
sleep 3
PID=$(android-shizuku-cli exec 'pidof com.cloudstudy.app' 2>/dev/null | tr -d '\r')
cp "$SIGNED" "$OUT" || fail "归档到 $OUT"
log "RESULT=OK pid=${PID:-?} apk=$OUT size=$(stat -c %s "$OUT")"
echo "REBUILD_RESULT=OK" >> "$LOG"
