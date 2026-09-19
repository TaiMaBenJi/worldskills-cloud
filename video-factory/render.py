# -*- coding: utf-8 -*-
"""学校机房管理视频教程 · 幻灯片渲染核心库
深色科技风设计系统：1920x1080，缓存背景，多种版式。
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

W, H = 1920, 1080

# ---------- 配色 ----------
C_BG1   = (10, 16, 32)
C_BG2   = (17, 28, 52)
C_PANEL = (24, 37, 66)
C_PANEL_L = (30, 46, 84)
C_LINE  = (48, 68, 112)
C_TEXT  = (233, 239, 250)
C_SUB   = (150, 168, 200)
C_DIM   = (108, 126, 158)
C_CYAN  = (56, 189, 248)
C_ORANGE= (251, 191, 36)
C_GREEN = (52, 211, 153)
C_RED   = (248, 113, 113)
C_PURPLE= (167, 139, 250)

FONT_B = '/usr/share/fonts/noto/NotoSansCJK-Bold.ttc'
FONT_R = '/usr/share/fonts/noto/NotoSansCJK-Regular.ttc'

SERIES = '学校机房管理 · 从零到极致'

_fonts = {}
def F(size, bold=False, index=0):
    key = (size, bold, index)
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(FONT_B if bold else FONT_R, size, index=index)
    return _fonts[key]

# ---------- 背景（缓存） ----------
_bg_cache = None
def _make_bg():
    img = Image.new('RGB', (W, H), C_BG1)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(
            int(C_BG1[0]*(1-t) + C_BG2[0]*t),
            int(C_BG1[1]*(1-t) + C_BG2[1]*t),
            int(C_BG1[2]*(1-t) + C_BG2[2]*t)))
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([W-780, -420, W+420, 560], fill=(56, 189, 248, 30))
    gd.ellipse([-460, H-560, 560, H+260], fill=(99, 102, 241, 24))
    glow = glow.filter(ImageFilter.GaussianBlur(110))
    img = Image.alpha_composite(img.convert('RGBA'), glow)
    grid = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    for x in range(0, W, 80):
        gd.line([(x, 0), (x, H)], fill=(120, 150, 220, 9))
    for y in range(0, H, 80):
        gd.line([(0, y), (W, y)], fill=(120, 150, 220, 9))
    return Image.alpha_composite(img, grid).convert('RGB')

def new_slide():
    global _bg_cache
    if _bg_cache is None:
        _bg_cache = _make_bg()
    return _bg_cache.copy()

# ---------- 工具 ----------
def wrap(text, font, max_w):
    """中文按渲染宽度折行"""
    lines, cur = [], ''
    for ch in text:
        if ch == '\n':
            lines.append(cur); cur = ''; continue
        if font.getlength(cur + ch) > max_w and cur:
            lines.append(cur); cur = ch
        else:
            cur += ch
    if cur:
        lines.append(cur)
    return lines

def rrect(d, box, r, fill=None, outline=None, width=2):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)

def dot(d, x, y, r, color):
    d.ellipse([x-r, y-r, x+r, y+r], fill=color)

def chip(d, x, y, text, font, fg, bg=None, pad=16, r=22):
    w = font.getlength(text)
    box = [x, y, x + w + pad*2, y + (font.size + pad*1.4)]
    if bg:
        rrect(d, box, r, fill=bg)
    d.text((x + pad, box[1] + pad*0.55), text, font=font, fill=fg)
    return box

def arrow_right(d, x, y, color):
    """x,y = 左端点；画 ~54px 长箭头"""
    d.line([(x, y), (x+34, y)], fill=color, width=5)
    d.polygon([(x+34, y-11), (x+56, y), (x+34, y+11)], fill=color)

def arrow_down(d, x, y, color):
    d.line([(x, y), (x, y+34)], fill=color, width=5)
    d.polygon([(x-11, y+34), (x, y+56), (x+11, y+34)], fill=color)

def draw_chrome(d, ep_no, ep_title, page, total):
    """页眉页脚"""
    f_small = F(26)
    f_small_b = F(26, True)
    # 页眉左：系列名
    dot(d, 130, 66, 9, C_CYAN)
    d.text((158, 50), SERIES, font=f_small, fill=C_SUB)
    # 页眉右：第 N 讲
    label = f'第 {ep_no} 讲 · {ep_title}'
    d.text((W-130, 50), label, font=f_small_b, fill=C_DIM, anchor='ra')
    # 页脚：进度线
    d.line([(130, H-58), (W-130, H-58)], fill=C_LINE, width=2)
    prog = 0 if total <= 1 else page / (total - 1)
    d.line([(130, H-58), (130 + (W-260)*prog, H-58)], fill=C_CYAN, width=4)
    d.text((130, H-48), f'{page+1:02d} / {total:02d}', font=F(24), fill=C_DIM)
    d.text((W-130, H-48), '配套图文教程 + 真机训练场', font=F(22), fill=C_DIM, anchor='ra')

def title_block(d, title, accent=C_CYAN, y=132):
    """内容页标题 + accent 短线，返回正文起点 y"""
    f = F(58, True)
    d.text((130, y), title, font=f, fill=C_TEXT)
    d.line([(132, y + 92), (132 + 88, y + 92)], fill=accent, width=8)
    return y + 132

# ---------- 版式 ----------

def slide_cover(meta, s):
    """封面页：大编号 + 标题 + 副题 + 导语列表"""
    ep_no = meta['ep_no']; img = new_slide(); d = ImageDraw.Draw(img)
    # 背景大字编号
    f_big = F(430, True)
    d.text((W-96, H-150), ep_no, font=f_big, fill=(30, 44, 78), anchor='rs')
    chip(d, 130, 150, f'第 {ep_no} 讲', F(30, True), C_CYAN, bg=(18, 44, 66))
    f_t = F(96, True)
    lines = wrap(s['title'], f_t, 1500)
    yy = 262
    for ln in lines:
        d.text((130, yy), ln, font=f_t, fill=C_TEXT); yy += 128
    if s.get('subtitle'):
        d.text((130, yy + 8), s['subtitle'], font=F(38), fill=C_SUB)
        yy += 84
    # 导语要点
    if s.get('items'):
        for it in s['items']:
            dot(d, 140, yy + 26, 7, C_ORANGE)
            d.text((170, yy), it, font=F(32), fill=C_SUB)
            yy += 58
    # 底部：相关系列信息
    d.text((130, H-140), '全系列配套：图文教程 + 真机训练场', font=F(30, True), fill=C_DIM)
    draw_chrome(d, ep_no, meta['ep_title'], 0, meta['total'])
    return img

def slide_bullets(meta, s):
    """要点页：标题 + 1-5 条要点（可带小说明/高亮）"""
    ep_no = meta['ep_no']; img = new_slide(); d = ImageDraw.Draw(img)
    body_y = title_block(d, s['title'], s.get('accent', C_CYAN))
    items = s['items']
    n = len(items)
    # 自适应字号与行距
    fs = 40 if n <= 4 else (36 if n <= 5 else 32)
    gap = 40 if n <= 4 else 30
    y = body_y + 16
    avail = H - 150 - y
    if n >= 1:
        slot = avail / n
        for i, it in enumerate(items):
            main = it.get('t', '') if isinstance(it, dict) else it
            desc = it.get('d', '') if isinstance(it, dict) else ''
            hl = it.get('hl', None) if isinstance(it, dict) else None
            cy = y + i*slot
            # 序号块
            rrect(d, [130, cy, 130+64, cy+64], 14, fill=C_PANEL_L, outline=s.get('accent', C_CYAN), width=2)
            d.text((162, cy+32), str(i+1), font=F(30, True), fill=s.get('accent', C_CYAN), anchor='mm')
            tx = 230
            f_main = F(fs, True)
            d.text((tx, cy + 6), main, font=f_main, fill=C_TEXT)
            if desc:
                f_d = F(30)
                max_w = W - tx - 140
                lines = wrap(desc, f_d, max_w)
                dy = cy + fs + 18
                for ln in lines[:2]:
                    d.text((tx, dy), ln, font=f_d, fill=C_SUB); dy += 42
    draw_chrome(d, ep_no, meta['ep_title'], meta['page'], meta['total'])
    return img

def slide_cards(meta, s):
    """卡片网格：2 或 3 列，卡片含编号/标题/描述"""
    ep_no = meta['ep_no']; img = new_slide(); d = ImageDraw.Draw(img)
    body_y = title_block(d, s['title'], s.get('accent', C_CYAN))
    cards = s['cards']
    n = len(cards)
    cols = 2 if n <= 4 else 3
    rows = (n + cols - 1) // cols
    gx, gy = 36, 32
    x0, x1 = 130, W - 130
    cw = (x1 - x0 - gx*(cols-1)) / cols
    avail_h = H - 150 - body_y - 10
    ch = min(300, (avail_h - gy*(rows-1)) / rows)
    for i, c in enumerate(cards):
        r, cc = divmod(i, cols)
        cx = x0 + cc*(cw + gx); cy = body_y + r*(ch + gy)
        accent = c.get('accent', C_CYAN)
        rrect(d, [cx, cy, cx+cw, cy+ch], 18, fill=C_PANEL, outline=C_LINE, width=2)
        rrect(d, [cx, cy, cx+cw, cy+6], 3, fill=accent)  # 顶部彩条
        if c.get('tag'):
            chip(d, cx+28, cy+26, c['tag'], F(24, True), accent, bg=(18, 30, 52))
        f_t = F(34, True)
        ty = cy + (88 if c.get('tag') else 44)
        for ln in wrap(c['t'], f_t, cw-56)[:2]:
            d.text((cx+28, ty), ln, font=f_t, fill=C_TEXT); ty += 46
        if c.get('d'):
            f_d = F(25)
            ty += 6
            for ln in wrap(c['d'], f_d, cw-56)[:4]:
                d.text((cx+28, ty), ln, font=f_d, fill=C_SUB); ty += 36
    draw_chrome(d, ep_no, meta['ep_title'], meta['page'], meta['total'])
    return img

def slide_steps(meta, s):
    """步骤流程：横向（3-4 步）或纵向（4-6 步）"""
    ep_no = meta['ep_no']; img = new_slide(); d = ImageDraw.Draw(img)
    body_y = title_block(d, s['title'], s.get('accent', C_CYAN))
    steps = s['steps']
    n = len(steps)
    accent = s.get('accent', C_CYAN)
    if s.get('dir') == 'v' or n > 4:
        # 纵向
        y = body_y + 8
        fs_t, fs_d = 38, 29
        avail = H - 170 - y
        slot = avail / n
        cx = 230
        d.line([(cx, y+30), (cx, y + slot*(n-1) + 30)], fill=C_LINE, width=4)
        for i, st in enumerate(steps):
            cy = y + i*slot
            dot(d, cx, cy+30, 20, C_PANEL_L); d.ellipse([cx-20, cy+10, cx+20, cy+50], outline=accent, width=3)
            d.text((cx, cy+30), str(i+1), font=F(26, True), fill=accent, anchor='mm')
            d.text((cx+52, cy+2), st['t'], font=F(fs_t, True), fill=C_TEXT)
            dy = cy + fs_t + 22
            for ln in wrap(st.get('d', ''), F(fs_d), W - cx - 300)[:2]:
                d.text((cx+52, dy), ln, font=F(fs_d), fill=C_SUB); dy += 38
    else:
        # 横向
        gx = 30
        x0, x1 = 130, W - 130
        cw = (x1 - x0 - gx*(n-1)) / n
        y = body_y + 60
        ch = 380
        for i, st in enumerate(steps):
            cx = x0 + i*(cw + gx)
            rrect(d, [cx, y, cx+cw, y+ch], 18, fill=C_PANEL, outline=C_LINE, width=2)
            rrect(d, [cx, y, cx+cw, y+6], 3, fill=accent)
            d.text((cx+cw/2, y+70), str(i+1), font=F(72, True), fill=accent, anchor='mm')
            d.ellipse([cx+cw/2-58, y+12, cx+cw/2+58, y+128], outline=accent, width=0)
            f_t = F(32, True)
            ty = y + 150
            for ln in wrap(st['t'], f_t, cw-48)[:2]:
                d.text((cx+24, ty), ln, font=f_t, fill=C_TEXT); ty += 44
            f_d = F(25)
            ty += 6
            for ln in wrap(st.get('d', ''), f_d, cw-48)[:4]:
                d.text((cx+24, ty), ln, font=f_d, fill=C_SUB); ty += 36
            if i < n - 1:
                arrow_right(d, cx + cw + 2, y + ch/2, C_DIM)
    draw_chrome(d, ep_no, meta['ep_title'], meta['page'], meta['total'])
    return img

def slide_bignums(meta, s):
    """大数字页：一排 3-4 个关键数字"""
    ep_no = meta['ep_no']; img = new_slide(); d = ImageDraw.Draw(img)
    body_y = title_block(d, s['title'], s.get('accent', C_CYAN))
    nums = s['nums']
    n = len(nums)
    gx = 30
    x0, x1 = 130, W - 130
    cw = (x1 - x0 - gx*(n-1)) / n
    y = body_y + 40
    for i, it in enumerate(nums):
        cx = x0 + i*(cw + gx)
        rrect(d, [cx, y, cx+cw, y+420], 18, fill=C_PANEL, outline=C_LINE, width=2)
        accent = it.get('accent', C_CYAN)
        rrect(d, [cx, y, cx+cw, y+6], 3, fill=accent)
        f_num = F(96, True)
        num = it['num']; unit = it.get('unit', '')
        tw = f_num.getlength(num) + (F(40, True).getlength(unit) if unit else 0)
        sx = cx + (cw - tw) / 2
        d.text((sx, y+96), num, font=f_num, fill=accent)
        if unit:
            d.text((sx + f_num.getlength(num) + 6, y+150), unit, font=F(40, True), fill=accent)
        ty = y + 240
        for ln in wrap(it['d'], F(28), cw-52)[:3]:
            d.text((cx+26, ty), ln, font=F(28), fill=C_SUB); ty += 40
    draw_chrome(d, ep_no, meta['ep_title'], meta['page'], meta['total'])
    return img

def slide_table(meta, s):
    """表格页"""
    ep_no = meta['ep_no']; img = new_slide(); d = ImageDraw.Draw(img)
    body_y = title_block(d, s['title'], s.get('accent', C_CYAN))
    headers, rows = s['headers'], s['rows']
    x0, x1 = 130, W - 130
    n = len(headers)
    cw = (x1 - x0) / n
    y = body_y + 30
    rh = min(96, (H - 170 - y - 70) / (len(rows) + 1))
    # 表头
    rrect(d, [x0, y, x1, y+rh], 12, fill=C_PANEL_L)
    for j, h in enumerate(headers):
        d.text((x0 + cw*j + 28, y + rh/2), h, font=F(30, True), fill=C_CYAN, anchor='lm')
    y += rh + 10
    for i, row in enumerate(rows):
        if i % 2 == 0:
            rrect(d, [x0, y, x1, y+rh], 10, fill=(21, 32, 58))
        for j, cell in enumerate(row):
            bold = j == 0
            d.text((x0 + cw*j + 28, y + rh/2), str(cell), font=F(27, bold), fill=C_TEXT if bold else C_SUB, anchor='lm')
        y += rh + 6
    draw_chrome(d, ep_no, meta['ep_title'], meta['page'], meta['total'])
    return img

def slide_compare(meta, s):
    """左右对比页"""
    ep_no = meta['ep_no']; img = new_slide(); d = ImageDraw.Draw(img)
    body_y = title_block(d, s['title'], s.get('accent', C_CYAN))
    y0, y1 = body_y + 20, H - 150
    mx = W/2
    left, right = s['left'], s['right']
    for side, (ttl, items, accent, x0, x1) in enumerate([
            (left['t'], left['items'], left.get('accent', C_RED), 130, mx-30),
            (right['t'], right['items'], right.get('accent', C_GREEN), mx+30, W-130)]):
        rrect(d, [x0, y0, x1, y1], 18, fill=C_PANEL, outline=accent, width=2)
        d.text((x0+40, y0+34), ttl, font=F(40, True), fill=accent)
        d.line([(x0+40, y0+108), (x0+160, y0+108)], fill=accent, width=6)
        ty = y0 + 150
        for it in items:
            dot(d, x0+52, ty+18, 7, accent)
            for k, ln in enumerate(wrap(it, F(29), x1-x0-130)[:3]):
                d.text((x0+80, ty), ln, font=F(29), fill=C_TEXT if k == 0 else C_SUB); ty += 40
            ty += 26
    draw_chrome(d, ep_no, meta['ep_title'], meta['page'], meta['total'])
    return img

def slide_note(meta, s):
    """引用/金句页：一句核心话，居中大字"""
    ep_no = meta['ep_no']; img = new_slide(); d = ImageDraw.Draw(img)
    accent = s.get('accent', C_ORANGE)
    f = F(66, True)
    lines = []
    for para in s['text'].split('\n'):
        lines += wrap(para, f, 1400)
    total_h = len(lines) * 96
    y = (H - total_h)/2 - 40
    # 装饰引号
    d.text((W/2, y - 170), '“', font=F(200, True), fill=(50, 68, 108), anchor='mm')
    for ln in lines:
        d.text((W/2, y), ln, font=f, fill=C_TEXT, anchor='ma'); y += 96
    if s.get('sub'):
        d.text((W/2, y + 50), s['sub'], font=F(30), fill=C_SUB, anchor='ma')
    d.line([(W/2-90, y + 40), (W/2+90, y + 40)], fill=accent, width=6)
    draw_chrome(d, ep_no, meta['ep_title'], meta['page'], meta['total'])
    return img

def slide_end(meta, s):
    """结尾页：下一讲 + 训练场召唤"""
    ep_no = meta['ep_no']; img = new_slide(); d = ImageDraw.Draw(img)
    d.text((W/2, 300), s.get('kicker', '本讲完'), font=F(40, True), fill=C_CYAN, anchor='mm')
    f = F(82, True)
    y = 400
    for ln in wrap(s['title'], f, 1400):
        d.text((W/2, y), ln, font=f, fill=C_TEXT, anchor='ma'); y += 108
    if s.get('sub'):
        d.text((W/2, y + 30), s['sub'], font=F(32), fill=C_SUB, anchor='ma')
    if s.get('next'):
        box_y = y + 130
        rrect(d, [W/2-460, box_y, W/2+460, box_y+110], 16, fill=C_PANEL, outline=C_LINE, width=2)
        d.text((W/2, box_y+55), s['next'], font=F(30), fill=C_ORANGE, anchor='mm')
    draw_chrome(d, ep_no, meta['ep_title'], meta['page'], meta['total'])
    return img

RENDERERS = {
    'cover': slide_cover, 'bullets': slide_bullets, 'cards': slide_cards,
    'steps': slide_steps, 'bignums': slide_bignums, 'table': slide_table,
    'compare': slide_compare, 'note': slide_note, 'end': slide_end,
}

def render_slide(slide, meta):
    fn = RENDERERS[slide['type']]
    return fn(meta, slide)
