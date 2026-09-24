# 🔥 模拟赛题 · 本地热身赛（世赛风格）

> 时长：60-90 分钟 · 总分 32 分 · 24 分及格
> 环境：你的 Ubuntu 22.04 练习机（WSL2）
> 对应教程：第 1、3、9、10 章
>
> **规则（和真实比赛一样）：**
> 1. 按题目顺序做
> 2. 做完运行评分脚本：`bash /mnt/d/Desktop/世界技能云计算/lab/grad.sh`
> 3. 评分前不要看 grad.sh 的答案检查逻辑（比赛也没有答案）

---

## 任务 1 · 用户与权限（8 分）

像比赛里"为应用创建运行账户"一样，完成：

1. 创建组 `dev`（2 分）
2. 创建用户 `deployer`：主组为 `dev`，shell 为 `/bin/bash`（2 分）
3. `deployer` 可以执行 sudo 命令（2 分）
4. 为 `deployer` 配置 SSH 密钥登录：`/home/deployer/.ssh/authorized_keys` 存在、属主为 deployer、权限 600（2 分）

> 提示：`groupadd` / `useradd -m -g` / `usermod -aG sudo` / `mkdir -p` + `chmod` + `chown`

## 任务 2 · Web 服务（8 分）

在 nginx 上部署第二个站点（第一个 80 端口的网站已存在）：

1. 站点监听 **8081 端口**，访问 `http://localhost:8081/` 页面包含文字 `WS-APP`（4 分）
2. 访问 `http://localhost:8081/health` 返回 `healthy`（4 分）

> 提示：新建 `/etc/nginx/sites-available/ws-app` + `ln -s` 到 sites-enabled + `nginx -t` + `systemctl reload nginx`。/health 可以用 `location` + `return 200 "healthy";`

## 任务 3 · 自动化备份（8 分）

1. 创建脚本 `/opt/scripts/backup.sh`：把 `/var/www` 目录打包为 `/backup/www-YYYYMMDD.tar.gz`（日期为当天），脚本存在且可执行（2 分）
2. 手动运行一次脚本，生成 `/backup/www-*.tar.gz` 文件（3 分）
3. 配置 root 的 crontab：每天 02:00 执行该脚本（3 分）

> 提示：`tar -czf` + `$(date +%Y%m%d)` + `crontab -e`（root 的）

## 任务 4 · 容器化部署（8 分）

1. 运行一个 Docker 容器：名字 `ws-api`，镜像 `httpd:alpine`，端口映射 **8082→80**（3 分）
2. 访问 `http://localhost:8082/` 页面包含文字 `WS-API`（5 分）

> 提示：`docker run -d --name ... -p ...` + `docker exec` 改首页 `/usr/local/apache2/htdocs/index.html`

---

## 评分

```bash
sudo bash /mnt/d/Desktop/世界技能云计算/lab/grad.sh
```

输出每项 PASS/FAIL 和总分。**做不完可以反复做，这就是练习的意义。**

全部 PASS 之后，你就完成了真实比赛中"Linux 基础设施"部分的等价训练。
下一步：进入 AWS 实操（需要注册 AWS 免费账号，见《开始学习-先读我.md》）。
