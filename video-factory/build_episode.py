#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""单集视频构建流水线: 渲染帧 -> TTS 配音 -> 合成 MP4"""
import sys, os, asyncio, subprocess
sys.path.insert(0, '/var/minis/shared/room-video/lib')
from render import render_slide
import edge_tts

ROOT = os.environ.get('VIDEO_ROOT', '/var/minis/shared/room-video')
VOICE = 'zh-CN-YunxiNeural'
PAD = 0.72

def sh(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f'CMD FAIL: {cmd[:160]}\n{r.stderr[-700:]}')
    return r.stdout

def dur_of(path):
    out = sh(f'ffprobe -v quiet -show_entries format=duration -of csv=p=0 "{path}"')
    return float(out.strip())

async def tts_all(jobs):
    sem = asyncio.Semaphore(3)
    async def one(text, out):
        async with sem:
            last = None
            for attempt in range(10):
                try:
                    c = edge_tts.Communicate(text, VOICE)
                    await asyncio.wait_for(c.save(out), timeout=25)
                    await asyncio.sleep(1.2)
                    return
                except Exception as e:
                    last = e
                    await asyncio.sleep(1 + attempt * 1.2)
            raise last
    await asyncio.gather(*[one(t, o) for t, o in jobs])

def build(ep):
    ep_no = ep['id']
    sid = ep.get('sid', '')
    sub = f'{sid}/' if sid else ''
    if ep.get('series'):
        import render as _render
        _render.SERIES = ep['series']
    fdir = f'{ROOT}/frames/{sub}ep{ep_no}'
    adir = f'{ROOT}/audio/{sub}ep{ep_no}'
    os.makedirs(fdir, exist_ok=True); os.makedirs(adir, exist_ok=True)
    os.makedirs(f'{ROOT}/out/{sub}', exist_ok=True)
    slides = ep['slides']; total = len(slides)
    meta_base = {'ep_no': ep.get('disp', ep_no), 'ep_title': ep['title'], 'total': total}
    print(f'== EP{ep_no} {ep["title"]} | {total} slides ==', flush=True)
    # 1) 渲染帧（跳过已存在，除非 REBUILD=1）
    rebuild = os.environ.get('REBUILD') == '1'
    for i, s in enumerate(slides):
        fp = f'{fdir}/slide_{i:02d}.png'
        if rebuild or not os.path.exists(fp):
            img = render_slide(s, dict(meta_base, page=i))
            img.save(fp)
        print(f'[frame] {i+1}/{total}', flush=True)
    # 2) TTS
    jobs = []
    for i, s in enumerate(slides):
        raw = f'{adir}/s{i:02d}.mp3'
        if rebuild or not (os.path.exists(raw) and os.path.getsize(raw) > 1000):
            jobs.append((s.get('narration', ''), raw))
    if jobs:
        asyncio.run(tts_all(jobs))
    # 3) pad + 时长
    durations = []; plist = []
    for i in range(total):
        raw = f'{adir}/s{i:02d}.mp3'; padf = f'{adir}/s{i:02d}_pad.mp3'
        if rebuild or not os.path.exists(padf):
            sh(f'ffmpeg -y -v error -i "{raw}" -af apad=pad_dur={PAD} -ar 44100 -ac 1 -b:a 96k "{padf}"')
        durations.append(dur_of(padf)); plist.append(padf)
    # 4) 音频总轨
    with open(f'{adir}/alist.txt', 'w') as f:
        for p in plist: f.write(f"file '{p}'\n")
    sh(f'ffmpeg -y -v error -f concat -safe 0 -i "{adir}/alist.txt" -c copy "{adir}/full.mp3"')
    # 5) 图片时间轴
    with open(f'{fdir}/imgs.txt', 'w') as f:
        for i in range(total):
            f.write(f"file '{fdir}/slide_{i:02d}.png'\nduration {durations[i]:.3f}\n")
        f.write(f"file '{fdir}/slide_{total-1:02d}.png'\n")
    # 6) 编码
    out = f'{ROOT}/out/{sub}ep{ep_no}.mp4'
    sh(f'ffmpeg -y -v error -f concat -safe 0 -i "{fdir}/imgs.txt" -i "{adir}/full.mp3" '
       f'-c:v libx264 -preset veryfast -tune stillimage -crf 23 -pix_fmt yuv420p -r 10 '
       f'-c:a aac -b:a 128k -shortest "{out}"')
    d = dur_of(out); size = os.path.getsize(out)
    print(f'== DONE ep{ep_no}: {d/60:.1f} min, {size/1e6:.1f} MB ==', flush=True)

if __name__ == '__main__':
    import importlib.util
    spec = importlib.util.spec_from_file_location('ep', sys.argv[1])
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    build(m.EPISODE)
