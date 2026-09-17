# 01 · Linux 与操作系统基础（L0 → L1）

> 这一层是所有人的必经之路。世界赛 Module A（Linux）与 Module D（排障）的每一分都建立在这层之上。
> **不要跳过**。所有"云"最终都落在 Linux 上。

---

## 能力清单（学完应会）

- [ ] 脱离图形界面生存：只用命令行完成全部日常操作
- [ ] 熟练操作文件、权限、用户/组、进程、服务、网络、包管理
- [ ] 写得出能用的 Bash 脚本（变量、条件、循环、函数、管道、文本三剑客）
- [ ] 理解 systemd、日志系统、定时任务、性能与存储的基本概念
- [ ] 能在无人指导的情况下从裸机装起一台可用的服务器

## 知识地图

### 1. 命令行基础
- 文件操作：`ls cd cp mv rm mkdir find locate stat file ln`
- 文本处理：`cat less head tail grep sed awk cut sort uniq wc diff patch`
- 归档压缩：`tar gzip xz zip unzip`
- 权限：`chmod chown chgrp umask`；特殊位 SUID/SGID/Sticky
- 用户与组：`useradd usermod userdel groupadd passwd /etc/passwd /etc/shadow /etc/group`
- 进程：`ps top htop kill pkill nice renice jobs bg fg nohup`
- 网络工具：`ip ss ping curl wget ssh scp rsync nc tcpdump dig`
- 磁盘：`lsblk fdisk parted mkfs mount umount /etc/fstab df du`
- 包管理：`apt/dpkg`（Debian/Ubuntu）与 `dnf/rpm`（RHEL 系）；Alpine 的 `apk`

### 2. 系统与服务
- systemd：`systemctl`（启停/自启/状态）、`journalctl`、写 unit 文件
- 日志：rsyslog、journald、logrotate
- 计划任务：cron、systemd timers、at
- 启动流程：BIOS/UEFI → GRUB → systemd → target
- Shell 脚本：**世界赛 Module A 有"备份脚本"评分点**——脚本必须真的能跑、结果可验证

### 3. 存储与文件系统
- ext4/xfs/btrfs 特性；LVM（PV/VG/LV）、RAID 概念
- 挂载与 fstab（**Module A 评分点 A10-01 就是检查 fstab 配置正确**）
- 配额（quota）、ACL（setfacl/getfacl）
- NFS/SMB 共享概念（详见 03 章）

### 4. 源码与编译基础
- `gcc/make/cmake` 基本使用；看懂 `./configure && make && make install`
- 动态库 `LD_LIBRARY_PATH`、`ldd`、`strace` 排错

### 5. 性能与排障入门
- CPU/内存/IO：`vmstat iostat sar free top iotop`
- 系统调用观察：`strace ltrace`
- 网络排障：`ss -tlnp`、`tcpdump`、`mtr`、`nslookup` 分层定位法

## 对应真题（本资料包）

| 真题 | 用法 |
|------|------|
| 里昂 2024 Module A（52 评分点） | A10（fstab+备份脚本）、A11（SSH 证书）、A15（Ansible）都是纯系统层 |
| 里昂 2024 Module D | 排障模块：环境是 Debian，故障点多为系统/服务配置错误 |
| 韩国 2025 제1과제 | 虽然是 AWS 题，但 bootstrap/用户数据脚本要靠系统功底 |
| 国内赛"私有云运维开发" | OpenStack 排障本质是 Linux 服务排障 |

**训练建议**：把 Module A 的 `linux/solution/` 目录（本包内）当参考答案，在本地 VM 从零复刻：DNS 主从 + LDAP + Samba + CA + HAProxy + WireGuard，全部手配一遍不查教程。

## 超前部分（比大赛更深）

- **perf/eBPF 入门**：`perf top`、`bpftrace` 一行命令观察内核行为 —— 云原生时代的系统排障利器
- **namespace 与 cgroup**：理解容器底层（`unshare`、`nsenter`、`/sys/fs/cgroup`），为 K8s 打地基
- **安全加固**：SELinux/AppArmor 策略、auditd 审计、CIS Benchmark 逐条过
- **不可变基础设施思想**：为什么"改配置"不如"重建机器"（引导到 Packer/cloud-init）
- **内核调优**：`sysctl` 参数（net.core.somaxconn、tcp_tw_reuse 等）与高并发场景

## 检验标准

1. 能在 40 分钟内：新建用户+SSH 密钥登录+sudo 权限+目录 ACL+quota 全部配好并验证
2. 能默写：systemd service 文件结构、fstab 6 个字段含义、`ss -tlnp` 输出各列含义
3. 给一台"网络不通"的机器，10 分钟内用分层法定位到具体层（链路/IP/端口/DNS/防火墙）
4. SSH 证书认证（CA 签发的 user cert）能配置成功并解释原理 —— 这是 Module A 的 A11 评分点
