#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""教程章节 → 视频脚本生成器（v1）
把 tutorial/ 的 md 章节自动转换为 EPISODE 视频脚本（slides 结构）。
策略：忠实提取原文要点+旁白，智能裁剪；页面形式按内容启发式选择。
"""
import re, os, sys

TUT = '/opt/tmbj/worldskills-cloud/tutorial'
OUTDIR = '/opt/tmbj/course-video/scripts'
SERIES = '云计算保姆级教程 · 从零到实战'
ACCENTS = [(56,189,248),(251,191,36),(52,211,153),(167,139,250),(248,113,113)]

NEXT_MAP = {
    '00': ('01', 'Linux 零基础'),
    '01': ('02', '网络零基础'),
    '02': ('03', '服务器实战'),
    '03': ('04', 'HTTPS 与证书'),
    '04': ('05', 'DNS 实战'),
    '05': ('06', '负载均衡与高可用'),
    '06': ('07', '故障排查专题'),
    '07': ('08', 'Windows Server 基础'),
    '08': ('09', 'Shell 脚本进阶'),
    '09': ('10', 'Docker 容器入门'),
    '10': ('11', 'Kubernetes 入门'),
    '11': ('12', 'AWS 云平台实战'),
    '12': ('13', '自动化运维'),
    '13': ('14', '监控与日志'),
    '14': ('15', '安全加固'),
    '15': ('16', '真题实战'),
    '16': ('17', '机房管理'),
    '17': (None, None),
}

def clean_md(s):
    s = re.sub(r'\*\*([^*]+)\*\*', r'\1', s)
    s = re.sub(r'`([^`]+)`', r'\1', s)
    s = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', s)
    s = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', s)
    s = re.sub(r'[*_]{1,2}', '', s)
    return s.strip()

def clip_sent(s, maxlen=400):
    """裁剪到靠近 maxlen 的句子边界"""
    if len(s) <= maxlen:
        return s
    cut = s[:maxlen]
    last = -1
    for m in re.finditer(r'[。！？；]', cut):
        last = m.end()
    if last > maxlen * 0.5:
        return cut[:last]
    return cut[:maxlen].rstrip('，、') + '……'

def tidy_cut(s):
    """去除未闭合括号的残尾和悬空标点"""
    if s.count('（') > s.count('）'):
        i = s.rfind('（')
        if i > len(s) * 0.4:
            s = s[:i]
    if s.count('(') > s.count(')'):
        i = s.rfind('(')
        if i > len(s) * 0.4:
            s = s[:i]
    return s.rstrip('，、；： （(')

def extract_points(text, maxn=6):
    """从文本里提取要点：### 子标题（带描述）+ 列表项。
    规则：小节内有 ≥2 个 ### 子标题时，只收子标题（结构清晰）；否则收列表项。"""
    lines = text.split('\n')
    h3_count = sum(1 for l in lines if re.match(r'^### [^#]', l.strip()))
    want_h3 = h3_count >= 2
    pts = []
    for idx, line in enumerate(lines):
        raw = line.strip()
        if re.match(r'^### [^#]', raw):
            t = clean_md(re.sub(r'^#+\s*', '', raw))
            t = re.sub(r'^\d+(\.\d+)+\s*', '', t).strip()
            if len(t) < 5:
                continue
            # 找后续首个内容做描述
            d = ''
            for nxt in lines[idx+1: idx+8]:
                nxt = nxt.strip()
                if not nxt or nxt.startswith('#'):
                    continue
                if nxt.startswith(('- ', '* ')) or re.match(r'^\d+\.\s', nxt):
                    d = clean_md(re.sub(r'^([-*]|\d+\.)\s+', '', nxt))
                else:
                    d = clean_md(nxt)
                d = tidy_cut(clip_sent(d, 46))
                break
            if not any(p['t'] == clip_sent(t, 40) for p in pts):
                pts.append({'t': clip_sent(t, 40), 'd': d})
            if len(pts) >= maxn:
                break
            continue
        if want_h3:
            continue
        item = None
        if re.match(r'^[-*] ', raw):
            item = raw[2:].strip()
        elif re.match(r'^\d+\.\s', raw):
            item = re.sub(r'^\d+\.\s+', '', raw)
        if not item or item.startswith('```'):
            continue
        item = clean_md(item)
        if len(item) < 6:
            continue
        m = re.match(r'^([^：:]{2,22})[：:](.{4,})$', item)
        if m:
            pts.append({'t': m.group(1).strip(), 'd': clip_sent(m.group(2).strip(), 110)})
        else:
            if len(item) > 66:
                cut = tidy_cut(clip_sent(item, 56))
                rest = item[len(cut):].lstrip('，。；、 ')
                if rest:
                    pts.append({'t': cut, 'd': clip_sent(rest, 100)})
                else:
                    pts.append({'t': cut, 'd': ''})
            else:
                pts.append({'t': item, 'd': ''})
        if len(pts) >= maxn:
            break
    return pts

def extract_narration_full(body, title):
    """组合旁白：优先正文段落（可多段），退化到列表/子标题拼接"""
    paras = re.split(r'\n\s*\n', body)
    chunks = []
    total = 0
    for p in paras:
        p = p.strip()
        if not p: continue
        if p.startswith('#'):
            continue
        pc = ''
        if p.startswith('>'):
            pc = clean_md(p[1:].strip())
        elif p.startswith('```') or p.startswith('|') or p.startswith('!'):
            continue
        elif p.startswith(('- ', '* ')) or re.match(r'^\d+\.\s', p):
            continue
        else:
            pc = clean_md(p)
        if len(pc) < 24:
            continue
        chunks.append(pc); total += len(pc)
        if total >= 360:
            break
    if not chunks:
        pts = extract_points(body, 4)
        if pts:
            chunks = ['；'.join((x['t'] + ('，' + x['d'] if x['d'] else '')) for x in pts)]
    if not chunks:
        return ''
    nar = clip_sent(' '.join(chunks), 430)
    # 短旁白补足：拼接要点内容
    if len(nar) < 150:
        pts = extract_points(body, 4)
        extra = '；'.join((x['t'] + ('，' + x['d'] if x['d'] else '')) for x in pts)
        if extra and extra[:20] not in nar:
            nar = clip_sent((nar + '。' + extra) if nar else extra, 430)
    return nar

def parse_chapter(path):
    text = open(path, encoding='utf-8').read()
    # 章标题
    m = re.search(r'^# (.+)$', text, re.M)
    chap_title = clean_md(m.group(1)) if m else os.path.basename(path)
    # 导语（> 块，取前几行）
    intro = ''
    intro_items = []
    for line in text.split('\n'):
        if line.startswith('>'):
            t = clean_md(line[1:].strip())
            if len(t) > 10 and not t.startswith('本章目标') and '预计学习时间' not in t:
                if not intro:
                    intro = t
                if len(intro_items) < 3 and len(t) > 8:
                    intro_items.append(clip_sent(t, 44))
    # 小节
    secs = []
    cur = None
    for line in text.split('\n'):
        if re.match(r'^## ', line) and not line.startswith('## 附'):
            if cur: secs.append(cur)
            cur = {'title': clean_md(line[3:]), 'body': []}
        elif cur is not None:
            cur['body'].append(line)
    if cur: secs.append(cur)
    # 去掉太短的无内容节
    secs = [s for s in secs if len('\n'.join(s['body'])) > 80]
    return chap_title, intro, intro_items, secs

def build_slides(ch_no, chap_title, intro, intro_items, secs):
    slides = []
    titleshort = chap_title.split('·')[-1].strip() if '·' in chap_title else chap_title
    # 封面：导语条目改为按句切分（避免生硬截断）
    intro_sents = []
    for s2 in re.split(r'[。！？；]', intro or ''):
        s2 = s2.strip()
        if 8 <= len(s2) <= 52:
            intro_sents.append(s2 + '。')
        if len(intro_sents) >= 3:
            break
    # 封面
    slides.append({
        'type': 'cover',
        'title': re.sub(r'（保姆级）', '', chap_title).strip(),
        'subtitle': f'保姆级视频课 · 第 {ch_no} 集' if ch_no != '00' else '保姆级视频课 · 开篇',
        'items': intro_sents[:3] or ['跟着看、跟着练，一次学会'],
        'narration': (f'欢迎来到云计算保姆级教程视频课。{intro}' if intro else f'欢迎来到云计算保姆级教程视频课。这一集我们学习{chap_title}。')[:420],
    })
    # 导览页
    sec_titles = [re.sub(r'^\d+\.\d+\s*', '', s['title']) for s in secs]
    if len(sec_titles) >= 3:
        steps = [{'t': st[:15], 'd': ''} for st in sec_titles[:6]]
        route_names = '、'.join(st[:16] for st in sec_titles[:6])
        nar_route = (f'先看这条路线。这一章一共 {len(secs)} 个部分，我们先重点走这几站：{route_names}。'
                     f'跟着顺序来，每一站我都会告诉你要点在哪里。')
        slides.append({
            'type': 'steps', 'title': '本章路线图：我们会走过这些站',
            'accent': ACCENTS[0], 'steps': steps, 'narration': nar_route,
        })
    # 各小节页（预算：至多 12 页）
    max_sec_pages = 12
    use_secs = secs[:max_sec_pages]
    for i, sec in enumerate(use_secs):
        title = re.sub(r'^\d+\.\d+\s*', '', sec['title'])
        title = clip_sent(title, 26)
        body = '\n'.join(sec['body'])
        pts = extract_points(body, 5)
        accent = ACCENTS[i % len(ACCENTS)]
        nar = extract_narration_full(body, title)
        if len(pts) >= 2:
            slide = {'type': 'bullets', 'title': title, 'items': pts, 'accent': accent,
                     'narration': f'{title}。' + (nar or '')}
        elif nar:
            slide = {'type': 'note', 'text': clip_sent(nar, 96), 'sub': '',
                     'accent': accent, 'narration': f'{title}。' + nar}
        else:
            slide = {'type': 'bullets', 'title': title, 'accent': accent,
                     'items': [{'t': '本节内容详见配套图文教程', 'd': '视频课讲主线，图文里有完整的手把手步骤'}],
                     'narration': f'{title}。这一节的具体操作步骤在配套图文教程里，视频课我们先把要点过一遍。'}
        slides.append(slide)
    # 如果小节超过预算，加一页"其余内容"提示
    if len(secs) > max_sec_pages:
        rest = [re.sub(r'^\d+\.\d+\s*', '', s['title']) for s in secs[max_sec_pages:]]
        slides.append({
            'type': 'bullets', 'title': '本章还有这些内容（见配套图文）',
            'accent': ACCENTS[2],
            'items': [{'t': r[:40], 'd': ''} for r in rest[:6]],
            'narration': '本章还有几个部分：' + '、'.join(rest[:6]) + '。视频课先讲主线，这些内容在配套图文教程里都有完整版，照着手把手做就行。',
        })
    # 结尾
    nxt_no, nxt_title = NEXT_MAP.get(ch_no, (None, None))
    if nxt_no:
        slides.append({
            'type': 'end', 'kicker': f'第 {ch_no} 集 · 完',
            'title': f'下一集\n第 {nxt_no} 集 · {nxt_title}',
            'sub': '配套图文：打开教程对应章节，边看视频边动手',
            'next': '练完记得去训练场实战（wsarena）· 不懂就回看本集',
            'narration': f'第 {ch_no} 集到这里就结束了。下一集我们学习{nxt_title}。记住：视频看一遍，图文过一遍，动手练一遍，三遍下来才算真的学会。我们下一集见！',
        })
    else:
        slides.append({
            'type': 'end', 'kicker': f'第 {ch_no} 集 · 完',
            'title': '全教程 · 完\n你已通关',
            'sub': '接下来：训练场实战 + 考试中心自测 + 机房专项视频课',
            'next': 'wsarena exam full · 全场景模拟赛等你挑战',
            'narration': '到这里，整套保姆级教程的视频课就全部结束了。接下来就是你自己的时间：进训练场实战、去考试中心自测、还有机房管理专项视频课等着你。记住那句话：从零到极致，就是每一天都比昨天更专业一点点。',
        })
    return slides

def gen_one(ch_no, md_name):
    path = os.path.join(TUT, md_name)
    chap_title, intro, intro_items, secs = parse_chapter(path)
    slides = build_slides(ch_no, chap_title, intro, intro_items, secs)
    clean_title = re.sub(r'（保姆级）', '', re.sub(r'^第 \d+ 章 · ', '', chap_title)).strip()[:30]
    ep = {'id': ch_no, 'sid': 'course', 'series': SERIES,
          'title': clean_title, 'slides': slides}
    out = os.path.join(OUTDIR, f't{ch_no}.py')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('# -*- coding: utf-8 -*-\n')
        f.write('EPISODE = ' + repr(ep) + '\n')
    print(f'T{ch_no}: {len(slides)} slides -> {out}')

if __name__ == '__main__':
    CHAPTERS = [
        ('00', '00-开始之前-零基础先读我.md'),
        ('01', '01-Linux零基础-保姆级.md'),
        ('02', '02-网络零基础-保姆级.md'),
        ('03', '03-服务器实战-保姆级.md'),
        ('04', '04-HTTPS与证书-保姆级.md'),
        ('05', '05-DNS实战-保姆级.md'),
        ('06', '06-负载均衡与高可用-保姆级.md'),
        ('07', '07-故障排查专题-保姆级.md'),
        ('08', '08-WindowsServer基础-保姆级.md'),
        ('09', '09-Shell脚本进阶-保姆级.md'),
        ('10', '10-Docker容器入门-保姆级.md'),
        ('11', '11-Kubernetes入门-保姆级.md'),
        ('12', '12-AWS云平台实战-保姆级.md'),
        ('13', '13-自动化运维-保姆级.md'),
        ('14', '14-监控与日志-保姆级.md'),
        ('15', '15-安全加固-保姆级.md'),
        ('16', '16-真题实战-保姆级.md'),
        ('17', '17-机房管理-保姆级.md'),
    ]
    only = sys.argv[1:] if len(sys.argv) > 1 else None
    for ch, fn in CHAPTERS:
        if only and ch not in only:
            continue
        try:
            gen_one(ch, fn)
        except Exception as e:
            print(f'T{ch} ERROR: {e}')
