#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the Liquid-Glass style interactive study page (single file)."""
import markdown, os, json, re, glob, html as htmlmod

BASE = '/var/minis/shared/worldskills-cloud'

def md2html(p):
    with open(p, encoding='utf-8') as f:
        src = f.read()
    return markdown.markdown(src, extensions=['tables', 'fenced_code'])

# ---------- document list: (group, title, relpath, subtitle) ----------
G_SPRINT='sprint'; G_T='tutorial'; G_M='mastery'; G_CS='cs'; G_K='knowledge'; G_RM='room'; G_I='index'
G_OFF='official'; G_EXL='examlyon'; G_EXK='examkr'; G_EXC='examcn'; G_EXKZ='examkrzh'
DOCS = [
 (G_SPRINT,'⚡ 72小时冲刺作战手册','sprint/00-72小时冲刺作战手册.md','3天版·比赛应急'),
 (G_SPRINT,'⏱ 最快精通时间表','sprint/01-最快精通时间表.md','6个月路线·加速器'),
 (G_T,'教程总览','tutorial/README-教程总览.md','从这里开始'),
 (G_T,'第0章 · 开始之前','tutorial/00-开始之前-零基础先读我.md',None),
 (G_T,'第1章 · Linux零基础','tutorial/01-Linux零基础-保姆级.md',None),
 (G_T,'第2章 · 网络零基础','tutorial/02-网络零基础-保姆级.md',None),
 (G_T,'第3章 · 服务器实战','tutorial/03-服务器实战-保姆级.md',None),
 (G_T,'第4章 · HTTPS与证书','tutorial/04-HTTPS与证书-保姆级.md',None),
 (G_T,'第5章 · DNS实战','tutorial/05-DNS实战-保姆级.md',None),
 (G_T,'第6章 · 负载均衡与高可用','tutorial/06-负载均衡与高可用-保姆级.md',None),
 (G_T,'第7章 · 故障排查专题','tutorial/07-故障排查专题-保姆级.md',None),
 (G_T,'第8章 · Windows Server','tutorial/08-WindowsServer基础-保姆级.md',None),
 (G_T,'第9章 · 脚本进阶','tutorial/09-Shell脚本进阶-保姆级.md',None),
 (G_T,'第10章 · Docker','tutorial/10-Docker容器入门-保姆级.md',None),
 (G_T,'第11章 · Kubernetes','tutorial/11-Kubernetes入门-保姆级.md',None),
 (G_T,'第12章 · AWS实战','tutorial/12-AWS云平台实战-保姆级.md',None),
 (G_T,'第13章 · 自动化运维','tutorial/13-自动化运维-保姆级.md',None),
 (G_T,'第14章 · 监控与日志','tutorial/14-监控与日志-保姆级.md',None),
 (G_T,'第15章 · 安全加固','tutorial/15-安全加固-保姆级.md',None),
 (G_T,'第16章 · 真题实战','tutorial/16-真题实战-保姆级.md',None),
 (G_T,'第17章 · 机房管理','tutorial/17-机房管理-保姆级.md',None),
 (G_M,'精通 · 00 总纲','mastery/00-总纲-像说话一样掌握云计算.md','母语级方法论'),
 (G_M,'精通 · 01 疆域全景图','mastery/01-疆域全景图.md',None),
 (G_M,'精通 · 02 精通阶梯','mastery/02-精通阶梯与自测.md',None),
 (G_M,'精通 · 03 领域修炼','mastery/03-领域深度修炼.md',None),
 (G_M,'精通 · 04 架构模式','mastery/04-架构模式手册.md',None),
 (G_M,'精通 · 05 全平台地图','mastery/05-全平台地图.md',None),
 (G_M,'精通 · 06 365天训练','mastery/06-365天训练系统.md',None),
 (G_M,'⏱ 双精通时间线','mastery/07-双精通时间线-云与计算机科学.md','云+CS · 2年'),
 (G_CS,'母语 · 00 五书总纲','cs-mastery/00-总纲-五书共生体系.md','五书共生'),
 (G_CS,'母语 · 01 五书拆解','cs-mastery/01-五书拆解地图.md',None),
 (G_CS,'母语 · 02 24个月计划','cs-mastery/02-24个月整合计划.md',None),
 (G_CS,'母语 · 03 认知引擎','cs-mastery/03-认知引擎.md',None),
 (G_CS,'母语 · 04 项目清单','cs-mastery/04-项目实战清单.md',None),
 (G_K,'01 · Linux 与操作系统','knowledge/01-基础-Linux与操作系统.md',None),
 (G_K,'02 · 网络工程','knowledge/02-网络工程.md',None),
 (G_K,'03 · 企业服务全栈','knowledge/03-企业服务全栈.md',None),
 (G_K,'04 · 虚拟化与私有云','knowledge/04-虚拟化与私有云.md',None),
 (G_K,'05 · 公有云核心 AWS','knowledge/05-公有云核心-AWS.md',None),
 (G_K,'06 · 容器与编排','knowledge/06-容器与编排.md',None),
 (G_K,'07 · 自动化与 IaC','knowledge/07-自动化与IaC.md',None),
 (G_K,'08 · 可观测性','knowledge/08-可观测性与性能工程.md',None),
 (G_K,'09 · 安全与韧性','knowledge/09-安全与韧性.md',None),
 (G_K,'10 · 前沿与超越','knowledge/10-前沿与超越.md',None),
 (G_K,'11 · 竞赛实战指南','knowledge/11-竞赛实战指南.md',None),
 (G_K,'12 · 认证与职业发展','knowledge/12-认证与职业发展.md',None),
 (G_RM,'机房 · 00 总纲','room/00-总纲-从零到极致的机房之路.md','从零到极致'),
 (G_RM,'机房 · 01 阶梯与自测','room/01-阶梯与自测.md',None),
 (G_RM,'机房 · 02 基础设施修炼','room/02-基础设施修炼.md',None),
 (G_RM,'机房 · 03 服务器与存储','room/03-服务器与存储修炼.md',None),
 (G_RM,'机房 · 04 部署与自动化','room/04-部署与自动化修炼.md',None),
 (G_RM,'机房 · 05 运维与监控','room/05-运维与监控修炼.md',None),
 (G_RM,'机房 · 06 安全与合规','room/06-安全与合规修炼.md',None),
 (G_RM,'机房 · 07 应急与实战','room/07-应急与实战.md',None),
 (G_RM,'机房 · 08 职业路线','room/08-职业路线.md','考证·面试·就业'),
 (G_I,'总导航（资料库说明）','README-总导航.md',None),
 (G_I,'赛题目录','test-projects/INDEX.md',None),
 (G_I,'工程仓库目录','github-repos/INDEX.md',None),
]

# ---- extra collections: embed ALL readable materials ----
def kr_label(b):
    b = b[:-4] if b.endswith('.txt') else b
    parts = b.split('_')
    year = parts[0] if parts and parts[0].isdigit() else ''
    comp = '全国赛' if 'korea' in b else ('地方赛' if 'jibang' in b else '')
    day = ''
    mm = re.search(r'day(\d)', b, re.I)
    if mm: day = '第%s任务' % mm.group(1)
    kind = '评分标准' if 'grad' in b else ('题面' if 'mission' in b else '文档')
    return ('%s %s %s %s' % (year, comp, day, kind)).strip()

# official standards
DOCS.append((G_OFF, 'WSOS 2026 · 官方职业标准（全文）', 'official/WSOS-2026-cloud-computing.txt', None))
if os.path.exists(BASE + '/official/WSOS-2026-cloud-computing-zh.txt'):
    DOCS.append((G_OFF, '【中文】WSOS 2026 · 官方职业标准', 'official/WSOS-2026-cloud-computing-zh.txt', None))
# lyon world skills
DOCS.append((G_EXL, '里昂 2024 · A/B/D 模块评分点全录', 'test-projects/LYON2024-评分点全录.md', None))
for f in sorted(glob.glob(BASE + '/test-projects/LYON2024-ModuleB-评分脚本/*.ps1')):
    fn = os.path.basename(f)
    DOCS.append((G_EXL, 'ModuleB 评分脚本 · ' + fn, 'test-projects/LYON2024-ModuleB-评分脚本/' + fn, None))
# korean zh files index
zh_files = {}
_zh_dir = BASE + '/test-projects/korean-zh'
if os.path.isdir(_zh_dir):
    for _f in sorted(os.listdir(_zh_dir)):
        if _f.endswith('.txt'):
            zh_files[_f] = True

for f in sorted(glob.glob(BASE + '/test-projects/korea-历年真题文本/*.txt')):
    fn = os.path.basename(f)
    if fn in zh_files:
        DOCS.append((G_EXKZ, '【中文】' + kr_label(fn), 'test-projects/korean-zh/' + fn, None))
    else:
        DOCS.append((G_EXK, kr_label(fn), 'test-projects/korea-历年真题文本/' + fn, None))
for f in sorted(glob.glob(BASE + '/test-projects/korea-2025-题面文本/*.txt')):
    fn = os.path.basename(f)
    label = fn.replace('.hwpx.txt','').replace('.hwp.txt','').replace('.txt','')
    zh_name = '2025原件_' + fn
    if zh_name in zh_files:
        DOCS.append((G_EXKZ, '【中文】2025原件 · ' + label[:40], 'test-projects/korean-zh/' + zh_name, None))
    else:
        DOCS.append((G_EXK, '2025原件 · ' + label[:44], 'test-projects/korea-2025-题面文本/' + fn, None))
seen_cn = {}
for f in sorted(glob.glob(BASE + '/test-projects/cn-domestic/*.md')):
    fn = os.path.basename(f)
    if fn.startswith('_'): continue
    title = fn[:-3]
    if len(title) > 44: title = title[:42] + '…'
    if title in seen_cn: continue
    seen_cn[title] = 1
    DOCS.append((G_EXC, title, 'test-projects/cn-domestic/' + fn, None))

GROUPS = [
 (G_SPRINT,'紧急冲刺','#ff453a'),
 (G_T,'保姆级教程','#0a84ff'),
 (G_M,'精通之路','#bf5af2'),
 (G_CS,'计算机母语','#30d158'),
 (G_K,'知识体系','#ffd60a'),
 (G_RM,'机房管理','#5ac8fa'),
 (G_I,'资料索引','#64d2ff'),
 (G_OFF,'官方标准','#ff9f0a'),
 (G_EXL,'世界赛真题','#ff6482'),
 (G_EXKZ,'🇰🇷 韩国真题（中文）','#ff2d55'),
 (G_EXK,'韩国真题（原文对照）','#8e8e93'),
 (G_EXC,'中国国赛真题','#5e5ce6'),
]

# ---- github-repos documents + code files (grouped by repo, embedded) ----
from collections import OrderedDict
repo_map = OrderedDict()

def _add_rel(rel):
    # prefer Chinese translation (github-repos-zh mirror) when available
    if rel.startswith('github-repos/'):
        _zh = 'github-repos-zh/' + rel[len('github-repos/'):]
        if os.path.exists(os.path.join(BASE, _zh)):
            rel = _zh
    parts = rel.split('/')
    if len(parts) < 3: return
    repo_map.setdefault(parts[1], []).append(rel)

for f in sorted(glob.glob(BASE + '/github-repos/**/*.md', recursive=True)):
    try:
        if os.path.getsize(f) <= 300000: _add_rel(os.path.relpath(f, BASE))
    except OSError: pass
for f in sorted(glob.glob(BASE + '/github-repos/**/*.txt', recursive=True)):
    try:
        sz = os.path.getsize(f)
        if 0 < sz <= 100*1024: _add_rel(os.path.relpath(f, BASE))
    except OSError: pass

CODE_EXTS = ('.tf','.sh','.py','.go','.ps1','.yaml','.yml','.json','.js','.ts','.html','.css','.sql',
             '.conf','.c','.h','.java','.cs','.xml','.toml','.scss','.rs','.rb','.php','.pl','.lua',
             '.tmpl','.example','.properties','.cnf','.ini','.service','.repo','.pub','.mk','.tfvars',
             '.hcl','.gradle','.mod','.env','.bak','.sample','.dist')
CODE_NAMES = ('Makefile','Dockerfile','Vagrantfile','Jenkinsfile','Procfile')
LOCK_FILES = {'package-lock.json','yarn.lock','go.sum','composer.lock'}
for root, dirs, files in os.walk(BASE + '/github-repos'):
    dirs[:] = [d for d in dirs if d not in ('.git','node_modules','.terraform')]
    pr = os.path.relpath(root, BASE).split('/')
    if len(pr) < 2: continue
    for fn in files:
        if fn in LOCK_FILES: continue
        low = fn.lower()
        if low.endswith(('.md','.txt')): continue
        if not (any(low.endswith(e) for e in CODE_EXTS) or fn in CODE_NAMES or low.startswith('docker-compose')):
            continue
        _add_rel(os.path.relpath(os.path.join(root, fn), BASE))

for repo in repo_map:
    repo_map[repo] = sorted(set(repo_map[repo]))

for repo, rels in repo_map.items():
    gkey = 'repo_' + re.sub(r'[^a-zA-Z0-9]+', '_', repo)
    gtitle = '📦 ' + repo.replace('-main','')[:30]
    GROUPS.append((gkey, gtitle, '#8e8e93'))
    for rel in rels:
        inner = rel.split('/', 2)[2]
        title = inner if len(inner) <= 52 else inner[:50] + '…'
        DOCS.append((gkey, title, rel, None))

# ---- path map for internal links: normalized rel path -> doc id ----
path_map = {}
for g,t,rel,sub in DOCS:
    did = rel.replace('/','_').replace('.','_')
    path_map[os.path.normpath(rel)] = did

def rewrite_links(html, doc_rel):
    def repl(m):
        href = m.group(1)
        if re.match(r'^(https?:|mailto:|tel:|minis:|javascript:|#)', href):
            return m.group(0)
        target = href.split('#')[0]
        if not target:
            return m.group(0)
        if not (target.endswith('.md') or target.endswith('.html')):
            if '.' not in os.path.basename(target.rstrip('/')):
                folder = os.path.normpath(os.path.join(os.path.dirname(doc_rel), target))
                for g2,t2,rel2,sub2 in DOCS:
                    if os.path.normpath(rel2).startswith(folder.rstrip('/') + '/'):
                        return '<a href="javascript:void(0)" data-doclink="%s" class="inlink"' % path_map[os.path.normpath(rel2)]
            full2 = os.path.normpath(os.path.join(os.path.dirname(doc_rel), target))
            return '<a href="javascript:void(0)" class="deadlink" title="资源/代码文件（资料库内：%s）" ' % full2
        full = os.path.normpath(os.path.join(os.path.dirname(doc_rel), target))
        did = path_map.get(full)
        if did:
            return '<a href="javascript:void(0)" data-doclink="%s" class="inlink"' % did
        else:
            return '<a href="javascript:void(0)" class="deadlink" title="该文件在本资料库中（%s），学习页未收录" ' % full
    return re.sub(r'<a href="([^"]+)"', repl, html)

# ---- embedded images (compressed base64) ----
IMG_CACHE = {}
def _build_img_cache():
    import base64, io
    refs = set()
    srcs = []
    for folder in ('tutorial','mastery','cs-mastery','knowledge','sprint'):
        srcs += glob.glob(BASE + '/' + folder + '/*.md')
    srcs += glob.glob(BASE + '/github-repos/**/*.md', recursive=True)
    for f in srcs:
        try: t = open(f, encoding='utf-8', errors='replace').read()
        except Exception: continue
        rel = os.path.relpath(f, BASE)
        for m in re.finditer(r'!\[[^\]]*\]\(([^)\s]+\.(?:png|jpg|jpeg|gif|svg|webp))', t, re.I):
            refs.add((os.path.dirname(rel), m.group(1)))
        for m in re.finditer(r'<img[^>]+src="([^"]+?\.(?:png|jpg|jpeg|gif|svg|webp))"', t, re.I):
            refs.add((os.path.dirname(rel), m.group(1)))
    for d, r in refs:
        if r.startswith(('http','data:')): continue
        tgt = os.path.normpath(os.path.join(d, r.split('#')[0].split('?')[0]))
        p = os.path.join(BASE, tgt)
        if not os.path.exists(p): continue
        try:
            sz = os.path.getsize(p)
            if sz > 300*1024 or sz == 0: continue
            ext = tgt.rsplit('.',1)[-1].lower()
            if ext in ('jpg','jpeg'):
                from PIL import Image
                im = Image.open(p).convert('RGB')
                buf = io.BytesIO()
                im.save(buf, 'JPEG', quality=72, optimize=True)
                data = buf.getvalue()
                if len(data) >= sz: data = open(p,'rb').read()
                mime = 'image/jpeg'
            elif ext == 'png':
                data = open(p,'rb').read(); mime = 'image/png'
            elif ext == 'svg':
                data = open(p,'rb').read(); mime = 'image/svg+xml'
            elif ext == 'gif':
                data = open(p,'rb').read(); mime = 'image/gif'
            else:
                data = open(p,'rb').read(); mime = 'image/webp'
            IMG_CACHE[tgt] = 'data:%s;base64,%s' % (mime, base64.b64encode(data).decode())
        except Exception:
            pass

def rewrite_images(html, doc_rel):
    def repl(m):
        pre = m.group(1); src = m.group(2)
        if src.startswith(('http','data:')): return m.group(0)
        tgt = os.path.normpath(os.path.join(os.path.dirname(doc_rel), src.split('#')[0].split('?')[0]))
        uri = IMG_CACHE.get(tgt)
        if uri: return '<img%s src="%s"' % (pre, uri)
        return m.group(0)
    return re.sub(r'<img([^>]*?)src="([^"]+)"', repl, html)

def sanitize_html(h):
    # neutralize executable content embedded in docs (script/iframe/etc, event attrs)
    h = re.sub(r'<script\b[\s\S]*?</script>', lambda m: htmlmod.escape(m.group(0)), h, flags=re.I)
    h = re.sub(r'<script\b[^>]*>', lambda m: htmlmod.escape(m.group(0)), h, flags=re.I)
    h = re.sub(r'</script>', '&lt;/script&gt;', h, flags=re.I)
    h = re.sub(r'<iframe\b[\s\S]*?</iframe>', lambda m: htmlmod.escape(m.group(0)), h, flags=re.I)
    h = re.sub(r'<iframe\b[^>]*>', lambda m: htmlmod.escape(m.group(0)), h, flags=re.I)
    h = re.sub(r'<(object|embed|form|base)\b[^>]*>', lambda m: htmlmod.escape(m.group(0)), h, flags=re.I)
    h = re.sub(r'\son(click|error|load|mouseover|focus|submit|change|input|keydown|keyup|dblclick)\s*=', ' data-ev=', h, flags=re.I)
    return h

_build_img_cache()
print('images embedded:', len(IMG_CACHE))

docs_js = {}
nav_groups = []
for gkey, gtitle, gcolor in GROUPS:
    items = []
    for g,t,rel,sub in DOCS:
        if g != gkey: continue
        p = os.path.join(BASE, rel)
        if not os.path.exists(p):
            print('MISS', rel); continue
        try:
            size = os.path.getsize(p)
        except OSError:
            continue
        if rel.endswith('.md'):
            raw = open(p, encoding='utf-8', errors='replace').read()
            html = markdown.markdown(raw, extensions=['tables','fenced_code'])
            html = rewrite_links(html, rel)
            html = sanitize_html(html)
            html = rewrite_images(html, rel)
            words = len(raw)
        elif size > 100*1024:
            html = ('<p>📦 <b>大文件未嵌入学习页</b>（%.1f MB）。完整文件在资料库中：<code>%s</code></p>'
                    '<p style="color:var(--dim)">可用文件管理器（或电脑）打开查看。</p>' % (size/1048576, rel))
            words = 100
        else:
            raw = open(p, encoding='utf-8', errors='replace').read()
            html = '<pre class="rawtext">' + htmlmod.escape(raw) + '</pre>'
            words = len(raw)
        mins = max(3, round(words/400))
        did = rel.replace('/','_').replace('.','_')
        docs_js[did] = {'t': t, 'g': gtitle, 'gk': gkey, 'html': html, 'm': mins, 'c': gcolor}
        items.append((did, t, mins))
    if items:
        nav_groups.append((gkey, gtitle, gcolor, items))

nav_html = []
for gkey, gtitle, gcolor, items in nav_groups:
    lis = ''.join(
        f'<button class="nav-item" data-doc="{did}"><span class="dot" style="background:{gcolor}"></span>{t}<em>{m}min</em></button>'
        for did, t, m in items)
    nav_html.append(f'''<div class="nav-group closed" data-g="{gkey}">
  <button class="group-head" onclick="toggleGroup(this)"><span class="g-dot" style="background:{gcolor}"></span>{gtitle}<span class="cnt">{len(items)}</span><svg viewBox="0 0 24 24" class="chev"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
  <div class="group-body" data-built="0"></div>
</div>''')

total_docs = len(docs_js)

# ---- home overview doc ----
home_cards = []
for gkey, gtitle, gcolor, items in nav_groups:
    first_id = items[0][0]
    cnt = len(items)
    home_cards.append(
        '<button class="home-card" data-doclink="%s"><span class="hc-dot" style="background:%s"></span>'
        '<b>%s</b><span class="hc-count">%d 篇</span></button>' % (first_id, gcolor, gtitle, cnt))
home_html = (
    '<p style="color:var(--dim)">共 <b>%d</b> 篇 · %d 个分组 · 点击任意分组进入，或使用顶部搜索框（支持全文搜索）</p>'
    '<div id="grow-slot"></div>'
    '<div id="continue-slot"></div>'
    '<div id="recent-slot"></div>'
    '<div class="home-grid">%s</div>'
    '<h3>🚀 快速开始</h3>'
    '<div class="home-quick">'
    '<button class="home-card small" data-doclink="tutorial_README-教程总览_md"><b>📖 从教程总览开始</b></button>'
    '<button class="home-card small" data-doclink="sprint_00-72小时冲刺作战手册_md"><b>⚡ 紧急冲刺手册</b></button>'
    '<button class="home-card small" data-doclink="test-projects_INDEX_md"><b>📋 赛题目录</b></button>'
    '<button class="home-card small" data-doclink="mastery_00-总纲-像说话一样掌握云计算_md"><b>🧠 精通之路总纲</b></button>'
    '<button class="home-card small" data-doclink="room_00-总纲-从零到极致的机房之路_md"><b>🏭 机房管理 · 从零到极致</b></button>'
    '</div>') % (total_docs, len(nav_groups), ''.join(home_cards))

docs_js = {'__home__': {'t': '🏠 全部内容总览', 'g': '主页', 'html': home_html, 'm': 2, 'c': '#0a84ff'}, **docs_js}

page = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#050508">
<title>云计算 · 母语学习中心</title>
<style>
:root {{
  --bg:#050508;
  --text:#f5f5f7;
  --dim:rgba(245,245,247,.62);
  --dim2:rgba(245,245,247,.4);
  --glass:rgba(255,255,255,.075);
  --glass2:rgba(255,255,255,.11);
  --line:rgba(255,255,255,.14);
  --line2:rgba(255,255,255,.08);
  --hl:rgba(255,255,255,.32);
  --blue:#0a84ff;
  --radius:22px;
  --fs:16px;
}}
*{{box-sizing:border-box;-webkit-tap-highlight-color:transparent}}
html,body{{margin:0;padding:0}}
body{{
  background:var(--bg); color:var(--text);
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","PingFang SC","HarmonyOS Sans SC","Noto Sans SC",sans-serif;
  font-size:var(--fs); line-height:1.78;
  -webkit-font-smoothing:antialiased;
  overflow-x:hidden;
}}

/* ---------- aurora background ---------- */
.aurora{{position:fixed;inset:-20%;z-index:0;pointer-events:none;
  background:
    radial-gradient(38% 44% at 18% 16%, rgba(94,92,230,.42), transparent 62%),
    radial-gradient(40% 48% at 82% 12%, rgba(255,55,95,.26), transparent 62%),
    radial-gradient(46% 54% at 76% 78%, rgba(10,132,255,.34), transparent 66%),
    radial-gradient(36% 44% at 12% 84%, rgba(48,209,88,.20), transparent 62%),
    radial-gradient(30% 36% at 50% 50%, rgba(191,90,242,.14), transparent 60%);
  filter:blur(52px) saturate(150%);
  animation:aur 36s ease-in-out infinite alternate;
}}
@keyframes aur {{
  0%{{transform:translate3d(-2%,-2%,0) scale(1)}}
  50%{{transform:translate3d(3%,2%,0) scale(1.06)}}
  100%{{transform:translate3d(-1%,3%,0) scale(1.02)}}
}}

/* ---------- glass primitives ---------- */
button,.nav-item,.group-head,.home-card,.dn-btn,.sr-item,.tool-btn,a{{touch-action:manipulation;-webkit-tap-highlight-color:transparent}}
button:focus{{outline:none}}
button:focus-visible{{outline:2px solid #6cb2ff;outline-offset:2px}}
.tool-btn:active{{transform:scale(.86);background:rgba(255,255,255,.22);transition-duration:.05s}}
.group-head:active{{background:rgba(255,255,255,.1)}}
.sr-item:active{{background:rgba(255,255,255,.15)}}
#toTop:active,#tocBtn:active{{transform:scale(.88)}}
#toTop,#tocBtn{{transition:transform .18s cubic-bezier(.34,1.56,.64,1),opacity .2s}}
.glass{{
  background:linear-gradient(150deg, rgba(255,255,255,.11), rgba(255,255,255,.05));
  border:1px solid var(--line);
  box-shadow:0 10px 40px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.28), inset 0 -1px 0 rgba(255,255,255,.04);
}}

/* ---------- layout ---------- */
.app{{position:relative;display:flex;min-height:100vh}}
.side{{
  position:sticky;top:0;height:100vh;width:296px;flex:0 0 296px;
  padding:14px;display:flex;flex-direction:column;gap:12px;
  transition:none;
}}
.side .panel{{border-radius:26px;flex:1;display:flex;flex-direction:column;overflow:hidden;
  background:linear-gradient(160deg, rgba(38,40,56,.92), rgba(16,18,28,.92));
  border:1px solid var(--line);
  box-shadow:0 16px 50px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.22);
}}
.brand{{padding:18px 18px 12px;display:flex;align-items:center;gap:10px}}
.brand .logo{{width:34px;height:34px;border-radius:11px;flex:0 0 34px;
  background:conic-gradient(from 210deg,#0a84ff,#bf5af2,#ff375f,#ffd60a,#30d158,#0a84ff);
  box-shadow:0 4px 14px rgba(10,132,255,.5), inset 0 1px 0 rgba(255,255,255,.5);
}}
.brand h1{{font-size:15px;margin:0;font-weight:700;letter-spacing:.2px}}
.brand p{{margin:0;font-size:11px;color:var(--dim2)}}

.search{{margin:2px 14px 8px;display:flex;align-items:center;gap:8px;
  background:rgba(255,255,255,.07);border:1px solid var(--line2);border-radius:14px;padding:8px 12px}}
.search input{{flex:1;background:none;border:none;outline:none;color:var(--text);font-size:13.5px}}
.search input::placeholder{{color:var(--dim2)}}
.search svg{{width:15px;height:15px;color:var(--dim2);flex:0 0 15px}}

.nav{{overflow-y:auto;padding:4px 10px 18px;flex:1;overscroll-behavior:contain}}
.nav::-webkit-scrollbar{{width:5px}}
.nav::-webkit-scrollbar-thumb{{background:rgba(255,255,255,.16);border-radius:3px}}
.nav-group{{margin-bottom:6px}}
.group-head{{width:100%;display:flex;align-items:center;gap:8px;background:none;border:none;color:var(--dim);
  font-size:12px;font-weight:700;letter-spacing:.6px;padding:9px 8px;cursor:pointer;border-radius:12px}}
.group-head:hover{{background:rgba(255,255,255,.05)}}
.g-dot{{width:8px;height:8px;border-radius:50%;box-shadow:0 0 10px currentColor}}
.chev{{width:14px;height:14px;margin-left:6px;transition:transform .3s}}
.nav-group.closed .chev{{transform:rotate(-90deg)}}
.nav-group.closed .group-body{{display:none}}
.nav-item{{width:100%;display:flex;align-items:center;gap:9px;background:none;border:none;color:var(--dim);
  font-size:13.5px;text-align:left;padding:8px 10px 8px 12px;border-radius:13px;cursor:pointer;
  position:relative;overflow:hidden;}}
.nav-item .dot{{width:6px;height:6px;border-radius:50%;flex:0 0 6px;opacity:.9}}
.nav-item em{{margin-left:auto;font-style:normal;font-size:10.5px;color:var(--dim2);flex:0 0 auto}}
.nav-item:hover{{background:rgba(255,255,255,.07);color:var(--text);transform:translateX(2px)}}
.nav-item.active{{background:linear-gradient(140deg, rgba(10,132,255,.36), rgba(10,132,255,.16));
  color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.3), 0 4px 16px rgba(10,132,255,.25);
  border:1px solid rgba(120,180,255,.35);}}
.nav-item.active em{{color:rgba(255,255,255,.75)}}
.nav-item.hidden{{display:none}}

/* ---------- main ---------- */
.main{{flex:1;min-width:0;padding:14px 14px 90px;max-width:1020px;margin:0 auto;width:100%}}
.topbar{{position:sticky;top:10px;z-index:30;display:flex;align-items:center;gap:10px;
  border-radius:20px;padding:10px 12px;margin-bottom:14px;
  background:linear-gradient(150deg, rgba(42,44,60,.90), rgba(20,22,32,.90));
  border:1px solid var(--line);
  box-shadow:0 10px 34px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.26);}}
.menu-btn{{display:none;position:fixed;top:calc(16px + env(safe-area-inset-top,0px));left:14px;z-index:70;
  width:42px;height:42px;border-radius:14px;border:1px solid var(--line2);
  background:rgba(44,46,62,.94);color:var(--text);cursor:pointer;align-items:center;justify-content:center;
  transition:transform .18s cubic-bezier(.34,1.56,.64,1),background .2s;
  touch-action:manipulation;-webkit-tap-highlight-color:transparent;
  box-shadow:0 6px 20px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.22)}}
body.drawer-open .menu-btn{{background:rgba(64,67,92,.96)}}
.menu-btn:active{{transform:scale(.86);background:rgba(255,255,255,.22);transition-duration:.05s}}
.bars{{display:flex;flex-direction:column;gap:4px;align-items:center;justify-content:center}}
.bars i{{display:block;width:18px;height:2px;border-radius:2px;background:currentColor;
  transition:transform .3s cubic-bezier(.22,.61,.36,1),opacity .18s;transform-origin:center}}
body.drawer-open .menu-btn .bars i:nth-child(1){{transform:translateY(6px) rotate(45deg)}}
body.drawer-open .menu-btn .bars i:nth-child(2){{opacity:0}}
body.drawer-open .menu-btn .bars i:nth-child(3){{transform:translateY(-6px) rotate(-45deg)}}
.crumb{{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}}
.crumb b{{font-size:14.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.crumb span{{font-size:11px;color:var(--dim2)}}
.tools{{display:flex;align-items:center;gap:7px;flex:0 0 auto}}
.tool-btn{{width:34px;height:34px;border-radius:12px;border:1px solid var(--line2);background:rgba(255,255,255,.08);
  color:var(--text);cursor:pointer;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;
  transition:transform .18s cubic-bezier(.34,1.56,.64,1), background .2s}}
.tool-btn:hover{{background:rgba(255,255,255,.16)}}
.tool-btn:active{{transform:scale(.9)}}
.pill{{font-size:11px;color:var(--dim);padding:5px 10px;border-radius:999px;border:1px solid var(--line2);
  background:rgba(255,255,255,.05);white-space:nowrap}}

.progress-track{{position:fixed;top:0;left:0;right:0;height:3px;z-index:100;background:transparent;pointer-events:none}}
.progress-bar{{height:100%;width:0;background:linear-gradient(90deg,#0a84ff,#bf5af2,#ff375f);border-radius:0 3px 3px 0;
  box-shadow:0 0 12px rgba(10,132,255,.8);transition:width .1s linear}}

.card{{border-radius:24px;padding:26px 26px 34px;position:relative;max-width:100%;overflow:hidden;
  background:linear-gradient(165deg, rgba(30,32,46,.86), rgba(12,14,22,.88));
  border:1px solid var(--line);
  box-shadow:0 18px 60px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.22);}}
.card-head{{display:flex;align-items:center;gap:10px;margin-bottom:6px}}
.card-head .hbar{{width:4px;height:22px;border-radius:2px;background:var(--vc,#0a84ff);box-shadow:0 0 12px var(--vc,#0a84ff)}}
.card-head h2{{margin:0;font-size:20px;font-weight:800;letter-spacing:.2px}}
.card-head .meta{{font-size:11.5px;color:var(--dim2);margin-left:auto;white-space:nowrap}}
.card-in{{animation:fadeUp .3s ease}}
@keyframes fadeUp{{from{{opacity:.35}}to{{opacity:1}}}}

/* ---------- markdown styles ---------- */
.md h1{{font-size:26px;font-weight:800;letter-spacing:.3px;margin:8px 0 18px;line-height:1.35}}
.md h2{{font-size:19.5px;font-weight:750;margin:34px 0 12px;color:#fff;line-height:1.4;
  padding-left:12px;border-left:3px solid var(--vc,#0a84ff)}}
.md h3{{font-size:16.5px;font-weight:700;margin:24px 0 8px;color:#dce8ff}}
.md h4{{font-size:15px;font-weight:700;margin:18px 0 6px;color:var(--dim)}}
.md p{{margin:10px 0}}
.md p,.md li,.md td,.md th,.md h1,.md h2,.md h3,.md h4,.md blockquote,.md summary,.md a{{overflow-wrap:anywhere;word-break:break-word}}
.md a{{color:#6cb2ff;text-decoration:none;border-bottom:1px solid rgba(108,178,255,.35);cursor:pointer}}
.md a.deadlink{{color:rgba(245,245,247,.4);border-bottom:1px dashed rgba(245,245,247,.25);cursor:not-allowed}}
.md a.inlink{{color:#7cc0ff}}
.md a.inlink::after{{content:" ↗";font-size:.8em;opacity:.7}}
.md strong{{color:#fff}}
.md code{{font-family:"SF Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  background:rgba(120,170,255,.13);border:1px solid rgba(120,170,255,.2);
  padding:1.5px 6px;border-radius:7px;font-size:.86em;color:#a8ccff}}
.md pre{{background:rgba(0,0,0,.42);border:1px solid rgba(255,255,255,.12);border-radius:16px;
  padding:16px 18px;overflow-x:auto;margin:14px 0;max-width:100%;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.07), 0 6px 20px rgba(0,0,0,.3)}}
.md pre code{{background:none;border:none;padding:0;color:#e8eefc;font-size:13px;line-height:1.75}}
.md table{{border-collapse:separate;border-spacing:0;width:100%;font-size:13.5px;display:block;overflow-x:auto;
  border:1px solid var(--line2);border-radius:14px;margin:14px 0}}
.md th,.md td{{border-bottom:1px solid var(--line2);padding:9px 13px;text-align:left;white-space:nowrap}}
.md th{{background:rgba(255,255,255,.07);font-weight:700}}
.md tr:last-child td{{border-bottom:none}}
.md blockquote{{margin:14px 0;padding:12px 18px;border-left:3px solid var(--vc,#0a84ff);
  background:linear-gradient(90deg, rgba(10,132,255,.13), rgba(10,132,255,.03));border-radius:0 14px 14px 0;color:#dce6f5}}
.md ul,.md ol{{padding-left:22px;margin:10px 0}}
.md li{{margin:5px 0}}
.md hr{{border:none;border-top:1px solid var(--line2);margin:30px 0}}
.md input[type=checkbox]{{margin-right:7px;accent-color:#0a84ff;transform:translateY(1px)}}
.md details{{background:rgba(255,255,255,.05);border:1px solid var(--line2);border-radius:14px;padding:10px 16px;margin:12px 0}}
.md summary{{cursor:pointer;font-weight:700;color:#9dc4ff}}
.md img{{max-width:100%;border-radius:14px}}
.rawtext{{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-all;font-family:"SF Mono",ui-monospace,Menlo,Consolas,monospace;
  font-size:12.5px;line-height:1.7;color:#dbe4f5;margin:0;max-width:100%}}
.nav-group .group-head .cnt{{margin-left:auto;font-size:10px;color:var(--dim2);background:rgba(255,255,255,.08);padding:1px 7px;border-radius:99px}}
.results{{display:none;margin:0 14px 8px;max-height:46vh;overflow-y:auto;background:rgba(20,22,34,.97);border:1px solid var(--line);border-radius:16px;padding:6px}}
.sr-item{{display:block;width:100%;text-align:left;background:none;border:none;color:var(--text);font-size:13px;padding:8px 10px;border-radius:10px;cursor:pointer}}
.sr-item em{{display:block;font-style:normal;font-size:10.5px;color:var(--dim2);margin-top:1px}}
.sr-item:hover{{background:rgba(255,255,255,.08)}}
.sr-empty{{padding:10px;color:var(--dim2);font-size:12.5px}}
.home-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(46%,1fr));gap:10px;margin:16px 0}}
.home-card{{position:relative;display:flex;flex-direction:column;gap:6px;align-items:flex-start;background:linear-gradient(150deg,rgba(255,255,255,.10),rgba(255,255,255,.04));border:1px solid var(--line);border-radius:18px;padding:14px;color:var(--text);font-size:13.5px;cursor:pointer;text-align:left;transition:transform .25s cubic-bezier(.34,1.56,.64,1),background .25s;overflow:hidden}}
.home-card:hover{{transform:translateY(-3px);background:linear-gradient(150deg,rgba(255,255,255,.16),rgba(255,255,255,.06))}}
.home-card:active{{transform:scale(.97)}}
.home-card b{{font-size:13.5px;font-weight:700;line-height:1.4}}
.home-card .hc-dot{{width:10px;height:10px;border-radius:50%;box-shadow:0 0 10px currentColor;flex:0 0 10px}}
.home-card .hc-count{{font-size:11px;color:var(--dim2)}}
.home-card.small{{flex-direction:row;align-items:center;gap:8px;padding:12px 14px;font-size:13px}}
.home-quick{{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}}
#continue-slot{{margin:10px 0}}
#continue-slot .home-card{{border-color:rgba(120,180,255,.4)}}
#toTop{{position:fixed;right:16px;bottom:22px;width:46px;height:46px;border-radius:50%;display:none;align-items:center;justify-content:center;font-size:18px;color:#fff;cursor:pointer;background:linear-gradient(150deg,rgba(60,63,86,.95),rgba(28,30,44,.95));border:1px solid var(--line);box-shadow:0 10px 30px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.25);z-index:50}}

.overlay{{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:40;opacity:0;pointer-events:none;transition:opacity .3s}}
.overlay.show{{opacity:1;pointer-events:auto}}

@media (max-width:900px) {{
  .menu-btn{{display:flex}}
  .topbar{{padding-left:64px}}
  .side{{position:fixed;left:-360px;top:0;z-index:60;width:min(84vw,320px);flex-basis:auto}}
  .side .panel{{background:linear-gradient(165deg, rgba(36,38,54,.98), rgba(13,15,23,.98))}}
  /* .side.open left handled by JS (slideSide) */
  .menu-btn{{display:flex}}
  .main{{padding:10px 10px 80px}}
  .card{{padding:18px 16px 30px;border-radius:20px}}
  .topbar{{top:8px;border-radius:18px}}
  .md h1{{font-size:22px}}
  .md h2{{font-size:17.5px}}
}}
.foot{{text-align:center;color:var(--dim2);font-size:11.5px;padding:26px 0 10px}}
/* ===== growth system ===== */
.grow-card{{background:linear-gradient(150deg,rgba(255,214,10,.10),rgba(191,90,242,.08));border:1px solid rgba(255,214,10,.28);border-radius:20px;padding:16px 18px;margin:14px 0}}
.grow-top{{display:flex;align-items:baseline;gap:10px}}
.grow-lv{{font-size:19px;font-weight:800;color:#ffd60a}}
.grow-streak{{margin-left:auto;font-size:13px;color:#ff9f0a;font-weight:700}}
.grow-bar{{height:10px;border-radius:6px;background:rgba(255,255,255,.1);margin:10px 0 6px;overflow:hidden}}
.grow-bar i{{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#0a84ff,#bf5af2);width:0;transition:width .5s ease}}
.grow-meta{{font-size:11.5px;color:var(--dim2)}}
.badges{{margin-top:9px;font-size:17px;letter-spacing:3px}}
.badges .off{{opacity:.22}}
#xpFloat{{position:fixed;top:64px;right:16px;z-index:120;pointer-events:none;font-weight:800;color:#7ef0c0;font-size:15px;opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s}}
#xpFloat.on{{opacity:1;transform:translateY(-14px)}}
#celebrate{{position:fixed;inset:0;z-index:150;display:none;align-items:center;justify-content:center;background:rgba(10,12,22,.55)}}
.celebrate-card{{background:linear-gradient(160deg,rgba(38,40,58,.98),rgba(20,22,34,.98));border:1px solid rgba(255,214,10,.5);border-radius:24px;padding:28px 40px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.6),0 0 60px rgba(255,214,10,.22)}}
.celebrate-card .big{{font-size:42px}}
.celebrate-card h3{{color:#ffd60a;margin:10px 0 4px;font-size:17px}}
.celebrate-card p{{color:var(--dim);margin:4px 0 0;font-size:13px}}
/* ===== quiz ===== */
#quizView{{position:fixed;inset:0;z-index:160;background:#050508;display:none;flex-direction:column}}
#quizView.on{{display:flex}}
.quiz-head{{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line);background:rgba(20,22,34,.92)}}
.quiz-body{{flex:1;overflow-y:auto;padding:18px 16px 70px;max-width:640px;margin:0 auto;width:100%}}
.qz-item{{background:linear-gradient(165deg,rgba(30,32,46,.9),rgba(14,16,24,.92));border:1px solid var(--line);border-radius:18px;padding:18px;margin-bottom:14px}}
.qz-item h4{{margin:0 0 6px;font-size:15px;line-height:1.6}}
.qz-opt{{display:block;width:100%;text-align:left;background:rgba(255,255,255,.06);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:8px 0;color:var(--text);font-size:14px;cursor:pointer}}
.qz-opt.right{{background:rgba(48,209,88,.22);border-color:#30d158}}
.qz-opt.wrong{{background:rgba(255,69,58,.22);border-color:#ff453a}}
.qz-exp{{font-size:12.5px;color:var(--dim);margin-top:8px;display:none;line-height:1.7}}
.qz-btn{{display:inline-block;background:linear-gradient(150deg,#0a84ff,#0064d0);border:none;border-radius:12px;color:#fff;font-size:13.5px;font-weight:700;padding:11px 18px;margin-top:10px;cursor:pointer}}
.qz-btn.sm{{padding:7px 14px;font-size:12.5px;margin:0}}
.qz-btn:active{{transform:scale(.96)}}
/* ===== lab & sim ===== */
.lab-card{{background:rgba(255,255,255,.045);border:1px solid var(--line);border-radius:13px;padding:11px 13px;margin:8px 0;cursor:pointer}}
.lab-card.labdone{{background:rgba(48,209,88,.10);border-color:rgba(48,209,88,.45)}}
#restView{{position:fixed;inset:0;z-index:170;display:none;align-items:center;justify-content:center;background:rgba(10,12,22,.75)}}
#restView.on{{display:flex}}
#boot{{position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#050508;transition:opacity .45s}}
#boot p{{margin:0;color:var(--dim);font-size:14px}}
#boot small{{color:var(--dim2);font-size:11.5px}}
.boot-ring{{width:54px;height:54px;border-radius:50%;border:3px solid rgba(255,255,255,.12);border-top-color:#0a84ff;animation:spin 1s linear infinite}}
@keyframes spin{{to{{transform:rotate(360deg)}}}}
.docnav{{display:flex;gap:8px;margin-top:28px;padding-top:18px;border-top:1px solid var(--line2)}}
.dn-btn{{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;background:linear-gradient(150deg,rgba(255,255,255,.09),rgba(255,255,255,.04));border:1px solid var(--line);border-radius:14px;color:var(--text);font-size:12.5px;padding:11px 10px;cursor:pointer;transition:transform .2s,background .2s;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;text-align:center}}
.dn-btn:hover{{background:rgba(255,255,255,.14)}}
.dn-btn:active{{transform:scale(.97)}}
.dn-btn.home{{flex:0 0 54px}}
#tocBtn{{position:fixed;right:16px;bottom:84px;width:46px;height:46px;border-radius:50%;display:none;align-items:center;justify-content:center;font-size:17px;color:#fff;cursor:pointer;background:linear-gradient(150deg,rgba(60,63,86,.95),rgba(28,30,44,.95));border:1px solid var(--line);box-shadow:0 10px 30px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.25);z-index:50}}
#tocPanel{{position:fixed;right:16px;bottom:140px;width:min(78vw,320px);max-height:56vh;overflow-y:auto;display:none;z-index:51;border-radius:18px;padding:10px;background:rgba(22,24,36,.97);border:1px solid var(--line);box-shadow:0 14px 44px rgba(0,0,0,.55)}}
#tocPanel button{{display:block;width:100%;text-align:left;background:none;border:none;color:var(--text);font-size:12.5px;padding:7px 9px;border-radius:10px;cursor:pointer}}
#tocPanel button:hover{{background:rgba(255,255,255,.08)}}
#tocPanel button.lv3{{padding-left:22px;color:var(--dim);font-size:12px}}
#results mark{{background:rgba(255,214,10,.32);color:#fff;border-radius:3px;padding:0 2px}}
.nav-item.read::after{{content:'✓';font-size:10px;color:#30d158;margin-left:5px;flex:0 0 auto}}
/* item animations removed: this WebView's compositor can freeze transform/opacity animations */
</style>
</head>
<body>
<div id="boot"><div class="boot-ring"></div><p>正在载入 {total_docs} 篇资料…</p><small>首次打开需要几秒，之后就很快了</small></div>
<div class="aurora"></div>
<div class="progress-track"><div class="progress-bar" id="pbar"></div></div>
<div class="overlay" id="ovl" onclick="closeDrawer()"></div>

<button class="menu-btn" onclick="toggleDrawer()" aria-label="菜单"><span class="bars"><i></i><i></i><i></i></span></button>
<div class="app">
  <aside class="side" id="side">
    <div class="panel">
      <div class="brand">
        <div class="logo"></div>
        <div><h1>云计算 · 母语学习中心</h1><p>{total_docs} 篇资料 · 云 + 计算机科学</p></div>
      </div>
      <div class="search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        <input id="q" placeholder="搜索标题 / 全文…" oninput="smartSearch(this.value)" onfocus="showRecent()">
      </div>
      <div class="results" id="results"></div>
      <nav class="nav" id="nav">
        {''.join(nav_html)}
      </nav>
    </div>
  </aside>

  <main class="main">
    <div class="topbar">

      <div class="crumb" onclick="show('__home__')" style="cursor:pointer" title="回到首页"><b id="cr-title">载入中…</b><span id="cr-sub"></span></div>
      <div class="tools">
        <button class="tool-btn" onclick="quickSearch()" title="搜索">🔍</button>
        <button class="tool-btn" onclick="fontStep(-1)" title="缩小字号">A-</button>
        <button class="tool-btn" onclick="fontStep(1)" title="放大字号">A+</button>
      </div>
    </div>
    <div class="card glass" id="card">
      <div class="card-head"><div class="hbar" id="hbar"></div><h2 id="doc-title">云计算 · 母语学习中心</h2><span class="meta" id="doc-meta"></span></div>
      <article class="md card-in" id="content">正在加载…</article>
      <div class="docnav" id="docnav"></div>
    </div>
    <div class="foot">本地离线资料 · 液态玻璃版 · 阅读进度自动记忆</div>
  </main>
</div>

<script>
const DOCS = {json.dumps(docs_js, ensure_ascii=False)};
const ORDER=Object.keys(DOCS).filter(function(k){{return k!=='__home__';}});
const BY_KEY={{}};
Object.keys(DOCS).forEach(function(k){{ if(k==='__home__')return; const d=DOCS[k]; if(d.gk){{ (BY_KEY[d.gk]=BY_KEY[d.gk]||[]).push(k); }} }});
const LS_DOC='wg.lastDoc', LS_FS='wg.fontSize';
const content=document.getElementById('content');
let current=null;

function show(id, push){{
  if(!DOCS[id]) return;
  current=id;
  const d=DOCS[id];
  content.classList.remove('card-in');
  void content.offsetWidth;
  content.innerHTML=d.html;
  content.classList.add('card-in');
  document.getElementById('doc-title').textContent=d.t;
  document.getElementById('cr-title').textContent=d.t;
  document.getElementById('cr-sub').textContent=d.g + ' · 约 '+d.m+' 分钟';
  document.getElementById('doc-meta').textContent='≈'+d.m+' min';
  document.getElementById('hbar').style.background=d.c;
  document.getElementById('hbar').style.setProperty('--vc',d.c);
  document.documentElement.style.setProperty('--vc',d.c);
  resetSearch();
  revealInNav(id);
  if(id!=='__home__') localStorage.setItem(LS_DOC,id);
  renderBottomNav(id);
  markRead(id);
  buildToc();
  if(id==='__home__') fillHome();
  const posMap=JSON.parse(localStorage.getItem('wg.pos')||'{{}}');
  const yy=(id!=='__home__') ? (posMap[id]||0) : 0;
  setTimeout(function(){{ try{{ window.scrollTo(0,yy); }}catch(e){{}} }}, 80);
  if(window.innerWidth<=900) closeDrawer();
}}
function renderBottomNav(id){{
  const el=document.getElementById('docnav'); if(!el) return;
  if(id==='__home__'){{ el.style.display='none'; return; }}
  const i=ORDER.indexOf(id);
  const prev=i>0?ORDER[i-1]:null, next=(i>=0&&i<ORDER.length-1)?ORDER[i+1]:null;
  const cut=function(s){{ return s.length>16 ? s.slice(0,15)+'…' : s; }};
  let extra='';
  try{{
    const ks=Object.keys(QUIZ_BANK||{{}});
    for(let x=0;x<ks.length;x++){{
      if(id.indexOf(ks[x])===0){{ extra='<button class="dn-btn" data-quiz="'+ks[x]+'" style="flex:0 0 auto;padding:11px 13px">📝 测验</button>'; break; }}
    }}
  }}catch(e){{}}
  el.innerHTML = (prev?'<button class="dn-btn" data-doclink="'+prev+'">← '+cut(DOCS[prev].t)+'</button>':'<span style="flex:1"></span>')
   + '<button class="dn-btn home" data-doclink="__home__">🏠</button>'
   + (next?'<button class="dn-btn" data-doclink="'+next+'">'+cut(DOCS[next].t)+' →</button>':'<span style="flex:1"></span>')
   + extra;
  el.style.display='flex';
}}
/* ===== Growth system (gamification) ===== */
const LEVELS=[
  {{n:1,t:'见习云工',min:0}},
  {{n:2,t:'云学徒',min:100}},
  {{n:3,t:'云行者',min:300}},
  {{n:4,t:'云骑士',min:600}},
  {{n:5,t:'云专家',min:1000}},
  {{n:6,t:'云大师',min:2000}},
  {{n:7,t:'云传奇',min:4000}}
];
const BADGES=[
  {{id:'first',e:'🌱',n:'启程',d:'首次打开学习中心'}},
  {{id:'r1',e:'👣',n:'第一步',d:'阅读第 1 篇资料'}},
  {{id:'r10',e:'🔟',n:'十篇斩',d:'阅读 10 篇资料'}},
  {{id:'r50',e:'🏅',n:'半百',d:'阅读 50 篇资料'}},
  {{id:'r100',e:'💯',n:'百篇斩',d:'阅读 100 篇资料'}},
  {{id:'s3',e:'🔥',n:'三日之约',d:'连续学习 3 天'}},
  {{id:'s7',e:'⚡',n:'一周不辍',d:'连续学习 7 天'}},
  {{id:'s30',e:'👑',n:'月度自律',d:'连续学习 30 天'}},
  {{id:'exam5',e:'🏆',n:'真题猎人',d:'阅读 5 篇真题'}},
  {{id:'kr10',e:'🚀',n:'韩语征服者',d:'阅读 10 篇韩国真题'}},
  {{id:'tut16',e:'📖',n:'教程通关',d:'读完教程全部 17 章'}},
  {{id:'quiz1',e:'📝',n:'初试身手',d:'完成第一次测验'}},
  {{id:'perfect',e:'💮',n:'满分学霸',d:'测验拿到满分'}},
  {{id:'qmaster',e:'🎓',n:'考神',d:'累计完成 10 次测验'}},
  {{id:'lab1',e:'⚒',n:'首次动手',d:'完成第 1 个实操任务'}},
  {{id:'lab10',e:'🛠',n:'动手达人',d:'完成 10 个实操任务'}},
  {{id:'sim1',e:'🏟',n:'沙场初体验',d:'完成 1 次世赛模拟'}}
];
function loadGrow(){{
  try{{ const g=JSON.parse(localStorage.getItem('wg.grow')||'null'); if(g) return g; }}catch(e){{}}
  return {{xp:0,streak:0,last:'',badges:[],reads:0,exam:0,kr:0,tut:{{}}}};
}}
let GROW=loadGrow();
function saveGrow(){{ try{{ localStorage.setItem('wg.grow',JSON.stringify(GROW)); }}catch(e){{}} }}
function levelOf(xp){{ let L=LEVELS[0]; for(let i=0;i<LEVELS.length;i++){{ if(xp>=LEVELS[i].min) L=LEVELS[i]; }} return L; }}
function nextLevel(){{ for(let i=0;i<LEVELS.length;i++){{ if(GROW.xp<LEVELS[i].min) return LEVELS[i]; }} return null; }}
function dayStr(offset){{
  const d=new Date(); d.setDate(d.getDate()+(offset||0));
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}}
function xpFloat(txt){{
  const el=document.getElementById('xpFloat'); if(!el) return;
  el.textContent=txt; el.classList.add('on');
  setTimeout(function(){{ el.classList.remove('on'); }}, 1400);
}}
function celebrate(html){{
  const cv=document.getElementById('celebrate'); if(!cv) return;
  document.getElementById('celebrateCard').innerHTML=html;
  cv.style.display='flex';
  if(navigator.vibrate){{ try{{navigator.vibrate([30,60,30]);}}catch(e){{}} }}
  setTimeout(function(){{ cv.style.display='none'; }}, 1900);
}}
function unlockBadge(id){{
  if(GROW.badges.indexOf(id)>=0) return;
  GROW.badges.push(id);
  GROW.xp+=50;
  saveGrow();
  var found=null;
  for(let i=0;i<BADGES.length;i++){{ if(BADGES[i].id===id) found=BADGES[i]; }}
  if(found){{
    setTimeout(function(){{
      celebrate('<div class="big">'+found.e+'</div><h3>成就解锁 · '+found.n+'</h3><p>'+found.d+'　+50 XP</p>');
    }}, 500);
  }}
}}
function addXP(n,label,silent){{
  const before=levelOf(GROW.xp).n;
  GROW.xp+=n;
  const after=levelOf(GROW.xp);
  saveGrow();
  if(!silent) xpFloat('+'+n+' XP'+(label?' · '+label:''));
  if(after.n>before){{
    setTimeout(function(){{
      celebrate('<div class="big">🎉</div><h3>升级！Lv.'+after.n+' '+after.t+'</h3><p>累计 '+GROW.xp+' XP · 继续加油</p>');
    }}, 900);
  }}
}}
function checkStreak(){{
  const t=dayStr(0);
  if(GROW.last===t) return;
  GROW.streak=(GROW.last===dayStr(-1))?GROW.streak+1:1;
  GROW.last=t;
  addXP(20,'每日打卡');
  if(GROW.streak>=3) unlockBadge('s3');
  if(GROW.streak>=7) unlockBadge('s7');
  if(GROW.streak>=30) unlockBadge('s30');
  saveGrow();
}}
function growthOnRead(id,isNew){{
  if(!id||id==='__home__') return;
  if(isNew){{
    let gain=15;
    if(id.indexOf('korea')>=0||id.indexOf('korean')>=0){{
      GROW.kr++; gain=20;
      if(GROW.kr>=10) unlockBadge('kr10');
    }} else if(id.indexOf('exam')>=0||id.indexOf('cn-domestic')>=0){{
      GROW.exam++; gain=20;
      if(GROW.exam>=5) unlockBadge('exam5');
    }}
    const m=id.match(/tutorial_(\d\d)/);
    if(m){{ GROW.tut[m[1]]=1; if(Object.keys(GROW.tut).length>=17) unlockBadge('tut16'); }}
    GROW.reads++;
    addXP(gain);
    if(GROW.reads===1) unlockBadge('r1');
    if(GROW.reads===10) unlockBadge('r10');
    if(GROW.reads>=50) unlockBadge('r50');
    if(GROW.reads>=100) unlockBadge('r100');
  }} else {{
    addXP(2,null,true);
  }}
  saveGrow();
}}
function renderGrowth(){{
  const slot=document.getElementById('grow-slot'); if(!slot) return;
  const L=levelOf(GROW.xp);
  const nx=nextLevel();
  const pct=nx?Math.max(3,Math.min(100,Math.round((GROW.xp-L.min)/(nx.min-L.min)*100))):100;
  let bx='';
  for(let i=0;i<BADGES.length;i++){{
    bx+=(GROW.badges.indexOf(BADGES[i].id)>=0)? BADGES[i].e : '<span class="off">'+BADGES[i].e+'</span>';
  }}
  let rec=null;
  try{{
    const rd=JSON.parse(localStorage.getItem('wg.read')||'{{}}');
    for(let i=1;i<=17 && !rec;i++){{
      const key='tutorial_'+('0'+i).slice(-2);
      const ks=Object.keys(DOCS);
      for(let j=0;j<ks.length;j++){{ if(ks[j].indexOf(key)>=0 && !rd[ks[j]]){{ rec=ks[j]; break; }} }}
    }}
  }}catch(e){{}}
  slot.innerHTML='<div class="grow-card">'
    +'<div class="grow-top"><span class="grow-lv">Lv.'+L.n+' · '+L.t+'</span><span class="grow-streak">🔥 连续 '+GROW.streak+' 天</span></div>'
    +'<div class="grow-bar"><i style="width:'+pct+'%"></i></div>'
    +'<div class="grow-meta">'+GROW.xp+' XP'+(nx?' · 距 Lv.'+nx.n+' 还差 '+(nx.min-GROW.xp)+' XP':' · 已满级 🎓')+'　·　已读 '+GROW.reads+' 篇　·　成就 '+GROW.badges.length+'/'+BADGES.length+'</div>'
    +'<div class="badges">'+bx+'</div>'
    +(rec?'<button class="home-card small" style="margin-top:10px" data-doclink="'+rec+'"><b>📌 今日推荐：'+DOCS[rec].t+'</b></button>':'')
    +'<button class="home-card small" style="margin-top:8px" onclick="openQuizCenter()"><b>📝 考试中心 · 检验学习成果</b></button>'
    +'<button class="home-card small" style="margin-top:8px" onclick="openLabCenter()"><b>⚒ 实战中心 · 动手实操与模拟赛</b></button>'
    +'</div>'
    +'<div class="home-card" style="margin-top:14px;border-style:dashed">'
    +'<b>⚔ 世赛训练场 · 真机操练（Minis 终端）</b>'
    +'<p style="color:var(--dim);font-size:12.5px;margin:8px 0;line-height:1.7">手机里藏着一个完整比赛环境：3 台服务器节点 · 6 个比赛模块 · 评分脚本当场打分。在终端里运行：</p>'
    +'<div style="font-family:monospace;font-size:12px;background:rgba(0,0,0,.35);border-radius:10px;padding:10px;color:#7ef0c0;line-height:2;overflow-x:auto">wsarena status<span style="color:var(--dim2)"> &nbsp;# 看状态</span><br>wsarena sh srv1<span style="color:var(--dim2)"> &nbsp;# 进服务器操练</span><br>wsarena check web<span style="color:var(--dim2)"> &nbsp;# 评分打分</span></div>'
    +'<p style="color:var(--dim);font-size:11.5px;margin:8px 0 0">模块：Web · DNS · 排障 · 数据库 · 负载均衡 · 机房管理 ｜ 全真模拟：wsarena exam full</p>'
    +'</div>';
}}
/* ===== end growth ===== */
const QUIZ_BANK={{
tutorial_01: {{t:'第1章 · Linux零基础', q:[
  {{q:'查看「当前所在目录」的命令是？',o:['cd','ls','pwd','dir'],a:2,e:'pwd = print working directory，打印当前工作目录。迷路了就打它。'}},
  {{q:'删除一个文件的命令是？',o:['rm','del','erase','cut'],a:0,e:'rm 删除文件（Linux 没有回收站！）；rm -r 删目录，rm -rf 强制删。'}},
  {{q:'chmod 755 中的「7」表示什么权限？',o:['只读','只写','读+写+执行','只执行'],a:2,e:'r=4、w=2、x=1，7=4+2+1，即读+写+执行。'}},
  {{q:'查看文件「最后 20 行」用哪个命令？',o:['head -20','tail -20','cat -20','last -20'],a:1,e:'tail 看结尾（排错看日志常用 tail -f 实时跟踪）。'}}
]}},
tutorial_02: {{t:'第2章 · 网络零基础', q:[
  {{q:'以下哪个是「私有 IP」网段？',o:['8.8.8.8','192.168.1.10','47.103.8.12','223.5.5.5'],a:1,e:'192.168.x.x / 10.x.x.x / 172.16~31.x.x 是私有地址，仅在局域网内部有效。'}},
  {{q:'HTTPS 默认使用哪个端口？',o:['80','8080','443','22'],a:2,e:'HTTPS=443（加密网页）；HTTP=80；SSH=22。'}},
  {{q:'查看本机哪些端口正在监听，用？',o:['ss -tlnp','ls -l','ps aux','top'],a:0,e:'ss -tlnp 列出所有正在守门的服务，是判断服务起没起的第一利器。'}},
  {{q:'能 ping 通 8.8.8.8，但打不开网页（域名），最可能是？',o:['网线坏了','DNS 问题','路由器断电','防火墙全关'],a:1,e:'IP 通、域名不通 = 名字翻译失败 = DNS 问题。这是排错口诀之一。'}}
]}},
tutorial_03: {{t:'第3章 · 服务器实战', q:[
  {{q:'修改 Nginx 配置后，检查语法用？',o:['nginx -t','nginx -v','nginx -s','check nginx'],a:0,e:'改配置→nginx -t→reload→验证，是 Nginx 运维的标准四步。'}},
  {{q:'查看一个 systemd 服务的运行状态用？',o:['systemctl status 服务名','service -v','ps -ef | head','netstat'],a:0,e:'systemctl status 看状态，journalctl -u 看日志。'}},
  {{q:'MySQL 数据库备份（导出）用哪个命令？',o:['mysql --backup','mysqldump','mydump','dump -u root'],a:1,e:'mysqldump -u root 库名 > 备份.sql 是标准备份姿势。'}},
  {{q:'让服务「开机自动启动」用？',o:['systemctl enable 服务名','systemctl start 服务名','systemctl boot 服务名','开机手动点'],a:0,e:'enable=开机自启，start=现在启动，两个都要才是完整部署。'}}
]}},
tutorial_04: {{t:'第4章 · HTTPS 与证书', q:[
  {{q:'HTTPS 本质上是？',o:['更快的 HTTP','HTTP + TLS 加密','一种新协议替代 HTTP','压缩过的 HTTP'],a:1,e:'HTTPS = HTTP + TLS：给传输内容加密 + 用证书验证对方身份。'}},
  {{q:'验证「证书链」是否正确的命令是？',o:['openssl verify','cert-check','ssl -test','curl -k'],a:0,e:'openssl verify -CAfile 根证书 服务证书 → OK 即链正确（世界赛评分同款检查）。'}},
  {{q:'Let’s Encrypt 的免费证书用哪个工具自动申请？',o:['certbot','openssl-cert','freecert','sslcert'],a:0,e:'certbot --nginx 一条命令自动签发+配置+续期。'}},
  {{q:'浏览器提示「证书不受信任」，最常见原因是？',o:['网速太慢','自签证书的 CA 没装进信任列表','屏幕亮度','浏览器版本老'],a:1,e:'自建 CA 签的证书，浏览器默认不认识——要把根证书装入系统信任列表。'}}
]}},
tutorial_05: {{t:'第5章 · DNS 实战', q:[
  {{q:'DNS 的「A 记录」用于？',o:['域名→IPv4 地址','域名→IPv6','IP→域名','邮件服务器'],a:0,e:'A=域名到 IPv4；AAAA=域名到 IPv6；PTR=IP 反向查域名；MX=邮件。'}},
  {{q:'「CNAME 记录」的作用是？',o:['指向另一个域名（别名）','加密域名','限制访问','记录联系人'],a:0,e:'CNAME 是别名，如 blog.example.com → www.example.com。'}},
  {{q:'检查 BIND 区域文件语法用？',o:['named-checkzone','dig -test','dnscheck','zone -verify'],a:0,e:'named-checkzone 区域名 文件 → 检查 zone 文件；named-checkconf 检查主配置。'}},
  {{q:'主从 DNS 的作用是？',o:['加快输入','冗余：主挂从顶，解析不中断','省钱','加密域名'],a:1,e:'从服务器自动同步主服务器数据，主故障时继续解析——高可用思想。'}}
]}},
tutorial_06: {{t:'第6章 · 负载均衡与高可用', q:[
  {{q:'HAProxy 中「check」参数的作用是？',o:['健康检查：后端挂了自动剔除','检查配置','加密通信','记录日志'],a:0,e:'check 让 HAProxy 持续体检后端，故障自动摘除、恢复自动回归。'}},
  {{q:'Keepalived 的核心作用是？',o:['数据库备份','通过 VRRP 提供浮动 VIP，主备秒级切换','压缩流量','杀毒'],a:1,e:'主调度器挂了，备用的一秒内接管浮动 IP——用户完全无感知。'}},
  {{q:'roundrobin 是哪种负载均衡算法？',o:['最少连接','按 IP 哈希','轮询：你一次我一次','随机'],a:2,e:'roundrobin=轮询；leastconn=最少连接；source=按来源 IP。'}},
  {{q:'「单点故障」是指？',o:['一台机器停电','某个组件只有一份，它挂了整个系统就挂','网络慢','服务器太贵'],a:1,e:'消除单点故障的手段=冗余（主备/多活），这是高可用设计的核心思想。'}}
]}},
tutorial_07: {{t:'第7章 · 故障排查', q:[
  {{q:'服务器各种奇怪故障前，先看哪个资源指标？',o:['屏幕分辨率','df -h 磁盘是否满了','鼠标电量','机箱颜色'],a:1,e:'磁盘满是头号杀手：df -h 一看便知，du -sh 找真凶。'}},
  {{q:'服务启动失败，看详细日志用？',o:['journalctl -u 服务名 -n 50','cat /dev/null','ls -la','ping 服务名'],a:0,e:'服务排错第一命令：journalctl -u 服务名，翻最近的错误。'}},
  {{q:'"Connection refused"通常说明？',o:['网线质量差','服务没在监听/端口没开','硬盘太小','域名过期'],a:1,e:'连接被拒绝=门没开：服务没启动或没监听该端口（区别于 timeout=网络不通）。'}},
  {{q:'改服务器配置的铁律是？',o:['直接改线上','先备份→改→验证语法→重启→验证功能','改完即走','等出问题再说'],a:1,e:'cp 配置文件.bak 是保命习惯；nginx -t 类语法检查永远在重启前。'}}
]}},
tutorial_08: {{t:'第8章 · Windows Server', q:[
  {{q:'AD DS 安装后服务器成为？',o:['普通文件服务器','域控制器（DC）','网页服务器','打印机'],a:1,e:'域控制器统一管理全公司账号与策略，是 Windows 域环境的大脑。'}},
  {{q:'验证某台电脑应用了哪些组策略（GPO）用？',o:['gpupdate /force 后 gpresult /r','dir /gpo','windows -policy','admin -show'],a:0,e:'gpresult /r 显示实际生效的策略列表，是 GPO 排错的标准动作。'}},
  {{q:'电脑加域失败，最常见的检查项是？',o:['显示器分辨率','DNS 是否指向域控','键盘布局','屏幕保护'],a:1,e:'加域要能解析域名——DNS 必须指向域控，这是 90% 加域失败的原因。'}},
  {{q:'DFS 的全称与作用是？',o:['分布式文件系统：把多个共享组织成一棵逻辑树','硬盘碎片整理','数据加密','病毒扫描'],a:0,e:'DFS 让用户只记一个入口 \\域名\共享名，底下的目录可以分布在不同服务器。'}}
]}},
tutorial_09: {{t:'第9章 · Shell 脚本进阶', q:[
  {{q:'脚本开头写 set -euo pipefail 的作用是？',o:['加速运行','出错即停+未定义变量报错+管道错误捕获','加密脚本','彩色的输出'],a:1,e:'这三件套是现代脚本的安全带，让错误不再被默默吞掉。'}},
  {{q:'$? 的含义是？',o:['上一个命令的退出码（0=成功）','当前目录','当前用户','进程号'],a:0,e:'echo $? → 0 表示上条命令成功，非 0 表示失败（脚本判断的核心）。'}},
  {{q:'调试脚本时逐行打印执行过程用？',o:['bash -x 脚本.sh','bash -v9 脚本.sh','debug 脚本.sh','run -trace 脚本.sh'],a:0,e:'bash -x 显示每个实际执行的命令，找 bug 的神器。'}},
  {{q:'「幂等」指的是？',o:['跑一次就够','执行多次结果与一次相同','必须 root 运行','自动备份'],a:1,e:'Ansible 的剧本、Terraform 的计划都是幂等的——重复执行不会把系统搞乱。'}}
]}},
tutorial_10: {{t:'第10章 · Docker', q:[
  {{q:'docker run -p 8080:80 nginx 中 -p 的含义是？',o:['宿主机 8080 → 容器 80 端口映射','申请 8080MB 内存','开 8080 个副本','加密'],a:0,e:'-p 宿主端口:容器端口；外网访问宿主 8080 即访问容器内的 80。'}},
  {{q:'Dockerfile 第一条指令一般是？',o:['RUN','FROM（选择基础镜像）','COPY','CMD'],a:1,e:'FROM 指定基底，之后 RUN 装软件、COPY 放文件、CMD 定启动命令。'}},
  {{q:'容器删除后数据就丢——解决要用？',o:['数据卷（volume）','更快硬盘','更多内存','天天备份'],a:0,e:'-v 把数据存在宿主机上，容器随便删，数据都在。数据库必须挂卷。'}},
  {{q:'多阶段构建（multi-stage）的主要目的是？',o:['速度更快','镜像瘦身：编译工具不进最终镜像','支持多平台','自动测试'],a:1,e:'阶段1编译、阶段2只拷贝产物——镜像能从 900MB 瘦到 20MB。'}}
]}},
tutorial_11: {{t:'第11章 · Kubernetes', q:[
  {{q:'K8s 最小的调度单位是？',o:['容器','Pod','虚拟机','进程'],a:1,e:'Pod 是一个或多个容器的组合，是 K8s 调度的最小单位。'}},
  {{q:'Deployment 的 replicas: 3 表示？',o:['端口号','永远维持 3 个副本（死了自动补）','CPU 核数','超时 3 秒'],a:1,e:'你声明"我要 3 个"，K8s 持续对账——少一个就补一个（自愈）。'}},
  {{q:'Service 的作用是？',o:['给 Pod 群一个固定入口+负载均衡','存储数据','杀病毒','画图'],a:0,e:'Pod 的 IP 会变，Service 提供不变的虚拟 IP 和域名，并自动分发流量。'}},
  {{q:'Pod 状态 ImagePullBackOff 意思是？',o:['内存不足','拉不到镜像','崩溃重启','正常'],a:1,e:'镜像名错/私有仓库没配密钥。用 kubectl describe pod 查看具体原因。'}}
]}},
tutorial_12: {{t:'第12章 · AWS 云平台', q:[
  {{q:'私有子网访问互联网（下载更新）要走？',o:['Internet Gateway 直连','NAT 网关（单向外访）','VPN 全开','不能访问'],a:1,e:'公有子网走 IGW；私有子网走 NAT 网关——可以出去，外面进不来。'}},
  {{q:'S3 是哪种类型的存储？',o:['块存储','对象存储','内存','打印机'],a:1,e:'S3=对象存储（存文件/备份/静态网站）；EBS=块；EFS=文件。'}},
  {{q:'IAM 的「最小权限原则」指？',o:['人人都用管理员','只授予完成工作所需的最小权限','密码越短越好','不设权限'],a:1,e:'多一份权限多一份风险：每个账号/角色只给刚好够用的权限。'}},
  {{q:'Auto Scaling Group（ASG）的作用是？',o:['自动伸缩：流量高加机器、低减机器','自动付款','自动备份数据库','自动写代码'],a:0,e:'按 CPU 等指标自动增减 EC2——弹性是云的核心价值之一。'}}
]}},
tutorial_13: {{t:'第13章 · 自动化运维', q:[
  {{q:'Ansible 管理远程机器靠什么？（无 Agent）',o:['SSH','安装客户端软件','U 盘','远程桌面'],a:0,e:'Ansible 只靠 SSH 就能管上千台机器——这是它火的原因。'}},
  {{q:'terraform plan 的作用是？',o:['真的创建资源','预演：显示将要发生的变化（不执行）','删除所有资源','联网下载'],a:1,e:'plan=先看要变什么，apply=真执行。先 plan 再 apply 是铁律。'}},
  {{q:'Terraform 的 state（状态文件）记录了什么？',o:['用户的密码','已创建资源与现实世界的映射账本','代码历史','网络流量'],a:1,e:'state 让 Terraform 知道"哪些资源是我造的"——丢了它管理就断线。'}},
  {{q:'CI/CD 中 CI 指？',o:['持续集成：提交代码后自动测试/构建','公司保险','中央情报','控制面板'],a:0,e:'CI=持续集成（自动测试构建），CD=持续部署（自动发布上线）。'}}
]}},
tutorial_14: {{t:'第14章 · 监控与日志', q:[
  {{q:'Prometheus 采集指标的方式是？',o:['被动等上报','主动去目标拉取（pull）','人工填报','购买数据'],a:1,e:'Prometheus 每隔 15 秒主动抓取各目标的 /metrics 页面。'}},
  {{q:'Grafana 的主要用途是？',o:['把监控指标画成仪表盘','写代码','杀毒','发邮件'],a:0,e:'Grafana 连接 Prometheus 等数据源，做出漂亮的监控大盘。'}},
  {{q:'实时跟踪日志文件（新内容自动滚动）用？',o:['cat 文件','tail -f 文件','head 文件','grep 文件'],a:1,e:'tail -f 就像日志直播；Ctrl+C 退出。'}},
  {{q:'告警规则里 for: 5m 的目的是？',o:['防抖动：持续 5 分钟才告警','延迟 5 分钟发送','5 分钟后自动修复','测试用'],a:0,e:'瞬时波动不告警，持续异常才叫人——避免"狼来了"式告警疲劳。'}}
]}},
tutorial_15: {{t:'第15章 · 安全加固', q:[
  {{q:'禁止 root 用户直接 SSH 登录要改哪个配置？',o:['PermitRootLogin no','AllowRoot false','NoRoot yes','RootLogin off'],a:0,e:'/etc/ssh/sshd_config 中 PermitRootLogin no + 只认密钥登录。'}},
  {{q:'fail2ban 的作用是？',o:['自动封禁暴力破解的 IP','杀毒','备份文件','加速网络'],a:0,e:'盯着登录日志，同一 IP 连续失败多次就自动封它。'}},
  {{q:'WAF 部署在什么位置？',o:['网站前面，拦截 SQL 注入/XSS 等攻击流量','服务器内部','数据库里','邮件系统'],a:0,e:'WAF=Web 应用防火墙，站在网站门口的安检门（比赛里用无 UA 请求测试它）。'}},
  {{q:'代码里写死数据库密码的主要问题是？',o:['运行慢','泄漏即失守，且无法轮换','占内存','没人能看见'],a:1,e:'正确做法：Secrets Manager/环境变量注入——代码里永远不写密码。'}}
]}},
tutorial_16: {{t:'第16章 · 真题实战', q:[
  {{q:'世界技能大赛的评分方式是？',o:['评委肉眼看看','评分脚本逐项实测功能','选手自评','抽签'],a:1,e:'评分脚本检查"能不能工作"（能登录吗？证书对吗？）——功能实测为准。'}},
  {{q:'比赛时间紧张时的正确策略是？',o:['死磕一道难题','先快速拿走所有"安全分"，再回头攻坚','提前交卷','放弃'],a:1,e:'按分数/耗时比排序，先保底再冲锋——所有金牌选手的共识。'}},
  {{q:'韩国赛选手题解里大量使用的自动化工具是？',o:['Terraform + Makefile','Photoshop','Excel','记事本'],a:0,e:'make up 一键部署是韩国选手的标配工程化习惯，值得学习。'}},
  {{q:'比赛题面与评分标准有冲突时，以哪个为准？',o:['题面','评分标准','自己的直觉','问旁边的'],a:1,e:'韩国题面明文规定：以评分标准为准——它决定你的分数。'}}
]}},
tutorial_17: {{t:'第17章 · 机房管理', q:[
  {{q:'UPS 在机房里扮演的角色是？',o:['替代市电长期供电','停电时提供缓冲时间（从容关机/等发电机），保证零中断切换','给服务器提速','省电费'],a:1,e:'UPS 顶 10-30 分钟，是"缓冲"不是"替代"；机房标准配双变换在线式（0ms 切换）。'}},
  {{q:'机房推荐的温湿度区间是？',o:['10-15°C，越干越好','18-27°C、湿度 40-60%','30°C 以上没事','只看温度不看湿度'],a:1,e:'太干起静电、太湿会结露，温度每升 10°C 元件寿命减半——温湿度是一对指标。'}},
  {{q:'RAID 5 最少要几块盘、能容错几块？',o:['2 块，容错 1','3 块，容错 1','4 块，容错 2','1 块，无容错'],a:1,e:'RAID5=至少 3 盘+1 份分散校验，坏 1 块可恢复；换盘后重建期间若再坏一块就全灭，所以要尽快换。'}},
  {{q:'服务器「带外管理」（IPMI/iDRAC/iLO）的最大价值是？',o:['让网速更快','系统宕机/关机时仍能远程开关机、看屏幕、装系统、读温度','省电','给服务器加密'],a:1,e:'只要插着电就能管理——机房远程运维 80% 靠它；它的网口必须隔离在独立管理 VLAN。'}},
  {{q:'PXE 批量装机时，客户端从哪里获得引导文件和系统镜像？',o:['U 盘','装机服务器：DHCP 发 IP+引导地址，TFTP 传引导程序，HTTP/NFS 传镜像','互联网','打印机'],a:1,e:'配好 Kickstart/preseed 应答文件后全自动无人值守——30 台机器约 40 分钟装完。'}},
  {{q:'学校机房要统一更新系统（装新软件），正确顺序是？',o:['直接装完事','解除还原保护→装好验证→重新上保护→抽一台重启复核','关掉还原功能不管了','全部重装'],a:1,e:'顺序反了一宿白干；每次更新都要留一台没动的机器做对照，防止批量事故。'}}
]}},
mastery_00: {{t:'精通·00 像说话一样掌握云计算', q:[
  {{q:'「像说话一样掌握云计算」最终要达成什么状态？',o:['背下所有命令','不假思索地调出知识（母语级直觉）','考最多证书','收藏最多教程'],a:1,e:'母语的特征是不经过思考就能用——专业知识练到本能反应，才是真掌握。'}},
  {{q:'大多数人学云计算卡在什么状态？',o:['完全没入门','「认识但用不出来」的半哑巴状态','学得太多','证书太少'],a:1,e:'看得懂、考得过，但一动手就卡壳——这是「半个哑巴」：输入很多，输出太少。'}},
  {{q:'摆脱「半哑巴」的核心方法是什么？',o:['再多看 100 个视频','输出倒逼输入：讲出来、做出来才算会','买新教材','报更贵的课'],a:1,e:'能讲明白、能做出来的知识才真正属于你——输出是检验输入的唯一标准。'}},
  {{q:'五级能力阶梯的顶端（L5）是什么样的人？',o:['能跟着教程做','能创造、能教学、能解决任何新问题','考过认证','能背出文档'],a:1,e:'L5 是母语级：不但自己会，还能教别人、能应对没见过的新问题。'}}
]}},
mastery_01: {{t:'精通·01 疆域全景图', q:[
  {{q:'云计算世界的整体结构按什么层次组织？',o:['平台层 → 服务域层 → 横切能力层','硬件 → 软件','入门 → 高级','理论 → 实践'],a:0,e:'先看 6 大云平台（舞台），再看 16 个服务域（角色），最后是安全、自动化等横向贯穿能力。'}},
  {{q:'所谓「6 大云家族」一般指？',o:['6 种编程语言','AWS/Azure/GCP/阿里云/华为云/腾讯云等主流云平台','6 种数据库','6 个 Linux 发行版'],a:1,e:'全球 + 国内六大主流平台——你的技能最终要能跨这些平台迁移。'}},
  {{q:'「横切能力层」（如安全、自动化）为什么叫横切？',o:['它们要切开东西','它们贯穿所有服务域，不是单独一个领域','它们最难学','它们是选修的'],a:1,e:'安全、自动化、可观测等能力不专属某个域，而是贯穿每一层——是「贯穿思维」。'}},
  {{q:'为什么要把疆域全景图放在学习的第一章？',o:['凑章节数','先有地图再走路：知道结构才不会迷路','考试要考','好看'],a:1,e:'先建立全局坐标，后面每个知识点都知道「挂在哪」，学习效率完全不同。'}}
]}},
mastery_02: {{t:'精通·02 精通阶梯与自测', q:[
  {{q:'L1「使用者」的典型特征是什么？',o:['能跟着教程一步步做出来','能独立设计系统','能发明新方案','能教学'],a:0,e:'L1 是「会照着做」——教程是拐杖，做完了但换个场景就慌。'}},
  {{q:'L2「操作者」与 L1 的核心差别？',o:['打字更快','不依赖教程也能完成标准任务','会写代码','有证书'],a:1,e:'L2 的标志是「脱稿」：没有教程也能把标准场景做出来。'}},
  {{q:'L3「设计者」会做什么？',o:['照抄网上的方案','白手起家：从需求出发设计出可行方案','背别人的架构','只会一种做法'],a:1,e:'能设计意味着你理解了「为什么」——方案是你推出来的，不是抄来的。'}},
  {{q:'做「精通阶梯自测」的最大意义是什么？',o:['给自己打分玩','找到真实层级，针对性向上突破','炫耀','完成作业'],a:1,e:'最大的浪费是在错误的层级练习——自测让你知道下一步该练什么。'}}
]}},
mastery_03: {{t:'精通·03 领域深度修炼', q:[
  {{q:'计算（Compute）领域修炼的终点方向是？',o:['会开机','从「会开机」到「编排地球」——规模与自动化的极致','会装系统','会重启'],a:1,e:'计算的修炼层级：单机 → 集群 → 自动化编排 → 全球规模。'}},
  {{q:'存储（Storage）修炼要抵达的角色是？',o:['会复制粘贴文件','数据生命周期建筑师','会插硬盘','会删文件'],a:1,e:'从会存会取，到设计数据从产生到销毁的完整体面。'}},
  {{q:'网络（Networking）修炼的进阶路径是？',o:['会插网线 → 网络空间建筑师','会 ping','会连 WiFi','会看 IP'],a:0,e:'从会设安全组到设计混合云网络、跨区域架构——网络是云架构的物理底座。'}},
  {{q:'数据库修炼的终点描述是？',o:['会写 SELECT','数据架构之魂：理解数据如何流动与守护','会装 MySQL','会备份'],a:1,e:'数据是系统的灵魂——从写单表查询到设计高可用、分布式、生命周期治理。'}}
]}},
mastery_04: {{t:'精通·04 架构模式手册', q:[
  {{q:'架构模式手册按哪四组组织？',o:['前端/后端/数据库/网络','伸缩与性能 / 解耦与集成 / 可靠性与容灾 / 发布与运维','简单/中等/困难/地狱','读写删改'],a:1,e:'四组模式覆盖了架构设计的四个核心关切——记住分组，临场就不会乱。'}},
  {{q:'「解耦」最典型的手段是什么？',o:['消息队列','加服务器','多买硬盘','更快的 CPU'],a:0,e:'队列让生产者和消费者不必同时在线——系统从「手拉手」变成「松开手也不散」。'}},
  {{q:'「可靠性与容灾」组的关键词是？',o:['更快更高','多可用区/故障转移/备份恢复','省钱省力','好看好用'],a:1,e:'可靠性的本质是冗余与切换：任何单点都要有备胎，且切换要能自动。'}},
  {{q:'为什么要「背」架构模式（而不是现查）？',o:['显得专业','临场设计时要能瞬间调取——背下来才能组合创新','考试要默写','老师要求的'],a:1,e:'模式是架构师的「词汇量」：词汇不够，句子就造不出来。先存进脑子，再谈创造。'}}
]}},
mastery_05: {{t:'精通·05 全平台地图', q:[
  {{q:'「核心服务超级对照表」背横向的作用是什么？',o:['炫耀记忆','实现跨云迁移：知道 A 云的服务对应 B 云的什么','参加比赛背题','没作用'],a:1,e:'横向对照一背，学新云就是「换名字」——这是跨云能力的杠杆。'}},
  {{q:'「两周学会一朵新云」靠的是什么方法？',o:['从零死磕每个细节','核心服务映射 + 玩转方法论（先骨架后细节）','报最贵的课','抄别人的笔记'],a:1,e:'云平台同构性极高：先映射核心服务，再用两周集中实战，就能上手。'}},
  {{q:'学新云前要先破除的心理障碍是？',o:['「我太笨」','「又要从零开始」——其实大部分知识可以迁移','「云太贵」','「学了没用」'],a:1,e:'你已有的知识 70% 可迁移，新云只是换了一套 API 和名字。'}},
  {{q:'全平台地图的终极价值是？',o:['收藏夹 +1','一处通、处处通——能力不绑死在单一平台','面试吹牛','省流量'],a:1,e:'平台会变、服务名字会变，但你脑子里的「概念骨架」稳定——这才是职业安全。'}}
]}},
mastery_06: {{t:'精通·06 365 天训练系统', q:[
  {{q:'365 天训练系统的每日功课怎么设计？',o:['每天必须学 8 小时','20-45 分钟，按当天时间选档','想学才学','周末补一切'],a:1,e:'低门槛 + 高频率：每天都能做到的小剂量，远胜过偶尔的暴学。'}},
  {{q:'每周功课一般安排在什么时间？',o:['工作时间','周日 2 小时（复盘 + 实战）','半夜','随机'],a:1,e:'每周固定复盘与实战，把碎片知识点缝成体系。'}},
  {{q:'每月功课的规模建议是？',o:['10 分钟','每月最后一周周末，半天（深度项目）','一年一次','不需要'],a:1,e:'月度深度时间做「完整项目」——这是把 L2 推向 L3 的关键动作。'}},
  {{q:'这个训练系统的设计哲学是什么？',o:['突击速成','可持续的节奏胜过一切：能坚持 365 天才有可能精通','比谁学得快','少学多玩'],a:1,e:'精通是时间的函数。系统设计的唯一目标就是：让你「明天还想继续」。'}}
]}},
mastery_07: {{t:'精通·07 双精通时间线', q:[
  {{q:'「双精通」指的是哪两条线？',o:['云计算 + 计算机科学','英语 + 数学','编程 + 运维','硬件 + 软件'],a:0,e:'云计算是职业战场，计算机科学是底层内功——两条线互相供养。'}},
  {{q:'「分开学 vs 合并学」的结论是？',o:['分开学更高效','合并学：两条线互为支撑，同时推进反而更快','只学一个就行','看心情'],a:1,e:'学 K8s 时顺手理解操作系统调度，学网络时联系 CS 协议栈——合并让每份时间产出两份理解。'}},
  {{q:'让 24 个月计划「变成可能」的保障是什么？',o:['运气','六条纪律（固定节奏、输出优先等）','花钱','天赋'],a:1,e:'时间线再美，落地全靠纪律——计划是纸，纪律是钢。'}},
  {{q:'关于 L5 母语级的时间轴，诚实的说法是？',o:['3 个月速成','比想的长：以年为单位积累，但每一步都算数','永远达不到','看天赋'],a:1,e:'诚实面对时间尺度，反而能安心：因为你知道每一年都在逼近，而不是焦虑「怎么还没到」。'}}
]}},
cs_00: {{t:'CS·00 五书共生体系', q:[
  {{q:'五书共生体系的「核心洞察」是什么？',o:['书要买五本','同一知识出现三次，就会变成母语','一本书读五遍','五个人的笔记'],a:1,e:'知识在不同书里以不同角度重逢——重逢三次，就在你脑里长成了本能。'}},
  {{q:'为什么这五本书「必须一起学」？',o:['打折便宜','它们互为上下文：拆开来谁都学不通、学不深','书单好看','图书馆要求'],a:1,e:'理论书需要工程书来落地，工程书需要认知书来提速——单独看，每本都少一条腿。'}},
  {{q:'「把五本书放到同一张图上」的意义是什么？',o:['做思维导图交作业','构建知识网络：每个概念都知道其他书里谁在呼应它','好看','没意义'],a:1,e:'孤立的知识点会忘记，织进网络的知识点会被反复激活——这就是长期记忆的秘密。'}},
  {{q:'五书共生的学习原理接近哪种科学结论？',o:['多角度编码 + 间隔重逢 = 长期记忆','睡前背书','大声朗读五遍','抄写 100 次'],a:0,e:'同一概念在多个语境下反复出现，是记忆科学里最强效的编码方式。'}}
]}},
cs_01: {{t:'CS·01 五书拆解地图', q:[
  {{q:'《计算机系统要素》（Nand2Tetris）带你从哪造到哪？',o:['从网页到数据库','从与非门一路造到可以跑程序的计算机','从 CPU 到操作系统','从 0 到 1 写文档'],a:1,e:'Nand2Tetris：从逻辑门开始，一路造出 ALU、CPU、汇编器、编译器、操作系统——完整理解「计算机如何工作」。'}},
  {{q:'《C Primer Plus》在体系里承担什么角色？',o:['语言教材 + 工程肌肉的起点','算法大全','网络手册','面试宝典'],a:0,e:'C 是操作系统与云基础设施的母语——学它让你看懂内核、网络栈和一切底层系统代码。'}},
  {{q:'《思考，快与慢》为学习体系提供什么？',o:['心理学八卦','系统 1 / 系统 2 的认知框架：理解「为什么学了会忘」','数学公式','成功学'],a:1,e:'用系统 1（快、自动）和系统 2（慢、费力）解释学习：把知识从系统 2 训练成系统 1，就是「母语化」。'}},
  {{q:'「拆解地图」这一章最实际的价值是什么？',o:['知道每本书讲什么、各承担哪条能力线，从而安排学习顺序','背书名','凑字数','出版信息'],a:0,e:'地图在手，你不会再问「下一本读什么」——你知道每本书补的是哪块肌肉。'}}
]}},
cs_02: {{t:'CS·02 24 个月整合计划', q:[
  {{q:'24 个月计划把整个旅程分为几个阶段？',o:['三个阶段','五个阶段（从点火到精通）','十个阶段','没有分阶段'],a:1,e:'五个阶段像五段楼梯：每段都有明确的「毕业标准」，踩实了再往上。'}},
  {{q:'「阶段 0 · 点火」的任务是什么？',o:['学最高深的内容','第 1 个月：搭环境、定节奏、建立学习习惯','考认证','买设备'],a:1,e:'点火期不追求深度，只追求「跑起来」——习惯一旦建立，后面才是加速阶段。'}},
  {{q:'每周课表模板的设计原则是？',o:['每天都排满','有骨架不排死：固定主线 + 弹性补课','随机安排','只排工作日'],a:1,e:'模板给的是节奏感，不是牢笼——留出弹性才能长期坚持。'}},
  {{q:'一个 24 个月计划能成功的关键是什么？',o:['计划本身完美','小步快跑 + 固定节奏 + 定期检视调整','一次学完','天赋异禀'],a:1,e:'完美计划死在第一天，可调整的计划活到最后——迭代能力比计划精度重要。'}}
]}},
cs_03: {{t:'CS·03 认知引擎', q:[
  {{q:'「系统 1」与「系统 2」分别指？',o:['两台电脑','快思考（直觉自动）/ 慢思考（费力理性）','两个操作系统','左右脑'],a:1,e:'系统 1 快捷省力但会出错，系统 2 精确但耗能——学习就是让系统 2 的技巧沉淀为系统 1 的本能。'}},
  {{q:'学习技能的终极目标是什么？',o:['永远用系统 2 硬算','把知识从系统 2 练成系统 1：不假思索就能调出来','不用脑子','背下来就行'],a:1,e:'高手的秘密：核心技能已「系统 1 化」——省下的脑力全用来思考战略。'}},
  {{q:'以下哪项属于学习科学的有效武器？',o:['反复重读划重点','主动回忆 + 间隔重复 + 交错练习','抄写','听课听到睡着'],a:1,e:'科学验证的最强组合：合上书回忆、隔几天再测、不同主题穿插练。'}},
  {{q:'为什么每本书都要做「系统 1 化训练」？',o:['仪式感','技能自动化后，你才有余力应对真实场景的复杂性','书要求','凑时间'],a:1,e:'真实战场上没有时间慢慢推理——自动化不是选项，是入场券。'}}
]}},
cs_04: {{t:'CS·04 项目实战清单', q:[
  {{q:'Nand2Tetris 线包含多少个项目？',o:['5 个','12 个','50 个','3 个'],a:1,e:'12 个项目从逻辑门到操作系统，是「从晶体管到软件」的完整征途。'}},
  {{q:'项目体系分哪三条线？',o:['Nand2Tetris 主线 / C 工程线 / 编译器理论线','前端/后端/全栈','简单/中等/困难','读书/考试/比赛'],a:0,e:'三条线互相喂养：硬件理解喂养 C，C 喂养编译器，编译器理解反哺所有。'}},
  {{q:'「作品集」在职业竞争中的意义是？',o:['占硬盘','项目证明能力——比证书更硬的证据','装样子','没意义'],a:1,e:'面试官看代码仓库 5 分钟，胜过看简历 5 页——作品是最诚实的学历。'}},
  {{q:'C 项目线主要练什么？',o:['网页设计','工程肌肉：指针、内存管理、调试、构建','Excel 表格','打字速度'],a:1,e:'C 逼你直面内存与指针——这些肌肉让你之后学任何语言都快。'}}
]}},
know_01: {{t:'知识·01 Linux 与操作系统', q:[
  {{q:'进程和线程最本质的区别是什么？',o:['进程快线程慢','进程是资源分配单位，线程是调度单位','线程更贵','没区别'],a:1,e:'进程拥有独立内存空间等资源；线程共享进程资源，切换更轻——这决定了并发模型的选型。'}},
  {{q:'「Linux 一切皆文件」的意思是什么？',o:['只能存文件','设备、管道等都被抽象成文件来读写','不能写程序','文件最大'],a:1,e:'/dev/sda、/proc/cpuinfo 都能像文件一样读写——统一的 IO 抽象是 Linux 设计的灵魂。'}},
  {{q:'虚拟内存的核心作用是？',o:['让硬盘变大','给每个进程独立的地址空间，并支持超出物理内存使用','省电','加速打字'],a:1,e:'虚拟地址让进程互不干扰，swap 让小内存跑大程序——代价是页错误时的性能抖动。'}},
  {{q:'Linux 权限模型 rwx 中「x」对目录意味着什么？',o:['不能读','能否进入该目录（cd 进去）','能否删除自己','没意义'],a:1,e:'目录的 x 是「通行证」——没有 x，目录里的文件你连碰都碰不到。'}}
]}},
know_02: {{t:'知识·02 网络工程', q:[
  {{q:'TCP 三次握手的目的之一是？',o:['加密数据','双方确认彼此的收发能力都正常','压缩流量','省时间'],a:1,e:'SYN → SYN-ACK → ACK：三次交互让双方都确认「我能发能收」——可靠传输的起点。'}},
  {{q:'子网掩码 255.255.255.0（/24）表示什么？',o:['网速上限','前 24 位是网络号：同网段可容纳 254 台主机','加密位数','带宽'],a:1,e:'/24 切出 256 个地址（首尾保留），跨网段要经网关——划分子网就是在切广播域。'}},
  {{q:'路由器转发时「最长前缀匹配」的意思是？',o:['随便选一条','越精确（前缀越长）的路由越优先被采用','按时间先后','按长度排序'],a:1,e:'去同一个目的地有多条路时，路由表选最精确那条——这是路由查找的基本规则。'}},
  {{q:'网络排障的标准顺序是？',o:['从应用层往下','从底层往上：链路 → IP → DNS → 端口/服务','随机猜','只看日志'],a:1,e:'ping 网关（链路/IP）→ ping 8.8.8.8（公网）→ dig 域名（DNS）→ curl 端口（服务）——一层层往上，5 分钟定位。'}}
]}},
know_03: {{t:'知识·03 企业服务全栈', q:[
  {{q:'企业内网 DNS 与公网 DNS 的核心差别是？',o:['没有差别','内网 DNS 解析内部域名（不对外），并可转发外部查询','内网更快','内网免费'],a:1,e:'企业用内部域（如 corp.local）管理内网资源，外部域名转发给公网 DNS——双轨制。'}},
  {{q:'反向代理与正向代理的区别是？',o:['方向不一样：反向代理代表服务器收请求，正向代理代表客户端发请求','都是转发','反向的贵','正向的慢'],a:0,e:'Nginx 反代站在服务器前面（用户不知道背后有多少台）；翻墙代理是正向代理（代表你出去）。'}},
  {{q:'Active Directory 和 OpenLDAP 共同提供的服务是？',o:['网页服务','目录服务：统一管理用户/组/权限','邮件','杀毒'],a:1,e:'目录服务是企业 IT 的中枢：一处建号，处处可用；一处禁用，处处失效。'}},
  {{q:'邮件系统里 SMTP 和 IMAP 的分工是？',o:['都发邮件','SMTP 负责发送，IMAP 负责收件箱同步','SMTP 收 IMAP 发','都是网页'],a:1,e:'SMTP 是邮局（发信投递），IMAP 是信箱（多设备同步阅读）——各司其职。'}}
]}},
know_04: {{t:'知识·04 虚拟化与私有云', q:[
  {{q:'Type 1（裸金属）Hypervisor 与 Type 2 的区别是？',o:['颜色不同','Type 1 直接跑在硬件上（ESXi/KVM），Type 2 跑在操作系统上（VirtualBox）','Type 1 更慢','没区别'],a:1,e:'生产环境几乎都用 Type 1：少一层操作系统，性能与稳定性更好。'}},
  {{q:'OpenStack 中 Nova 组件负责什么？',o:['网络','计算：管理虚拟机的生命周期','存储','数据库'],a:1,e:'Nova=计算、Neutron=网络、Cinder=块存储、Keystone=认证——私有云的积木。'}},
  {{q:'虚拟机「快照」和「备份」的区别是？',o:['都是复制','快照是瞬时状态点（依赖原盘、适合回滚），备份是独立副本（适合灾难恢复）','快照更安全','备份更快'],a:1,e:'快照不是备份！原盘损坏快照一起完蛋——生产系统必须做真正独立的备份。'}},
  {{q:'企业选择私有云（而非公有云）的核心动机通常是？',o:['更便宜','数据可控/合规/安全要求','更快','更酷'],a:1,e:'金融、政务等数据敏感行业：合规与可控性是第一优先级——私有云是必然选择。'}}
]}},
know_05: {{t:'知识·05 公有云核心 AWS', q:[
  {{q:'EC2 与 EBS 的关系类似什么？',o:['浏览器与网页','电脑主机与它的硬盘','键盘与鼠标','邮件与附件'],a:1,e:'EC2=虚拟机本体，EBS=挂载的块存储盘——关机保留数据靠 EBS，实例本身可以随时销毁。'}},
  {{q:'S3 最典型的使用场景是？',o:['跑数据库','对象存储：文件/备份/静态网站/数据湖','做 CPU 计算','当内存用'],a:1,e:'S3 存「对象」（文件+元数据），几乎无限容量——是云上数据的默认终点。'}},
  {{q:'VPC 中「私有子网」访问公网的正确方式是？',o:['直接连 IGW','经 NAT 网关出去（外面进不来）','不需要访问','桥接网卡'],a:1,e:'NAT 让私有子网「能出不能进」——配合安全组实现最小暴露面。'}},
  {{q:'IAM「角色（Role）」比「用户密钥」更推荐的原因是？',o:['名字好听','临时凭证自动轮换，无需在代码里存长期密钥','更便宜','更快'],a:1,e:'角色给 EC2/服务发放自动过期的临时凭证——密钥泄漏风险直接归零。'}}
]}},
know_06: {{t:'知识·06 容器与编排', q:[
  {{q:'容器与虚拟机的本质区别是？',o:['容器共享宿主内核（进程级隔离），虚拟机有独立内核（硬件级隔离）','容器更贵','虚拟机更快','没区别'],a:0,e:'容器轻在不用虚拟硬件和内核——秒级启动，代价是隔离性弱于虚拟机。'}},
  {{q:'Docker 镜像「分层」设计的价值是？',o:['好看','层可复用：多个镜像共享基础层，节省空间和下载时间','加密','防病毒'],a:1,e:'每层只记录变化，改一行代码只重建最上层——这是容器分发的速度之源。'}},
  {{q:'Kubernetes 的「声明式」是什么意思？',o:['写脚本一步步执行','你声明「期望状态」，系统自动对账到那个状态','命令行操作','图形界面'],a:1,e:'你写「要 3 个副本」，K8s 就持续工作直到现实=期望——自愈、滚动更新全靠这个模型。'}},
  {{q:'K8s 编排解决的核心问题不包括？',o:['调度（放哪台机器跑）','自愈（挂了自动重启）','扩展（按需增减副本）','帮你写业务代码'],a:3,e:'编排管的是「怎么跑」，不是「写什么」——业务逻辑永远是开发者的事。'}}
]}},
know_07: {{t:'知识·07 自动化与 IaC', q:[
  {{q:'Terraform 的核心工作模式是？',o:['命令式：一步步告诉它怎么做','声明式：描述想要的基础设施，它算出差量并执行','图形拖拽','人工审批'],a:1,e:'plan 展示差量、apply 执行——「声明目标，自动算路」是现代 IaC 的范式。'}},
  {{q:'Ansible 与其他配置管理工具（如 Puppet）的关键区别是？',o:['无 Agent：只靠 SSH 推送，不用在被管机器装客户端','更贵','不能并行','只支持 Windows'],a:0,e:'无 Agent 意味着零侵入——新机器不用做任何预安装就能被管理。'}},
  {{q:'GitOps 的核心原则是？',o:['代码放 GitHub 就行','Git 仓库是所有环境的唯一事实源，变更走 PR，系统自动同步','用 Git 命令部署','每天 commit'],a:1,e:'想改生产环境？先改 Git 再合并——审计、回滚、协作全部由 Git 天然满足。'}},
  {{q:'自动化脚本「幂等」的重要性是？',o:['跑一次就废','重复执行结果一致：失败重试、例行巡检都安全','更快','省内存'],a:1,e:'幂等让自动化可反复执行——这是它敢「无人值守」的底线保障。'}}
]}},
know_08: {{t:'知识·08 可观测性与性能工程', q:[
  {{q:'可观测性的三大支柱是？',o:['CPU/内存/磁盘','Metrics（指标）/ Logs（日志）/ Traces（链路追踪）','读/写/删','快/中/慢'],a:1,e:'指标告诉你「出没出问题」，日志告诉你「出了什么」，链路告诉你「卡在哪一跳」。'}},
  {{q:'SLO 与 SLI 的关系是？',o:['SLO 是目标值，SLI 是实际测量值','SLI 是目标','一样','无关'],a:0,e:'SLI 是实时指标（如可用率 99.95%），SLO 是承诺目标（99.9%）——用数据管理可靠性。'}},
  {{q:'「黄金四大信号」指哪四个？',o:['金木水火','延迟 / 流量 / 错误 / 饱和度','读/写/查/删','上/下/左/右'],a:1,e:'Google SRE 总结的监控铁四角：四个信号一盯，服务健康尽收眼底。'}},
  {{q:'性能优化的第一原则是？',o:['先优化再说','先测量后优化：拿数据说话，拒绝猜测','全都要快','增加资源'],a:1,e:'没有测量的优化都是赌博——瓶颈可能在你想不到的角落。'}}
]}},
know_09: {{t:'知识·09 安全与韧性', q:[
  {{q:'「纵深防御」的核心思想是？',o:['买最贵的防火墙','多层防线：任何一层被突破，下一层仍能拦截','只防外网','定期杀毒'],a:1,e:'防火墙→WAF→最小权限→加密→监控——没有单点，就没有单点失守。'}},
  {{q:'备份的「3-2-1 原则」指？',o:['3 份数据、2 种介质、1 份异地','3 天 2 次 1 年','3 个人管 2 台机器','随便'],a:0,e:'任何单一存储都可能同时覆灭（勒索病毒专杀备份）——异地独立副本是最后底线。'}},
  {{q:'RTO 与 RPO 分别指？',o:['恢复所需时间 / 可容忍的数据丢失量','运行时间','成本','速率'],a:0,e:'RTO 是「坏多久必须修好」，RPO 是「最多丢多少数据」——灾难恢复方案的两个靶心。'}},
  {{q:'「零信任」安全模型的核心原则是？',o:['内网可信外网不可信','永不默认信任：每次访问都要验证（身份+设备+上下文）','不装杀毒','断网最安全'],a:1,e:'边界已经消失（云+远程办公），「先验证再放行」成为唯一稳妥的姿态。'}}
]}},
know_10: {{t:'知识·10 前沿与超越', q:[
  {{q:'「AI 云服务化」的典型形态是？',o:['卖显卡','托管大模型 API：按 token 计费的智能即服务','卖软件','培训课'],a:1,e:'从 IaaS/PaaS 到 AIaaS：模型能力被封装成 API——云竞争的新战场。'}},
  {{q:'可持续性云架构（WSOS 2026 新增章节）关注什么？',o:['省钱','碳足迹与能效：选址绿电、弹性调度、资源效率','性能','安全'],a:1,e:'数据中心能耗已是全球议题——「绿色云」从加分项变成了比赛正式考点。'}},
  {{q:'平台工程（Platform Engineering）要解决什么痛点？',o:['运维太闲','开发者自助：把基础设施能力做成内部平台，减少等待和扯皮','监控','测试'],a:1,e:'「你要的环境自己申请」——平台工程是 DevOps 的下一站，也是职业新风口。'}},
  {{q:'云原生高级形态包括哪些方向？',o:['Serverless / 边缘计算 / Wasm 等','只做容器','只做虚拟机','没有方向'],a:0,e:'函数计算、边缘节点、WebAssembly——计算形态持续演化，但概念骨架相通。'}}
]}},
know_11: {{t:'知识·11 竞赛实战指南', q:[
  {{q:'世界技能大赛云计算的评分特征是什么？',o:['看报告质量','脚本实测：所有评分点都要「能工作」','印象分','看速度'],a:1,e:'评分脚本不关心你多辛苦——它只 curl、dig、verify：能跑=得分，跑不了=0 分。'}},
  {{q:'比赛现场的「保底策略」指？',o:['放弃难题','先快速做完所有确定会做的题，再回头攻坚','交卷走人','抄旁边的'],a:1,e:'每个模块先扫一遍拿「安全分」，把有限时间投在收益最高的地方——这是金牌选手的共识。'}},
  {{q:'12 周冲刺训练计划的设计要点是？',o:['每周一套真题 + 复盘失分表','前 11 周休息最后 1 周冲刺','只做理论题','只练打字'],a:0,e:'真题 + 失分表 + 针对补强，循环 12 周——比赛是练出来的，不是讲出来的。'}},
  {{q:'真题最有效的用法是？',o:['当阅读材料','限时裸做 → 对照评分标准自评 → 失分清零重做','收藏','转让给别人'],a:1,e:'限时压力下的裸做暴露出真实水平，失分表就是你的私人训练大纲。'}}
]}},
know_12: {{t:'知识·12 认证与职业发展', q:[
  {{q:'认证路线应该按什么逻辑排？',o:['哪个热门考哪个','按体系层级由低到高：匹配能力成长节奏','越贵越好','快速全考'],a:1,e:'认证是能力的路标而非目标——按成长节奏分批考，才不至于「证到用时方恨虚」。'}},
  {{q:'比赛获奖与认证的关系是？',o:['互相冲突','互相加成：比赛练真功夫，认证给行业标准背书','比赛更牛','认证更牛'],a:1,e:'面试官眼里：比赛证明你能实战，认证证明你系统学过——双证合璧最可信。'}},
  {{q:'从运维出发的典型职业路径是？',o:['运维 → 云工程师 → 架构师/专家','永远做运维','转销售','考公'],a:0,e:'技术纵深（云专家/架构师）或横向拓展（DevOps/SRE/安全）——路线不同，底层能力通用。'}},
  {{q:'国内对世赛选手的政策支持包括？',o:['没有任何政策','职业资格/升学/就业等多维度支持（各地细化）','只发奖状','只在校内'],a:1,e:'多地把世赛成绩与技能等级、职称、升学通道挂钩——信息差就是机会差，选手应主动了解本地细则。'}}
]}},
room_00: {{t:'机房·00 总纲（从零到极致）', q:[
  {{q:'机房管理者的决策优先级（任何时刻）是？',o:['设备 > 数据 > 人','人 > 数据 > 设备 > 面子','数据 > 人 > 设备','谁贵保谁'],a:1,e:'先保人（撤离/断电），再保数据，最后设备——应急第一性原则。'}},
  {{q:'"极致"级机房管理者的核心能力是什么？',o:['背下全部设备参数','面对任何新系统都能快速判断它会在哪里坏、该怎么办','修得最快','认识最多厂商'],a:1,e:'判断力来自大量真实事故 + 深度复盘 + 系统思考——这比记忆值钱。'}},
  {{q:'"成本意识"心法的正确理解是？',o:['尽量不花钱','花得值——但安全冗余是底线不能省','越便宜越好','把预算花完'],a:1,e:'省的是"浪费"，保的是"底线"——PUE、生命周期、维保策略都要算清楚。'}},
  {{q:'学习这套体系最重要的铁律是？',o:['全部背下来','不动手 = 没学，每篇都要练一遍','收藏即掌握','只看理论部分'],a:1,e:'机房管理是"手上的知识"：算一遍、做一遍、讲一遍，才算真的会。'}}
]}},
room_01: {{t:'机房·01 阶梯与自测', q:[
  {{q:'能力定级的原则是？',o:['有多少证书','"独立"负责能力——有人带着能做的不算','工龄长短','面试表现'],a:1,e:'级别 = 你能独立对什么规模的系统负责。'}},
  {{q:'L3（高级运维）的标志性能力是？',o:['会换硬盘','能设计系统：搭 PXE/监控/备份体系，管容量、带值班','会背手册','能加班'],a:1,e:'从执行者变成设计者，是 L2→L3 的门槛。'}},
  {{q:'自测中 A、B、C 三组全部通过，大致对应哪一级？',o:['L1','L2','L3','L5'],a:2,e:'A=L1 门槛、B=L2、C=L3；D 组全过则接近 L4。'}},
  {{q:'某级"基本达标"的判定线是？',o:['能力清单完成 50%','能力清单 80% 以上做到且能独立完成','会一项就行','感觉良好'],a:1,e:'80% 达标后，剩下 20% 就是下一阶段的练习目标。'}}
]}},
room_02: {{t:'机房·02 基础设施修炼', q:[
  {{q:'机房负载 27kW、功率因数 0.9，UPS 容量至少约选？',o:['27kVA','30kVA 起（再留余量就近选 40kVA 档）','60kVA','10kVA'],a:1,e:'27÷0.9=30kVA 是下限；实际再乘余量、就近选大。'}},
  {{q:'PUE 的计算方式是？',o:['IT 能耗 ÷ 总能耗','总能耗 ÷ IT 设备能耗','电费 ÷ 服务器台数','冷量 ÷ 电量'],a:1,e:'PUE 越接近 1 越高效；传统机房 1.8-2.5，优秀 1.2-1.4。'}},
  {{q:'把冷通道温度从 20°C 提到 24°C（仍在合规范围），主要收益是？',o:['越冷越好','显著节能——减少过度制冷是降 PUE 的常用第一招','没有区别','会损坏设备'],a:1,e:'18-27°C 均合规；合适范围内"不过冷"，一年电费差很实在。'}},
  {{q:'气体灭火警报响起（尚未喷放）时应该？',o:['先关完设备再撤','立即撤离——喷放会置换氧气，人在里面会窒息','屏住呼吸继续操作','躲到机柜后面'],a:1,e:'人永远第一；设备等你在安全的地方再想办法。'}}
]}},
room_03: {{t:'机房·03 服务器与存储修炼', q:[
  {{q:'RAID 5 的一次随机写会带来多少次实际磁盘 IO？',o:['1 次','2 次','4 次（读旧数据+读旧校验+写新+写新校验）','6 次'],a:2,e:'这就是数据库更爱 RAID10 的数学原因；RAID6 为 6 次。'}},
  {{q:'为什么大容量盘（8TB 级）慎用 RAID 5？',o:['太贵','重建时要全盘读取，URE 概率可到约 15-20%——重建中再翻车就全灭','速度慢','费电'],a:1,e:'结论：大容量盘用 RAID6（双校验）或 RAID10。'}},
  {{q:'某盘 SMART 显示 C5（待处理扇区）非零，系统仍正常，正确动作是？',o:['等它坏了再说','立即确认备份完好 + 安排更换——不等它坏','反复重启试试','低格修复'],a:1,e:'SMART 告警是"未病"：预防性更换才是专业操作。'}},
  {{q:'服务器带外管理网口的安全要求是？',o:['和业务网共用即可','独立 VLAN、只允许管理终端访问、永不暴露公网','方便就好','不设密码更快'],a:1,e:'带外口被攻破 = 攻击者能"物理接触"服务器，是最坏情况。'}}
]}},
room_04: {{t:'机房·04 部署与自动化修炼', q:[
  {{q:'UEFI 环境下 PXE 引导文件应指向？',o:['pxelinux.0','grubx64.efi 等 .efi 文件','boot.img','无需引导文件'],a:1,e:'PXE 引导分 Legacy BIOS（pxelinux.0）和 UEFI（.efi）两条链，新采购设备基本都是 UEFI。'}},
  {{q:'应答文件（Kickstart）里 root 密码为什么要写哈希？',o:['好看','明文会出现在日志/进程列表里，明文即泄露','省空间','系统要求'],a:1,e:'配置即代码、密码即密钥——永远不让明文离开你的密码管理器。'}},
  {{q:'克隆出 30 台"一模一样"的机器后，上电前必须处理什么？',o:['什么都不用','主机名/IP/机器 ID/SSH 密钥等身份信息','重装系统','换硬盘'],a:1,e:'否则网络冲突（IP 重复）与管理混乱（全叫同一个名字）。'}},
  {{q:'VDI 云桌面的"启动风暴"（全班同时开机）常用解法是？',o:['多买服务器','链接克隆分摊存储 IO + 开机限流/错峰 + 缓存预热','禁用开机','换成 PC'],a:1,e:'启动风暴是 VDI 的经典工程问题——用"分摊+限流+预热"三招化解。'}}
]}},
room_05: {{t:'机房·05 运维与监控修炼', q:[
  {{q:'监控五层模型中，机房管理者直接负责的是哪几层？',o:['第 5 层业务','第 1-3 层（设施/硬件/系统），并理解 4-5 层的关联','只有第 4 层','全部五层都要亲自做'],a:1,e:'打好 1-3 层地基，同时能向"业务影响"方向思考——这是 L3+ 的思维。'}},
  {{q:'RPO 的含义是？',o:['系统可用率','最多容忍丢失多少数据（决定备份频率）','恢复要多久','每秒请求数'],a:1,e:'RPO 管"丢多少"，RTO 管"停多久"——灾难恢复方案的两个靶心。'}},
  {{q:'"没恢复过的备份，不算备份"——这句的意思是？',o:['备份不重要','备份的价值只有在恢复那一刻才被验证，必须定期演练','不用备份','备份越多越好'],a:1,e:'每月/每季抽一个对象实际恢复一次，才敢说"我们有备份"。'}},
  {{q:'容量管理的四维水位是？',o:['电/水/风/火','电力、空间、网络、算力','CPU/内存/磁盘/网络','人/财/物/时'],a:1,e:'四维都画趋势线，70% 警戒、80% 触发扩容规划。'}}
]}},
room_06: {{t:'机房·06 安全与合规修炼', q:[
  {{q:'物理安全五层模型中，最内层（第 5 层）是？',o:['园区周界','机房门口','设备层（带外网隔离/BIOS 密码/机箱锁）','机柜层'],a:2,e:'最内层保护的是"设备本身"——假设前四层都已被突破时的最后防线。'}},
  {{q:'等保检查的本质是什么？',o:['看制度文件写得好不好','查"证据"：记录、日志、检测报告——文件和记录必须对得上','检查设备贵不贵','看有没有买安全产品'],a:1,e:'平时记录的质量 = 检查时的得分；"我们有门禁"必须有门禁记录佐证。'}},
  {{q:'SSD 退役时为什么"覆写"不可靠？',o:['速度太慢','磨损均衡把数据散落在闪存颗粒与预留区，逻辑覆写触达不到全部物理单元','会损坏硬盘','没有原因'],a:1,e:'SSD 正确姿势：全盘加密 + 密钥销毁，或物理销毁。'}},
  {{q:'"厂家工程师"要单独进机房检修，正确处置是？',o:['直接放行给方便','登记 + 核实工单 + 全程陪同——三者缺一不可','拒绝所有外人','让保安跟着就行'],a:1,e:'社会工程是真实威胁；流程不是不信任人，是保护所有人。'}}
]}},
room_07: {{t:'机房·07 应急与实战', q:[
  {{q:'双路市电全断后，第一动作是？',o:['立刻全部关机','确认 UPS 带载状态并立即估算续航——先拿到"我还有多少时间"的数据','打电话给领导','等市电恢复'],a:1,e:'应急第一步永远是"止损+信息"：确认当前状态，拿到决策依据。'}},
  {{q:'机房温度升到 38°C 且还在涨，正确策略是？',o:['等它自己好','主动有序降载（关非关键设备）——比等热宕机安全得多','开大功率风扇吹','关掉监控减少告警'],a:1,e:'被动热宕机可能触发 RAID 重建/数据损坏；主动关机可控、可恢复。'}},
  {{q:'事故复盘的 5 Why 应该问到哪一层？',o:['问两个为什么就够','问到体系/制度层（为什么没防住），不能停在个人失误','问到人为止','不用问为什么'],a:1,e:'人会犯错是既定事实——体系必须防错；停在个人 = 没有改进。'}},
  {{q:'"没演练过的预案 = 废纸"——演练的核心价值是？',o:['完成上级任务','验证预案可行性、暴露空白点、形成肌肉记忆','拍照留档','让大家认识新同事'],a:1,e:'桌面推演（零成本）+ 单点演练 + 全流程演练——三层递进。'}}
]}},
room_08: {{t:'机房·08 职业路线', q:[
  {{q:'在校阶段性价比最高的证书组合是？',o:['能考的全考','软考网络工程师 + 低压电工证（如可考）','只考最贵的','不考证'],a:1,e:'软考有职称/落户价值，低压电工是"懂电、合法动电"的分界线——做机房人都值得。'}},
  {{q:'面试回答行为问题的黄金公式是？',o:['越短越好','STAR：情境→任务→行动→结果','背标准答案','只说结果'],a:1,e:'每道经历题都套 STAR，答案立刻从"聊天"变成"专业汇报"。'}},
  {{q:'证书与项目经历的关系是？',o:['证书最重要','证书是门票，项目经历是座位——面试问的是"你干过什么"','经历不重要','都不重要'],a:1,e:'证书帮你过筛选，项目让你被记住——两手都要，顺序别颠倒。'}},
  {{q:'"懂机房的云计算方向学生"相比纯云方向的差异化优势是？',o:['没有优势','能对"端到端"负责：既懂软件层，也懂云下面的物理底座','工资更低','更会考试'],a:1,e:'设计高可用方案时能同时考虑计算/网络/物理层冗余——这是稀缺的纵深。'}}
]}},
}};

/* ===== Practice lab data ===== */
const LAB_TASKS=[
 {{c:'tutorial_01',t:'Linux 命令大练兵',d:'在 Linux 里完成：建用户、建目录树、改权限、装 Nginx、看日志——全程命令行。',v:'不看资料通过教程第 1 章的 10 题终极大检验',m:30}},
 {{c:'tutorial_01',t:'摔倒了爬起来',d:'故意制造三个故障：rm 删一个文件、权限改成 000、停掉一个服务——然后全部修好。',v:'三种故障都能独立定位并修复',m:20}},
 {{c:'tutorial_02',t:'让手机访问你的网站',d:'搭好 Nginx + 防火墙放行 + 云安全组放行，用手机浏览器打开你的页面。',v:'手机屏幕上出现你的网页',m:30}},
 {{c:'tutorial_02',t:'网络排障三连',d:'用 ping / curl -v / ss 定位一次「网站打不开」，写清楚问题出在哪一层。',v:'能口头解释四层排查法',m:20}},
 {{c:'tutorial_03',t:'systemd 正规军',d:'把自己的一个脚本变成 systemd 服务：自动重启 + 开机自启 + 日志可查。',v:'systemctl status 显示 active，重启机器后服务还在',m:30}},
 {{c:'tutorial_03',t:'数据库小管家',d:'建库建用户授权，做一次 mysqldump 备份，再恢复到新库验证。',v:'恢复后的库数据完整',m:30}},
 {{c:'tutorial_04',t:'自建 CA 发证书',d:'当一次发证机构：建根 CA、签服务证书、用 openssl verify 验证链。',v:'openssl verify 输出 OK',m:40}},
 {{c:'tutorial_04',t:'网站挂上小绿锁',d:'给 Nginx 配 HTTPS + HTTP 自动跳转。',v:'浏览器地址栏出现锁图标',m:30}},
 {{c:'tutorial_05',t:'搭一台 DNS 服务器',d:'装 BIND9，配正反解析，dig 查询全部通过。',v:'dig 正查反查都能返回正确结果',m:40}},
 {{c:'tutorial_05',t:'主从 DNS 实验',d:'两台机器做主从 DNS，停掉主服务器，从服务器继续解析。',v:'主挂了从顶住',m:40}},
 {{c:'tutorial_06',t:'双机负载均衡',d:'两台 Web + 一台 HAProxy，停掉一台后端观察自动剔除。',v:'故障自动转移，用户无感知',m:40}},
 {{c:'tutorial_06',t:'VIP 漂移实验',d:'Keepalived 双机主备，停掉主调度器看 VIP 自动漂移。',v:'curl VIP 持续可用',m:40}},
 {{c:'tutorial_07',t:'故障急诊室',d:'给自己制造 5 个故障（磁盘满/端口占用/权限/服务挂/证书过期），逐个修复并记录。',v:'写下 5 条维修记录',m:60}},
 {{c:'tutorial_07',t:'排障演练场',d:'找一个同学/朋友互相埋雷：改坏对方环境的一条配置让对方修。',v:'对方 10 分钟内找到问题',m:30}},
 {{c:'tutorial_08',t:'建一个小型域',d:'Windows Server 建域 + 建 OU/用户/组 + 另一台机器加域登录。',v:'用域账号登录成功',m:60}},
 {{c:'tutorial_08',t:'组策略三连',d:'配 3 条 GPO：登录横幅、禁用命令提示符、统一环境变量。',v:'gpresult /r 能看到三条策略生效',m:40}},
 {{c:'tutorial_09',t:'写一个巡检脚本',d:'脚本检查 CPU/内存/磁盘/服务状态，输出报告；配成每天定时运行。',v:'第二天查看巡检日志',m:40}},
 {{c:'tutorial_09',t:'一键部署脚本',d:'把「装 Nginx + 配站点 + 放行防火墙」写成一个脚本，一条命令完成。',v:'脚本在干净机器上跑通',m:40}},
 {{c:'tutorial_10',t:'容器化你的应用',d:'写 Dockerfile 打包一个自己的应用，构建镜像并运行。',v:'docker run 后能访问',m:40}},
 {{c:'tutorial_10',t:'Compose 两件套',d:'用 docker-compose 一次拉起 Nginx + MySQL，数据卷持久化。',v:'删容器重建后数据还在',m:40}},
 {{c:'tutorial_11',t:'应用上 K8s',d:'在 minikube/EKS 部署 3 副本应用 + Service + 自愈实验。',v:'删掉一个 Pod 自动补回',m:60}},
 {{c:'tutorial_11',t:'K8s 排障三件套',d:'故意制造 ImagePullBackOff / CrashLoop / Pending 三种故障并用 describe+logs 定位。',v:'三种故障都能讲出根因',m:40}},
 {{c:'tutorial_12',t:'云上第一台服务器',d:'（谨慎：会产生少量费用）AWS 开一台 EC2，配安全组，部署网站，然后销毁。',v:'部署成功+费用回零',m:60}},
 {{c:'tutorial_12',t:'云架构搭建',d:'VPC 公私子网 + ALB + ASG 自动伸缩 + 告警。',v:'压测触发自动扩容',m:90}},
 {{c:'tutorial_13',t:'Ansible 一键配十台',d:'用 Ansible 给 2 台以上服务器批量装 Nginx 并统一配置。',v:'ansible-playbook 跑两遍 changed=0（幂等）',m:40}},
 {{c:'tutorial_13',t:'Terraform 建资源',d:'用 Terraform 从零创建一台云服务器并销毁。',v:'init/plan/apply/destroy 全流程走通',m:60}},
 {{c:'tutorial_14',t:'监控仪表盘',d:'装 Prometheus+Grafana，做出能看到 CPU/内存/磁盘的仪表盘。',v:'Grafana 里图表实时刷新',m:60}},
 {{c:'tutorial_14',t:'告警实战',d:'配一条「CPU>80% 持续5分钟」告警，用压测工具触发它。',v:'告警从 OK 变 Firing',m:40}},
 {{c:'tutorial_15',t:'服务器武装',d:'SSH 加固（禁 root+密钥登录）+ fail2ban + 防火墙最小放行。',v:'新开终端验证仍能登录，扫描端口只剩 22/80/443',m:40}},
 {{c:'tutorial_15',t:'安全体检报告',d:'按教程第 15 章的检查表给自己的服务器做一次完整体检并打分。',v:'产出体检报告（至少 10 项）',m:40}},
 {{c:'tutorial_16',t:'真题裸做',d:'选一份韩国真题（题面 korea-zh 里的题面），限时 4 小时裸做，然后对照评分标准自评。',v:'失分表 ≥10 条',m:240}},
 {{c:'tutorial_16',t:'失分清零',d:'把上一次真题裸做的所有失分点逐个攻克，重做一遍。',v:'重做得分提升 30% 以上',m:120}},
 {{c:'tutorial_17',t:'机房巡检报告',d:'按第 17 章的日检清单模板，给一台服务器（或训练场节点 wsarena sh srv1）做一次完整巡检，产出书面报告。',v:'报告覆盖清单全部项目，至少发现/确认 1 个改进点',m:40}},
 {{c:'tutorial_17',t:'RAID 降级与重建实验',d:'用 mdadm 把几块虚拟盘做成 RAID1/RAID5，模拟一块盘故障，观察降级→换盘→重建全过程。',v:'能讲出降级和重建时的状态变化与风险',m:60}},
 {{c:'tutorial_17',t:'搭一台 PXE 装机服务器',d:'用 dnsmasq+HTTP 搭 PXE 服务器，用一台虚拟机做客户端完成一次全自动安装。',v:'客户端无人值守装完系统',m:90}},
 {{c:'room_00',t:'画出你的机房全景图',d:'凭记忆画出 00 篇的"机房管理知识树"（7 大块），对照原文补漏。',v:'7 大块全部画对，标出自己最弱的 2 块',m:20}},
 {{c:'room_01',t:'定级与差距分析',d:'完成 01 篇的 12 条快速自测，写下：当前级别 + 3 个待补能力 + 本季度目标。',v:'书面定级结论 + 3 个具体待补项',m:30}},
 {{c:'room_02',t:'电力与制冷计算书',d:'按 02 篇方法，为"20 台服务器 + 4 台网络设备"的机房完成：UPS 容量、电池需求、精密空调显冷量三项计算。',v:'计算书能给别人讲通（含每步依据）',m:60}},
 {{c:'room_03',t:'磁盘健康体检',d:'对任意一台机器跑 smartctl 全盘体检，解读关键属性，写一份"还能用多久"的判断。',v:'产出一页体检结论（含风险盘标记）',m:30}},
 {{c:'room_04',t:'PXE 最小实现',d:'用虚拟机搭 dnsmasq+httpd 最小 PXE，另一台 VM 网络启动进入引导菜单。',v:'客户端能从网络启动进入引导菜单',m:90}},
 {{c:'room_05',t:'综合巡检脚本 + cron',d:'写 ≥5 项检查的巡检脚本（时间/磁盘/服务/网络/日志），配置每天定时运行并留档。',v:'脚本连跑正常，日志有历史对比',m:40}},
 {{c:'room_06',t:'出入管理制度',d:'给自己熟悉的机房写一份《出入管理制度》（申请/陪同/记录/违规处理），500 字内可张贴。',v:'制度含 4 要素且能回答"外来工程师单人来怎么办"',m:30}},
 {{c:'room_07',t:'场景卡本地化 + 推演',d:'把 07 篇的 3 张场景卡改成"本地版"（真实电话/位置/设备名），找一个人做一次桌面推演。',v:'推演记录 1 份：发现 ≥2 个空白点',m:40}},
 {{c:'room_08',t:'面试十连',d:'从 08 篇面试题库抽 10 题（5 基础+3 场景+2 设计），录音作答，回听打分。',v:'每题能套 STAR 结构答满 60 秒',m:40}}
];
const SIMS=[
 {{id:'mini',t:'⚡ 迷你模拟',dur:30,desc:'3 个基础任务 · 30 分钟 · 体验比赛节奏',tasks:[
  {{t:'部署 Nginx 静态网站',d:'装 Nginx，放一个自定义首页',v:'curl localhost 返回你的页面'}},
  {{t:'创建数据库与用户',d:'建库 appdb + 用户 appuser 并授权',v:'appuser 能查询库里的表'}},
  {{t:'防火墙配置',d:'放行 22/80/443，其余默认拒绝',v:'ufw status 显示三条放行规则'}}
 ]}},
 {{id:'std',t:'🎯 标准模拟',dur:90,desc:'5 个进阶任务 · 90 分钟 · 向省赛看齐',tasks:[
  {{t:'搭建 DNS 服务器',d:'正反解析全部配置正确',v:'dig 正查反查通过'}},
  {{t:'部署 HTTPS 网站',d:'自签证书 + HTTP 跳转 HTTPS',v:'curl -k https 返回页面'}},
  {{t:'两台后端 + 负载均衡',d:'HAProxy 轮询 + 健康检查',v:'停一台后端自动剔除'}},
  {{t:'写备份脚本并配 cron',d:'每天凌晨备份指定目录并保留 7 天',v:'crontab -l 可见任务，手动跑通'}},
  {{t:'容器化部署应用',d:'Dockerfile 构建 + 运行 + 数据卷',v:'docker ps 可见容器'}}
 ]}},
 {{id:'full',t:'🏆 全真模拟（4 小时）',dur:240,desc:'8 个任务 · 4 小时 · 世界赛 Module 风格',tasks:[
  {{t:'系统基础',d:'建用户/组、sudo 授权、SSH 密钥登录、时间同步',v:'30 分钟内完成并验证'}},
  {{t:'DNS 主从 + 双栈',d:'正反解析 + IPv6 + 主从复制',v:'主挂从顶'}},
  {{t:'Web 服务',d:'Nginx + 虚拟主机 + HTTPS + 反向代理',v:'两个域名各返回不同站点'}},
  {{t:'目录服务',d:'OpenLDAP 建 OU 与用户，客户端可登录',v:'ldapsearch 能查到用户'}},
  {{t:'文件共享',d:'Samba 公共/内部共享权限配置',v:'权限矩阵全部符合要求'}},
  {{t:'高可用',d:'HAProxy + Keepalived 双机',v:'VIP 漂移实验通过'}},
  {{t:'自动化',d:'Ansible 批量配置所有节点',v:'剧本幂等（跑两遍 changed=0）'}},
  {{t:'终检',d:'对照评分标准逐项自检全部服务',v:'出一张自检清单'}}
 ]}}
];
/* ===== end lab data ===== */

/* ===== Quiz system ===== */
function getQuizScores(){{ try{{ return JSON.parse(localStorage.getItem('wg.quiz')||'{{}}'); }}catch(e){{ return {{}}; }} }}
function openQuizCenter(){{
  const v=document.getElementById('quizView'); if(!v) return;
  v.classList.add('on');
  renderQuizCenter();
}}
function closeQuiz(){{ const v=document.getElementById('quizView'); if(v) v.classList.remove('on'); }}
function renderQuizCenter(){{
  document.getElementById('quizTitle').textContent='📝 考试中心';
  document.getElementById('quizProgress').textContent='';
  const saved=getQuizScores();
  let h='';
  h+='<div class="qz-item"><h4>🏆 综合大考</h4><p style="color:var(--dim);font-size:12.5px;margin:4px 0 0">从全部题库随机抽 20 题，检验整体水平</p><button class="qz-btn" data-quiz="__all__">开始大考</button></div>';
  h+='<div class="qz-item"><h4>📚 章节测验</h4>';
  const ks=Object.keys(QUIZ_BANK);
  for(let x=0;x<ks.length;x++){{
    const k=ks[x], b=QUIZ_BANK[k], s=saved[k];
    h+='<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line2)">'
      +'<div style="flex:1;font-size:13.5px">'+b.t+(s?'<span style="color:#30d158;font-size:11px"> · 最佳 '+s.best+'/'+s.total+'</span>':'')+'</div>'
      +'<button class="qz-btn sm" data-quiz="'+k+'">测验</button></div>';
  }}
  h+='</div>';
  document.getElementById('quizBody').innerHTML=h;
}}
let QZ=null;
function startQuiz(id){{
  let qs, title;
  if(id==='__all__'){{
    const all=[];
    const ks=Object.keys(QUIZ_BANK);
    for(let x=0;x<ks.length;x++){{
      const arr=QUIZ_BANK[ks[x]].q;
      for(let y=0;y<arr.length;y++){{ all.push(Object.assign({{}},arr[y],{{__quiz:'__all__'}})); }}
    }}
    for(let i=all.length-1;i>0;i--){{ const j=Math.floor(Math.random()*(i+1)); const t=all[i]; all[i]=all[j]; all[j]=t; }}
    qs=all.slice(0,20);
    title='🏆 综合大考（'+qs.length+' 题）';
  }} else {{
    const b=QUIZ_BANK[id]; if(!b) return;
    qs=b.q.map(function(q){{ return Object.assign({{}},q,{{__quiz:id}}); }});
    title='📝 '+b.t;
  }}
  QZ={{id:id,title:title,qs:qs,i:0,correct:0,answers:[],answered:false}};
  const v=document.getElementById('quizView'); if(v) v.classList.add('on');
  renderQuizQ();
}}
function renderQuizQ(){{
  if(!QZ) return;
  if(QZ.i>=QZ.qs.length){{ renderQuizResult(); return; }}
  const q=QZ.qs[QZ.i];
  document.getElementById('quizTitle').textContent=QZ.title;
  document.getElementById('quizProgress').textContent=(QZ.i+1)+' / '+QZ.qs.length;
  let h='<div class="qz-item"><h4>Q'+(QZ.i+1)+'. '+q.q+'</h4>';
  for(let x=0;x<q.o.length;x++){{
    h+='<button class="qz-opt" id="qo'+x+'" data-qi="'+x+'">'+String.fromCharCode(65+x)+'. '+q.o[x]+'</button>';
  }}
  h+='<div class="qz-exp" id="qzExp">💡 '+q.e+'</div>';
  h+='<button class="qz-btn" id="qzNext" style="display:none" data-qnext="1">'+(QZ.i===QZ.qs.length-1?'查看结果 →':'下一题 →')+'</button>';
  h+='</div>';
  document.getElementById('quizBody').innerHTML=h;
  QZ.answered=false;
}}
function answerQuiz(idx){{
  if(!QZ || QZ.answered) return;
  QZ.answered=true;
  const q=QZ.qs[QZ.i];
  const ok=idx===q.a;
  if(ok) QZ.correct++;
  QZ.answers.push({{idx:idx,ok:ok}});
  for(let i=0;i<q.o.length;i++){{
    const el=document.getElementById('qo'+i); if(!el) continue;
    if(i===q.a) el.classList.add('right');
    else if(i===idx && !ok) el.classList.add('wrong');
  }}
  document.getElementById('qzExp').style.display='block';
  document.getElementById('qzNext').style.display='inline-block';
  if(ok && navigator.vibrate){{ try{{navigator.vibrate(15);}}catch(e){{}} }}
}}
function nextQuiz(){{ if(!QZ) return; QZ.i++; renderQuizQ(); }}
function renderQuizResult(){{
  const total=QZ.qs.length, cc=QZ.correct;
  const pct=Math.round(cc/total*100);
  const gain=cc*5+(cc===total?20:0)+5;
  const sv=getQuizScores();
  const pk=QZ.id;
  const prev=sv[pk];
  if(!prev || cc>prev.best) sv[pk]={{best:cc,total:total}};
  try{{ localStorage.setItem('wg.quiz',JSON.stringify(sv)); }}catch(e){{}}
  try{{
    GROW.quizCount=(GROW.quizCount||0)+1;
    addXP(gain,'测验得分');
    unlockBadge('quiz1');
    if(cc===total) unlockBadge('perfect');
    if(GROW.quizCount>=10) unlockBadge('qmaster');
    saveGrow();
  }}catch(e){{}}
  const face=pct>=90?'🏆':(pct>=75?'🎉':(pct>=60?'👍':'📖'));
  const grade=pct>=90?'太强了！':(pct>=75?'很棒！':(pct>=60?'及格，继续加油':'再复习一下对应章节吧'));
  let h='<div class="qz-item" style="text-align:center"><div style="font-size:42px">'+face+'</div>'
    +'<h3 style="margin:8px 0;color:#ffd60a;font-size:19px">'+cc+' / '+total+'（'+pct+'%）</h3>'
    +'<p style="color:var(--dim);font-size:13px">'+grade+'　获得 +'+gain+' XP</p>'
    +'<button class="qz-btn" data-quiz="'+QZ.id+'">🔄 再考一次</button> '
    +'<button class="qz-btn" style="background:rgba(255,255,255,.1)" onclick="renderQuizCenter()">返回考试中心</button></div>';
  const wrongs=[];
  for(let i=0;i<QZ.qs.length;i++){{ if(!QZ.answers[i].ok) wrongs.push({{q:QZ.qs[i],my:QZ.answers[i].idx}}); }}
  if(wrongs.length){{
    h+='<div class="qz-item"><h4>📋 错题回顾（'+wrongs.length+' 题）</h4>';
    for(let i=0;i<wrongs.length;i++){{
      const q=wrongs[i].q, my=wrongs[i].my;
      h+='<div style="margin:10px 0;padding:12px;background:rgba(255,69,58,.07);border-radius:12px">'
        +'<div style="font-size:13.5px;font-weight:700;line-height:1.6">'+q.q+'</div>'
        +'<div style="font-size:12.5px;color:#ff7b72;margin-top:6px">你选了：'+String.fromCharCode(65+my)+'. '+q.o[my]+'</div>'
        +'<div style="font-size:12.5px;color:#30d158">正确答案：'+String.fromCharCode(65+q.a)+'. '+q.o[q.a]+'</div>'
        +'<div style="font-size:12px;color:var(--dim);margin-top:4px">💡 '+q.e+'</div></div>';
    }}
    h+='</div>';
  }}
  document.getElementById('quizTitle').textContent=QZ.title+' · 成绩单';
  document.getElementById('quizProgress').textContent=cc+'/'+total;
  document.getElementById('quizBody').innerHTML=h;
}}
/* ===== end quiz ===== */
/* ===== Practice / Sim engine ===== */
function getLabDone(){{ try{{ return JSON.parse(localStorage.getItem('wg.lab')||'{{}}'); }}catch(e){{ return {{}}; }} }}
function getSims(){{ try{{ return JSON.parse(localStorage.getItem('wg.sims')||'[]'); }}catch(e){{ return []; }} }}
function openLabCenter(){{ const v=document.getElementById('labView'); if(!v) return; v.classList.add('on'); renderLabCenter(); }}
function closeLab(){{ const v=document.getElementById('labView'); if(v) v.classList.remove('on'); }}
function renderLabCenter(){{
  SIM=null;
  document.getElementById('labTitle').textContent='⚒ 实战中心';
  const done=getLabDone();
  const sims=getSims();
  let h='';
  h+='<div class="qz-item"><h4>🏟 世赛模拟</h4><p style="color:var(--dim);font-size:12.5px;margin:4px 0 0">全真节奏：选套餐 → 倒计时开始 → 在自己机器上做题，完成一项勾一项</p>';
  for(let i=0;i<SIMS.length;i++){{
    const s=SIMS[i];
    h+='<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line2)">'
      +'<div style="flex:1"><div style="font-size:14px;font-weight:700">'+s.t+'</div><div style="font-size:11.5px;color:var(--dim);margin-top:2px">'+s.desc+'</div></div>'
      +'<button class="qz-btn sm" data-sim="'+s.id+'">开始</button></div>';
  }}
  if(sims.length){{
    h+='<div style="margin-top:10px;font-size:11.5px;color:var(--dim2)">最近成绩：';
    for(let i=0;i<Math.min(sims.length,5);i++){{ const r=sims[i]; h+='　'+r.t+' '+r.done+'/'+r.total; }}
    h+='</div>';
  }}
  h+='</div>';
  h+='<div class="qz-item"><h4>🔬 实操任务<span style="color:#30d158;font-size:11.5px;margin-left:8px">每个 +30 XP</span></h4><p style="color:var(--dim);font-size:12.5px;margin:4px 0 0">在你的电脑/虚拟机上真实动手做，做完点一下卡片勾选</p>';
  const chs=Object.keys(QUIZ_BANK);
  for(let ci=0;ci<chs.length;ci++){{
    const ch=chs[ci];
    h+='<div style="margin-top:14px;font-size:12px;color:var(--dim);font-weight:700">'+QUIZ_BANK[ch].t+'</div>';
    for(let i=0;i<LAB_TASKS.length;i++){{
      if(LAB_TASKS[i].c!==ch) continue;
      const d=done[i];
      h+='<div class="lab-card'+(d?' labdone':'')+'" data-lab="'+i+'">'
        +'<div style="font-size:13.5px;font-weight:700">'+(d?'✅ ':'⬜ ')+LAB_TASKS[i].t+' <span style="color:var(--dim2);font-size:11px">'+LAB_TASKS[i].m+'min</span></div>'
        +'<div style="font-size:12px;color:var(--dim);margin-top:3px;line-height:1.6">'+LAB_TASKS[i].d+'</div>'
        +'<div style="font-size:11.5px;color:#7ef0c0;margin-top:3px">🎯 验收：'+LAB_TASKS[i].v+'</div>'
        +'</div>';
    }}
  }}
  h+='</div>';
  document.getElementById('labBody').innerHTML=h;
}}
function getLabRewarded(){{ try{{ return JSON.parse(localStorage.getItem('wg.labXp')||'{{}}'); }}catch(e){{ return {{}}; }} }}
function toggleLab(i){{
  const done=getLabDone();
  if(done[i]){{ delete done[i]; }}
  else {{
    done[i]=1;
    const rw=getLabRewarded();
    if(!rw[i]){{
      rw[i]=1;
      try{{ localStorage.setItem('wg.labXp',JSON.stringify(rw)); }}catch(e){{}}
      const n=Object.keys(done).length;
      if(navigator.vibrate){{ try{{navigator.vibrate(12);}}catch(e){{}} }}
      try{{
        addXP(30,'实操完成');
        if(n===1) unlockBadge('lab1');
        if(n>=10) unlockBadge('lab10');
      }}catch(e){{}}
    }}
  }}
  try{{ localStorage.setItem('wg.lab',JSON.stringify(done)); }}catch(e){{}}
  renderLabCenter();
}}
let SIM=null;
function fmtT(sec){{ const m=Math.floor(sec/60), s2=sec%60; return (m<10?'0':'')+m+':'+(s2<10?'0':'')+s2; }}
function startSim(id){{
  let s=null;
  for(let i=0;i<SIMS.length;i++){{ if(SIMS[i].id===id) s=SIMS[i]; }}
  if(!s) return;
  SIM={{id:id,t:s.t,dur:s.dur,tasks:s.tasks,done:{{}},left:s.dur*60,timer:null}};
  document.getElementById('labTitle').textContent='🏟 '+s.t;
  renderSimRun();
  if(SIM.timer) clearInterval(SIM.timer);
  SIM.timer=setInterval(function(){{
    if(!SIM) return;
    SIM.left--;
    const el=document.getElementById('simClock');
    if(el) el.textContent=fmtT(Math.max(0,SIM.left));
    if(SIM.left<=0){{ clearInterval(SIM.timer); SIM.timer=null; finishSim(true); }}
  }},1000);
  if(navigator.vibrate){{ try{{navigator.vibrate(20);}}catch(e){{}} }}
}}
function renderSimRun(){{
  if(!SIM) return;
  const t=SIM;
  const dn=Object.keys(t.done).length;
  let h='<div class="qz-item" style="text-align:center"><div id="simClock" style="font-size:42px;font-weight:800;color:#ffd60a">'+fmtT(t.left)+'</div>'
   +'<p style="color:var(--dim);font-size:12px;margin:5px 0 0">在你的电脑/虚拟机上完成，做一项勾一项</p></div>';
  h+='<div class="qz-item"><h4>📋 任务清单（'+dn+'/'+t.tasks.length+'）</h4>';
  for(let i=0;i<t.tasks.length;i++){{
    const k=t.tasks[i], d=t.done[i];
    h+='<div class="lab-card'+(d?' labdone':'')+'" data-simt="'+i+'">'
      +'<div style="font-size:13.5px;font-weight:700">'+(d?'✅ ':'⬜ ')+k.t+'</div>'
      +'<div style="font-size:12px;color:var(--dim);margin-top:3px;line-height:1.6">'+k.d+'</div>'
      +'<div style="font-size:11.5px;color:#7ef0c0;margin-top:3px">🎯 '+k.v+'</div>'
      +'</div>';
  }}
  h+='<button class="qz-btn" style="width:100%;margin-top:12px" data-simfin="1">⏹ 结束模拟并结算</button>'
   +'<button class="qz-btn" style="width:100%;margin-top:8px;background:rgba(255,255,255,.1)" data-simquit="1">放弃这次模拟</button>';
  h+='</div>';
  document.getElementById('labBody').innerHTML=h;
}}
function toggleSimTask(i){{
  if(!SIM) return;
  if(SIM.done[i]) delete SIM.done[i]; else SIM.done[i]=1;
  if(navigator.vibrate){{ try{{navigator.vibrate(10);}}catch(e){{}} }}
  renderSimRun();
}}
function finishSim(timeout){{
  if(!SIM) return;
  if(SIM.timer){{ clearInterval(SIM.timer); SIM.timer=null; }}
  const doneN=Object.keys(SIM.done).length, total=SIM.tasks.length;
  const gain=doneN*20+(doneN===total?50:0);
  const rec={{t:SIM.t,done:doneN,total:total,ts:Date.now()}};
  const sims=getSims(); sims.unshift(rec);
  try{{ localStorage.setItem('wg.sims',JSON.stringify(sims.slice(0,10))); }}catch(e){{}}
  try{{ addXP(gain, timeout?'时间到':'模拟结算'); unlockBadge('sim1'); saveGrow(); }}catch(e){{}}
  const pct=Math.round(doneN/total*100);
  let h='<div class="qz-item" style="text-align:center"><div style="font-size:42px">'+(pct>=100?'🏆':(pct>=60?'🎉':'💪'))+'</div>'
   +'<h3 style="margin:8px 0;color:#ffd60a;font-size:19px">完成 '+doneN+' / '+total+' 项</h3>'
   +(timeout?'<p style="color:#ff9f0a;font-size:13px;margin:4px 0">⏰ 时间到！</p>':'')
   +'<p style="color:var(--dim);font-size:13px;margin:6px 0 0">获得 +'+gain+' XP'+(doneN===total?'（全勤奖励 +50）':'')+'</p>'
   +'<button class="qz-btn" style="background:linear-gradient(150deg,#30d158,#1a9e42);width:100%;margin-top:14px" data-rest="1">☕ 休息 5 分钟</button>'
   +'<button class="qz-btn" style="width:100%;margin-top:8px" data-sim="'+SIM.id+'">🔄 再来一次</button>'
   +'<button class="qz-btn" style="width:100%;margin-top:8px;background:rgba(255,255,255,.1)" onclick="renderLabCenter()">返回实战中心</button></div>';
  const sid=SIM.id;
  SIM=null;
  document.getElementById('labTitle').textContent='🏟 模拟结算';
  document.getElementById('labBody').innerHTML=h;
}}
function startRest(){{
  const rv=document.getElementById('restView'); if(!rv) return;
  rv.classList.add('on');
  let left=300;
  const el=document.getElementById('restClock');
  el.textContent=fmtT(left);
  document.getElementById('restMsg').textContent='站起来走动一下，看看远处，喝口水';
  if(window._restT) clearInterval(window._restT);
  window._restT=setInterval(function(){{
    left--;
    el.textContent=fmtT(Math.max(0,left));
    if(left<=0){{
      clearInterval(window._restT); window._restT=null;
      document.getElementById('restMsg').textContent='☕ 休息结束，回来继续吧！';
      if(navigator.vibrate){{ try{{navigator.vibrate([40,80,40,80,40]);}}catch(e){{}} }}
    }}
  }},1000);
}}
function stopRest(){{ const rv=document.getElementById('restView'); if(rv) rv.classList.remove('on'); if(window._restT){{ clearInterval(window._restT); window._restT=null; }} }}
/* ===== end lab ===== */
function markRead(id){{
  if(id==='__home__') return;
  try{{
    const rd=JSON.parse(localStorage.getItem('wg.read')||'{{}}');
    const isNew=!rd[id];
    rd[id]=1; localStorage.setItem('wg.read',JSON.stringify(rd));
    let hist=JSON.parse(localStorage.getItem('wg.hist')||'[]');
    hist=hist.filter(function(x){{return x!==id;}}); hist.unshift(id); hist=hist.slice(0,8);
    localStorage.setItem('wg.hist',JSON.stringify(hist));
    const it=document.querySelector('.nav-item[data-doc="'+id+'"]');
    if(it) it.classList.add('read');
    growthOnRead(id, isNew);
  }}catch(e){{}}
}}
function fillHome(){{
  renderGrowth();
  const slot=document.getElementById('recent-slot'); if(!slot) return;
  try{{
    const rd=JSON.parse(localStorage.getItem('wg.read')||'{{}}');
    const n=Object.keys(rd).length; const total=Object.keys(DOCS).length-1;
    let hist=JSON.parse(localStorage.getItem('wg.hist')||'[]').filter(function(k){{return DOCS[k];}});
    let h='';
    if(n>0) h+='<p style="color:var(--dim);margin:10px 0 0">📚 已读 <b>'+n+'</b> / '+total+' 篇</p>';
    if(hist.length) h+='<h3>🕘 最近阅读</h3><div class="home-grid">'+hist.slice(0,6).map(function(k){{return '<button class="home-card small" data-doclink="'+k+'"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+DOCS[k].t.slice(0,30)+'</b></button>';}}).join('')+'</div>';
    slot.innerHTML=h;
  }}catch(e){{}}
}}
let tocItems=[];
function buildToc(){{
  const hs=document.querySelectorAll('#content h2, #content h3');
  tocItems=Array.prototype.slice.call(hs);
  const b=document.getElementById('tocBtn');
  if(b) b.style.display = tocItems.length>=4 ? 'flex' : 'none';
  const p=document.getElementById('tocPanel'); if(p) p.style.display='none';
}}
function toggleToc(){{
  const p=document.getElementById('tocPanel'); if(!p) return;
  if(p.style.display==='block'){{ p.style.display='none'; return; }}
  let h='';
  tocItems.forEach(function(el,i){{ h+='<button class="'+(el.tagName==='H3'?'lv3':'')+'" data-toc="'+i+'">'+el.textContent.slice(0,34)+'</button>'; }});
  p.innerHTML=h||'<div style="padding:8px;color:var(--dim);font-size:12px">本篇无目录</div>';
  p.style.display='block';
}}
function quickSearch(){{ const s=document.getElementById('side'); if(!s.classList.contains('open')) openDrawer(); setTimeout(function(){{ const q=document.getElementById('q'); if(q) q.focus(); }}, 240); }}
let scrollSaveT=null;
function savePos(){{ try{{ if(!current||current==='__home__')return; const p=JSON.parse(localStorage.getItem('wg.pos')||'{{}}'); p[current]=Math.round(window.scrollY); const ks=Object.keys(p); if(ks.length>80){{ ks.slice(0,20).forEach(function(k){{ delete p[k]; }}); }} localStorage.setItem('wg.pos',JSON.stringify(p)); }}catch(e){{}} }}
document.getElementById('nav').addEventListener('click',e=>{{
  const b=e.target.closest('.nav-item');
  if(b) show(b.dataset.doc);
}});
let lastTouchAct=0;
function act(el){{
  if(!el) return;
  const qo=el.closest('[data-qi]');
  if(qo){{ answerQuiz(+qo.dataset.qi); return; }}
  const qn=el.closest('[data-qnext]');
  if(qn){{ nextQuiz(); return; }}
  const qzEl=el.closest('[data-quiz]');
  if(qzEl){{ startQuiz(qzEl.dataset.quiz); return; }}
  const lb=el.closest('[data-lab]');
  if(lb){{ toggleLab(+lb.dataset.lab); return; }}
  const sb=el.closest('[data-simt]');
  if(sb){{ toggleSimTask(+sb.dataset.simt); return; }}
  const s2=el.closest('[data-simfin]');
  if(s2){{ finishSim(false); return; }}
  const s3=el.closest('[data-simquit]');
  if(s3){{ SIM=null; renderLabCenter(); return; }}
  const s4=el.closest('[data-sim]');
  if(s4){{ startSim(s4.dataset.sim); return; }}
  const rs=el.closest('[data-rest]');
  if(rs){{ startRest(); return; }}
  const tocEl=el.closest('[data-toc]');
  if(tocEl){{ const i=+tocEl.dataset.toc; if(tocItems[i]){{ try{{ tocItems[i].scrollIntoView({{behavior:'smooth',block:'start'}}); }}catch(e){{}} }} const tp=document.getElementById('tocPanel'); if(tp) tp.style.display='none'; return; }}
  if(el.classList && el.classList.contains('group-head')){{ toggleGroup(el); return; }}
  if(el.dataset && el.dataset.doclink){{ show(el.dataset.doclink); return; }}
  if(el.dataset && el.dataset.doc){{ show(el.dataset.doc); return; }}
}}
document.addEventListener('click',e=>{{
  const hit=e.target.closest('[data-qi], [data-qnext], [data-toc], [data-doclink], [data-quiz], [data-lab], [data-sim], [data-simt], [data-simfin], [data-simquit], [data-rest]');
  if(!hit) return;
  if(Date.now()-lastTouchAct<600) return;
  e.preventDefault();
  act(hit);
}});
/* --- direct touch handling: never lose taps to scroll/animation --- */
let tx0=0, ty0=0, tT0=0;
document.addEventListener('touchstart',function(e){{
  const t=e.touches[0]; if(t){{ tx0=t.clientX; ty0=t.clientY; tT0=Date.now(); }}
}},{{passive:true}});
document.addEventListener('touchend',function(e){{
  const t=e.changedTouches[0]; if(!t) return;
  const dx=t.clientX-tx0, dy=t.clientY-ty0;
  if(Math.abs(dx)>14 || Math.abs(dy)>14) return;   /* scroll, not tap */
  if(Date.now()-tT0>900) return;                    /* long press */
  const hit=e.target.closest('[data-qi], [data-qnext], [data-toc], [data-doclink], [data-quiz], [data-lab], [data-sim], [data-simt], [data-simfin], [data-simquit], [data-rest], .nav-item, .group-head');
  if(!hit) return;
  lastTouchAct=Date.now();
  try{{ e.preventDefault(); }}catch(err){{}}
  act(hit);
}},{{passive:false}});
document.addEventListener('keydown',function(e){{
  const tag=(e.target.tagName||'').toLowerCase();
  if(tag==='input'||tag==='textarea'){{ if(e.key==='Escape'){{ e.target.blur(); const rb=document.getElementById('results'); if(rb) rb.style.display='none'; }} return; }}
  if(e.key==='/'){{ e.preventDefault(); quickSearch(); return; }}
  if(e.key==='ArrowLeft'){{ const i=ORDER.indexOf(current); if(i>0) show(ORDER[i-1]); }}
  if(e.key==='ArrowRight'){{ const i=ORDER.indexOf(current); if(i>=0&&i<ORDER.length-1) show(ORDER[i+1]); }}
  if(e.key==='Escape'){{ const p=document.getElementById('tocPanel'); if(p) p.style.display='none'; }}
}});
function toggleGroup(el){{
  if(navigator.vibrate){{ try{{navigator.vibrate(6)}}catch(e){{}} }}
  const grp=el.parentElement;
  if(grp.classList.contains('closed')){{
    grp.classList.remove('closed'); buildGroupBody(grp);
    setTimeout(function(){{ try{{ grp.scrollIntoView({{block:'start'}}); }}catch(e){{}} }}, 50);
  }}
  else {{ grp.classList.add('closed'); }}
  try{{ const gs=JSON.parse(localStorage.getItem('wg.groups')||'{{}}'); gs[grp.dataset.g]=grp.classList.contains('closed'); localStorage.setItem('wg.groups',JSON.stringify(gs)); }}catch(e){{}}
}}
function buildGroupBody(grp){{
  const body=grp.querySelector('.group-body');
  if(!body||body.dataset.built==='1') return;
  const ids=BY_KEY[grp.dataset.g]||[];
  let rd={{}}; try{{ rd=JSON.parse(localStorage.getItem('wg.read')||'{{}}'); }}catch(e){{}}
  let h='';
  for(let i=0;i<ids.length;i++){{
    const k=ids[i], d=DOCS[k];
    h+='<button class="nav-item'+(rd[k]?' read':'')+'" data-doc="'+k+'"><span class="dot" style="background:'+d.c+'"></span>'+d.t+'<em>'+d.m+'min</em></button>';
  }}
  body.innerHTML=h;
  body.dataset.built='1';
}}
let activeEl=null;
function revealInNav(id){{
  const d=DOCS[id]; if(!d||!d.gk) return;
  const grp=document.querySelector('.nav-group[data-g="'+d.gk+'"]');
  if(!grp) return;
  if(grp.classList.contains('closed')) grp.classList.remove('closed');
  buildGroupBody(grp);
  const it=grp.querySelector('.nav-item[data-doc="'+id+'"]');
  if(it){{ if(activeEl&&activeEl!==it) activeEl.classList.remove('active'); activeEl=it; it.classList.add('active'); try{{ it.scrollIntoView({{block:'nearest'}}); }}catch(e){{}} }}
}}
let drawerToken=0;
function slideSide(toOpen){{
  const s=document.getElementById('side');
  if(!s) return;
  if(window.innerWidth>900) return;   /* desktop: sidebar is static */
  const W=Math.min(window.innerWidth*0.84,320)+40;
  s.style.left = (toOpen ? 0 : -W) + 'px';   /* instant & reliable, no animation dependency */
}}
function resetSearch(){{
  try{{ const q=document.getElementById('q'); if(q){{ q.value=''; if(document.activeElement===q) q.blur(); }} }}catch(e){{}}
  try{{ const rb=document.getElementById('results'); if(rb){{ rb.style.display='none'; rb.innerHTML=''; }} }}catch(e){{}}
}}
function openDrawer(){{ drawerToken++; const tk=drawerToken; document.getElementById('side').classList.add('open'); slideSide(true); document.getElementById('ovl').classList.add('show'); document.body.classList.add('drawer-open'); document.body.style.overflow='hidden'; if(navigator.vibrate){{ try{{navigator.vibrate(8)}}catch(e){{}} }}
  setTimeout(function(){{
    if(tk!==drawerToken) return;
    try{{
      if(current && current!=='__home__'){{
        const d=DOCS[current];
        if(d && d.gk){{
          const grp=document.querySelector('.nav-group[data-g="'+d.gk+'"]');
          if(grp){{ if(grp.classList.contains('closed')) grp.classList.remove('closed'); buildGroupBody(grp); }}
          const it=document.querySelector('.nav-item[data-doc="'+current+'"]');
          const nav=document.getElementById('nav');
          if(it && nav){{ const r=it.getBoundingClientRect(), nr=nav.getBoundingClientRect(); if(r.top<nr.top+60 || r.bottom>nr.bottom-40){{ nav.scrollTop += (r.top-nr.top)-100; }} }}
        }}
      }}
    }}catch(e){{}}
  }}, 380);
}}
function closeDrawer(){{ drawerToken++; slideSide(false); document.getElementById('side').classList.remove('open'); document.getElementById('ovl').classList.remove('show'); document.body.classList.remove('drawer-open'); document.body.style.overflow=''; resetSearch(); if(navigator.vibrate){{ try{{navigator.vibrate(8)}}catch(e){{}} }} }}
function toggleDrawer(){{ const s=document.getElementById('side'); if(s.classList.contains('open')) closeDrawer(); else openDrawer(); }}
(function(){{
  const side=document.getElementById('side');
  side.addEventListener('click',function(e){{
    const rb=document.getElementById('results');
    if(!rb || rb.style.display!=='block') return;
    if(e.target.closest('#results') || e.target.closest('.search')) return;
    resetSearch();
  }});
  let sx=0,sy=0,st=0;
  side.addEventListener('touchstart',function(e){{ const t=e.touches[0]; sx=t.clientX; sy=t.clientY; st=Date.now(); }},{{passive:true}});
  side.addEventListener('touchend',function(e){{ if(!side.classList.contains('open'))return; const t=e.changedTouches[0]; const dx=t.clientX-sx, dy=t.clientY-sy, dt=Date.now()-st; if(dx<-60&&Math.abs(dx)>Math.abs(dy)*1.4&&dt<500) closeDrawer(); }},{{passive:true}});
  let ex=0,ey=0,et=0,edge=false;
  document.addEventListener('touchstart',function(e){{ const t=e.touches[0]; if(t.clientX<26&&!side.classList.contains('open')){{ ex=t.clientX; ey=t.clientY; et=Date.now(); edge=true; }} }},{{passive:true}});
  document.addEventListener('touchend',function(e){{ if(!edge)return; edge=false; const t=e.changedTouches[0]; const dx=t.clientX-ex, dy=t.clientY-ey; if(dx>60&&Math.abs(dx)>Math.abs(dy)*1.4&&Date.now()-et<500) openDrawer(); }},{{passive:true}});
}})();

function fontStep(d){{
  let cur=parseFloat(localStorage.getItem(LS_FS)||'16');
  cur=Math.min(21,Math.max(13,cur+d));
  localStorage.setItem(LS_FS,cur);
  document.documentElement.style.setProperty('--fs',cur+'px');
}}
function filterNav(q){{ /* lazy nav: filtering handled via results panel */ }}
function hl(text,q){{ const i=text.toLowerCase().indexOf(q); if(i<0) return text; return text.slice(0,i)+'<mark>'+text.slice(i,i+q.length)+'</mark>'+text.slice(i+q.length); }}
function showRecent(){{
  const qv=(document.getElementById('q').value||'').trim();
  if(qv) return;
  try{{
    const hist=JSON.parse(localStorage.getItem('wg.hist')||'[]').filter(function(k){{return DOCS[k];}});
    if(!hist.length) return;
    const box=document.getElementById('results');
    box.innerHTML='<div class="sr-empty" style="font-weight:700;color:var(--dim)">🕘 最近阅读</div>'
      +hist.slice(0,6).map(function(k){{return '<button class="sr-item" data-doclink="'+k+'">'+DOCS[k].t+'<em>'+DOCS[k].g+'</em></button>';}}).join('');
    box.style.display='block';
  }}catch(e){{}}
}}
let st=null;
function smartSearch(q){{
  clearTimeout(st);
  st=setTimeout(function(){{ doResults(q); }}, 350);
}}
function doResults(q){{
  q=(q||'').trim().toLowerCase();
  const box=document.getElementById('results');
  if(!q){{ box.style.display='none'; box.innerHTML=''; return; }}
  const keys=Object.keys(DOCS); const out=[]; const max=25;
  for(let i=0;i<keys.length && out.length<max;i++){{
    const k=keys[i]; if(k==='__home__') continue;
    const d=DOCS[k];
    if(d.t.toLowerCase().indexOf(q)>=0) out.push('<button class="sr-item" data-doclink="'+k+'">📄 '+hl(d.t,q)+'<em>'+d.g+'</em></button>');
  }}
  if(out.length<max){{
    for(let i=0;i<keys.length && out.length<max;i++){{
      const k=keys[i]; if(k==='__home__') continue;
      const d=DOCS[k];
      if(d.t.toLowerCase().indexOf(q)>=0) continue;
      if(d.html && d.html.toLowerCase().indexOf(q)>=0) out.push('<button class="sr-item" data-doclink="'+k+'">🔍 '+d.t+'<em>内容匹配 · '+d.g+'</em></button>');
    }}
  }}
  box.innerHTML = out.length ? out.join('') : '<div class="sr-empty">没有找到匹配的内容</div>';
  box.style.display='block';
}}
window.addEventListener('scroll',()=>{{
  const h=document.documentElement;
  const p=h.scrollTop/(h.scrollHeight-h.clientHeight||1);
  document.getElementById('pbar').style.width=(p*100)+'%';
  const tb=document.getElementById('toTop');
  if(tb) tb.style.display = h.scrollTop>700 ? 'flex' : 'none';
  if(current && current!=='__home__'){{ clearTimeout(scrollSaveT); scrollSaveT=setTimeout(savePos, 500); }}
}});

/* boot */
(function(){{
  let fs=localStorage.getItem(LS_FS); if(fs) document.documentElement.style.setProperty('--fs',parseFloat(fs)+'px');
  try{{ const gs=JSON.parse(localStorage.getItem('wg.groups')||'{{}}'); document.querySelectorAll('.nav-group').forEach(function(g){{ if(g.dataset.g in gs){{ g.classList.toggle('closed', gs[g.dataset.g]); }} if(!g.classList.contains('closed')) buildGroupBody(g); }}); }}catch(e){{}}
  try{{ if(!GROW.last) unlockBadge('first'); checkStreak(); }}catch(e){{}}
  const last=localStorage.getItem(LS_DOC);
  show('__home__');
  if(last && DOCS[last] && last!=='__home__'){{
    const slot=document.getElementById('continue-slot');
    if(slot) slot.innerHTML='<button class="home-card small" data-doclink="'+last+'">▶ 继续上次阅读：'+DOCS[last].t+'</button>';
  }}
  const bt=document.getElementById('boot');
  if(bt){{ bt.style.opacity='0'; setTimeout(function(){{ bt.style.display='none'; }}, 480); }}
}})();
</script>
<div id="xpFloat">+10 XP</div>
<div id="celebrate"><div class="celebrate-card" id="celebrateCard"></div></div>
<div id="restView"><div class="celebrate-card"><div class="big">☕</div><h3>休息一下</h3><div id="restClock" style="font-size:40px;font-weight:800;color:#ffd60a;margin:10px 0">05:00</div><p id="restMsg" style="color:var(--dim);font-size:13px">站起来走动一下，看看远处，喝口水</p><button class="qz-btn" style="margin-top:14px" onclick="stopRest()">回来继续</button></div></div>
<div id="labView">
  <div class="quiz-head">
    <button class="tool-btn" onclick="closeLab()">✕</button>
    <div id="labTitle" style="flex:1;font-weight:700;font-size:15px">实战中心</div>
    <div id="labRight" style="color:var(--dim2);font-size:12px"></div>
  </div>
  <div class="quiz-body" id="labBody"></div>
</div>
<div id="quizView">
  <div class="quiz-head">
    <button class="tool-btn" onclick="closeQuiz()">✕</button>
    <div id="quizTitle" style="flex:1;font-weight:700;font-size:15px">测验</div>
    <div id="quizProgress" style="color:var(--dim2);font-size:12px"></div>
  </div>
  <div class="quiz-body" id="quizBody"></div>
</div>
<button id="toTop" onclick="window.scrollTo({{top:0,behavior:'smooth'}})">↑</button>
<button id="tocBtn" onclick="toggleToc()" title="目录">📑</button>
<div id="tocPanel"></div>
</body>
</html>'''

out = BASE + '/study.html'
open(out, 'w', encoding='utf-8').write(page)
print('written:', out, len(page), 'bytes,', total_docs, 'docs')
