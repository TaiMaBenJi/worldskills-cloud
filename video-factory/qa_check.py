#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""QA 质检：批量检查 12 集视频的完整性"""
import subprocess, os, json

ROOT = '/opt/tmbj/room-video'

def sh(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
    return r.stdout.strip()

report = []
ok = fail = 0
for i in range(1, 13):
    no = f'{i:02d}'
    mp4 = f'{ROOT}/out/ep{no}.mp4'
    if not os.path.exists(mp4):
        report.append(f'EP{no}: MISSING'); fail += 1; continue
    size = os.path.getsize(mp4)
    dur = float(sh(f'ffprobe -v quiet -show_entries format=duration -of csv=p=0 "{mp4}"') or 0)
    v = sh(f'ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name -of csv=p=0 "{mp4}"')
    a = sh(f'ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "{mp4}"')
    # 音频非静音检查（音量统计）
    vol = sh(f'ffmpeg -i "{mp4}" -af volumedetect -f null - 2>&1 | grep mean_volume | head -1')
    volv = vol.split(':')[-1].strip() if vol else '?'
    # 抽帧像素检查
    tmp = f'/tmp/qa_{no}.png'
    sh(f'ffmpeg -y -v error -ss {dur/2:.0f} -i "{mp4}" -frames:v 1 "{tmp}"')
    px = '?'
    if os.path.exists(tmp):
        try:
            from PIL import Image
            im = Image.open(tmp).convert('L')
            hist = im.histogram()
            total = sum(hist)
            main = max(hist)
            px = f'非主色像素{100*(1-main/total):.0f}%'
        except Exception as e:
            px = f'ERR {e}'
    status = 'OK' if (dur > 300 and size > 3e6 and a) else 'CHECK'
    if status == 'OK': ok += 1
    else: fail += 1
    report.append(f'EP{no}: {status} | {dur/60:.1f}min | {size/1e6:.1f}MB | {v} | audio={a} | {volv} | {px}')

print('\n'.join(report))
print(f'\n== QA 汇总: OK={ok} / 12, PROBLEM={fail} ==')
