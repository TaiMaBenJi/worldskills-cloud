#!/bin/bash
# 实操 3 续：跑第一个 Docker 容器
set -e
echo '123456' | sudo -S true

# 配置镜像加速（DockerHub 国内直连不稳定）
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.1ms.run"
  ]
}
EOF
sudo systemctl restart docker

# 拉镜像并跑容器：nginx 绑定 8080 端口
sudo docker rm -f ws-nginx 2>/dev/null || true
sudo docker run -d --name ws-nginx --restart unless-stopped -p 8080:80 nginx:alpine
sleep 2
echo "--- 容器状态:"
sudo docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
echo "--- 容器内页面:"
sudo docker exec ws-nginx sh -c 'echo "<h1>Hello from Docker container</h1><p>ws-nginx on port 8080</p>" > /usr/share/nginx/html/index.html'
curl -s localhost:8080
