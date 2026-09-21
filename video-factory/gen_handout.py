#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成《机房视频课 · 全台词讲义》md —— 从 12 集脚本自动提取"""
import importlib.util, os

ROOT = '/opt/tmbj/room-video'
OUT = '/opt/tmbj/worldskills-cloud/room/10-视频课全讲义.md'

TITLES = {
    '01': '机房管理员是干什么的', '02': '走进机房：五大系统巡礼',
    '03': '供电与 UPS：机房的第一生命线', '04': '制冷与气流：给服务器退烧',
    '05': '消防与安防：防住最坏的情况', '06': '服务器与存储：数据保命术',
    '07': '批量装机：PXE 一键部署三十台', '08': '机房网络：神经网的管理',
    '09': '日常运维与监控：把问题消灭在发生之前', '10': '备份与容灾：3-2-1 铁律',
    '11': '应急处理：最坏情况的剧本', '12': '学校机房实战总集篇',
}

lines = []
lines.append('# 📖 机房视频课 · 全台词讲义（12 集合订）')
lines.append('')
lines.append('> 这是视频课的**文字版讲义**：每一集的每个画面、每段讲解，全部收录。')
lines.append('> 用途：不方便看视频时快速复习；打印出来当纸质讲义；考前突击翻阅。')
lines.append('')

for i in range(1, 13):
    no = f'{i:02d}'
    spec = importlib.util.spec_from_file_location('ep', f'{ROOT}/scripts/ep{no}.py')
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    ep = m.EPISODE
    lines.append(f'---')
    lines.append('')
    lines.append(f'# 第 {no} 集 · {ep["title"]}')
    lines.append('')
    lines.append(f'> 配套视频：`videos/ep{no}.mp4` ｜ 共 {len(ep["slides"])} 个画面')
    lines.append('')
    for j, s in enumerate(ep['slides'], 1):
        t = s.get('title', s.get('text', ''))
        t = t.replace('\n', ' ')
        lines.append(f'### 画面 {j:02d} · {t}')
        lines.append('')
        # 页面要点
        if s.get('items'):
            for it in s['items']:
                if isinstance(it, dict):
                    lines.append(f'- **{it.get("t","")}**：{it.get("d","")}')
                else:
                    lines.append(f'- {it}')
            lines.append('')
        if s.get('cards'):
            for c in s['cards']:
                lines.append(f'- **[{c.get("tag","")}] {c.get("t","")}**：{c.get("d","")}')
            lines.append('')
        if s.get('steps'):
            for k, st in enumerate(s['steps'], 1):
                lines.append(f'{k}. **{st.get("t","")}**：{st.get("d","")}')
            lines.append('')
        if s.get('headers'):
            lines.append('| ' + ' | '.join(str(x) for x in s['headers']) + ' |')
            lines.append('|' + '---|' * len(s['headers']))
            for row in s['rows']:
                lines.append('| ' + ' | '.join(str(x) for x in row) + ' |')
            lines.append('')
        if s.get('nums'):
            for n in s['nums']:
                lines.append(f'- **{n["num"]}{n.get("unit","")}**：{n["d"]}')
            lines.append('')
        if s.get('left'):
            lines.append(f'**{s["left"]["t"]}**')
            for it in s['left']['items']:
                lines.append(f'- {it}')
            lines.append('')
            lines.append(f'**{s["right"]["t"]}**')
            for it in s['right']['items']:
                lines.append(f'- {it}')
            lines.append('')
        if s.get('sub'):
            lines.append(f'*{s["sub"]}*')
            lines.append('')
        # 旁白
        nar = s.get('narration', '')
        if nar:
            lines.append(f'> **讲解词**：{nar}')
            lines.append('')
lines.append('---')
lines.append('')
lines.append('*讲义由「太马奔极」从视频分镜脚本自动生成 · 与视频内容逐帧对应 · 2026*')
lines.append('')

content = '\n'.join(lines)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(content)
print(f'WROTE {OUT} ({len(content)} chars)')
