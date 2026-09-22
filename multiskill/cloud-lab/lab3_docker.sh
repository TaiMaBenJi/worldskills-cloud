#!/bin/bash
# 实操 3：安装 Docker 并跑第一个容器（教程第 10 章）
set -e
echo '123456' | sudo -S true

# 用清华镜像的 docker-ce 官方仓库
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://mirrors.tuna.tsinghua.edu.cn/docker-ce/linux/ubuntu/gpg | sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.tuna.tsinghua.edu.cn/docker-ce/linux/ubuntu jammy stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -qq 2>&1 | tail -1

sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io 2>&1 | tail -1
sudo usermod -aG docker student
sudo systemctl enable --now docker
echo "docker 状态: $(systemctl is-active docker)"
sudo docker version --format 'client {{.Client.Version}} / server {{.Server.Version}}'
