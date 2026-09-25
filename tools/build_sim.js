#!/usr/bin/env node
// build_sim.js —— 遍历 multiskill 下所有 *-模拟训练.json，与模板合成自包含 HTML
const fs = require('fs'), path = require('path');
const ROOT = '/data/data/com.openminis.app/files/minis-global/shared/worldskills-cloud/multiskill';
const TPL = fs.readFileSync(path.join(__dirname, 'sim_template.html'), 'utf8');
function walk(d){let o=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);e.isDirectory()?o=o.concat(walk(p)):(e.name.endsWith('-模拟训练.json')&&o.push(p));}return o;}
let ok=0,fail=0;
for(const f of walk(ROOT)){
  try{
    const data=JSON.parse(fs.readFileSync(f,'utf8'));
    if(!Array.isArray(data.questions)||!data.questions.length)throw new Error('no questions');
    // 校验题型
    for(const q of data.questions){
      if(!['single','judge','order'].includes(q.type))throw new Error('bad type '+q.type);
      if(!q.q||!q.explain)throw new Error('missing q/explain');
      if(q.type==='single'&&(!Array.isArray(q.options)||q.options.length<2||typeof q.answer!=='number'))throw new Error('bad single');
      if(q.type==='judge'&&typeof q.answer!=='boolean')throw new Error('bad judge');
      if(q.type==='order'&&(!Array.isArray(q.steps)||!Array.isArray(q.answer)||q.steps.length!==q.answer.length))throw new Error('bad order');
    }
    const html=TPL
      .replace('__SKILL__',data.skill)
      .replace(/__SKILL__/g,data.skill)
      .replace('__INTRO__',data.intro||('围绕 '+data.skill+' 总纲设计的交互训练，完成后查看评级并回读薄弱部分。'))
      .replace('__COUNT__',data.questions.length)
      .replace(/__COUNT__/g,data.questions.length)
      .replace('__DATA__',JSON.stringify(data.questions));
    const out=f.replace(/\.json$/,'.html');
    fs.writeFileSync(out,html);
    console.log('OK',path.basename(out),data.questions.length+'题');
    ok++;
  }catch(e){console.log('FAIL',path.basename(f),e.message);fail++;}
}
console.log('SIM_BUILD_DONE ok='+ok+' fail='+fail);
