#!/bin/bash
# 让 www.lab.local 域名解析在 WSL 重启后依然存在
# 原理：WSL 每次启动会重新生成 /etc/hosts，冲掉自定义条目；
#      用 systemd oneshot 单元在开机时自动补回（教程 1.9 节 systemd 实战）
set -e
[ "$(id -u)" -ne 0 ] && { echo "请用 root 运行"; exit 1; }

cat > /etc/systemd/system/lab-hosts.service <<'EOF'
[Unit]
Description=WorldSkills lab: keep www.lab.local in /etc/hosts
DefaultDependencies=no
After=systemd-tmpfiles-setup.service
Before=sysinit.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'grep -q www.lab.local /etc/hosts || echo "127.0.0.1 www.lab.local" >> /etc/hosts'

[Install]
WantedBy=sysinit.target
EOF

systemctl daemon-reload
systemctl enable lab-hosts.service
systemctl start lab-hosts.service
grep lab.local /etc/hosts && echo "=== 域名持久化配置完成 ==="
