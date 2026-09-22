#!/bin/bash
# 故障注入器 —— 模拟比赛排错题：sudo bash make_fault.sh <1|2|3>
# （只负责"搞破坏"，修复是你的任务）
[ "$(id -u)" -ne 0 ] && { echo "请用 root 运行: sudo bash $0"; exit 1; }
case "$1" in
  1) docker stop ws-lb-web2 >/dev/null && echo "已注入【故障 1】" ;;
  2) systemctl stop nginx && echo "已注入【故障 2】" ;;
  3) sed -i 's/127.0.0.1:8091/127.0.0.1:8099/; s/127.0.0.1:8092/127.0.0.1:8099/' /etc/nginx/sites-available/ws-lb \
     && (systemctl reload nginx 2>/dev/null || nginx -s reload) && echo "已注入【故障 3】" ;;
  *) echo "用法: sudo bash make_fault.sh 1|2|3"; exit 1 ;;
esac
