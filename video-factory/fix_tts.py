#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""补齐某集缺失/0字节的 TTS 音频段：单并发、慢速、多重试、可反复运行"""
import sys, os, asyncio

ROOT = os.environ.get('VIDEO_ROOT', '/var/minis/shared/room-video')
sys.path.insert(0, '/var/minis/shared/room-video/lib')
import edge_tts

VOICE = 'zh-CN-YunxiNeural'

async def main(ep_script):
    import importlib.util
    spec = importlib.util.spec_from_file_location('ep', ep_script)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    ep = m.EPISODE
    ep_no = ep['id']; sid = ep.get('sid', '')
    sub = f'{sid}/' if sid else ''
    adir = f'{ROOT}/audio/{sub}ep{ep_no}'
    os.makedirs(adir, exist_ok=True)
    slides = ep['slides']
    todo = []
    for i, s in enumerate(slides):
        raw = f'{adir}/s{i:02d}.mp3'
        if not (os.path.exists(raw) and os.path.getsize(raw) > 1000):
            todo.append(i)
    print(f'EP{ep_no}: {len(todo)} segments to fix', flush=True)
    fixed = 0
    for i in todo:
        text = slides[i].get('narration', '')
        raw = f'{adir}/s{i:02d}.mp3'
        ok = False
        for attempt in range(14):
            try:
                c = edge_tts.Communicate(text, VOICE)
                await c.save(raw)
                if os.path.getsize(raw) > 1000:
                    ok = True
                    break
            except Exception as e:
                print(f'  s{i:02d} attempt{attempt+1}: {type(e).__name__}', flush=True)
            await asyncio.sleep(2 + attempt * 2.5)
        if ok:
            fixed += 1
            print(f'  s{i:02d} OK ({os.path.getsize(raw)}B)', flush=True)
        else:
            print(f'  s{i:02d} STILL-FAILED', flush=True)
        await asyncio.sleep(1.5)
    still = [i for i in todo if not (os.path.exists(f'{adir}/s{i:02d}.mp3') and os.path.getsize(f'{adir}/s{i:02d}.mp3') > 1000)]
    print(f'EP{ep_no}: fixed={fixed}/{len(todo)} still_missing={still}', flush=True)
    return len(still)

if __name__ == '__main__':
    rc = asyncio.run(main(sys.argv[1]))
    sys.exit(1 if rc else 0)
