#!/bin/bash
# ============================================================
# 网络系统管理 · 一键重置练习环境（清场重来用）
# 用法: sudo bash 重置环境.sh
# 只清除本赛题创建的配置与服务，不动 nginx/docker/云计算环境
# ============================================================
if [ "$(id -u)" -ne 0 ]; then echo "请用 root 运行: sudo bash 重置环境.sh"; exit 1; fi

echo "[1/6] 停止并禁用相关服务..."
systemctl stop named smbd nmbd vsftpd nfs-server ws-clean.timer 2>/dev/null
systemctl disable named smbd nmbd vsftpd nfs-server ws-clean.timer 2>/dev/null

echo "[2/6] 清除 bind9 自定义区域..."
if [ -f /etc/bind/named.conf.local ]; then
  sed -i '/WSNET BEGIN/,/WSNET END/d' /etc/bind/named.conf.local
fi
rm -f /etc/bind/db.wsnet.local /etc/bind/db.192.168.100

echo "[3/6] 清除 Samba 共享..."
if [ -f /etc/samba/smb.conf ]; then
  sed -i '/WSNET-SAMBA BEGIN/,/WSNET-SAMBA END/d' /etc/samba/smb.conf
  sed -i '/WSNET-SAMBA-GLOBAL/{N;d;}' /etc/samba/smb.conf
fi

echo "[4/6] 清除 NFS 导出与挂载..."
sed -i '/WSNET-NFS/d' /etc/exports 2>/dev/null
exportfs -ra 2>/dev/null
umount /mnt/nfs-test 2>/dev/null

echo "[5/6] 删除赛题产物..."
rm -rf /srv/wsdata /srv/nfs /mnt/nfs-test /var/lib/ws-clean
rm -f /home/student/ws-ftp-upload.txt /tmp/ws-ftp-upload.txt
rm -f /etc/systemd/system/ws-clean.service /etc/systemd/system/ws-clean.timer
rm -f /usr/local/bin/ws-clean.sh
systemctl daemon-reload 2>/dev/null

echo "[6/6] 完成。跑一次评分应全部 FAIL（0 分）："
echo "  sudo bash /mnt/d/Desktop/世界技能大赛云计算/03-网络系统管理/grad_netsys.sh"
