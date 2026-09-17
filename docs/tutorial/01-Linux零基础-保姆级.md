# 第 1 章 · Linux 零基础（保姆级）

> 本章目标：让你从"没碰过 Linux"，变成"能在 Linux 里自如地建文件、装软件、管服务、写脚本"。
> 这一章是整套教程的地基。**地基多花时间，越往后越省力。**
> 预计学习时间：2-4 周（每天 2 小时）。学不完不要焦虑，这是正常速度。

---

## 1.1 什么是 Linux？为什么全世界服务器都在用它？

### 先看一个比喻
把电脑想象成一栋房子：

- **硬件**（CPU、内存、硬盘）= 房子的砖头水泥。
- **操作系统** = 房子的物业管理系统：负责管水电、管门禁、分配房间。
- **应用程序**（微信、浏览器）= 住在房子里的租客。

你熟悉的 Windows 是一种"物业"，你手机里的安卓也是一种"物业"，**Linux 也是一种"物业"**——专门给服务器用的物业。

### 为什么服务器选 Linux？
1. **免费**。Windows Server 要花钱买授权，Linux 不要钱。一个公司几千台服务器，能省下几百万。
2. **稳定**。Linux 服务器连续运行几年不重启是常态。Windows 服务器做不到。
3. **省资源**。一张 4GB 内存的"小票子"（很小的服务器），Linux 跑得动，Windows 跑不动。
4. **安全**。全世界的程序员一起盯着它的代码，有漏洞很快被修。
5. **命令行强大**。管理 1000 台服务器时，用命令操作比鼠标点十亿次快得多。

### 学 Linux，其实就学三件事
1. **命令**：告诉电脑做什么（代替鼠标点击）
2. **文件**：东西存在哪、怎么找（代替"我的电脑"）
3. **服务**：让软件一直跑着、管着它（代替"任务管理器"）

把这三件事学会，你就入门了。本章就是按这三件事展开的。

> **【必须认识的英文单词】**（先混个脸熟，不用背）
> file 文件 / directory 目录（文件夹） / command 命令 / user 用户 / group 用户组 / password 密码
> permission 权限 / server 服务器 / process 进程 / service 服务 / install 安装 / download 下载

---

## 1.2 准备一台 Linux 机器（三种方案，任选一种）

学 Linux 需要一台能操作的机器。下面三种方案**选一个**就行，我会把每种方案讲到"点哪个按钮"级别。

### 方案 A：用 Windows 电脑装虚拟机（推荐★，最省钱，随便折腾）

**什么是虚拟机？** 用软件在你电脑里"隔"出一台虚拟的电脑。在你的虚拟机里装 Linux、乱删文件、甚至弄坏它，都不影响你的真实电脑——大不了删掉重装。这是新手学习的完美沙盒。

#### 第 1 步：下载 VMware Workstation Player（虚拟机软件）
1. 打开浏览器，访问 VMware 官网（搜索：`VMware Workstation Player 下载`）
2. 个人使用选择 **Player（免费）** 版本下载，约 100-300MB
3. 双击下载的文件，一路点"下一步"安装完成（全部默认即可）
> 如果官网下载困难，搜索"VMware Workstation Player 个人免费版 网盘"也能找到。
> 替代品：VirtualBox（也是免费），操作逻辑几乎一样，也可以。

#### 第 2 步：下载 Ubuntu 系统镜像
1. Ubuntu 官网：`ubuntu.com/download/desktop`（或搜索 "Ubuntu 22.04 下载"，**推荐 22.04 LTS 版本**，LTS = 长期支持版，最稳定）
2. 如果官网慢，用国内镜像：搜索"清华镜像 Ubuntu"→ 进入 `mirrors.tuna.tsinghua.edu.cn` → 找 `ubuntu-releases` → `22.04` → 下载 `.iso` 文件（约 4GB）
3. 下载完你会得到一个类似 `ubuntu-22.04.5-desktop-amd64.iso` 的文件

#### 第 3 步：创建虚拟机（照着点）
1. 打开 VMware Player，点 **Create a New Virtual Machine**（创建新虚拟机）
2. 选择 **Installer disc image file (iso)**，点 Browse 选中刚下载的 `.iso` 文件 → Next
3. 填写"Easy Install"信息：
   - Full name: 随便填，比如 `student`
   - User name: **建议就用 `student`**（教程后面会统一用这个名字）
   - Password: **设一个好记的密码**，比如 `123456`（学习环境无所谓安全，但**请记住它**，登录要用）
4. 虚拟机名字和位置：默认即可（建议放在空间大的盘，它会占 20-30GB）
5. 磁盘大小：**20GB 以上**，选 "Store virtual disk as a single file"
6. 点 **Customize Hardware**（自定义硬件）：
   - Memory（内存）：**给 4096MB（4GB）**。如果你是 8GB 内存的电脑，给 4GB；16GB 的电脑给 8GB
   - Processors：2 核
   - **Network Adapter 一定要选 NAT**（后面学网络还要用，先记住）
7. 点 Finish → 虚拟机自动开始安装 Ubuntu

#### 第 4 步：安装 Ubuntu（如果自动安装没启动）
- 如果屏幕显示 "Easy Install" 自动进行 → 等 10-20 分钟，让它装
- 如果让你手动选 → 一路默认：语言选 English（推荐，学技术用英文环境习惯更快）或中文 → "Erase disk and install Ubuntu" → 设置用户名密码 → 等安装完成 → 重启

#### 第 5 步：进入系统
看到桌面（像手机主屏一样的界面）就成功了。找到 **Terminal（终端）**：

- 方法一：点左下角"显示应用程序"（九个点），搜索 `Terminal`
- 方法二：桌面右键 → "Open in Terminal"
- **把 Terminal 拖到左侧任务栏**（以后天天用）
- 快捷键：`Ctrl + Alt + T`

点开它，你会看到一个黑窗口——**恭喜，这就是你未来最重要的工具**。别怕，下一节就让你驯服它。

---

### 方案 B：租一台云服务器（最接近实战★，20 元能玩一个月）

如果你电脑太旧、内存太小（4GB 以下），或者想要"真刀真枪的服务器"，用这个方案。

#### 第 1 步：注册账号
三选一（都差不多，挑一个）：

- **阿里云**（aliyun.com）— 国内份额最大
- **腾讯云**（cloud.tencent.com）
- **华为云**（huaweicloud.com）

用手机号注册，完成实名认证（要身份证，正规平台都这样）。

#### 第 2 步：找"学生优惠"或"轻量服务器"
1. 登录后搜索"**学生机**"或"**轻量应用服务器**"（Lightweight Server）
2. 配置怎么选：
   - **地区**：选离你近的（比如"华东-上海"）
   - **镜像（系统）**：选 **Ubuntu 22.04**（有的叫 "Ubuntu Server 22.04 LTS"）
   - **配置**：最低配就行（2 核 2GB 内存，学生机约 10-25 元/月）
   - **时长**：先买 1 个月
3. 付款后等 1-2 分钟，服务器创建完成

#### 第 3 步：拿到"三样东西"（注册后马上抄下来）
在服务器的管理页面找到：
1. **公网 IP 地址**：一串数字，像 `47.103.xx.xx`（这就是你服务器的"门牌号"）
2. **用户名**：一般是 `root` 或 `ubuntu`
3. **密码**：购买时设置的，忘了就在管理页点"重置密码"

> ⚠️ 把这 3 样写在备忘录里。以后每次连接都要用。

#### 第 4 步：连上去（从你的电脑/手机）
**如果用 Windows 电脑**：下载一个叫 **Xshell** 或 **PuTTY** 或 **FinalShell** 的软件（搜"FinalShell 下载"，国产、免费、界面友好，新手推荐）：
1. 打开 FinalShell → 新建连接 → SSH 连接
2. 填入：名称（随便）、主机（填公网 IP）、端口（22）、用户名（root）、密码
3. 点连接 → 看到黑窗口里跳出 `root@xxx:~#` → 成功！

**如果只有手机**：应用商店下载 **Termius**（免费）：
1. 打开 → New Host → 地址填公网 IP，用户名、密码照填
2. 点连接 → 成功

---

### 方案 C：Windows 自带的 WSL2（最省事，5 分钟搞定）

如果你的电脑是 Windows 10/11，可以不用虚拟机：
1. 点开始菜单，搜索 `PowerShell`，**右键以管理员身份运行**
2. 输入这行命令，回车：
   ```
   wsl --install
   ```
3. 等它自动下载安装（约 10 分钟）→ 重启电脑
4. 重启后会自动弹出一个窗口让你设置用户名和密码 → 设置完就进入 Linux 了
5. 以后想进去：开始菜单搜 `Ubuntu` 打开就行

> WSL 的优点是快；缺点是"太方便了"，学不到虚拟机的网络知识。**建议：方案 C 先用起来玩，方案 A 或 B 有空补上。**

---

### 【本节的作业】
把你选好的方案走通，直到你能看到类似这样的东西出现在屏幕上：

```
student@ubuntu:~$
```

或者（云服务器）：
```
root@iZbp1xxxxxxxxZ:~#
```

**看到它 = 你已经拥有了一台 Linux 机器。** 看不懂这行字什么意思？下一节就讲。

### 【出错了怎么办——新手最常见的 5 个坑】
1. **VMware 提示"CPU 虚拟化未开启"**：重启电脑进 BIOS（开机时狂按 F2/Del 键），找 "Intel VT-x" 或 "SVM Mode"，设为 Enabled，保存退出。
2. **虚拟机卡到不能动**：电脑内存不够。用 4GB 以下内存的电脑 → 换方案 B（云服务器）。
3. **下载的 Ubuntu 打不开**：多半没下载完。重新下载，注意文件大小约 4GB。
4. **云服务器连不上**：检查①公网 IP 抄对了没（注意 0 和 O、1 和 l）②密码对没对③"安全组"里 22 端口有没有开放（购买时默认开放，如自己改过要检查）。
5. **WSL 安装报错**：系统版本太旧，运行 `wsl --update` 或搜索"WSL 手动安装"。

**如果你是 2026 年读到这里的：以上软件版本可能更新了，但操作逻辑不变——按关键字搜索新版本即可。**

---

## 1.3 驯服黑窗口：认识命令行

### 1.3.1 这行字什么意思？
仔细看你屏幕上的这行：

```
student@ubuntu:~$
```

拆开读：

| 部分 | 含义 | 比喻 |
|------|------|------|
| `student` | 当前登录的用户名 | 你现在用的"身份" |
| `@` | 分隔符（读作 at） | "在" |
| `ubuntu` | 这台机器的名字（主机名） | 你进的"哪栋房子" |
| `:` | 分隔符 | —— |
| `~` | 你当前站在哪个目录（`~` 代表"家目录"，后面讲） | 你现在"站在哪个房间" |
| `$` | 提示符：表示"我是普通用户，等你下命令" | 门铃——告诉你"该你说话了" |

如果提示符是 `#`（井号）：说明你是 **root 用户（超级管理员）**，权限最大，**每敲一个命令都要多想想**。

**怎么"对话"？** 就是把命令打进去，按**回车**。系统执行完，会再显示一次提示符，等你下一条命令。如此循环。

> 比喻：命令行像和一位"绝对服从但绝不猜心思"的管家对话。你让它"把 A 复制成 B"，它严格照做；你没说清楚，它就报错。**它从不嫌你烦，也从不笑话你——所以放心大胆敲。**

### 1.3.2 两个救命技巧（先学，受益全程）
1. **Tab 自动补全**：打命令或文件名时打一半，按 `Tab` 键，系统自动帮你补全。如果没反应，说明有多个候选，连按两次 `Tab` 会列出所有可能。
   - 例如：输入 `cd /ho` 按 Tab → 自动变成 `cd /home/`
   - **这是 Linux 使用率第一高的按键，务必养成习惯。**
2. **方向键↑ 翻历史命令**：按一下 ↑，出现你刚敲过的命令；再按一下，再往前一条。要重复执行之前的命令，不用重新打。
   - `history` 命令可以列出你敲过的所有命令（带编号）。

### 1.3.3 你的第一条命令

敲下这条命令，按回车：

```bash
whoami
```

你应该看到（示例）：
```
student
```

它回答了一个问题："我现在是谁？"——返回当前用户名。
**对，就这么简单。** 命令 = 对电脑的问句/指令，回车 = 发送。

再试试这几条（一条一条来，别一次全敲）：

```bash
date
```
→ 显示当前日期时间。比如 `Mon Sep 16 10:30:45 CST 2026`

```bash
echo "你好，Linux"
```
→ 屏幕上原样吐出文字：`你好，Linux`（echo = 回声，把你说的话"喊"回来）

```bash
clear
```
→ 屏幕清空（就像擦白板）。其实还有个快捷键 `Ctrl + L`，效果一样。

### 1.3.4 命令的通用结构（理解了它，所有命令一通百通）

```
命令名  [选项]  [操作对象]
  |       |          |
 动词    形容词      宾语
```

举例：`ls -l /home`

- `ls` = 命令名（list 的缩写，"列出"）
- `-l` = 选项（long 缩写，"详细格式"）
- `/home` = 操作对象（列哪个目录）

再比如：`cp -r 目录A 目录B`

- `cp` = 复制（copy）
- `-r` = 选项（recursive，连子目录一起）
- 两个对象：源、目标

**所有命令都遵守这个规律。** 忘了用法就查手册：

```bash
man ls
```
→ 打开 `ls` 的说明书（按 `Q` 退出，空格翻页）。
（`man` = manual 手册。全英文，看不懂没关系，新手用另一种方式：后面教 `--help`。）

```bash
ls --help
```
→ 快速显示用法提示（比 man 简短）。**遇到不会的命令，先试 `--help`。**

### 【本节动手作业】
1. 用 `whoami`、`date`、`echo`、`clear` 各执行一遍
2. 用 `history` 看看你刚才都敲了什么
3. 输入 `ls --help`，然后按空格翻几页，再按 `q` 退出（体会一下说明书长什么样，看不懂正常）
4. 挑战：输入一个不存在的命令，比如 `hello`，看看系统怎么回答你

### 【你应该看到】
- 敲不存在的命令会看到类似：`hello: command not found`（意思是"没有 hello 这个命令"）
- **报错不可怕**——Linux 的报错是最好的老师，它明确告诉你哪里错了。以后见到 `command not found`、`No such file or directory` 这类消息，先翻译成人话再行动。

### 【自我检验】
- [ ] 我能解释 `student@ubuntu:~$` 的每一部分
- [ ] 我会用 Tab 补全
- [ ] 我知道 `命令 -选项 对象` 的结构
- [ ] 我不再害怕黑窗口里的报错

全勾了？继续下一节。

---

## 1.4 文件系统：Linux 的"我的电脑"长什么样

### 1.4.1 先记住一个巨大的不同点
Windows 里你熟悉的是：**C 盘、D 盘、E 盘**，每个盘彼此独立。
Linux 里：**没有盘符。所有东西都挂在一棵"树"上，树的根叫 `/`（读作"根目录"）。**

```
/                 ← 一切的起点（根）
├── home/         ← 所有普通用户的家
│   └── student/  ← 你的家（登录后默认待的地方，简称 ~）
├── etc/          ← 配置文件的窝（重点！）
├── var/          ← 经常变的数据（日志等）
├── tmp/          ← 临时文件（重启后可能被清空）
├── usr/          ← 安装的软件都在这
├── bin/          ← 常用命令的家（ls/cp 都在这里）
├── root/         ← root 用户的家（普通用户进不去）
└── dev/          ← 设备文件（硬盘、键盘都在这里"报到"）
```

**记住这 5 个就够了**（后面每个都会详细遇到）：

| 目录 | 装什么 | 人话 |
|------|--------|------|
| `/home/student` | 你的东西（`~` 就是这个） | 你的卧室 |
| `/etc` | 软件配置文件 | 各种设备的说明书柜 |
| `/var/log` | 日志（软件运行记录） | 监控录像 |
| `/tmp` | 临时文件 | 垃圾桶（常会清空） |
| `/usr` | 安装的软件本体 | 家电仓库 |

> 比喻：整棵目录树是一个小区，`/etc` 是物业档案室，`/var/log` 是监控室，`/home/student` 是你家。你家的地址永远是"**绝对路径**"：`/home/student`。
> 相对路径 vs 绝对路径：
> - **绝对路径**：从根写起，以 `/` 开头。像"完整的快递地址"。`/home/student/notes`
> - **相对路径**：从"你现在站的地方"写起。像"从我这里往左拐"。`notes`（当前在 /home/student 时指向同一个文件）
> - `..` 表示"上一层"，`.` 表示"当前层"。`cd ..` = 去上一层。

### 1.4.2 三个基础导航命令

#### ① `pwd`：我现在在哪儿？
```bash
pwd
```
输出：
```
/home/student
```
`pwd` = print working directory（打印工作目录）。**迷路了就打它**，跟游戏里的小地图一样。

#### ② `ls`：看看这里有什么
```bash
ls
```
输出（示例）：
```
Desktop  Documents  Downloads  Music  Pictures  Public  Templates  Videos
```
这些是 Ubuntu 给你预设的文件夹（和你手机里的"相册""下载"一个意思）。

**常用变体（重要）：**
```bash
ls -l
```
详细列表。输出长这样：
```
drwxr-xr-x  2 student student 4096 Sep 16 10:00 Desktop
-rw-r--r--  1 student student  156 Sep 16 09:30 notes.txt
```
先别管细节（下一节讲权限），现在只要看出：**第一列开头是 `d` 的是目录（文件夹），是 `-` 的是文件**。

```bash
ls -a
```
显示所有文件，**包括隐藏文件**（名字以 `.` 开头的文件默认藏起来，比如 `.bashrc`）。
```bash
ls -lh
```
`-h` = human（人话版）。文件大小会显示成 `4.0K`、`1.2M`，而不是一长串数字。**`-lh` 是最常打错的组合，记住：小写 L + 小写 h。**

```bash
ls /etc
```
看指定目录（`/etc`）里有什么——不用先 cd 过去。

#### ③ `cd`：走去别的目录
```bash
cd /etc        # 去 /etc（绝对路径）
cd ~           # 回家（~ 就是 /home/student 的简写）
cd             # 什么都不加，也是回家
cd ..          # 去上一层
cd -           # 回到刚才待的目录（来回切换神器）
cd /var/log    # 去日志目录
```

**练习小循环（现在动手，30 秒）：**
```bash
cd /
pwd          # 应该显示 /
ls           # 看看根目录下有什么
cd /etc
pwd          # 应该显示 /etc
cd -
pwd          # 又回到 /
cd ~
pwd          # 回到你家
```

> **今天的奇迹**：你已经学会了在整台电脑里"瞬移"。以后所有操作都建立在这个能力上。

---

## 1.5 文件操作五件套：建、看、复制、移动、删除

### 1.5.1 `mkdir` — 建文件夹（make directory）
```bash
mkdir test1
```
→ 在你当前所在的目录里，建一个名叫 `test1` 的文件夹。

```bash
mkdir -p a/b/c
```
→ 一次性建出三层文件夹 `a` 里面套 `b` 里面套 `c`。（`-p` = parents，连"爹"一起建；不加 `-p` 而直接 `mkdir a/b/c` 会报错，因为 a 还不存在）

**动手：**
```bash
cd ~
mkdir -p lab/lesson1
cd lab/lesson1
pwd
```
最后一行应该输出 `/home/student/lab/lesson1` —— 你建的路，你自己走完了。

### 1.5.2 `touch` — 建空文件（或"摸一下"文件更新时间）
```bash
touch hello.txt
```
→ 建一个空的 `hello.txt`。用 `ls` 检查，你会看到它。

```bash
touch a.txt b.txt c.txt
```
→ 一次建三个。

### 1.5.3 `cp` — 复制（copy）
```bash
cp hello.txt hello_backup.txt
```
→ 把 `hello.txt` 复制一份，叫 `hello_backup.txt`（原文件还在）。

```bash
cp hello.txt /tmp/
```
→ 复制到 `/tmp` 文件夹里（注意末尾的 `/`，习惯性加上，表示"放进这个文件夹"）。

```bash
cp -r lab /tmp/
```
→ 复制整个文件夹（`-r` = recursive 递归，**复制文件夹必须加 `-r`**，否则报错）。
> 为什么？因为文件夹里可能还有文件夹，要"递归地"一路复制下去。这是新手最常忘的参数。

### 1.5.4 `mv` — 移动 / 改名（move）
```bash
mv hello.txt world.txt
```
→ **改名**：把 `hello.txt` 改名成 `world.txt`。（mv 用在"同目录"时就是改名）

```bash
mv world.txt /tmp/
```
→ **移动**：把它挪到 `/tmp` 文件夹。

```bash
mv lab /tmp/
```
→ 移动文件夹**不用加 -r**（记住这个区别：cp 要 -r，mv 不用）。

### 1.5.5 `rm` — 删除（remove，⚠️ 危险命令）
```bash
rm hello_backup.txt
```
→ 删除文件。**Linux 里删除没有回收站！删了就是删了！**（新手最痛的一课）

```bash
rm -r lab
```
→ 删除文件夹（含里面的所有内容）。

```bash
rm -rf lab
```
→ `-f` = force（强制，不询问）。**`rm -rf` 是 Linux 世界最有名的危险动作**。请永远遵守两条铁律：
1. **敲 `rm -rf` 后，手指离开回车键，先瞪 3 秒**：路径对吗？当前在哪个目录？
2. **绝不**执行来源不明的 `rm -rf` 命令（网上教程里的也不行，先看明白）。

> 江湖险恶小贴士：有人开玩笑会让你执行 `rm -rf /`（删光整台电脑）或 `rm -rf ~`（删光你家目录）。**知道这个梗，你就不会被骗了。**

### 1.5.6 归拢练习（现在做，不许看答案）

在 `~/lab/lesson1` 里完成：
1. 建一个文件夹 `practice`
2. 在 practice 里建三个空文件：`one.txt`、`two.txt`、`three.txt`
3. 把 `one.txt` 复制成 `one_copy.txt`
4. 把 `two.txt` 改名为 `second.txt`
5. 把 `second.txt` 移动到上一层的 `lab` 目录
6. 删除 `three.txt`
7. 用 `ls` 验证结果，然后 `cd ..` 再 `ls` 看看移动过来的文件

**完成后你的目录结构应该是：**
```
lab/
├── lesson1/
│   └── practice/
│       ├── one.txt
│       └── one_copy.txt
└── second.txt
```

<details>
<summary>👉 参考答案（先自己做！）</summary>

```bash
cd ~/lab/lesson1
mkdir practice
cd practice
touch one.txt two.txt three.txt
cp one.txt one_copy.txt
mv two.txt second.txt
mv second.txt ../
rm three.txt
ls            # 应显示 one.txt one_copy.txt
cd ..
ls            # 应显示 lesson1 second.txt
```
</details>

---

## 1.6 看文件的内容：`cat` `less` `head` `tail` `wc`

### 1.6.1 先造点内容（用 `echo` + 重定向，正式讲解在 1.10 节）
```bash
cd ~/lab/lesson1
echo "第一行：你好" > poem.txt
echo "第二行：世界" >> poem.txt
echo "第三行：第三行" >> poem.txt
```

- `>` 的意思是"把输出写进文件"（**覆盖**原内容）
- `>>` 是"**追加**"（写到末尾，不覆盖）
- 先照抄，原理 1.10 节细讲

### 1.6.2 `cat` — 一口气全打印（concatenate 的缩写）
```bash
cat poem.txt
```
输出：
```
第一行：你好
第二行：世界
第三行：第三行
```
**适合小文件**。内容太长会把屏幕刷爆。

```bash
cat -n poem.txt
```
→ 带行号显示。

### 1.6.3 `less` — 一页一页看（**大文件用它**）
```bash
less /etc/services
```

- 空格 = 下一页；`b` = 上一页；`/关键词` = 搜索（n 跳下一个）；`q` = 退出
- 这是查看**长文件**的标准姿势（比 cat 安全，不会刷屏）

### 1.6.4 `head` / `tail` — 只看头几行 / 尾几行
```bash
head -5 poem.txt     # 看前 5 行
tail -2 poem.txt     # 看后 2 行
```
**为什么这么有用？** 服务器日志动辄几十万行，你几乎永远只想看"最新发生了什么"：
```bash
tail -20 /var/log/syslog
```
→ 看系统日志最后 20 行。**这是排错时的第一命令，记熟。**

```bash
tail -f /var/log/syslog
```
→ `-f` = follow（跟踪）。文件每加一行新内容，屏幕自动滚动显示（实时监控）。按 `Ctrl + C` 退出这个"跟踪模式"。
> `Ctrl + C` = 强行打断当前正在运行的命令。**记住它，它能救你 100 次**（当命令卡住、屏幕疯狂滚动、程序假死时，先按它）。

### 1.6.5 `wc` — 数数（word count）
```bash
wc -l poem.txt    # 行数（-l = lines）★ 最常用
wc -w poem.txt    # 单词数
wc -c poem.txt    # 字节数
```

### 1.6.6 本节综合小练习
1. 在 `~/lab/lesson1` 里，用 `echo` 造一个 5 行的文件 `five.txt`
2. 用 `cat` 全看一遍，`head -3` 看前 3 行，`tail -3` 看后 3 行
3. 用 `wc -l` 数它有几行（核对是不是 5）
4. 用 `less` 打开 `/etc/passwd`，搜索 `root`（输入 `/root` 回车），看几处结果，按 `q` 退出

### 【你可能已经注意到的"啊哈时刻"】
你刚才做的事：**创建内容 → 存取 → 查看 → 统计**。这就是"文件操作"的全部骨架。
云计算工程师每天做的事，放大一万倍就是这个：把配置文件写好、传到正确的地方、出问题时看一眼日志。

### 【自我检验】
- [ ] 我知道 Linux 没有 C 盘，一切从 `/` 开始
- [ ] 我能用 pwd/ls/cd 在文件系统里自由移动
- [ ] 我能建、复制、移动、改名、删除文件和文件夹
- [ ] 我记住了：cp 复制文件夹要 `-r`；rm 删除没有后悔药
- [ ] 我会用 tail -f 看实时日志，用 Ctrl+C 退出

---

## 1.7 用户、权限与 sudo（本章第一座大山，慢慢爬）

### 1.7.1 为什么有"权限"这回事？
一台服务器可能很多人用，或有多个程序在跑。如果谁都能删系统文件、改别人的数据，天下大乱。所以 Linux 给**每个文件**设了"门禁"，规定：

- 谁（用户）能进
- 能干什么（读、写、执行）

> 比喻：文件像办公室房间。有的房间谁都能进（公共区），有的只有主人能进（私人办公室），有的只有管理员能进（机房）。权限就是门禁卡规则。

### 1.7.2 先认识三种"人"和三种"动作"

**三种人：**
| 身份 | 谁 | 比喻 |
|------|-----|------|
| **u** = user | 文件的主人（owner） | 房间的主人 |
| **g** = group | 和主人同组的成员 | 同一个部门的人 |
| **o** = others | 其他所有人 | 路人 |

（还有个万能身份 **root** = 超级管理员，见 1.7.5）

**三种动作：**
| 字母 | 含义 | 对文件 | 对文件夹 |
|------|------|--------|----------|
| **r** | read 读 | 能打开看内容 | 能列出里面有什么 |
| **w** | write 写 | 能修改内容 | 能在里面建/删文件 |
| **x** | execute 执行 | 能把它当程序运行 | 能进入它（cd 进去） |

### 1.7.3 看懂 `ls -l` 的那一列密码
```bash
ls -l poem.txt
```
输出：
```
-rw-r--r-- 1 student student 62 Sep 16 10:20 poem.txt
```

逐字拆解 `-rw-r--r--`（10 个字符，分 4 段看）：

```
-    rw-    r--    r--
|    |      |      |
①    ②      ③      ④
```

- ① 第一个字符：`-` = 普通文件；`d` = 目录；`l` = 快捷方式（软链接）
- ② **u（主人）的权限**：`rw-` = 能读能写，不能执行
- ③ **g（组）的权限**：`r--` = 只能读
- ④ **o（其他人）的权限**：`r--` = 只能读

翻译成人话："这是普通文件；主人可读可写；其他人只能看。"

再看后面的 `student student`：第一个是**主人名**，第二个是**组名**。

### 1.7.4 `chmod` — 改权限（核心技能）

**方法一：符号法（新手友好）**
语法：`chmod [给谁][加/减][什么权限] 文件名`
```bash
chmod u+x script.sh     # 给主人加执行权限
chmod go-w poem.txt     # 去掉组和其他人的写权限
chmod a+r poem.txt      # 给所有人（a=all）加读权限
```

- `+` 是加，`-` 是减，`=` 是"设为"

**方法二：数字法（必须学会，到处都在用）**
核心记忆表（**背下来，终身受用**）：

| 权限 | 数字 | 说明 |
|------|-----|------|
| `---` | 0 | 啥也没有 |
| `--x` | 1 | 只能执行 |
| `-w-` | 2 | 只能写 |
| `-wx` | 3 | 写+执行（2+1） |
| `r--` | 4 | 只能读 |
| `r-x` | 5 | 读+执行（4+1） |
| `rw-` | 6 | 读+写（4+2） |
| `rwx` | 7 | 全都有（4+2+1） |

**规则：r=4，w=2，x=1，把要给的加起来。**
```bash
chmod 644 poem.txt      # 主人 rw(6) + 组 r(4) + 其他 r(4)   ← 普通文件标准权限
chmod 755 myscript.sh   # 主人 rwx(7) + 组 rx(5) + 其他 rx(5) ← 脚本标准权限
chmod 600 secret.txt    # 只有主人能读能写（密码文件都这样）
chmod 700 myfolder      # 只有主人能进
```

**你是不是经常在教程里看到 `chmod +x xxx.sh`？** 意思是"给它加上执行权限"（等价于 `chmod u+x`，省略了"给谁"就默认给主人加）。

### 1.7.5 `sudo` — 临时借"管理员身份"用一下

**root 是谁？** 系统里权限最大的用户（超级管理员），能改任何东西。
**为什么不直接天天用 root？** 因为太危险——手滑一次可能毁掉系统。所以日常用普通用户（student），偶尔需要管理员权力时，临时"借"一下：

```bash
sudo apt update
```
→ 以管理员身份运行 `apt update`。第一次会要求输入**你自己的密码**（输入时屏幕不显示任何字符——这是正常的安全设计，盲打然后回车）。

**sudo 的几个要点：**
1. 前提：你的用户要在"sudoers"名单里（安装系统时创建的第一个用户默认在）
2. 输入密码时**没有回显**（不显示 `***`），不是键盘坏了
3. 连着用 sudo，短时间（默认 15 分钟）内不用重复输密码
4. 看到 `Permission denied`（权限被拒）→ 想一想：这条命令是不是要加 `sudo`

### 1.7.6 `chown` — 改文件的主人（了解即可）
```bash
sudo chown student:student poem.txt    # 把主人改成 student，组改成 student
sudo chown -R student:student /home/student/lab   # 连子目录一起改（-R 递归）
```
平时用得少，但在服务器上"把上传的东西还给自己"时很常用。

### 【本节动手作业】
```bash
cd ~/lab/lesson1
echo 'echo "我被执行了！"' > demo.sh    # 造一个"脚本"
ls -l demo.sh                            # 看它的权限（应该是 -rw-r--r--，没有 x）
./demo.sh                                # 试着执行 → 会报错 Permission denied（预演一下失败）
chmod +x demo.sh                         # 加上执行权限
ls -l demo.sh                            # 看变化：出现了 x
./demo.sh                                # 再试 → 成功输出"我被执行了！"
```
**恭喜——你刚刚完成了一次"配置 → 报错 → 改权限 → 成功"的完整循环。** 这就是运维工作的日常缩影。

### 【出错了怎么办】
- **`./demo.sh` 报 `Permission denied`**：就是缺执行权限，`chmod +x` 解决。
- **`./demo.sh` 报 `bash: ./demo.sh: No such file or directory`（但文件明明在）**：文件第一行缺少 `#!/bin/bash`（脚本的"头"），或者你在错误的目录里。以后写脚本第一行永远放 `#!/bin/bash`。
- **sudo 提示 `student is not in the sudoers file`**：你的用户没有管理员权限（云服务器上普通用户偶尔会这样）。在云控制台用 root 操作，或让管理员加你。

### 【自我检验】
- [ ] 我能读懂 `-rwxr-xr-x` 全部分段
- [ ] 给我一个 `754`，我能说出每类人有什么权限
- [ ] 我知道 chmod +x 和 chmod 755 各是什么意思
- [ ] 我用 sudo 执行过至少一条命令，并理解它是"临时借权"

---

## 1.8 装软件：`apt` 包管理器（Linux 的"应用商店"）

### 1.8.1 为什么不用去官网下载？
Linux 有一套比"去官网下安装包"高级得多的机制：**软件仓库**。
你只需要说"我要装 nginx"，系统自动：去仓库找最新版 → 下载 → 安装 → 登记。以后还能一键升级、一键卸载、自动处理依赖（`A 软件需要 B 软件`这种连环需求也自动搞定）。

> 比喻：apt 就像手机自带的应用商店。所有软件从商店统一安装，不用去各家官网找安装包。
> （Ubuntu/Debian 系用 **apt**；CentOS/红帽系用 **yum/dnf**；本教程以 Ubuntu 为准，写法不同，逻辑一样）

### 1.8.2 四个核心命令（**背**）

```bash
sudo apt update
```
→ **刷新软件目录**。从仓库服务器下载最新的"软件列表"。（注意：这只是"更新目录"，不是"更新软件"。**装任何软件前先跑它**，这是铁律。）

```bash
sudo apt install nginx
```
→ 安装 nginx（会提示占多少磁盘，问 `Do you want to continue? [Y/n]` → 按 `Y` 回车，或直接回车）

```bash
sudo apt remove nginx
```
→ 卸载。

```bash
sudo apt upgrade
```
→ 升级所有已装软件到最新版。（会问一堆确认，回车即可；耗时可能几分钟）

### 1.8.3 搜软件 + 看信息
```bash
apt search nginx        # 搜索包含 nginx 的软件包
apt show nginx          # 看这个软件包的详细信息（版本、大小、说明）
```

### 1.8.4 完整实操（现在就做）
```bash
sudo apt update
sudo apt install -y nginx
```
（`-y` = 所有询问自动答 yes，省得手动确认。**在教程/脚本里常见，但你要看一眼它装的是什么**）

装完后验证：
```bash
nginx -v
```
→ 输出类似 `nginx version: nginx/1.18.0 (Ubuntu)` → **软件装好了！**

再试试刚才教程提过的工具：
```bash
sudo apt install -y tree
tree ~/lab
```
→ `tree` 用树状图显示目录结构，非常直观（刚才批量安装的小工具之一）。

> **【进度播报】** 走到这里，你已经会 Linux 的"命令、文件、权限、装软件"了。可以说 **Linux 入门 40% 达成**。剩下的进度全靠坚持，跟智商毫无关系。

### 【出错了怎么办】
1. **`Could not get lock /var/lib/dpkg/lock-frontend`**：有另一个 apt 在运行（常见于系统自动更新）。等 2 分钟重试；或按提示 `sudo kill` 相关进程。
2. **下载很慢/超时**：需要换国内镜像源。搜索"Ubuntu 换清华源"（教程很多，就是把一个配置文件换成国内地址）。云服务器通常已配好，不用管。
3. **`E: Unable to locate package xxx`**：① 软件名拼错了 ② 忘了先 `apt update`。
4. **提示需要 `apt --fix-broken install`**：上一次安装中断了，按提示运行修复命令。

---

## 1.9 进程与服务：让软件"一直跑着"

### 1.9.1 什么是"进程"？
你运行的每一个程序，在系统里都是一个"进程"（process）。进程有 ID（编号）、有主人、占资源。
> 比喻：进程 = 正在干活的工作人员。`ps` 命令 = 查看员工花名册；`kill` = 让某个员工停工。

### 1.9.2 `ps` — 查看进程快照
```bash
ps aux
```
输出每一行是一个进程，列的含义：
```
USER  PID %CPU %MEM    VSZ   RSS TTY STAT START   TIME COMMAND
root    1  0.0  0.1 167304 11252 ?   Ss   10:00   0:02 /sbin/init
```

- `USER`：谁启动的
- `PID`：进程编号（身份证号）★后面 kill 要用
- `%CPU / %MEM`：占了多少 CPU / 内存
- `COMMAND`：这是什么程序

**实用变体：**
```bash
ps aux | grep nginx
```
→ 只看 nginx 相关的行。（`|` 是管道，意为"把左边命令的输出，交给右边继续处理"——1.10 节细讲。`grep` 是过滤关键词——1.11 节细讲。先照抄。）

```bash
top
```
→ 动态实时排行榜（每秒刷新）。按 `q` 退出。看谁在偷偷吃 CPU/内存就用它。
更漂亮的替代品：`htop`（`sudo apt install htop` 安装后运行）。

### 1.9.3 `kill` — 让进程停下
```bash
kill 12345          # 礼貌地让 PID 为 12345 的进程结束
kill -9 12345       # 强杀（对方拒绝退出时用）
```
先 `ps aux | grep 名字` 找到 PID，再 kill。**-9 是最后手段**（相当于直接拔电源，不给对方保存机会）。

### 1.9.4 `systemctl` — 服务管理（重点！）

**"服务"（service）= 一开机就自动在后台常年运行的程序**，比如网站服务器、数据库。
> 比喻：进程是"员工"，服务是"编制内的员工"——系统开机他们自动打卡上班，跑挂了会自动重启（可配置），你随时可以用 systemctl 问他们状态。

**五个常用动作**（以 nginx 为例）：
```bash
sudo systemctl start nginx      # 启动
sudo systemctl stop nginx       # 停止
sudo systemctl restart nginx    # 重启（改了配置后）
sudo systemctl status nginx     # 看状态 ★ 最常用
sudo systemctl enable nginx     # 设置"开机自启"
sudo systemctl disable nginx    # 取消开机自启
```

**`systemctl status` 的输出怎么读：**
```
● nginx.service - A high performance web server
     Loaded: loaded (/lib/systemd/system/nginx.service; enabled; ...)   ← enabled 表示开机自启
     Active: active (running) since Tue ...                             ← active (running) = 正在跑！
```

- 看到绿色的 `active (running)` = 服务活着
- 看到 `inactive (dead)` = 死了
- 看到红色的 `failed` = 启动失败（往下翻，会显示失败原因）

**看服务的日志**（服务起不来时必用）：
```bash
journalctl -u nginx --no-pager | tail -20
```
→ 看 nginx 这个服务最近的 20 行日志。
（`-u` = unit，指定服务名；`--no-pager` 防止卡在翻页模式；`| tail` 只看末尾）

### 1.9.5 完整实操：把 nginx 玩一圈
```bash
sudo systemctl status nginx
```
→ 应该看到 `active (running)`（刚装完自动运行了）

用浏览器（或命令行）访问看看：
```bash
curl http://localhost
```
→ 输出一小段 HTML（`<title>Welcome to nginx!</title>...`）——**你的服务器已经能对外提供网页了！**

```bash
sudo systemctl stop nginx
curl http://localhost        # 这次连不上（Connection refused）——服务停了，门关了
sudo systemctl start nginx
curl http://localhost        # 又能访问了
sudo systemctl restart nginx # 重启（改配置后使用）
sudo systemctl enable nginx  # 确保开机自启
```

> **【里程碑】** 到这里，你已经完成了"安装软件 → 启动服务 → 验证访问 → 停/启/重启"的完整运维闭环。**刚才这一套，和你在互联网公司每天做的工作，本质上一模一样。**

### 【出错了怎么办】
1. **`systemctl status` 显示 failed**：`journalctl -u 服务名 | tail -30` 看日志找原因（端口被占？配置写错？文件不存在？）
2. **`curl: (7) Failed to connect`**：服务没起来，或端口不对。先查状态再查监听：`ss -tlnp | grep 80`
3. **`Job for xxx.service failed`**：常见是配置语法错误。nginx 可以用 `sudo nginx -t` 检查配置。
4. **改完配置没生效**：九成忘了 `restart`。**改配置 → 检查语法 → 重启 → 验证**，这是标准四步。

### 【自我检验】
- [ ] 我能用 ps aux 找进程、读 PID
- [ ] 我能用 systemctl 完成 启动/停止/重启/看状态/设自启
- [ ] 服务 failed 时我知道去看 journalctl 日志
- [ ] 我改完配置会记得 restart 并用 curl 或浏览器验证

---

## 1.10 管道与重定向：Linux 的灵魂（**本节最重要，反复读**）

### 1.10.1 先理解："输出"有三种去处
每个命令运行后都会产生"输出"。默认情况下：

- **标准输出**（正常结果）→ 打在屏幕上
- **标准错误**（报错信息）→ 也打在屏幕上（是两条独立的通道！）

我们要学的技术，就是**把这些输出"改道"**：

- 写进文件（`>` `>>`）
- 送给另一个命令继续加工（`|`）

### 1.10.2 重定向：把输出"灌进"文件

```bash
echo "第一行" > note.txt
```

- `>` ：**覆盖写入**。文件不存在就创建；存在就**清空后重写**。刚运行完，note.txt 里是"第一行"。

```bash
echo "第二行" >> note.txt
```

- `>>` ：**追加**在末尾。现在文件里有两行。

```bash
echo "第三行" > note.txt
```

- 又用 `>` → **悲剧警告**：前两行没了！文件里只剩"第三行"。
- **教训：想保留原内容，永远用 `>>`。`>` 会连锅端。**

**把命令的"错误信息"单独抓出来：**
```bash
ls /no/such/dir 2> error.txt     # 错误信息（2号通道）写进文件
ls /no/such/dir 2> /dev/null     # 把错误扔进"黑洞"（/dev/null = 垃圾桶，写了就扔）
```
（数字 2 表示"标准错误"通道；`1` 是标准输出、`0` 是标准输入。**`2>/dev/null` 这个写法你以后会天天见到，含义就是"这命令的错误信息我不想看"。**）

**两个通道都要？**
```bash
some_command > all.log 2>&1
```
（`2>&1` = "把 2 号通道接到 1 号通道上"，即错误和正常输出都进同一个文件。老生常谈的写法，照抄会用即可。）

**从文件"喂"输入给命令：**
```bash
wc -l < note.txt       # 把文件内容喂给 wc 统计（而不是把文件名当参数）
```
（用得不那么多，认识即可）

### 1.10.3 管道 `|`：把命令串成流水线
语法：`命令A | 命令B`
含义：**把 A 的输出，直接当作 B 的输入。**

> 比喻：工厂流水线。A 工序加工完的东西，直接传送带交给 B 工序，不需要落地（不需要先存文件再读取）。**屏幕上一个字都不会出现，因为数据都在管道里流走了。**

经典例子（跟着做）：
```bash
ps aux | grep nginx
```

- `ps aux` 列出全部进程 → **交给** → `grep nginx`（从里面挑出含 "nginx" 的行）→ 屏幕只显示结果。

```bash
cat /etc/passwd | wc -l
```

- 读出用户账号文件 → 交给 wc 数行数 → "这台机器有 N 个账号"。

三条管道连用：
```bash
history | grep apt | tail -5
```

- 历史命令 → 挑出含 apt 的 → 只看最后 5 条。**"我上一条 apt 命令敲了什么来着？"——这个组合直接回答你。**

再来一个经典的：
```bash
ls -l /usr/bin | wc -l
```
→ 数一数 `/usr/bin` 里有多少个命令程序。

**为什么要学管道？** 因为 Linux 的哲学是"**每个小命令只干好一件事，用管道把它们拼起来干大事**"。高手和新手的差距，一半在管道的使用。

### 【本节动手作业】
```bash
cd ~/lab/lesson1
echo "apple" > fruit.txt
echo "banana" >> fruit.txt
echo "cherry" >> fruit.txt
echo "durian" >> fruit.txt
cat fruit.txt | wc -l                # 数行数 → 4
cat fruit.txt | grep an               # 挑出含 "an" 的行 → banana durian
ls /etc | head -5                     # 列 /etc 然后只看前5个
```
最后自己造一个"三连管道"：
```bash
cat fruit.txt | grep a | wc -l
```
→ 数一数有几行含字母 a。**思考题**：输出是几？为什么？

<details><summary>答案</summary>4 行里含 a 的是 apple、banana、durian → 3（cherry 没有 a）。</details>

---

## 1.11 查找两大法宝：`find` 找文件，`grep` 找内容

### 1.11.1 `find` — "我文件放哪了？"
**语法：`find 去哪里找 按什么条件找`**

```bash
find /etc -name "nginx.conf"        # 在 /etc 下找名字叫 nginx.conf 的文件
find ~ -name "*.txt"                # 在家目录找所有 .txt 文件（* 是通配符，"随便什么"）
find / -name "*.log" 2>/dev/null    # 全盘找（慢！加了 2>/dev/null 把没权限的报错藏起来）
find ~ -type d -name "lab"          # 只找"目录类型"(-type d)的
find /tmp -mtime +7                 # 找 7 天以前修改过的（mtime = modify time）
```

**常用组合**：找到后直接对它们操作：
```bash
find ~/lab -name "*.txt" -exec wc -l {} \;
```
→ 找到每个 txt 文件，对每个执行 `wc -l`。（`{}` = "找到的那个文件名"；`\;` = 命令结束。别问为什么，这是固定写法，照抄。）

### 1.11.2 `grep` — "这个内容在哪个文件里？"
**语法：`grep 关键词 文件`**

```bash
grep "error" /var/log/syslog        # 在日志里找含 error 的行
grep -i "error" app.log             # -i 忽略大小写（Error/ERROR/error 全找）
grep -n "error" app.log             # -n 显示行号
grep -r "hello" ~/lab               # -r 递归：连子目录里的文件一起搜 ★超常用
grep -v "info" app.log              # -v 反选：显示"不含"info 的行
grep -c "error" app.log             # -c 只数有多少行匹配
```

**和管道是好搭档**（回看上一节）：
```bash
ps aux | grep ssh                   # 从进程列表里找 ssh
systemctl status nginx | grep Active  # 从状态输出里只抓状态那行
```

### 1.11.3 `which` 和 `locate`（小补丁）
```bash
which python3        # python3 这个命令的"程序文件"放在哪 → /usr/bin/python3
whereis nginx        # 找 nginx 相关的所有文件位置
```

### 【本节动手作业】
```bash
find /etc -name "*.conf" 2>/dev/null | head -10    # 找配置文件的样本
grep -r "student" /etc/passwd                       # 提前预览：你自己的账号在不在用户文件里？
grep -c "" /etc/passwd                              # 数数系统里有多少个账号（-c "" 数空模式=数所有行）
```

---

## 1.12 文本处理三兄弟：`grep`(已学) `sed` `awk`（先会用）

你看过武侠片的"三把刀"吗？Linux 数据处理的江湖里也有三把刀：grep 是找，sed 是改，awk 是切。

### 1.12.1 `sed` — 替换文字（最常用的一招）
```bash
sed 's/旧文字/新文字/' file.txt        # 每行"第一个"旧文字替换成新文字（只在屏幕上改，不动文件）
sed 's/旧文字/新文字/g' file.txt       # 加 g：整行所有旧文字都替换
sed -i 's/abc/xyz/g' file.txt          # ★ -i：真的写回文件！
```
**实操：**
```bash
cd ~/lab/lesson1
echo "I love apple" > sed_demo.txt
sed 's/apple/orange/' sed_demo.txt     # 屏幕上看到 I love orange（文件没变）
cat sed_demo.txt                        # 文件里还是 apple
sed -i 's/apple/orange/' sed_demo.txt  # 这次真的改
cat sed_demo.txt                        # 变成了 orange
```
> 用途想象：把配置文件里 `server_name old.com;` 批量换成 `server_name new.com;`——这就是比赛里"批量改配置"的标准姿势。

### 1.12.2 `awk` — 切列（按列加工）
```bash
awk '{print $1}' file.txt        # 打印每行的第 1 "列"（默认按空格/制表符分列）
awk '{print $1, $3}' file.txt    # 打印第1和第3列
awk -F: '{print $1}' /etc/passwd # -F: 指定"冒号"为列分隔符（passwd 文件是冒号分隔的）
```
**实操（背下来，很实用）：**
```bash
awk -F: '{print $1}' /etc/passwd | head -5
```
→ 输出系统前 5 个用户名。（`/etc/passwd` 每行长这样：`root:x:0:0:root:/root:/bin/bash`，第一个冒号前就是用户名）

```bash
ps aux | awk '{print $2, $11}' | head
```
→ 进程 PID + 程序名两列。

### 1.12.3 它们和管道的组合威力
```bash
cat /etc/passwd | awk -F: '$3 >= 1000 {print $1}' 
```
→ 列出所有 UID ≥ 1000 的用户（Linux 里 UID≥1000 的是"真人用户"，小数字是系统账号）。**这条命令=1 秒回答"这台机器有哪些真人在用的账号"。**

### 【自我检验】
- [ ] sed 的 `s/旧/新/g` 我能说出来每一部分含义
- [ ] 我知道 `sed -i` 才会真的写文件
- [ ] awk 的 `-F` 和 `$1` 我知道是干嘛的
- [ ] 我能用"grep+管道+awk"从文件里提取想看的信息

---

## 1.13 编辑文件：`nano`（简单）与 `vim`（必考）

在服务器上改配置文件**天天都要做**。图形界面的"记事本"不存在（服务器没有屏幕），所以要用**终端里的编辑器**。

### 1.13.1 `nano` — 新手的第一选择
```bash
nano test.txt
```
进入编辑界面后，**直接打字**就是编辑（不像 vim 还要先按 i）。

记住屏幕最下方的提示（`^` 表示 Ctrl 键）：
| 按键 | 作用 |
|------|------|
| `Ctrl + O` | 保存（然后按回车确认文件名） |
| `Ctrl + X` | 退出（如果没保存会问你 Y/N） |
| `Ctrl + W` | 搜索 |
| `Ctrl + K` | 剪切当前行 |

**实操（现在就做）：**
```bash
cd ~/lab/lesson1
nano script1.txt
# 进入后输入：hello nano
# 按 Ctrl+O，回车，Ctrl+X 退出
cat script1.txt      # 验证内容
```

### 1.13.2 `vim` — 闭着眼睛也要会（比赛环境几乎都有它）

vim 的"怪"在于：它有**两种模式**。

- **普通模式**（默认进入的）：按键是"发指令"
- **编辑模式**：按键才是"打字"

**最小可用流程（背 6 个键就能活）：**
1. `vim test2.txt` 进入 → 现在在**普通模式**
2. 按 `i` → 进入**编辑模式**（左下方出现 `-- INSERT --`）
3. 打字
4. 按 `Esc` → 回到**普通模式**（左下角 INSERT 消失）
5. 输入 `:wq` 回车 → **保存并退出**（w=write 写，q=quit 退）
   - `:q!` = 不保存强行退出（改坏了救命用）
6. 忘了一切？按 `Esc` 几次，然后 `:q!` 逃出来重来。

**存活口诀："i 进去，Esc 出来，:wq 保存，:q! 逃跑。"**

**实操：**
```bash
vim test2.txt
# i → 输入 "hello vim" → Esc → :wq → 回车
cat test2.txt            # 验证
```

### 1.13.3 什么时候用哪个？
- 临时改几行配置 → **nano**（省心）
- 老手快速改、或比赛环境只有 vim → **vim**
- 建议：两个都练。nano 保底，vim 加分。

---

## 1.14 环境变量与 PATH（"为什么我的命令找不到"）

### 1.14.1 什么是"环境变量"？
环境变量 = **系统里的"全局便利贴"**，上面写着各种配置信息，所有程序都能看到。

```bash
echo $HOME         # 显示你的家目录，比如 /home/student
echo $USER         # 当前用户名
echo $PATH         # 显示 PATH 这张"便利贴"的内容
```

- `$变量名` = "读出这张便利贴上的内容"
- `$HOME`、`$USER` 是系统预置的；你也能自己贴新的：
```bash
MY_NAME="张三"
echo $MY_NAME      # 张三
```
（注意：`=` 两边不能有空格！`MY_NAME = "张三"` 会报错——这是新手高频错误）

### 1.14.2 PATH：命令的"搜索路线图"
当你敲下 `ls`，系统怎么知道要运行 `/usr/bin/ls`？
它去 **PATH 这张便利贴**上列出的**一串目录**里挨个找。PATH 长这样：
```
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```
（冒号分隔的一串目录）

**"command not found" 的真相**：你的命令**不在 PATH 列表的任何一个目录里**。

**三种找回来的办法：**
```bash
# 办法1：用完整路径运行
/opt/myapp/start.sh

# 办法2：临时把目录加进 PATH（只对这个窗口有效）
export PATH=$PATH:/opt/myapp
start.sh             # 现在能直接跑了

# 办法3：永久生效——写进 ~/.bashrc
echo 'export PATH=$PATH:/opt/myapp' >> ~/.bashrc
source ~/.bashrc     # 立刻生效（不用重开窗口）
```

### 1.14.3 `.bashrc`：你的"开机自启配置"
`~/.bashrc` 是个脚本文件，**每次打开新终端都会自动执行一遍**。所以：

- 想每次开机自动设置的 PATH、别名、提示符 → 写这里
- 改完要么重开终端，要么 `source ~/.bashrc` 让它立即生效

**进阶小甜点——别名（alias）：**
```bash
echo 'alias ll="ls -lh"' >> ~/.bashrc
source ~/.bashrc
ll                      # 等于 ls -lh，偷懒神器
```

---

## 1.15 写你的第一个 Bash 脚本（自动化之门）

### 1.15.1 脚本是什么？
把一堆命令写进一个文件，以后一条命令跑完一整套操作。**这就是"自动化"的开始，也是比赛的得分利器**（评分脚本、部署脚本、备份脚本全是它）。

### 1.15.2 第一个脚本（完整走一遍）
```bash
cd ~/lab/lesson1
nano hello.sh
```
输入以下内容（**第一行必须有**）：
```bash
#!/bin/bash
# 这是注释，井号开头的行不会被执行
echo "脚本开始运行"
echo "当前用户: $USER"
echo "当前时间: $(date)"
echo "脚本结束"
```
保存退出 → 加执行权限 → 运行：
```bash
chmod +x hello.sh
./hello.sh
```
输出：
```
脚本开始运行
当前用户: student
当前时间: Tue Sep 16 11:22:33 CST 2026
脚本结束
```

**三个知识点：**

- `#!/bin/bash`：告诉系统"用 bash 解释我"（叫 shebang，读作"社邦"）。**每个脚本的第一行都写它，没有就报错。**
- `#` 注释：给人看的，不执行。
- `$(命令)`：把命令的**输出**嵌进这里。`$(date)` = 执行 date 并把结果贴在这。

### 1.15.3 变量、条件、循环（三个核心结构）

**变量：**
```bash
#!/bin/bash
NAME="小明"
echo "你好，$NAME"
```
（赋值时等号两边**不能有空格**；使用时前面加 `$`）

**条件（if）：**
```bash
#!/bin/bash
if [ -f /etc/passwd ]; then
    echo "文件存在"
else
    echo "文件不存在"
fi
```

- `[ -f 路径 ]` = "这个文件存在吗？"（**中括号内侧要有空格！**）
- `-f` 文件、`-d` 目录、`-z` 空字符串…… 这些叫"测试条件"，先认识 -f -d 即可
- `fi` = if 倒过来写，表示"if 块结束"（bash 的古怪传统）

**循环（for）：**
```bash
#!/bin/bash
for i in 1 2 3 4 5; do
    echo "第 $i 次"
done
```
或遍历文件：
```bash
for f in ~/lab/lesson1/*.txt; do
    echo "文件: $f"
done
```

### 1.15.4 来写个"真正有用"的脚本：一键备份
```bash
nano backup.sh
```
```bash
#!/bin/bash
# 备份脚本：把 lab 目录打包到 /tmp，文件名带日期
BACKUP_DIR="/tmp"
NAME="lab-backup-$(date +%Y%m%d).tar.gz"

echo "开始备份..."
tar -czf "$BACKUP_DIR/$NAME" ~/lab
echo "备份完成: $BACKUP_DIR/$NAME"
ls -lh "$BACKUP_DIR/$NAME"
```
```bash
chmod +x backup.sh
./backup.sh
```
→ 你刚刚写了一个**每天能用的自动备份工具**。世界赛 Module A 的评分点里，就有一条是"检查备份脚本正确"——**你已经在学比赛要考的内容了。**

### 【出错了怎么办】
1. **`Syntax error`**：检查 if 结尾有没有 `fi`、for 结尾有没有 `done`、中括号空格对不对
2. **变量输出成空**：变量赋值时等号后不能有空格；或忘写 `$`
3. **中文乱码**：脚本文件编码不是 UTF-8。用 `file 脚本名` 检查，nano 保存时一般没问题
4. **`$'\r': command not found`**：从 Windows 复制来的文件带了换行符锅。装 `dos2unix` 跑一下：`sudo apt install dos2unix && dos2unix 脚本名`

---

## 1.16 压缩与打包：`tar`（服务器上唯一的"压缩包"姿势）

Windows 里你右键"压缩成 zip"。服务器上最常见的是 `.tar.gz`（也叫 .tgz）——**一个文件，里面可以装一堆文件**。

**两个动作走天下：**

```bash
# 打包压缩（c=create 创建，z=gzip 压缩，f=file 指定文件名，v=verbose 显示过程）
tar -czvf backup.tar.gz ~/lab

# 解包解压（x=extract 提取）
tar -xzvf backup.tar.gz

# 解到指定目录
tar -xzvf backup.tar.gz -C /tmp/
```

**记忆口诀**：

- 压缩：`tar -czvf 包名.tar.gz 要打包的东西`
- 解压：`tar -xzvf 包名.tar.gz`
- （c 变 x，其余不变。**这两个记住，一辈子够用。**）

**看压缩包里有什么（不解压）：**
```bash
tar -tzvf backup.tar.gz
```
（把 x 换成 t = list）

**实操：**
```bash
cd ~/lab/lesson1
tar -czvf lab.tar.gz ~/lab
ls -lh lab.tar.gz          # 看看压缩后多大
mkdir /tmp/extract-test
tar -xzvf lab.tar.gz -C /tmp/extract-test
ls /tmp/extract-test       # 解出来一堆东西
```
> 其他格式认识一下：`.zip`（用 zip/unzip 命令）、`.tar`（只打包不压缩）、`.gz`（单文件压缩）、`.7z/.rar`（服务器少见）。

---

## 1.17 SSH：连接远程服务器（**比赛和工作的生命线**）

### 1.17.1 什么是 SSH？
SSH（Secure Shell）= **加密的远程控制通道**。你在自己电脑上敲命令，实际执行在远方的服务器上。全世界管理服务器都靠它。

> 你买云服务器后做的第一件事、世界赛场上连接比赛机器、公司里连生产服务器——**全是 SSH**。

### 1.17.2 从你这台机器连到另一台（动手实验）
先在本地（虚拟机方案的同学）确认 ssh 服务开着：
```bash
sudo apt install -y openssh-server
sudo systemctl enable --now ssh    # 装好并立即启动
```

**连接命令格式：**
```bash
ssh 用户名@服务器地址
```
比如：
```bash
ssh root@47.103.xx.xx        # 连到你的云服务器
```

- 第一次连接会问 `Are you sure...(yes/no)?` → 输入 `yes` 回车（在记账本上记下这台机器的指纹）
- 然后输入密码 → 进入远程服务器的命令行
- 想退出远程 → 输入 `exit` 回车

### 1.17.3 免密登录：SSH 密钥（现代标准，也是比赛考点）
每次输密码太麻烦，而且密码可以猜。**密钥登录**是更安全更快的方案：

```bash
# 第 1 步：在自己电脑上生成一对钥匙（公钥+私钥）
ssh-keygen -t ed25519
# 一路回车（密码短语可以直接回车留空）

# 第 2 步：把"公钥"（锁）装到服务器上
ssh-copy-id root@47.103.xx.xx
# 输入一次密码后，以后再也不用了

# 第 3 步：验证——现在登录不要求密码了
ssh root@47.103.xx.xx
```
**原理（人话版）**：

- 你生成了一对**世界上唯一配套的钥匙**：私钥（你自己留着，绝不外传）+ 公钥（可以随便发）
- 把公钥放到服务器 = 给服务器装上你专属的锁
- 你来连接 = 出示私钥开锁 → 免密进入
- **私钥 = 你的身份证**。谁拿到你的私钥，谁就是你。所以 `~/.ssh/id_ed25519` 这个文件（没有 .pub 后缀的）**永远不给任何人**。

> 世界赛里还有更高级的"SSH 证书认证"（CA 签发用户证书，Module A 评分点 A11）——等学到中级篇再进阶。

### 1.17.4 文件互传：scp
```bash
scp 本地文件 root@服务器:/目标路径/        # 上传
scp root@服务器:/远程文件 ./              # 下载
scp -r 本地文件夹 root@服务器:/目标/       # 传文件夹（-r）
```
（都是套用 ssh 的通道，`scp` 已学，进阶工具 `rsync` 以后再说）

---

## 1.18 磁盘与挂载（先懂概念，实操以后练）

### 1.18.1 看磁盘用量：`df` 和 `du`
```bash
df -h
```
→ 显示每块"盘"用了多少、还剩多少（-h = 人话版单位）。
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda2        20G  8.5G   11G  45% /
```

- **`Use%` 到 100% 是服务器最常见事故之一**（日志撑爆磁盘）。学会看这个数字。

```bash
du -sh ~/lab          # 看某个目录总共占多大（-s 汇总，-h 人话单位）
du -sh /var/log/*     # 看日志目录里每个文件占多大（找出谁在"吃"磁盘）
```

### 1.18.2 什么是"挂载"（mount）？
Windows 里插个 U 盘自动出现"E 盘"。Linux 里没有"盘符"这回事，新设备要**手动挂到目录树上的某个文件夹**（这个文件夹叫挂载点）。
```bash
lsblk                     # 看系统里有哪些"盘"（块设备）
sudo mount /dev/sdb1 /mnt # 把 sdb1 这块盘挂到 /mnt 目录
df -h | grep mnt          # 验证
sudo umount /mnt          # 卸载
```
**为什么它重要？** 世界赛 Module A 有个评分点是"检查 fstab 配置"——那是一种**开机自动挂载**的配置（把挂载规则写进 `/etc/fstab` 文件）。今天先混个脸熟，中级篇专门练。

### 1.18.3 `/etc/fstab` 长什么样（看一眼，别改）
```bash
cat /etc/fstab
```
你会看到几行"设备 → 挂载点 → 文件系统类型 → 选项"的表格。**改错它系统会开不了机**——所以今天只看不碰。记住这个词：fstab，以后重逢。

---

## 1.19 第 1 章终极大检验（10 道实战题）

**规则**：不许翻前面的教程（除了查命令的 --help），在 40 分钟内完成。

1. 在家目录建 `final` 文件夹，里面建 `docs` 和 `backup` 两个子文件夹
2. 在 `docs` 里创建 3 个文本文件，分别写入内容"第一课"、"第二课"、"第三课"
3. 把 3 个文件复制到 `backup`，改名为 `lesson1.txt lesson2.txt lesson3.txt`
4. 把 `docs` 里原始 3 个文件的内容合并显示输出（提示：`cat 文件1 文件2 文件3`）
5. 统计 `docs` 里一共有多少行文字
6. 在 `/var/log` 里找出今天修改过的、名字含 `.log` 的文件（提示：find + -mtime）
7. 用 sed 把 `docs/第一课文件` 里的"第一课"改成"第 111 课"
8. 写一个脚本 `check.sh`：创建文件夹 `/tmp/check-今天的日期`，在里面写一个文件 `ok.txt` 内容为"检查完成"，然后输出文件列表
9. 给 `check.sh` 加执行权限并运行，验证 `/tmp` 里出现了"check-日期"文件夹和里面的文件
10. 把整个 `final` 文件夹打包成 `final.tar.gz`，解压一份到 `/tmp` 验证

<details>
<summary>👉 参考答案（全都做完再看）</summary>

```bash
# 1
mkdir -p ~/final/docs ~/final/backup
cd ~/final

# 2
echo "第一课" > docs/a.txt
echo "第二课" > docs/b.txt
echo "第三课" > docs/c.txt
ls docs     # 确认

# 3
cp docs/a.txt backup/lesson1.txt
cp docs/b.txt backup/lesson2.txt
cp docs/c.txt backup/lesson3.txt
ls backup

# 4
cat docs/a.txt docs/b.txt docs/c.txt

# 5
cat docs/*.txt | wc -l          # 或者 wc -l docs/*.txt

# 6
find /var/log -name "*.log" -mtime -1 2>/dev/null | head

# 7
sed -i 's/第一课/第 111 课/' docs/a.txt
cat docs/a.txt                  # 验证

# 8
nano check.sh
#   内容：
#   #!/bin/bash
#   D="/tmp/check-$(date +%Y%m%d)"
#   mkdir -p "$D"
#   echo "检查完成" > "$D/ok.txt"
#   ls -l "$D"

# 9
chmod +x check.sh
./check.sh

# 10
cd ~
tar -czvf final.tar.gz final
mkdir -p /tmp/unpack && tar -xzvf final.tar.gz -C /tmp/unpack
ls /tmp/unpack/final
```
</details>

**评分标准**：10 题对 8 题以上 → 第 1 章毕业，进第 2 章。6-7 题 → 把错的题对应的章节重看一遍。5 题以下 → 别急，把 1.4-1.15 再过一遍，正常人都需要两遍。

### 【自我检验总表（全勾 = 毕业）】
- [ ] 我能在文件系统里自由移动、建/删/改/查文件和文件夹
- [ ] 我懂权限的读法，会 chmod 数字法和 +x
- [ ] 我会用 apt 装软件、systemctl 管理服务、journalctl 看日志
- [ ] 我理解管道和重定向，能组合 grep/sed/awk 处理文本
- [ ] 我会用 nano 和 vim（最小操作）编辑文件
- [ ] 我理解环境变量、PATH，改过 .bashrc
- [ ] 我写过带变量/条件/循环的脚本，并成功运行
- [ ] 我会用 tar 打包解包、用 ssh 连服务器
- [ ] 我知道 df -h 看磁盘、find 找文件

**全勾上了？恭喜你——你已经真正跨过了"从零到一"。**
你现在掌握的这些，不是"看到过"，而是"做到过"——这已经超过了 90% 嘴上说想学的人。

---

## 1.20 下一章预告 + 给坚持到这里的你

下一章：**网络零基础**——你会搞懂"IP 地址是什么""为什么访问不了网站""DNS 是干嘛的"，并亲手搭出你人生第一个网站服务器，用另一台设备访问它。

最后三句话（请认真读）：
1. **忘掉"我是不是太笨了"这种问题**。你不是笨，你只是第一次接触。所有老手都忘了他当初也多问了一遍"mkdir 是啥"。
2. **今天学会的每个命令，都是你将来吃饭的家伙**。它们十年后依然有用——这是这个行业少有的"投资不会贬值"的地方。
3. **卡住了就休息，不要放弃**。一个问题想 20 分钟想不通，就跳过它继续往下学，学好后面的回头看往往豁然开朗。

第 2 章见。
