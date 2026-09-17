# 第 8 章 · Windows Server 基础（另一半世界）

> 云是混合的：Linux 管一半，Windows 管另一半。企业的"域环境"（AD）几乎全是 Windows。
> 世界赛 Module B（Windows 模块）8 台主机的考点：AD 域、DNS、组策略、文件共享、IIS、证书服务——本章带你全部过一遍。
> 预计学习时间：2-3 周。

---

## 8.1 先搞清楚：Windows Server 到底是什么、为什么要学

### 它和 Windows 10/11 的区别
- 界面长得差不多，但**用途完全不同**：Server 版专门给企业"当服务器"用（没有小娜、没有应用商店）
- 核心特色能力：**域（Domain）**——上千台电脑统一管理；文件服务器；IIS 网站；证书服务……

### 什么是"域"（AD）？为什么企业离不开它
你有 500 名员工的电脑要管理：每个人有自己的账号密码、每台电脑的权限策略、共享文件夹谁能看……
- **没有域**：500 台电脑各自管理账号（崩溃）
- **有域**：一台"域控制器"（DC）统一管所有账号和策略。员工在任何一台加域的电脑上都能用同一个账号登录。

> 比喻：域 = 公司的大人事系统+大门口禁系统。域控制器 = 人事部。员工账号 = 工牌。组策略 = 公司规章制度（自动下发到每台电脑）。

**世界赛 Module B 的比赛环境**：一堆 Windows Server VM（DC1、DC2、文件服务器、Web 服务器、路由器…），要求你从零搭出一整套域环境并配置各种策略。**本章就是那个比赛的入门训练。**

---

## 8.2 准备实验环境

### 8.2.1 下载与安装
1. 搜索 **"Windows Server 2022 评估版"**（微软官网提供 180 天免费评估版 ISO）
2. VMware 里新建虚拟机（和装 Ubuntu 一样，过程见第 1 章）：
   - 内存建议 **4GB**（域控吃内存）
   - 磁盘 **60GB**
   - 网络：NAT（够用；要多机互联就桥接）
3. 安装时选 **Desktop Experience**（带图形界面，方便学习；生产上一般用 Core 无界面版）

### 8.2.2 装完后先做三件事
1. **改计算机名**（域环境里名字很重要）：
   - 服务器管理器 → 本地服务器 → 计算机名 → 更改 → 改成 `DC1`（约定俗成的域控名）→ 重启
2. **配静态 IP**（域控必须固定 IP！）：
   - 设置 → 网络 → 适配器选项 → IPv4 → 手动：
   - IP: `192.168.10.10`，掩码 `255.255.255.0`，网关留空或路由器，**DNS 先设成 127.0.0.1**（自己）
3. **关掉 IE 增强安全配置**（不然测试网页到处拦）：
   - 服务器管理器 → 本地服务器 → IE ESC → 都关掉（学习环境）

### 8.2.3 认识 PowerShell（Windows 的命令行）
开始菜单搜索 `PowerShell`（蓝色图标），右键"以管理员身份运行"。这就是 Windows 版的"终端"。

**基础命令对照（学 Linux 的人秒懂）**：

| 干什么 | Linux | PowerShell |
|--------|-------|-----------|
| 看当前目录 | `pwd` | `Get-Location`（简写 `pwd` 也行） |
| 列目录 | `ls` | `Get-ChildItem`（简写 `ls`/`dir`） |
| 切换目录 | `cd /etc` | `Set-Location C:\` （简写 `cd`） |
| 看文件内容 | `cat f` | `Get-Content f`（`cat` 也行） |
| 建目录 | `mkdir` | `New-Item -ItemType Directory -Name test` |
| 删文件 | `rm f` | `Remove-Item f` |
| 查进程 | `ps aux` | `Get-Process` |
| 查服务 | `systemctl status x` | `Get-Service x` |
| 找命令 | `which` | `Get-Command` |

**PowerShell 的心法**：动词-名词（Verb-Noun）。`Get-` 是拿、`Set-` 是设、`New-` 是新建、`Remove-` 是删。看懂模式，命令不用背。

**实战几个：**
```powershell
Get-ComputerInfo | Select-Object CsName, WindowsVersion   # 看系统信息
Get-Service | Where-Object {$_.Status -eq "Running"} | Select-Object -First 10   # 运行中的服务
ipconfig /all                                              # 看网络配置（老命令依然好使）
```
**管道 `|` 在 PowerShell 里更强大**（对象级处理），和 Linux 一个思路。

---

## 8.3 核心实战 1：搭建域控制器（AD DS）

### 8.3.1 安装 AD DS 角色
图形方式（学习期先用图形，熟了再上 PowerShell）：
1. 服务器管理器 → **添加角色和功能**
2. 一路下一页 → 勾选 **"Active Directory 域服务"**（弹出的依赖项全部添加）
3. 装完后点击旗子图标的通知 → **"将此服务器提升为域控制器"**

### 8.3.2 提升为域控
1. 选择 **"添加新林"**（全新域名）
2. 根域名：`mycompany.local`（练习用 `.local`；真实公司用自己的域名）
3. 功能级别默认，勾选 **DNS 服务器**（一起装）
4. DSRM 密码：设一个记得住的（比如 `P@ssw0rd123`）
5. 一路下一步 → 安装 → 自动重启

**重启后用域管理员登录**：用户名 `MYCOMPANY\Administrator`（或 `Administrator@mycompany.local`）

**验证**：
```powershell
Get-ADDomain                 # 显示域信息（默认需要 RSAT 工具，域控上自带）
Get-ADDomainController       # 看域控状态
```
或在"管理工具"里打开 **Active Directory 用户和计算机**——这就是"人事部管理系统"的界面。

### 8.3.3 建组织架构（OU / 用户 / 组）——Module B 评分点同款
**先建 OU（组织单位 = 文件夹式的部门结构）**：
图形：AD 用户和计算机 → 右键域名 → 新建 → 组织单位 → 建 `Employees`、`Servers`、`Groups` 三个 OU。

**PowerShell 方式（更帅气，也是评分脚本检查的方式）**：
```powershell
New-ADOrganizationalUnit -Name "Employees" -Path "DC=mycompany,DC=local"
New-ADOrganizationalUnit -Name "Servers"   -Path "DC=mycompany,DC=local"
New-ADOrganizationalUnit -Name "Groups"    -Path "DC=mycompany,DC=local"
```

**建用户和组**：
```powershell
# 建用户（-Enabled $true 直接启用）
New-ADUser -Name "张三" -SamAccountName "zhangsan" -UserPrincipalName "zhangsan@mycompany.local" `
  -Path "OU=Employees,DC=mycompany,DC=local" -AccountPassword (ConvertTo-SecureString "Abc12345!" -AsPlainText -Force) -Enabled $true

# 建组
New-ADGroup -Name "IT-Team" -GroupScope Global -Path "OU=Groups,DC=mycompany,DC=local"

# 把张三加入组
Add-ADGroupMember -Identity "IT-Team" -Members "zhangsan"

# 查询验证
Get-ADUser -Filter * | Select-Object Name, SamAccountName
Get-ADGroupMember -Identity "IT-Team"
```
（注意 PowerShell 里反引号 `` ` `` 是"命令太长换行"。这是从别人脚本里抄命令时最常见的坑。）

**批量建 20 个用户（自动化思维，Module B 有"用脚本创建用户"的评分点）**：
```powershell
1..20 | ForEach-Object {
    $name = "remote$_"
    New-ADUser -Name $name -SamAccountName $name `
      -UserPrincipalName "$name@mycompany.local" `
      -Path "OU=Employees,DC=mycompany,DC=local" `
      -AccountPassword (ConvertTo-SecureString "Abc12345!" -AsPlainText -Force) -Enabled $true
}
Get-ADUser -Filter "Name -like 'remote*'" | Measure-Object   # 数一数 → Count: 20
```

### 8.3.4 加域：让另一台机器"入伙"
在**另一台** Windows Server（比如 FILE-SRV）上：
1. 先设 DNS：**指向域控 IP**（192.168.10.10）——**这是加域失败的第一大坑：DNS 没指对连域名都解析不了**
2. 计算机名改成 `FILE-SRV` → 重启
3. 设置 → 系统 → 高级系统设置 → 计算机名 → 更改 → 选择"域" → 填 `mycompany.local` → 输入域管理员账号密码 → 成功后重启
4. 重启后用域账号登录：`MYCOMPANY\zhangsan` 或 `zhangsan@mycompany.local`

**验证加域成功**：
```powershell
whoami        # → mycompany\zhangsan 形式
systeminfo | findstr /i domain
```

---

## 8.4 核心实战 2：Windows 上的 DNS 服务器

域控装 AD 时已经自带 DNS。验证与操作（Module B 的 NW-SRV 考点是"从区传输"）：
1. 管理工具 → **DNS**
2. 展开：正向查找区域 → `mycompany.local` ——能看到域控自动生成的记录（域控自己、_msdcs 等）
3. **手动建记录**（右键区域 → 新建主机 A 记录）：
   - `www` → `192.168.10.20`
   - `mail` → `192.168.10.21`
4. **反向查找区域**：右键"反向查找区域" → 新建 → 网络 ID 填 `192.168.10` → 完成
5. 验证：`nslookup www.mycompany.local 192.168.10.10`

**辅助区域（从区传输）实验**（评分点技能）：
- 在第二台服务器（装 DNS 角色）上：右键 → 新建区域 → **辅助区域** → 名称 `mycompany.local` → 主服务器填 `192.168.10.10`
- 成功同步后能看到和主一样的记录。**这就是"主从复制"的 Windows 版。**

---

## 8.5 核心实战 3：文件共享与 DFS

### 8.5.1 基础共享（FILE-SRV 上）
```powershell
# 建文件夹结构
New-Item -ItemType Directory -Path C:\Shares\Public -Force
New-Item -ItemType Directory -Path C:\Shares\IT -Force

# 建共享并给权限（SMB 共享）
New-SmbShare -Name "Public" -Path "C:\Shares\Public" -FullAccess "Everyone"
New-SmbShare -Name "IT" -Path "C:\Shares\IT" -ChangeAccess "MYCOMPANY\IT-Team" -ReadAccess "Everyone"

# 查看
Get-SmbShare
```
访问测试：`\\192.168.10.20` 或 `\\file-srv.mycompany.local`

### 8.5.2 权限的"双门规则"（**超重要，Module B 重灾区**）
Windows 文件访问要过**两道门**：
1. **共享权限（Share）**——网络门
2. **NTFS 权限**——文件夹自己的门
**两道门都通过才放行**（取最严格的那个）。
> 比喻：进公司大楼要过大门（共享权限），进财务室要再过一道门（NTFS）。哪道门不开都进不去。

```powershell
# 设 NTFS 权限（以 IT 文件夹为例）
icacls "C:\Shares\IT" /grant "MYCOMPANY\IT-Team:(OI)(CI)M"   # 修改权限
icacls "C:\Shares\IT" /grant "Everyone:(OI)(CI)R"             # 只读
# (OI)=对象继承 (CI)=容器继承 M=修改 R=读
```
Module B 评分点里"公共共享匿名可读/可写""内部共享需认证"考的就是这两道门的组合。

### 8.5.3 DFS（分布式文件系统）
一块共享不够用？DFS 把多个共享"拼"成一棵逻辑树，比如 `\\paris.local\CSDrive\MKT|SALES|HR` 分别指向不同服务器文件夹。
1. 服务器管理器 → 添加角色 → **文件服务器** + **DFS 复制**（或 PowerShell：`Install-WindowsFeature FS-DFS-Namespace, FS-DFS-Replication`）
2. 新建**命名空间**（如 `CSDrive`）→ 里面建**文件夹**（MKT、SALES…）→ 各自指向目标共享
3. 用户只记一个入口 `\\mycompany.local\CSDrive`，底下按部门导航

**DFS 复制**：两个服务器上的文件夹互相同步（改一边，另一边自动更新）——Module B 有"File Replication"评分点。

---

## 8.6 核心实战 4：组策略（GPO）——Module B 评分点最密集处

**组策略 = 批量下发的"规章制度"**。你在域控上写一条策略，全公司电脑/用户生效。

### 8.6.1 入门三连
1. 打开 **组策略管理**（管理工具里）
2. 找到 `mycompany.local` → 右键 **Default Domain Policy** → 编辑（或右键 OU 新建 GPO 再链接）
3. 找到设置项 → 启用/配置 → 保存（自动生效，客户端重启或 `gpupdate /force` 后应用）

### 8.6.2 六个"世赛同款"策略实战（对照 Module B 评分点）

**① 登录消息横幅**（用户登录时显示警告文字）
路径：计算机配置 → 策略 → Windows 设置 → 安全设置 → 本地策略 → 安全选项
→ "交互式登录：试图登录的用户的消息标题" + "消息文本"

**② 禁用本地 Administrator 账户**
同路径 → "账户：管理员账户状态" → 已禁用

**③ 禁止存储 LM 哈希**（安全加固）
同路径 → "网络安全：不要在下次更改密码时存储 LAN Manager 的哈希值" → 已启用

**④ 统一环境变量**（评分点里那个奇怪的 TheErasTour=2024 就是这种题）
用户配置 → 首选项 → Windows 设置 → 环境 → 新建

**⑤ 禁用注册表编辑器 & 命令提示符**（限制普通用户乱搞）
用户配置 → 管理模板 → 系统 → "阻止访问注册表编辑工具"、"阻止访问命令提示符"——**注意：只对某几个部门限制？** 那就要用**安全筛选**（GPO 属性 → 安全筛选 → 加上 SALES 组，去掉 Authenticated Users）——这就是 Module B 里"Users in SALES, MKT and HR..."那条的考法。

**⑥ 登录自动运行脚本**
用户配置 → Windows 设置 → 脚本 → 登录 → 添加脚本

### 8.6.3 验证与排错（比赛检查也这么看）
```powershell
# 客户端上：
gpupdate /force                # 强制刷新策略
gpresult /r                    # 看当前用户/计算机应用了哪些策略 ★ 最常用
gpresult /h report.html        # 生成详细报告（浏览器打开看）
```
**"策略不生效"排查三连**：① 用户/电脑在策略链接的 OU 里吗？② `gpupdate` 刷新了吗？③ 安全筛选/继承设置对吗？（还有：DNS 不通时策略根本下发不了——回看 8.3.4 的坑。）

---

## 8.7 核心实战 5：IIS 网站 + 证书

```powershell
# 装 IIS
Install-WindowsFeature -Name Web-Server -IncludeManagementTools
# 默认网站起来了吗？
Invoke-WebRequest http://localhost -UseBasicParsing | Select-Object StatusCode
```

**建一个新站点**（Module B 的 WEB-SRV 是在 IIS 上建虚拟主机 + HTTPS 无错误）：
1. **IIS 管理器** → 右键"网站" → 添加网站：
   - 名称：`mycompany`
   - 物理路径：`C:\inetpub\mycompany`（先建好文件夹放个 index.html）
   - 绑定：`http`，主机名 `www.mycompany.local`，端口 80
2. **本地 hosts 或 DNS** 把 `www.mycompany.local` 指到这台机器
3. 浏览器访问 `http://www.mycompany.local` → 出现你的页面

**配 HTTPS（AD CS 签发 + IIS 绑定）**：
1. 域控上装 **AD CS**（服务器管理器 → 添加角色 → Active Directory 证书服务 → 勾选"证书颁发机构"）
2. Web 服务器上：IIS → 服务器证书 → **创建域证书** → 填信息 → 颁发机构选 `mycompany-DC1-CA`
3. 网站 → 绑定 → 添加 → https → 选刚才的证书
4. 浏览器访问 `https://www.mycompany.local` → **取决于信任**（域内机器已信任自己的 CA，直接绿锁）

---

## 8.8 PowerShell 自动化速成（加分项）

把上面的操作脚本化——**Module B 评分点"用自动脚本创建用户"就是这个**：
```powershell
# 例子：一键检查本机是否满足域成员条件
$dns = (Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object {$_.ServerAddresses}).ServerAddresses
Write-Host "DNS 服务器: $dns"
if ($dns -contains "192.168.10.10") { Write-Host "DNS 正确 ✓" -ForegroundColor Green }
else { Write-Host "DNS 指向错误！加域会失败" -ForegroundColor Red }
```
**建议**：把本章所有图形操作，自己用 PowerShell 再实现一遍。**这就是从"会用"到"熟练"的分水岭。**

---

## 8.9 练习与自我检验

### 练习（能全做出来，Module B 你就入门了）
1. 装一台 Windows Server，改名为 DC1，建域 `mycompany.local`
2. 建 OU：Employees / Servers / Groups；建用户 zhangsan/李四；建组 IT-Team 并加人
3. 第二台机器设好 DNS、改名 FILE-SRV、加域
4. 在 FILE-SRV 上建共享 `Public`（全员读写）和 `IT`（仅 IT-Team 可改）
5. 配置 3 条 GPO：登录横幅、禁 cmd、统一环境变量
6. 用 `gpresult /r` 验证 GPO 生效
7. （进阶）配 DFS 命名空间，把两个共享挂进一棵树
8. （进阶）装 AD CS，给 IIS 网站配 HTTPS

### 自检清单
- [ ] 我能解释域/域控/OU/加域的完整流程
- [ ] 我会用 PowerShell 建 OU/用户/组（不只用图形界面）
- [ ] 我踩过"加域失败"的坑并能说出至少 3 个原因（DNS 没指对、时间不同步、凭据错误…）
- [ ] 我理解"共享权限 + NTFS 权限"双门规则
- [ ] 我会配 GPO 并用 gpresult 验证
- [ ] 我给 IIS 配过 HTTPS

### 对应真题
- 世界赛 Module B：DC1/DC2（域、子域、批量用户、细粒度密码策略）、FILE-SRV（DFS/配额/可执行文件限制）、NW-SRV（从区传输）、WEB-SRV（CA/IIS/HTTPS）、ROUTER（RRAS/VPN/DHCP）——本章覆盖其 80%，剩下 20%（RRAS 路由、站点间 VPN、DHCP 服务器）建议对照 `test-projects/LYON2024-ModuleB-评分脚本/` 逐个补齐
