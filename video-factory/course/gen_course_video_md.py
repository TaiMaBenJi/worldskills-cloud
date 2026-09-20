#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成《教程·视频课》总览页 tutorial/98-视频课-总览.md"""
import os, subprocess

ROOT = '/var/minis/shared/course-video'
OUT = '/var/minis/shared/worldskills-cloud/tutorial/98-视频课-总览.md'

EPISODES = [
    ("00", "开始之前——写给不懂的你", "怎么用这套教程 + 学习的正确姿势"),
    ("01", "Linux 零基础", "系统、命令行、文件操作、权限、装软件"),
    ("02", "网络零基础", "IP、子网、路由、DNS、抓包排障"),
    ("03", "服务器实战", "Nginx、网站部署、服务管理"),
    ("04", "HTTPS 与证书", "加密原理、证书申请、配置小绿锁"),
    ("05", "DNS 与域名体系实战", "亲手搭一台通讯录服务器"),
    ("06", "负载均衡与高可用", "让网站打不倒：HAProxy、keepalived"),
    ("07", "故障排查专题", "从瞎猜到破案的完整方法论"),
    ("08", "Windows Server 基础", "另一半世界的入门"),
    ("09", "Shell 脚本进阶", "把重复劳动交给电脑"),
    ("10", "Docker 容器入门", "装软件的终极姿势"),
    ("11", "Kubernetes 入门", "指挥容器军团"),
    ("12", "AWS 云平台实战", "从零到一架完整架构"),
    ("13", "自动化运维", "Ansible + Terraform 批量管理"),
    ("14", "监控与日志", "给系统装体检仪和行车记录仪"),
    ("15", "安全加固", "把服务器武装到牙齿"),
    ("16", "世赛真题实战", "把本事变成分数"),
    ("17", "机房管理", "从一间屋子到一支铁军（另有 12 集专项课）"),
]

def dur_of(path):
    try:
        out = subprocess.run(['ffprobe','-v','quiet','-show_entries','format=duration','-of','csv=p=0',path],
                             capture_output=True, text=True, timeout=20)
        return float(out.stdout.strip())
    except Exception:
        return 0.0

lines = []
lines.append('# 🎬 保姆级教程 · 视频课（18 集）')
lines.append('')
lines.append('> **整套保姆级教程的视频版**：18 集微课，一章一集，AI 讲解 + 图解画面，手机离线随时看。')
lines.append('> 看视频建框架，读图文抠细节，进训练场动手练——三位一体，学得最牢。')
lines.append('')
lines.append('## 📋 课程表')
lines.append('')
lines.append('| 集 | 章节 | 讲什么 | 时长 |')
lines.append('|---|---|---|---|')
total = 0.0
durs = {}
for no, title, feat in EPISODES:
    d = dur_of(f'{ROOT}/out/course/ep{no}.mp4')
    durs[no] = d
    total += d
    dl = f'{int(d//60)}:{int(d%60):02d}' if d else '—'
    lines.append(f'| {no} | **{title}** | {feat} | {dl} |')
lines.append('')
if total:
    lines.append(f'**全系列总时长：约 {total/60:.0f} 分钟**。一天 2-3 集，一周刷完。')
    lines.append('')
lines.append('## 🎬 正片（点击播放，全离线）')
lines.append('')
for no, title, feat in EPISODES:
    d = durs.get(no, 0)
    dl = f'{int(d//60)} 分 {int(d%60)} 秒' if d else ''
    lines.append(f'### 第 {no} 集 · {title}')
    lines.append('')
    if os.path.exists(f'{ROOT}/out/course/ep{no}.mp4'):
        lines.append(f'<video controls preload="metadata" poster="videos/course/covers/ep{no}.png" src="videos/course/ep{no}.mp4" style="width:100%;border-radius:14px;background:#000"></video>')
    else:
        lines.append('> 📦 **本集制作中，即将自动上线**——打开 App 稍后刷新即可看到。')
    lines.append('')
    lines.append(f'**讲什么：** {feat}')
    if dl:
        lines.append('')
        lines.append(f'**时长：** {dl}')
    lines.append('')
lines.append('## 📺 学习建议')
lines.append('')
lines.append('1. **跟学**：按 00 → 17 顺序看，每集看完立刻翻对应的图文教程动手做；')
lines.append('2. **复习**：考前直接跳选集数，1.5 倍速回看要点；')
lines.append('3. **实战**：练完每章进训练场 `wsarena` 做任务，考试中心刷题自测；')
lines.append('4. **专项**：学完第 17 集，接着看《机房管理专项 12 集》，把物理世界也拿下。')
lines.append('')
lines.append('---')
lines.append('')
lines.append('*视频由「星」制作 · 2026 · 配套图文教程 + 真机训练场*')
lines.append('')

content = '\n'.join(lines)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(content)
print(f'WROTE {OUT} ({len(content)} chars, total {total/60:.1f} min)')
