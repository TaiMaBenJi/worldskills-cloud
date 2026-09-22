#!/bin/bash
# ============================================================
# 模拟赛题 · 网络系统管理 —— 评分脚本（世赛 grad 风格）
# 用法: sudo bash grad_netsys.sh   （需 root）
# ============================================================
if [ "$(id -u)" -ne 0 ]; then echo "请用 root 运行: sudo bash grad_netsys.sh"; exit 1; fi

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
SCORE=0
pass() { echo -e "${GREEN}[PASS]${NC} $1 (+$2分)"; SCORE=$((SCORE+$2)); }
fail() { echo -e "${RED}[FAIL]${NC} $1 (+$2分) — $3"; }

echo "=============================================="
echo " 网络系统管理 · 模拟赛题评分  $(date '+%Y-%m-%d %H:%M')"
echo "=============================================="

# ---------- 任务 1 · DNS (8分) ----------
echo ""
echo "--- 任务 1 · DNS 服务器 ---"
systemctl is-active --quiet named && pass "bind9 服务运行中" 1 || fail "bind9 服务运行中" 1 "systemctl enable --now named"

[ "$(dig @127.0.0.1 www.wsnet.local A +short 2>/dev/null | head -1)" = "192.168.100.10" ] \
  && pass "www.wsnet.local → 192.168.100.10" 2 || fail "www.wsnet.local A 记录" 2 "正向区 db.wsnet.local 加 A 记录"

[ "$(dig @127.0.0.1 ns1.wsnet.local A +short 2>/dev/null | head -1)" = "192.168.100.1" ] \
  && pass "ns1.wsnet.local → 192.168.100.1" 1 || fail "ns1.wsnet.local A 记录" 1 "正向区加 NS/A 记录"

dig @127.0.0.1 app.wsnet.local CNAME +short 2>/dev/null | grep -q "www.wsnet.local" \
  && pass "app.wsnet.local CNAME → www" 2 || fail "app CNAME 记录" 2 "app IN CNAME www"

dig @127.0.0.1 -x 192.168.100.10 +short 2>/dev/null | grep -q "www.wsnet.local" \
  && pass "反向解析 192.168.100.10 → www.wsnet.local" 2 || fail "反向 PTR 记录" 2 "反向区 100.168.192.in-addr.arpa + PTR 10"

# ---------- 任务 2 · Samba (6分) ----------
echo ""
echo "--- 任务 2 · Samba 共享 ---"
systemctl is-active --quiet smbd && pass "smbd 服务运行中" 1 || fail "smbd 服务运行中" 1 "systemctl enable --now smbd"

testparm -s 2>/dev/null | grep -A5 "^\[wsdata\]" | grep -q "/srv/wsdata" \
  && pass "[wsdata] 共享段 path=/srv/wsdata" 3 || fail "[wsdata] 共享段配置" 3 "smb.conf 追加 [wsdata] path=/srv/wsdata"

smbclient -L //127.0.0.1 -N 2>/dev/null | grep -qw wsdata \
  && pass "匿名可浏览共享列表含 wsdata" 2 || fail "匿名浏览共享列表" 2 "global 加 map to guest = Bad User + guest ok = yes"

# ---------- 任务 3 · NFS (6分) ----------
echo ""
echo "--- 任务 3 · NFS 导出与挂载 ---"
systemctl is-active --quiet nfs-server && pass "nfs-server 服务运行中" 1 || fail "nfs-server 服务运行中" 1 "systemctl enable --now nfs-server"

showmount -e 127.0.0.1 2>/dev/null | grep -q "/srv/nfs/ws" \
  && pass "showmount 显示 /srv/nfs/ws 导出" 2 || fail "/srv/nfs/ws 导出" 2 "/etc/exports + exportfs -ra"

mountpoint -q /mnt/nfs-test && grep -q "ok" /mnt/nfs-test/probe.txt 2>/dev/null \
  && pass "已挂载且 probe.txt 内容 ok" 3 || fail "挂载 + probe.txt" 3 "mount -t nfs4 127.0.0.1:/srv/nfs/ws /mnt/nfs-test 后写文件"

# ---------- 任务 4 · vsftpd (6分) ----------
echo ""
echo "--- 任务 4 · FTP 服务 ---"
systemctl is-active --quiet vsftpd && pass "vsftpd 服务运行中" 1 || fail "vsftpd 服务运行中" 1 "systemctl enable --now vsftpd"

[ -n "$(curl -s --max-time 5 --user student:123456 ftp://127.0.0.1/ 2>/dev/null)" ] \
  && pass "student 可登录 FTP 列出目录" 2 || fail "student 登录 FTP" 2 "local_enable=YES + systemctl restart vsftpd"

[ -s /home/student/ws-ftp-upload.txt ] \
  && pass "上传文件已落在 /home/student/" 3 || fail "FTP 上传文件" 3 "curl -T /tmp/ws-ftp-upload.txt --user student:123456 ftp://127.0.0.1/"

# ---------- 任务 5 · systemd timer (6分) ----------
echo ""
echo "--- 任务 5 · systemd 定时器 ---"
[ -f /etc/systemd/system/ws-clean.service ] && [ -f /etc/systemd/system/ws-clean.timer ] \
  && pass "service + timer 单元文件存在" 1 || fail "单元文件存在" 1 "/etc/systemd/system/ws-clean.{service,timer}"

systemctl is-enabled --quiet ws-clean.timer 2>/dev/null && pass "ws-clean.timer 开机自启" 2 || fail "timer 自启" 2 "systemctl enable ws-clean.timer"

systemctl list-timers --no-legend 2>/dev/null | grep -q "ws-clean.timer" \
  && pass "list-timers 中可见（已激活）" 1 || fail "timer 已激活" 1 "systemctl enable --now ws-clean.timer"

[ -s /var/lib/ws-clean/last-run ] \
  && pass "last-run 时间戳文件已生成" 2 || fail "last-run 文件" 2 "systemctl start ws-clean.service（脚本内 date > last-run）"

# ---------- 总分 ----------
echo ""
echo "=============================================="
if [ "$SCORE" -ge 24 ]; then
  echo -e " 总分: ${GREEN}$SCORE / 32${NC}  ✅ 及格！"
  [ "$SCORE" -eq 32 ] && echo -e " ${GREEN}满分！DNS/文件/FTP/自动化 四大件全部拿下。${NC}"
else
  echo -e " 总分: ${RED}$SCORE / 32${NC}  ❌ 未及格（24分及格），按 FAIL 项提示修复后重跑"
fi
echo "=============================================="
