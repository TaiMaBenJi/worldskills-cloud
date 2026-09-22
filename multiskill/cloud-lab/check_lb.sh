#!/bin/bash
# 实战系统体检 —— 排错演练修复后用它验证
# 用法: sudo bash check_lb.sh
[ "$(id -u)" -ne 0 ] && { echo "请用 root 运行: sudo bash $0"; exit 1; }
ok=1
echo "--- 体检开始 $(date '+%H:%M:%S') ---"
for c in ws-lb-web1 ws-lb-web2; do
  docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$c" || { echo "[DOWN] 容器 $c 未运行"; ok=0; }
done
systemctl is-active --quiet nginx || { echo "[DOWN] nginx 服务未运行"; ok=0; }
nginx -t 2>&1 | grep -q successful || { echo "[BAD] nginx 配置有语法错误（运行 nginx -t 看详情）"; ok=0; }
grep -q "www.lab.local" /etc/hosts || { echo "[BAD] 域名解析丢失（/etc/hosts）"; ok=0; }
resp=""
for n in 1 2 3 4; do resp="$resp$(curl -sk --max-time 3 https://www.lab.local)"; done
echo "$resp" | grep -q "Backend-" || { echo "[BAD] https://www.lab.local 无正常响应（自己 curl 一下看返回什么）"; ok=0; }
if [ $ok -eq 1 ]; then
  echo "✅ 系统完全健康：容器×2 运行中、nginx 正常、配置无误、HTTPS 通路正常"
else
  echo "❌ 还有故障未修复，继续排查"
fi
