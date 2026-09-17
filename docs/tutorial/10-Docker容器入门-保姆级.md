# 第 10 章 · Docker 容器入门（装软件的终极姿势）

> 前 9 章我们都是"在机器上装软件"。本章开始，你学的软件将装进"盒子"里——**一个盒子打包一切，到哪都能原样运行**。
> 这是现代云计算的分水岭技术。国赛"容器云"、韩国赛全流程、所有云平台都建立在它之上。
> 预计学习时间：2 周。

---

## 10.1 用"集装箱"理解容器

### 先回忆痛点
你在电脑 A 上装了个网站：装了 Python 3.10、Flask 2.3、nginx 1.18……抄到电脑 B 上，报错一堆：Python 版本不对、库缺了、配置文件路径不同……**"在我电脑上明明能跑"是程序员永远的痛。**

### 集装箱革命
> 港口运输以前：各种货物散装搬，每种货要专门的搬运方式，换个船就乱套。
> 集装箱时代：**所有货物装进标准箱子**。箱子内容不重要，标准是统一的——吊车、货轮、卡车全都能处理。
>
> **Docker 容器 = 软件的集装箱**：把程序 + 它需要的一切（代码、运行环境、依赖库、配置）打进一个标准盒子。这个盒子在任何装了 Docker 的机器上都能直接运行。

### 容器 vs 虚拟机（面试必问，一次讲透）
| | 虚拟机 | 容器 |
|--|--------|------|
| 比喻 | 独立别墅（自带地基、水管、电） | 公寓单间（共用大楼的水电） |
| 包含 | 完整的操作系统 | 只包含程序 + 依赖 |
| 启动 | 分钟级 | 秒级（甚至毫秒） |
| 体积 | GB 级 | MB 级 |
| 隔离性 | 强（内核都隔离） | 中（共用宿主内核） |
| 干什么用 | 模拟多台独立电脑 | 打包运行应用 |

**一句话**：虚拟机虚拟的是"硬件"，容器虚拟的是"操作系统"。**所以轻得多、快得多。**

---

## 10.2 安装 Docker 与第一个容器

### 10.2.1 安装（Ubuntu）
```bash
sudo apt update
sudo apt install -y docker.io
sudo systemctl enable --now docker     # 启动并设为自启
docker --version                       # → Docker version 24.x.x

# 让普通用户也能用 docker（不然每条命令都要 sudo）
sudo usermod -aG docker $USER
# ★ 执行后要退出重新登录（或 newgrp docker）才生效
```

### 10.2.2 第一个容器：10 秒钟跑起一个网站
```bash
docker run -d -p 8080:80 nginx
```
这一条命令发生了什么（**逐段拆解，重要**）：
- `docker run` = 创建并运行一个容器
- `-d` = 后台运行（detached，不霸占终端）
- `-p 8080:80` = 端口映射：**把宿主机的 8080 端口 → 容器的 80 端口**（外面访问 `你的IP:8080` 就等于访问容器里的 80）
- `nginx` = 用哪个"镜像"（如果你的机器上没有，自动从 Docker Hub 下载）

验证：
```bash
docker ps                      # 看运行中的容器
curl http://localhost:8080     # → Welcome to nginx!（来自容器里的 nginx）
```
**注意：你根本没"安装"过 nginx——它是被装进容器里运行的。** 这就是容器的魔法。

### 10.2.3 常用操作全家桶
```bash
docker ps                      # 运行中的容器
docker ps -a                   # 所有容器（含已停止的）
docker stop 容器ID前3位        # 停止
docker start xxx               # 启动已停止的
docker rm xxx                  # 删除容器（先 stop）
docker logs xxx                # 看容器日志 ★排错必备
docker exec -it xxx bash       # 进入容器内部（-it = 交互式，exit 出来）★最常用
docker images                  # 本机有哪些镜像
docker rmi 镜像名               # 删镜像
```

**动手体验"进入容器"**：
```bash
docker exec -it $(docker ps -q) bash
# 现在你在容器内部！试试：
cat /etc/os-release        # 是个 Debian 系统（nginx 镜像的基底）
ls /usr/share/nginx/html/  # 网站文件在这里
echo "我的容器网站" > /usr/share/nginx/html/index.html
exit                       # 退出容器
# 回到宿主机：
curl http://localhost:8080   # → 你的修改生效了！
```
**理解一件事**：容器的文件系统是"里面"的，和宿主机隔离（刚才修改的是容器内部的文件）。**但是！** `docker rm` 删掉容器后，这些修改就没了——这引出了"数据卷"（10.4 节）。

---

## 10.3 制作自己的镜像：Dockerfile

别人的镜像不算本事，**把自己的程序打包成镜像**才是。这靠 **Dockerfile**（一个"装箱说明书"）。

### 10.3.1 第一个 Dockerfile（实战）
```bash
mkdir -p ~/docker-lab/myapp && cd ~/docker-lab/myapp
nano Dockerfile
```
写入：
```dockerfile
# 第一行：选择"基底"（从什么镜子上继续搭）
FROM python:3.11-slim

# 设置工作目录（后面命令的"当前目录"）
WORKDIR /app

# 复制文件：把宿主机的文件 → 镜像里
COPY app.py .

# 安装依赖（构建时执行）
RUN pip install --no-cache-dir flask

# 声明容器对外暴露的端口（文档性质）
EXPOSE 5000

# 容器启动时执行的命令（只能有一条 CMD）
CMD ["python", "app.py"]
```
建一个测试应用：
```bash
nano app.py
```
```python
from flask import Flask
app = Flask(__name__)

@app.route("/")
def hello():
    return "<h1>你好，我是容器里的 Flask 应用！</h1>"

app.run(host="0.0.0.0", port=5000)
```
**构建镜像**（在 Dockerfile 所在目录）：
```bash
docker build -t myapp:v1 .
```
- `-t myapp:v1` = 给镜像起名叫 myapp，标签 v1
- `.` = "用当前目录的 Dockerfile 构建"（这个点不能丢！）

**运行它**：
```bash
docker run -d -p 5001:5000 myapp:v1
curl http://localhost:5001
# → 你好，我是容器里的 Flask 应用！
```

### 10.3.2 Dockerfile 指令速查（核心 8 个）
| 指令 | 作用 | 例子 |
|------|------|------|
| `FROM` | 基础镜像 | `FROM ubuntu:22.04` |
| `RUN` | 构建时执行命令（装软件） | `RUN apt install -y curl` |
| `COPY` | 复制文件进镜像 | `COPY . /app` |
| `WORKDIR` | 切换工作目录 | `WORKDIR /app` |
| `ENV` | 设置环境变量 | `ENV MODE=prod` |
| `EXPOSE` | 声明端口 | `EXPOSE 80` |
| `CMD` | 启动命令（可被覆盖） | `CMD ["nginx"]` |
| `ENTRYPOINT` | 启动命令（更固定） | `ENTRYPOINT ["python"]` |

### 10.3.3 多阶段构建（进阶但必须认识）
问题：编译型语言（Go/Java）编译需要一大堆工具，但运行不需要。**多阶段构建**：在一个阶段编译、另一个阶段运行，最终镜像只装运行需要的东西——**体积从 900MB 瘦到 20MB**。
```dockerfile
# 阶段1：编译
FROM golang:1.22 AS builder
WORKDIR /src
COPY . .
RUN go build -o /out/app

# 阶段2：运行（只拿编译好的文件）
FROM alpine:latest
COPY --from=builder /out/app /app
CMD ["/app"]
```

### 10.3.4 推送镜像到仓库（韩国赛必考环节）
镜像仓库 = "镜像的快递柜"。最常用的是 Docker Hub（公有）和自建 Harbor。
```bash
# 登录
docker login                       # 输入用户名密码
# 打标签（仓库要求"用户名/镜像名"格式）
docker tag myapp:v1 你的用户名/myapp:v1
# 推送
docker push 你的用户名/myapp:v1
# 换一台机器拉下来跑（全世界任何一台装了 docker 的机器）
docker run -d -p 5001:5000 你的用户名/myapp:v1
```
**这就是"一次构建，到处运行"。** 韩国赛题里的 "build → push ECR → 部署"就这个流程（ECR 是 AWS 的私有镜像仓库）。

---

## 10.4 数据卷：容器的"外接硬盘"

**问题**：容器删了，里面的数据就没了（容器是"一次性"的）。
**解决**：**数据卷（Volume）**——把宿主机的目录/专属存储"挂"进容器。数据存在外面，容器随便删。
```bash
# 挂载语法：-v 宿主机路径:容器内路径
docker run -d -p 8080:80 -v ~/myweb:/usr/share/nginx/html nginx
echo "数据在宿主机，容器只是用它" > ~/myweb/index.html
curl http://localhost:8080        # → 看到宿主机上写的文件！
```
```bash
docker volume create mydata            # 创建"命名卷"（Docker 管理的卷）
docker run -d -v mydata:/data mysql    # 挂到 mysql 容器
docker volume ls                       # 看所有卷
```
**规矩**：数据库等有状态服务**必须挂卷**，否则容器一删数据全没。

---

## 10.5 Docker 网络：容器之间怎么说话

```bash
docker network ls                      # 看网络列表
docker network create mynet            # 创建自定义网络（推荐做法）

# 两个容器加入同一网络，就能用"容器名"互相访问！
docker run -d --name web --network mynet nginx
docker run -it --rm --network mynet curlimages/curl curl http://web
# ↑ 注意最后直接用了 http://web —— 容器名就是"域名"！
```
（`--rm` = 退出后自动删除容器，临时任务用。）
**为什么要自己建网络？** 默认的 bridge 网络里容器只能用 IP 互访；自定义网络支持"用名字互访"（内置 DNS）。**应用 + 数据库的经典组合就靠它互联。**

---

## 10.6 Docker Compose：一条命令拉起一整套系统

真实系统是多容器配合（网站+数据库+缓存）。一个个 `docker run` 太麻烦——**Compose 用一个 YAML 文件描述全部**。

```bash
sudo apt install -y docker-compose-v2    # 或 docker compose plugin
mkdir -p ~/docker-lab/stack && cd ~/docker-lab/stack
nano docker-compose.yml
```
```yaml
services:
  web:
    image: nginx
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html
    depends_on:
      - api            # 先起 api 再起 web（顺序）

  api:
    build: ./api       # 用本地 Dockerfile 构建
    environment:
      - DB_HOST=db      # 环境变量传给容器
    depends_on:
      - db

  db:
    image: mysql:8
    environment:
      - MYSQL_ROOT_PASSWORD=Root123!
      - MYSQL_DATABASE=appdb
    volumes:
      - dbdata:/var/lib/mysql    # 数据持久化

volumes:
  dbdata:
```
```bash
docker compose up -d        # 一键启动全部（下载镜像、建网络、按依赖启动）
docker compose ps           # 看状态
docker compose logs -f api  # 看某个服务的日志
docker compose down         # 一键停止并清理
```
**一个文件，一条命令，整套系统起来。** 这就是"基础设施即代码"思想的第一次亮相（第 13 章会把这个思想推向云端）。

---

## 10.7 排错与自检

### Docker 高频 5 坑
1. **`Cannot connect to the Docker daemon`**：Docker 服务没起 → `sudo systemctl start docker`；或用户不在 docker 组 → 重新登录。
2. **端口冲突**：8080 已被占 → `ss -tlnp | grep 8080` 找出占用者，换个端口。
3. **容器起来就退出**：`docker logs 容器名` 看日志（多数是应用启动报错）。注意：容器里**主进程退出 = 容器退出**，所以前台程序要有，别写个后台命令就结束。
4. **改了代码不生效**：镜像没重新 build（`docker build` 后要重新 `run` 新容器）。容器用的是"构建时的快照"，不是实时文件。
5. **`permission denied` 访问挂载目录**：容器内用户和宿主机文件属主不匹配 → 调整文件权限或容器运行用户。

### 练习
1. 跑起 nginx 容器，进容器里改首页
2. 写一个自己的 Python Flask 应用 Dockerfile，构建并运行
3. 用数据卷让容器数据在删除容器后仍然保留（验证一下：删容器→立新容器挂同一卷→数据还在）
4. 用 Compose 拉起 nginx + mysql 两件套
5. 把镜像打上标签推到 Docker Hub，从另一个"终端"拉下来运行
6. （挑战）写多阶段构建的 Go 程序镜像，对比体积

### 自检清单
- [ ] 我能给完全不懂的人讲清"容器 vs 虚拟机"
- [ ] 我会写 Dockerfile（8 个核心指令都用过）
- [ ] 我理解 `-p 8080:80`、`-v`、`--network` 三个参数
- [ ] 我用过数据卷并理解"容器删了数据为什么还在/不在"
- [ ] 我用 Compose 拉起过完整栈
- [ ] 我推拉过镜像仓库

### 对应真题
- 中国国赛"容器云"模块（40% 权重）：装 Docker+K8s、镜像构建、容器编排——本章是它的第一半地基
- 韩国赛：`make images`（构建推 ECR）、Docker 基础镜像是全流程起点
- 世界赛：现代模块中的容器化部署（Module C 云架构常见）
