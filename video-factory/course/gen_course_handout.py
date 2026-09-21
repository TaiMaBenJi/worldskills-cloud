#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成《保姆级教程 · 全台词讲义》md"""
import importlib.util, os, glob

ROOT = '/opt/tmbj/course-video'
OUT = '/opt/tmbj/worldskills-cloud/tutorial/97-视频课-全讲义.md'

lines = []
lines.append('# 📖 保姆级教程 · 视频课全台词讲义')
lines.append('')
lines.append('> 18 集视频课的**文字版**：每集每个画面、每段讲解全部收录。')
lines.append('> 用途：不方便看视频时快速复习；打印当纸质讲义；考前突击。')
lines.append('')

for f in sorted(glob.glob(f'{ROOT}/scripts/t*.py')):
    ch = os.path.basename(f)[1:3]
    spec = importlib.util.spec_from_file_location('ep', f)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    ep = m.EPISODE
    lines.append('---')
    lines.append('')
    lines.append(f'# 第 {ch} 集 · {ep["title"]}')
    lines.append('')
    lines.append(f'> 配套视频：`videos/course/ep{ch}.mp4` ｜ 共 {len(ep["slides"])} 个画面')
    lines.append('')
    for j, s in enumerate(ep['slides'], 1):
        t = s.get('title', s.get('text', '')).replace('\n', ' ')
        lines.append(f'### 画面 {j:02d} · {t}')
        lines.append('')
        if s.get('items'):
            for it in s['items']:
                if isinstance(it, dict):
                    lines.append(f'- **{it.get("t","")}**' + (f'：{it.get("d","")}' if it.get('d') else ''))
                else:
                    lines.append(f'- {it}')
            lines.append('')
        if s.get('steps'):
            for k, st in enumerate(s['steps'], 1):
                lines.append(f'{k}. **{st.get("t","")}**' + (f'：{st.get("d","")}' if st.get('d') else ''))
            lines.append('')
        if s.get('sub'):
            lines.append(f'*{s["sub"]}*')
            lines.append('')
        nar = s.get('narration', '')
        if nar:
            lines.append(f'> **讲解词**：{nar}')
            lines.append('')
lines.append('---')
lines.append('')
lines.append('*讲义由「太马奔极」从视频分镜脚本自动生成 · 与视频逐帧对应 · 2026*')
lines.append('')

content = '\n'.join(lines)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(content)
print(f'WROTE {OUT} ({len(content)} chars)')
