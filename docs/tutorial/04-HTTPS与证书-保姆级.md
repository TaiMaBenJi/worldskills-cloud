# 第 4 章 · HTTPS 与证书（给网站加"小绿锁"）

> 本章目标：理解"为什么网址前面有小锁"、证书到底是什么，并亲手给第 3 章的网站装上 HTTPS（包括自己当"发证机构"）。
> 学完标志：你能给别人解释"加密是怎么发生的"，并且能独立排查"浏览器说证书不安全"的问题。
> 预计学习时间：1-2 周。

---

## 4.1 为什么需要 HTTPS？先用一个故事讲明白

### 老王的烦恼
老王开网店，顾客在网站上输密码下单。可是网络传输就像**寄明信片**——路上每个经手的人（路由器、WiFi 管理员）都能看到卡片上写了一字不差的内容，包括密码。

**解决方案有两个问题要同时解决：**
1. **保密**：内容要装进"保险箱"（加密），路上没人能看懂
2. **防冒充**：要确认"你连的真是老王的店"，不是骗子山寨的网站

HTTPS = HTTP + TLS，就是同时解决这两个问题的技术。**TLS**（Transport Layer Security，传输层安全）是那个"保险箱协议"。

> 你现在看到这里，浏览器地址栏里的小锁 🔒，就是 HTTPS 在工作。

### 加密是怎么做的？（人话版，读完就懂）
**第一层理解：对称加密**
把内容用一套"密码本"加密，双方都用同一套密码本解密。问题：怎么把密码本安全地送到对方手里？（寄密码本的过程本身会被偷看）

**第二层理解：非对称加密（关键发明）**
有一种神奇的锁：
- **公钥**（public key）= 一把可以随便发的"锁"。谁都能拿它把东西锁进箱子。
- **私钥**（private key）= 世界上唯一能打开这个箱子的"钥匙"。只有网站自己有。

流程：
1. 网站把公钥给浏览器（随便给，不怕偷）
2. 浏览器用公钥把"密码本"锁起来寄回去（偷看者没有钥匙，打不开）
3. 网站用私钥打开，拿到密码本
4. **之后双方用这套密码本（对称加密）快速交流**（对称加密速度快，非对称只用来送密码本）

**第三层理解：那怎么防"假网站"？——证书出场**
骗子也可以自己造一对公私钥啊！所以需要一个"**权威机构证明**"：

> **证书（Certificate）= 身份证**。它由"CA"（Certificate Authority，证书颁发机构）签发，上面写着："我证明此公钥属于域名 example.com"，并附上 CA 自己的签名防伪。

浏览器出厂时预装了全世界权威 CA 的名单（像手机的官方通讯录）。**遇到网站 → 检查证书 → 是我认识的人签的 + 名字对得上 + 没过期 → 上小绿锁。** 反之报警告。

**证书链（Chain）**：大 CA 把签发权分给"中间 CA"，中间 CA 再给网站签。验证时从网站证书 → 中间证书 → 根证书，一路验到受信任的根。**"链不完整"是新手最常见的错误之一**（后面实操会见到）。

---

## 4.2 实战 A：自己当 CA，给内部网站发证书（比赛同款技能）

内部系统（公司内网）一般不用公共 CA，而是**自己建一个 CA**。这正是世界赛 Module A 评分点 A02 和 Module B 的 AD CS 考的内容。我们完整走一遍。

### 4.2.1 建目录、生"根"
```bash
mkdir -p ~/ca && cd ~/ca

# 第 1 步：生成根 CA 的私钥（2048 位 RSA）
openssl genrsa -out root-ca.key 2048

# 第 2 步：用根私钥生成"自签名"的根证书（有效期 10 年）
openssl req -x509 -new -nodes -key root-ca.key -sha256 -days 3650 \
  -out root-ca.crt \
  -subj "/C=CN/ST=Beijing/O=MyCompany/CN=MyCompany Root CA"
```
逐段解释：
- `genrsa -out root-ca.key 2048`：生成私钥，文件叫 root-ca.key。**这个文件就是命根子，永远不外传**
- `req -x509`：生成"自签名证书"（自己给自己签，因为你是根，没人能给你签）
- `-days 3650`：有效期 10 年
- `-subj "..."`：证书信息。/CN = Common Name（通用名，证书的"名字"）

验证一下生成的证书：
```bash
openssl x509 -in root-ca.crt -noout -text | head -30
```
你能看到：Subject（颁发给谁）、Issuer（谁签的——和自己一样，说明是自签）、Validity（有效期）、Public Key 等。**这一眼看懂，等于把证书的"结构"看穿了。**

### 4.2.2 给网站签一张"服务证书"
```bash
# 第 1 步：生成网站自己的私钥
openssl genrsa -out mycompany.key 2048

# 第 2 步：生成证书签名请求（CSR）——把"申请表"交给 CA
openssl req -new -key mycompany.key -out mycompany.csr \
  -subj "/C=CN/O=MyCompany/CN=mycompany.local"
```
- `CSR` = 一张"请给我发证书的申请表"，包含你的公钥和名字
- CN 写你的**域名**（这里是 mycompany.local）

但现实世界有个问题：现代浏览器不看 CN 了，看的是"**备用名（SAN，Subject Alternative Name）**"。所以要给申请表加配置文件：
```bash
cat > san.cnf << 'EOF'
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = CN
O = MyCompany
CN = mycompany.local

[v3_req]
subjectAltName = @alt_names
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = mycompany.local
DNS.2 = www.mycompany.local
IP.1 = 127.0.0.1
EOF
```
（这个文件规定了：证书对哪些域名/IP 有效。**记住 SAN 这个词，比赛里有它的评分点**。）

重新生成 CSR（带上 SAN）：
```bash
openssl req -new -key mycompany.key -out mycompany.csr -config san.cnf
```

### 4.2.3 CA 盖章：签发证书
```bash
openssl x509 -req -in mycompany.csr -CA root-ca.crt -CAkey root-ca.key \
  -CAcreateserial -out mycompany.crt -days 365 -sha256 \
  -extfile san.cnf -extensions v3_req
```
逐段读：
- `-in mycompany.csr`：处理这张申请表
- `-CA root-ca.crt -CAkey root-ca.key`：用我们的根 CA 来盖章（要出示 CA 的私钥）
- `-out mycompany.crt`：发出来的证书
- `-extfile ... -extensions v3_req`：把 SAN 等扩展属性加进去

### 4.2.4 验证证书链（评分点同款检查）
```bash
openssl verify -CAfile root-ca.crt mycompany.crt
```
输出 `mycompany.crt: OK` → **证书链正确！**
（如果输出 error……通常是没有带上 CA 的签字信息。这条命令就是世界赛评分脚本检查证书的方式。）

看这张证书的内容：
```bash
openssl x509 -in mycompany.crt -noout -subject -issuer -dates
```
输出示例：
```
subject=C = CN, O = MyCompany, CN = mycompany.local
issuer=C = CN, ST = Beijing, O = MyCompany, CN = MyCompany Root CA
notBefore=Sep 16 13:00:00 2026 GMT
notAfter=Sep 15 13:00:00 2027 GMT
```
**"issuer 是我的根 CA" + 有日期范围** —— 这就是一张合格证书该有的样子。

---

## 4.3 让 Nginx 用上 HTTPS

### 4.3.1 改配置
```bash
sudo mkdir -p /etc/nginx/ssl
sudo cp ~/ca/mycompany.crt ~/ca/mycompany.key /etc/nginx/ssl/
sudo chmod 600 /etc/nginx/ssl/mycompany.key    # 私钥收紧权限！
sudo nano /etc/nginx/sites-available/mycompany.conf
```
把配置改成：
```nginx
server {
    listen 80;
    server_name mycompany.local;
    return 301 https://$host$request_uri;    # 所有 HTTP 请求跳转到 HTTPS
}

server {
    listen 443 ssl;
    server_name mycompany.local;

    ssl_certificate     /etc/nginx/ssl/mycompany.crt;      # 证书（"身份证"）
    ssl_certificate_key /etc/nginx/ssl/mycompany.key;      # 私钥（"钥匙"）

    root /var/www/mycompany;
    index index.html;
    location / { try_files $uri $uri/ =404; }
}
```
**三行核心**：`listen 443 ssl` + `ssl_certificate` + `ssl_certificate_key`。
`return 301` 那行是"HTTP 自动跳 HTTPS"的标准写法。

### 4.3.2 测试与访问
```bash
sudo nginx -t && sudo systemctl reload nginx
curl -k https://localhost   # -k = 忽略证书警告（因为我们自己签的，本机没信任）
```
看到返回页面 = **HTTPS 生效了！**

### 4.3.3 让浏览器也信任（消除警告）
你自己签的证书，浏览器不认识（因为它不在浏览器的"信任名单"里）。两种做法：
1. **把根证书装进系统信任列表**（模拟公司内网环境）：
   ```bash
   # Ubuntu/Linux
   sudo cp ~/ca/root-ca.crt /usr/local/share/ca-certificates/
   sudo update-ca-certificates
   ```
   然后浏览器访问 `https://mycompany.local`，**小绿锁出现！**
   （Windows 上：双击 root-ca.crt → 安装证书 → 本地计算机 → 受信任的根证书颁发机构。对手把 CA 私钥装到系统里，等于给自己发了万能钥匙——**所以 CA 私钥的保护极其重要**。）
2. 或者用命令行让 curl 信任：
   ```bash
   curl --cacert ~/ca/root-ca.crt https://mycompany.local
   ```

---

## 4.4 实战 B：真域名真证书——Let's Encrypt 全自动签发（云服务器用户做）

自己签的证书浏览器不认，**真证书**要花钱吗？不用。有个组织叫 **Let's Encrypt**，免费发证书，永远免费，还能自动续期。全世界几亿个网站都在用它。

### 前提
1. 你有**公网服务器**（能访问）
2. 你有**域名**，且解析已指向服务器（第 2 章学的）
3. 80 端口开放

### 步骤（就三条命令的事）
```bash
# 安装 certbot（Let's Encrypt 的官方客户端）
sudo apt install -y certbot python3-certbot-nginx

# 一条命令：自动验证域名、签发证书、改好 Nginx 配置
sudo certbot --nginx -d 你的域名.com -d www.你的域名.com
# 按提示输入邮箱、同意条款 → 完成！
```
certbot 自动做的事：验证域名归属 → 下载证书 → 改 Nginx（加 443 配置和跳转）→ 设置自动续期。

验证：
```bash
curl -I https://你的域名.com     # 看是不是 200，证书是不是有效
sudo certbot renew --dry-run     # 测试"自动续期"是否正常（重要！证书 90 天过期）
```
**从今天起，你的网站和全球大站一样有合法小绿锁了。**

---

## 4.5 HTTPS 排障：浏览器说"不安全"怎么办

对号入座（**这 5 种情况覆盖 95% 的 HTTPS 问题**）：

| 浏览器提示 | 原因 | 解决 |
|-----------|------|------|
| `NET::ERR_CERT_COMMON_NAME_INVALID` / "证书名称不匹配" | 证书上的名字和你访问的域名对不上 | 重新签证书，把正确的域名写进 SAN |
| `NET::ERR_CERT_AUTHORITY_INVALID` / "不受信任" | 自签证书没装进信任列表，或没发中间证书 | 安装根证书，或补齐中间证书链 |
| "证书已过期" | 嗯，过期了 | 续期（certbot renew / 重新签发） |
| `SSL_ERROR_RX_RECORD_TOO_LONG` 或"拒绝了连接" | 用 https:// 访问了一个只开 HTTP 的端口 | 检查 Nginx listen 443 ssl 配没配 |
| `ERR_SSL_PROTOCOL_ERROR` | 证书文件放错/权限不对/配置错 | `nginx -t` + 看 `/var/log/nginx/error.log` |

**万能排查工具**（也用于比赛自检）：
```bash
openssl s_client -connect mycompany.local:443 -servername mycompany.local </dev/null 2>/dev/null | openssl x509 -noout -subject -dates
```
→ 直接从"外面"看网站递出来的证书长什么样。**这条命令能查：证书对不对、过没过期、域名对不对。**

---

## 4.6 练习与自我检验

### 练习
1. 完整走一遍"4.2 自建 CA"流程，最后 `openssl verify` 必须输出 OK
2. 给你的 mycompany.local 站点配上 HTTPS 和 HTTP→HTTPS 跳转
3. 用 `curl -v https://mycompany.local --cacert ~/ca/root-ca.crt` 看完整握手过程（读懂前 20 行即可）
4. 把证书有效天数改成 30 天再签一次，用 `openssl x509 -noout -dates` 验证
5. 故意删掉 Nginx 配置里的 `ssl_certificate` 行，reload，观察错误提示（练习排错）

### 自检清单
- [ ] 我能用人话解释"公钥/私钥/证书/CA/证书链"
- [ ] 我会自建 CA 并签发带 SAN 的证书，会用 openssl verify 验证
- [ ] 我给 Nginx 配过 HTTPS，知道 443、ssl_certificate、301 跳转的含义
- [ ] 我会用 certbot 给真域名签免费证书
- [ ] 遇到证书报错，我会对号入座排查

### 对应真题
- 世界赛 Module A：A02 评分点（Root CA + 服务 CA + openssl verify 检查）、A12-06（HaProxy HTTPS 证书）
- 世界赛 Module B：AD CS（根 CA、证书注册、SAN、IIS HTTPS 无错误）
- 韩国赛：ACM/CloudFront 证书 → 云上 HTTPS 的同款技能
