/* =====================================================================
   app/rank.js · 「进阶之路」段位体系（替代旧 XP / 徽章机制）
   ---------------------------------------------------------------------
   设计原则：段位不是攒出来的，是“考”出来的，且标准高于国家/官方考试合格线。
     · 每级对标国家技能等级 + 高含金量证书（1+X / 软考 / HCIA-HCIE / RHCE / 世赛）
     · 实证条件：章节测验达标（≥75%）、考纲范围章节全达标、实训场景全对（100 分）、模拟赛达标
     · 晋级考核：仅从该级证书考纲范围抽题 → 合格线 85%→95%（官方约 60%）
     · 高等级设冷静期；每次成绩留档，晋升颁发唯一编号训练证书
   数据来源（均由 App 内其它模块写入 localStorage）：
     wg.quiz    {章节key:{best,total}}         —— 考试中心
     wg.labprog {场景id:{best,perfect,runs}}   —— 模拟实训室
     wg.exams   [{pid,t,pct,rows,ts}]          —— 模拟赛
     wg.rank    {streak,last,promos,trials,rnotify} —— 本模块自有状态
   ===================================================================== */
(function(root){
'use strict';

var HASDOM=(typeof document!=='undefined');

/* ---------- 基础工具 ---------- */
function LS(k,d){ try{ var v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }
function LSset(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); return true; }catch(e){ return false; } }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function $(id){ return HASDOM?document.getElementById(id):null; }
function vibrate(p){ if(typeof navigator!=='undefined'&&navigator.vibrate){ try{ navigator.vibrate(p); }catch(e){} } }
function dayStr(off){ var d=new Date(); d.setDate(d.getDate()+(off||0)); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function fmtDate(ts){ var d=new Date(ts); if(isNaN(d.getTime())) return ''; return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }

/* ---------- 题库 / 实训 数据读取 ---------- */
function bank(){ var b=null; try{ b=QUIZ_BANK; }catch(e){} if(!b&&root.QUIZ_BANK) b=root.QUIZ_BANK; return b||{}; }
function scenarios(){ try{ if(root.LabEngine&&root.LabEngine.SCENARIOS&&root.LabEngine.SCENARIOS.length) return root.LabEngine.SCENARIOS; }catch(e){} return []; }

/* ---------- 段位定义 ---------- */
var LADDER=[
 {n:1,t:'见习云工',grade:'学徒工',cap:'起跑线：知道 Linux、网络、服务器是什么 — 世赛与证书之路的起点',certs:['校内选拔 · 世赛云计算入门'],scope:'零基础',reqs:[]},
 {n:2,t:'云学徒',grade:'初级工（五级）',cap:'能上手：完成基础实验，看懂命令行输出 — 达到《1+X 云计算平台运维与开发（初级）》与 HCIA 的知识储备',certs:['1+X 云计算平台运维与开发（初级）','HCIA-Cloud Computing'],scope:'Linux · 网络基础',pass:85,qn:12,pool:['tutorial_01','tutorial_02'],reqs:[
   {k:'quiz',need:3,txt:'通过 3 章测验（Linux/网络 · HCIA 考纲）'},
   {k:'lab',need:2,txt:'全对通过 2 个实训场景（100 分）'},
   {k:'scope',list:['tutorial_01','tutorial_02'],txt:'考纲范围内章节全部达标（Linux/网络基础）'}]},
 {n:3,t:'云操作员',grade:'中级工（四级）',cap:'能按图施工：独立部署 Web / DNS / 数据库等标准服务 — 达到 1+X（中级）与 HCIA 合格线',certs:['1+X 云计算平台运维与开发（中级）','HCIA-Cloud Computing'],scope:'Linux · 网络 · Web · DNS',pass:85,qn:12,pool:['tutorial_01','tutorial_02','tutorial_03','tutorial_05','tutorial_10'],reqs:[
   {k:'quiz',need:8,txt:'通过 8 章测验（1+X 中级考纲）'},
   {k:'lab',need:5,txt:'全对通过 5 个实训场景'},
   {k:'sim',pid:'mini',min:60,txt:'迷你模拟 ≥60 分'},
   {k:'scope',list:['tutorial_01','tutorial_02','tutorial_03','tutorial_05','tutorial_10'],txt:'考纲范围内章节全部达标（Linux/网络/Web/DNS）'}]},
 {n:4,t:'云工程师',grade:'高级工（三级）',cap:'能独立交付：多模块组合部署 — 对标「软考·网络工程师（中级）」与「HCIP-Cloud Computing」',certs:['软考·网络工程师（中级）','HCIP-Cloud Computing'],scope:'服务部署 · 证书 · DNS · 负载均衡 · 云平台',pass:90,qn:15,cool:300,pool:['tutorial_03','tutorial_04','tutorial_05','tutorial_06','tutorial_09','tutorial_12'],reqs:[
   {k:'quiz',need:14,txt:'通过 14 章测验（软考中级 / HCIP 考纲）'},
   {k:'lab',need:8,txt:'全对通过 8 个实训场景'},
   {k:'sim',pid:'mini',min:85,txt:'迷你模拟 ≥85 分'},
   {k:'simAny',pids:['std','fix'],min:70,txt:'标准模拟 / 排障特训 ≥70 分'},
   {k:'scope',list:['tutorial_03','tutorial_04','tutorial_05','tutorial_06','tutorial_09','tutorial_12'],txt:'考纲范围内章节全部达标（服务部署/证书/DNS/负载均衡/云平台）'}]},
 {n:5,t:'高级云工程师',grade:'技师（二级）',cap:'能扛事：排障、高可用、自动化都不在话下 — 对标「RHCE」与「阿里云云计算 ACP」',certs:['RHCE','阿里云云计算 ACP','HCIP 实验水平'],scope:'高可用 · 排障 · 容器 · 自动化 · 监控',pass:90,qn:18,cool:300,pool:['tutorial_06','tutorial_07','tutorial_09','tutorial_10','tutorial_11','tutorial_13','tutorial_14'],reqs:[
   {k:'quiz',need:21,txt:'通过 21 章测验（RHCE / HCIP 实验考纲）'},
   {k:'lab',need:12,txt:'全对通过 12 个实训场景'},
   {k:'sim',pid:'std',min:85,txt:'标准模拟 ≥85 分'},
   {k:'sim',pid:'fix',min:85,txt:'排障特训 ≥85 分'},
   {k:'scope',list:['tutorial_06','tutorial_07','tutorial_09','tutorial_10','tutorial_11','tutorial_13','tutorial_14'],txt:'考纲范围内章节全部达标（高可用/排障/容器/自动化/监控）'}]},
 {n:6,t:'云专家',grade:'高级技师（一级）',cap:'能打硬仗：全真模拟从容应对 — 对标「HCIE-Cloud Computing」与「软考·系统架构设计师（高级）」',certs:['HCIE-Cloud Computing','软考·系统架构设计师（高级）','RHCA'],scope:'云原生 · 安全 · 真题 · 机房全栈',pass:95,qn:20,cool:600,pool:['tutorial_11','tutorial_13','tutorial_14','tutorial_15','tutorial_16','tutorial_17','room_','mastery_'],reqs:[
   {k:'quiz',need:30,txt:'通过 30 章测验（HCIE / 软考高级考纲）'},
   {k:'lab',need:16,txt:'全对通过 16 个实训场景'},
   {k:'sim',pid:'full',min:80,txt:'全真模拟 ≥80 分'},
   {k:'scope',list:['tutorial_11','tutorial_13','tutorial_14','tutorial_15','tutorial_16','tutorial_17'],pct:90,txt:'考纲范围内章节全部达标（云原生/自动化/监控/安全/真题/机房 · 每章 ≥90%）'}]},
 {n:7,t:'云宗师',grade:'特级技师 · 世赛方向',cap:'能带队：全体系通关，具备世界技能大赛国家集训队选手的底气',certs:['世赛国家集训队水平','HCIE + CKA/CKS 复合认证'],scope:'全体系 · 全真模拟',pass:95,qn:24,cool:600,pool:['tutorial_','room_','mastery_','cs_','know_'],reqs:[
   {k:'quiz',need:45,txt:'通过 45 章测验（全考纲）'},
   {k:'lab',need:-1,txt:'完成全部实训场景'},
   {k:'sim',pid:'full',min:90,txt:'全真模拟 ≥90 分'},
   {k:'sim',pid:'fix',min:85,txt:'排障特训 ≥85 分'},
   {k:'scope',list:['tutorial_01','tutorial_02','tutorial_03','tutorial_04','tutorial_05','tutorial_06','tutorial_07','tutorial_08','tutorial_09','tutorial_10','tutorial_11','tutorial_12','tutorial_13','tutorial_14','tutorial_15','tutorial_16','tutorial_17','tutorial_18','tutorial_19','tutorial_20'],pct:90,txt:'考纲范围内章节全部达标（保姆级主线全部章节 · 每章 ≥90%）'}]}
];
function defByN(n){ for(var i=0;i<LADDER.length;i++){ if(LADDER[i].n===n) return LADDER[i]; } return null; }

/* ---------- 状态存取 ---------- */
function state(){
  var s=LS('wg.rank',null);
  if(!s||typeof s!=='object'){
    s={streak:0,last:'',promos:{},trials:[],rnotify:0};
    try{ var g=LS('wg.grow',null); if(g&&typeof g==='object'&&g.streak){ s.streak=g.streak||0; s.last=g.last||''; } }catch(e){}
    save(s);
  }
  if(!s.promos) s.promos={}; if(!s.trials) s.trials=[]; if(!s.rnotify) s.rnotify=0;
  return s;
}
function save(s){ LSset('wg.rank',s); }

/* ---------- 实证成绩采集 ---------- */
function collect(){
  var ctx={quiz:0,quizTotal:0,lab:0,labTotal:0,simBest:{}};
  var b=bank(), ks=Object.keys(b); ctx.quizTotal=ks.length;
  var q=LS('wg.quiz',{}), n=0;
  for(var i=0;i<ks.length;i++){ var r=q[ks[i]]; if(r&&r.total&&r.best*4>=r.total*3) n++; }
  ctx.quiz=n;
  var scn=scenarios(); ctx.labTotal=scn.length||22;
  var p=LS('wg.labprog',{}), m=0;
  if(scn.length){ for(var j=0;j<scn.length;j++){ var rr=p[scn[j].id]; if(rr&&rr.best>=100) m++; } }
  else { var kk=Object.keys(p); for(var t=0;t<kk.length;t++){ var pp=p[kk[t]]; if(pp&&pp.best>=100) m++; } }
  ctx.lab=m;
  var pids=['mini','std','full','fix'];
  var ex=LS('wg.exams',[]);
  for(var x=0;x<pids.length;x++){ var best=0; for(var y=0;y<ex.length;y++){ if(ex[y]&&ex[y].pid===pids[x]&&ex[y].pct>best) best=ex[y].pct; } ctx.simBest[pids[x]]=best; }
  return ctx;
}
function evalReqs(def,ctx){
  var out=[];
  for(var i=0;i<def.reqs.length;i++){
    var r=def.reqs[i], cur=0, need=1, txt=r.txt;
    if(r.k==='scope'){
      var lst=r.list||[], tot=0, okc=0, qq=LS('wg.quiz',{}), bks=Object.keys(bank());
      for(var a=0;a<lst.length;a++){
        for(var b2=0;b2<bks.length;b2++){
          if(bks[b2].indexOf(lst[a])!==0) continue;
          tot++;
          var rq=qq[bks[b2]]; var minp=r.pct||75; if(rq&&rq.total&&rq.best*100>=rq.total*minp) okc++;
        }
      }
      out.push({met:(tot>0&&okc>=tot), cur:okc, need:tot, frac:tot?Math.min(1,okc/tot):0, txt:(r.txt||'考纲范围内章节全部达标'), curTxt:okc+'/'+tot+' 章'});
      continue;
    }
    if(r.k==='quiz'){ cur=ctx.quiz; need=r.need; }
    else if(r.k==='lab'){ cur=ctx.lab; need=(r.need<0?ctx.labTotal:r.need); if(r.need<0) txt='全对通过全部 '+ctx.labTotal+' 个实训场景'; }
    else if(r.k==='sim'){ cur=ctx.simBest[r.pid]||0; need=r.min; }
    else if(r.k==='simAny'){ need=r.min; for(var j=0;j<r.pids.length;j++){ var b=ctx.simBest[r.pids[j]]||0; if(b>cur) cur=b; } }
    var curTxt;
    if(r.k==='sim'||r.k==='simAny'){ curTxt=(cur>0?cur+' 分':'未参加'); }
    else if(r.k==='lab'){ curTxt=cur+'/'+need+' 个'; }
    else { curTxt=cur+'/'+need+' 章'; }
    out.push({met:cur>=need, cur:cur, need:need, frac:need>0?Math.min(1,cur/need):1, txt:txt, curTxt:curTxt});
  }
  return out;
}
function currentLevel(s){ var lv=1; for(var i=2;i<=LADDER.length;i++){ if(s.promos&&s.promos[i]) lv=i; else break; } return lv; }
function nextDef(cur){ return cur<LADDER.length?defByN(cur+1):null; }

/* ---------- 实训模块分组（可视化用） ---------- */
var MODGRP=[
 ['Web 服务',['web']],
 ['DNS 解析',['dns']],
 ['故障排查',['fix']],
 ['数据库',['db']],
 ['高可用',['ha']],
 ['机房管理',['room']],
 ['系统与安全',['sys','fw']],
 ['运维自动化',['bak','docker','ans']],
 ['目录与共享',['ldap','samba']]
];
function groupOf(id){ for(var i=0;i<MODGRP.length;i++){ var ps=MODGRP[i][1]; for(var j=0;j<ps.length;j++){ if(String(id).indexOf(ps[j])===0) return i; } } return -1; }

/* ---------- 首页 段位卡 ---------- */
function render(){
  var slot=$('grow-slot'); if(!slot) return;
  var s=state(), ctx=collect(), cur=currentLevel(s), nx=nextDef(cur), cd=defByN(cur);
  var metN=0, total=0, fracSum=0, metAll=false;
  if(nx){ var ev=evalReqs(nx,ctx); total=ev.length; for(var i=0;i<ev.length;i++){ if(ev[i].met) metN++; fracSum+=ev[i].frac; } metAll=(metN===total); }
  var pct=nx?(total?Math.round(fracSum/total*100):0):100;
  var meta=nx?('下一级 Lv.'+nx.n+' 「'+nx.t+'」 · '+metN+'/'+total+' 项达成'):'已达最高段位';
  var certLine=nx?('🎯 对标：'+esc(nx.certs.join(' · '))):'';
  var h='<div class="rk-card'+(metAll?' ready':'')+'" data-rk="open">'
   +'<div class="rk-top"><span class="rk-pill">Lv.'+cur+'</span><b class="rk-name">'+cd.t+'</b><span class="rk-cta">进阶之路 ›</span></div>'
   +'<p class="rk-cap">'+cd.cap+'</p>'
   +'<div class="rk-bar"><i style="width:'+pct+'%"></i></div>'
   +'<div class="rk-meta">'+meta+'</div>'
   +(certLine?'<div class="rk-certs">'+certLine+'</div>':'')
   +(metAll?'<button class="rk-ready" data-rk="trial">⚔ 晋级考核已就绪 — 立即开考</button>':'')
   +'</div>';
  h+='<button class="home-card small" style="margin-top:8px" onclick="openQuizCenter()"><b>📝 考试中心 · 检验学习成果</b></button>';
  h+='<button class="home-card small" style="margin-top:8px" onclick="openLabCenter()"><b>⚒ 实战中心 · 动手实操与模拟赛</b></button>';
  var rec=null, recT='';
  try{
    var rd=JSON.parse(localStorage.getItem('wg.read')||'{}');
    var dks=Object.keys(DOCS);
    for(var ri=0;ri<=20&&!rec;ri++){
      var key='tutorial_'+('0'+ri).slice(-2);
      for(var rj=0;rj<dks.length;rj++){ if(dks[rj].indexOf(key)>=0&&!rd[dks[rj]]){ rec=dks[rj]; recT=DOCS[rec].t; break; } }
    }
  }catch(e){}
  if(rec) h+='<button class="home-card small" style="margin-top:8px" data-doclink="'+rec+'"><b>📌 今日推荐：'+esc(recT)+'</b></button>';
  h+='<div class="home-card" style="margin-top:14px;border-style:dashed">'
   +'<b>⚔ 世赛训练场 · 真机操练（TMBJ 终端）</b>'
   +'<p style="color:var(--dim);font-size:12.5px;margin:8px 0;line-height:1.7">手机里藏着一个完整比赛环境：3 台服务器节点 · 6 个比赛模块 · 评分脚本当场打分。在终端里运行：</p>'
   +'<div style="font-family:monospace;font-size:12px;background:rgba(0,0,0,.35);border-radius:10px;padding:10px;color:#1da851;line-height:2;overflow-x:auto">wsarena status<span style="color:var(--dim2)"> &nbsp;# 看状态</span><br>wsarena sh srv1<span style="color:var(--dim2)"> &nbsp;# 进服务器操练</span><br>wsarena check web<span style="color:var(--dim2)"> &nbsp;# 评分打分</span></div>'
   +'<p style="color:var(--dim);font-size:11.5px;margin:8px 0 0">模块：Web · DNS · 排障 · 数据库 · 负载均衡 · 机房管理 ｜ 全真模拟：wsarena exam full</p>'
   +'</div>';
  slot.innerHTML=h;
}

/* ---------- 进阶之路（全屏页） ---------- */
function openLadder(){ var v=$('rankView'); if(v) v.classList.add('on'); TR=null; renderLadder(); }
function closeLadder(){ var v=$('rankView'); if(v) v.classList.remove('on'); TR=null; var m=$('rkModal'); if(m) m.classList.remove('on'); }

function renderLadder(){
  var body=$('rankBody'); if(!body) return;
  var s=state(), ctx=collect(), cur=currentLevel(s), nx=nextDef(cur), cd=defByN(cur);
  var sub=$('rankSub'); if(sub) sub.textContent='Lv.'+cur+' · '+cd.t;
  var readN=0; try{ readN=Object.keys(JSON.parse(localStorage.getItem('wg.read')||'{}')).length; }catch(e){}
  var h='';
  /* 当前段位 */
  h+='<div class="qz-item rk-now"><div class="rk-nowtop"><span class="rk-pill">Lv.'+cur+'</span><b class="rk-t">'+cd.t+'</b></div>'
   +'<p class="rk-cap">'+cd.cap+'</p>'
   +'<div class="rk-certs">🎯 对标：'+esc((cd.certs||[]).join(' · '))+'　|　国家技能等级：'+esc(cd.grade||'')+'</div>'
   +'<div class="rk-stat">测验通过 '+ctx.quiz+'/'+ctx.quizTotal+' 章　·　实训全对 '+ctx.lab+'/'+ctx.labTotal+' 个　·　连续学习 '+s.streak+' 天　·　已读 '+readN+' 篇</div></div>';
  /* 下一级 */
  if(nx){
    var ev=evalReqs(nx,ctx), metAll=true;
    for(var i=0;i<ev.length;i++){ if(!ev[i].met) metAll=false; }
    h+='<div class="qz-item"><div class="rk-nowtop"><span class="rk-pill dim">Lv.'+nx.n+'</span><b class="rk-t">'+nx.t+'</b><span class="rk-tag'+(metAll?' ok':'')+'">'+(metAll?'考核已就绪':'当前目标')+'</span></div>'
     +'<p class="rk-cap">'+nx.cap+'</p>'
     +'<div class="rk-certs">🎯 对标：'+esc((nx.certs||[]).join(' · '))+'　|　国家技能等级：'+esc(nx.grade||'')+'</div>'
     +'<div class="rk-grade">考核标准：'+esc((nx.certs||[]).join(' / '))+' 考试大纲范围 · 合格线 '+nx.pass+'%（高于官方合格线）· 成绩留档可查</div>';
    for(var j=0;j<ev.length;j++){ var e=ev[j];
      h+='<div class="rk-req'+(e.met?' ok':'')+'"><span class="ic">'+(e.met?'✓':'○')+'</span><span class="bd">'+esc(e.txt)+'</span><span class="pg">'+e.curTxt+'</span></div>'
       +'<div class="rk-mini'+(e.met?' ok':'')+'"><i style="width:'+Math.round(e.frac*100)+'%"></i></div>';
    }
    var coolLeft=0;
    if(nx.cool && s.coolLv===nx.n && (s.coolUntil||0)>Date.now()) coolLeft=Math.ceil((s.coolUntil-Date.now())/60000);
    h+= metAll
      ? (coolLeft
          ? '<div class="rk-locktip">⏳ 冷静期剩余 '+coolLeft+' 分钟 — 复盘错题后再来<br>成绩已留档 · 计时结束即可重新开考</div>'
          : '<button class="qz-btn" data-rk="trial" style="width:100%;margin-top:14px">⚔ 参加晋级考核 · 对标「'+esc(nx.certs[0])+'」（≥'+nx.pass+'% 合格）</button>')
      : '<div class="rk-locktip">条件全部达成后，晋级考核自动开启<br>合格线 '+nx.pass+'%（高于官方合格线）· 范围外不抽题</div>';
    h+='</div>';
  } else {
    h+='<div class="qz-item" style="text-align:center"><div style="font-size:38px">🎓</div><h4 style="margin:8px 0 4px">已达最高段位</h4><p class="rk-cap" style="text-align:center">云宗师 — 全体系通关，具备世赛选手的底气</p></div>';
  }
  /* 段位阶梯 */
  h+='<div class="qz-item"><h4>段位阶梯 · 国家级认证对标</h4>';
  for(var k=0;k<LADDER.length;k++){ var d=LADDER[k], pr=s.promos[d.n];
    var st=(d.n<cur)?'done':(d.n===cur?'cur':((d.n===cur+1)?'next':'future'));
    var mark=(d.n<=cur)?'✓':'';
    var meta= pr?('晋升 '+fmtDate(pr).slice(5)) : (st==='next'?'下一目标':'');
    h+='<div class="rk-lvrow '+st+'"><span class="rk-lvn">'+mark+'</span><span class="rk-lvname">Lv.'+d.n+' '+d.t+'<i class="rk-lvcert">技能等级 '+esc(d.grade||'')+' · 对标 '+esc((d.certs||[]).join('/'))+'</i></span><span class="rk-lvmeta">'+meta+'</span></div>';
  }
  h+='</div>';
  /* 实训模块进度 */
  var scn=scenarios();
  if(scn.length){
    var prog=LS('wg.labprog',{}), rows='';
    for(var m=0;m<MODGRP.length;m++){
      var ids=[]; for(var x=0;x<scn.length;x++){ if(groupOf(scn[x].id)===m) ids.push(scn[x].id); }
      if(!ids.length) continue;
      var sum=0, dn=0;
      for(var y=0;y<ids.length;y++){ var r2=prog[ids[y]], b2=(r2&&r2.best)||0; sum+=b2; if(b2>=80) dn++; }
      var avg=Math.round(sum/ids.length);
      rows+='<div class="rk-mod"><div class="rk-modrow"><span>'+MODGRP[m][0]+'</span><span class="pg">'+dn+'/'+ids.length+' 达标 · 平均 '+avg+'</span></div>'
       +'<div class="rk-mini'+(dn===ids.length?' ok':'')+'"><i style="width:'+avg+'%"></i></div></div>';
    }
    if(rows){ h+='<div class="qz-item"><h4>实训模块进度</h4>'+rows+'</div>'; }
  }
  /* 技术履历 */
  h+='<div class="qz-item"><h4>技术履历</h4>';
  var any=false;
  for(var n2=2;n2<=LADDER.length;n2++){ if(s.promos[n2]){ any=true; var dd=defByN(n2);
    h+='<div class="rk-hrow"><b>Lv.'+n2+' '+dd.t+'</b><span class="dt">'+fmtDate(s.promos[n2])+((s.certs&&s.certs[n2])?(' · '+esc(s.certs[n2].id)):'')+'</span></div>';
  }}
  for(var t=0;t<Math.min(3,s.trials.length);t++){ var tr=s.trials[t];
    h+='<div class="rk-hrow dim"><span>晋级考核 · Lv.'+tr.lv+'</span><span class="dt">'+fmtDate(tr.ts).slice(5)+' · '+tr.pct+'% '+(tr.pass?'通过':'未通过')+'</span></div>';
  }
  if(!any&&!s.trials.length){ h+='<div class="rk-empty">还没有晋升记录。<br>通过第一次晋级考核后，每一次晋升都会记在这里。</div>'; }
  h+='</div>';
  body.innerHTML=h;
}

/* ---------- 晋级考核（试炼） ---------- */
var TR=null;
function scopeHit(key, scopes){ for(var i=0;i<scopes.length;i++){ if(key.indexOf(scopes[i])===0) return true; } return false; }
function buildPool(def){
  var b=bank(), q=LS('wg.quiz',{}), pool=[], poolAll=[], ks=Object.keys(b);
  var scopes=(def&&def.pool&&def.pool.length)?def.pool:null;
  for(var i=0;i<ks.length;i++){
    var r=q[ks[i]]; if(!(r&&r.total&&r.best*4>=r.total*3)) continue;
    var arr=b[ks[i]].q||[];
    for(var j=0;j<arr.length;j++){
      var it={q:arr[j].q,o:arr[j].o,a:arr[j].a,e:arr[j].e,src:b[ks[i]].t};
      poolAll.push(it);
      if(!scopes||scopeHit(ks[i],scopes)) pool.push(it);
    }
  }
  if(pool.length<8) pool=poolAll; /* 对标范围题量不足 → 回退全部已达标章节 */
  return shuffle(pool);
}
function startTrial(){
  var s=state(), cur=currentLevel(s), nx=nextDef(cur);
  openLadder();
  if(!nx) return;
  if(nx.cool && s.coolLv===nx.n && (s.coolUntil||0)>Date.now()){
    toastFn('冷静期剩余 '+Math.ceil((s.coolUntil-Date.now())/60000)+' 分钟 — 复盘错题后再来');
    renderLadder(); return;
  }
  var ev=evalReqs(nx,collect()), metAll=true;
  for(var i=0;i<ev.length;i++){ if(!ev[i].met) metAll=false; }
  if(!metAll){ toastFn('条件未达成 — 先完成「'+nx.t+'」的全部要求'); renderLadder(); return; }
  var pool=buildPool(nx);
  if(pool.length<8){ toastFn('考纲范围内达标章节还太少 — 先去考试中心通过对应范围的章节'); renderLadder(); return; }
  var qn=Math.min(nx.qn||12, pool.length);
  TR={lv:nx.n, pass:(nx.pass||85), cool:(nx.cool||0), qs:pool.slice(0,qn), i:0, correct:0, wrongs:[], answered:false};
  renderTrial();
}
function renderTrial(){
  var body=$('rankBody'); if(!body) return;
  var t=TR;
  if(!t){ renderLadder(); return; }
  if(t.i>=t.qs.length){ finishTrial(); return; }
  var sub=$('rankSub'); if(sub) sub.textContent=(t.i+1)+' / '+t.qs.length;
  var q=t.qs[t.i], def=defByN(t.lv);
  var h='<div class="qz-item"><h4>⚔ 晋级考核 · Lv.'+t.lv+'「'+def.t+'」</h4>'
   +'<p style="color:var(--dim);font-size:12px;margin:4px 0 0">考核范围对标：'+esc((def.certs||[]).join(' · '))+'</p>'
   +'<p style="color:var(--dim2);font-size:11.5px;margin:2px 0 0">仅从考纲范围「'+(def.scope||'全部')+'」抽取 · 合格线 '+t.pass+'% · 全卷 '+t.qs.length+' 题</p></div>';
  h+='<div class="qz-item"><h4>Q'+(t.i+1)+'. '+esc(q.q)+'</h4>';
  for(var x=0;x<q.o.length;x++){ h+='<button class="qz-opt" id="rkOpt'+x+'" data-rk="ta:'+x+'">'+String.fromCharCode(65+x)+'. '+esc(q.o[x])+'</button>'; }
  h+='<div class="qz-exp" id="rkExp">💡 '+esc(q.e)+'</div>';
  h+='<button class="qz-btn" id="rkNext" style="display:none" data-rk="tn">'+(t.i===t.qs.length-1?'交卷，看结果 →':'下一题 →')+'</button></div>';
  body.innerHTML=h;
  t.answered=false;
}
function answerTrial(idx){
  var t=TR; if(!t||t.answered) return;
  t.answered=true;
  var q=t.qs[t.i], ok=(idx===q.a);
  if(ok) t.correct++; else t.wrongs.push({q:q,my:idx});
  for(var i=0;i<q.o.length;i++){
    var el=$('rkOpt'+i); if(!el) continue;
    if(i===q.a) el.classList.add('right');
    else if(i===idx&&!ok) el.classList.add('wrong');
  }
  var e=$('rkExp'); if(e) e.style.display='block';
  var n=$('rkNext'); if(n) n.style.display='inline-block';
  if(ok) vibrate(15);
}
function nextTrial(){ var t=TR; if(!t) return; t.i++; renderTrial(); }
function finishTrial(){
  var t=TR; if(!t) return;
  var total=t.qs.length, cc=t.correct, pct=total?Math.round(cc/total*100):0;
  var pass=(pct>=(t.pass||85));
  var s=state();
  s.trials.unshift({lv:t.lv,pct:pct,pass:pass,ts:Date.now()});
  s.trials=s.trials.slice(0,30);
  if(pass){
    s.promos[t.lv]=Date.now();
    save(s);
    TR=null;
    showCert(t.lv,pct,cc,total);
    return;
  }
  if(t.cool){ s.coolUntil=Date.now()+t.cool*1000; s.coolLv=t.lv; }
  save(s);
  var h='<div class="qz-item" style="text-align:center"><div style="font-size:42px">'+(pct>=60?'💪':'📖')+'</div>'
   +'<h3 style="margin:8px 0;color:#c99700;font-size:19px">'+cc+' / '+total+'（'+pct+'%）</h3>'
   +'<p style="color:var(--dim);font-size:13px">未达 '+t.pass+'% 合格线 — 先把错题过一遍再来'+(t.cool?('（高等级设 '+Math.round(t.cool/60)+' 分钟冷静期）'):'')+'。</p>'
   +'<button class="qz-btn" data-rk="tr">🔄 再考一次</button> <button class="qz-btn" style="background:rgba(0,0,0,.05)" data-rk="tb">返回进阶之路</button></div>';
  if(t.wrongs.length){
    h+='<div class="qz-item"><h4>📋 错题回顾（'+t.wrongs.length+' 题）</h4>';
    for(var i=0;i<t.wrongs.length;i++){
      var q=t.wrongs[i].q, my=t.wrongs[i].my;
      h+='<div style="margin:10px 0;padding:12px;background:rgba(255,69,58,.07);border-radius:12px">'
        +'<div style="font-size:13.5px;font-weight:700;line-height:1.6">'+esc(q.q)+'</div>'
        +'<div style="font-size:12.5px;color:#dc3545;margin-top:6px">你选了：'+String.fromCharCode(65+my)+'. '+esc(q.o[my])+'</div>'
        +'<div style="font-size:12.5px;color:#1da851">正确答案：'+String.fromCharCode(65+q.a)+'. '+esc(q.o[q.a])+'</div>'
        +'<div style="font-size:12px;color:var(--dim);margin-top:4px">💡 '+esc(q.e)+'</div></div>';
    }
    h+='</div>';
  }
  var sub=$('rankSub'); if(sub) sub.textContent=cc+'/'+total;
  var body=$('rankBody'); if(body) body.innerHTML=h;
  TR=null;
}
function certNo(lv){ var y=new Date().getFullYear(); var r=('000'+(Math.floor(Math.random()*9000)+1000)).slice(-4); return 'CS-'+y+'-L'+lv+'-'+r; }
function showCert(lv,pct,cc,total){
  var def=defByN(lv), el=$('rkCert'); if(!el) return;
  var s=state(); s.certs=s.certs||{};
  if(!s.certs[lv]){ s.certs[lv]={id:certNo(lv), ts:Date.now()}; save(s); }
  var cn=s.certs[lv].id;
  el.innerHTML='<div class="rk-seal"><b>'+lv+'</b><span>LV.</span></div>'
   +'<h3>晋升 · '+def.t+'</h3>'
   +'<p class="rk-cap">'+esc(def.cap)+'</p>'
   +'<p class="rk-certs">🎯 对标：'+esc((def.certs||[]).join(' · '))+'</p>'
   +'<p class="rk-grade">国家技能等级：'+esc(def.grade||'')+'</p>'
   +'<p class="rk-sc">晋级考核 '+cc+'/'+total+' · '+pct+'%</p>'
   +'<p class="rk-cno">证书编号 '+cn+'</p>'
   +'<p class="rk-dt">'+fmtDate(Date.now())+' · 记入技术履历</p>'
   +'<p class="rk-disc">* CloudStudy 备考训练证明（按官方考纲范围考核）；正式认证请通过官方机构报考。</p>'
   +'<button class="qz-btn" data-rk="mok" style="width:100%;margin-top:16px">继续前进 →</button>';
  var m=$('rkModal'); if(m) m.classList.add('on');
  vibrate([30,60,30]);
}

/* ---------- 提示条 ---------- */
function toastFn(txt){
  var el=$('rkToast'); if(!el) return;
  el.textContent=txt; el.classList.add('on');
  if(toastFn._t) clearTimeout(toastFn._t);
  toastFn._t=setTimeout(function(){ el.classList.remove('on'); }, 3200);
}

/* ---------- 对外动作 ---------- */
function act(v){
  if(!v) return;
  if(v==='open'){ openLadder(); return; }
  if(v==='close'){ closeLadder(); return; }
  if(v==='trial'){ startTrial(); return; }
  if(v==='tr'){ startTrial(); return; }
  if(v==='tn'){ nextTrial(); return; }
  if(v==='tb'){ TR=null; renderLadder(); return; }
  if(v==='mok'){ var m=$('rkModal'); if(m) m.classList.remove('on'); renderLadder(); render(); return; }
  if(v.indexOf('ta:')===0){ answerTrial(parseInt(v.slice(3),10)); return; }
}

/* ---------- 事件钩子（其它模块调用） ---------- */
function touch(){ try{ render(); }catch(e){} }
function streakOnce(){ var s=state(), t=dayStr(0); if(s.last===t) return; s.streak=(s.last===dayStr(-1))?(s.streak+1):1; s.last=t; save(s); }
function onEvent(){
  try{ render(); }catch(e){}
  try{
    var s=state(), cur=currentLevel(s), nx=nextDef(cur);
    if(nx){
      var ev=evalReqs(nx,collect()), metAll=true;
      for(var i=0;i<ev.length;i++){ if(!ev[i].met){ metAll=false; break; } }
      if(metAll&&(s.rnotify||0)<nx.n){ s.rnotify=nx.n; save(s); toastFn('⚔ Lv.'+nx.n+' 「'+nx.t+'」晋级考核已就绪'); }
    }
  }catch(e){}
}
function bootOnce(){ try{ streakOnce(); }catch(e){} try{ onEvent(); }catch(e){} }

/* ---------- 导出 ---------- */
root.Rank={ boot:bootOnce, render:render, touch:touch, event:onEvent, streak:streakOnce, act:act,
  _t:{ state:state, save:save, collect:collect, currentLevel:currentLevel, nextDef:nextDef, evalReqs:evalReqs,
       buildPool:buildPool, startTrial:startTrial, answer:answerTrial, next:nextTrial, getTR:function(){return TR;},
       LADDER:LADDER, defByN:defByN } };

if(HASDOM){
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',function(){ try{ bootOnce(); }catch(e){} }); }
  else { try{ bootOnce(); }catch(e){} }
}
})(typeof window!=='undefined'?window:this);
