#!/bin/sh
# rebuild_full.sh —— 完整版 APK（视频课打包在内，一步到位分享；不安装到本机）
# 产物: CloudStudy-完整版.apk（约 400MB，微信可直接发送）
set -u
TOOLS=/var/minis/shared/cloudstudy-apk/tools
SRC=/var/minis/shared/cloudstudy-apk/src
WORK=/tmp/cloudbuild
DEVWORK=/data/data/com.openminis.app/files/alpine-rootfs/tmp/cloudbuild
OUT=/var/minis/shared/cloudstudy-apk/CloudStudy-完整版.apk
LOGDIR="$TOOLS/logs"; mkdir -p "$LOGDIR"
LOG="$LOGDIR/full.$(date +%Y%m%d-%H%M%S).log"; : > "$LOG"
log() { echo "[$(date +%T)] $*" | tee -a "$LOG"; }
fail() { log "!! FAILED: $*"; echo "FULL_RESULT=FAIL" >> "$LOG"; exit 1; }
run() { log "run: $*"; "$@" >> "$LOG" 2>&1 || fail "$*"; }

log "== 1/7 构建 assets 模式页面（视频用相对路径，随 APK 打包） =="
VIDEO_MODE=assets LIQ_OUT=/tmp/study_full.html timeout 900 python3 /var/minis/shared/worldskills-cloud/tools/build_liquid.py >> "$LOG" 2>&1 || fail "build_liquid"
[ -s /tmp/study_full.html ] || fail "study_full.html 为空"
log "study_full.html = $(stat -c %s /tmp/study_full.html) bytes"

log "== 2/7 铺工作目录 + 打包视频课 =="
rm -rf "$WORK"
mkdir -p "$WORK/assets" "$WORK/res"
cp "$SRC/AndroidManifest.xml" "$SRC/build_dev.sh" "$WORK/" || fail "cp 工程文件"
cp -r "$SRC/smali" "$WORK/smali" || fail "cp smali"
cp -r "$SRC/res/." "$WORK/res/" || fail "cp res"
cp /tmp/study_full.html "$WORK/assets/study.html" || fail "cp study_full"
(cd /var/minis/shared/worldskills-cloud && tar -cf - videos) | (cd "$WORK/assets" && tar -xf -) || fail "视频拷贝失败"
log "assets/videos = $(find "$WORK/assets/videos" -name '*.mp4' | wc -l) mp4, $(du -sm "$WORK/assets/videos" | cut -f1) MB"

log "== 3/7 smali → classes.dex =="
cd "$WORK" || fail "cd work"
run java -jar "$TOOLS/jars/smali.jar" assemble "$WORK/smali" -o "$WORK/classes.dex"
[ -s "$WORK/classes.dex" ] || fail "classes.dex 为空"

log "== 4/7 设备侧 aapt2（-0 mp4 直通） =="
android-shizuku-cli exec "cd $DEVWORK && rm -f out.apk res.zip build.log && setsid sh build_dev.sh > build.log 2>&1 < /dev/null & echo LAUNCHED" >> "$LOG" 2>&1 || fail "aapt2 派发失败"
i=0
while [ "$i" -lt 450 ]; do
  if grep -q BUILD_DONE "$WORK/build.log" 2>/dev/null; then break; fi
  if grep -qE 'COMPILE_FAIL|LINK_FAIL' "$WORK/build.log" 2>/dev/null; then
    fail "aapt2 内部失败: $(cat "$WORK/build.log")"
  fi
  i=$((i + 1))
  sleep 2
done
[ "$i" -lt 450 ] || fail "aapt2 超时（900s）"
log "aapt2 完成: out.apk = $(stat -c %s "$WORK/out.apk") bytes"

log "== 5/7 合并 dex =="
run python3 "$TOOLS/add_dex.py" "$WORK/out.apk" "$WORK/classes.dex" "$WORK/unsigned.apk"

log "== 6/7 签名 =="
run java -jar "$TOOLS/jars/uas.jar" --apks /tmp/cloudbuild/unsigned.apk --ks "$TOOLS/cloudstudy-release.keystore" --ksAlias cloudstudy --ksPass 'CloudStudy@2026' --ksKeyPass 'CloudStudy@2026' --skipZipAlign
SIGNED="$WORK/unsigned-signed.apk"
[ -s "$SIGNED" ] || fail "签名产物缺失"

log "== 7/7 归档 + 校验（不安装） =="
cp "$SIGNED" "$OUT" || fail "归档失败"
python3 -c "import zipfile;z=zipfile.ZipFile('$OUT');bad=z.testzip();print('ZIPCHECK','OK' if bad is None else 'BAD')" >> "$LOG" 2>&1
log "FULL_RESULT=OK apk=$OUT size=$(stat -c %s "$OUT")"
echo "FULL_RESULT=OK" >> "$LOG"
