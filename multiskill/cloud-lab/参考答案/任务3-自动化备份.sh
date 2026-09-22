#!/bin/bash
# 演示 · 任务3：自动化备份（8分）
echo '=== [任务3-1] 编写备份脚本 ==='
mkdir -p /opt/scripts /backup
cat > /opt/scripts/backup.sh <<'EOF'
#!/bin/bash
# 每日备份 /var/www → /backup/www-日期.tar.gz
tar -czf /backup/www-$(date +%Y%m%d).tar.gz /var/www 2>/dev/null
echo "备份完成: /backup/www-$(date +%Y%m%d).tar.gz"
EOF
chmod +x /opt/scripts/backup.sh
ls -l /opt/scripts/backup.sh

echo
echo '=== [任务3-2] 手动执行一次 ==='
/opt/scripts/backup.sh
ls -lh /backup/

echo
echo '=== [任务3-3] 配置 root 的 crontab（每天 02:00）==='
(crontab -l 2>/dev/null | grep -v backup.sh; echo '0 2 * * * /opt/scripts/backup.sh') | crontab -
echo '--- 当前 root 的定时任务:'
crontab -l

echo
echo '>>> 任务3 完成，3 项提交'
