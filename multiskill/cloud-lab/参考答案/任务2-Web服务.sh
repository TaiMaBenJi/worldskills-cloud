#!/bin/bash
# 演示 · 任务2：Web 服务（8分）
echo '=== [任务2-1] 创建站点目录和页面 ==='
mkdir -p /var/www/ws-app
cat > /var/www/ws-app/index.html <<'EOF'
<h1>WS-APP</h1>
<p>模拟赛题任务2站点 · 端口8081</p>
EOF
ls -l /var/www/ws-app/

echo
echo '=== [任务2-2] 编写 nginx 站点配置 ==='
cat > /etc/nginx/sites-available/ws-app <<'EOF'
server {
    listen 8081;
    server_name _;
    root /var/www/ws-app;
    index index.html;

    location = /health {
        return 200 "healthy";
    }
}
EOF
echo '--- 配置内容:'
cat /etc/nginx/sites-available/ws-app

echo
echo '=== [任务2-3] 启用站点（软链）并检查语法 ==='
ln -sf /etc/nginx/sites-available/ws-app /etc/nginx/sites-enabled/
nginx -t

echo
echo '=== [任务2-4] 重载 nginx 生效 ==='
systemctl reload nginx
sleep 1

echo '--- 验证1: 首页（应含 WS-APP）:'
curl -s http://localhost:8081/
echo
echo '--- 验证2: 健康检查（应返回 healthy）:'
curl -s http://localhost:8081/health
echo
echo
echo '>>> 任务2 完成，2 项提交'
