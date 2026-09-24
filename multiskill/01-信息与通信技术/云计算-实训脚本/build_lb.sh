#!/bin/bash
# 实战：本地迷你高可用平台
# 架构 = 真题 LoadBalancer 的本地等价物：
#   www.lab.local (DNS) → nginx 443 (HTTPS, 教程第4章) → upstream 轮询 (第6章)
#   → Backend-1 容器 :8091 / Backend-2 容器 :8092 (两台"应用服务器")
set -e
[ "$(id -u)" -ne 0 ] && { echo "请用 root 运行: sudo bash $0"; exit 1; }

echo "== [1/5] 启动两台后端服务器容器 =="
for i in 1 2; do
  docker rm -f ws-lb-web$i >/dev/null 2>&1 || true
  docker run -d --name ws-lb-web$i --restart unless-stopped -p 809$i:80 nginx:alpine >/dev/null
  echo "<h1>Backend-$i</h1><p>app server $i</p>" > /tmp/web$i.html
  docker cp /tmp/web$i.html ws-lb-web$i:/usr/share/nginx/html/index.html
  rm -f /tmp/web$i.html
done
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo "== [2/5] 生成自签 HTTPS 证书（教程第4章）=="
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/lab.key -out /etc/nginx/ssl/lab.crt \
  -subj "/CN=www.lab.local" 2>/dev/null
ls -l /etc/nginx/ssl/

echo "== [3/5] 本地域名解析 www.lab.local（教程第5章 DNS）=="
grep -q "www.lab.local" /etc/hosts || echo "127.0.0.1 www.lab.local" >> /etc/hosts
grep lab.local /etc/hosts

echo "== [4/5] nginx 反向代理 + 负载均衡（教程第6章）=="
cat > /etc/nginx/sites-available/ws-lb <<'EOF'
upstream ws_app {
    server 127.0.0.1:8091;
    server 127.0.0.1:8092;
}
server {
    listen 80;
    server_name www.lab.local;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name www.lab.local;
    ssl_certificate     /etc/nginx/ssl/lab.crt;
    ssl_certificate_key /etc/nginx/ssl/lab.key;
    location / {
        proxy_pass http://ws_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF
ln -sf /etc/nginx/sites-available/ws-lb /etc/nginx/sites-enabled/
nginx -t 2>&1 | tail -1
systemctl reload nginx

echo "== [5/5] 负载均衡验证（应看到 Backend-1/2 交替 = 轮询生效）=="
for n in 1 2 3 4; do curl -sk --max-time 5 https://www.lab.local | grep -o "Backend-[12]"; done
echo "=== 平台搭建完成 ==="
