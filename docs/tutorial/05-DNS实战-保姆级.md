# 第 5 章 · DNS 与域名体系实战（亲手搭一台"通讯录服务器"）

> 第 2 章你知道了"DNS 是互联网的通讯录"。本章你要**亲手搭一台 DNS 服务器**：自己管的域名、正向反向解析、主从复制——全配一遍。
> 这是世界赛 Module A（A04、A13 评分点）和 Module B（NW-SRV 评分点）的核心考点，也是很多公司内部系统的刚需。
> 预计学习时间：1-2 周。

---

## 5.1 先复习 + 补三个新概念

### 复习（第 2 章）
- DNS 把域名翻译成 IP。
- 查询命令：`dig baidu.com`、`nslookup baidu.com`

### 新概念 1：权威服务器 vs 递归服务器
| 角色 | 干什么 | 例子 |
|------|--------|------|
| **权威服务器**（Authoritative） | "这个域名归我管，问我准没错" | 你马上要搭的那台 |
| **递归服务器**（Recursive/Resolver） | "你问啥我都帮你四处打听" | 运营商 DNS、8.8.8.8 |

> 比喻：权威服务器 = 派出所户籍科（档案就在他那）；递归服务器 = 114 查号台（他会帮你转接各个部门）。

### 新概念 2：区域（Zone）与区域文件
一个域名（比如 `mycompany.local`）的全部记录写成文件，就是**区域文件（zone file）**。里面是一行行的"记录"。

### 新概念 3：各种记录类型（**考试和面试天天见**）
| 类型 | 含义 | 例子 |
|------|------|------|
| **A** | 域名 → IPv4 地址 | `www  A  192.168.1.10` |
| **AAAA** | 域名 → IPv6 地址 | `www  AAAA  2001:db8::10` |
| **CNAME** | 别名 → 另一个域名 | `blog  CNAME  www`（blog 是 www 的小名） |
| **MX** | 邮件服务器地址 | `@  MX 10 mail.mycompany.local` |
| **TXT** | 文本备注（验证域名、反垃圾） | `@  TXT "v=spf1 ..."` |
| **NS** | 这个域名由哪台服务器管 | `@  NS  ns1.mycompany.local` |
| **PTR** | IP → 域名（反向解析专用） | `10  PTR  www.mycompany.local` |
| **SOA** | 区域的"出生证明"（主服务器、序列号等） | 每个区域文件第一行 |

---

## 5.2 实战：搭建 BIND9（Linux 世界最标准的 DNS 软件）

### 5.2.1 安装
```bash
sudo apt update
sudo apt install -y bind9 bind9utils dnsutils
sudo systemctl status bind9     # 确认 running
```

### 5.2.2 认识配置文件
```bash
ls /etc/bind/
```
关键文件：
```
/etc/bind/named.conf            ← 总配置（它只是"入口"）
/etc/bind/named.conf.options    ← 全局选项（转发器、监听地址等）
/etc/bind/named.conf.local      ← 我们写"管哪些域名"的地方 ★
/etc/bind/db.local              ← 示例区域文件（拿它当模板）
```

### 5.2.3 第一步：告诉 BIND "你来管 mycompany.local 这个域名"
```bash
sudo nano /etc/bind/named.conf.local
```
加入：
```conf
zone "mycompany.local" {
    type master;                          // 我是主服务器
    file "/etc/bind/zones/db.mycompany";  // 数据在这个文件里
};

zone "1.168.192.in-addr.arpa" {           // 反解区域（名字是网络号倒着写）
    type master;                          // 关于 192.168.1.x 的 IP→域名 查询
    file "/etc/bind/zones/db.192.168.1";
};
```
**解释反解区名的由来**：`192.168.1.x` 要倒着写成 `1.168.192.in-addr.arpa`（这是 DNS 规定的格式，照写即可）。

### 5.2.4 第二步：写正向区域文件（域名→IP）
```bash
sudo mkdir -p /etc/bind/zones
sudo nano /etc/bind/zones/db.mycompany
```
写入（**逐行给你注释**）：
```bind
;
; mycompany.local 的区域文件
;
$TTL 604800                     ; 缓存存活时间（秒），一周
@       IN      SOA     ns1.mycompany.local. admin.mycompany.local. (
                              2026091601      ; 序列号（改动后必须+1，从服务器靠它判断更新！）
                              604800          ; 刷新时间
                              86400           ; 重试时间
                              2419200         ; 过期时间
                              604800 )        ; 否定缓存 TTL

; 名字服务器记录（谁管这个域名）
@       IN      NS      ns1.mycompany.local.

; 主机记录（★用得最多）
ns1     IN      A       192.168.1.10        ; DNS 服务器自己
www     IN      A       192.168.1.10        ; 网站
mail    IN      A       192.168.1.20        ; 邮件服务器
@       IN      A       192.168.1.10        ; "@代表域名本身"（mycompany.local 直接访问也指向它）

; 别名
blog    IN      CNAME   www                 ; blog.mycompany.local 是 www 的别名

; 邮件
@       IN      MX      10 mail.mycompany.local.
```
**三个必记细节（评分脚本盯的就是这些）**：
1. **每条记录末尾有 `.`（点）的才是完整域名**！`ns1.mycompany.local.`（带点）≠ `ns1.mycompany.local`（不带点，会被自动补上区域名变成 `ns1.mycompany.local.mycompany.local`——经典翻车点）。
2. `@` 代表"区域名本身"。
3. SOA 里的**序列号**改一次记录要 +1。

### 5.2.5 第三步：写反向区域文件（IP→域名）
```bash
sudo nano /etc/bind/zones/db.192.168.1
```
```bind
$TTL 604800
@       IN      SOA     ns1.mycompany.local. admin.mycompany.local. (
                              2026091601
                              604800 86400 2419200 604800 )

@       IN      NS      ns1.mycompany.local.

; 反向记录：把 IP 的最后一段写在最前面
10      IN      PTR     www.mycompany.local.     ; 192.168.1.10 → www.mycompany.local
10      IN      PTR     ns1.mycompany.local.     ; 同一个IP可以对应多个名字
20      IN      PTR     mail.mycompany.local.
```

### 5.2.6 第四步：检查 + 启动（**三步验证，每一步都要做**）
```bash
# ① 检查配置文件语法
sudo named-checkconf
# 没有任何输出 = 语法 OK（有问题它会告诉你第几行）

# ② 检查两个区域文件的语法
sudo named-checkzone mycompany.local /etc/bind/zones/db.mycompany
sudo named-checkzone 1.168.192.in-addr.arpa /etc/bind/zones/db.192.168.1
# 输出关键行：zone mycompany.local/IN: loaded serial 2026091601   → OK！

# ③ 重启服务
sudo systemctl restart bind9
sudo systemctl status bind9     # active (running)
```

### 5.2.7 第五步：验证（查询自己的 DNS 服务器！）
```bash
# 问本机 DNS 要 www 的 IP
dig @127.0.0.1 www.mycompany.local

# 看 ANSWER SECTION：
# www.mycompany.local.  604800  IN  A  192.168.1.10   ← 对上了！
```
逐条试：
```bash
dig @127.0.0.1 blog.mycompany.local          # CNAME → 会显示两级：blog→www→IP
dig @127.0.0.1 mycompany.local               # @ 记录
dig -x 192.168.1.20 @127.0.0.1               # ★ -x = 反向查询：IP→域名
dig @127.0.0.1 mycompany.local MX            # 查邮件记录
dig @127.0.0.1 mycompany.local NS            # 查名字服务器
```
**五个查询全对 → 你搭好了一台真正的 DNS 服务器！**

### 5.2.8 让系统真的用你这台 DNS（可选）
```bash
# 临时指定（每次查询时用）——上面 dig @127.0.0.1 就是这种方式
# 永久指定（把系统 DNS 换成本机）：
sudo nano /etc/resolv.conf
# 把 nameserver 那行改成：
nameserver 127.0.0.1
# 然后：
nslookup www.mycompany.local     # 不带 @ 也走我们的服务器了
```
> 注意：云服务器上的 resolv.conf 常被网络服务自动覆盖。练习用 dig @ 指定最省事。

---

## 5.3 进阶：主从复制（两台 DNS，坏一台不慌）

**为什么要主从？** 一台 DNS 挂了，整个公司的网络就"瞎"了（所有域名都解析不了）。所以生产上都至少两台：**主（master）+ 从（slave）**。从服务器自动同步主的记录。

### 5.3.1 演练环境
- 主服务器：假设 IP 是 192.168.1.10（你现在的机器）
- 从服务器：另一台 Linux 虚拟机，IP 192.168.1.11（没有第二台机器？就先把配置写出来，逻辑看懂即可）

### 5.3.2 主服务器加一条"允许谁来同步"
在 `named.conf.local` 的 zone 里加上：
```conf
zone "mycompany.local" {
    type master;
    file "/etc/bind/zones/db.mycompany";
    allow-transfer { 192.168.1.11; };     // ★ 只允许从服务器拉数据
};
```

### 5.3.3 从服务器上配置（在 192.168.1.11 上）
```bash
sudo apt install -y bind9
sudo nano /etc/bind/named.conf.local
```
```conf
zone "mycompany.local" {
    type slave;                              // 我是从服务器
    masters { 192.168.1.10; };               // 跟谁同步
    file "/var/cache/bind/db.mycompany.slave";  // 同步来的数据存哪（自动生成）
};
```
```bash
sudo named-checkconf && sudo systemctl restart bind9
ls /var/cache/bind/          # 等几秒，应该出现 db.mycompany.slave
dig @192.168.1.11 www.mycompany.local   # 从服务器能解析 = 主从打通！
```
**验证同步**：在主服务器改个记录（改完记得序列号 +1 → `systemctl restart bind9`），到从服务器 `dig` 看新记录出现没。（主从的坑基本都在：序列号没加、allow-transfer 没配置、防火墙拦了 53 端口。）

### 5.3.4 测试"主挂掉"（高可用思想）
```bash
# 在主服务器上：
sudo systemctl stop bind9
# 在从服务器上仍然能查询：
dig @192.168.1.11 www.mycompany.local     # 哇，照常工作！
```
**这就是"冗余"的意义。** 高可用不是玄学，就是"多准备一份，坏了一个还有另一个"。

---

## 5.4 DNS 排错与高级技巧

### 5.4.1 dig 输出怎么读（看一次就懂）
```bash
dig @127.0.0.1 www.mycompany.local
```
```
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, ...
;; flags: qr aa rd ra;      ← 关键！aa = Authoritative（权威回答，"我知道"，不是转发的）
;; QUESTION SECTION:
;www.mycompany.local.  IN  A
;; ANSWER SECTION:
www.mycompany.local. 604800 IN A 192.168.1.10    ← 这就是答案
```
- `status: NOERROR` = 正常；`NXDOMAIN` = 域名不存在；`SERVFAIL` = 服务器内部错误
- `aa` 标志 = 权威回答（检查你查对了服务器没有）
- **看 ANSWER 里有没有结果、结果对不对，是排错的核心动作。**

### 5.4.2 检查"别人为什么能/不能查到"
```bash
dig +trace www.baidu.com      # 从根服务器开始，一步步追踪完整解析路径（教学神器）
dig www.baidu.com @8.8.8.8    # 换谷歌 DNS 查（判断"是你 DNS 的问题还是网站的问题"）
```
**排错黄金三问**：
1. 直接问我自己的 DNS（`dig @127.0.0.1 域名`）→ 通吗？
2. 问公共 DNS（`dig 域名 @8.8.8.8`）→ 通吗？
3. 如果 1 不通 2 通 → **你的 DNS 服务器有问题**；都通 → 是客户端配置问题；都不通 → 域名本身/上游问题。

### 5.4.3 泛解析（一条顶一万条）
```
*.mycompany.local   IN  A  192.168.1.10
```
这一条让 `随便什么.mycompany.local` 全都解析到同一个 IP。（大公司用来做"测试环境随机域名"。）

### 5.4.4 缓存与 TTL（"为什么改了记录不生效"）
- DNS 到处都有缓存（你自己的电脑、路由器、你的 DNS 服务器、公共 DNS）
- 每条记录有 TTL（存活时间），别人会缓存这么久
- **改记录后马上验证没变化 → 是缓存。** 用 `dig +short` 多等或到缓存过期（或直接问权威：`dig @权威IP`）。

---

## 5.5 练习与自我检验

### 练习
1. 搭好 BIND9，实现 `www`、`mail`、`blog`（CNAME）三条记录并 dig 验证
2. 配好反向解析，`dig -x` 能查到域名
3. 把 www 的 IP 改成 192.168.1.99，**记得序列号 +1**，重启验证生效
4. （两台机器）配主从复制，停掉主服务器后从服务器仍能解析
5. （进阶）加一条 MX 记录指向 mail，用 `dig MX` 验证

### 自检清单
- [ ] 我能说出 A/AAAA/CNAME/MX/PTR/NS/SOA 各自的作用
- [ ] 我独立配过 named.conf.local 的两个 zone（正+反）
- [ ] 我知道"记录末尾的点"的坑，知道序列号的作用
- [ ] 我会用 named-checkconf / named-checkzone / dig / dig -x 验证
- [ ] 我理解权威 vs 递归，验证过"主挂从顶"的高可用
- [ ] 我理解 TTL 与缓存导致的"改了不生效"

### 对应真题
- 世界赛 Module A 评分点：A04（主从、递归、v4/v6 反向区）、A13（A/AAAA/CNAME 记录逐条检查）——**本章就是它的真题对应教程**
- 世界赛 Module B：NW-SRV 的"secondary zone transfer"（Windows DNS 从区传输）
- 中国国赛：DNS 服务器搭建是私有云题目的标配小题

**恭喜，DNS 这座"网络世界的户口本"你已经亲手做过一遍了。**
