#!/bin/sh
# 总控链：等机房收尾 → 教程 18 集构建 → 教程收尾（最终 APK）
cd /var/minis/shared/room-video
PL=logs/grand.log
echo "GRAND START $(date '+%F %T')" > $PL
# 1) 等机房 fix_and_finish 完成（最多 100 分钟）
i=0
while [ $i -lt 200 ]; do
  if grep -q "FIXFINISH_DONE" logs/fixfinish.log 2>/dev/null; then break; fi
  i=$((i+1)); sleep 30
done
echo "[1] fixfinish wait done (i=$i) $(date '+%H:%M:%S')" >> $PL
# 2) 教程批量构建（18 集，含各自 fix_tts）
sh /var/minis/shared/course-video/build_course.sh
echo "[2] course build rc=$? $(date '+%H:%M:%S')" >> $PL
CNT=$(ls /var/minis/shared/course-video/out/*.mp4 2>/dev/null | wc -l)
echo "[2] course mp4 = $CNT/18" >> $PL
# 3) 教程收尾（总览 + 讲义 + 重建最终 APK）
sh /var/minis/shared/course-video/course_finish.sh
echo "[3] course finish rc=$? $(date '+%H:%M:%S')" >> $PL
echo "GRAND DONE $(date '+%F %T')" >> $PL
