/* =====================================================================
   lab-ui.js · 模拟实训室界面层（终端 / 编辑器 / 评分 / 模拟赛）
   依赖 lab-engine.js + lab-scenarios.js；运行于 App 内 study.html
   ===================================================================== */
(function(root){
'use strict';
var E=root.LabEngine;
if(!E||!E.SCENARIOS) return;
if(typeof document==='undefined') return;  /* node 环境（测试）直接跳过 */

/* ---------- 存储（容错） ---------- */
function LS(k,d){ try{ var v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }
function LSset(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); return true; }catch(e){ return false; } }
function LSdel(k){ try{ localStorage.removeItem(k); }catch(e){} }
function xp(){ try{ if(root.rankNotify) root.rankNotify(); }catch(e){} }
function badge(){ try{ if(root.rankNotify) root.rankNotify(); }catch(e){} }
function vibrate(p){ if(navigator.vibrate){ try{ navigator.vibrate(p); }catch(e){} } }
function fmtT(sec){ sec=Math.max(0,sec|0); var m=Math.floor(sec/60), s2=sec%60; return (m<10?'0':'')+m+':'+(s2<10?'0':'')+s2; }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function $(id){ return document.getElementById(id); }

var S={ vm:null, scn:null, tail:[], hist:[], hIdx:-1, exam:null, timer:null,
        demoRunning:false, editing:null, saveT:null, wasAll:false, fromExam:false, lastGrade:null, confirmCB:null };

/* ---------- 挂到主界面的钩子 ---------- */
var _origRC=root.renderLabCenter;
if(_origRC){ root.renderLabCenter=function(){ _origRC.apply(this,arguments); try{ injectCenter(); }catch(e){} }; }
var _origOLC=root.openLabCenter;
if(_origOLC){ root.openLabCenter=function(){ _origOLC.apply(this,arguments); try{ injectCenter(); }catch(e){} }; }
/* 老版「世赛模拟」按钮 → 直达新模拟赛系统 */
var _origSS=root.startSim;
if(_origSS){ root.startSim=function(id){ try{ startExam(id); }catch(e){ try{ _origSS(id); }catch(e2){} } }; }

/* ================= 实战中心：注入「模拟实训室」板块 ================= */
function prog(){ return LS('wg.labprog',{}); }
function injectCenter(){
  var body=$('labBody'); if(!body) return;
  var old=$('lvSimLab');
  if(old) old.parentNode.removeChild(old);
  var div=document.createElement('div'); div.id='lvSimLab'; div.className='qz-item';
  div.innerHTML=centerHTML();
  body.insertBefore(div, body.firstChild);
}
function centerHTML(){
  var p=prog(), h='';
  var exam=LS('wg.exam',null);
  h+='<h4>🧪 模拟实训室 <span style="color:#1da851;font-size:11.5px;margin-left:6px">应用内直接操作 · 自动评分</span></h4>';
  h+='<p class="lab-sub">手机里练真命令：引擎模拟一台 srv1 服务器（Nginx / MariaDB / HAProxy / Docker / Ansible…），做完点「评分」自动判分。与 wsarena 真机训练场同一评分标准——先在这练熟，再上真机。</p>';
  if(exam){ h+='<div class="lab-demo-line">⏱ 模拟赛进行中（剩 '+fmtT(exam.left)+'）——<b data-lv="examgo" style="cursor:pointer;color:#1a6fe8"> 点此继续 →</b></div>'; }
  h+='<div class="lab-sec-t">🏟 模拟赛（全真试卷 · 自动判卷）</div>';
  var papers=E.EXAM_PAPERS;
  for(var i=0;i<papers.length;i++){ var pa=papers[i];
    h+='<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line2)">'
      +'<div style="flex:1"><div style="font-size:13.5px;font-weight:700">'+esc(pa.t)+'</div>'
      +'<div style="font-size:11.5px;color:var(--dim);margin-top:2px">'+esc(pa.desc)+'</div></div>'
      +'<button class="lab-rowbtn" data-lv="ex:'+pa.id+'">开始</button></div>';
  }
  h+='<div class="lab-sec-t">🔬 实训任务（'+E.SCENARIOS.length+' 个 · 点进即练）</div>';
  var mods={}, order=[];
  for(var s=0;s<E.SCENARIOS.length;s++){ var sc=E.SCENARIOS[s]; if(!mods[sc.mod]){ mods[sc.mod]=[]; order.push(sc.mod); } mods[sc.mod].push(sc); }
  for(var mi=0;mi<order.length;mi++){ var mo=order[mi];
    h+='<div style="margin-top:10px;font-size:12px;color:var(--dim);font-weight:700">'+esc(mo)+'</div>';
    for(var j=0;j<mods[mo].length;j++){ var sc2=mods[mo][j]; var pr=p[sc2.id];
      h+='<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--line2)">'
        +'<div style="flex:1;font-size:13px">'+esc(sc2.title)
        +'<span style="color:var(--dim2);font-size:11px"> · '+sc2.min+'min</span></div>'
        +(pr?'<span class="lab-sc">最佳 '+pr.best+'%'+(pr.perfect?' 🏆':'')+'</span>':'')
        +'<button class="lab-rowbtn" data-lv="scn:'+sc2.id+'">进入</button></div>';
    }
  }
  h+='<div class="lab-sec-t">🖥 真机训练场（wsarena · 真内核真服务）</div>';
  h+='<p class="lab-sub">模拟器给你打底之后，想玩真的？在 TMBJ 对话框直接发这些命令，真机环境（chroot 节点）即刻就绪：</p>';
  h+='<div class="lab-demo-line">wsarena task 1 → 看任务书　·　wsarena sh srv1 → 进入节点　·　wsarena check web → 自动评分</div>';
  return h;
}

/* ================= 会话管理 ================= */
function sessKey(id){ return 'wg.lsv.'+id; }
function welcomeTail(scn){
  return [{s:'── 环境就绪：'+scn.title+' ──',c:'dim'},
          {s:'输入 help 看常用命令；点底部「📋 任务」看要求、「📝 文件」快速编辑配置。',c:'hint'}];
}
function loadSession(id){
  var scn=E.SCENARIO_BY_ID[id]; if(!scn) return null;
  var vm=E.newVM('lab-'+id);
  var saved=LS(sessKey(id),null), ok=false;
  if(saved&&saved.vm){ try{ ok=E.vmFromJSON(vm,saved.vm); }catch(e){ ok=false; } }
  if(!ok) E.scenarioNew(vm,id);
  var tail=(saved&&saved.tail&&saved.tail.length)?saved.tail:welcomeTail(scn);
  return {vm:vm, scn:scn, tail:tail};
}
function saveSession(debounced){
  if(!S.vm||!S.scn) return;
  var doSave=function(){
    try{
      var vmStr=E.vmToJSON(S.vm);
      if(vmStr.length>1.8e6) return;
      LSset(sessKey(S.scn.id), {vm:vmStr, tail:S.tail.slice(-100), ts:Date.now()});
    }catch(e){}
  };
  if(!debounced) return doSave();
  clearTimeout(S.saveT); S.saveT=setTimeout(doSave, 900);
}

/* ================= 终端渲染 ================= */
function promptStr(){
  var cwd=S.vm.cwd; if(cwd==='/root') cwd='~'; else if(cwd.indexOf('/root/')===0) cwd='~'+cwd.slice(5);
  return 'root@'+S.vm.hostname+':'+cwd+'#';
}
function appendLine(l,noScroll){
  var scr=$('tvScr'); if(!scr) return;
  var d=document.createElement('div');
  if(typeof l==='string'){ d.className='tv-o'; d.textContent=l; }
  else{ d.className='tv-o'+(l.c?(' tv-'+l.c):''); d.textContent=l.s; }
  scr.appendChild(d);
  if(!noScroll) scr.scrollTop=scr.scrollHeight;
}
function push(l){ S.tail.push(l); if(S.tail.length>320) S.tail.splice(0,120); appendLine(l); }
function renderTerm(){ var scr=$('tvScr'); if(!scr) return; scr.innerHTML=''; for(var i=0;i<S.tail.length;i++) appendLine(S.tail[i],true); scr.scrollTop=scr.scrollHeight; }
function toast(msg){
  var t=$('tvToast'); if(!t) return;
  t.textContent=msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t=setTimeout(function(){ t.classList.remove('on'); },1800);
}
function renderChips(){
  var box=$('tvChips'); if(!box) return;
  var chips=(S.scn&&S.scn.chips?S.scn.chips.slice(0,8):[]).concat(['help','lab check','lab hint']);
  var h='';
  for(var i=0;i<chips.length;i++) h+='<button class="tv-chip" data-lvc="'+i+'">'+esc(chips[i])+'</button>';
  box.innerHTML=h;
  box._cmds=chips;
}

/* ================= 命令执行 ================= */
function execShow(cmd){
  cmd=String(cmd).replace(/^\s+|\s+$/g,''); if(!cmd) return;
  push({s:promptStr()+' '+cmd, c:'cmd'});
  var r;
  try{ r=E.execLine(S.vm, cmd); }catch(e){ push({s:'内部错误: '+e.message,c:'err'}); return; }
  var lines=r.lines||[];
  for(var i=0;i<lines.length;i++) push(typeof lines[i]==='string'?lines[i]:lines[i]);
  if(r.clear){ S.tail=[]; renderTerm(); }
  if(r.editor){ openEditor(r.editor); }
  if(r.exit){ backToCenter(); return; }
  if(S.vm._resetRequest){ delete S.vm._resetRequest; resetSession(); }
  else saveSession(true);
  autoGrade();
}
function autoGrade(){
  if(!S.vm||!S.scn) return;
  var g; try{ g=E.grade(S.vm,S.scn); }catch(e){ return; }
  S.lastGrade=g;
  var el=$('tvScore');
  if(el){ var done=0; for(var i=0;i<g.items.length;i++) if(g.items[i].ok) done++;
    el.textContent=done+'/'+g.items.length+' 项达标'+(g.pct===100?' 🎉':''); }
  if(g.pct===100&&!S.wasAll){ S.wasAll=true; toast('🏆 全部验收达标！点右上角「评分」领奖励'); vibrate(35); }
}
function refreshPromptState(){ /* 名字/路径变化后无需重绘，下一次命令即体现 */ }

/* ================= 编辑器 ================= */
function openEditor(ed){
  var path=S.vm.p(ed.path);
  S.editing={path:path};
  var c=null; try{ c=S.vm.read(path); }catch(e){}
  $('tvEditPath').textContent=path;
  $('tvEditArea').value=(c===null?'':c);
  $('tvEdit').classList.add('on');
  setTimeout(function(){ try{ $('tvEditArea').focus(); }catch(e){} },120);
}
function closeEditor(){ $('tvEdit').classList.remove('on'); S.editing=null; }
function saveEditor(){
  if(!S.editing) return;
  var path=S.editing.path, val=$('tvEditArea').value, auto=false;
  var r=S.vm.write(path, val);
  if(!r.ok && /目录不存在/.test(r.err||'')){
    S.vm.mkdirP(E.parentOf(path));
    r=S.vm.write(path, val); auto=true;
  }
  if(!r.ok){ toast('保存失败：'+(r.err||'未知错误')); return; }
  closeEditor();
  push({s:'✎ 已保存 '+path+(auto?'（已自动创建上级目录）':'')+' · '+val.length+' 字节',c:'ok'});
  if(/(\.conf|\.cfg|\.cnf|\.yml|\.ldif|\.service|sshd_config|smb\.conf|\.sh)$/.test(path))
    push({s:'💡 配置/脚本类文件——别忘了让对应服务生效（systemctl restart …）或加执行权限',c:'hint'});
  saveSession(true); autoGrade();
}

/* ================= 评分 ================= */
function showGradePanel(g, newPerfect){
  var h='<h4>📊 评分结果</h4>';
  var face=g.pct===100?'🏆':(g.pct>=80?'🎉':(g.pct>=60?'👍':'💪'));
  h+='<div class="tv-big">'+face+' '+g.got+' / '+g.total+'（'+g.pct+'%）</div>';
  for(var i=0;i<g.items.length;i++){ var it=g.items[i];
    h+='<div class="tv-grade-item"><div class="ic">'+(it.ok?'✅':'❌')+'</div><div class="bd">'+esc(it.d)
      +(!it.ok&&it.tip?'<div class="tp">💡 '+esc(it.tip)+'</div>':'')
      +(!it.ok&&it.msg?'<div class="tp">'+esc(it.msg)+'</div>':'')
      +'</div><div class="pt">'+(it.ok?it.p:0)+'/'+it.p+'</div></div>';
  }
  if(newPerfect) h+='<p class="tv-sub" style="margin-top:10px">首次满分！奖励已入账 🎁</p>';
  h+='<button class="tv-btn tv-close" data-lvp="close">关闭</button>';
  showPanel(h);
}
function doGrade(){
  if(!S.vm||!S.scn) return;
  var g=E.grade(S.vm,S.scn);
  var p=prog(), rec=p[S.scn.id]||{best:0,perfect:false,runs:0};
  rec.runs++;
  if(g.pct>rec.best) rec.best=g.pct;
  var newPerfect=(g.pct===100)&&!rec.perfect;
  if(g.pct===100) rec.perfect=true;
  p[S.scn.id]=rec; LSset('wg.labprog',p);
  var gain=Math.round(g.got*0.3)+(newPerfect?60:0);
  if(gain>0) xp(gain,'模拟实训');
  if(g.pct===100){ vibrate([40,80,40]); badge('lab1'); }
  showGradePanel(g,newPerfect);
  saveSession(true);
}

/* ================= 面板（任务/文件/解法） ================= */
function showPanel(html){ var p=$('tvPanel'); if(!p) return; p.innerHTML=html; p.classList.add('on'); }
function hidePanel(){ var p=$('tvPanel'); if(p) p.classList.remove('on'); }
function showBrief(){
  if(!S.scn) return;
  var scn=S.scn, h='';
  h+='<h4>📋 '+esc(scn.title)+'</h4>';
  h+='<div class="tv-p-sec">任务要求</div><div>'+esc(scn.brief)+'</div>';
  h+='<div class="tv-p-sec">验收点（自动评分）</div><ol>';
  for(var i=0;i<scn.checks.length;i++) h+='<li>'+esc(scn.checks[i].d)+' <span style="color:#8b949e">('+scn.checks[i].p+'分)</span></li>';
  h+='</ol>';
  h+='<div class="tv-p-sec">提示（想不出来再看）</div><div id="lvHints">';
  for(var k=0;k<scn.hints.length;k++) h+='<button class="tv-btn" style="margin:4px 6px 0 0" data-lvp="hint:'+k+'">💡 提示 '+(k+1)+'</button>';
  h+='</div>';
  h+='<div class="tv-p-sec">工具箱</div>';
  h+='<button class="tv-btn" data-lvp="solution" style="margin:2px 6px 0 0">🧭 解题思路</button>';
  h+='<button class="tv-btn" data-lvp="demo" style="margin:2px 6px 0 0">▶ 看示范</button>';
  h+='<button class="tv-btn" data-lvp="close">关闭</button>';
  showPanel(h);
}
function showFiles(){
  if(!S.scn) return;
  var h='<h4>📝 常用文件</h4>';
  var fs=S.scn.files||[];
  if(!fs.length) h+='<div>本任务没有固定文件——用 <code>nano 路径</code> 或在任务里自行创建。</div>';
  for(var i=0;i<fs.length;i++){
    var ex=false; try{ ex=S.vm.exists(fs[i].p); }catch(e){}
    h+='<button class="tv-btn" style="display:block;width:100%;text-align:left;margin:6px 0" data-lvp="file:'+i+'">📄 '+esc(fs[i].t)+' <span style="color:#8b949e;font-size:11px">'+esc(fs[i].p)+'</span>'+(ex?'':' <span style="color:#e3b341;font-size:11px">(尚不存在)</span>')+'</button>';
  }
  h+='<div style="color:#8b949e;font-size:12px;margin-top:8px">相当于 nano 编辑；保存后记得让服务生效。</div>';
  h+='<button class="tv-btn tv-close" data-lvp="close">关闭</button>';
  showPanel(h);
}
function showSolution(){
  if(!S.scn) return;
  var h='<h4>🧭 解题思路（步骤梗概）</h4><ol>';
  for(var i=0;i<S.scn.solution.length;i++){ var st=S.scn.solution[i];
    if(st.w) h+='<li>编辑文件 <code>'+esc(st.w[0])+'</code></li>';
    else h+='<li><code>'+esc(st.c)+'</code></li>';
  }
  h+='</ol><div style="color:#8b949e;font-size:12px">建议先自己试；卡住了再看示范。</div>';
  h+='<button class="tv-btn" data-lvp="demo" style="margin-top:10px">▶ 自动演示一遍</button> ';
  h+='<button class="tv-btn" data-lvp="close">关闭</button>';
  showPanel(h);
}
function runDemo(){
  if(S.demoRunning) return;
  uiConfirm('将自动执行示范解法，全过程会显示在终端里。确定吗？',function(yes){
    if(!yes) return;
    S.demoRunning=true; hidePanel();
    var steps=S.scn.solution.slice(), i=0;
    (function next(){
      if(i>=steps.length){ S.demoRunning=false; push({s:'── 示范结束，点「评分」看看成绩 ──',c:'dim'}); return; }
      var st=steps[i++];
      if(st.w){
        var r=S.vm.write(st.w[0], st.w[1]);
        if(!r.ok){ S.vm.mkdirP(E.parentOf(S.vm.p(st.w[0]))); S.vm.write(st.w[0], st.w[1]); }
        push({s:'✎ 写入文件 '+st.w[0], c:'ok'}); saveSession(true);
      } else if(st.c){ execShow(st.c); }
      setTimeout(next, 450);
    })();
  });
}

/* ================= 重置 ================= */
function resetAsk(){ uiConfirm('重开任务会清空当前环境（已保存的历史最佳成绩保留）。确定吗？',function(yes){ if(yes) resetSession(); }); }
function resetSession(){
  if(!S.scn) return;
  var vm=E.newVM('lab-'+S.scn.id);
  E.scenarioNew(vm, S.scn.id);
  S.vm=vm; S.tail=welcomeTail(S.scn); S.wasAll=false;
  renderTerm(); saveSession(false); toast('↺ 环境已重置'); autoGrade();
}

/* ================= 自定义确认框 ================= */
function uiConfirm(msg,cb){ S.confirmCB=cb; $('tvConfirmMsg').textContent=msg; $('tvConfirm').classList.add('on'); }
function confirmDone(yes){ $('tvConfirm').classList.remove('on'); var cb=S.confirmCB; S.confirmCB=null; if(cb) cb(yes); }

/* ================= 进入/退出任务 ================= */
function openScenario(id,examMode){
  var s=loadSession(id); if(!s) return;
  S.vm=s.vm; S.scn=s.scn; S.tail=s.tail; S.hIdx=-1; S.hist=[]; S.wasAll=false; S.lastGrade=null;
  S.fromExam=!!examMode;
  $('termView').classList.add('on');
  $('tvTitle').textContent=S.scn.title;
  renderChips(); renderTerm(); hidePanel();
  if(S.editing) closeEditor();
  $('tvIn').value='';
  autoGrade();
  saveSession(true);
}
function backToCenter(){
  saveSession(false);
  $('termView').classList.remove('on');
  if(S.fromExam&&S.exam){ renderExamHub(); }
  else { try{ root.renderLabCenter(); }catch(e){} injectCenter(); }
}

/* ================= 模拟赛 ================= */
function examPaper(){ return S.exam?E.examById(S.exam.pid):null; }
function startExam(pid){
  var paper=E.examById(pid); if(!paper) return;
  var msg='开始「'+paper.t+'」？\n'+paper.ids.length+' 个任务 · 限时 '+paper.dur+' 分钟 · 交卷后自动判分。\n（会重置这些任务的环境）';
  if(S.exam) msg='已有一场模拟赛进行中，开始新的一场会放弃旧的。确定？';
  uiConfirm(msg,function(yes){
    if(!yes) return;
    for(var i=0;i<paper.ids.length;i++) LSdel(sessKey(paper.ids[i]));
    S.exam={pid:pid, ids:paper.ids.slice(), left:paper.dur*60, ts:Date.now()};
    LSset('wg.exam',S.exam);
    renderExamHub(); startTimer();
    toast('⏱ 模拟赛开始——祝顺利');
  });
}
function startTimer(){
  if(S.timer) return;
  S.timer=setInterval(function(){
    if(!S.exam){ clearInterval(S.timer); S.timer=null; return; }
    S.exam.left--;
    if(S.exam.left<=0){ S.exam.left=0; LSset('wg.exam',S.exam); clearInterval(S.timer); S.timer=null; finishExam(true); return; }
    if(S.exam.left%5===0) LSset('wg.exam',S.exam);
    var el=$('examClock'); if(el) el.textContent=fmtT(S.exam.left);
  },1000);
}
function updateClockUI(){ var el=$('examClock'); if(el&&S.exam) el.textContent=fmtT(S.exam.left); }
function renderExamHub(){
  var exam=S.exam||LS('wg.exam',null); if(!exam) return;
  S.exam=exam;
  var paper=examPaper(); if(!paper){ LSdel('wg.exam'); S.exam=null; return; }
  var lv=$('labView'); if(lv) lv.classList.add('on');
  var body=$('labBody'); if(!body) return;
  var p=prog(), h='';
  h+='<div class="qz-item"><div class="exam-head"><div style="flex:1"><h4 style="margin:0">🏟 '+esc(paper.t)+'</h4><div style="font-size:11.5px;color:var(--dim);margin-top:3px">'+esc(paper.desc)+'</div></div><div class="exam-clock" id="examClock">'+fmtT(exam.left)+'</div></div>';
  h+='<p class="lab-sub">逐个完成任务，可随时进出；倒计时结束或点「交卷」自动判卷。成绩按各任务得分率合计。</p></div>';
  h+='<div class="qz-item"><h4>📋 任务清单（'+paper.ids.length+'）</h4>';
  for(var i=0;i<paper.ids.length;i++){
    var id=paper.ids[i], scn=E.SCENARIO_BY_ID[id], rec=p[id];
    h+='<div style="display:flex;align-items:center;gap:9px;padding:10px 0;border-bottom:1px solid var(--line2)">'
      +'<div style="flex:1"><div style="font-size:13.5px;font-weight:700">'+(i+1)+'. '+esc(scn.title)+'</div>'
      +'<div style="font-size:11.5px;color:var(--dim);margin-top:2px">'+esc(scn.brief.slice(0,56))+'…</div></div>'
      +(rec?'<span class="lab-sc">'+rec.best+'%</span>':'')
      +'<button class="lab-rowbtn" data-lv="task:'+id+'">进入</button></div>';
  }
  h+='<button class="lab-rowbtn" style="width:100%;margin-top:14px;padding:12px" data-lv="examfin">⏹ 交卷并结算</button>';
  h+='<button class="qz-btn" style="width:100%;margin-top:8px;background:rgba(0,0,0,.05)" data-lv="examquit">放弃这场模拟</button>';
  h+='</div>';
  body.innerHTML=h;
  updateClockUI(); startTimer(); injectCenterNoop();
}
function injectCenterNoop(){ /* 比赛界面下不再注入板块 */ }
function finishExam(timeout){
  var exam=S.exam||LS('wg.exam',null); if(!exam) return;
  var paper=E.examById(exam.pid);
  if(!paper){ LSdel('wg.exam'); S.exam=null; return; }
  var rows=[], sumG=0, sumT=0;
  for(var i=0;i<paper.ids.length;i++){
    var id=paper.ids[i], scn=E.SCENARIO_BY_ID[id];
    var vm=E.newVM('exam-'+id), saved=LS(sessKey(id),null), loaded=false;
    if(saved&&saved.vm){ try{ loaded=E.vmFromJSON(vm,saved.vm); }catch(e){ loaded=false; } }
    if(!loaded) E.scenarioNew(vm,id);
    var g=E.grade(vm,scn);
    rows.push({id:id,t:scn.title,pct:g.pct,got:g.got,total:g.total});
    sumG+=g.got; sumT+=g.total;
  }
  var total=sumT?Math.round(sumG/sumT*100):0;
  var rec={pid:paper.id,t:paper.t,pct:total,rows:rows,ts:Date.now()};
  var hist=LS('wg.exams',[]); hist.unshift(rec); LSset('wg.exams',hist.slice(0,12));
  var gain=Math.round(sumG*0.4);
  if(gain>0) xp(gain, '模拟赛结算');
  badge('sim1');
  LSdel('wg.exam'); S.exam=null; if(S.timer){ clearInterval(S.timer); S.timer=null; }
  /* 报告 */
  var p=prog();
  for(var r=0;r<rows.length;r++){ var pr=p[rows[r].id]||{best:0,perfect:false,runs:0};
    if(rows[r].pct>pr.best) pr.best=rows[r].pct;
    if(rows[r].pct===100) pr.perfect=true;
    p[rows[r].id]=pr;
  }
  LSset('wg.labprog',p);
  var face=total>=90?'🏆':(total>=70?'🎉':(total>=50?'👍':'💪'));
  var h='<div class="qz-item" style="text-align:center"><div style="font-size:40px">'+face+'</div>'
   +'<h3 style="margin:8px 0;color:#c99700;font-size:20px">'+total+'%</h3>'
   +(timeout?'<p style="color:#d97706;font-size:13px">⏰ 时间到！</p>':'')
   +'<p class="lab-sub">'+esc(paper.t)+' · 获得 +'+gain+' XP</p></div>';
  h+='<div class="qz-item"><h4>📊 分项成绩</h4>';
  for(var x=0;x<rows.length;x++){ var row=rows[x];
    h+='<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line2)">'
      +'<div style="flex:1;font-size:13px">'+(x+1)+'. '+esc(row.t)+'</div>'
      +'<div style="font-size:12px;color:'+(row.pct>=80?'#1da851':(row.pct>=50?'#c99700':'#dc3545'))+';font-weight:700">'+row.pct+'%</div>'
      +'<button class="lab-rowbtn" data-lv="scn:'+row.id+'">复盘</button></div>';
  }
  h+='<button class="lab-rowbtn" style="width:100%;margin-top:14px;padding:12px" data-lv="ex:'+paper.id+'">🔄 再考一次</button>';
  h+='<button class="qz-btn" style="width:100%;margin-top:8px;background:rgba(0,0,0,.05)" data-lv="center">返回实战中心</button></div>';
  var body=$('labBody'); if(body) body.innerHTML=h;
  vibrate([40,80,40,80,40]);
}
function quitExam(){
  uiConfirm('放弃这场模拟？已做部分的进度保留在各自任务里。',function(yes){
    if(!yes) return;
    LSdel('wg.exam'); S.exam=null;
    if(S.timer){ clearInterval(S.timer); S.timer=null; }
    try{ root.renderLabCenter(); }catch(e){}
  });
}

/* ================= data-lv 事件委托（含触屏兜底） ================= */
var lvLast=0, lvLastEl=null, tX=0, tY=0, tT=0;
function lvFire(el){
  lvLast=Date.now(); lvLastEl=el;
  lvAction(el.getAttribute('data-lv'));
}
function lvAction(v){
  if(v.indexOf('ex:')===0){ startExam(v.slice(3)); }
  else if(v.indexOf('scn:')===0){ openScenario(v.slice(4), !!S.exam); }
  else if(v.indexOf('task:')===0){ openScenario(v.slice(5), true); }
  else if(v==='examgo'){ renderExamHub(); }
  else if(v==='examfin'){ uiConfirm('交卷结算？各任务按当前完成度评分。',function(yes){ if(yes) finishExam(false); }); }
  else if(v==='examquit'){ quitExam(); }
  else if(v==='center'){ try{ root.renderLabCenter(); }catch(e){} }
}
function bindLvEvents(){
  window._labUIBound=(window._labUIBound||0)+1;
  document.addEventListener('touchstart',function(e){ var t=e.touches[0]; if(t){ tX=t.clientX; tY=t.clientY; tT=Date.now(); } },{passive:true});
  document.addEventListener('touchend',function(e){
    var hit=e.target.closest('[data-lv]'); if(!hit) return;
    var t=e.changedTouches[0]; if(!t) return;
    if(Math.abs(t.clientX-tX)>14||Math.abs(t.clientY-tY)>14) return;
    if(Date.now()-tT>900) return;
    lvFire(hit);
  },{passive:true});
  document.addEventListener('click',function(e){
    var hit=e.target.closest('[data-lv]'); if(!hit) return;
    if(lvLastEl===hit && Date.now()-lvLast<800) return;  /* 同一元素的 touchend+click 去重 */
    lvFire(hit);
  });
  document.addEventListener('click',function(e){
    var c=e.target.closest('[data-lvc]'); if(!c) return;
    var box=$('tvChips'); if(!box||!box._cmds) return;
    var cmd=box._cmds[+c.getAttribute('data-lvc')]; if(!cmd) return;
    execShow(cmd);
  });
  document.addEventListener('click',function(e){
    var el=e.target.closest('[data-lvp]'); if(!el) return;
    var v=el.getAttribute('data-lvp');
    if(v==='close'){ hidePanel(); return; }
    if(v==='solution'){ showSolution(); return; }
    if(v==='demo'){ runDemo(); return; }
    if(v.indexOf('hint:')===0){
      var k=+v.slice(5);
      var box=$('lvHints');
      if(box){ box.insertAdjacentHTML('beforeend','<div style="margin-top:6px;color:#e3b341;font-size:12.5px">💡 '+esc(S.scn.hints[k]||'')+'</div>'); }
      return;
    }
    if(v.indexOf('file:')===0){
      var i=+v.slice(5), f=(S.scn.files||[])[i]; if(!f) return;
      hidePanel(); openEditor({path:f.p,mode:'edit'});
      return;
    }
  });
}

/* ================= 初始化 ================= */
function init(){
  window._labUIBound=0;
  window._labInitErr=null;
  try{
  var tv=$('termView'); if(!tv) return;
  $('tvBack').addEventListener('click',backToCenter);
  $('tvGradeBtn').addEventListener('click',doGrade);
  $('tvRun').addEventListener('click',function(){ var v=$('tvIn').value; if(v.trim()){ $('tvIn').value=''; execShow(v); } });
  var inp=$('tvIn');
  inp.addEventListener('keydown',function(e){
    if(e.key==='Enter'||e.keyCode===13){ e.preventDefault(); var v=inp.value; if(v.trim()){ inp.value=''; execShow(v); } }
    else if(e.key==='ArrowUp'){ if(S.hist.length){ S.hIdx=Math.max(0,(S.hIdx<0?S.hist.length:S.hIdx)-1); inp.value=S.hist[S.hIdx]||''; e.preventDefault(); } }
    else if(e.key==='ArrowDown'){ if(S.hist.length){ S.hIdx=Math.min(S.hist.length,S.hIdx+1); inp.value=S.hist[S.hIdx]||''; e.preventDefault(); } }
  });
  $('tvHUp').addEventListener('click',function(){ if(!S.hist.length) return; S.hIdx=Math.max(0,(S.hIdx<0?S.hist.length:S.hIdx)-1); inp.value=S.hist[S.hIdx]||''; });
  $('tvHDn').addEventListener('click',function(){ if(!S.hist.length) return; S.hIdx=Math.min(S.hist.length,S.hIdx+1); inp.value=(S.hist[S.hIdx]||''); });
  $('tvBriefBtn').addEventListener('click',function(){ var p=$('tvPanel'); if(p&&p.classList.contains('on')){ hidePanel(); } else showBrief(); });
  $('tvFilesBtn').addEventListener('click',function(){ var p=$('tvPanel'); if(p&&p.classList.contains('on')){ hidePanel(); } else showFiles(); });
  $('tvDemoBtn').addEventListener('click',runDemo);
  $('tvResetBtn').addEventListener('click',resetAsk);
  $('tvEditSave').addEventListener('click',saveEditor);
  $('tvEditCancel').addEventListener('click',closeEditor);
  $('tvEditClose').addEventListener('click',closeEditor);
  $('tvConfirmYes').addEventListener('click',function(){ confirmDone(true); });
  $('tvConfirmNo').addEventListener('click',function(){ confirmDone(false); });
  /* 键盘弹起时把输入条顶上来 */
  if(window.visualViewport){
    var vv=window.visualViewport;
    var upd=function(){ var off=Math.max(0, window.innerHeight-vv.height-vv.offsetTop); tv.style.paddingBottom=off+'px'; };
    vv.addEventListener('resize',upd); vv.addEventListener('scroll',upd);
  }
  /* 恢复进行中的模拟赛计时 */
  var ex=LS('wg.exam',null);
  if(ex){ S.exam=ex; startTimer(); }
  bindLvEvents();
  }catch(e){ window._labInitErr=String(e.message)+' @'+(e.lineNumber||'')+' stack:'+String(e.stack||'').slice(0,300); }
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();

root.LabUI={ injectCenter:injectCenter, openScenario:openScenario, startExam:startExam, _S:S };
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));
