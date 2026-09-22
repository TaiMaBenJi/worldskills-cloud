#!/bin/bash
# 演示 · 任务4：容器化部署（8分）
echo '=== [任务4-1] 启动容器 ws-api（8082→80）==='
docker rm -f ws-api >/dev/null 2>&1
docker run -d --name ws-api --restart unless-stopped -p 8082:80 httpd:alpine
sleep 2
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}' | head -3

echo
echo '=== [任务4-2] 替换容器内首页为 WS-API ==='
docker exec ws-api sh -c 'echo "<h1>WS-API</h1><p>containerized app</p>" > /usr/local/apache2/htdocs/index.html'
echo '--- 已写入'

echo
echo '=== [任务4-3] 验证（应返回 WS-API）==='
curl -s http://localhost:8082/
echo
echo '>>> 任务4 完成，2 项提交 —— 四题全做完，跑总评分'
