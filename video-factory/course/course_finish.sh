#!/bin/sh
# 教程批次收尾：总览页 → 讲义 → 重建最终 APK（含全部视频）
cd /opt/tmbj/course-video
PL=logs/finish.log
echo "COURSE FINISH START $(date '+%F %T')" > $PL
# 保险：补齐视频拷贝（防 build_course 中途被重启导致拷贝缺失）
mkdir -p /opt/tmbj/worldskills-cloud/videos/course/covers
cp out/course/*.mp4 /opt/tmbj/worldskills-cloud/videos/course/ 2>>$PL
for ch in 00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17; do
  cp frames/course/ep$ch/slide_00.png /opt/tmbj/worldskills-cloud/videos/course/covers/ep$ch.png 2>/dev/null
done
echo "[pre] videos/course = $(ls /opt/tmbj/worldskills-cloud/videos/course/*.mp4 2>/dev/null | wc -l) mp4" >> $PL
python3 gen_course_video_md.py >> $PL 2>&1
python3 gen_course_handout.py >> $PL 2>&1
echo "== rebuild APK ==" >> $PL
sh /opt/tmbj/cloudstudy-apk/tools/rebuild_apk.sh > /dev/null 2>&1
RLOG=$(ls -t /opt/tmbj/cloudstudy-apk/tools/logs/rebuild.*.log | head -1)
echo "[fin] APK: $(tail -1 $RLOG)" >> $PL
echo "== GitHub final sync (30 videos + APK) ==" >> $PL
cd /opt/tmbj/worldskills-cloud && python3 -u tools/gh_video_sync.py --full >> $PL 2>&1
echo "[fin] GH sync rc=$?" >> $PL
echo "COURSE FINISH DONE $(date '+%F %T')" >> $PL
