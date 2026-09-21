#!/usr/bin/env node
/* app/test-rank.js · 段位体系逻辑验收（node 模拟 localStorage / DOM）
   运行：node app/test-rank.js
   退出码 0 = 全绿 */
'use strict';
const vm=require('vm'), fs=require('fs'), path=require('path');
const SRC=fs.readFileSync(path.join(__dirname,'rank.js'),'utf8');

let pass=0, fail=0;
function ok(cond,msg){ if(cond){ pass++; } else { fail++; console.log('  ✗ FAIL:',msg); } }
function section(t){ console.log('== '+t); }

function mkEnv(opts){
  const store={}, els={};
  function el(id){
    if(!els[id]) els[id]={id:id,innerHTML:'',textContent:'',style:{},classList:{_s:new Set(),add(c){this._s.add(c)},remove(c){this._s.delete(c)},contains(c){return this._s.has(c)}}};
    return els[id];
  }
  const sandbox={
    console:console, setTimeout:setTimeout, clearTimeout:clearTimeout,
    localStorage:{ getItem:k=>(k in store?store[k]:null), setItem:(k,v)=>{store[k]=String(v)}, removeItem:k=>{delete store[k]} },
    navigator:{}, Date:Date, Math:Math, JSON:JSON,
    document:{ readyState:'complete', getElementById:id=>el(id), addEventListener:function(){} }
  };
  sandbox.window=sandbox; sandbox.globalThis=sandbox;
  sandbox.QUIZ_BANK=opts.bank||{};
  sandbox.LabEngine={SCENARIOS:opts.scns||[]};
  sandbox.__store=store; sandbox.__els=els;
  if(opts.preStore){ Object.keys(opts.preStore).forEach(function(k){ store[k]=JSON.stringify(opts.preStore[k]); }); }
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox);
  return sandbox;
}
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function mkBank(ids){
  const b={};
  ids.forEach(function(c){
    b[c]={t:'章节 '+c, q:[
      {q:'Q1'+c,o:['a','b','c','d'],a:0,e:'e1'},
      {q:'Q2'+c,o:['a','b','c','d'],a:1,e:'e2'},
      {q:'Q3'+c,o:['a','b','c','d'],a:2,e:'e3'},
      {q:'Q4'+c,o:['a','b','c','d'],a:3,e:'e4'}]};
  });
  return b;
}
function mkScns(n,prefix){
  const a=[]; for(let i=1;i<=n;i++) a.push({id:(prefix||'web')+i, mod:'M', title:'场景'+i});
  return a;
}
function seed(env,k,v){ env.localStorage.setItem(k,JSON.stringify(v)); }
function getJSON(env,k){ const v=env.localStorage.getItem(k); return v?JSON.parse(v):null; }
/* 模拟答题：answers[i] = true 答对 / false 答错 */
function playTrial(R, answers){
  for(let i=0;i<answers.length;i++){
    const t=R._t.getTR(); if(!t){ return {stoppedAt:i}; }
    const q=t.qs[t.i];
    const idx = answers[i] ? q.a : ((q.a+1)%q.o.length);
    R._t.answer(idx);
    R._t.next();
    if(!R._t.getTR()) return {finished:true, at:i};
  }
  return {finished:!R._t.getTR()};
}

/* ============ 用例 1：全新账号 = 见习云工 ============ */
section('1. 全新账号');
{
  const env=mkEnv({bank:mkBank(['c1','c2','c3','c4','c5']),scns:mkScns(3)});
  const R=env.Rank;
  ok(!!R,'Rank 已导出');
  const ctx=R._t.collect();
  ok(ctx.quiz===0&&ctx.lab===0,'初始成绩为 0（quiz='+ctx.quiz+', lab='+ctx.lab+'）');
  ok(ctx.quizTotal===5,'测验总章数=5（'+ctx.quizTotal+'）');
  ok(ctx.labTotal===3,'实训总数=3（'+ctx.labTotal+'）');
  ok(R._t.currentLevel(R._t.state())===1,'初始段位=Lv.1');
  const nx=R._t.nextDef(1);
  ok(nx&&nx.t==='云学徒','下一目标=Lv.2 云学徒');
  const ev=R._t.evalReqs(nx,ctx);
  ok(ev.length===3&&!ev[0].met&&!ev[1].met&&!ev[2].met,'Lv.2 三项条件均未达成');
  ok(ev[0].curTxt==='0/3 章','测验进度文案 0/3 章（'+ev[0].curTxt+'）');
  const html=env.__els['grow-slot'].innerHTML;
  ok(html.indexOf('Lv.1')>=0&&html.indexOf('进阶之路')>=0,'首页段位卡已渲染');
  ok(html.indexOf('XP')<0,'首页卡不含 XP 字样');
}

/* ============ 用例 2：达标 → 就绪 → 晋级 ============ */
section('2. 达标→就绪→晋级全流程');
{
  const env=mkEnv({bank:mkBank(['c1','c2','c3','c4','c5','tutorial_01','tutorial_02']),scns:mkScns(3)});
  const R=env.Rank;
  seed(env,'wg.quiz',{c1:{best:3,total:4},c2:{best:4,total:4},c3:{best:3,total:4},c4:{best:2,total:4},tutorial_01:{best:4,total:4},tutorial_02:{best:4,total:4}});
  seed(env,'wg.labprog',{web1:{best:100,runs:1},web2:{best:100,runs:2}});
  let ctx=R._t.collect();
  ok(ctx.quiz===5,'达到 75% 的章节数=5（c4 为 2/4 不达标）');
  ok(ctx.lab===2,'实训全对=2');
  const ev=R._t.evalReqs(R._t.nextDef(1),ctx);
  ok(ev[0].met&&ev[1].met,'Lv.2 条件全部达成');
  R.event();
  ok(R._t.state().rnotify===2,'就绪提示已记录 rnotify=2');
  const pool=R._t.buildPool();
  ok(pool.length===20,'题池=20（5 章达标×4 题）');
  ok(!pool.some(p=>p.src.indexOf('c4')>=0),'未达标章节 c4 未入池');
  R._t.startTrial();
  const tr=R._t.getTR();
  ok(tr&&tr.lv===2&&tr.qs.length===8,'考核开始：Lv.2 / 8 题（考纲范围题池）');
  const res=playTrial(R,new Array(12).fill(true));
  ok(res.finished,'考核完成');
  ok(R._t.state().promos['2']>0,'已晋升 Lv.2（promos[2] 已写入）');
  ok(R._t.currentLevel(R._t.state())===2,'当前段位=Lv.2');
  ok(env.__els['rkModal'].classList.contains('on'),'晋升证书已弹出');
  ok(env.__els['rkCert'].innerHTML.indexOf('云学徒')>=0,'证书含段位名「云学徒」');
  R.act('mok');
  ok(!env.__els['rkModal'].classList.contains('on'),'点「继续前进」后证书关闭');
  ok(env.__els['rankBody'].innerHTML.indexOf('Lv.3')>=0,'晋级后页面出现 Lv.3 目标');
}

/* ============ 用例 3：考核失败路径 ============ */
section('3. 考核失败路径');
{
  const env=mkEnv({bank:mkBank(['c1','c2','c3','tutorial_01','tutorial_02']),scns:mkScns(2)});
  const R=env.Rank;
  seed(env,'wg.quiz',{c1:{best:3,total:4},c2:{best:3,total:4},c3:{best:3,total:4},tutorial_01:{best:4,total:4},tutorial_02:{best:4,total:4}});
  seed(env,'wg.labprog',{web1:{best:100},web2:{best:100}});
  R._t.startTrial();
  const answers=new Array(12).fill(false); answers[0]=answers[1]=answers[2]=true;
  const res=playTrial(R,answers);
  ok(res.finished,'考核完成（答对 3/8）');
  ok(!R._t.state().promos['2'],'未晋升（promos[2] 不存在）');
  ok(R._t.currentLevel(R._t.state())===1,'段位仍为 Lv.1');
  const trials=R._t.state().trials;
  ok(trials.length===1&&trials[0].pass===false&&trials[0].pct===38,'考核记录：38% 未通过（'+trials[0].pct+'%）');
  ok(env.__els['rankBody'].innerHTML.indexOf('错题回顾')>=0,'失败页含错题回顾');
  const r2=playTrial2(R);
  function playTrial2(R){ R._t.startTrial(); if(!R._t.getTR()) return false; return playTrial(R,new Array(12).fill(true)).finished; }
  ok(r2&&R._t.currentLevel(R._t.state())===2,'重考全对后成功晋升 Lv.2');
}

/* ============ 用例 4：模拟赛条件 ============ */
section('4. 模拟赛条件判定');
{
  const env=mkEnv({bank:mkBank(['c1','c2','c3']),scns:mkScns(3)});
  const R=env.Rank;
  seed(env,'wg.exams',[{pid:'mini',t:'迷你',pct:92,ts:1},{pid:'mini',t:'迷你',pct:60,ts:2},{pid:'std',t:'标准',pct:55,ts:3},{pid:'fix',t:'排障',pct:72,ts:4}]);
  const ctx=R._t.collect();
  ok(ctx.simBest['mini']===92,'迷你模拟取最高分=92');
  const s=R._t.state(); s.promos={2:1,3:2}; R._t.save(s);
  const ev4=R._t.evalReqs(R._t.defByN(4),ctx);
  ok(ev4[2].met,'Lv.4：迷你≥85 达成');
  ok(ev4[3].met&&ev4[3].curTxt==='72 分','Lv.4：标准/排障任一≥70 达成（当前 72 分）');
}

/* ============ 用例 5：全部实训 / 满级边界 ============ */
section('5. 全量与满级边界');
{
  const env=mkEnv({bank:mkBank(['c1','c2','c3']),scns:mkScns(3,'web')});
  const R=env.Rank;
  seed(env,'wg.labprog',{web1:{best:100},web2:{best:100}});
  const s=R._t.state(); s.promos={2:1,3:2,4:3,5:4,6:5}; R._t.save(s);
  let ctx=R._t.collect();
  let ev7=R._t.evalReqs(R._t.defByN(7),ctx);
  ok(!ev7[1].met&&ev7[1].curTxt==='2/3 个','Lv.7 全部实训：2/3 未达成');
  seed(env,'wg.labprog',{web1:{best:100},web2:{best:100},web3:{best:100}});
  ctx=R._t.collect();
  ev7=R._t.evalReqs(R._t.defByN(7),ctx);
  ok(ev7[1].met,'补齐第 3 个后达成');
  ok(ev7[1].txt.indexOf('全部 3 个')>=0,'文案动态显示「全部 3 个实训场景」（'+ev7[1].txt+'）');
  ok(R._t.nextDef(7)===null,'Lv.7 为最高段位，无更高目标');
}

/* ============ 用例 6：连续天数与旧数据迁移 ============ */
section('6. 连续天数 / 迁移');
{
  const env=mkEnv({bank:mkBank(['c1']),scns:mkScns(1)});
  const R=env.Rank;
  ok(R._t.state().streak>=1,'首次启动连续天数≥1');
  const s1=R._t.state(); const before=s1.streak;
  R.streak(); ok(R._t.state().streak===before,'同日重复调用不累计');
  // 旧 wg.grow 迁移（需在加载前预置，模拟真实升级场景）
  const env2=mkEnv({bank:{},scns:[], preStore:{'wg.grow':{streak:6,last:todayStr()}}});
  const R2=env2.Rank;
  ok(R2._t.state().streak===6,'旧版连续天数(6)迁移成功（当日不重复累计）');
}

/* ============ 用例 7：75% 边界 ============ */
section('7. 达标线边界');
{
  const env=mkEnv({bank:mkBank(['a','b']),scns:[]});
  const R=env.Rank;
  seed(env,'wg.quiz',{a:{best:3,total:4},b:{best:2,total:4}});
  ok(R._t.collect().quiz===1,'3/4 达标、2/4 不达标');
}

console.log('\nRESULT: '+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
