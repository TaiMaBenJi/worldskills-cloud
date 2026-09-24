# 🔥 模拟赛题 · 网络系统管理（世赛风格）

> 时长：90~120 分钟 · 总分 32 分 · 24 分及格
> 环境：你的 Ubuntu 22.04 练习机（WSL2，root 下操作）
> 对应赛项：世赛「网络系统管理」的 Linux 服务器部分（DNS / 文件服务 / FTP / 自动化）
>
> **规则（和真实比赛一样）：**
> 1. 按题目顺序做；服务器配置就是赛题本身，装包也算题内功夫
> 2. 做完运行评分：`sudo bash /mnt/d/Desktop/世界技能大赛云计算/03-网络系统管理/grad_netsys.sh`
> 3. 评分前不要看 grad_netsys.sh 与《参考答案》（比赛也没有答案）
> 4. 做砸了想重来：跑[重置环境.sh](重置环境.sh) 一键清场

---

## 任务 1 · DNS 服务器（8 分）

安装并配置 bind9，托管区域 **wsnet.local**（服务监听本机即可）：

1. bind9 服务运行中（1 分）
2. `dig @127.0.0.1 www.wsnet.local A +short` 返回 `192.168.100.10`（2 分）
3. `dig @127.0.0.1 ns1.wsnet.local A +short` 返回 `192.168.100.1`（1 分）
4. `dig @127.0.0.1 app.wsnet.local CNAME +short` 指向 `www.wsnet.local`（2 分）
5. 反向解析：`dig @127.0.0.1 -x 192.168.100.10 +short` 返回 `www.wsnet.local`（2 分）

> 提示：正向区写进 `/etc/bind/named.conf.local`，区域文件可抄 `/etc/bind/db.local` 改；
> 反向区名是 `100.168.192.in-addr.arpa`，PTR 记录的属主是 `10`；
> 每次改完 `named-checkconf` 查语法 → `systemctl restart named` → 用 dig 验证。

## 任务 2 · Samba 文件共享（6 分）

安装 samba，创建共享 **wsdata** → `/srv/wsdata`，允许**匿名（guest）浏览**、只读：

1. smbd 服务运行中（1 分）
2. `testparm -s` 输出里 `[wsdata]` 段的 `path = /srv/wsdata`（3 分）
3. `smbclient -L //127.0.0.1 -N` 能匿名列出共享列表，且包含 `wsdata`（2 分）

> 提示：安装 `samba` 和 `smbclient`；`/etc/samba/smb.conf` 追加共享段（`browseable = yes`、`guest ok = yes`、`read only = yes`）；
> 匿名列表要靠 `[global]` 里的 `map to guest = Bad User`；改完 `systemctl restart smbd`。

## 任务 3 · NFS 导出与挂载（6 分）

安装 nfs-kernel-server，把 `/srv/nfs/ws` 以 `rw,sync` 导出给 `127.0.0.1`：

1. nfs-server 服务运行中（1 分）
2. `showmount -e 127.0.0.1` 显示 `/srv/nfs/ws`（2 分）
3. 把它挂载到 `/mnt/nfs-test`，并在挂载点内创建 `probe.txt`、内容为 `ok`（3 分）

> 提示：`/etc/exports` 加一行 `127.0.0.1(rw,sync)` → `exportfs -ra`；
> 挂载后写文件若被拒，检查导出目录属主权限（`chown nobody:nogroup` 或直接 root 写）。

## 任务 4 · FTP 服务（6 分）

安装 vsftpd，允许**本地用户登录并上传**：

1. vsftpd 服务运行中（1 分）
2. 用 student / 123456 能列出 FTP 目录：`curl -s --user student:123456 ftp://127.0.0.1/` 有输出（2 分）
3. 在 `/tmp` 创建 `ws-ftp-upload.txt`（内容随意），通过 FTP 上传到 student 家目录，文件真实落在 `/home/student/`（3 分）

> 提示：`/etc/vsftpd.conf` 需要 `local_enable=YES` 和**取消注释** `write_enable=YES`；
> 上传：`curl -T /tmp/ws-ftp-upload.txt --user student:123456 ftp://127.0.0.1/`。

## 任务 5 · systemd 定时器自动化（6 分）

不用 cron，用 **systemd timer** 实现周期清理：

1. 存在 `/etc/systemd/system/ws-clean.service` 和 `ws-clean.timer` 两个单元文件（1 分）
2. service 的 ExecStart 执行 `/usr/local/bin/ws-clean.sh`；脚本会创建 `/var/lib/ws-clean/` 并把时间戳写入其中 `last-run` 文件（2 分）
3. timer 设为**开机自启**（`systemctl is-enabled ws-clean.timer` = enabled），周期为每 10 分钟（`OnCalendar=*:0/10`）（1 分）
4. 手动执行一次 service，`/var/lib/ws-clean/last-run` 文件存在且非空（2 分）

> 提示：service 里 Type=oneshot；写完 `systemctl daemon-reload` → `enable --now ws-clean.timer` →
> `systemctl list-timers` 里能看到它；手动跑一次 `systemctl start ws-clean.service`。

---

## 评分

```bash
sudo bash /mnt/d/Desktop/世界技能大赛云计算/03-网络系统管理/grad_netsys.sh
```

输出每项 PASS/FAIL 和总分，**24 分及格**。做不完就反复做——真实比赛也是按检查点给分。

全部做完后，你就具备了世赛「网络系统管理」Linux 侧四大件（DNS/文件/FTP/自动化）的完整手感和云计算赛项的服务器底座能力。
