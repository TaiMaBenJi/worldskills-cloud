#!/bin/sh
# 教程视频批量构建（18 集 t00-t17，可断点续跑）
cd /var/minis/shared/course-video
mkdir -p logs
PL=logs/build.log
echo "COURSE BUILD START $(date '+%F %T')" >> $PL
export VIDEO_ROOT=/var/minis/shared/course-video
for ch in 00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17; do
  if [ -s out/ep$ch.mp4 ]; then echo "skip $ch (done) $(date '+%H:%M:%S')" >> $PL; continue; fi
  echo "=== T$ch fix $(date '+%H:%M:%S')" >> $PL
  python3 /var/minis/shared/room-video/fix_tts.py scripts/t$ch.py >> $PL 2>&1
  echo "=== T$ch build $(date '+%H:%M:%S')" >> $PL
  python3 /var/minis/shared/room-video/build_episode.py scripts/t$ch.py >> logs/t$ch.log 2>&1
  RC=$?
  SZ=$(stat -c%s out/ep$ch.mp4 2>/dev/null || echo 0)
  echo "=== T$ch rc=$RC mp4=$SZ $(date '+%H:%M:%S')" >> $PL
  sleep 6
done
# 补漏一轮
for ch in 00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17; do
  if [ ! -s out/ep$ch.mp4 ]; then
    echo "=== RETRY T$ch $(date '+%H:%M:%S')" >> $PL
    python3 /var/minis/shared/room-video/fix_tts.py scripts/t$ch.py >> $PL 2>&1
    python3 /var/minis/shared/room-video/build_episode.py scripts/t$ch.py >> logs/t$ch.log 2>&1
    echo "=== RETRY T$ch rc=$? sz=$(stat -c%s out/ep$ch.mp4 2>/dev/null||echo 0) $(date '+%H:%M:%S')" >> $PL
  fi
done
CNT=$(ls out/*.mp4 2>/dev/null | wc -l)
echo "COURSE_MP4: $CNT/18 $(date '+%F %T')" >> $PL
# 拷贝到 worldskills-cloud/videos/course
mkdir -p /var/minis/shared/worldskills-cloud/videos/course/covers
cp out/*.mp4 /var/minis/shared/worldskills-cloud/videos/course/ 2>>$PL
for ch in 00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17; do
  cp frames/course/ep$ch/slide_00.png /var/minis/shared/worldskills-cloud/videos/course/covers/ep$ch.png 2>/dev/null
done
echo "COURSE_VIDEOS_COPIED: $(ls /var/minis/shared/worldskills-cloud/videos/course/*.mp4 2>/dev/null | wc -l) $(date '+%H:%M:%S')" >> $PL
echo "COURSE BUILD ALL DONE $(date '+%F %T')" >> $PL
