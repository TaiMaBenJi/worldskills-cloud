#!/bin/sh
# 健壮版：修复+构建 ep04-12 + 收尾（可反复运行，自动跳过已完成）
cd /var/minis/shared/room-video
PL=logs/fixfinish.log
echo "FIXFINISH START $(date '+%F %T')" >> $PL
mkdir -p /var/minis/shared/worldskills-cloud/videos/covers

for ep in 04 05 06 07 08 09 10 11 12; do
  if [ -s out/ep$ep.mp4 ]; then echo "skip $ep (done) $(date '+%H:%M:%S')" >> $PL; continue; fi
  echo "=== EP$ep fix $(date '+%H:%M:%S')" >> $PL
  python3 fix_tts.py scripts/ep$ep.py >> $PL 2>&1
  echo "=== EP$ep build $(date '+%H:%M:%S')" >> $PL
  python3 build_episode.py scripts/ep$ep.py >> logs/ep$ep.log 2>&1
  RC=$?
  SZ=$(stat -c%s out/ep$ep.mp4 2>/dev/null || echo 0)
  echo "=== EP$ep rc=$RC mp4=$SZ $(date '+%H:%M:%S')" >> $PL
  sleep 5
done

# 补漏一轮
MISS=""
for ep in 04 05 06 07 08 09 10 11 12; do
  [ -s out/ep$ep.mp4 ] || MISS="$MISS $ep"
done
if [ -n "$MISS" ]; then
  echo "=== RETRY PASS:$MISS $(date '+%H:%M:%S')" >> $PL
  for ep in $MISS; do
    python3 fix_tts.py scripts/ep$ep.py >> $PL 2>&1
    python3 build_episode.py scripts/ep$ep.py >> logs/ep$ep.log 2>&1
    echo "=== RETRY EP$ep rc=$? sz=$(stat -c%s out/ep$ep.mp4 2>/dev/null||echo 0) $(date '+%H:%M:%S')" >> $PL
  done
fi
CNT=$(ls out/*.mp4 2>/dev/null | wc -l)
echo "== ALL_MP4: $CNT/12 ==" >> $PL

# ---- 收尾 ----
cp out/*.mp4 /var/minis/shared/worldskills-cloud/videos/ 2>>$PL
for ep in 01 02 03 04 05 06 07 08 09 10 11 12; do
  cp frames/ep$ep/slide_00.png /var/minis/shared/worldskills-cloud/videos/covers/ep$ep.png 2>/dev/null
done
echo "== videos copied: $(ls /var/minis/shared/worldskills-cloud/videos/*.mp4 2>/dev/null | wc -l) ==" >> $PL
python3 gen_video_md.py >> $PL 2>&1
python3 gen_handout.py >> $PL 2>&1
python3 qa_check.py > logs/qa.log 2>&1
echo "== QA done $(date '+%H:%M:%S')" >> $PL
sh /var/minis/shared/cloudstudy-apk/tools/rebuild_apk.sh > /dev/null 2>&1
RLOG=$(ls -t /var/minis/shared/cloudstudy-apk/tools/logs/rebuild.*.log | head -1)
echo "[fin] APK: $(tail -1 $RLOG)" >> $PL
echo "FIXFINISH_DONE $(date '+%F %T')" >> $PL
