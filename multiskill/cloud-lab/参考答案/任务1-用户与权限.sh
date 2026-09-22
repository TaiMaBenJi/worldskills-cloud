#!/bin/bash
# 演示 · 任务1：用户与权限（8分）
echo '=== [任务1-1] 创建组 dev ==='
groupadd dev && getent group dev
echo
echo '=== [任务1-2] 创建用户 deployer（主组dev，bash）==='
useradd -m -g dev -s /bin/bash deployer && id deployer
echo
echo '=== [任务1-3] 给 deployer sudo 权限 ==='
usermod -aG sudo deployer
sudo -l -U deployer 2>/dev/null | grep -m1 -o '(ALL : ALL) NOPASSWD\|(ALL : ALL)' || sudo -l -U deployer 2>/dev/null | grep -m1 ALL
echo
echo '=== [任务1-4] 配置 SSH 密钥登录 ==='
mkdir -p /home/deployer/.ssh
ssh-keygen -t ed25519 -N '' -f /home/deployer/.ssh/id_ed25519 -q
cp /home/deployer/.ssh/id_ed25519.pub /home/deployer/.ssh/authorized_keys
chown -R deployer:dev /home/deployer/.ssh
chmod 600 /home/deployer/.ssh/authorized_keys
ls -l /home/deployer/.ssh/ | tail -2
echo
echo '>>> 任务1 完成，4 项提交'
