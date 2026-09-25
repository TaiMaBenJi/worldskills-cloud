#!/bin/bash
# 给 student 终端加欢迎速查卡（打开终端即显示）
grep -q "WorldSkills" /home/student/.bashrc && { echo "已存在，跳过"; exit 0; }
cat >> /home/student/.bashrc <<'EOF'

# ===== WorldSkills 云计算实操环境速查 =====
echo "┌─────────────────────────────────────────────────┐"
echo "│  🐧 WorldSkills 云计算实操环境（student@ubuntu） │"
echo "├─────────────────────────────────────────────────┤"
echo "│  🌐 高可用平台   curl -k https://www.lab.local  │"
echo "│  📝 模拟赛题     cat ~/lab-task.md              │"
echo "│  🚨 注入故障     sudo bash ~/lab/make_fault.sh 1│"
echo "│  ✅ 排错体检     sudo bash ~/lab/check_lb.sh    │"
echo "│  🔧 重建平台     sudo bash ~/lab/build_lb.sh    │"
echo "│  📚 离线教程     Windows 打开 study.html        │"
echo "└─────────────────────────────────────────────────┘"
EOF

# 把 lab 脚本软链到用户主目录，敲 ~/lab/ 就能用
ln -sfn /mnt/d/Desktop/世界技能云计算/lab /home/student/lab
# 赛题任务卡放主目录
cp -n /mnt/d/Desktop/世界技能云计算/lab/mission.md /home/student/lab-task.md 2>/dev/null || true
chown -R student:student /home/student/.bashrc /home/student/lab /home/student/lab-task.md 2>/dev/null
echo "=== 终端欢迎条配置完成 ==="
