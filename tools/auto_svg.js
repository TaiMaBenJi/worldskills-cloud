#!/usr/bin/env node
// auto_svg.js —— 从各赛项总纲自动提取内容，程序化填模板生成缺失的路线图/能力域 SVG
const fs = require('fs'), path = require('path');
const ROOT = '/data/data/com.openminis.app/files/minis-global/shared/worldskills-cloud/multiskill';
const TPL_D = fs.readFileSync('/data/data/com.openminis.app/files/minis-global/shared/worldskills-cloud/tools/svg_templates/路线图.svg', 'utf8');
const TPL_C = fs.readFileSync('/data/data/com.openminis.app/files/minis-global/shared/worldskills-cloud/tools/svg_templates/能力域.svg', 'utf8');
function walk(d){let o=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);e.isDirectory()?o=o.concat(walk(p)):(e.name.endsWith('.md')&&e.name!=='README.md'&&o.push(p));}return o;}
function clip(s,n){s=String(s).trim();return s.length<=n?s:s.slice(0,n-1)+'。';}
function xmlSafe(s){return String(s).replace(/&/g,'和').replace(/</g,'《').replace(/>/g,'》').replace(/"/g,'');}
let made=0,skip=0;
for(const f of walk(ROOT).sort()){
  const dir=path.dirname(f), skill=path.basename(f,'.md');
  const outR=path.join(dir,skill+'-路线图.svg'), outC=path.join(dir,skill+'-能力域.svg');
  const text=fs.readFileSync(f,'utf8');
  const lines=text.split('\n').map(l=>l.trim());
  const title=(lines[0]||skill).split('·')[0].trim();
  // ---- 四阶段（来自第四部分） ----
  let inS4=false, stages=[];
  for(const l of lines){
    if(/^四、/.test(l)){inS4=true;continue;}
    if(/^[一二三四五六七八九十]、/.test(l)&&inS4)break;
    if(inS4&&/^阶段[一二三四]/.test(l))stages.push(l);
  }
  stages=stages.slice(0,4);
  if(stages.length===4&&!fs.existsSync(outR)){
    let svg=TPL_D.split('TITLE_TEXT').join(xmlSafe(title+' · 精通路线')).split('SUB_TEXT').join('从零到赛场的四个阶段')
      .split('FOOT_TEXT').join('依据总纲第四部分绘制 · 赛项标准以世界技能组织官方文件为准');
    stages.forEach((st,i)=>{
      const n=i+1;
      const m=st.match(/^阶段[一二三四]：(.+?)（(.+?)）/);
      const name=m?clip(m[1],6):clip(st,6);
      const time=m?m[2]:'按计划推进';
      svg=svg.split('S'+n+'_NAME').join(xmlSafe(name)).split('S'+n+'_TIME').join(xmlSafe(time));
      // 目标：取该阶段段落里 验收标准： 后的第一个短句
      let goal='';
      const idx=lines.indexOf(st);
      for(let j=idx+1;j<lines.length;j++){
        const l=lines[j];
        if(/^阶段[一二三四]/.test(l)||/^[一二三四五六七八九十]、/.test(l))break;
        const vm=l.match(/验收标准[：:]?(.+)/);
        if(vm){goal=clip(vm[1].split(/[，,。；;]/)[0],10);break;}
      }
      if(!goal)goal='完成阶段任务';
      svg=svg.split('S'+n+'_GOAL').join(xmlSafe(goal));
    });
    fs.writeFileSync(outR,svg);made++;
  } else if(fs.existsSync(outR)){skip++;}
  // ---- 能力域（来自第三部分编号项） ----
  let inS3=false, domains=[];
  for(const l of lines){
    if(/^三、/.test(l)){inS3=true;continue;}
    if(/^[一二三四五六七八九十]、/.test(l)&&inS3)break;
    if(inS3){const m=l.match(/^(\d+)[.、] ?(.+)/);if(m)domains.push(m[2]);}
  }
  if(domains.length&&!fs.existsSync(outC)){
    // 合并到 6 个：名字取冒号前，描述取前两个顿号词
    const items=[];
    for(const d of domains){
      const mm=d.match(/^(.+?)：(.+)/);
      const name=clip(mm?mm[1]:d,6);
      const desc=mm?clip(mm[2].split('、').slice(0,2).join('、'),10):clip(d,10);
      items.push({name,desc});
      if(items.length===6)break;
    }
    while(items.length<6)items.push({name:'综合素养',desc:'按总纲补齐'});
    let svg=TPL_C.split('TITLE_TEXT').join(xmlSafe(title+' · 核心能力域')).split('SUB_TEXT').join('总纲能力域归纳')
      .split('FOOT_TEXT').join('依据总纲第三部分绘制 · 赛项标准以世界技能组织官方文件为准');
    items.forEach((it,i)=>{
      const n=i+1;
      svg=svg.split('D'+n+'_NUM').join('0'+n).split('D'+n+'_NAME').join(xmlSafe(it.name)).split('D'+n+'_DESC').join(xmlSafe(it.desc));
    });
    fs.writeFileSync(outC,svg);made++;
  } else if(fs.existsSync(outC)){skip++;}
}
console.log('SVG_MADE='+made+' SKIP(已存在)='+skip);
