/* ===== 全网学习资源库（app/resource.js）=====
   数据来自 tools/bili_collect.py -> tools/bili_to_js.py 生成的 app/resource-data.js
   入口：首页「🌐 全网学习资源库」按钮（data-resopen）
   功能：分类 / 搜索 / 排序 / 已看标记 / 收藏 / 打开·复制链接 / 平台与开源精选 */
(function () {
  'use strict';
  var D = window.RES_DATA || { items: [], extra: null };
  var ITEMS = D.items || [];
  var EXTRA = D.extra || { platforms: [], projects: [], toolbox: [] };
  var OFFLINE = window.RES_OFFLINE || {};
  var watched = {}, favs = {};
  try { watched = JSON.parse(localStorage.getItem('wg.reswatch') || '{}'); } catch (e) {}
  try { favs = JSON.parse(localStorage.getItem('wg.resfav') || '{}'); } catch (e) {}
  var GCLS = { '装机': 'g1', '计算机': 'g2', '编译原理': 'g3', '进阶': 'g4' };
  var st = { tab: 'all', sort: 'play', q: '', limit: 60, hideW: false, showFav: false, onlyOff: false };

  function saveW() { try { localStorage.setItem('wg.reswatch', JSON.stringify(watched)); } catch (e) {} }
  function saveF() { try { localStorage.setItem('wg.resfav', JSON.stringify(favs)); } catch (e) {} }
  function fmtN(n) {
    n = n || 0;
    if (n >= 1e8) return (n / 1e8).toFixed(1) + '亿';
    if (n >= 1e4) return (n / 1e4).toFixed(1) + '万';
    return '' + n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function toast(msg) {
    var t = document.getElementById('resToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'resToast';
      t.style.cssText = 'position:fixed;left:50%;bottom:84px;transform:translateX(-50%);background:rgba(20,24,30,.92);color:#fff;padding:10px 18px;border-radius:999px;font-size:13px;z-index:300;transition:opacity .25s;max-width:82%;text-align:center';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._tm);
    t._tm = setTimeout(function () { t.style.opacity = '0'; }, 2200);
  }
  function copyText(s) {
    function fb() {
      try {
        var ta = document.createElement('textarea');
        ta.value = s; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
        toast('✅ 链接已复制，可粘贴分享');
      } catch (e) { toast('复制失败，请长按选择'); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(s).then(function () { toast('✅ 链接已复制，可粘贴分享'); }, fb);
    } else fb();
  }
  function openUrl(u) {
    if (!u) return;
    try { location.href = u; } catch (e) { copyText(u); }
  }

  function pool() {
    var arr = ITEMS.slice();
    if (st.tab !== 'all') arr = arr.filter(function (x) { return x.g === st.tab; });
    if (st.showFav) arr = arr.filter(function (x) { return favs[x.b]; });
    if (st.onlyOff) arr = arr.filter(function (x) { return OFFLINE[x.b]; });
    if (st.hideW) arr = arr.filter(function (x) { return !watched[x.b]; });
    if (st.q) {
      var q = st.q.toLowerCase();
      arr = arr.filter(function (x) {
        return ((x.t || '') + ' ' + (x.a || '')).toLowerCase().indexOf(q) >= 0;
      });
    }
    if (st.sort === 'new') arr.sort(function (a, b) { return (b.pub || 0) - (a.pub || 0); });
    else arr.sort(function (a, b) { return (b.p || 0) - (a.p || 0); });
    return arr;
  }

  function itemHtml(x, idx) {
    var w = watched[x.b] ? ' watched' : '';
    var off = OFFLINE[x.b];
    var offTag = off ? '<span class="res-off">📥 已离线' + (off.items.length > 1 ? ' · ' + off.items.length + '集' : '') + '</span>' : '';
    var mainBtn = off
      ? '<button class="res-btn ok" data-act="playlocal">▶ 本地</button><button class="res-btn primary" data-act="online">▶ 在线</button>'
      : '<button class="res-btn primary" data-act="online">▶ 在线</button>';
    var url = 'https://www.bilibili.com/video/' + x.b;
    return '<div class="res-card' + w + '" data-resb="' + esc(x.b) + '">'
      + '<div class="res-num"><b>' + (idx + 1) + '</b></div>'
      + '<div class="res-body">'
      + '<div class="res-title">' + esc(x.t) + '</div>'
      + '<div class="res-meta"><span class="res-tag ' + (GCLS[x.g] || '') + '">' + esc(x.g || '') + '</span>'
      + '<span>👤 <b>' + esc(x.a) + '</b></span>'
      + '<span>▶ <b>' + fmtN(x.p) + '</b></span>'
      + '<span>⏱ ' + esc(x.d || '') + '</span>'
      + offTag
      + '<span style="color:var(--dim2)">' + esc(x.b) + '</span></div>'
      + '</div>'
      + '<div class="res-acts">'
      + mainBtn
      + '<button class="res-btn" data-act="copy">📋 复制</button>'
      + '<button class="res-btn" data-act="watch">' + (watched[x.b] ? '✓ 已看' : '○ 未看') + '</button>'
      + '<button class="res-btn" data-act="fav">' + (favs[x.b] ? '★ 已藏' : '☆ 收藏') + '</button>'
      + '</div>'
      + '</div>';
  }

  function tabsHtml() {
    var cnt = { all: ITEMS.length };
    ['装机', '计算机', '编译原理', '进阶', '机房', '锐捷云平台'].forEach(function (g) {
      cnt[g] = ITEMS.filter(function (x) { return x.g === g; }).length;
    });
    var defs = [['all', '🔥 全部'], ['装机', '🔧 装机'], ['计算机', '💻 计算机'], ['编译原理', '⚙ 编译原理'], ['进阶', '📈 进阶'], ['机房', '🏫 机房管理'], ['锐捷云平台', '🖥 锐捷云平台'], ['extra', '📦 平台·开源']];
    return defs.map(function (d) {
      var n = '';
      if (d[0] !== 'extra') n = ' <small style="opacity:.7">' + (cnt[d[0]] || 0) + '</small>';
      return '<button class="res-tab' + (st.tab === d[0] ? ' on' : '') + '" data-rtab="' + d[0] + '">' + d[1] + n + '</button>';
    }).join('');
  }

  function extraHtml() {
    var h = '';
    function linkBtn(l, hot) {
      return '<a class="res-link' + (hot ? ' hot' : '') + '" data-resurl="' + esc(l.u) + '">' + esc(l.t) + '</a>';
    }
    h += '<div class="res-plat"><h4>🎓 全网自学平台 · 直达搜索</h4>'
      + '<p>B站覆盖最全、最接地气的自制教程；系统化课程看慕课/大学公开课；遇到概念卡壳用知乎/Bing 搜索补课。<b>点击后若停留在应用内网页</b>，可长按链接用系统浏览器打开。</p>';
    h += (EXTRA.platforms || []).map(function (p) {
      return '<div class="res-sec">▍' + esc(p.name) + ' <span style="font-weight:400;color:var(--dim2)">' + esc(p.desc || '') + '</span></div>'
        + '<div class="res-links">' + (p.links || []).map(function (l) { return linkBtn(l, p.hot); }).join('') + '</div>';
    }).join('');
    h += '</div>';

    h += '<div class="res-plat"><h4>📚 开源项目与经典教材（全部免费合法）</h4>';
    h += (EXTRA.projects || []).map(function (p) {
      return '<div class="res-sec">▍' + esc(p.name) + '</div><p style="margin:0 0 6px">' + esc(p.desc || '') + '</p>'
        + '<div class="res-links">' + linkBtn({ t: '打开 →', u: p.u }, true) + '</div>';
    }).join('');
    h += '</div>';

    h += '<div class="res-plat"><h4>🧰 装机 & 维护工具箱（真装机必备）</h4>';
    h += (EXTRA.toolbox || []).map(function (p) {
      return '<div class="res-sec">▍' + esc(p.name) + '</div><p style="margin:0 0 6px">' + esc(p.desc || '') + '</p>'
        + '<div class="res-links">' + linkBtn({ t: '了解/下载 →', u: p.u }, true) + '</div>';
    }).join('');
    h += '</div>';

    h += '<div class="res-plat"><h4>🧭 建议学习顺序</h4><p style="line-height:1.9">'
      + '① <b>装机篇</b>：先看教程第 18 章《装机从零到极致》，再挑装机区 2-3 个完整装机实录视频跟看一遍（不用真买硬件，先把流程刻进脑子）；'
      + '② <b>计算机篇</b>：配合计算机组成原理 / 操作系统视频，按「先建立全景、再抠细节」节奏看；'
      + '③ <b>编译原理篇</b>：先看教程第 19 章，再看速成视频建立框架，最后跟《Crafting Interpreters》动手写一个解释器；'
      + '④ <b>动手</b>：看完必写笔记 + 在实训室（首页→模拟实训室）打一遍对应场景。</p></div>';
    return h;
  }

  function listHtml() {
    if (st.tab === 'extra') return extraHtml();
    var arr = pool();
    var shown = arr.slice(0, st.limit);
    var h = '';
    if (!shown.length) h = '<div class="res-empty">没有匹配的内容' + (st.q ? '（换个关键词试试）' : '') + '</div>';
    else h = shown.map(function (x, i) { return itemHtml(x, i); }).join('');
    return h;
  }

  function barHtml() {
    if (st.tab === 'extra') return '';
    var arr = pool();
    var uw = arr.filter(function (x) { return !watched[x.b]; }).length;
    return '<span>共 <b>' + arr.length + '</b> 条 · 已看 <b>' + (arr.length - uw) + '</b> 条</span><span class="sp"></span>'
      + '<button class="res-sort' + (st.sort === 'play' ? ' on' : '') + '" data-rsort="play">🔥 播放</button>'
      + '<button class="res-sort' + (st.sort === 'new' ? ' on' : '') + '" data-rsort="new">🆕 最新</button>'
      + '<button class="res-sort' + (st.hideW ? ' on' : '') + '" data-rhide="1">隐藏已看</button>'
      + '<button class="res-sort' + (st.showFav ? ' on' : '') + '" data-rfav="1">★ 收藏夹</button>'
      + '<button class="res-sort' + (st.onlyOff ? ' on' : '') + '" data-roff="1">📥 已离线</button>';
  }

  function listFootHtml() {
    if (st.tab === 'extra') return '';
    var arr = pool();
    if (arr.length <= st.limit) return '<div class="res-foot">— 已经到底了。📥 = 已下载到手机（离线看）；其余点「▶ 在线」直接播放（' + esc(D.gen || '') + '）。—</div>';
    return '<button class="res-more" data-rmore="1">加载更多（还有 ' + (arr.length - st.limit) + ' 条）</button>';
  }

  function render() {
    var el = document.getElementById('resView');
    if (!el) return;
    el.innerHTML =
      '<div class="res-head">'
      + '<div class="res-top"><h2>🌐 全网学习资源库</h2><button class="res-x" data-resclose="1">✕</button></div>'
      + '<div class="res-sub">装机 · 计算机 · 编译原理 · 进阶 · 机房管理 · 锐捷云平台 —— B站全网检索 · <b>📥 离线已下载 · ▶ 在线直接播放（不跳转）</b></div>'
      + '<div class="res-search"><input id="resQ" placeholder="搜索标题 / UP主…" value="' + esc(st.q) + '"></div>'
      + '</div>'
      + '<div class="res-tabs">' + tabsHtml() + '</div>'
      + (barHtml() ? '<div class="res-bar">' + barHtml() + '</div>' : '')
      + '<div class="res-list" id="resList">' + listHtml() + listFootHtml() + '</div>';
  }

  function refreshList() {
    var l = document.getElementById('resList');
    if (!l) return;
    l.innerHTML = listHtml() + listFootHtml();
  }
  function refreshAll() { render(); }
  function refreshBar() {
    var b = document.querySelector('.res-bar');
    if (!b) return;
    var h = barHtml();
    b.innerHTML = h;
    b.style.display = h ? '' : 'none';
  }

  function bind() {
    if (window._resBound) return;
    window._resBound = true;
    document.addEventListener('click', function (e) {
      var t = e.target;
      var b = t.closest ? t.closest('[data-resb]') : null;
      var btn = t.closest ? t.closest('[data-act]') : null;
      if (btn && b) {
        var act = btn.getAttribute('data-act');
        var bv = b.getAttribute('data-resb');
        e.stopPropagation(); e.preventDefault();
        if (act === 'playlocal') openPlayer(bv);
        else if (act === 'online') openOnline(bv);
        else if (act === 'open') openUrl('https://www.bilibili.com/video/' + bv);
        else if (act === 'copy') copyText('https://www.bilibili.com/video/' + bv);
        else if (act === 'watch') {
          if (watched[bv]) delete watched[bv]; else watched[bv] = 1;
          saveW(); refreshList(); refreshBar();
        } else if (act === 'fav') {
          if (favs[bv]) delete favs[bv]; else favs[bv] = 1;
          saveF(); refreshList();
        }
        return;
      }
      if (b && !btn) {
        var bv2 = b.getAttribute('data-resb');
        if (OFFLINE[bv2]) openPlayer(bv2);
        else openOnline(bv2);
        return;
      }
      var tab = t.closest ? t.closest('[data-rtab]') : null;
      if (tab) { st.tab = tab.getAttribute('data-rtab'); st.limit = 60; refreshAll(); return; }
      var so = t.closest ? t.closest('[data-rsort]') : null;
      if (so) { st.sort = so.getAttribute('data-rsort'); refreshList(); refreshBar(); return; }
      if (t.closest && t.closest('[data-rhide]')) { st.hideW = !st.hideW; refreshList(); refreshBar(); return; }
      if (t.closest && t.closest('[data-rfav]')) { st.showFav = !st.showFav; refreshList(); refreshBar(); return; }
      if (t.closest && t.closest('[data-roff]')) { st.onlyOff = !st.onlyOff; refreshList(); refreshBar(); return; }
      if (t.closest && t.closest('[data-rmore]')) { st.limit += 80; refreshList(); return; }
      var ru = t.closest ? t.closest('[data-resurl]') : null;
      if (ru) { openUrl(ru.getAttribute('data-resurl')); return; }
    }, true);
    document.addEventListener('input', function (e) {
      if (e.target && e.target.id === 'resQ') {
        st.q = e.target.value.trim(); st.limit = 60; refreshList(); refreshBar();
      }
    }, true);
    document.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-resopen]') : null;
      if (b) { e.preventDefault(); openResLib(); }
      if (e.target.closest && e.target.closest('[data-resclose]')) closeResLib();
    });
  }

  /* ===== 本地播放器（离线视频） ===== */
  var BASE_PATH = 'file:///sdcard/Android/media/com.cloudstudy.app/bsvideos/';
  var curBv = null, curIdx = 0, curFile = null;

  function savePos() {
    try {
      var v = document.getElementById('resPlayerV');
      if (!v || !curFile) return;
      var m = {};
      try { m = JSON.parse(localStorage.getItem('wg.rpos') || '{}'); } catch (e) {}
      m[curFile] = Math.round(v.currentTime || 0);
      localStorage.setItem('wg.rpos', JSON.stringify(m));
    } catch (e) {}
  }

  function ensurePlayer() {
    if (document.getElementById('resPlayer')) return;
    var d = document.createElement('div');
    d.id = 'resPlayer';
    d.innerHTML = '<div class="resP-head"><b id="resPTitle">播放</b>'
      + '<button data-rpx="1">✕</button></div>'
      + '<video id="resPlayerV" controls playsinline preload="metadata"></video>'
      + '<div id="resPlayerF" style="display:none;flex:1;min-height:0;background:#000"><iframe id="resPlayerIf" sandbox="allow-scripts allow-same-origin allow-forms allow-presentation" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" style="width:100%;height:100%;border:0;display:block"></iframe></div>'
      + '<div class="resP-list" id="resPEps"></div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) {
      var t2 = e.target;
      if (t2.closest && t2.closest('[data-rpx]')) { closePlayer(); return; }
      if (t2.closest && t2.closest('[data-rpo]')) { if (curBv) openUrl('https://www.bilibili.com/video/' + curBv); return; }
      var eb = t2.closest ? t2.closest('[data-rep]') : null;
      if (eb) playItem(curBv, +eb.getAttribute('data-rep'));
    });
    var v = document.getElementById('resPlayerV');
    v.addEventListener('ended', function () {
      var off = OFFLINE[curBv];
      if (off && curIdx + 1 < off.items.length) playItem(curBv, curIdx + 1);
    });
    v.addEventListener('timeupdate', function () {
      if (v._ls && Date.now() - v._ls < 5000) return;
      v._ls = Date.now();
      savePos();
    });
    v.addEventListener('pause', function () { savePos(); });
  }
  function openOnline(bv) {
    ensurePlayer();
    savePos();
    curBv = bv; curIdx = 0; curFile = null;
    var el = document.getElementById('resPlayer');
    var v = document.getElementById('resPlayerV');
    var fw = document.getElementById('resPlayerF');
    var ifr = document.getElementById('resPlayerIf');
    var eps = document.getElementById('resPEps');
    try { v.pause(); } catch (e) {}
    v.style.display = 'none';
    v.removeAttribute('src');
    try { v.load(); } catch (e) {}
    fw.style.display = 'flex';
    var t = bv;
    try {
      for (var i = 0; i < ITEMS.length; i++) { if (ITEMS[i].b === bv) { t = ITEMS[i].t; break; } }
    } catch (e) {}
    document.getElementById('resPTitle').textContent = '🌐 ' + t;
    ifr.src = 'https://player.bilibili.com/player.html?bvid=' + bv + '&autoplay=0&high_quality=1';
    var ob = document.getElementById('resPOpenB');
    if (ob) ob.style.display = '';
    if (eps) { eps.innerHTML = ''; eps.style.display = 'none'; }
    el.classList.add('on');
  }
  function openPlayer(bv) {
    var off = OFFLINE[bv];
    if (!off) return;
    ensurePlayer();
    var fw = document.getElementById('resPlayerF');
    if (fw) { fw.style.display = 'none'; var ifr = document.getElementById('resPlayerIf'); if (ifr) ifr.removeAttribute('src'); }
    var v0 = document.getElementById('resPlayerV');
    if (v0) v0.style.display = '';
    var ob = document.getElementById('resPOpenB');
    if (ob) ob.style.display = 'none';
    curBv = bv; curIdx = 0;
    var eps = document.getElementById('resPEps');
    if (off.items.length > 1) {
      eps.style.display = '';
      eps.innerHTML = off.items.map(function (it, i) {
        return '<button class="resP-ep' + (i === 0 ? ' on' : '') + '" data-rep="' + i + '">P' + it.i + '</button>';
      }).join('');
    } else { eps.innerHTML = ''; eps.style.display = 'none'; }
    document.getElementById('resPlayer').classList.add('on');
    playItem(bv, 0);
  }
  function playItem(bv, idx) {
    var off = OFFLINE[bv];
    if (!off || !off.items[idx]) return;
    savePos();
    curIdx = idx;
    var it = off.items[idx];
    var v = document.getElementById('resPlayerV');
    v.src = BASE_PATH + it.f;
    curFile = it.f;
    try {
      var m = JSON.parse(localStorage.getItem('wg.rpos') || '{}');
      var p = +m[it.f] || 0;
      if (p > 5) {
        var onceFn = function () {
          try { v.currentTime = p; } catch (e) {}
          v.removeEventListener('loadedmetadata', onceFn);
        };
        v.addEventListener('loadedmetadata', onceFn);
      }
    } catch (e) {}
    try { v.play(); } catch (e) {}
    document.getElementById('resPTitle').textContent = (off.t || bv) + ' · P' + it.i;
    var eps = document.getElementById('resPEps');
    var btns = eps.querySelectorAll('.resP-ep');
    for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('on', i === idx);
    var cur = eps.querySelector('.resP-ep.on');
    if (cur) { try { cur.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {} }
  }
  function closePlayer() {
    savePos();
    var v = document.getElementById('resPlayerV');
    if (v) { try { v.pause(); } catch (e) {} v.removeAttribute('src'); try { v.load(); } catch (e) {} }
    var ifr = document.getElementById('resPlayerIf');
    if (ifr) ifr.removeAttribute('src');
    var el = document.getElementById('resPlayer');
    if (el) el.classList.remove('on');
  }

  window.openResLib = function () {
    bind();
    var el = document.getElementById('resView');
    if (!el) return;
    el.classList.add('on');
    refreshAll();
  };
  window.closeResLib = function () {
    var el = document.getElementById('resView');
    if (el) el.classList.remove('on');
    closePlayer();
  };

  /* 启动即挂载事件委托。
     修复：bind() 此前只在 openResLib() 内部调用，而打开资源库的唯一入口
     又依赖 bind() 挂载的 [data-resopen] 监听 → 首页卡片首次点击无监听器
     响应（表现为「点不开」）。在脚本加载完毕时直接挂载即可闭环。 */
  bind();
})();
