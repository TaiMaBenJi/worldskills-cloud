#!/bin/bash
# 实操 2：部署第一个 nginx 网站服务器（教程 1.9.5 + 第 3 章）
set -e
echo '123456' | sudo -S true
sudo apt-get install -y -qq nginx 2>&1 | tail -1
sudo systemctl enable --now nginx
echo "nginx 状态: $(systemctl is-active nginx)"

# 写入自定义首页
sudo tee /var/www/html/index.html > /dev/null <<'EOF'
<h1>WorldSkills Cloud Lab</h1>
<p>My first web server - Ubuntu 22.04 on WSL2 - student</p>
EOF

echo "--- curl 验证:"
curl -s localhost
echo "--- nginx 服务管理练习:"
systemctl is-enabled nginx
