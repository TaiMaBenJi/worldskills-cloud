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
G_SPRINT='sprint'; G_T='tutorial'; G_M='mastery'; G_CS='cs'; G_K='knowledge'; G_I='index'
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
  el.innerHTML = (prev?'<button class="dn-btn" data-doclink="'+prev+'">← '+cut(DOCS[prev].t)+'</button>':'<span style="flex:1"></span>')
   + '<button class="dn-btn home" data-doclink="__home__">🏠</button>'
   + (next?'<button class="dn-btn" data-doclink="'+next+'">'+cut(DOCS[next].t)+' →</button>':'<span style="flex:1"></span>');
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
  {{id:'tut16',e:'📖',n:'教程通关',d:'读完教程全部 16 章'}}
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
    if(m){{ GROW.tut[m[1]]=1; if(Object.keys(GROW.tut).length>=16) unlockBadge('tut16'); }}
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
    for(let i=1;i<=16 && !rec;i++){{
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
    +'</div>';
}}
/* ===== end growth ===== */
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
  const tocEl=el.closest('[data-toc]');
  if(tocEl){{ const i=+tocEl.dataset.toc; if(tocItems[i]){{ try{{ tocItems[i].scrollIntoView({{behavior:'smooth',block:'start'}}); }}catch(e){{}} }} const tp=document.getElementById('tocPanel'); if(tp) tp.style.display='none'; return; }}
  if(el.classList && el.classList.contains('group-head')){{ toggleGroup(el); return; }}
  if(el.dataset && el.dataset.doclink){{ show(el.dataset.doclink); return; }}
  if(el.dataset && el.dataset.doc){{ show(el.dataset.doc); return; }}
}}
document.addEventListener('click',e=>{{
  if(Date.now()-lastTouchAct<600) return;
  const t=e.target.closest('[data-toc]');
  if(t){{ const i=+t.dataset.toc; if(tocItems[i]){{ try{{ tocItems[i].scrollIntoView({{behavior:'smooth',block:'start'}}); }}catch(err){{}} }} const tp=document.getElementById('tocPanel'); if(tp) tp.style.display='none'; return; }}
  const a=e.target.closest('[data-doclink]');
  if(a){{ e.preventDefault(); show(a.dataset.doclink); return; }}
  const g=e.target.closest('.group-head');
  if(g) return;
}});
/* --- direct touch handling: never lose taps to scroll/animation --- */
let tx0=0, ty0=0, tT0=0;
document.addEventListener('touchstart',function(e){{
  const t=e.touches[0]; if(t){{ tx0=t.clientX; ty0=t.clientY; tT0=Date.now(); }}
}},{{passive:true}});
document.addEventListener('touchend',function(e){{
  const t=e.changedTouches[0]; if(!t) return;
  const dx=t.clientX-tx0, dy=t.clientY-ty0;
  if(Math.abs(dx)>14 || Math.abs(dy)>14) return;   /* it was a scroll, not a tap */
  if(Date.now()-tT0>900) return;                    /* long press */
  const hit=e.target.closest('[data-toc], [data-doclink], .nav-item, .group-head');
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
<button id="toTop" onclick="window.scrollTo({{top:0,behavior:'smooth'}})">↑</button>
<button id="tocBtn" onclick="toggleToc()" title="目录">📑</button>
<div id="tocPanel"></div>
</body>
</html>'''

out = BASE + '/study.html'
open(out, 'w', encoding='utf-8').write(page)
print('written:', out, len(page), 'bytes,', total_docs, 'docs')
