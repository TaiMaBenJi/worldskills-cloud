#!/usr/bin/env python3
# make_video.py <md路径> <输出mp4路径>
# 从赛项总纲生成带中文解说的总纲课视频：PIL 出片 + edge-tts 配音 + ffmpeg 合成
import sys, os, re, glob, asyncio, subprocess, tempfile

MD, OUT = sys.argv[1], sys.argv[2]
FONT = '/mnt/sysfonts/NotoSansCJK-Regular.ttc'
FONT_B = '/mnt/sysfonts/NotoSansCJK-Bold.ttc'
if not os.path.exists(FONT_B):
    FONT_B = FONT
W, H = 1280, 720
VOICE = 'zh-CN-YunxiNeural'
WORK = tempfile.mkdtemp(prefix='vid_')

from PIL import Image, ImageDraw, ImageFont

def F(size, bold=False):
    return ImageFont.truetype(FONT_B if bold else FONT, size)

def read_md():
    text = open(MD, encoding='utf-8').read()
    lines = [l.rstrip() for l in text.split('\n')]
    title = lines[0].split('·')[0].strip() if lines else '项目总纲'
    en = ''
    m = re.match(r'(.+?)（(.+?)）', title)
    if m: title, en = m.group(1).strip(), m.group(2).strip()
    sections, cur = {}, None
    for l in lines:
        m2 = re.match(r'^([一二三四五六七八九十]+、[^ ]+)$', l.strip())
        if m2: cur = m2.group(1); sections[cur] = []; continue
        if cur is not None and l.strip(): sections[cur].append(l.strip())
    return title, en, sections

def sents(s, limit=3):
    parts = [p.strip() for p in s.replace('。', '。|').split('|') if p.strip()]
    return parts[:limit]

def clip(s, n):
    s = s.strip()
    return s if len(s) <= n else s[:n-1] + '。'

def build_slides(title, en, sec):
    slides = [{'t': title, 'sub': en, 'kicker': '世界技能大赛 · 从零到精通', 'narr': '本课带你从零认识' + title + '赛项，梳理竞赛内容、核心能力与从零到赛场的完整路线。'}]
    k1 = next((k for k in sec if k.startswith('一、')), None)
    if k1:
        body = ' '.join(sec[k1])
        bl = sents(body, 3)
        slides.append({'t': '一、项目是什么', 'bullets': [clip(b, 40) for b in bl], 'narr': '先看项目是什么。' + '。'.join(bl)[:120]})
    k2 = next((k for k in sec if k.startswith('二、')), None)
    if k2:
        body = ' '.join(sec[k2])
        bl = sents(body, 3)
        slides.append({'t': '二、竞赛怎么比', 'bullets': [clip(b, 40) for b in bl], 'narr': '再看竞赛怎么比。' + '。'.join(bl)[:120]})
    k3 = next((k for k in sec if k.startswith('三、')), None)
    if k3:
        bl = []
        for l in sec[k3]:
            m = re.match(r'^\d+\. ?(.+?)：', l)
            if m: bl.append(m.group(1))
        bl = bl[:8]
        slides.append({'t': '三、核心能力域', 'bullets': bl, 'narr': '核心能力域包括：' + '、'.join(bl[:6]) + '等方向，缺一不可。'})
    k4 = next((k for k in sec if k.startswith('四、')), None)
    if k4:
        bl = [clip(l, 30) for l in sec[k4] if l.startswith('阶段')][:4]
        slides.append({'t': '四、精通路线', 'bullets': bl, 'narr': '从零到赛场分四个阶段推进：' + '；'.join(b.replace('（', '，用时').replace('）', '') for b in bl) + '。每阶段都要用验收标准检验自己。'})
    k5 = next((k for k in sec if k.startswith('五、')), None)
    if k5:
        bl = [clip(l, 40) for l in sec[k5] if re.match(r'^(每日|每周|每月)', l)][:3]
        slides.append({'t': '五、训练体系', 'bullets': bl, 'narr': '训练体系强调节奏：' + '。'.join(b.split('：')[0] for b in bl) + '，按计划长期坚持。'})
    k6 = next((k for k in sec if k.startswith('六、')), None)
    if k6:
        bl = [clip(re.sub(r'^\d+\. ?', '', l), 28) for l in sec[k6] if re.match(r'^\d+', l)][:4]
        slides.append({'t': '六、自测清单（节选）', 'bullets': bl, 'narr': '用自测清单定期核验水平，这里列出其中几条。' + '；'.join(bl[:2]) + '。'})
    k7 = next((k for k in sec if k.startswith('七、')), None)
    if k7:
        bl = [clip(re.sub(r'^\d+\. ?', '', l), 30) for l in sec[k7] if re.match(r'^\d+', l)][:3]
        names = []
        for b in bl:
            names.append(b.split('：')[0] if '：' in b else b)
        narr7 = '特别提醒几个常见失误：' + '；'.join(names) + '。'
        slides.append({'t': '七、避坑指南', 'bullets': bl, 'narr': narr7})
    slides.append({'t': '完整内容', 'sub': '总纲 · 图解 · 模拟训练 · 本仓库均可离线查阅', 'kicker': '世界技能大赛全技能精通库', 'narr': '完整的项目总纲、图解与模拟训练，见世界技能大赛全技能精通库。祝你从零到精通。'})
    return slides

def render_png(i, s):
    img = Image.new('RGB', (W, H), '#ffffff')
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 8], fill='#2b5cd9')
    kick = s.get('kicker')
    if kick:
        f = F(30, True); d.text((80, 60), kick, font=f, fill='#8a97ad')
    t = s['t']
    ft = F(58, True)
    d.text((80, 130 if kick else 90), t, font=ft, fill='#182338')
    if s.get('sub'):
        fs = F(34); d.text((80, 230 if kick else 190), s['sub'], font=fs, fill='#5b6b85')
    y = 300 if (kick or s.get('sub')) else 240
    if s.get('bullets'):
        for b in s['bullets']:
            d.rectangle([86, y + 16, 98, y + 28], fill='#2b5cd9')
            f = F(32)
            txt = b if len(b) <= 30 else b[:29] + '。'
            d.text((120, y), txt, font=f, fill='#33415e')
            y += 64
    f = F(24); d.text((W - 140, H - 60), '第 ' + str(i + 1) + ' 页', font=f, fill='#8a97ad')
    p = os.path.join(WORK, 's%02d.png' % i); img.save(p); return p

async def tts_all(slides):
    import edge_tts
    # 整支视频只发一次合成请求（失败率降为 1/9），幻灯片按时长匀速切换
    mp3 = os.path.join(WORK, 'narr_all.mp3')
    combined = ' '.join(s['narr'] for s in slides)
    ok = False
    for attempt in range(1, 7):
        try:
            c = edge_tts.Communicate(combined, VOICE)
            await c.save(mp3)
            if os.path.getsize(mp3) > 1000:
                ok = True
                break
        except Exception as e:
            print('tts retry', attempt, type(e).__name__, flush=True)
            await asyncio.sleep(2 * attempt)
    if not ok:
        raise RuntimeError('tts failed (combined)')
    return [mp3]

def dur(f):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True)
    return float(r.stdout.strip() or 0)

def main():
    title, en, sec = read_md()
    slides = build_slides(title, en, sec)
    pngs = [render_png(i, s) for i, s in enumerate(slides)]
    print('slides:', len(pngs), flush=True)
    mp3s = asyncio.run(tts_all(slides))
    print('tts done', flush=True)
    total = dur(mp3s[0]) + 1.2
    seg_d = total / len(pngs)
    lst = os.path.join(WORK, 'imglist.txt')
    with open(lst, 'w') as f:
        for p in pngs:
            f.write("file '%s'\n" % p)
            f.write("duration %.2f\n" % seg_d)
        f.write("file '%s'\n" % pngs[-1])
    subprocess.run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lst,
                    '-i', mp3s[0], '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '24',
                    '-c:a', 'aac', '-b:a', '96k', '-t', str(total), '-movflags', '+faststart', OUT], check=True)
    print('VIDEO_DONE', OUT, os.path.getsize(OUT), flush=True)

if __name__ == '__main__':
    main()
