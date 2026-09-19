#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成《机房管理·视频课》总览页 room/09-视频课总览.md（读取各集实际时长）"""
import os, subprocess

ROOT = '/var/minis/shared/room-video'
OUT = '/var/minis/shared/worldskills-cloud/room/09-视频课总览.md'

EPISODES = [
    ("01", "机房管理员是干什么的", "岗位认知：五大系统、管理员的一天、L0-L5 阶梯", "room/00 总纲 + room/01 阶梯与自测"),
    ("02", "走进机房：五大系统巡礼", "六大巡礼路线 + 四感巡检法（看、听、闻、摸）", "room/02 基础设施修炼"),
    ("03", "供电与 UPS：机房的第一生命线", "电的六环节旅程、UPS 三大类型、断电十五分钟剧本", "room/02 基础设施修炼"),
    ("04", "制冷与气流：给服务器退烧", "精密空调对比、气流的一生、冷热通道、三大指标", "room/02 基础设施修炼"),
    ("05", "消防与安防：防住最坏的情况", "三道防线、气体灭火、门禁与访客管理", "room/02 + room/06 安全与合规"),
    ("06", "服务器与存储：数据保命术", "服务器带外管理、五种 RAID、SMART 体检、换盘流程", "room/03 服务器与存储"),
    ("07", "批量装机：PXE 一键部署三十台", "PXE 五步原理、四件套、网络克隆与还原系统", "room/04 部署与自动化"),
    ("08", "机房网络：神经网的管理", "三层结构、布线基本功、断网五分钟定位法", "room/02 + 训练场 Module 6"),
    ("09", "日常运维与监控：把问题消灭在发生之前", "日周月季巡检、监控五层、告警与变更管理", "room/05 运维与监控"),
    ("10", "备份与容灾：3-2-1 铁律", "3-2-1 加一、备份三类型、恢复演练", "room/05 运维与监控"),
    ("11", "应急处理：最坏情况的剧本", "应急五步法、四大场景处置卡、勒索病毒专题", "room/07 应急与实战"),
    ("12", "学校机房实战总集篇", "新学期第一天、考试周保障、集训队机房、行动清单", "room/07 + room/08 职业路线"),
]

def dur_of(path):
    try:
        out = subprocess.run(['ffprobe','-v','quiet','-show_entries','format=duration','-of','csv=p=0',path],
                             capture_output=True, text=True, timeout=20)
        return float(out.stdout.strip())
    except Exception:
        return 0.0

lines = []
lines.append('# 🎬 机房管理 · 视频课（12 集）')
lines.append('')
lines.append('> **这就是《机房管理修炼体系》的视频版**：12 集微课，每集 6-10 分钟，把「从零到极致」的每一步讲成看得见的画面。')
lines.append('> 配套食用：图文体系（机房 00-08 篇）+ 真机训练场（`wsarena task 6`）+ 考试中心（机房管理 36 题）。')
lines.append('')
lines.append('## 📋 课程表')
lines.append('')
lines.append('| 集 | 主题 | 核心内容 | 时长 |')
lines.append('|---|---|---|---|')
total = 0.0
durs = {}
for no, title, feat, _ in EPISODES:
    d = dur_of(f'{ROOT}/out/ep{no}.mp4')
    durs[no] = d
    total += d
    dl = f'{int(d//60)}:{int(d%60):02d}' if d else '—'
    lines.append(f'| {no} | **{title}** | {feat} | {dl} |')
lines.append('')
if total:
    lines.append(f'**全系列总时长：约 {total/60:.0f} 分钟**。建议每天 1-2 集，一周刷完全系列。')
    lines.append('')
lines.append('## 🎬 正片（点击播放，全离线）')
lines.append('')
for no, title, feat, doc in EPISODES:
    d = durs.get(no, 0)
    dl = f'{int(d//60)} 分 {int(d%60)} 秒' if d else ''
    lines.append(f'### 第 {no} 集 · {title}')
    lines.append('')
    if os.path.exists(f'{ROOT}/out/ep{no}.mp4'):
        lines.append(f'<video controls preload="metadata" poster="videos/covers/ep{no}.png" src="videos/ep{no}.mp4" style="width:100%;border-radius:14px;background:#000"></video>')
    else:
        lines.append('> 📦 **本集制作中，即将自动上线**——打开 App 稍后刷新即可看到。')
    lines.append('')
    lines.append(f'**核心内容：** {feat}')
    lines.append('')
    lines.append(f'**配套图文：** {doc}')
    if dl:
        lines.append('')
        lines.append(f'**时长：** {dl}')
    lines.append('')
lines.append('## 📺 观看建议')
lines.append('')
lines.append('1. **第一遍**：按顺序刷完全系列（约 1.5 小时），建立机房管理全景认知；')
lines.append('2. **第二遍**：对照图文体系精读，每看完一集翻一篇对应的 room 文档；')
lines.append('3. **第三遍**：进训练场真机实操 —— `wsarena task 6` 走完整流程，`wsarena check room` 打分；')
lines.append('4. **考前**：直接跳转对应集数复习 + 考试中心刷题，双管齐下。')
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
