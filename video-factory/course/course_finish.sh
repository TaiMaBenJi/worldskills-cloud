#!/bin/sh
# 教程批次收尾：总览页 → 讲义 → 重建最终 APK（含全部视频）
cd /var/minis/shared/course-video
PL=logs/finish.log
echo "COURSE FINISH START $(date '+%F %T')" > $PL
python3 gen_course_video_md.py >> $PL 2>&1
python3 gen_course_handout.py >> $PL 2>&1
echo "== rebuild APK ==" >> $PL
sh /var/minis/shared/cloudstudy-apk/tools/rebuild_apk.sh > /dev/null 2>&1
RLOG=$(ls -t /var/minis/shared/cloudstudy-apk/tools/logs/rebuild.*.log | head -1)
echo "[fin] APK: $(tail -1 $RLOG)" >> $PL
echo "COURSE FINISH DONE $(date '+%F %T')" >> $PL
