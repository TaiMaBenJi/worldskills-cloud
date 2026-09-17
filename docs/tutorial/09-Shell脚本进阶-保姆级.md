# 第 9 章 · Shell 脚本进阶（把重复劳动交给电脑）

> 第 1 章你写过能跑的脚本。本章把脚本能力升到"能写比赛级工具"的水平：参数、函数、错误处理、日志、真实项目。
> 比赛中它是你的"外挂"（一键部署脚本）；工作中它是你涨薪的本钱（自动化 = 运维的核心价值）。
> 预计学习时间：2-3 周。

---

## 9.1 快速复习 + 三个新武器

### 复习（第 1 章）
```bash
#!/bin/bash
NAME="世界"                      # 变量（等号两边无空格）
echo "你好 $NAME"                # 使用变量
if [ -f /etc/passwd ]; then echo "有"; else echo "无"; fi
for i in 1 2 3; do echo $i; done
```

### 新武器 1：命令替换与算术
```bash
TODAY=$(date +%F)                # 把命令输出存进变量
COUNT=$(( 3 + 5 * 2 ))           # 算术运算（$((...))）
echo "$TODAY 结果=$COUNT"        # → 2026-09-16 结果=13
```

### 新武器 2：字符串操作
```bash
FILE="backup-2026-09-16.tar.gz"
echo ${FILE%.tar.gz}             # 去掉后缀 → backup-2026-09-16
echo ${FILE#backup-}             # 去掉前缀 → 2026-09-16.tar.gz
echo ${FILE:0:6}                 # 取前6个字符 → backup
echo ${#FILE}                    # 字符串长度
```
（`%` 删尾、`#` 删头，单符号删最短、双符号删最长。练三次就记住。）

### 新武器 3：真假与状态码 `$?`
```bash
ping -c 1 baidu.com > /dev/null
echo $?          # 上一条命令的"退出码"：0 = 成功，非 0 = 失败
```
**`$?` 是脚本世界的"判决书"。** 每个命令执行完都留下一个：0 代表成功，其他数字代表各种失败。

---

## 9.2 函数：把常用操作打包

```bash
#!/bin/bash

# 定义函数（两种写法等价）
log() {
    echo "[$(date +%F' '%T)] $*"
}

check_service() {
    local name="$1"                 # local = 只在这个函数里有效的变量
    if systemctl is-active --quiet "$name"; then
        log "服务 $name: 正常 ✓"
        return 0
    else
        log "服务 $name: 挂了 ✗"
        return 1
    fi
}

# 使用函数
log "开始巡检"
check_service nginx
check_service mysql
check_service ssh
```
要点：
- `$1` = 第一个参数，`$2` 第二个…… `$*` = 所有参数
- `local` 声明局部变量（好习惯，避免污染全局）
- `return 0/1` = 函数的"退出码"，调用处可以用 `if check_service nginx; then ...`

**这个脚本已经能当"服务巡检器"用了。**

---

## 9.3 数组与循环进阶

```bash
#!/bin/bash
SERVICES=(nginx mysql ssh cron)          # 数组：括号 + 空格分隔

echo "共 ${#SERVICES[@]} 个服务"          # 元素个数
for s in "${SERVICES[@]}"; do             # 遍历所有元素（引号+[@] 是标准姿势）
    echo "检查: $s"
done

# 数字循环
for i in {1..5}; do echo "第 $i 次"; done
for ((i=0; i<5; i++)); do echo "i=$i"; done     # C 风格

# while 循环（常用于"直到..."）
count=0
while [ $count -lt 3 ]; do
    echo "count=$count"
    count=$((count+1))
done

# 逐行读文件（经典套路）
while IFS= read -r line; do
    echo "读到: $line"
done < /etc/hosts
```

---

## 9.4 错误处理：让脚本"摔倒了会喊疼"

默认情况下 bash 脚本很"头铁"：一条命令失败了它还继续往下跑。三种让脚本变聪明的办法：

```bash
#!/bin/bash
set -e          # ★ 只要有任何命令失败(非零退出)，立即停止整个脚本
set -u          # ★ 用了未定义的变量就报错（防止 $PAHT 拼错导致的诡异行为）
set -o pipefail # 管道中任何一个命令失败都算失败

# trap：错误时执行"善后"（比如清理临时文件）
cleanup() {
    echo "清理临时文件..."
    rm -rf /tmp/mytask.$$
}
trap cleanup EXIT       # 无论脚本怎么退出，都执行 cleanup
```
**`set -euo pipefail` 这三连是现代脚本的"安全带"**，抄每一份正经脚本的开头。

**手写检查（set -e 之外的精细控制）：**
```bash
if ! mysqldump -u root db > /tmp/backup.sql 2>/dev/null; then
    echo "备份失败！" >&2      # >&2 = 输出到"错误通道"
    exit 1
fi
```

---

## 9.5 调试：脚本不听话怎么办

```bash
bash -x myscript.sh        # ★ 逐行打印执行过程（最重要调试手段）
# 输出里带 + 的是实际执行的命令，对照着看哪一步和你想的不一样

bash -n myscript.sh        # 只检查语法，不执行
```
**调试心法**：在可疑位置加 `echo "DEBUG: 变量X=$X"`,一层层缩小范围。

---

## 9.6 文本处理进阶（和脚本配合的黄金搭档）

### awk 进阶三招（会了这仨，处理日志横着走）
```bash
# ① 按条件筛选 + 求和
awk '$3 > 1000 {sum += $3} END {print "总计:", sum}' data.txt

# ② 按列过滤去重计数（分析访问日志的 IP 排行）
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# ③ 取分隔符字段 + 判断
awk -F: '$3 >= 1000 {print $1, $3}' /etc/passwd
```
（`sort | uniq -c | sort -rn` 是"统计排行榜"的万能连招——先排序、去重计数、再按数量倒排。）

### sed 进阶
```bash
sed -n '10,20p' file.txt              # 只打印第 10-20 行
sed '/^#/d' config.conf               # 删除所有注释行
sed 's/old/new/g; s/foo/bar/g' f.txt  # 多条替换连写
sed -i.bak 's/x/y/g' f.txt            # 改文件并留一份 .bak 备份（好习惯）
```

### 把这一切串起来的实战：日志分析报告
```bash
#!/bin/bash
set -euo pipefail
LOG="/var/log/nginx/access.log"
echo "===== Nginx 日志报告 $(date +%F) ====="
echo "总请求数: $(wc -l < $LOG)"
echo "--- TOP 10 访问 IP ---"
awk '{print $1}' "$LOG" | sort | uniq -c | sort -rn | head -10
echo "--- 状态码分布 ---"
awk '{print $9}' "$LOG" | sort | uniq -c | sort -rn
echo "--- 最热路径 TOP 5 ---"
awk '{print $7}' "$LOG" | sort | uniq -c | sort -rn | head -5
```
**这份脚本放上服务器，每天定时跑一次，你就是有"数据能力"的运维了。**

---

## 9.7 参数处理：让脚本像正规工具

```bash
#!/bin/bash
# 用法: ./deploy.sh -e prod -v 1.0.0
set -euo pipefail

ENV="dev"; VER=""

while getopts "e:v:h" opt; do
    case $opt in
        e) ENV="$OPTARG" ;;
        v) VER="$OPTARG" ;;
        h) echo "用法: $0 -e 环境 -v 版本"; exit 0 ;;
        *) echo "未知参数"; exit 1 ;;
    esac
done

echo "部署环境: $ENV, 版本: $VER"
```
运行 `./deploy.sh -e prod -v 1.0.0` → "部署环境: prod, 版本: 1.0.0"。
**这就是"带参数的正规命令行工具"的写法**（第 1 章的 rm -f 里的 -f 就是这个机制）。

---

## 9.8 实战脚本 3 连（拿来就能用）

### 9.8.1 系统巡检报告（每天发给自己）
```bash
#!/bin/bash
set -euo pipefail
echo "===== 系统巡检 $(date) ====="
echo "[CPU] 负载: $(uptime | awk -F'load average:' '{print $2}')"
echo "[内存] $(free -h | awk '/Mem:/ {print "总:"$2" 已用:"$3" 可用:"$7}')"
echo "[磁盘] $(df -h / | awk 'NR==2 {print "根分区已用 "$5" ("$3"/"$2")"}')"
echo "[服务]"
for s in nginx mysql ssh; do
    systemctl is-active --quiet "$s" && echo "  $s: OK" || echo "  $s: FAIL"
done
echo "[最近的错误日志]"
journalctl -p err --since "1 hour ago" --no-pager | tail -5 || true
```
（`|| true` = "出错也别让脚本挂"——配合 set -e 的逃生口。）

### 9.8.2 批量备份 + 自动清理（生产级）
```bash
#!/bin/bash
set -euo pipefail
SRC_DIRS="/etc /home /var/www"
DEST="/backup"
KEEP_DAYS=7
STAMP=$(date +%F-%H%M)
mkdir -p "$DEST"

for dir in $SRC_DIRS; do
    name=$(basename "$dir")
    tar -czf "$DEST/${name}-${STAMP}.tar.gz" "$dir" 2>/dev/null
    echo "已备份 $dir → ${name}-${STAMP}.tar.gz"
done

# 清理超过 7 天的旧备份
find "$DEST" -name "*.tar.gz" -mtime +$KEEP_DAYS -print -delete
echo "清理完成，当前备份："
ls -lh "$DEST" | tail -10
```

### 9.8.3 一键部署脚本（比赛神器）
```bash
#!/bin/bash
# deploy.sh —— 一键部署静态网站 + 后端服务
set -euo pipefail
SITE_NAME="${1:?用法: $0 站点名}"     # ${1:?提示} = 没传参数就报错退出
ROOT="/var/www/$SITE_NAME"

log() { echo -e "\033[32m[$(date +%T)] $*\033[0m"; }   # 绿色日志
err() { echo -e "\033[31m[错误] $*\033[0m" >&2; }

log "1/4 创建站点目录 $ROOT"
sudo mkdir -p "$ROOT"

log "2/4 写入首页"
echo "<h1>$SITE_NAME is running</h1>" | sudo tee "$ROOT/index.html" > /dev/null

log "3/4 配置 Nginx"
sudo tee "/etc/nginx/sites-available/$SITE_NAME.conf" > /dev/null <<EOF
server {
    listen 80;
    server_name $SITE_NAME.local;
    root $ROOT;
    index index.html;
}
EOF
sudo ln -sf "/etc/nginx/sites-available/$SITE_NAME.conf" /etc/nginx/sites-enabled/

log "4/4 测试并重载"
sudo nginx -t && sudo systemctl reload nginx
log "部署完成！测试: curl -H 'Host: $SITE_NAME.local' http://localhost"
```
**跑一遍 `./deploy.sh demo`——一个命令部署整个网站。** 比赛时把手动步骤都变成这样的脚本，就是韩国选手 `make up` 一刀流背后的秘密。

---

## 9.9 练习与自我检验

### 练习
1. 写一个脚本 `check.sh`：接受一个服务名参数，输出"该服务运行中/未运行"（用 `$?` 和 `systemctl`）
2. 写一个脚本：统计你系统里所有 `.log` 文件的总大小
3. 写一个脚本：把 `/etc/passwd` 里所有真人用户（UID≥1000）打印成"用户名 (UID)"格式
4. 给第 3 个脚本加上 `set -euo pipefail` 和参数处理（-f 指定文件）
5. 把 9.8.1 的巡检报告配成 crontab，每天早上 8 点输出到 `/var/log/daily-check.log`
6. （挑战）写一个"竞速脚本"：随机生成 1000 个文件，然后统计处理耗时

<details><summary>练习 2 参考答案</summary>

```bash
#!/bin/bash
set -euo pipefail
total=0
while IFS= read -r f; do
    size=$(stat -c%s "$f")
    total=$((total + size))
done < <(find /var/log -name "*.log" 2>/dev/null)
echo "总大小: $((total / 1024 / 1024)) MB"
```
（`< <(...)` 是"进程替换"，把 find 的输出喂给 while——进阶技巧，见过即可。）
</details>

### 自检清单
- [ ] 我会写带参数的函数，理解 `return`/`$?`/`$1`
- [ ] 我背得出 `set -euo pipefail` 并知道每个字母的作用
- [ ] 我用过 `bash -x` 调试脚本
- [ ] 我会用 `sort | uniq -c | sort -rn` 做排行榜统计
- [ ] 我写出了 3 个"生产级"脚本（备份/巡检/部署）
- [ ] 我知道 `${1:?提示}`、`|| true`、`tee` 这些实用技巧

### 对应真题
- 世界赛 Module A：A10-02（备份脚本检查）、A15（Ansible 本质就是"批量脚本"）
- 世界赛 Module B：用 PowerShell 脚本批量建用户
- 韩国赛：整套 Makefile + 脚本化操作 = 本章能力的工程化形态
