#!/bin/sh
# chain_guard.sh v2 —— WiFi 守卫：等到 WiFi 连接后 → 续跑下载 → 收尾 → 安装 → 重建「完整版」APK
# 全链自动化；日志: /opt/tmbj/cloudstudy-apk/chain_guard.log
BASE=/opt/tmbj/cloudstudy-apk
LOG=$BASE/chain_guard.log
log() { echo "[$(date +%T)] $*" >> "$LOG"; }

log "GUARD v2 START —— 等待 WiFi 连接（保护流量，不连不下载）"
i=0
while true; do
  i=$((i + 1))
  ok=0
  ip route 2>/dev/null | grep -m1 "^default" | grep -q "wlan" && ok=1
  if [ "$ok" = "0" ]; then
    adb exec 'cmd wifi status' 2>/dev/null | grep -qi "wifi is connected" && ok=1
  fi
  [ "$ok" = "1" ] && break
  [ $((i % 10)) -eq 0 ] && log "仍在等待 WiFi... ($i 轮)"
  sleep 120
done

log "WiFi 已连接 → 重启下载 workers"
cd "$BASE" || exit 1
WOFF=0 WSTEP=3 sh tools/bs_batch2.sh >> bs_w0.log 2>&1 &
WOFF=1 WSTEP=3 sh tools/bs_batch2.sh >> bs_w1.log 2>&1 &
WOFF=2 WSTEP=3 sh tools/bs_batch2.sh >> bs_w2.log 2>&1 &
wait

log "workers 结束 → finalize（命名统一 + 补漏 + 离线清单）"
sh tools/bs_finalize.sh >> "$LOG" 2>&1
log "finalize 完成 → 安装 B站课程到手机存储"
sh tools/bs_install.sh >> "$LOG" 2>&1

log "重建「完整版」APK（构建 → 安装到本机 → 更新下载目录）"
sh tools/rebuild_full.sh >> "$LOG" 2>&1
adb exec "pm install -r /data/data/com.tmbj.app/files/alpine-rootfs/tmp/cloudbuild/unsigned-signed.apk" >> "$LOG" 2>&1
adb exec 'cp /data/data/com.tmbj.app/files/tmbj-global/shared/cloudstudy-apk/CloudStudy-完整版.apk /sdcard/Download/CloudStudy.apk && echo DOWNLOAD_OK' >> "$LOG" 2>&1
log "CHAIN DONE ✔ —— 最终完整版已构建、安装、并更新到下载目录"
