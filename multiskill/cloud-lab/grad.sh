#!/bin/bash
# ============================================================
# 模拟赛题 · 本地热身赛 —— 评分脚本（世赛 grad 风格）
# 用法: bash grad.sh   （需 root 权限，脚本会自动 sudo 提权）
# ============================================================
if [ "$(id -u)" -ne 0 ]; then echo "请用 root 运行: sudo bash grad.sh"; exit 1; fi

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
SCORE=0

pass() { echo -e "${GREEN}[PASS]${NC} $1 (+$2分)"; SCORE=$((SCORE+$2)); }
fail() { echo -e "${RED}[FAIL]${NC} $1 (+$2分) — $3"; }

echo "=============================================="
echo " 模拟赛题评分  $(date '+%Y-%m-%d %H:%M')"
echo "=============================================="

# ---------- 任务 1 · 用户与权限 (8分) ----------
echo ""
echo "--- 任务 1 · 用户与权限 ---"
grep -q "^dev:" /etc/group && pass "组 dev 存在" 2 || fail "组 dev 存在" 2 "groupadd dev"

id deployer >/dev/null 2>&1 && [ "$(id -gn deployer)" = "dev" ] && [ "$(getent passwd deployer | cut -d: -f7)" = "/bin/bash" ] \
  && pass "用户 deployer（主组 dev，shell bash）" 2 \
  || fail "用户 deployer（主组 dev，shell bash）" 2 "useradd -m -g dev -s /bin/bash deployer"

sudo -l -U deployer 2>/dev/null | grep -q "(ALL : ALL)" || sudo -l -U deployer 2>/dev/null | grep -q "ALL" \
  && pass "deployer 具有 sudo 权限" 2 \
  || fail "deployer 具有 sudo 权限" 2 "usermod -aG sudo deployer"

AK=/home/deployer/.ssh/authorized_keys
if [ -f "$AK" ] && [ "$(stat -c %a "$AK")" = "600" ] && [ "$(stat -c %U "$AK")" = "deployer" ]; then
  pass "SSH 密钥登录配置（存在/属主/权限600）" 2
else
  fail "SSH 密钥登录配置" 2 "mkdir -p /home/deployer/.ssh && chmod 700 ... && authorized_keys 600 属 deployer"
fi

# ---------- 任务 2 · Web 服务 (8分) ----------
echo ""
echo "--- 任务 2 · Web 服务 ---"
curl -s --max-time 5 http://localhost:8081/ | grep -q "WS-APP" \
  && pass "8081 站点页面包含 WS-APP" 4 \
  || fail "8081 站点页面包含 WS-APP" 4 "nginx server 块 listen 8081 + index.html"

[ "$(curl -s --max-time 5 http://localhost:8081/health)" = "healthy" ] \
  && pass "/health 返回 healthy" 4 \
  || fail "/health 返回 healthy" 4 "location = /health { return 200 \"healthy\"; }"

# ---------- 任务 3 · 自动化备份 (8分) ----------
echo ""
echo "--- 任务 3 · 自动化备份 ---"
[ -x /opt/scripts/backup.sh ] && pass "备份脚本存在且可执行" 2 || fail "备份脚本存在且可执行" 2 "/opt/scripts/backup.sh + chmod +x"

ls /backup/www-$(date +%Y%m%d).tar.gz >/dev/null 2>&1 && [ -s /backup/www-$(date +%Y%m%d).tar.gz ] \
  && pass "当天备份文件已生成: /backup/www-$(date +%Y%m%d).tar.gz" 3 \
  || fail "当天备份文件已生成" 3 "手动执行一次 backup.sh"

crontab -l 2>/dev/null | grep -qE "^[^#]*backup\.sh" && [ "$(crontab -l 2>/dev/null | grep -E '^[^#]*backup\.sh' | awk '{print $1,$2}')" = "0 2" ] \
  && pass "crontab 每天 02:00 执行备份" 3 \
  || fail "crontab 每天 02:00 执行备份" 3 "root: crontab -e → '0 2 * * * /opt/scripts/backup.sh'"

# ---------- 任务 4 · 容器化部署 (8分) ----------
echo ""
echo "--- 任务 4 · 容器化部署 ---"
docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "ws-api" && [ "$(docker port ws-api 2>/dev/null)" = "80/tcp -> 0.0.0.0:8082" -o "$(docker port ws-api 2>/dev/null | grep -c 8082)" -ge 1 ] \
  && pass "容器 ws-api 运行中（8082→80）" 3 \
  || fail "容器 ws-api 运行中（8082→80）" 3 "docker run -d --name ws-api -p 8082:80 httpd:alpine"

curl -s --max-time 5 http://localhost:8082/ | grep -q "WS-API" \
  && pass "8082 页面包含 WS-API" 5 \
  || fail "8082 页面包含 WS-API" 5 "docker exec ws-api sh -c 'echo WS-API > /usr/local/apache2/htdocs/index.html'"

# ---------- 总分 ----------
echo ""
echo "=============================================="
if [ "$SCORE" -ge 24 ]; then
  echo -e " 总分: ${GREEN}$SCORE / 32${NC}  ✅ 及格！"
  [ "$SCORE" -eq 32 ] && echo -e " ${GREEN}满分！你已经具备比赛的 Linux 基础设施能力。${NC}"
else
  echo -e " 总分: ${RED}$SCORE / 32${NC}  ❌ 未及格（24分及格），按 FAIL 项提示修复后重跑"
fi
echo "=============================================="
