/* =====================================================================
   lab-engine.js · 云战模拟实训引擎 v1.0（应用内可直接操作）
   纯 JS 无依赖：虚拟服务器（文件系统/软件包/服务/用户/进程/网络/数据库）
   + 类 bash 命令解释器 + 自动评分。浏览器 / Node 双兼容。
   设计目标：与 wsarena 真机训练场同评分标准，先在此练熟再上真机。
   ===================================================================== */
(function(root){
'use strict';
var isNode = (typeof window === 'undefined');

/* ---------------- 基础工具 ---------------- */
function C(s,c){ return {s:String(s), c:c||null}; }   /* 彩色行 */
function pad(n,w){ n=String(n); while(n.length<w) n='0'+n; return n; }
function parentOf(p){ p=p.replace(/\/+$/,''); var i=p.lastIndexOf('/'); return i<=0?'/':p.slice(0,i); }
function baseOf(p){ p=p.replace(/\/+$/,''); var i=p.lastIndexOf('/'); return i<0?p:p.slice(i+1); }
function norm(p, cwd){
  if(p===undefined||p===null||p==='') p='.';
  p=String(p); if(p[0]!=='/') p=(cwd==='/'?'':cwd)+'/'+p;
  var parts=p.split('/'), out=[];
  for(var i=0;i<parts.length;i++){ var x=parts[i];
    if(x===''||x==='.') continue;
    if(x==='..'){ out.pop(); continue; }
    out.push(x);
  }
  return '/'+out.join('/');
}
function fmtSize(n){
  var u=['B','K','M','G','T'], i=0;
  while(n>=1024 && i<4){ n/=1024; i++; }
  return (i===0? n : (n<10? n.toFixed(1): Math.round(n)))+u[i];
}
function modeStr(m){ /* 755 / 1777 */ var s=Number(m).toString(8); while(s.length<3) s='0'+s; return s; }
function parseMode(s){
  s=String(s).replace(/^0?o?/,'');
  if(/^[0-7]{3,4}$/.test(s)) return parseInt(s,8);
  return null;
}

/* ---------------- 虚拟服务器 VM ---------------- */
function VM(id){
  this.id = id||'lab';
  this.hostname='srv1';
  this.timezone='Etc/UTC';
  this.cwd='/root';
  this.f={};          /* path -> {d:1,m,u,g} | {c:'内容',m,u,g} | {l:'目标'} */
  this.sz={};         /* path -> 覆盖大小（大文件模拟） */
  this.pkgs={};
  this.svcs={};       /* name -> {installed,running,enabled,snap,desc} */
  this.users={root:{uid:0,g:['root'],pw:null,home:'/root',shell:'/bin/bash'}};
  this.groups={root:{gid:0,members:[]},sudo:{gid:27,members:[]},wheel:{gid:10,members:[]},
               'www-data':{gid:33,members:[]},adm:{gid:4,members:[]}};
  this.env={HOME:'/root',USER:'root',SHELL:'/bin/bash',
            PATH:'/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'};
  this.disk={total:10*1000*1000*1000};
  this.fw={tool:null,active:false,policyIn:'deny',rules:[]};
  this.sql={dbs:{},u:{},sys:['information_schema','mysql','performance_schema']};
  this.docker={images:{},containers:{},volumes:{}};
  this.sim={};        /* 场景注入：虚拟后端监听器 sim.listeners = {8081:{tag,body,down}} */
  this.journal=[];
  this.rrCount=0;
  this.ansible=null;
  this.ldapE=[];
  this.sambaShares={};
  this.extra={};
  this.hist=[];
  this.lastCode=0;
  this._seed();
}

/* ---- 文件系统 ---- */
VM.prototype.p=function(x){ return norm(x, this.cwd); };
VM.prototype.exists=function(x){ return !!this.f[this.p(x)]; };
VM.prototype.isDir=function(x){ var n=this.f[this.p(x)]; return !!(n&&n.d); };
VM.prototype.node=function(x){ return this.f[this.p(x)]; };

VM.prototype.read=function(x){
  var pth=this.p(x), n=this.f[pth];
  if(!n) return null;
  if(n.d) return null;
  return n.c===undefined?'':n.c;
};
VM.prototype.write=function(x, c, opt){
  opt=opt||{};
  var pth=this.p(x), par=parentOf(pth);
  if(pth!=='/' && !this.isDir(par) && !opt.mkparent) return {ok:false, err:'目录不存在: '+par};
  var old=this.f[pth];
  if(old && old.d) return {ok:false, err:'是一个目录: '+pth};
  this.f[pth]=Object.assign({}, old||{}, {c:String(c), m:(opt.m!==undefined?opt.m:(old&&old.m!==undefined?old.m:0o644)),
    u:(opt.u||(old&&old.u)||'root'), g:(opt.g||(old&&old.g)||'root')});
  return {ok:true};
};
VM.prototype.mkdir=function(x, mode, u, g){
  var pth=this.p(x);
  if(this.f[pth]){
    if(!this.f[pth].d) return {ok:false, err:'已存在且不是目录: '+pth};
    return {ok:true, existed:true};
  }
  var par=parentOf(pth);
  if(pth!=='/' && !this.isDir(par)) return {ok:false, err:'父目录不存在: '+par};
  this.f[pth]={d:1, m:mode||0o755, u:u||'root', g:g||'root'};
  return {ok:true};
};
VM.prototype.mkdirP=function(x, mode){
  var pth=this.p(x), parts=pth.split('/'), cur='';
  for(var i=0;i<parts.length;i++){
    if(parts[i]==='') continue;
    cur+='/'+parts[i];
    if(!this.f[cur]) this.f[cur]={d:1, m:mode||0o755, u:'root', g:'root'};
  }
  return {ok:true};
};
VM.prototype.children=function(x){
  var pth=this.p(x); if(pth!=='/') pth=pth+'/';
  var out=[];
  for(var k in this.f){
    if(k===this.p(x)) continue;
    if(k.indexOf(pth)!==0) continue;
    var rest=k.slice(pth.length);
    if(rest.indexOf('/')>=0) continue;
    out.push(rest);
  }
  return out.sort();
};
VM.prototype.rm=function(x, rec){
  var pth=this.p(x), n=this.f[pth];
  if(!n) return {ok:false, err:'不存在: '+pth};
  var isD=!!n.d;
  if(isD){
    var kids=this.children(pth);
    if(kids.length && !rec) return {ok:false, err:'目录非空（需要 -r）: '+pth};
    var pref=pth==='/'?'/':pth+'/';
    for(var k in this.f){ if(k===pth||k.indexOf(pref)===0) delete this.f[k]; }
  } else delete this.f[pth];
  delete this.sz[pth];
  return {ok:true, dir:isD};
};
VM.prototype.cp=function(a,b,rec){
  var pa=this.p(a), pb=this.p(b), na=this.f[pa];
  if(!na) return {ok:false, err:'不存在: '+pa};
  if(na.d){
    if(!rec) return {ok:false, err:'omitting directory '+pa};
    this.mkdirP(pb);
    var pref=pa+'/', self=this;
    for(var k in this.f){ if(k.indexOf(pref)===0){
      var dst=pb+k.slice(pa.length);
      if(this.f[k].d) self.mkdirP(dst); else self.f[dst]=Object.assign({},this.f[k]);
    }}
    return {ok:true};
  }
  if(this.isDir(pb)) pb=pb+'/'+baseOf(pa);
  this.f[pb]=Object.assign({}, na);
  return {ok:true};
};
VM.prototype.mv=function(a,b){
  var r=this.cp(a,b,true); if(!r.ok) return r;
  var pa=this.p(a);
  if(this.isDir(pa)){ this.rm(pa,true); } else delete this.f[pa];
  return {ok:true};
};
VM.prototype.chmod=function(x, mode){
  var pth=this.p(x), n=this.f[pth];
  if(!n) return {ok:false, err:'不存在: '+pth};
  n.m=mode; return {ok:true};
};
VM.prototype.chown=function(x, u, g){
  var pth=this.p(x), n=this.f[pth];
  if(!n) return {ok:false, err:'不存在: '+pth};
  if(u) n.u=u; if(g) n.g=g; return {ok:true};
};
VM.prototype.statOf=function(x){
  var pth=this.p(x), n=this.f[pth];
  if(!n) return null;
  return {path:pth, dir:!!n.d, m:n.m!==undefined?n.m:(n.d?0o755:0o644),
          u:n.u||'root', g:n.g||'root',
          size: this.sizeOf(pth), link:n.l||null};
};
VM.prototype.sizeOf=function(pth){
  if(this.sz[pth]!==undefined) return this.sz[pth];
  var n=this.f[pth]; if(!n) return 0;
  if(n.d) return 4096;
  return n.c?n.c.length:0;
};
VM.prototype.diskUsed=function(){
  var used=1.1*1000*1000*1000;
  for(var k in this.f){
    var s=this.sz[k]!==undefined?this.sz[k]:(this.f[k].c?this.f[k].c.length:0);
    if(this.f[k].d) s=4096;
    used+=s;
  }
  return used;
};
VM.prototype.findByName=function(dir, re){
  var pth=this.p(dir), pref=pth==='/myroot/'?'/':pth+'/', out=[], self=this;
  for(var k in this.f){
    if(pth==='/') pref='/'; else pref=pth+'/';
    if(k.indexOf(pref)===0 && self.f[k] && !self.f[k].d && re.test(baseOf(k))) out.push(k);
  }
  return out;
};
VM.prototype.syncPasswd=function(){
  var lines=[], self=this;
  var order=Object.keys(this.users).sort(function(a,b){ return (self.users[a].uid||999)-(self.users[b].uid||999); });
  for(var i=0;i<order.length;i++){ var u=order[i];
    lines.push(u+':x:'+(this.users[u].uid||1000+i)+':'+(this.gidOf(u))+':'+(this.users[u].gecos||u)+':'+this.users[u].home+':'+this.users[u].shell);
  }
  this.f['/etc/passwd']={c:lines.join('\n')+'\n', m:0o644,u:'root',g:'root'};
  var gl=[], gs=Object.keys(this.groups).sort(function(a,b){ return (self.groups[a].gid||999)-(self.groups[b].gid||999); });
  for(var j=0;j<gs.length;j++){ var g=gs[j];
    gl.push(g+':x:'+(this.groups[g].gid||1000+j)+':'+((this.groups[g].members||[]).join(',')));
  }
  this.f['/etc/group']={c:gl.join('\n')+'\n', m:0o644,u:'root',g:'root'};
};
VM.prototype.gidOf=function(u){
  var gs=this.users[u]&&this.users[u].g;
  if(gs&&gs.length){ var g=this.groups[gs[0]]; if(g&&g.gid!==undefined) return g.gid; }
  return this.users[u]&&this.users[u].uid||1000;
};
VM.prototype.addUser=function(name, opts){
  opts=opts||{};
  if(this.users[name]) return {ok:false, err:'用户已存在: '+name};
  var uid=1000+Object.keys(this.users).length;
  this.users[name]={uid:uid, g:[opts.group||name], pw:null, home:opts.home||('/home/'+name), shell:opts.shell||'/bin/bash'};
  if(!this.groups[opts.group||name]) this.groups[opts.group||name]={gid:uid, members:[]};
  if(opts.groups){ for(var i=0;i<opts.groups.length;i++){ var g=opts.groups[i];
    if(!this.groups[g]) this.groups[g]={gid:1100+i, members:[]};
    if(this.groups[g].members.indexOf(name)<0) this.groups[g].members.push(name);
  }}
  if(opts.mkhome){ this.mkdirP(this.users[name].home); this.f[this.users[name].home+'/.bashrc']={c:'# ~/.bashrc\n', m:0o644,u:name,g:name}; }
  this.syncPasswd();
  return {ok:true};
};
VM.prototype.addGroup=function(name){
  if(this.groups[name]) return {ok:false, err:'组已存在: '+name};
  this.groups[name]={gid:1000+Object.keys(this.groups).length, members:[]};
  this.syncPasswd();
  return {ok:true};
};
VM.prototype.userMod=function(name, opts){
  if(!this.users[name]) return {ok:false, err:'用户不存在: '+name};
  if(opts.addGroups){ for(var i=0;i<opts.addGroups.length;i++){ var g=opts.addGroups[i];
    if(!this.groups[g]) this.groups[g]={gid:1200+i, members:[]};
    if(this.groups[g].members.indexOf(name)<0) this.groups[g].members.push(name);
  }}
  this.syncPasswd(); return {ok:true};
};

/* ---- 日志 ---- */
VM.prototype.log=function(svc, msg){
  var d=new Date();
  this.journal.push({t:d, svc:svc||'system', msg:msg});
  if(this.journal.length>400) this.journal.splice(0, 120);
};
VM.prototype.journalOf=function(svc, n){
  var out=[];
  for(var i=this.journal.length-1;i>=0 && out.length<n;i--){
    var e=this.journal[i];
    if(svc && e.svc!==svc) continue;
    out.unshift(e);
  }
  return out;
};

/* ---------------- 初始化：一台干净的 Ubuntu 服务器 ---------------- */
VM.prototype._seed=function(){
  var dirs=['/bin','/boot','/dev','/etc','/etc/ssh','/etc/logrotate.d','/etc/cron.d','/etc/cron.daily',
    '/home','/opt','/root','/root/.ssh','/srv','/srv/tftp','/srv/share','/srv/site','/srv/public',
    '/tmp','/usr','/usr/bin','/usr/sbin','/usr/local','/usr/local/bin','/usr/share','/usr/share/zoneinfo',
    '/var','/var/log','/var/log/nginx','/var/log/room','/var/www','/var/www/html','/var/lib',
    '/var/spool','/var/spool/cron','/var/spool/cron/crontabs','/backup','/mnt','/proc','/sys','/run'];
  for(var i=0;i<dirs.length;i++) this.mkdirP(dirs[i]);
  var files={
    '/etc/hostname':'srv1\n',
    '/etc/hosts':'127.0.0.1\tlocalhost\n127.0.1.1\tsrv1\n192.168.1.10\tsrv1.corp.local srv1\n',
    '/etc/os-release':'PRETTY_NAME="Ubuntu 24.04.1 LTS"\nNAME="Ubuntu"\nVERSION_ID="24.04"\n',
    '/etc/resolv.conf':'nameserver 127.0.0.1\n',
    '/etc/timezone':'Etc/UTC\n',
    '/etc/localtime':'TZif2',
    '/etc/motd':'Welcome to Ubuntu 24.04.1 LTS\n',
    '/etc/ssh/sshd_config':'Port 22\n#PermitRootLogin yes\n#PasswordAuthentication yes\nPubkeyAuthentication yes\n#AuthorizedKeysFile .ssh/authorized_keys\n',
    '/etc/crontab':'# /etc/crontab: system-wide crontab\nSHELL=/bin/sh\nPATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin\n',
    '/etc/logrotate.conf':'weekly\nrotate 4\ncreate\ninclude /etc/logrotate.d\n',
    '/etc/profile':'# /etc/profile\nexport PATH="/usr/local/bin:$PATH"\n',
    '/root/.bashrc':'# ~/.bashrc: executed by bash for login shells\nexport PS1="\\u@\\h:\\w# "\n',
    '/root/.profile':"# ~/.profile\n",
    '/var/log/syslog':'Sep 20 08:00:01 srv1 systemd[1]: Started OpenBSD Secure Shell server.\n',
    '/etc/skel-note':'',
    '/usr/share/zoneinfo/Asia':'dir-note'
  };
  for(var k in files){ this.f[k]={c:files[k], m:0o644,u:'root',g:'root'}; }
  this.f['/srv/share/homework']={d:1,m:0o755,u:'root',g:'root'};
  /* 预装软件 */
  var pre=['bash','coreutils','curl','wget','tar','gzip','openssh-server','cron','logrotate','python3','vim-tiny','sudo'];
  for(var j=0;j<pre.length;j++) this.pkgs[pre[j]]={v:'base'};
  this.svc('sshd', true); this.svc('sshd').running=true; this.svc('sshd').enabled=true; this.svc('sshd').installed=true;
  this.svc('cron', true); this.svc('cron').running=true; this.svc('cron').enabled=true; this.svc('cron').installed=true;
  this.log('systemd','Boot complete. Kernel: 6.8.0-41-generic');
  this.syncPasswd();
};
VM.prototype.svc=function(name, create){
  if(!this.svcs[name] && create) this.svcs[name]={installed:false,running:false,enabled:false,snap:null};
  return this.svcs[name];
};

/* ——（同一 IIFE 内继续）—— */
root.LabEngine = root.LabEngine || {};

/* =====================================================================
   一、软件包仓库 / 服务定义 / 安装效果
   ===================================================================== */
var CATALOG = {
  'nginx':          {v:'1.24.0-1ubuntu3', svc:'nginx'},
  'dnsmasq':        {v:'2.90-2',          svc:'dnsmasq'},
  'mariadb-server': {v:'1:10.11.7-2',     svc:'mariadb'},
  'mariadb-client': {v:'1:10.11.7-2'},
  'haproxy':        {v:'2.8.5-1ubuntu3',  svc:'haproxy'},
  'ufw':            {v:'0.36.2-6'},
  'firewalld':      {v:'2.1.3-1'},
  'docker.io':      {v:'26.1.4-0ubuntu1', svc:'docker'},
  'keepalived':     {v:'1:2.2.8-1',       svc:'keepalived'},
  'ansible-core':   {v:'2.17.3-1'},
  'slapd':          {v:'2.6.7+dfsg-1',    svc:'slapd'},
  'samba':          {v:'2:4.19.5',        svc:'smbd'},
  'tftp-hpa':       {v:'5.2+20150808-1ubuntu4'},
  'nfs-kernel-server':{v:'1:2.6.4-3',     svc:'nfs'},
  'vsftpd':         {v:'3.0.5-1',         svc:'vsftpd'},
  'openssh-server': {v:'1:9.6p1-3ubuntu13'},
  'cron':           {v:'3.0pl1-184'},
  'logrotate':      {v:'3.21.0-2'}
};
var SVCINFO = {
  nginx:      {desc:'A high performance web server and a reverse proxy server', conf:'/etc/nginx/nginx.conf'},
  dnsmasq:    {desc:'dnsmasq - A lightweight DHCP and caching DNS server',        conf:'/etc/dnsmasq.conf'},
  mariadb:    {desc:'MariaDB 10.11 database server'},
  haproxy:    {desc:'HAProxy Load Balancer',                                       conf:'/etc/haproxy/haproxy.cfg'},
  sshd:       {desc:'OpenBSD Secure Shell server',                                 conf:'/etc/ssh/sshd_config'},
  cron:       {desc:'Regular background program processing daemon'},
  docker:     {desc:'Docker Application Container Engine'},
  keepalived: {desc:'Keepalived Daemon',                                           conf:'/etc/keepalived/keepalived.conf'},
  slapd:      {desc:'OpenLDAP Server Daemon'},
  smbd:       {desc:'Samba SMB Daemon',                                            conf:'/etc/samba/smb.conf'},
  vsftpd:     {desc:'vsftpd FTP server'},
  nfs:        {desc:'NFS server and services',                                     conf:'/etc/exports'},
  pyhttp:     {desc:'Python http.server (临时服务器)'}
};

var NGX_DEFAULT_HTML='<!DOCTYPE html>\n<html>\n<head>\n<title>Welcome to nginx!</title>\n</head>\n<body>\n<h1>Welcome to nginx!</h1>\n<p>If you see this page, the nginx web server is successfully installed and\nworking. Further configuration is required.</p>\n<p><em>Thank you for using nginx.</em></p>\n</body>\n</html>\n';
var NGX_CONF_DEFAULT=[
'user www-data;','worker_processes auto;','','events {','}','','http {',
'    include /etc/nginx/mime.types;','    default_type application/octet-stream;',
'    access_log /var/log/nginx/access.log;','    error_log /var/log/nginx/error.log;','',
'    server {','        listen 80 default_server;','        server_name _;',
'        root /var/www/html;','        index index.html;','',
'        location / {','        }','    }','}',''].join('\n');
var DNSMASQ_DEFAULT=[
'# /etc/dnsmasq.conf —— 编辑后执行: systemctl restart dnsmasq','#','# 常用写法示例（去掉注释符号启用）:',
'# address=/web.corp.local/192.168.1.10','# host-record=web.corp.local,192.168.1.10',
'# addn-hosts=/etc/hosts','# dhcp-range=192.168.100.100,192.168.100.200,12h',
'# dhcp-boot=pxelinux.0,pxeserver,192.168.100.1','# enable-tftp','# tftp-root=/srv/tftp',''].join('\n');
var HAPROXY_DEFAULT=[
'global','    daemon','    maxconn 2048','','defaults','    mode http','    timeout connect 5s',
'    timeout client 30s','    timeout server 30s','','# frontend http_front','#     bind *:8080',
'#     default_backend app','#','# backend app','#     balance roundrobin',
'#     server srv1 127.0.0.1:8081 check','#     server srv2 127.0.0.1:8082 check','',''].join('\n');

/* 安装副作用：生成默认文件 */
var INSTALL_FX = {
  'nginx':function(vm){
    vm.mkdirP('/etc/nginx/sites-enabled');
    vm.write('/etc/nginx/nginx.conf', NGX_CONF_DEFAULT);
    vm.write('/etc/nginx/mime.types','types {\n  text/html html;\n  text/css css;\n  application/javascript js;\n  image/png png;\n}\n');
    vm.write('/var/www/html/index.html', NGX_DEFAULT_HTML);
    vm.write('/var/log/nginx/.keep','');
  },
  'dnsmasq':function(vm){ vm.write('/etc/dnsmasq.conf', DNSMASQ_DEFAULT); },
  'mariadb-server':function(vm){
    vm.mkdirP('/etc/mysql/mariadb.conf.d'); vm.mkdirP('/var/lib/mysql');
    vm.write('/etc/mysql/mariadb.conf.d/50-server.cnf','[mysqld]\nbind-address = 127.0.0.1\n');
    vm.write('/var/lib/mysql/.keep','');
  },
  'haproxy':function(vm){ vm.mkdirP('/etc/haproxy'); vm.write('/etc/haproxy/haproxy.cfg', HAPROXY_DEFAULT); },
  'docker.io':function(vm){ vm.mkdirP('/var/lib/docker'); },
  'keepalived':function(vm){ vm.mkdirP('/etc/keepalived');
    vm.write('/etc/keepalived/keepalived.conf','vrrp_instance VI_1 {\n    state MASTER\n    interface eth0\n    virtual_router_id 51\n    priority 100\n    virtual_ipaddress {\n        192.168.1.100/24\n    }\n}\n'); },
  'samba':function(vm){ vm.mkdirP('/etc/samba');
    vm.write('/etc/samba/smb.conf','[global]\n   workgroup = WORKGROUP\n   server string = %h server\n   map to guest = bad user\n   dns proxy = no\n'); },
  'nfs-kernel-server':function(vm){ vm.write('/etc/exports','# /srv/public *(ro,sync,no_subtree_check)\n'); },
  'slapd':function(vm){ vm.mkdirP('/etc/ldap'); },
  'ufw':function(vm){ vm.mkdirP('/etc/ufw'); vm.fw.tool='ufw'; },
  'firewalld':function(vm){ if(!vm.fw.tool) vm.fw.tool='firewalld'; },
  'vsftpd':function(vm){ vm.write('/etc/vsftpd.conf','listen=NO\nlisten_ipv6=YES\nanonymous_enable=NO\nlocal_enable=YES\nwrite_enable=YES\n'); }
};
function pkgInstall(vm, name){
  if(vm.pkgs[name]) return {already:true};
  if(!CATALOG[name]) return {notfound:true};
  vm.pkgs[name]={v:CATALOG[name].v};
  if(CATALOG[name].svc){ var s=vm.svc(CATALOG[name].svc,true); s.installed=true; }
  if(INSTALL_FX[name]) INSTALL_FX[name](vm);
  vm.log('apt','Installed package '+name);
  return {ok:true};
}
function pkgRemove(vm, name, purge){
  if(!vm.pkgs[name]) return {notfound:true};
  delete vm.pkgs[name];
  var meta=CATALOG[name];
  if(meta && meta.svc && vm.svcs[meta.svc]){ vm.svcs[meta.svc].installed=false; vm.svcs[meta.svc].running=false; }
  if(purge && INSTALL_FX_SRC[name]){ /* 简化：不清文件，留个提示 */ }
  vm.log('apt','Removed package '+name);
  return {ok:true};
}
var INSTALL_FX_SRC = INSTALL_FX;

/* =====================================================================
   二、配置解析器：nginx / dnsmasq / haproxy / sshd
   ===================================================================== */
var NGX_SERVER_DIRECTIVES = ['listen','server_name','root','index','location','return','rewrite',
  'ssl_certificate','ssl_certificate_key','error_page','access_log','error_log','add_header',
  'try_files','include','client_max_body_size','autoindex','alias','proxy_pass','ssl_protocols'];
var NGX_LOCATION_DIRECTIVES = ['root','index','try_files','alias','proxy_pass','return','rewrite',
  'add_header','autoindex','error_page','include','client_max_body_size','proxy_set_header',
  'proxy_http_version','error_log','access_log','fastcgi_pass','ssl_certificate'];

function ngxExpandIncludes(vm, text, depth){
  if(depth>2) return text;
  var lines=text.split('\n'), out=[];
  for(var i=0;i<lines.length;i++){
    var m=lines[i].match(/^\s*include\s+([^;]+);/);
    if(!m){ out.push(lines[i]); continue; }
    var spec=m[1].trim().replace(/^["']|["']$/g,'');
    var files=[];
    if(spec.indexOf('*')>=0){
      var dir=parentOf('/'+spec.replace(/^\//,'')), suf=baseOf(spec).replace('*','');
      if(vm.isDir(dir)){
        var kids=vm.children(dir);
        for(var k=0;k<kids.length;k++){ if(kids[k].slice(-suf.length)===suf || !suf) files.push(dir+'/'+kids[k]); }
      }
    } else if(vm.exists(spec)) files=[spec];
    if(files.length){
      for(var f=0;f<files.length;f++){
        var c=vm.read(files[f]);
        if(c!==null) out.push(ngxExpandIncludes(vm, c, depth+1));
      }
    }
  }
  return out.join('\n');
}
function parseNginx(vm, text){
  var res={ok:true, err:null, servers:[]};
  text = ngxExpandIncludes(vm, text, 0);
  var lines=text.split('\n'), i=0, lineNo=0;
  function unknownDirective(tok, lno, scope){
    res.ok=false; res.err='nginx: [emerg] unknown directive "'+tok+'" in /etc/nginx/nginx.conf:'+lno;
  }
  function notTerminated(tok, lno){
    res.ok=false; res.err='nginx: [emerg] directive "'+tok+'" is not terminated by ";" in /etc/nginx/nginx.conf:'+lno;
  }
  /* 提取所有 server{} 块 */
  var serverBlocks=[]; /* {text, startLine} */
  var depth=0, cur=null, curDepth=0;
  for(i=0;i<lines.length;i++){
    var raw=lines[i], t=raw.trim(), lno=i+1;
    var noComment = raw.replace(/#.*$/,'');
    var opens=(noComment.match(/\{/g)||[]).length, closes=(noComment.match(/\}/g)||[]).length;
    if(cur){ cur.lines.push(noComment); curDepth+=opens-closes; if(curDepth<=0){ serverBlocks.push(cur); cur=null; } continue; }
    if(/^\s*server\s*\{\s*$/.test(noComment) || /^\s*server\s*\{/.test(noComment)){
      cur={lines:[noComment], startLine:lno}; curDepth=opens-closes;
      if(curDepth<=0) { serverBlocks.push(cur); cur=null; }
      continue;
    }
  }
  /* 校验 server 块内指令 */
  if(res.ok){
    for(var b=0;b<serverBlocks.length;b++){
      var blk=serverBlocks[b], d=0, ln=blk.startLine;
      for(var j=0;j<blk.lines.length;j++){
        var line=blk.lines[j].trim(); ln++;
        if(!line || line[0]==='#') continue;
        var before=d;
        var op=(line.match(/\{/g)||[]).length, cl=(line.match(/\}/g)||[]).length;
        if(before<=2 && line!=='}'){
          var mm=line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
          if(mm){
            var tok=mm[1];
            var known = before<=1 ? (NGX_SERVER_DIRECTIVES.indexOf(tok)>=0) : (NGX_LOCATION_DIRECTIVES.indexOf(tok)>=0);
            var isLoc = /^location\b/.test(line);
            if(!known && !isLoc && tok!=='server'){ unknownDirective(tok, ln); break; }
            if(!/[{;]\s*$/.test(line) && tok!=='location' && tok!=='server'){ notTerminated(tok, ln); break; }
          }
        }
        d += op - cl;
      }
      if(!res.ok) break;
    }
  }
  if(!res.ok) return res;
  /* 解析 server 块 */
  for(var s=0;s<serverBlocks.length;s++){
    var bt=serverBlocks[s].lines.join('\n');
    var sv={listens:[], names:[], root:null, index:['index.html'], sslcert:null, sslkey:null, ret:null, locations:[]};
    var m;
    var lre=/(?:^|\n)\s*listen\s+([^;]+);/g;
    while((m=lre.exec(bt))){
      var spec=m[1].trim(), toks=spec.split(/\s+/), port=null, ssl=false, def=false;
      for(var x=0;x<toks.length;x++){
        var tk=toks[x];
        if(tk==='ssl') { ssl=true; continue; }
        if(tk==='default_server'||tk==='default') { def=true; continue; }
        var pm=tk.match(/(?:^|:)(\d+)$/); if(pm) port=parseInt(pm[1],10);
      }
      if(port===null) port=80;
      sv.listens.push({port:port, ssl:ssl, def:def});
    }
    m=bt.match(/server_name\s+([^;]+);/); if(m) sv.names=m[1].trim().split(/\s+/);
    m=bt.match(/(?:^|\n)\s*root\s+([^;]+);/); if(m) sv.root=m[1].trim();
    m=bt.match(/index\s+([^;]+);/); if(m) sv.index=m[1].trim().split(/\s+/);
    m=bt.match(/ssl_certificate\s+([^;]+);/); if(m) sv.sslcert=m[1].trim();
    m=bt.match(/ssl_certificate_key\s+([^;]+);/); if(m) sv.sslkey=m[1].trim();
    m=bt.match(/(?:^|\n)\s*return\s+(\d{3})\s*([^;]*);/); if(m) sv.ret={code:parseInt(m[1],10), url:(m[2]||'').trim()};
    /* locations */
    var lbody=serverBlocks[s].lines.join('\n');
    var li=0;
    while(true){
      var lm=lbody.slice(li).match(/location\s+([^{]*?)\s*\{/);
      if(!lm) break;
      var start=li+lbody.slice(li).indexOf(lm[0])+lm[0].length-1;
      var dd=0, k=start;
      for(;k<lbody.length;k++){ if(lbody[k]==='{')dd++; else if(lbody[k]==='}'){dd--; if(dd===0) break;} }
      var block=lbody.slice(start+1,k);
      var loc={spec:lm[1].trim(), body:block, ret:null, proxy:null, root:null, try_files:null, exact:false, regex:null};
      if(loc.spec[0]==='='){ loc.exact=true; loc.spec=loc.spec.slice(1).trim(); }
      else if(loc.spec.indexOf('~')===0){ loc.regex=loc.spec.replace(/^~\*?/,'').trim(); }
      else if(loc.spec.indexOf('^~')===0){ loc.spec=loc.spec.slice(2).trim(); }
      var rm=block.match(/return\s+(\d{3})\s*([^;]*);/); if(rm) loc.ret={code:parseInt(rm[1],10), url:(rm[2]||'').trim()};
      var pm2=block.match(/proxy_pass\s+([^;]+);/); if(pm2) loc.proxy=pm2[1].trim();
      var rt2=block.match(/(?:^|\n)\s*root\s+([^;]+);/); if(rt2) loc.root=rt2[1].trim();
      var tf=block.match(/try_files\s+([^;]+);/); if(tf) loc.try_files=tf[1].trim().split(/\s+/);
      sv.locations.push(loc);
      li=k+1;
    }
    res.servers.push(sv);
  }
  return res;
}

var DNSMASQ_KEYS=['address','host-record','addn-hosts','local','server','domain','domain-needed','bogus-priv',
 'dhcp-range','dhcp-host','dhcp-boot','dhcp-option','dhcp-option-force','enable-tftp','tftp-root','tftp-secure',
 'ptr-record','resolv-file','no-resolv','no-hosts','log-queries','log-dhcp','port','interface','listen-address',
 'bind-interfaces','expand-hosts','cache-size','conf-dir','conf-file','except-interface','no-dhcp-interface',
 'dhcp-authoritative','dhcp-leasefile','dns-forward-max','min-cache-ttl','max-cache-ttl','strict-order','no-poll',
 'all-servers','filterwin2k','stop-dns-rebind','rebind-localhost-ok','domain-needed','synth-domain'];
function parseDnsmasq(vm, text){
  var res={ok:true, err:null, A:{}, PTR:{}, dhcp:{range:null, boot:null, options:[], authoritative:false}, tftp:{enabled:false, root:null}, localZones:[]};
  var lines=text.split('\n');
  for(var i=0;i<lines.length;i++){
    var t=lines[i].replace(/#.*$/,'').trim(); if(!t) continue;
    var eq=t.indexOf('='), key=(eq<0?t:t.slice(0,eq)).trim(), val=(eq<0?'':t.slice(eq+1)).trim();
    if(DNSMASQ_KEYS.indexOf(key)<0){ res.ok=false; res.err='dnsmasq: bad option at line '+(i+1)+'.'; return res; }
    if(key==='address'){
      var parts=val.split('/').filter(function(x){ return x!==''; });
      if(parts.length>=2){ var ip=parts[parts.length-1];
        for(var a=0;a<parts.length-1;a++) res.A[parts[a].replace(/^\.*/,'')]=ip;
      }
    } else if(key==='host-record'){
      var pr=val.split(',');
      for(var h=0;h+1<pr.length;h+=2){ res.A[pr[h].trim()]=pr[h+1].trim(); res.PTR[pr[h+1].trim()]=pr[h].trim(); }
    } else if(key==='addn-hosts'){
      var hc=vm.read(val); if(hc!==null){
        var hl=hc.split('\n');
        for(var q=0;q<hl.length;q++){ var x=hl[q].replace(/#.*$/,'').trim(); if(!x) continue;
          var tk=x.split(/\s+/), ip2=tk[0]; for(var n=1;n<tk.length;n++){ res.A[tk[n]]=ip2; if(!res.PTR[ip2]) res.PTR[ip2]=tk[n]; }
        }
      }
    } else if(key==='ptr-record'){ var pp=val.split(','); if(pp.length>=2) res.PTR[pp[0].replace(/^\.*/,'')]=pp[1]; }
    else if(key==='dhcp-range'){ res.dhcp.range=val; }
    else if(key==='dhcp-boot'){ res.dhcp.boot=val; }
    else if(key==='dhcp-option'){ res.dhcp.options.push(val); }
    else if(key==='enable-tftp'){ res.tftp.enabled=true; }
    else if(key==='tftp-root'){ res.tftp.root=val; }
    else if(key==='local'){ var lz=val.split('/').filter(function(x){return x!=='';}); for(var z=0;z<lz.length;z++) res.localZones.push(lz[z]); }
    else if(key==='dhcp-authoritative'){ res.dhcp.authoritative=true; }
  }
  return res;
}

var HAPROXY_KEYS=['global','defaults','frontend','backend','listen','bind','default_backend','mode','balance',
 'server','option','timeout','stats','acl','use_backend','http-request','http-response','redirect','monitor-uri',
 'retries','maxconn','description','default-server','log','daemon','chroot','user','group','pidfile','nbproc','ulimit-n','tune.ssl.default-dh-param','errorfile','errorloc','capture','compression'];
function parseHaproxy(vm, text){
  var res={ok:true, err:null, frontends:[], backends:{}, global:[], defaults:[]};
  var lines=text.split('\n'), section=null, cur=null;
  for(var i=0;i<lines.length;i++){
    var raw=lines[i].replace(/#.*$/,'').replace(/\s+$/,''); var t=raw.trim();
    if(!t) continue;
    var m=t.match(/^(global|defaults|frontend\s+(\S+)|backend\s+(\S+)|listen\s+(\S+))\s*$/);
    if(m){ var kw=m[1].split(/\s+/)[0];
      if(kw==='global'){ section='global'; cur=res.global; }
      else if(kw==='defaults'){ section='defaults'; cur=res.defaults; }
      else if(kw==='frontend'){ section='frontend'; cur={name:m[2], bind:null, defaultBackend:null, binds:[]}; res.frontends.push(cur); }
      else if(kw==='backend'){ section='backend'; cur={name:m[3], balance:null, servers:[]}; res.backends[m[3]]=cur; }
      else if(kw==='listen'){ section='listen'; cur={name:m[4], bind:null, binds:[], servers:[]}; res.frontends.push(cur); res.backends[m[4]]=cur; }
      continue;
    }
    var tok=t.split(/\s+/)[0].toLowerCase();
    if(HAPROXY_KEYS.indexOf(tok)<0){ res.ok=false; res.err='[ALERT] ('+i+') : config parsing error at line '+(i+1)+' : unknown keyword "'+tok+'"'; return res; }
    if(section==='frontend'||section==='listen'){
      if(/^bind\s/.test(t)){ var bs=t.split(/\s+/)[1]||''; var bm=bs.match(/(?:^|:)(\d+)$/); if(bm){ cur.bind=parseInt(bm[1],10); cur.binds.push(parseInt(bm[1],10)); } }
      if(/^default_backend\s/.test(t)) cur.defaultBackend=t.split(/\s+/)[1];
    }
    if(section==='backend'||section==='listen'){
      if(/^balance\s/.test(t)) cur.balance=t.split(/\s+/)[1];
      if(/^server\s/.test(t)){ var st=t.split(/\s+/), name=st[1], addr=st[2]||'', port=null;
        var am=addr.match(/(\d+)$/); if(am) port=parseInt(am[1],10);
        var check=false; for(var x=3;x<st.length;x++) if(st[x]==='check') check=true;
        cur.servers.push({name:name, addr:addr, port:port, check:check});
      }
    }
  }
  return res;
}

function sshdPort(vm){
  var c=vm.read('/etc/ssh/sshd_config')||'';
  var m=c.match(/^\s*Port\s+(\d+)/m);
  return m?parseInt(m[1],10):22;
}

/* =====================================================================
   三、服务控制（systemd 模拟）
   ===================================================================== */
function svcParseConf(vm, name){
  /* 返回 {ok, err, rt} —— 当前配置文件解析结果 */
  var info=SVCINFO[name]; if(!info||!info.conf) return {ok:true, rt:null};
  var text=vm.read(info.conf);
  if(text===null) return {ok:false, err:'open() "'+info.conf+'" failed (2: No such file or directory)'};
  if(name==='nginx')  { var r=parseNginx(vm, text);   return r.ok?{ok:true, rt:r, text:text}:{ok:false, err:r.err}; }
  if(name==='dnsmasq'){ var d=parseDnsmasq(vm,text);  return d.ok?{ok:true, rt:d, text:text}:{ok:false, err:d.err}; }
  if(name==='haproxy'){ var h=parseHaproxy(vm,text);  return h.ok?{ok:true, rt:h, text:text}:{ok:false, err:h.err}; }
  return {ok:true, rt:null, text:text};
}
function svcStart(vm, name, quiet){
  var s=vm.svc(name, true);
  var out=[];
  if(!s.installed) return {ok:false, code:5, lines:[C('Failed to start '+name+'.service: Unit '+name+'.service not found.','err')]};
  if(s.running) return {ok:true, code:0, lines:[C('（'+name+' 已在运行中）','dim')]};
  var pre=svcParseConf(vm, name);
  if(!pre.ok){
    s.running=false; s.failed=true;
    vm.log(name, 'Failed to start: '+pre.err);
    out.push(C('Job for '+name+'.service failed because the control process exited with error code.','err'));
    out.push(C('See "systemctl status '+name+'.service" and "journalctl -xeu '+name+'.service" for details.','dim'));
    if(pre.err) out.push(C('✗ '+pre.err,'err'));
    if(name==='nginx') out.push(C('💡 提示：用 nginx -t 可以看到配置错误详情','hint'));
    return {ok:false, code:1, lines:out};
  }
  s.running=true; s.failed=false; s.snap=pre.text; s.rt=pre.rt||null;
  if(name==='dnsmasq') s.rt2=pre.rt;
  vm.log(name, 'Started '+name+'.service');
  return {ok:true, code:0, lines:[C('✓ Started '+name+'.service.','ok')]};
}
function svcStop(vm, name){
  var s=vm.svcs[name];
  if(!s||!s.running) return {ok:true, code:0, lines:[C('（'+name+' 本来就没在运行）','dim')]};
  s.running=false;
  vm.log(name, 'Stopped '+name+'.service');
  return {ok:true, code:0, lines:[C('✓ Stopped '+name+'.service.','ok')]};
}
function svcRestart(vm, name, reload){
  var s=vm.svc(name,true);
  if(reload && s.running){
    var pre=svcParseConf(vm, name);
    if(!pre.ok){ return {ok:false, code:1, lines:[C('nginx: [emerg] reload failed: '+pre.err,'err')]}; }
    s.snap=pre.text; s.rt=pre.rt||null;
    vm.log(name,'Reloaded configuration');
    return {ok:true, code:0, lines:[C('✓ Reloaded '+name+'.service.','ok')]};
  }
  if(s.running){ s.running=false; vm.log(name,'Stopped'); }
  var r=svcStart(vm, name);
  return r;
}
function svcStale(vm, name){
  var info=SVCINFO[name]; if(!info||!info.conf) return false;
  var s=vm.svcs[name]; if(!s||!s.running||s.snap===null||s.snap===undefined) return false;
  var cur=vm.read(info.conf);
  return cur!==null && cur!==s.snap;
}
function svcStatusText(vm, name){
  var s=vm.svcs[name], info=SVCINFO[name]||{desc:name};
  var l=[];
  var act = s&&s.running ? 'active (running)' : (s&&s.failed?'failed':'inactive (dead)');
  l.push(C('● '+name+'.service - '+info.desc, s&&s.running?'ok':'dim'));
  l.push(C('     Loaded: loaded (/lib/systemd/system/'+name+'.service; '+(s&&s.enabled?'enabled':'disabled')+'; preset: enabled)','dim'));
  l.push(C('     Active: '+act, s&&s.running?'ok':'dim'));
  if(s&&s.running && svcStale(vm,name)) l.push(C('⚠ 配置文件已修改，尚未重启（systemctl restart '+name+'）','hint'));
  return l;
}

root.LabEngine.CATALOG=CATALOG; root.LabEngine.SVCINFO=SVCINFO;
root.LabEngine.parseNginx=parseNginx; root.LabEngine.parseDnsmasq=parseDnsmasq; root.LabEngine.parseHaproxy=parseHaproxy;
root.LabEngine.pkgInstall=pkgInstall; root.LabEngine.pkgRemove=pkgRemove;
root.LabEngine.svcStart=svcStart; root.LabEngine.svcStop=svcStop; root.LabEngine.svcRestart=svcRestart;
root.LabEngine.svcStale=svcStale; root.LabEngine.svcStatusText=svcStatusText; root.LabEngine.sshdPort=sshdPort;

/* =====================================================================
   四、网络模拟：HTTP 调度（nginx / haproxy / 容器 / 虚拟后端）· DNS 查询
   ===================================================================== */
function ctypeOf(p){
  var ext=baseOf(p).split('.').pop().toLowerCase();
  var m={html:'text/html',htm:'text/html',css:'text/css',js:'application/javascript',
    png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',svg:'image/svg+xml',
    txt:'text/plain',json:'application/json',ico:'image/x-icon',xml:'application/xml'};
  return m[ext]||'application/octet-stream';
}
function canReadAs(vm, pth, user){
  /* 逐级检查 x/r 权限（nginx worker = www-data） */
  var parts=pth.split('/'), cur='', self=vm;
  for(var i=0;i<parts.length;i++){
    if(!parts[i]) continue;
    cur+='/'+parts[i];
    var n=vm.f[cur]; if(!n) return {ok:false, code:404};
    var m=n.m!==undefined?n.m:(n.d?0o755:0o644);
    if(i<parts.length-1){
      var xo=(m&0o001)?1:0, xu=(n.u===user&&(m&0o100))?1:0;
      if(!xo && !xu) return {ok:false, code:403};
    } else if(!n.d){
      var ro=(m&0o004)?1:0, ru=(n.u===user&&(m&0o400))?1:0;
      if(!ro && !ru) return {ok:false, code:403};
    }
  }
  return {ok:true};
}
function serveStatic(vm, root, uri, indexList){
  var full=norm(root+('/'+uri.replace(/^\//,'')), '/');
  if(!vm.exists(full)) return {status:404, body:'<html>\n<head><title>404 Not Found</title></head>\n<body>\n<center><h1>404 Not Found</h1></center>\n<hr><center>nginx/1.24.0 (Ubuntu)</center>\n</body>\n</html>\n'};
  var st=vm.statOf(full);
  if(st.dir){
    if(uri.charAt(uri.length-1)!=='/'){
      return {status:301, location:uri+'/', body:''};
    }
    var idx=indexList||['index.html'];
    for(var i=0;i<idx.length;i++){
      var f=full.replace(/\/$/,'')+'/'+idx[i];
      if(vm.exists(f)&&!vm.isDir(f)){ full=f; st=vm.statOf(f); break; }
      if(i===idx.length-1) return {status:403, body:'<html>\n<head><title>403 Forbidden</title></head>\n<body>\n<center><h1>403 Forbidden</h1></center>\n<hr><center>nginx/1.24.0 (Ubuntu)</center>\n</body>\n</html>\n'};
    }
  }
  var acc=canReadAs(vm, full, 'www-data');
  if(!acc.ok) return {status:acc.code, body:'<html>\n<head><title>'+acc.code+' '+(acc.code===403?'Forbidden':'Not Found')+'</title></head>\n<body>\n<center><h1>'+acc.code+' '+(acc.code===403?'Forbidden':'Not Found')+'</h1></center>\n<hr><center>nginx/1.24.0 (Ubuntu)</center>\n</body>\n</html>\n'};
  var c=vm.read(full);
  return {status:200, body:c===null?'':c, ctype:ctypeOf(full)};
}
function resp(status, body, headers, server){
  var h=headers||{};
  h['Server']=server||'nginx/1.24.0 (Ubuntu)';
  if(body) h['Content-Type']=h['Content-Type']||'text/html';
  h['Content-Length']=String((body||'').length);
  return {status:status, headers:h, body:body||''};
}
function nginxHttp(vm, req){
  var s=vm.svcs['nginx']; var rt=s&&s.rt; if(!rt) return resp(502,'<h1>502 Bad Gateway</h1>',{},'nginx/1.24.0 (Ubuntu)');
  var port=req.port;
  var cands=[];
  for(var i=0;i<rt.servers.length;i++){
    var sv=rt.servers[i];
    for(var L=0;L<sv.listens.length;L++){
      var ls=sv.listens[L];
      if(ls.port!==port) continue;
      if(req.ssl && !sv.sslcert) continue;
      cands.push(sv); break;
    }
  }
  if(!cands.length) return {refused:true};
  var host=(req.headers&&req.headers['Host']||'').split(':')[0].toLowerCase()||'_';
  var pick=null;
  for(var a=0;a<cands.length;a++){ if((cands[a].names||[]).map(function(x){return x.toLowerCase();}).indexOf(host)>=0){ pick=cands[a]; break; } }
  if(!pick) for(var b2=0;b2<cands.length;b2++){ var ns=cands[b2].names||[];
    for(var w=0;w<ns.length;w++){ var nn=ns[w].toLowerCase(); if(nn.indexOf('*.')===0 && host.slice(-(nn.length-1))===nn.slice(1)){ pick=cands[b2]; break; } }
    if(pick) break;
  }
  if(!pick) for(var c2=0;c2<cands.length;c2++){ for(var l2=0;l2<cands[c2].listens.length;l2++){ if(cands[c2].listens[l2].def){ pick=cands[c2]; break; } } if(pick) break; }
  if(!pick) pick=cands[0];
  var uri=(req.path||'/').split('?')[0];
  /* location 匹配 */
  var loc=null, best=-1;
  for(var z=0;z<pick.locations.length;z++){
    var lo=pick.locations[z], hit=false;
    if(lo.exact){ hit=(lo.spec===uri); if(hit && 999>best){ best=999; loc=lo; } }
    else if(lo.regex){ try{ if(new RegExp(lo.regex).test(uri)){ hit=true; } }catch(e){} if(hit){ best=998; loc=lo; } }
    else { if(uri.indexOf(lo.spec===('/')?'/':lo.spec)===0 && lo.spec.length>best){ best=lo.spec.length; loc=lo; } }
  }
  var ret=loc&&loc.ret?loc.ret:pick.ret;
  if(ret){ var url=ret.url||'';
    url=url.replace(/\$scheme/g, req.ssl?'https':'http').replace(/\$host/g, host).replace(/\$request_uri/g, uri).replace(/\$server_name/g, (pick.names&&pick.names[0])||'_');
    if(ret.code>=300 && ret.code<400){
      var hh={}; if(url) hh['Location']=url;
      if(req.ssl) hh['Location']=(hh['Location']||'').replace(/^http:/,'https:');
      return resp(ret.code, '<html>\r\n<head><title>'+ret.code+' Moved</title></head>\r\n<body>\r\n<center><h1>'+ret.code+' Moved</h1></center>\r\n<hr><center>nginx/1.24.0 (Ubuntu)</center>\r\n</body>\r\n</html>\r\n', hh);
    }
    return resp(ret.code, '');
  }
  if(loc&&loc.proxy){
    var target=loc.proxy; if(!/^https?:\/\//.test(target)) target='http://'+target;
    var tm=target.match(/^https?:\/\/([^\/:]+)(?::(\d+))?(\/.*)?$/);
    if(!tm) return resp(502,'<h1>502 Bad Gateway</h1>');
    var sub=dispatchHttp(vm, {host:tm[1], port:tm[2]?parseInt(tm[2],10):80, path:uri, method:req.method, ssl:false, headers:req.headers, _depth:(req._depth||0)+1});
    if(sub.refused||sub.dnsfail) return resp(502,'<html>\r\n<head><title>502 Bad Gateway</title></head>\r\n<body>\r\n<center><h1>502 Bad Gateway</h1></center>\r\n<hr><center>nginx/1.24.0 (Ubuntu)</center>\r\n</body>\r\n</html>\r\n');
    sub.headers['X-Proxied-By']='nginx';
    return sub;
  }
  var root=(loc&&loc.root)||pick.root||'/var/www/html';
  var r2=serveStatic(vm, root, uri, pick.index);
  if(r2.location){
    var hh2={'Location':r2.location};
    return resp(r2.status, r2.body, hh2);
  }
  return resp(r2.status, r2.body, r2.ctype?{'Content-Type':r2.ctype}:null);
}
function haproxyHttp(vm, req){
  var s=vm.svcs['haproxy']; var rt=s&&s.rt; if(!rt) return {refused:true};
  var fe=null;
  for(var i=0;i<rt.frontends.length;i++){ if(rt.frontends[i].bind===req.port){ fe=rt.frontends[i]; break; } }
  if(!fe) return {refused:true};
  var be=rt.backends[fe.defaultBackend]; if(!be) return resp(503,'503 Service Unavailable\r\nNo server is available to handle this request.\r\n',{'Content-Type':'text/plain'},'HAProxy');
  var healthy=[];
  for(var j=0;j<be.servers.length;j++){
    var srv=be.servers[j]; if(!srv.port) continue;
    var probe=dispatchHttp(vm,{host:srv.addr.split(':')[0]||'127.0.0.1', port:srv.port, path:'/', _depth:(req._depth||0)+1, _probe:true});
    if(!(probe.refused||probe.dnsfail)) healthy.push(srv);
  }
  if(!healthy.length) return resp(503,'503 Service Unavailable\r\nNo server is available to handle this request.\r\n',{'Content-Type':'text/plain'},'HAProxy');
  var idx=0;
  if((be.balance||'roundrobin')==='roundrobin'){ vm.rrCount++; idx=vm.rrCount%healthy.length; }
  var chosen=healthy[idx];
  var sub=dispatchHttp(vm,{host:chosen.addr.split(':')[0]||'127.0.0.1', port:chosen.port, path:req.path, method:req.method, ssl:req.ssl, headers:req.headers, _depth:(req._depth||0)+1});
  if(sub.refused) return resp(503,'503 Service Unavailable\r\n',{'Content-Type':'text/plain'},'HAProxy');
  sub.headers=sub.headers||{};
  sub.headers['X-Served-By']=chosen.name;
  return sub;
}
function containerHttp(vm, c, reqPort, req){
  var map=null;
  for(var i=0;i<(c.ports||[]).length;i++){ if(c.ports[i].h===reqPort){ map=c.ports[i]; break; } }
  if(!map) return {refused:true};
  var inner=map.c, uri=(req.path||'/').split('?')[0];
  var root='/usr/share/nginx/html', rootHost=null;
  for(var v=0;v<(c.volumes||[]).length;v++){
    var vol=c.volumes[v];
    if(vol.c==='/usr/share/nginx/html'){ rootHost=vol.h; }
  }
  var body=null, status=404;
  if(rootHost){
    var full=norm(rootHost+('/'+uri.replace(/^\//,'')),'/');
    if(vm.isDir(full)){
      var idx=['index.html'];
      for(var x=0;x<idx.length;x++){ var f2=full.replace(/\/$/,'')+'/'+idx[x]; if(vm.exists(f2)){ full=f2; break; } }
    }
    if(vm.exists(full)&&!vm.isDir(full)){ body=vm.read(full); status=200; }
  }
  if(body===null){
    body='<!DOCTYPE html>\n<html>\n<head>\n<title>Welcome to nginx!</title>\n</head>\n<body>\n<h1>Welcome to nginx!</h1>\n<p>If you see this page, the nginx web server is successfully installed and working.</p>\n<p><em>Container: '+c.name+'</em></p>\n</body>\n</html>\n';
    status=200;
  }
  var h={'Server':'nginx/1.24.0','X-Container':c.name};
  if(status===200) h['Content-Type']=ctypeOf(body.indexOf('<')===0?'x.html':'x.txt');
  return resp(status, body, h, 'nginx/1.24.0');
}
function resolveHost(vm, host){
  host=(host||'localhost').toLowerCase();
  if(host==='localhost'||host==='127.0.0.1'||host==='srv1'||host===vm.hostname.toLowerCase()) return {ok:true, ip:'127.0.0.1'};
  var hc=vm.read('/etc/hosts')||'';
  var hl=hc.split('\n');
  for(var i=0;i<hl.length;i++){ var t=hl[i].replace(/#.*$/,'').trim(); if(!t) continue;
    var tk=t.split(/\s+/); for(var n=1;n<tk.length;n++){ if(tk[n].toLowerCase()===host) return {ok:true, ip:tk[0]}; }
  }
  var ds=vm.svcs['dnsmasq'];
  if(ds&&ds.running&&ds.rt2&&ds.rt2.A[host]) return {ok:true, ip:ds.rt2.A[host]};
  if(ds&&ds.running&&ds.rt2&&ds.rt2.PTR[host]) return {ok:true, ip:host};
  return {ok:false, ip:null};
}
function dispatchHttp(vm, req){
  req.headers=req.headers||{};
  req.path=req.path||'/';
  if((req._depth||0)>4) return resp(508,'Loop detected');
  var rr=resolveHost(vm, req.host);
  if(!rr.ok) return {dnsfail:true, host:req.host};
  /* 1) docker 容器端口映射 */
  for(var k in vm.docker.containers){
    var c=vm.docker.containers[k];
    if(!c.running) continue;
    for(var i=0;i<(c.ports||[]).length;i++){
      if(c.ports[i].h===req.port) return containerHttp(vm, c, req.port, req);
    }
  }
  /* 2) 场景注入的虚拟后端 */
  if(vm.sim.listeners && vm.sim.listeners[req.port]){
    var L=vm.sim.listeners[req.port];
    if(L.down) return {refused:true};
    return resp(200, L.body, {'Content-Type':L.ctype||'text/html','X-Sim-Server':L.tag||'srv'});
  }
  /* 3) nginx */
  var ng=vm.svcs['nginx'];
  if(ng&&ng.running&&ng.rt){
    var listens=false;
    for(var s2=0;s2<ng.rt.servers.length&&!listens;s2++){
      for(var l2=0;l2<ng.rt.servers[s2].listens.length;l2++){
        if(ng.rt.servers[s2].listens[l2].port===req.port){ listens=true; break; }
      }
    }
    if(listens){ var r=nginxHttp(vm, req); if(!r.refused) return r; }
  }
  /* 4) haproxy */
  var hp=vm.svcs['haproxy'];
  if(hp&&hp.running&&hp.rt){
    for(var f=0;f<hp.rt.frontends.length;f++){
      if(hp.rt.frontends[f].bind===req.port){ var rh=haproxyHttp(vm, req); if(!rh.refused) return rh; }
    }
  }
  /* 5) python http.server */
  var py=vm.svcs['pyhttp'];
  if(py&&py.running&&py.port===req.port){
    var full2=norm((py.root||'/')+('/'+req.path.replace(/^\//,'')),'/');
    if(vm.isDir(full2)){
      var listing='<!DOCTYPE HTML><html><head><title>Directory listing for '+req.path+'</title></head><body><h1>Directory listing for '+req.path+'</h1><ul>';
      var kids=vm.children(full2);
      for(var q=0;q<kids.length;q++) listing+='<li><a href="'+kids[q]+'">'+kids[q]+'</a></li>';
      listing+='</ul></body></html>';
      return resp(200,listing,{'Content-Type':'text/html'},'SimpleHTTP/0.6 Python/3.12.3');
    }
    var c2=vm.read(full2);
    if(c2!==null) return resp(200,c2,{'Content-Type':ctypeOf(full2)},'SimpleHTTP/0.6 Python/3.12.3');
    return resp(404,'<html><head><title>Error response</title></head><body><h1>Error response</h1><p>Error code: 404</p><p>Message: File not found.</p></body></html>',{},'SimpleHTTP/0.6 Python/3.12.3');
  }
  return {refused:true};
}
function dnsLookup(vm, name, type){
  var ds=vm.svcs['dnsmasq'];
  if(!ds||!ds.running) return {fail:'no-servers'};
  var rt=ds.rt2||{A:{},PTR:{}};
  name=String(name).toLowerCase().replace(/\.$/,'');
  type=(type||'A').toUpperCase();
  if(type==='A'||type==='ANY'){
    if(rt.A[name]) return {ok:true, status:'NOERROR', name:name+'.', type:'A', value:rt.A[name]};
    if(name==='localhost') return {ok:true, status:'NOERROR', name:name+'.', type:'A', value:'127.0.0.1'};
    return {ok:true, status:'NXDOMAIN'};
  }
  if(type==='PTR'){
    var m=name.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)\.in-addr\.arpa$/);
    var ip=m?(m[4]+'.'+m[3]+'.'+m[2]+'.'+m[1]):null;
    if(!ip) return {ok:true, status:'NXDOMAIN'};
    if(rt.PTR[ip]) return {ok:true, status:'NOERROR', name:name+'.', type:'PTR', value:rt.PTR[ip]+'.'};
    return {ok:true, status:'NXDOMAIN'};
  }
  if(type==='TXT'||type==='MX'||type==='AAAA') return {ok:true, status:'NOERROR'};
  return {ok:true, status:'NXDOMAIN'};
}
root.LabEngine.dispatchHttp=dispatchHttp; root.LabEngine.dnsLookup=dnsLookup; root.LabEngine.resolveHost=resolveHost;
root.LabEngine.serveStatic=serveStatic; root.LabEngine.resp=resp;

/* =====================================================================
   五、MariaDB 迷你 SQL 引擎
   ===================================================================== */
function sqlTableBox(cols, rows){
  var w=cols.map(function(c){ return c.length; });
  for(var i=0;i<rows.length;i++) for(var j=0;j<cols.length;j++){ var v=rows[i][j]===null?'NULL':String(rows[i][j]); w[j]=Math.max(w[j],v.length); }
  var sep='+'+w.map(function(x){ return Array(x+3).join('-'); }).join('+')+'+';
  var out=[sep];
  out.push('|'+cols.map(function(c,j){ return ' '+c+Array(w[j]-c.length+2).join(' '); }).join('|')+'|');
  out.push(sep);
  for(var r=0;r<rows.length;r++){
    out.push('|'+cols.map(function(c,j){ var v=rows[r][j]===null?'NULL':String(rows[r][j]); return ' '+v+Array(w[j]-v.length+2).join(' '); }).join('|')+'|');
  }
  out.push(sep);
  return out;
}
function sqlSplit(text){
  var out=[], cur='', q=null;
  for(var i=0;i<text.length;i++){
    var ch=text[i];
    if(q){ cur+=ch; if(ch===q) q=null; continue; }
    if(ch==="'"||ch==='"'){ q=ch; cur+=ch; continue; }
    if(ch===';'){ if(cur.trim()) out.push(cur.trim()); cur=''; continue; }
    cur+=ch;
  }
  if(cur.trim()) out.push(cur.trim());
  return out;
}
function sqlAccess(vm, user, db, verb){
  if(user==='root') return true;
  var u=vm.sql.u[user]; if(!u) return false;
  var best=null;
  for(var i=0;i<u.grants.length;i++){ var g=u.grants[i]; if(g.db===db||g.db==='*'){ if(!best||g.privs==='ALL') best=g; } }
  if(!best) return false;
  if(best.privs==='ALL') return true;
  return String(best.privs).toUpperCase().indexOf(verb)>=0;
}
function sqlRun(vm, text, user, defDb, ctx){
  var lines=[], err=null, cur=defDb||null, self=vm;
  var stmts=sqlSplit(text);
  for(var si=0;si<stmts.length;si++){
    var s=stmts[si].trim(); if(!s || s===';') continue;
    var u=s.toUpperCase();
    var r=null;
    if(/^CREATE\s+DATABASE/i.test(s)){
      var m=s.match(/CREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`'"]?([\w$]+)[`'"]?/i);
      if(!m){ lines.push('ERROR 1064 (42000): You have an error in your SQL syntax.'); return {lines:lines, code:1}; }
      if(vm.sql.dbs[m[1]] && /IF\s+NOT\s+EXISTS/i.test(s)) lines.push('Query OK, 1 row affected (0.000 sec)');
      else if(vm.sql.dbs[m[1]]){ lines.push("ERROR 1007 (HY000): Can't create database '"+m[1]+"'; database exists"); return {lines:lines, code:1}; }
      else { vm.sql.dbs[m[1]]={tables:{}}; lines.push('Query OK, 1 row affected (0.001 sec)'); }
    }
    else if(/^DROP\s+DATABASE/i.test(s)){ var md=s.match(/DROP\s+DATABASE\s+(?:IF\s+EXISTS\s+)?[`'"]?([\w$]+)/i);
      if(md&&vm.sql.dbs[md[1]]){ delete vm.sql.dbs[md[1]]; lines.push('Query OK, 0 rows affected'); } else lines.push('ERROR 1008 (HY000): Can\'t drop database; database doesn\'t exist'); }
    else if(/^SHOW\s+DATABASES/i.test(s)){
      var dbs=[];
      if(user==='root'){ dbs=Object.keys(vm.sql.dbs).concat(vm.sql.sys); }
      else { var uu=vm.sql.u[user];
        if(uu) for(var g=0;g<uu.grants.length;g++) if(dbs.indexOf(uu.grants[g].db)<0&&uu.grants[g].db!=='*') dbs.push(uu.grants[g].db);
        dbs=['information_schema'].concat(dbs);
      }
      lines=lines.concat(sqlTableBox(['Database'], dbs.map(function(d){ return [d]; })));
      lines.push(dbs.length+' rows in set (0.000 sec)');
    }
    else if(/^CREATE\s+USER/i.test(s)){
      var mu=s.match(/CREATE\s+USER\s+(?:IF\s+NOT\s+EXISTS\s+)?['"]?([\w-]+)['"]?@['"]?([\w.%\-]+)['"]?\s+(?:IDENTIFIED\s+BY\s+['"]([^'"]*)['"]|WITH\s+\w+\s+BY\s+['"]([^'"]*)['"])/i);
      if(!mu){ lines.push('ERROR 1064 (42000): You have an error in your SQL syntax.'); return {lines:lines,code:1}; }
      var nu=vm.sql.u[mu[1]]||{pw:null, hosts:[], grants:[]};
      nu.pw=mu[3]||mu[4]||nu.pw; if(nu.hosts.indexOf(mu[2])<0) nu.hosts.push(mu[2]);
      vm.sql.u[mu[1]]=nu; lines.push('Query OK, 0 rows affected (0.001 sec)');
    }
    else if(/^GRANT/i.test(s)){
      var mg=s.match(/GRANT\s+(.+?)\s+ON\s+[`']?([\w*$]+)[`']?\.([\w*$]+|`?\*`?)\s+TO\s+['"]?([\w-]+)['"]?@['"]?([\w.%\-]+)['"]?(.*)$/i);
      if(!mg){ lines.push('ERROR 1064 (42000): You have an error in your SQL syntax.'); return {lines:lines,code:1}; }
      var gu=vm.sql.u[mg[4]]||{pw:null, hosts:[mg[5]], grants:[]};
      var privs=mg[1].toUpperCase().replace(/\s+PRIVILEGES/,'');
      if(privs.indexOf('ALL')===0) privs='ALL';
      gu.grants.push({db:mg[2], table:mg[3], privs:privs});
      if(gu.hosts.indexOf(mg[5])<0) gu.hosts.push(mg[5]);
      var tail=mg[6]||''; var mi=tail.match(/IDENTIFIED\s+BY\s+['"]([^'"]*)['"]/i);
      if(mi) gu.pw=mi[1];
      vm.sql.u[mg[4]]=gu; lines.push('Query OK, 0 rows affected (0.002 sec)');
    }
    else if(/^FLUSH\s+PRIVILEGES/i.test(s)) lines.push('Query OK, 0 rows affected (0.001 sec)');
    else if(/^CREATE\s+TABLE/i.test(s)){
      if(!cur){ lines.push('ERROR 1046 (3D000): No database selected'); return {lines:lines,code:1}; }
      if(!sqlAccess(vm,user,cur,'CREATE')&&!sqlAccess(vm,user,cur,'ALL')){ lines.push("ERROR 1044 (42000): Access denied for user '"+user+"'@'localhost' to database '"+cur+"'"); return {lines:lines,code:1}; }
      var mt=s.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`'"]?([\w$]+)[`'"]?\s*\(([\s\S]*)\)\s*$/i);
      if(!mt){ lines.push('ERROR 1064 (42000): You have an error in your SQL syntax.'); return {lines:lines,code:1}; }
      var colDefs=mt[2].split(','); var cols=[];
      for(var cd=0;cd<colDefs.length;cd++){
        var t2=colDefs[cd].trim(); if(!t2) continue;
        if(/^(PRIMARY|KEY|UNIQUE|INDEX|CONSTRAINT|FOREIGN)/i.test(t2)) continue;
        var cm=t2.match(/^[`'"]?(\w+)[`'"]?/); if(cm) cols.push(cm[1]);
      }
      var db=vm.sql.dbs[cur]; if(!db){ lines.push("ERROR 1049 (42000): Unknown database '"+cur+"'"); return {lines:lines,code:1}; }
      if(db.tables[mt[1]]){ lines.push("ERROR 1050 (42S01): Table '"+mt[1]+"' already exists"); return {lines:lines,code:1}; }
      db.tables[mt[1]]={cols:cols, rows:[]};
      lines.push('Query OK, 0 rows affected (0.003 sec)');
    }
    else if(/^SHOW\s+TABLES/i.test(s)){
      if(!cur){ lines.push('ERROR 1046 (3D000): No database selected'); return {lines:lines,code:1}; }
      var tb=(vm.sql.dbs[cur]&&vm.sql.dbs[cur].tables)||{};
      var names=Object.keys(tb);
      lines=lines.concat(sqlTableBox(['Tables_in_'+cur], names.map(function(n){ return [n]; })));
      lines.push(names.length+' rows in set (0.000 sec)');
    }
    else if(/^INSERT\s+INTO/i.test(s)){
      if(!cur){ lines.push('ERROR 1046 (3D000): No database selected'); return {lines:lines,code:1}; }
      if(!sqlAccess(vm,user,cur,'INSERT')){ lines.push("ERROR 1044 (42000): Access denied for user '"+user+"'@'localhost' to database '"+cur+"'"); return {lines:lines,code:1}; }
      var mI=s.match(/INSERT\s+INTO\s+[`'"]?(\w+)[`'"]?\s*(\(([^)]*)\))?\s*VALUES\s*([\s\S]*)$/i);
      if(!mI){ lines.push('ERROR 1064 (42000): You have an error in your SQL syntax.'); return {lines:lines,code:1}; }
      var dbi=(vm.sql.dbs[cur]||{tables:{}}).tables[mI[1]];
      if(!dbi){ lines.push("ERROR 1146 (42S02): Table '"+cur+'.'+mI[1]+"' doesn't exist"); return {lines:lines,code:1}; }
      var rowsRaw=mI[4], rows=[], depth=0, cur2='';
      for(var y=0;y<rowsRaw.length;y++){ var ch2=rowsRaw[y];
        if(ch2==='(') { depth++; if(depth===1){cur2='';continue;} }
        if(ch2===')'){ depth--; if(depth===0){ rows.push(cur2); continue; } }
        if(depth>=1) cur2+=ch2;
      }
      var n=0;
      for(var rr2=0;rr2<rows.length;rr2++){
        var vals=sqlSplitValues(rows[rr2]);
        dbi.rows.push(vals); n++;
      }
      lines.push('Query OK, '+n+' row'+(n===1?'':'s')+' affected (0.002 sec)');
    }
    else if(/^SELECT/i.test(s)){
      if(!cur){ lines.push('ERROR 1046 (3D000): No database selected'); return {lines:lines,code:1}; }
      if(!sqlAccess(vm,user,cur,'SELECT')){ lines.push("ERROR 1044 (42000): Access denied for user '"+user+"'@'localhost' to database '"+cur+"'"); return {lines:lines,code:1}; }
      var mS=s.match(/SELECT\s+([\s\S]+?)\s+FROM\s+[`'"]?(\w+)[`'"]?(\s+WHERE\s+[\s\S]+)?(\s+LIMIT\s+\d+)?\s*$/i);
      if(!mS){ lines.push('ERROR 1064 (42000): You have an error in your SQL syntax.'); return {lines:lines,code:1}; }
      var dbs2=(vm.sql.dbs[cur]||{tables:{}}).tables[mS[2]];
      if(!dbs2){ lines.push("ERROR 1146 (42S02): Table '"+cur+'.'+mS[2]+"' doesn't exist"); return {lines:lines,code:1}; }
      var sel=mS[1].trim(), rows2=dbs2.rows.slice(), colsOut=[], fields=[];
      if(mS[3]){
        var wm=mS[3].replace(/^\s+WHERE\s+/i,'').match(/([`'"]?\w+[`'"]?)\s*=\s*['"]?([^'"]*)['"]?/i);
        if(wm){ var ci=dbs2.cols.indexOf(wm[1]); if(ci>=0) rows2=rows2.filter(function(row){ return String(row[ci])===String(wm[2]); }); }
      }
      if(/^COUNT\s*\(\s*\*\s*\)/i.test(sel)){ colsOut=['COUNT(*)']; fields=[[String(rows2.length)]]; }
      else if(sel==='*'){ colsOut=dbs2.cols; fields=rows2; }
      else {
        colsOut=sel.split(',').map(function(x){ return x.trim().replace(/[`'"]/g,'').replace(/\s+AS\s+\w+$/i,''); });
        fields=rows2.map(function(row){ return colsOut.map(function(cn){ var ci2=dbs2.cols.indexOf(cn); return ci2<0?'?':row[ci2]; }); });
      }
      lines=lines.concat(sqlTableBox(colsOut, fields));
      lines.push(fields.length+' row'+(fields.length===1?'':'s')+' in set (0.001 sec)');
    }
    else if(/^UPDATE\s+/i.test(s)||/^DELETE\s+FROM/i.test(s)||/^ALTER\s+TABLE/i.test(s)){
      lines.push('Query OK, 0 rows affected (0.001 sec)');
    }
    else {
      lines.push('ERROR 1064 (42000): You have an error in your SQL syntax near \''+s.slice(0,40)+'\'');
      return {lines:lines, code:1};
    }
  }
  return {lines:lines, code:0};
}
function sqlSplitValues(raw){
  var out=[], cur='', q=null;
  for(var i=0;i<raw.length;i++){
    var ch=raw[i];
    if(q){ if(ch===q){ q=null; } else cur+=ch; continue; }
    if(ch==="'"||ch==='"'){ q=ch; continue; }
    if(ch===','){ out.push(cur.trim()); cur=''; continue; }
    cur+=ch;
  }
  if(cur.trim()!==''||out.length===0) out.push(cur.trim());
  return out.map(function(v){ if(/^-?\d+$/.test(v)) return parseInt(v,10); if(/^-?\d+\.\d+$/.test(v)) return parseFloat(v); return v; });
}
root.LabEngine.sqlRun=sqlRun; root.LabEngine.sqlSplit=sqlSplit;

/* =====================================================================
   六、Ansible 迷你引擎 / LDAP 迷你目录 / Docker 迷你引擎
   ===================================================================== */
var ANSIBLE_MODULES=['apt','package','yum','service','systemd','copy','file','lineinfile','command','shell','debug','user','group','cron'];
function ansibleParse(text){
  /* 支持子集：
     - hosts: all
       tasks:
         - name: Install nginx
           apt: name=nginx state=present        # 内联 k=v
         - name: Start service
           service:
             name: nginx                        # 嵌套 k: v
             state: started
  */
  var raw=text.split('\n').map(function(l){ return l.replace(/#.*$/,'').replace(/\s+$/,''); });
  var plays=[], play=null, task=null, tasksIndent=-1, taskItemIndent=-1, moduleIndent=-1;
  function flushTask(){ if(task&&play){ play.tasks.push(task); } task=null; moduleIndent=-1; }
  function parseTaskRest(rest){
    task={name:null, module:null, rawArg:null, args:{}};
    var m=rest.match(/^(\w+)\s*:\s*(.*)$/);
    if(m){
      if(m[1]==='name'){ task.name=m[2].trim()||null; }
      else if(ANSIBLE_MODULES.indexOf(m[1])>=0){ task.module=m[1]; task.rawArg=m[2].trim()||null; }
      else if(m[1]==='debug'){ task.module='debug'; task.rawArg=m[2].trim()||null; }
    } else if(rest){ task.module='command'; task.rawArg=rest; }
  }
  for(var li=0;li<raw.length;li++){
    var line=raw[li]; if(!line.trim()) continue;
    var indent=line.match(/^\s*/)[0].length, t=line.replace(/^\s+/,'');
    var itemM=t.match(/^-\s+(.*)$/);
    if(itemM){
      var rest=itemM[1];
      if(/^hosts\s*:/.test(rest)){
        flushTask(); play={hosts:(rest.split(':')[1]||'all').trim(), tasks:[]}; plays.push(play);
        tasksIndent=-1; taskItemIndent=-1; continue;
      }
      if(play && tasksIndent>=0 && indent>tasksIndent){ flushTask(); parseTaskRest(rest); taskItemIndent=indent; continue; }
      continue;
    }
    if(/^tasks\s*:\s*$/.test(t)){ tasksIndent=indent; continue; }
    if(!play) continue;
    if(!task){
      /* 任务之外 play 级 key —— 忽略 */
      continue;
    }
    var mm=t.match(/^([\w.]+)\s*:\s*(.*)$/); if(!mm) continue;
    var key=mm[1].replace(/\./g,'_'), val=mm[2].trim();
    if(ANSIBLE_MODULES.indexOf(key)>=0){
      task.module=key; task.rawArg=val||null; moduleIndent=indent; continue;
    }
    if(['become','when','register','vars','ignore_errors','changed_when','delegate_to','tags','notify','loop'].indexOf(key)>=0) continue;
    if(key==='name'&&(!task.name||task.name===null)){ task.name=val; continue; }
    task.args[key]=val;
  }
  flushTask();
  return plays;
}
function taskIntArgs_shouldAccept(){ return false; }
function ansibleRun(vm, text){
  var plays=ansibleParse(text), lines=[];
  var okAll=0, changedAll=0, failAll=0;
  for(var p=0;p<plays.length;p++){
    lines.push(C('PLAY ['+plays[p].hosts+'] ********************************************************************','ok'));
    lines.push(C('TASK [Gathering Facts] *********************************************************','dim'));
    lines.push('ok: [srv1]');
    var tasks=plays[p].tasks;
    for(var t=0;t<tasks.length;t++){
      var task=tasks[t];
      var tname=task.name||task.module||'task';
      lines.push(C('TASK ['+tname+'] **********************************************************','dim'));
      var r=ansibleModule(vm, task);
      okAll++;
      if(r.failed){ failAll++; lines.push(C('fatal: [srv1]: FAILED! => {"changed": false, "msg": "'+r.msg+'"}','err')); }
      else if(r.changed){ changedAll++; lines.push(C('changed: [srv1]','hint')); }
      else lines.push('ok: [srv1]');
      if(r.note) lines.push(C('  ↳ '+r.note,'dim'));
    }
  }
  lines.push(C('PLAY RECAP ********************************************************************','ok'));
  lines.push('srv1                       : ok='+okAll+'    changed='+changedAll+'    unreachable=0    failed='+failAll);
  vm.ansible={runs:(vm.ansible?vm.ansible.runs:0)+1, last:{ok:okAll, changed:changedAll, failed:failAll}, ts:Date.now()};
  return {lines:lines, code:failAll>0?2:0};
}
function ansibleModule(vm, task){
  var a=Object.assign({}, kvArgs(task.rawArg||''), task.args||{});
  var mod=task.module;
  if(!mod) return {failed:true, msg:'no module specified'};
  if(mod==='apt'||mod==='package'||mod==='yum'){
    var names=String(a.name||'').split(/[,\s]+/).filter(function(x){return x;});
    if(!names.length) return {failed:true, msg:"missing required arguments: name"};
    var changed=false, notfound=[];
    for(var i=0;i<names.length;i++){
      var n=names[i];
      if((a.state||'present')==='absent'){
        if(vm.pkgs[n]){ pkgRemove(vm,n,false); changed=true; }
      } else {
        if(vm.pkgs[n]){ if(a.state==='latest'){ /* 视为最新 */ } }
        else { var r=pkgInstall(vm,n); if(r.notfound) notfound.push(n); else changed=true; }
      }
    }
    if(notfound.length) return {failed:true, msg:"No package matching '"+notfound[0]+"' is available"};
    return {changed:changed};
  }
  if(mod==='service'||mod==='systemd'){
    var sname=a.name, st2=a.state||'started';
    if(!sname) return {failed:true, msg:'missing required arguments: name'};
    var s=vm.svc(sname,true);
    if(!s.installed) return {failed:true, msg:"Could not find the requested service "+sname+": host"};
    var ch=false;
    if(st2==='started'&&!s.running){ var rr=svcStart(vm,sname); if(!rr.ok) return {failed:true, msg:'Unable to start service '+sname+': '+rr.lines.map(textOf).join(' ')}; ch=true; }
    else if(st2==='stopped'&&s.running){ svcStop(vm,sname); ch=true; }
    else if(st2==='restarted'){ svcRestart(vm,sname); ch=true; }
    if(a.enabled!==undefined){ var want=String(a.enabled)=='yes'||String(a.enabled)=='true';
      if(!!s.enabled!==want){ s.enabled=want; ch=true; } }
    return {changed:ch};
  }
  if(mod==='copy'){
    if(!a.src||!a.dest) return {failed:true, msg:'missing required arguments: src,dest'};
    var c=vm.read(a.src);
    if(c===null) return {failed:true, msg:"could not find src file: "+a.src};
    var old=vm.read(a.dest);
    vm.mkdirP(parentOf(vm.p(a.dest)));
    vm.write(a.dest, c, {m:a.mode?parseInt(a.mode,8):undefined});
    return {changed: old!==c};
  }
  if(mod==='file'){
    var path=a.path||a.dest; var state=a.state||'file';
    if(!path) return {failed:true, msg:'missing required arguments: path'};
    if(state==='absent'){ if(vm.exists(path)){ vm.rm(path,true); return {changed:true}; } return {changed:false}; }
    if(state==='directory'){ if(!vm.isDir(path)){ vm.mkdirP(path); if(a.mode) vm.chmod(path,parseInt(a.mode,8)); return {changed:true}; } return {changed:false}; }
    if(!vm.exists(path)){ vm.write(path,'',{}); return {changed:true}; }
    return {changed:false};
  }
  if(mod==='lineinfile'){
    var p2=a.path; if(!p2) return {failed:true, msg:'missing required arguments: path'};
    var c2=vm.read(p2)||'';
    if(a.line && c2.split('\n').indexOf(a.line)<0){
      vm.write(p2, (c2.replace(/\n$/,'')+'\n'+a.line+'\n').replace(/^\n/,''));
      return {changed:true};
    }
    return {changed:false};
  }
  if(mod==='command'||mod==='shell'){
    var cmd=task.rawArg||a._||a.cmd||'';
    cmd=String(cmd).replace(/^["']|["']$/g,'');
    if(!cmd) return {failed:true, msg:'missing required arguments: _raw_params'};
    var r2=execLine(vm, cmd);
    if(r2.code!==0) return {failed:true, msg:'non-zero return code ('+r2.code+')'};
    return {changed:true, note:r2.lines.filter(function(x){return typeof x==='string';}).slice(0,2).join(' / ')||undefined};
  }
  if(mod==='user'){
    if(!a.name) return {failed:true, msg:'missing required arguments: name'};
    if((a.state||'present')==='absent'){ if(vm.users[a.name]){ delete vm.users[a.name]; vm.syncPasswd(); return {changed:true}; } return {changed:false}; }
    if(vm.users[a.name]) return {changed:false};
    var r3=vm.addUser(a.name,{mkhome:a.create_home!=='no',groups:a.groups?a.groups.split(','):null});
    return {changed:r3.ok};
  }
  if(mod==='group'){ if(!a.name) return {failed:true, msg:'missing required arguments: name'}; var r4=vm.addGroup(a.name); return {changed:r4.ok}; }
  if(mod==='debug'){ return {changed:false, note:String(a.msg||a.var||'')}; }
  if(mod==='cron'){ return {changed:false}; }
  return {failed:true, msg:"couldn't resolve module/action '"+mod+"'"};
}
function kvArgs(s){
  var out={}, toks=String(s).split(/\s+/), cur2='', q=null;
  toks=[];
  for(var i=0;i<s.length;i++){ var ch=s[i];
    if(q){ if(ch===q) q=null; else cur2+=ch; continue; }
    if(ch==="'"||ch==='"'){ q=ch; continue; }
    if(ch===' '||ch==='\t'){ if(cur2){toks.push(cur2);cur2='';} continue; }
    cur2+=ch;
  }
  if(cur2) toks.push(cur2);
  for(var t=0;t<toks.length;t++){ var eq=toks[t].indexOf('='); if(eq>0) out[toks[t].slice(0,eq)]=toks[t].slice(eq+1); }
  return out;
}
/* ---- LDAP ---- */
function ldapParse(text){
  var entries=[], cur=null;
  var lines=text.split('\n');
  for(var i=0;i<lines.length;i++){
    var t=lines[i].replace(/\s+$/,'');
    if(!t.trim()){ if(cur){ entries.push(cur); cur=null; } continue; }
    if(t.trim().indexOf('#')===0) continue;
    if(t.indexOf(':')<0) continue;
    var k=t.slice(0,t.indexOf(':')).trim().toLowerCase(), v=t.slice(t.indexOf(':')+1).trim();
    if(!cur){ cur={attrs:{}}; }
    if(k==='dn'){ cur.dn=v; }
    if(!cur.attrs[k]) cur.attrs[k]=[];
    cur.attrs[k].push(v);
  }
  if(cur) entries.push(cur);
  return entries;
}
function ldapAdd(vm, text){
  var es=ldapParse(text), lines=[], added=0;
  for(var i=0;i<es.length;i++){
    var e=es[i];
    if(!e.dn){ lines.push(C('ldapadd: invalid format (line '+(i+1)+' of entry: "'+(e.attrs.objectclass?'':'')+'")','err')); return {lines:lines, code:1}; }
    var dup=false;
    for(var j=0;j<vm.ldapE.length;j++) if(vm.ldapE[j].dn===e.dn) dup=true;
    if(dup){ lines.push(C('adding new entry "'+e.dn+'"','err')); lines.push(C('ldap_add: Already exists (68)','err')); return {lines:lines, code:1}; }
    vm.ldapE.push(e); added++;
    lines.push('adding new entry "'+e.dn+'"');
  }
  return {lines:lines, code:0};
}
function ldapSearch(vm, base, filter){
  var es=[];
  for(var i=0;i<vm.ldapE.length;i++){ var e=vm.ldapE[i];
    if(base && e.dn.toLowerCase().indexOf(base.toLowerCase())<0) continue;
    if(filter && !ldapMatch(e, filter)) continue;
    es.push(e);
  }
  var lines=[];
  lines.push('# extended LDIF'); lines.push('#');
  lines.push('# LDAPv3'); lines.push('# base <'+(base||'')+'> with scope subtree');
  lines.push('# filter: '+(filter||'(objectClass=*)')); lines.push('# requesting: ALL');
  lines.push('#');
  for(var q=0;q<es.length;q++){
    var e2=es[q]; lines.push('dn: '+e2.dn);
    var keys=Object.keys(e2.attrs);
    for(var kk=0;kk<keys.length;kk++){
      var key=keys[kk]; if(key==='dn') continue;
      var canon={'objectclass':'objectClass','uid':'uid','cn':'cn','sn':'sn','ou':'ou','userpassword':'userPassword','mail':'mail'}[key]||key;
      var vs=e2.attrs[key];
      for(var vv=0;vv<vs.length;vv++) lines.push(canon+': '+vs[vv]);
    }
    lines.push('');
  }
  lines.push('# search result');
  lines.push('search: 2');
  lines.push('result: 0 Success');
  lines.push('# numResponses: '+(es.length+1));
  lines.push('# numEntries: '+es.length);
  return {lines:lines, code:0};
}
function ldapMatch(e, filter){
  var m=String(filter).trim().match(/^\((\w+)=([^)]*)\)$/);
  if(!m) return true;
  var k=m[1].toLowerCase(), v=m[2];
  if(k==='objectclass'&&(v==='*')) return true;
  var vals=e.attrs[k]||[];
  for(var i=0;i<vals.length;i++){ if(v==='*') return true;
    if(v.slice(-1)==='*'){ if(vals[i].toLowerCase().indexOf(v.slice(0,-1).toLowerCase())===0) return true; }
    else if(vals[i].toLowerCase()===v.toLowerCase()) return true;
  }
  return false;
}
/* ---- Docker ---- */
function dockerDaemonUp(vm){ var d=vm.svcs['docker']; return !!(d&&d.running); }
function dockerPull(vm, image){
  vm.docker.images[image]={tag:image.indexOf(':')>=0?image.split(':')[1]:'latest'};
  return ['Using default tag: latest','latest: Pulling from library/'+image.split(':')[0],
    'Digest: sha256:'+('0'.repeat(8))+'f1e2d3c4b5a6...', 'Status: Downloaded newer image for '+image];
}
function dockerRun(vm, args){
  /* args 已去掉 docker run 前缀 */
  var detach=false, name=null, ports=[], vols=[], image=null, cmd=null, i=0;
  var envs=[];
  for(i=0;i<args.length;i++){
    var a=args[i];
    if(a==='-d'||a==='--detach'){ detach=true; continue; }
    if(a==='--name'){ name=args[++i]; continue; }
    if(a==='-p'||a==='--publish'){ var pm=(args[++i]||'').split(':'); if(pm.length>=2){ var h=parseInt(pm[pm.length-2],10), c=parseInt(pm[pm.length-1],10); if(h&&c) ports.push({h:h,c:c}); } continue; }
    if(a==='-v'||a==='--volume'){ var vm2=(args[++i]||'').split(':'); if(vm2.length>=2){ vols.push({h:vm2[0],c:vm2[1]}); } continue; }
    if(a==='-e'||a==='--env'){ envs.push(args[++i]); continue; }
    if(a==='--restart'||a==='--network'||a==='--hostname'){ i++; continue; }
    if(a.charAt(0)==='-' && a.length>1) continue;
    if(!image) image=a; else if(!cmd) cmd=a;
  }
  if(!image) return {err:"\"docker run\" requires at least 1 argument."};
  var imgBase=image.split(':')[0];
  if(!vm.docker.images[image] && !vm.docker.images[imgBase]){
    if(['nginx','alpine','httpd','mysql','mariadb','busybox'].indexOf(imgBase)<0){
      return {err:'Unable to find image \''+image+'\' locally\ndocker: Error response from daemon: pull access denied for '+imgBase+', repository does not exist or may require \'docker login\''};
    }
    dockerPull(vm, image);
  }
  if(name){
    for(var k in vm.docker.containers) if(k===name) return {err:'docker: Conflict. The container name "/'+name+'" is already in use by container.'};
  } else name=imgBase+'_'+Math.random().toString(36).slice(2,8);
  for(var v=0;v<vols.length;v++){
    if(vols[v].h.charAt(0)!=='/'){ vm.docker.volumes[vols[v].h]=vm.docker.volumes[vols[v].h]||{name:vols[v].h,path:'/var/lib/docker/volumes/'+vols[v].h+'/_data'};
      vm.mkdirP(vm.docker.volumes[vols[v].h].path); vols[v].h=vm.docker.volumes[vols[v].h].path; }
    else { vm.mkdirP(vols[v].h); }
  }
  var id=Math.random().toString(16).slice(2,14);
  vm.docker.containers[name]={name:name, image:image, ports:ports, volumes:vols, running:true, id:id, cmd:cmd};
  vm.log('docker','Started container '+name);
  return {ok:true, id:id, name:name, lines:detach?[id]:[] };
}
function dockerPs(vm, all){
  var lines=['CONTAINER ID   IMAGE          COMMAND                  CREATED         STATUS         PORTS                    NAMES'];
  for(var k in vm.docker.containers){
    var c=vm.docker.containers[k];
    if(!c.running&&!all) continue;
    var portsStr=(c.ports||[]).map(function(p){ return '0.0.0.0:'+p.h+'->'+p.c+'/tcp'; }).join(', ');
    lines.push(c.id.slice(0,12).padEnd(14)+'  '+c.image.padEnd(13)+'  "'+(c.cmd||'/docker-entrypoint.…')+'"'.slice(0,24).padEnd(24)+'  5 seconds ago   '+(c.running?'Up 5 seconds':'Exited (0)')+'   '+portsStr.padEnd(24)+'  '+c.name);
  }
  return lines;
}
root.LabEngine.ansibleParse=ansibleParse; root.LabEngine.ansibleRun=ansibleRun;
root.LabEngine.ldapAdd=ldapAdd; root.LabEngine.ldapSearch=ldapSearch; root.LabEngine.ldapParse=ldapParse;
root.LabEngine.dockerRun=dockerRun; root.LabEngine.dockerPs=dockerPs; root.LabEngine.dockerDaemonUp=dockerDaemonUp;

/* =====================================================================
   七、命令解释器（类 bash 子集）
   ===================================================================== */
function tokenize(s){
  var out=[], cur='', q=null, i=0;
  while(i<s.length){
    var ch=s[i];
    if(q){ if(ch===q){ q=null; } else if(ch==='\\' && q==='"' && i+1<s.length){ cur+=s[++i]; } else cur+=ch; i++; continue; }
    if(ch==="'"||ch==='"'){ q=ch; i++; continue; }
    if(ch===' '||ch==='\t'){ if(cur!==''){ out.push(cur); cur=''; } i++; continue; }
    if(ch==='\\' && i+1<s.length){ cur+=s[++i]; i++; continue; }
    cur+=ch; i++;
  }
  if(cur!=='') out.push(cur);
  return out;
}
function splitChain(line){
  var out=[], cur='', q=null, i=0, op='start';
  while(i<line.length){
    var ch=line[i];
    if(q){ cur+=ch; if(ch===q) q=null; i++; continue; }
    if(ch==="'"||ch==='"'){ q=ch; cur+=ch; i++; continue; }
    if(ch===';'||ch==='&'&&line[i+1]==='&'||ch==='|'&&line[i+1]==='|'){
      var thisOp=ch;
      if(ch==='&'||ch==='|') i++;
      if(cur.trim()) out.push({op:op, cmd:cur.trim()});
      op=(thisOp==='&'?'&&':(thisOp==='|'?'||':';'));
      cur=''; i++; continue;
    }
    cur+=ch; i++;
  }
  if(cur.trim()) out.push({op:op, cmd:cur.trim()});
  return out;
}
function splitPipe(cmd){
  var out=[], cur='', q=null, i=0;
  while(i<cmd.length){
    var ch=cmd[i];
    if(q){ cur+=ch; if(ch===q) q=null; i++; continue; }
    if(ch==="'"||ch==='"'){ q=ch; cur+=ch; i++; continue; }
    if(ch==='|'){ out.push(cur.trim()); cur=''; i++; continue; }
    cur+=ch; i++;
  }
  out.push(cur.trim());
  return out;
}
function findRedirect(cmd){
  var q=null, i=0;
  while(i<cmd.length){
    var ch=cmd[i];
    if(q){ if(ch===q) q=null; i++; continue; }
    if(ch==="'"||ch==='"'){ q=ch; i++; continue; }
    if(ch==='>'){
      var op='>', j=i+1;
      if(cmd[j]==='>'){ op='>>'; j++; }
      /* fd 前缀 2> */
      var pre=cmd.slice(0,i).replace(/\s+$/,'');
      var fd=0;
      if(/2$/.test(pre)&&(pre.length===1||/\s$|^\s*2$/.test(cmd.slice(Math.max(0,i-2),i)))){ fd=2; pre=pre.replace(/2$/,''); }
      return {pre:pre.replace(/\s+$/,''), op:op, fd:fd, rest:cmd.slice(j).trim()};
    }
    if(ch==='<'&&cmd[i+1]==='<'){ return {heredoc:true}; }
    i++;
  }
  return null;
}
function globExpand(vm, tok){
  if(tok.indexOf('*')<0) return [tok];
  var dir=parentOf(tok.indexOf('/')>=0?tok:('./'+tok)), pat=baseOf(tok);
  var re=new RegExp('^'+pat.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\?/g,'.')+'$');
  var base2=tok.indexOf('/')>=0?parentOf(tok):'.';
  var list=vm.children(base2==='.'?vm.cwd:base2), out=[];
  for(var i=0;i<list.length;i++) if(re.test(list[i])) out.push((base2==='.'?'':base2+'/')+list[i]);
  return out.length?out:[tok];
}
function dateFormat(vm, fmt){
  var d=new Date(), base;
  try{
    var p=new Intl.DateTimeFormat('en-CA',{timeZone:vm.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(d);
    var o={}; p.forEach(function(x){ o[x.type]=x.value; });
    base=o.year+'-'+o.month+'-'+o.day+' '+o.hour+':'+o.minute+':'+o.second;
  }catch(e){ base=d.toISOString().slice(0,19).replace('T',' '); }
  if(!fmt) return base;
  return fmt.replace(/%Y/g,base.slice(0,4)).replace(/%m/g,base.slice(5,7)).replace(/%d/g,base.slice(8,10))
    .replace(/%H/g,base.slice(11,13)).replace(/%M/g,base.slice(14,16)).replace(/%S/g,base.slice(17,19))
    .replace(/%F/g,base.slice(0,10)).replace(/%T/g,base.slice(11));
}
function expandEnv(vm, s, code){
  s=String(s).replace(/\$\((date[^)]*)\)/g, function(_, inner){
    var parts=inner.trim().split(/\s+/);
    return dateFormat(vm, parts[1]||'');
  });
  var out='', i=0;
  while(i<s.length){
    var ch=s[i];
    if(ch==='$'&&s[i+1]==='('){ out+='$('; i+=2; continue; }
    if(ch==='$'){
      var m=s.slice(i).match(/^\$\{(\w+)\}/)||s.slice(i).match(/^\$(\w+)/);
      if(m){ var name=m[1];
        if(name==='?'){ out+=String(code||0); i+=m[0].length; continue; }
        if(name==='$'){ out+='1'; i+=2; continue; }
        out+= vm.env[name]!==undefined?vm.env[name]:'';
        i+=m[0].length; continue;
      }
    }
    out+=ch; i++;
  }
  return out;
}
function textOf(l){ return typeof l==='string'?l:(l&&l.s!==undefined?l.s:String(l)); }

var CMDS={};

/* ---- 文件与目录 ---- */
function modeToStr(m, dir){
  var s='';
  s+= (m&0o4000)?'s':((m&0o400)?'r':'-');
  s+= (m&0o2000)?'s':((m&0o200)?'w':'-');
  s+= (m&0o1000)?((m&0o100)?'s':'S'):((m&0o100)?'x':'-');
  s+= (m&0o040)?'r':'-'; s+= (m&0o020)?'w':'-'; s+= (m&0o010)?'x':'-';
  s+= (m&0o004)?'r':'-'; s+= (m&0o002)?'w':'-'; s+= (m&0o001)?((m&0o1000)?'t':'x'):((m&0o1000)?'T':'-');
  return (dir?'d':'-')+s;
}
CMDS['ls']=function(vm,args,cc){
  var lines=[], flags={l:false,a:false,h:false}, paths=[];
  for(var i=0;i<args.length;i++){ var a=args[i];
    if(a[0]==='-'&&a.length>1){ if(a.indexOf('l')>0)flags.l=true; if(a.indexOf('a')>0)flags.a=true; if(a.indexOf('h')>0)flags.h=true; if(a.indexOf('R')>0){ lines.push(C('ls: -R 暂不支持','err')); return {lines:lines, code:2}; } }
    else paths.push(a);
  }
  if(!paths.length) paths=['.'];
  for(var p2=0;p2<paths.length;p2++){
    var pth=vm.p(paths[p2]);
    var n=vm.f[pth];
    if(!n){ lines.push(C("ls: cannot access '"+paths[p2]+"': No such file or directory",'err')); continue; }
    if(paths.length>1) lines.push(paths[p2]+':');
    var names=[];
    if(n.d){
      if(flags.a) names=['.','..'].concat(vm.children(pth));
      else names=vm.children(pth).filter(function(x){return x[0]!=='.';});
      if(flags.l){
        var tot=0; for(var k=0;k<names.length;k++){ if(names[k]!=='.'&&names[k]!=='..') tot+=(vm.f[pth==='/'?'/'+names[k]:pth+'/'+names[k]]||{}).d?4:1; }
        lines.push('total '+tot*4);
        for(var j=0;j<names.length;j++){
          var cn=names[j], cp=(pth==='/'?'':pth)+'/'+cn, nd=vm.f[cp]||{d:1,m:0o755,u:'root',g:'root'};
          var m2=nd.m!==undefined?nd.m:(nd.d?0o755:0o644);
          lines.push(modeToStr(m2,!!nd.d)+' '+(nd.d?2:1)+' '+(nd.u||'root')+' '+(nd.g||'root')+' '+(nd.d?4096:vm.sizeOf(cp)).toString().padStart(5)+' Sep 20 10:00 '+cn);
        }
      } else {
        if(names.length) lines.push(names.join('  '));
      }
    } else {
      if(flags.l){ lines.push(modeToStr(n.m!==undefined?n.m:0o644,false)+' 1 '+n.u+' '+n.g+' '+vm.sizeOf(pth).toString().padStart(5)+' Sep 20 10:00 '+paths[p2]); }
      else lines.push(paths[p2]);
    }
  }
  return {lines:lines, code:0};
};
CMDS['cd']=function(vm,args){
  var t=args[0]||vm.env.HOME;
  var pth=vm.p(t);
  if(!vm.isDir(pth)) return {lines:[C('bash: cd: '+t+': No such file or directory','err')], code:1};
  vm.cwd=pth; return {lines:[], code:0};
};
CMDS['pwd']=function(vm){ return {lines:[vm.cwd], code:0}; };
CMDS['cat']=function(vm,args,cc){
  if(cc.stdin!==undefined){ return {lines:cc.stdin.slice(), code:0}; }
  if(!args.length){
    if(cc._redirectOpen){ return {lines:[], code:0, editor:{path:vm.p(cc._redirectTarget||''), mode:'new'}}; }
    return {lines:[C('（cat 等待输入…… 模拟器里请用 nano 编辑文件，或 cat 文件路径）','hint')], code:0};
  }
  var lines=[];
  for(var i=0;i<args.length;i++){
    var pth=vm.p(args[i]);
    var n=vm.f[pth];
    if(!n){ lines.push(C('cat: '+args[i]+': No such file or directory','err')); continue; }
    if(n.d){ lines.push(C('cat: '+args[i]+': Is a directory','err')); continue; }
    var c=followRead(vm,pth); if(c===null)c='';
    var ls=c.replace(/\n$/,'').split('\n'); for(var j=0;j<ls.length;j++) lines.push(ls[j]);
  }
  return {lines:lines, code:0};
};
function followRead(vm, pth, d){
  d=d||0; if(d>8) return null;
  var n=vm.f[pth]; if(!n) return null;
  if(n.l){ return followRead(vm, vm.p(n.l.indexOf('/')===0?n.l:parentOf(pth)+'/'+n.l), d+1); }
  return n.c===undefined?'':n.c;
}
CMDS['echo']=function(vm,args){
  var nl=true, out=[];
  for(var i=0;i<args.length;i++){ if(args[i]==='-n'){ nl=false; continue; } out.push(args[i]); }
  return {lines:[out.join(' ')], code:0};
};
CMDS['mkdir']=function(vm,args){
  var p=false, lines=[], err=0;
  for(var i=0;i<args.length;i++){ var a=args[i];
    if(a==='-p'){ p=true; continue; }
    var r=p?vm.mkdirP(a):vm.mkdir(a);
    if(!r.ok){ lines.push(C('mkdir: cannot create directory \''+a+'\': '+(r.err||'error'),'err')); err=1; }
  }
  return {lines:lines, code:err};
};
CMDS['rmdir']=function(vm,args){
  var lines=[], err=0;
  for(var i=0;i<args.length;i++){
    var pth=vm.p(args[i]);
    if(!vm.isDir(pth)){ lines.push(C('rmdir: failed to remove \''+args[i]+'\': No such file or directory','err')); err=1; continue; }
    if(vm.children(pth).length){ lines.push(C('rmdir: failed to remove \''+args[i]+'\': Directory not empty','err')); err=1; continue; }
    vm.rm(pth,false);
  }
  return {lines:lines, code:err};
};
CMDS['touch']=function(vm,args){
  var lines=[];
  for(var i=0;i<args.length;i++){ if(!vm.exists(args[i])) vm.write(args[i],''); }
  return {lines:lines, code:0};
};
CMDS['rm']=function(vm,args){
  var rec=false, force=false, lines=[], err=0;
  for(var i=0;i<args.length;i++){ var a=args[i];
    if(a==='-r'||a==='-rf'||a==='-fr'||a==='-R'){ rec=true; continue; }
    if(a==='-f'){ force=true; continue; }
    if(a==='-rf'||a==='-f') continue;
    if(a[0]==='-'&&a.length>1){ if(a.indexOf('r')>0)rec=true; if(a.indexOf('f')>0)force=true; continue; }
    var r=vm.rm(a, rec);
    if(!r.ok){ if(!force){ lines.push(C("rm: cannot remove '"+a+"': "+(r.err||'failed'),'err')); err=1; } }
  }
  return {lines:lines, code:err};
};
CMDS['cp']=function(vm,args){
  var rec=false, list=[];
  for(var i=0;i<args.length;i++){ if(args[i]==='-r'||args[i]==='-R'||args[i]==='-a'){ rec=true; continue; } list.push(args[i]); }
  if(list.length<2) return {lines:[C('cp: missing destination file operand','err')], code:1};
  var dst=list.pop(), lines=[], err=0;
  var destIsDir=vm.isDir(dst);
  for(var j=0;j<list.length;j++){
    var r=vm.cp(list[j], dst, rec);
    if(!r.ok){ lines.push(C("cp: cannot stat '"+list[j]+"': "+(r.err||''),'err')); err=1; }
  }
  return {lines:lines, code:err};
};
CMDS['mv']=function(vm,args){
  if(args.length<2) return {lines:[C('mv: missing destination file operand','err')], code:1};
  var dst=args.pop(), lines=[], err=0;
  for(var i=0;i<args.length;i++){
    var r=vm.mv(args[i], dst);
    if(!r.ok){ lines.push(C("mv: cannot stat '"+args[i]+"': "+(r.err||''),'err')); err=1; }
  }
  return {lines:lines, code:err};
};
CMDS['ln']=function(vm,args){
  var sym=false, list=[];
  for(var i=0;i<args.length;i++){ if(args[i]==='-s'){ sym=true; continue; } list.push(args[i]); }
  if(list.length<2) return {lines:[C('ln: missing file operand','err')], code:1};
  var pth=vm.p(list[1]);
  vm.f[pth]=sym?{l:list[0],m:0o777}:Object.assign({},vm.f[vm.p(list[0])]||{c:'',m:0o644});
  return {lines:[], code:0};
};
function chmodOctal(vm, spec, path, rec){
  var mode=parseMode(spec), lines=[], err=0;
  function apply(pp){ var n=vm.f[pp]; if(!n) return; n.m=mode; }
  if(mode===null){
    var mm=spec.match(/^([ugoa]*)([+=-])([rwxX]*)$/);
    if(!mm) return {lines:[C('chmod: invalid mode: \''+spec+'\'','err')], code:1};
    var pth=vm.p(path), n=vm.f[pth];
    if(!n) return {lines:[C('chmod: cannot access \''+path+'\': No such file or directory','err')], code:1};
    var who=mm[1]||'a', op=mm[2], perm=mm[3]; var m=n.m!==undefined?n.m:(n.d?0o755:0o644);
    function bits(p){ var b=0; if(p.indexOf('r')>=0)b|=4; if(p.indexOf('w')>=0)b|=2; if(p.indexOf('x')>=0||p.indexOf('X')>=0)b|=1; return b; }
    var b2=bits(perm);
    if(who.indexOf('a')>=0||who===''){ who='ugo'; }
    for(var i2=0;i2<who.length;i2++){
      var sh=(who[i2]==='u'?6:(who[i2]==='g'?3:0));
      var cur=(m>>sh)&7;
      var nw=(op==='+'?cur|b2:(op==='-'?cur&~b2:(op==='='?b2:cur)));
      m=(m&~(7<<sh))|(nw<<sh);
    }
    n.m=m; return {lines:[], code:0};
  }
  var p3=vm.p(path);
  if(!vm.f[p3]) return {lines:[C('chmod: cannot access \''+path+'\': No such file or directory','err')], code:1};
  apply(p3);
  if(rec&&vm.f[p3].d){ var pref=p3+'/'; for(var k in vm.f) if(k.indexOf(pref)===0) apply(k); }
  return {lines:[], code:0};
}
CMDS['chmod']=function(vm,args){
  var rec=false, list=[];
  for(var i=0;i<args.length;i++){ if(args[i]==='-R'){ rec=true; continue; } list.push(args[i]); }
  if(list.length<2) return {lines:[C('chmod: missing operand','err')], code:1};
  var spec=list.shift(), lines=[], err=0;
  for(var j=0;j<list.length;j++){ var r=chmodOctal(vm,spec,list[j],rec); if(r.lines.length){ lines=lines.concat(r.lines); err=1; } }
  return {lines:lines, code:err};
};
CMDS['chown']=function(vm,args){
  var rec=false, list=[];
  for(var i=0;i<args.length;i++){ if(args[i]==='-R'){ rec=true; continue; } list.push(args[i]); }
  if(list.length<2) return {lines:[C('chown: missing operand','err')], code:1};
  var spec=list.shift().split(':'), u=spec[0], g=spec[1];
  var lines=[], err=0;
  function doOne(x){ var r=vm.chown(x,u,g); if(!r.ok){ lines.push(C('chown: cannot access \''+x+'\': No such file or directory','err')); err=1; } }
  for(var j=0;j<list.length;j++){
    doOne(list[j]);
    if(rec){ var p3=vm.p(list[j]); var pref=p3+'/'; for(var k in vm.f) if(k.indexOf(pref)===0) doOne(k); }
  }
  return {lines:lines, code:err};
};
CMDS['chgrp']=function(vm,args){ return CMDS['chown'](vm,args); };
CMDS['stat']=function(vm,args){
  var fmt=null, files=[];
  for(var i=0;i<args.length;i++){ var a=args[i];
    if(a==='-c'||a==='--format'){ fmt=args[++i]; continue; }
    if(a.indexOf('-c')===0){ fmt=a.slice(2); continue; }
    files.push(a);
  }
  var lines=[], err=0;
  for(var j=0;j<files.length;j++){
    var st=vm.statOf(files[j]);
    if(!st){ lines.push(C("stat: cannot statx '"+files[j]+"': No such file or directory",'err')); err=1; continue; }
    if(fmt!==null){
      lines.push(fmt.replace(/%a/g,modeStr(st.m&0o7777)).replace(/%U/g,st.u).replace(/%G/g,st.g)
        .replace(/%n/g,files[j]).replace(/%s/g,String(st.size)).replace(/%F/g,st.dir?'directory':'regular file'));
    } else {
      lines.push('  File: '+files[j]);
      lines.push('  Size: '+st.size+'\tBlocks: 8          IO Block: 4096   '+(st.dir?'directory':'regular file'));
      lines.push('Access: (0'+modeStr(st.m)+'/'+modeToStr(st.m,st.dir)+')  Uid: ('+(vm.users[st.u]?vm.users[st.u].uid:0)+'/'+st.u+')   Gid: (0/'+st.g+')');
    }
  }
  return {lines:lines, code:err};
};
CMDS['file']=function(vm,args){
  var lines=[];
  for(var i=0;i<args.length;i++){
    var st=vm.statOf(args[i]);
    if(!st){ lines.push(args[i]+': cannot open (No such file or directory)'); continue; }
    lines.push(args[i]+': '+(st.dir?'directory':(/PNG|JFIF/.test(vm.read(args[i])||'')?'image data':'ASCII text')));
  }
  return {lines:lines, code:0};
};
CMDS['du']=function(vm,args){
  var sum=false, human=false, list=[];
  for(var i=0;i<args.length;i++){ var a=args[i];
    if(a==='-s'||a==='-sh'||a==='-hs'){ sum=true; human=true; continue; }
    if(a==='-h'){ human=true; continue; }
    list.push(a);
  }
  if(!list.length) list=['.'];
  var lines=[];
  for(var j=0;j<list.length;j++){
    var p3=vm.p(list[j]); var total=0;
    var pref=p3==='/'?'/':p3+'/';
    for(var k in vm.f){ if(k===p3||k.indexOf(pref)===0){ total+=vm.sizeOf(k); } }
    lines.push(fmtSize(total)+'\t'+list[j]);
  }
  return {lines:lines, code:0};
};
CMDS['df']=function(vm,args){
  var b=vm.diskUsed(), total=vm.disk.total, avail=total-b;
  var pct=Math.round(b/total*100);
  var lines=['Filesystem      Size  Used Avail Use% Mounted on',
    '/dev/vda1        '+fmtSize(total).padStart(5)+'  '+fmtSize(b).padStart(5)+'  '+fmtSize(avail).padStart(5)+'  '+String(pct)+'% /',
    'tmpfs            '+(200e6>=1024?'195M':'195M')+'   1.2M  194M   1% /run'];
  if(pct>=90) lines.push(C('⚠ 磁盘使用率 '+pct+'%，已接近写满！找到大文件清掉它（du -sh /var/* 逐个排查）','hint'));
  return {lines:lines, code:0};
};
CMDS['find']=function(vm,args){
  var start=args[0], nameRe=null, typeF=null, i=0;
  if(!start||start[0]==='-') start='.';
  else i=1;
  for(;i<args.length;i++){
    if(args[i]==='-name'){ var pat=args[++i]||'*';
      nameRe=new RegExp('^'+pat.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\?/g,'.')+'$'); }
    else if(args[i]==='-type'){ typeF=args[++i]; }
  }
  var p3=vm.p(start), pref=p3==='/'?'/':p3+'/';
  var lines=[p3];
  for(var k in vm.f){
    if(k.indexOf(pref)!==0) continue;
    if(typeF==='f'&&vm.f[k].d) continue;
    if(typeF==='d'&&!vm.f[k].d) continue;
    if(nameRe&&!nameRe.test(baseOf(k))) continue;
    lines.push(k);
  }
  lines.sort();
  return {lines:lines, code:0};
};
CMDS['truncate']=function(vm,args){
  var size=0, files=[], i=0;
  for(;i<args.length;i++){ if(args[i]==='-s'){ size=parseInt(args[++i],10)||0; } else files.push(args[i]); }
  var lines=[];
  for(var j=0;j<files.length;j++){
    if(!vm.exists(files[j])){ vm.write(files[j],''); }
    if(size===0){ var had=vm.sizeOf(vm.p(files[j])); vm.sz[vm.p(files[j])]=0; vm.write(files[j],''); }
    else { vm.sz[vm.p(files[j])]=size; }
  }
  return {lines:lines, code:0};
};
CMDS['head']=function(vm,args,cc){
  var n=10, files=[], i=0;
  for(;i<args.length;i++){ var a=args[i];
    if(a==='-n'){ n=parseInt(args[++i],10)||10; continue; }
    if(/^-\d+$/.test(a)){ n=parseInt(a.slice(1),10); continue; }
    if(a==='-q') continue;
    files.push(a);
  }
  var src=readInputs(vm, files, cc);
  return {lines:src.lines.slice(0,n), code:src.err};
};
CMDS['tail']=function(vm,args,cc){
  var n=10, files=[], i=0;
  for(;i<args.length;i++){ var a=args[i];
    if(a==='-n'){ n=parseInt(args[++i],10)||10; continue; }
    if(/^-\d+$/.test(a)){ n=parseInt(a.slice(1),10); continue; }
    if(a==='-f'){ continue; }
    files.push(a);
  }
  var src=readInputs(vm, files, cc);
  return {lines:src.lines.slice(-n), code:src.err};
};
function readInputs(vm, files, cc){
  if(!files.length){ return {lines:(cc.stdin||[]).slice(), err:0}; }
  var lines=[], err=0;
  for(var j=0;j<files.length;j++){
    var n=vm.f[vm.p(files[j])];
    if(!n){ lines.push(C('No such file or directory: '+files[j],'err')); err=1; continue; }
    if(n.d){ lines.push(C(files[j]+': Is a directory','err')); err=1; continue; }
    var c=followRead(vm, vm.p(files[j]))||'';
    lines=lines.concat(c.replace(/\n$/,'').split('\n'));
  }
  return {lines:lines, err:err};
}
function grepCore(lines, pat, flags){
  var re=null, lo=flags.indexOf('i')>=0;
  try{ re=new RegExp(pat, lo?'i':''); }catch(e){ re=new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), lo?'i':''); }
  var out=[], invert=flags.indexOf('v')>=0, countOn=flags.indexOf('c')>=0;
  for(var i=0;i<lines.length;i++){ var t=typeof lines[i]==='string'?lines[i]:lines[i].s;
    var hit=re.test(t); if(invert) hit=!hit;
    if(hit) out.push(t);
  }
  if(countOn) return [String(out.length)];
  return out;
}
CMDS['grep']=function(vm,args,cc){
  var flags='', pat=null, files=[], i=0;
  for(;i<args.length;i++){ var a=args[i];
    if(a[0]==='-'&&a.length>1&&!/^-e$/.test(a)){ flags+=a.slice(1); continue; }
    if(pat===null){ pat=a; continue; }
    files.push(a);
  }
  if(pat===null) return {lines:[C('grep: 缺少匹配模式','err')], code:2};
  var lines=[];
  if(flags.indexOf('r')>=0&&files.length){
    var dir=files[0], p3=vm.p(dir), pref=p3==='/'?'/':p3+'/';
    for(var k in vm.f){
      if(k.indexOf(pref)!==0||vm.f[k].d) continue;
      var c=followRead(vm,k)||'';
      var sub=grepCore(c.replace(/\n$/,'').split('\n'), pat, flags);
      for(var j=0;j<sub.length;j++) lines.push(k+':'+sub[j]);
    }
    return {lines:lines, code:lines.length?0:1};
  }
  if(!files.length){ lines=grepCore((cc.stdin||[]).map(textOf), pat, flags); return {lines:lines, code:lines.length?0:1}; }
  for(var f=0;f<files.length;f++){
    var n=vm.f[vm.p(files[f])];
    if(!n){ lines.push(C('grep: '+files[f]+': No such file or directory','err')); continue; }
    var c2=followRead(vm,vm.p(files[f]))||'';
    var sub2=grepCore(c2.replace(/\n$/,'').split('\n'), pat, flags);
    for(var q=0;q<sub2.length;q++) lines.push((files.length>1?files[f]+':':'')+sub2[q]);
  }
  return {lines:lines, code:lines.length?0:1};
};
CMDS['sed']=function(vm,args){
  var inplace=false, expr=null, files=[];
  for(var i=0;i<args.length;i++){
    if(args[i]==='-i'){ inplace=true; continue; }
    if(args[i]==='-e'){ expr=args[++i]; continue; }
    if(expr===null&&/^s./.test(args[i])){ expr=args[i]; continue; }
    files.push(args[i]);
  }
  if(!expr) return {lines:[C('sed: 仅支持 s/表达式（如 sed -i \'s/a/b/g\' file）','err')], code:1};
  var m=expr.match(/^s(.)(.*?)\1(.*?)\1(.*)$/);
  if(!m) return {lines:[C('sed: 表达式解析失败','err')], code:1};
  var re; try{ re=new RegExp(m[2], m[4].indexOf('g')>=0?'g':''); }catch(e){ re=new RegExp(m[2].replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), m[4].indexOf('g')>=0?'g':''); }
  var lines=[];
  if(!files.length) return {lines:[C('sed: 需要文件参数','err')], code:1};
  for(var f=0;f<files.length;f++){
    var p3=vm.p(files[f]), c=followRead(vm,p3);
    if(c===null){ lines.push(C('sed: '+files[f]+': No such file or directory','err')); continue; }
    var nc=c.replace(re, m[3].replace(/\\n/g,'\n'));
    if(inplace){ vm.write(p3, nc); }
    else { var ls=nc.replace(/\n$/,'').split('\n'); for(var j=0;j<ls.length;j++) lines.push(ls[j]); }
  }
  return {lines:lines, code:0};
};
CMDS['sort']=function(vm,args,cc){
  var rev=false; for(var i=0;i<args.length;i++) if(args[i]==='-r') rev=true;
  var lines=readInputs(vm,[],cc).lines.map(textOf);
  lines.sort(); if(rev) lines.reverse();
  return {lines:lines, code:0};
};
CMDS['uniq']=function(vm,args,cc){
  var lines=readInputs(vm,[],cc).lines.map(textOf), out=[];
  for(var i=0;i<lines.length;i++){ if(i===0||lines[i]!==lines[i-1]) out.push(lines[i]); }
  return {lines:out, code:0};
};
CMDS['wc']=function(vm,args,cc){
  var L=0,W=0,C2=0;
  var lines=readInputs(vm,args.filter(function(a){return a[0]!=='-';}),cc).lines.map(textOf);
  for(var i=0;i<lines.length;i++){ L++; C2+=lines[i].length+1; W+=lines[i].split(/\s+/).filter(function(x){return x;}).length; }
  var want=args.join('');
  if(want.indexOf('l')>=0) return {lines:[String(L)], code:0};
  return {lines:[String(L).padStart(7)+String(W).padStart(8)+String(C2).padStart(8)], code:0};
};
CMDS['cut']=function(vm,args,cc){
  var d='\t', f='1';
  for(var i=0;i<args.length;i++){ if(args[i]==='-d') d=args[++i]; if(args[i]==='-f') f=args[++i]; }
  var idx=f.split(',').map(function(x){return parseInt(x,10)-1;});
  var lines=readInputs(vm,[],cc).lines.map(textOf), out=[];
  for(var j=0;j<lines.length;j++){ var parts=lines[j].split(d);
    var sel=[]; for(var k=0;k<idx.length;k++) sel.push(parts[idx[k]]!==undefined?parts[idx[k]]:'');
    out.push(sel.join(d));
  }
  return {lines:out, code:0};
};
CMDS['awk']=function(vm,args,cc){
  var prog=args[0]||'', m=prog.match(/^\{?\s*print\s+\$(\d+)\s*\}?$/);
  var lines=readInputs(vm,[],cc).lines.map(textOf), out=[];
  if(!m) return {lines:[C('awk: 模拟器仅支持 {print $N}','err')], code:1};
  for(var i=0;i<lines.length;i++) out.push(lines[i].split(/\s+/)[+m[1]-1]||'');
  return {lines:out, code:0};
};
CMDS['tr']=function(vm,args,cc){
  var lines=readInputs(vm,[],cc).lines.map(textOf);
  if(args[0]==='a-z'&&args[1]==='A-Z') return {lines:lines.map(function(x){return x.toUpperCase();}), code:0};
  if(args[0]==='A-Z'&&args[1]==='a-z') return {lines:lines.map(function(x){return x.toLowerCase();}), code:0};
  return {lines:lines, code:0};
};
CMDS['clear']=function(){ return {lines:[], code:0, clear:true}; };
CMDS['history']=function(vm){ return {lines:vm.hist.map(function(h,i){return String(i+1).padStart(5)+'  '+h;}), code:0}; };
CMDS['date']=function(vm,args){
  var a=args[0]||'';
  if(a&&a[0]==='+') return {lines:[dateFormat(vm,a.slice(1))], code:0};
  var tzname={ 'Etc/UTC':'UTC','Asia/Shanghai':'CST' }[vm.timezone]||vm.timezone;
  return {lines:[dateFormat(vm,null)+' '+tzname], code:0};
};
CMDS['hostname']=function(vm,args){
  if(args.length){ vm.hostname=args[0]; vm.write('/etc/hostname', args[0]+'\n'); return {lines:[], code:0}; }
  return {lines:[vm.hostname], code:0};
};
CMDS['hostnamectl']=function(vm,args){
  if(args[0]==='set-hostname'){ vm.hostname=args[1]; vm.write('/etc/hostname',args[1]+'\n'); return {lines:[], code:0}; }
  return {lines:['   Static hostname: '+vm.hostname,'   Icon name: computer-vm',' Operating System: Ubuntu 24.04.1 LTS','           Kernel: Linux 6.8.0-41-generic'], code:0};
};
CMDS['timedatectl']=function(vm,args){
  var tz=vm.timezone;
  if(args[0]==='set-timezone'){ tz=args[1]||tz; vm.timezone=tz; vm.write('/etc/timezone',tz+'\n'); vm.write('/etc/localtime','TZif2'); return {lines:[], code:0}; }
  if(args[0]==='list-timezones') return {lines:['Etc/UTC','Asia/Shanghai','Asia/Tokyo','Europe/London','America/New_York'], code:0};
  return {lines:['               Local time: '+CMDS['date'](vm,[]).lines[0],'           Universal time: '+CMDS['date'](vm,[]).lines[0],'                Time zone: '+tz+' ('+tz+')'], code:0};
};
CMDS['whoami']=function(){ return {lines:['root'], code:0}; };
CMDS['id']=function(vm,args){
  var u=args[0]||'root';
  if(!vm.users[u]) return {lines:[C('id: \''+u+'\': no such user','err')], code:1};
  var gs=Object.keys(vm.groups).filter(function(g){ return vm.groups[g].members.indexOf(u)>=0; });
  var all=[vm.users[u].g[0]].concat(gs.filter(function(x){return x!==vm.users[u].g[0];}));
  return {lines:['uid='+(vm.users[u].uid||1000)+'('+u+') gid='+(vm.groups[vm.users[u].g[0]]?vm.groups[vm.users[u].g[0]].gid:1000)+'('+vm.users[u].g[0]+') groups='+all.map(function(g){return (vm.groups[g]?vm.groups[g].gid:1000)+'('+g+')';}).join(',')], code:0};
};
CMDS['groups']=function(vm,args){
  if(args.length){ var u=args[0]; var gs=Object.keys(vm.groups).filter(function(g){ return vm.groups[g].members.indexOf(u)>=0||vm.users[u]&&vm.users[u].g[0]===g; });
    if(!vm.users[u]) return {lines:[C('groups: \''+u+'\': no such user','err')], code:1};
    return {lines:[u+' : '+gs.join(' ')], code:0}; }
  return {lines:['root : root sudo wheel'], code:0};
};
CMDS['useradd']=function(vm,args){
  var opts={groups:[]}, i=0, name=null;
  for(;i<args.length;i++){ var a=args[i];
    if(a==='-m'||a==='--create-home'){ opts.mkhome=true; continue; }
    if(a==='-G'){ opts.groups=args[++i].split(','); continue; }
    if(a.indexOf('-G')===0){ opts.groups=a.slice(2).split(','); continue; }
    if(a==='-g'){ opts.group=args[++i]; continue; }
    if(a==='-s'){ opts.shell=args[++i]; continue; }
    if(a==='-d'){ opts.home=args[++i]; continue; }
    if(a==='-c'||a==='-u'||a==='--shell'){ args[++i]; continue; }
    if(a[0]==='-') continue;
    name=a;
  }
  if(!name) return {lines:[C('useradd: 缺少用户名','err')], code:1};
  var r=vm.addUser(name,opts);
  if(!r.ok) return {lines:[C('useradd: '+r.err,'err')], code:1};
  return {lines:[], code:0};
};
CMDS['adduser']=CMDS['useradd'];
CMDS['groupadd']=function(vm,args){
  var name=args[0];
  if(!name) return {lines:[C('groupadd: 缺少组名','err')], code:1};
  var r=vm.addGroup(name);
  if(!r.ok) return {lines:[C('groupadd: '+r.err,'err')], code:1};
  return {lines:[], code:0};
};
CMDS['usermod']=function(vm,args){
  var add=[], name=null;
  for(var i=0;i<args.length;i++){ var a=args[i];
    if(a==='-aG'||a==='-a'&&args[i+1]&&args[i+1][0]==='-'&&false){ add=(args[++i]||'').split(','); continue; }
    if(a==='-aG'){ add=(args[++i]||'').split(','); continue; }
    if(a==='-G'){ add=(args[++i]||'').split(','); continue; }
    if(a==='-g'){ args[++i]; continue; }
    if(a==='-s'||a==='-d'){ args[++i]; continue; }
    if(a[0]==='-') continue;
    name=a;
  }
  if(!name||!add.length) return {lines:[C('usermod: 用法: usermod -aG 组名 用户名','err')], code:1};
  var r=vm.userMod(name,{addGroups:add});
  if(!r.ok) return {lines:[C('usermod: '+r.err,'err')], code:1};
  return {lines:[], code:0};
};
CMDS['chpasswd']=function(vm,args,cc){
  var lines=(cc.stdin||[]).map(textOf), n=0;
  for(var i=0;i<lines.length;i++){
    var m=lines[i].match(/^([\w-]+):(.*)$/);
    if(!m) continue;
    if(!vm.users[m[1]]) return {lines:[C('chpasswd: 用户不存在: '+m[1],'err')], code:1};
    vm.users[m[1]].pw=m[2]; n++;
  }
  if(!cc.stdin) return {lines:[C('chpasswd: 请用管道输入，如: echo \'stu01:Passw0rd\' | chpasswd','hint')], code:1};
  return {lines:[], code:0};
};
CMDS['passwd']=function(vm,args){
  return {lines:[C('（交互式密码输入在模拟器中不可用，请用: echo \'user:密码\' | chpasswd）','hint')], code:0};
};
CMDS['env']=function(vm){
  var lines=[]; for(var k in vm.env) lines.push(k+'='+vm.env[k]);
  return {lines:lines, code:0};
};
CMDS['export']=function(vm,args){
  for(var i=0;i<args.length;i++){ var eq=args[i].indexOf('='); if(eq>0) vm.env[args[i].slice(0,eq)]=args[i].slice(eq+1); }
  return {lines:[], code:0};
};
CMDS['printenv']=function(vm,args){
  if(args.length){ return {lines:[vm.env[args[0]]||''], code:0}; }
  return CMDS['env'](vm,args);
};
CMDS['which']=function(vm,args){
  var map={nginx:'nginx',mysql:'mariadb-server',mariadb:'mariadb-server',mysqldump:'mariadb-server',mysqladmin:'mariadb-server',
    docker:'docker.io',dnsmasq:'dnsmasq',haproxy:'haproxy',ufw:'ufw','firewall-cmd':'firewalld',
    'ansible-playbook':'ansible-core',ansible:'ansible-core',ldapadd:'slapd',ldapsearch:'slapd',slapd:'slapd',
    dig:'dnsmasq',python3:'python3',curl:'curl'};
  var lines=[], err=0;
  for(var i=0;i<args.length;i++){
    var c=args[i], pkg=map[c];
    var ok=(!pkg)||vm.pkgs[pkg];
    if(ok){
      var path = ['docker','mysql','mariadb','mysqldump','ldapadd','ldapsearch','ansible-playbook','dig','firewall-cmd'].indexOf(c)>=0?'/usr/bin/':'/usr/sbin/';
      lines.push(path+c);
    } else { lines.push(C('which: no '+c+' in (/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin)','err')); err=1; }
  }
  return {lines:lines, code:err};
};
CMDS['uname']=function(vm,args){
  var a=args.join('');
  if(a.indexOf('a')>=0) return {lines:['Linux '+vm.hostname+' 6.8.0-41-generic #41-Ubuntu SMP PREEMPT_DYNAMIC Fri Aug 30 12:02:04 UTC 2025 aarch64 aarch64 aarch64 GNU/Linux'], code:0};
  if(a.indexOf('r')>=0) return {lines:['6.8.0-41-generic'], code:0};
  if(a.indexOf('m')>=0) return {lines:['aarch64'], code:0};
  return {lines:['Linux'], code:0};
};
CMDS['uptime']=function(vm){ return {lines:[' 10:30:05 up 1 day,  2:11,  1 user,  load average: 0.02, 0.05, 0.01'], code:0}; };
CMDS['free']=function(){ return {lines:['               total        used        free      shared  buff/cache   available','Mem:           3.8Gi       512Mi       3.0Gi        12Mi       384Mi       3.2Gi','Swap:          2.0Gi          0B       2.0Gi'], code:0}; };
CMDS['sleep']=function(){ return {lines:[C('（模拟器跳过等待）','dim')], code:0}; };
CMDS['reboot']=function(){ return {lines:[C('（模拟器里不用重启机器——比赛中重启服务才是正解: systemctl restart 服务名）','hint')], code:0}; };
CMDS['shutdown']=CMDS['reboot'];
CMDS['exit']=function(){ return {lines:[], code:0, exit:true}; };
CMDS['help']=function(){
  var lines=['📖 模拟实训终端 · 内置命令'];
  lines.push('文件： ls cd pwd cat nano echo mkdir rm cp mv touch chmod chown stat find du df grep sed head tail wc sort uniq cut truncate tar');
  lines.push('系统： systemctl journalctl apt dpkg hostnamectl timedatectl useradd groupadd usermod chpasswd id crontab logrotate');
  lines.push('网络： ip ss ping curl wget dig nslookup getent ufw firewall-cmd');
  lines.push('服务： nginx -t | mysql | mysqldump | docker | ansible-playbook | ldapadd | ldapsearch | openssl | ssh-keygen');
  lines.push('实训： lab check（评分）· lab hint（提示）· lab status · lab reset（重置）');
  lines.push(C('💡 编辑配置文件：直接输入  nano 路径（或在任务面板点「文件」）','hint'));
  return {lines:lines, code:0};
};
root.LabEngine.CMDS=CMDS;
root.LabEngine.execLine=execLine;
root.LabEngine.tokenize=tokenize;

/* ---- 服务与系统管理 ---- */
function notFound(name){ return {lines:[C('bash: '+name+': command not found','err')], code:127}; }
function dateStamp(){
  var d=new Date();
  var mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  return mo+' '+String(d.getDate()).padStart(2,' ')+' '+pad(d.getHours(),2)+':'+pad(d.getMinutes(),2)+':'+pad(d.getSeconds(),2);
}
CMDS['apt']=function(vm,args){ return aptDo(vm,args,'apt'); };
CMDS['apt-get']=function(vm,args){ return aptDo(vm,args,'apt-get'); };
function aptDo(vm,args,label){
  var sub=args[0], pkgs=args.slice(1).filter(function(a){return a[0]!=='-';});
  var lines=[];
  if(sub==='update'){
    lines.push('Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease');
    lines.push('Hit:2 http://archive.ubuntu.com/ubuntu noble-updates InRelease');
    lines.push('Reading package lists... Done');
    lines.push('Building dependency tree... Done');
    lines.push('All packages are up to date.');
    return {lines:lines, code:0};
  }
  if(sub==='install'){
    if(!pkgs.length) return {lines:[C('apt: 请指定包名，如: apt install nginx','hint')], code:1};
    lines.push('Reading package lists... Done');
    lines.push('Building dependency tree... Done');
    var toInstall=[], notfound=[];
    for(var i=0;i<pkgs.length;i++){
      if(vm.pkgs[pkgs[i]]) continue;
      if(!CATALOG[pkgs[i]]){ notfound.push(pkgs[i]); continue; }
      toInstall.push(pkgs[i]);
    }
    for(var n=0;n<notfound.length;n++) lines.push(C("E: Unable to locate package "+notfound[n],'err'));
    if(toInstall.length){
      lines.push('The following NEW packages will be installed:');
      lines.push('  '+toInstall.join(' '));
      lines.push('0 upgraded, '+toInstall.length+' newly installed, 0 to remove and 0 not upgraded.');
      lines.push('Need to get 0 B/'+(toInstall.length)+',024 kB of archives.');
      for(var t=0;t<toInstall.length;t++){
        var r=pkgInstall(vm,toInstall[t]);
        lines.push('Setting up '+toInstall[t]+' ('+CATALOG[toInstall[t]].v+') ...');
      }
      lines.push(C('✓ 安装完成（默认配置文件已生成，可直接开始配置）','ok'));
    } else if(!notfound.length){
      for(var q=0;q<pkgs.length;q++) lines.push(pkgs[q]+' is already the newest version ('+((vm.pkgs[pkgs[q]]||{}).v||'')+').');
      lines.push('0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.');
    }
    return {lines:lines, code:notfound.length?100:0};
  }
  if(sub==='remove'||sub==='purge'){
    for(var r2=0;r2<pkgs.length;r2++){
      if(!vm.pkgs[pkgs[r2]]){ lines.push(C('E: 未安装: '+pkgs[r2],'err')); continue; }
      pkgRemove(vm,pkgs[r2],sub==='purge');
      lines.push('Removing '+pkgs[r2]+' ...');
    }
    return {lines:lines, code:0};
  }
  if(sub==='list'){ return {lines:Object.keys(vm.pkgs).map(function(k){return k+'/'+((vm.pkgs[k]||{}).v||'base')+' now';}), code:0}; }
  if(sub==='autoremove'){ return {lines:['0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.'], code:0}; }
  return {lines:[C('apt: 未知子命令 '+sub+'（模拟器支持 update/install/remove/list）','err')], code:1};
}
CMDS['dpkg']=function(vm,args){
  if(args[0]==='-l'){
    var name=args[1];
    var lines=['Desired=Unknown/Install/Remove/Purge/Hold','||/ Name           Version        Description','+++-==============-==============-============'];
    for(var k in vm.pkgs){ if(name&&k.indexOf(name)<0) continue;
      lines.push('ii  '+k.padEnd(14)+' '+(((vm.pkgs[k]||{}).v)||'1.0').padEnd(14)+' installed'); }
    return {lines:lines, code:0};
  }
  return {lines:[C('dpkg: 模拟器仅支持 dpkg -l','hint')], code:0};
};
CMDS['systemctl']=function(vm,args){
  var sub=args[0], name=(args[1]||'').replace(/\.service$/,'');
  var known=SVCINFO;
  function noUnit(){ return {lines:[C('Unit '+name+'.service could not be found.','err')], code:4}; }
  if(sub==='daemon-reload'){ return {lines:[], code:0}; }
  if(sub==='list-units'){
    var lines=['UNIT                 LOAD   ACTIVE   SUB     DESCRIPTION'];
    for(var k in vm.svcs){ if(!vm.svcs[k].installed) continue;
      var st=vm.svcs[k].running?'active':'inactive';
      lines.push((k+'.service').padEnd(20)+' loaded '+st.padEnd(8)+(vm.svcs[k].running?'running':'dead').padEnd(7)+' '+((known[k]||{}).desc||'')); }
    return {lines:lines, code:0};
  }
  if(!sub||!name||!known[name]) return noUnit();
  var s=vm.svc(name,true);
  if(!s.installed) return noUnit();
  if(sub==='start') return svcStart(vm,name);
  if(sub==='stop') return svcStop(vm,name);
  if(sub==='restart') return svcRestart(vm,name,false);
  if(sub==='reload') return svcRestart(vm,name,true);
  if(sub==='enable'||sub==='disable'){
    s.enabled=(sub==='enable');
    if(sub==='enable') return {lines:['Created symlink /etc/systemd/system/multi-user.target.wants/'+name+'.service → /lib/systemd/system/'+name+'.service.'], code:0};
    return {lines:['Removed "/etc/systemd/system/multi-user.target.wants/'+name+'.service".'], code:0};
  }
  if(sub==='status'){ var l=svcStatusText(vm,name); if(!vm.svcs[name].running){ l.push(''); l.push(C('（用 systemctl start '+name+' 启动它）','hint')); } return {lines:l, code:vm.svcs[name].running?0:3}; }
  if(sub==='is-active'){ return {lines:[s.running?'active':'inactive'], code:s.running?0:3}; }
  if(sub==='is-enabled'){ return {lines:[s.enabled?'enabled':'disabled'], code:s.enabled?0:1}; }
  return {lines:[C('systemctl: 模拟器支持 start/stop/restart/reload/enable/disable/status/is-active/is-enabled','hint')], code:1};
};
CMDS['service']=function(vm,args){
  var name=args[0], act=args[1];
  if(!name) return {lines:[C('service: 用法: service 名称 start|stop|restart|status','err')], code:1};
  return CMDS['systemctl'](vm,[act||'status', name]);
};
CMDS['journalctl']=function(vm,args){
  var u=null, n=10, lines=[];
  for(var i=0;i<args.length;i++){ var a=args[i];
    if(a==='-u'||a==='--unit'){ u=args[++i]; continue; }
    if(a==='-n'||a==='--lines'){ n=parseInt(args[++i],10)||10; continue; }
    if(a==='--no-pager'||a==='-xe'||a==='-x') continue;
  }
  var es=vm.journalOf(u? u.replace(/\.service$/,''):null, n);
  if(u&&!es.length) return {lines:[C('-- No entries for '+u+' --','dim')], code:0};
  for(var j=0;j<es.length;j++){ var e=es[j];
    lines.push(dateStamp()+' '+vm.hostname+' '+e.svc+'[812]: '+e.msg);
  }
  if(!u){ lines.push(C('-- 提示: journalctl -u nginx 查看某个服务的日志','dim')); }
  return {lines:lines, code:0};
};
CMDS['logrotate']=function(vm,args){
  var f=null, dbg=false;
  for(var i=0;i<args.length;i++){ if(args[i]==='-d'||args[i]==='--debug'){ dbg=true; continue; } f=args[i]; }
  if(!f) return {lines:[C('logrotate: 用法: logrotate -d /etc/logrotate.d/配置名','err')], code:1};
  var c=vm.read(f);
  if(c===null) return {lines:[C("error: cannot stat '"+f+"': No such file or directory",'err')], code:1};
  var lines=['reading config file '+f];
  var pm=c.match(/^(\/\S+)/m), dm=/^\s*daily/m.test(c), rm=c.match(/rotate\s+(\d+)/);
  if(!pm) { lines.push(C('error: '+f+':1 lines must begin with a path','err')); return {lines:lines, code:1}; }
  lines.push('Reading state from file');
  lines.push('Handling 1 logs');
  lines.push('rotating pattern: '+pm[1]+' '+(dm?'after 1 days (':'(')+(rm?rm[1]:'4')+' rotations)');
  lines.push('empty log files are rotated, old logs are removed');
  lines.push('considering log '+pm[1].replace('*','app')+'.log');
  return {lines:lines, code:0};
};

/* ---- 网络 ---- */
function listenEntries(vm){
  var out=[]; /* {port, proc, pid, family} */
  var ss=vm.svcs;
  if(ss['sshd']&&ss['sshd'].running) out.push({port:sshdPort(vm), proc:'sshd', pid:812});
  if(ss['nginx']&&ss['nginx'].running&&ss['nginx'].rt){
    var seen={};
    for(var i=0;i<ss['nginx'].rt.servers.length;i++){ var ls=ss['nginx'].rt.servers[i].listens;
      for(var j=0;j<ls.length;j++){ if(!seen[ls[j].port]){ seen[ls[j].port]=1; out.push({port:ls[j].port, proc:'nginx', pid:901}); } } }
  }
  if(ss['dnsmasq']&&ss['dnsmasq'].running) out.push({port:53, proc:'dnsmasq', pid:844});
  if(ss['mariadb']&&ss['mariadb'].running) out.push({port:3306, proc:'mariadbd', pid:1002});
  if(ss['haproxy']&&ss['haproxy'].running&&ss['haproxy'].rt){
    for(var f=0;f<ss['haproxy'].rt.frontends.length;f++){ var b=ss['haproxy'].rt.frontends[f].bind; if(b) out.push({port:b, proc:'haproxy', pid:1100}); }
  }
  if(ss['pyhttp']&&ss['pyhttp'].running) out.push({port:ss['pyhttp'].port, proc:'python3', pid:1234});
  for(var k in vm.docker.containers){ var c=vm.docker.containers[k];
    if(!c.running) continue;
    for(var p=0;p<(c.ports||[]).length;p++) out.push({port:c.ports[p].h, proc:'docker-proxy', pid:1410});
  }
  return out;
}
CMDS['ss']=function(vm,args){
  if(args.join('').indexOf('l')<0&&args.length&&!/^(ss)$/.test('ss')) { }
  var lines=['State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process'];
  var es=listenEntries(vm);
  for(var i=0;i<es.length;i++){
    lines.push('LISTEN 0      511          0.0.0.0:'+String(es[i].port).padEnd(11)+' 0.0.0.0:*     users:(("'+es[i].proc+'",pid='+es[i].pid+',fd=6))');
  }
  if(!es.length) lines.push(C('（没有监听端口）','dim'));
  return {lines:lines, code:0};
};
CMDS['netstat']=function(vm,args){
  var lines=['Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name'];
  var es=listenEntries(vm);
  for(var i=0;i<es.length;i++){
    lines.push('tcp        0      0 0.0.0.0:'+String(es[i].port).padEnd(23)+' 0.0.0.0:*               LISTEN      '+es[i].pid+'/'+es[i].proc);
  }
  return {lines:lines, code:0};
};
CMDS['ip']=function(vm,args){
  var lines=[];
  if(args[0]==='a'||args[0]==='addr'){
    lines.push('1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000');
    lines.push('    inet 127.0.0.1/8 scope host lo');
    lines.push('2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000');
    lines.push('    inet 192.168.1.10/24 brd 192.168.1.255 scope global eth0');
    return {lines:lines, code:0};
  }
  if(args[0]==='route'){ return {lines:['default via 192.168.1.1 dev eth0 proto dhcp src 192.168.1.10 metric 100','192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.10'], code:0}; }
  return {lines:[C('ip: 模拟器支持 ip a / ip route','hint')], code:0};
};
CMDS['ifconfig']=function(vm){
  return {lines:['eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500','        inet 192.168.1.10  netmask 255.255.255.0  broadcast 192.168.1.255','        ether 52:54:00:12:34:56  txqueuelen 1000  (Ethernet)','','lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536','        inet 127.0.0.1  netmask 255.0.0.0'], code:0};
};
CMDS['ping']=function(vm,args){
  var host=null; for(var i=0;i<args.length;i++) if(args[i][0]!=='-'){ host=args[i]; break; }
  if(!host) return {lines:[C('ping: usage error','err')], code:2};
  var r=resolveHost(vm,host);
  if(!r.ok) return {lines:[C('ping: '+host+': Name or service not known','err')], code:2};
  var lines=['PING '+host+' ('+r.ip+') 56(84) bytes of data.'];
  for(var s=1;s<=3;s++) lines.push('64 bytes from '+host+' ('+r.ip+'): icmp_seq='+s+' ttl=64 time=0.0'+(41+s*7)+' ms');
  lines.push(''); lines.push('--- '+host+' ping statistics ---');
  lines.push('3 packets transmitted, 3 received, 0% packet loss, time 2003ms');
  return {lines:lines, code:0};
};
CMDS['dig']=function(vm,args){
  var name=null, type='A', xip=null, short=false, server=null;
  for(var i=0;i<args.length;i++){
    var a=args[i];
    if(a==='-x'){ xip=args[++i]; continue; }
    if(a==='+short'){ short=true; continue; }
    if(a[0]==='+'||a[0]==='-') continue;
    if(a[0]==='@'){ server=a.slice(1); continue; }
    if(/^(A|AAAA|PTR|MX|TXT|CNAME|SOA|NS)$/i.test(a)){ type=a.toUpperCase(); continue; }
    name=a;
  }
  if(xip){ var p=xip.split('.'); name=p[3]+'.'+p[2]+'.'+p[1]+'.'+p[0]+'.in-addr.arpa'; type='PTR'; }
  if(!name) return {lines:[C('dig: 用法: dig 域名 / dig -x IP / dig +short 域名','hint')], code:1};
  var r=dnsLookup(vm, name, type);
  if(r.fail==='no-servers'){
    return {lines:[C(';; communications error to 127.0.0.1#53: connection refused','err'),
      C(';; communications error to 127.0.0.1#53: connection refused','err'),
      C(';; no servers could be reached','err'),
      C('💡 53 端口没有 DNS 服务在跑——先装好 dnsmasq 并 systemctl start dnsmasq','hint')], code:9};
  }
  if(short){ return {lines:r.status==='NOERROR'&&r.value?[r.value]:[], code:0}; }
  var lines=['; <<>> DiG 9.18.28 <<>> '+name+' '+type, ';; global options: +cmd',';; Got answer:',
    ';; ->>HEADER<<- opcode: QUERY, status: '+r.status+', id: 34521',
    r.status==='NOERROR'? ';; flags: qr aa rd ra; QUERY: 1, ANSWER: '+((r.value)?1:0)+', AUTHORITY: 0, ADDITIONAL: 1':';; flags: qr aa rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 1, ADDITIONAL: 1',
    '',';; QUESTION SECTION:', ';'+name+'.\t\tIN\t'+type, ''];
  if(r.status==='NOERROR'&&r.value){
    lines.push(';; ANSWER SECTION:', name+'.\t0\tIN\t'+type+'\t'+r.value, '');
  }
  if(r.status==='NXDOMAIN'){
    lines.push(';; AUTHORITY SECTION:', 'corp.local.\t0\tIN\tSOA\tlocalhost. root.localhost. 2 604800 86400 2419200 604800','');
  }
  lines.push(';; Query time: 0 msec',';; SERVER: 127.0.0.1#53(127.0.0.1) (UDP)');
  lines.push(';; WHEN: '+dateStamp());
  lines.push(';; MSG SIZE  rcvd: '+(r.value?86:100));
  return {lines:lines, code:0};
};
CMDS['nslookup']=function(vm,args){
  var name=args[args.length-1];
  var r=dnsLookup(vm, name, 'A');
  if(r.fail==='no-servers') return {lines:[C(';; connection timed out; no servers could be reached','err'),C('💡 先启动 dnsmasq','hint')], code:1};
  if(r.status==='NOERROR'&&r.value) return {lines:['Server:\t\t127.0.0.1','Address:\t127.0.0.1#53','','Name:\t'+name,'Address:\t'+r.value], code:0};
  return {lines:['Server:\t\t127.0.0.1','Address:\t127.0.0.1#53','','** server can\'t find '+name+': NXDOMAIN'], code:1};
};
CMDS['getent']=function(vm,args){
  var key=args[args.length-1];
  var r=resolveHost(vm,key);
  if(!r.ok) return {lines:[], code:2};
  return {lines:[r.ip+'  '+key], code:0};
};
CMDS['host']=function(vm,args){ return CMDS['getent'](vm,args); };

function curlOut(vm, r, opts){
  /* 生成 curl 的展示输出 */
  var out=[];
  var statusLine='HTTP/1.1 '+r.status+' '+({200:'OK',301:'Moved Permanently',302:'Found',403:'Forbidden',404:'Not Found',500:'Internal Server Error',502:'Bad Gateway',503:'Service Unavailable',508:'Loop Detected'}[r.status]||'');
  if(opts.verbose){ out.push(C('> '+(opts.method||'GET')+' '+opts.path+' HTTP/1.1','dim')); out.push(C('> Host: '+opts.host,'dim')); }
  if(opts.includeHeaders||opts.headOnly){
    out.push(statusLine);
    var hs=r.headers||{};
    out.push('Server: '+hs['Server']);
    out.push('Date: '+new Date().toUTCString());
    for(var k in hs){ if(k==='Server'||k==='Content-Length') continue; out.push(k+': '+hs[k]); }
    out.push('Content-Length: '+hs['Content-Length']);
    out.push('Connection: keep-alive');
    out.push('');
  }
  if(!opts.headOnly){ var bl=(r.body||'').replace(/\n$/,'').split('\n'); if(bl.length===1&&bl[0]==='') bl=[]; out=out.concat(bl); }
  return out;
}
CMDS['curl']=function(vm,args){
  var opts={silent:false, insecure:false, includeHeaders:false, headOnly:false, follow:false, output:null, headers:{}, method:null, data:null, verbose:false, writeOut:null};
  var url=null;
  for(var i=0;i<args.length;i++){
    var a=args[i];
    if(a==='-s'||a==='--silent'){ opts.silent=true; continue; }
    if(a==='-k'||a==='--insecure'){ opts.insecure=true; continue; }
    if(a==='-i'||a==='--include'){ opts.includeHeaders=true; continue; }
    if(a==='-I'||a==='--head'){ opts.headOnly=true; continue; }
    if(a==='-L'||a==='--location'){ opts.follow=true; continue; }
    if(a==='-o'||a==='--output'){ opts.output=args[++i]; continue; }
    if(a==='-H'||a==='--header'){ var hv=args[++i]||''; var ci=hv.indexOf(':'); if(ci>0) opts.headers[hv.slice(0,ci).trim()]=hv.slice(ci+1).trim(); continue; }
    if(a==='-X'||a==='--request'){ opts.method=args[++i]; continue; }
    if(a==='-d'||a==='--data'||a==='--data-raw'){ opts.data=args[++i]; opts.method=opts.method||'POST'; continue; }
    if(a==='-u'||a==='--user'){ args[++i]; continue; }
    if(a==='-w'||a==='--write-out'){ opts.writeOut=args[++i]; continue; }
    if(a==='-v'||a==='--verbose'){ opts.verbose=true; continue; }
    if(a==='-m'||a==='--max-time'){ args[++i]; continue; }
    if(a==='--connect-timeout'){ args[++i]; continue; }
    if(a==='-f'||a==='--fail'||a==='-O'||a==='-J') continue;
    if(a[0]==='-') continue;
    url=a;
  }
  if(!url) return {lines:[C('curl: try \'curl --help\'.（模拟器用法: curl [-k] [-i] [-H "Host: x"] http://地址[:端口]/路径）','hint')], code:2};
  var m=url.match(/^(https?):\/\/([^\/:]+)(?::(\d+))?(\/.*)?$/);
  if(!m) return {lines:[C('curl: (3) URL rejected: Malformed input','err')], code:3};
  var ssl=m[1]==='https', host=m[2], port=m[3]?parseInt(m[3],10):(ssl?443:80), path=m[4]||'/';
  var reqHeaders=Object.assign({}, opts.headers);
  if(!reqHeaders['Host']&&!reqHeaders['host']) reqHeaders['Host']=m[2];
  var lines=[], code=0, hops=0, r=null;
  while(true){
    r=dispatchHttp(vm,{host:host, port:port, path:path, ssl:ssl, method:opts.method||(opts.headOnly?'HEAD':'GET'), headers:reqHeaders, _depth:0});
    if(r.dnsfail){
      lines.push(C('curl: (6) Could not resolve host: '+host,'err'));
      return {lines:lines, code:6};
    }
    if(r.refused){
      lines.push(C('curl: (7) Failed to connect to '+host+' port '+port+' after 0 ms: Couldn\'t connect to server','err'));
      if(port!==80&&port!==443&&!opts._hinted){ lines.push(C('💡 端口 '+port+' 上没有任何服务在监听——查一下: ss -tlnp','hint')); }
      return {lines:lines, code:7};
    }
    if(ssl&&!opts.insecure){
      lines.push(C('curl: (60) SSL certificate problem: self-signed certificate','err'));
      lines.push(C('curl failed to verify the legitimacy of the server and therefore could not','err'));
      lines.push(C('establish a secure connection to it. To learn more about this situation and','err'));
      lines.push(C('how to fix it, please visit the web page mentioned above.','err'));
      lines.push(C('💡 自签发证书测试时加 -k 跳过校验（curl -k https://...）','hint'));
      return {lines:lines, code:60};
    }
    if(opts.follow&&r.status>=300&&r.status<400&&r.headers&&r.headers['Location']&&hops<5){
      var loc=r.headers['Location'];
      hops++;
      if(loc.indexOf('http')===0){ var m2=loc.match(/^(https?):\/\/([^\/:]+)(?::(\d+))?(\/.*)?$/); ssl=m2[1]==='https'; host=m2[2]; port=m2[3]?parseInt(m2[3],10):(ssl?443:80); path=m2[4]||'/'; }
      else path=loc;
      continue;
    }
    break;
  }
  if(opts.output){
    vm.write(opts.output, r.body||'');
    if(!opts.silent) lines.push(C('（已保存到 '+opts.output+'，'+(r.body||'').length+' 字节）','dim'));
  } else {
    lines=lines.concat(curlOut(vm, r, {verbose:opts.verbose, includeHeaders:opts.includeHeaders, headOnly:opts.headOnly, method:opts.method, host:host, path:path}));
  }
  if(opts.writeOut){
    var wo=opts.writeOut.replace(/%\{http_code\}/g,String(r.status)).replace(/%\{size_download\}/g,String((r.body||'').length))
      .replace(/%\{content_type\}/g,(r.headers||{})['Content-Type']||'').replace(/%\{time_total\}/g,'0.001')
      .replace(/\\n/g,'\n');
    lines=lines.concat(wo.split('\n'));
  }
  return {lines:lines, code:r.status>=400&&opts.fail?22:0};
};
CMDS['wget']=function(vm,args){
  var url=null, out=null, quiet=false;
  for(var i=0;i<args.length;i++){ var a=args[i];
    if(a==='-q'||a==='--quiet'){ quiet=true; continue; }
    if(a==='-O'||a==='--output-document'){ out=args[++i]; continue; }
    if(a[0]==='-') continue;
    url=a;
  }
  if(!url) return {lines:[C('wget: missing URL','err')], code:1};
  var m=url.match(/^(https?):\/\/([^\/:]+)(?::(\d+))?(\/.*)?$/);
  if(!m) return {lines:[C('wget: bad URL','err')], code:1};
  var ssl=m[1]==='https', host=m[2], port=m[3]?parseInt(m[3],10):(ssl?443:80), path=m[4]||'/';
  var r=dispatchHttp(vm,{host:host, port:port, path:path, ssl:ssl, method:'GET', headers:{Host:m[2]}, _depth:0});
  if(r.dnsfail) return {lines:[C('wget: unable to resolve host address \''+host+'\'','err')], code:4};
  if(r.refused) return {lines:[C('wget: unable to connect to remote host: Connection refused','err')], code:4};
  if(!out){ out=baseOf(path.split('?')[0])||'index.html'; }
  vm.write(out, r.body||'');
  var lines=[];
  if(!quiet){
    lines.push('--'+(new Date().toUTCString())+'--  '+url);
    lines.push('Resolving '+host+' ('+host+')... 127.0.0.1');
    lines.push('Connecting to '+host+' ('+host+')|:'+port+'... connected.');
    lines.push('HTTP request sent, awaiting response... 200 OK');
    lines.push('Length: '+(r.body||'').length+' (1.2K) [text/html]');
    lines.push('Saving to: \''+out+'\'');
    lines.push('');
    lines.push(''+out+'          100%[===================>]   1.20K  --.-KB/s    in 0s');
    lines.push('');
    lines.push(new Date().toISOString().slice(0,19).replace('T',' ')+' (1.2 MB/s) - \''+out+'\' saved ['+(r.body||'').length+'/1]');
  }
  return {lines:lines, code:0};
};
CMDS['ufw']=function(vm,args){
  var sub=args[0];
  var fw=vm.fw; if(!fw.tool) fw.tool='ufw';
  var svcPort={'ssh':22,'http':80,'https':443,'dns':53,'mysql':3306,'smtp':25};
  function addRule(spec, action){
    var port=null, proto='tcp';
    if(svcPort[spec]!==undefined) port=svcPort[spec];
    else { var m=String(spec).match(/^(\d+)(?:\/(tcp|udp))?$/); if(m){ port=parseInt(m[1],10); proto=m[2]||'tcp'; } }
    if(spec==='Nginx Full'){ addRule('80','allow'); addRule('443','allow'); return {lines:[], code:0}; }
    if(port===null) return {lines:[C('ERROR: 无法识别的规则: '+spec,'err')], code:1};
    fw.rules=fw.rules.filter(function(r){ return r.port!==port; });
    fw.rules.push({port:port, proto:proto, action:action});
    return {lines:[], code:0};
  }
  if(sub==='allow'||sub==='deny'||sub==='limit'){
    var action=sub==='allow'?'ALLOW':(sub==='deny'?'DENY':'LIMIT');
    var r=addRule(args[1], action);
    if(r.code) return r;
    var changed=fw.active;
    if(changed) fw.dirty=true;
    return {lines:[], code:0};
  }
  if(sub==='delete'){
    var target=args[1], idx=parseInt(target,10);
    if(!isNaN(idx)&&String(idx)===target&&fw.rules[idx-1]){ fw.rules.splice(idx-1,1); return {lines:[], code:0}; }
    var m2=String(target).match(/^(\d+)/);
    if(m2){ fw.rules=fw.rules.filter(function(r){ return r.port!==parseInt(m2[1],10); }); return {lines:[], code:0}; }
    return {lines:[C('ERROR: 规则不存在','err')], code:1};
  }
  if(sub==='enable'){
    fw.active=true;
    var lines=['Firewall is active and enabled on system startup'];
    if(!fw.rules.filter(function(r){return r.port===22&&r.action==='ALLOW';}).length)
      lines.push(C('⚠ 注意：22 端口没有放行——真机上你就把自己 SSH 锁门外了（比赛经典翻车点）','hint'));
    return {lines:lines, code:0};
  }
  if(sub==='disable'){ fw.active=false; return {lines:['Firewall stopped and disabled on system startup'], code:0}; }
  if(sub==='reset'){ fw.active=false; fw.rules=[]; return {lines:['Resetting all rules to installed defaults.'], code:0}; }
  if(sub==='status'){
    if(!fw.active) return {lines:['Status: inactive'], code:0};
    var numbered=args[1]==='numbered'||args[1]==='verbose';
    var lines2=['Status: active','','To                         Action      From','--                         ------      ----'];
    for(var i=0;i<fw.rules.length;i++){
      var rr=fw.rules[i];
      var to=String(rr.port)+'/'+rr.proto;
      var act=rr.action;
      var from='Anywhere';
      if(rr.action==='ALLOW') act='ALLOW';
      lines2.push((numbered?String(i+1).padStart(2)+' ':'')+to.padEnd(27)+act.padEnd(12)+from);
    }
    lines2.push('');
    lines2.push('（可再用 ufw status verbose 查看默认策略）');
    return {lines:lines2, code:0};
  }
  return {lines:[C('ufw: 支持 allow/deny/delete/status/enable/disable/reset','hint')], code:1};
};
CMDS['firewall-cmd']=function(vm,args){
  var fw=vm.fw; fw.tool='firewalld';
  fw.fc=fw.fc||{ports:[], services:[], active:false};
  var perm=false, k=null;
  for(var i=0;i<args.length;i++){ var a=args[i];
    if(a==='--permanent'){ perm=true; continue; }
    if(a==='--reload'){ fw.fc.active=true; return {lines:['success'], code:0}; }
    if(a==='--state'){ return {lines:[fw.fc.active?'running':'not running'], code:0}; }
    if(a==='--list-all'){
      if(!fw.fc.active) return {lines:[C('FirewallD is not running','err')], code:1};
      return {lines:['public (active)','  target: default','  interfaces: eth0','  services: '+fw.fc.services.join(' '),'  ports: '+fw.fc.ports.join(' '),'  masquerade: no'], code:0};
    }
    var mp=a.match(/^--add-port=(\d+)\/(tcp|udp)$/); if(mp){ fw.fc.ports.push(mp[1]+'/'+mp[2]); return {lines:['success'], code:0}; }
    var mr=a.match(/^--remove-port=/); if(mr){ fw.fc.ports=[]; return {lines:['success'], code:0}; }
    var ms=a.match(/^--add-service=(\w+)$/); if(ms){ fw.fc.services.push(ms[1]); return {lines:['success'], code:0}; }
    if(/^--remove-service=/.test(a)){ fw.fc.services=[]; return {lines:['success'], code:0}; }
    if(a==='--list-ports') return {lines:[fw.fc.ports.join(' ')], code:0};
    if(a==='--list-services') return {lines:[fw.fc.services.join(' ')], code:0};
  }
  return {lines:[C('firewall-cmd: 支持 --add-port/--add-service/--reload/--list-all/--state/--permanent','hint')], code:0};
};
CMDS['iptables']=function(vm,args){
  return {lines:[C('（模拟器：直接 iptables 不模拟；请用 ufw 或 firewall-cmd，它们才是机房/比赛的常规武器）','hint')], code:0};
};
CMDS['lab']=function(vm,args){
  var scn=vm.scenario;
  var sub=args[0]||'check';
  if(!scn) return {lines:[C('（当前不在实训任务里——从实战中心进入「模拟实训室」后再用 lab 命令）','hint')], code:0};
  if(sub==='check'){
    var g=root.LabEngine.grade(vm, scn);
    var lines=[C('📊 评分：'+scn.title+' —— '+g.got+' / '+g.total+'（'+g.pct+'%）', g.pct>=80?'ok':'err')];
    for(var i=0;i<g.items.length;i++){
      var it=g.items[i];
      lines.push((it.ok?C('  ✅ ','ok'):C('  ❌ ','err'))); /* placeholder replaced below */
      lines.pop();
      lines.push(C('  '+(it.ok?'✅ ':'❌ ')+it.d+'  ('+(it.ok?it.p:0)+'/'+it.p+')', it.ok?'ok':'err'));
    }
    if(g.pct===100) lines.push(C('🏆 满分！去点一下「评分」按钮领奖励。','ok'));
    return {lines:lines, code:0};
  }
  if(sub==='hint'){
    var hs=scn.hints||[];
    for(var h=0;h<hs.length;h++) lines.push(C('💡 提示'+(h+1)+'：'+hs[h],'hint'));
    if(!hs.length) lines.push(C('（这个任务没有提示，靠你啦）','dim'));
    return {lines:lines, code:0};
  }
  if(sub==='status'){
    return {lines:['任务：'+scn.title,'模块：'+(scn.mod||'-'),'预计耗时：'+(scn.min||'?')+' 分钟',
      '验收点：'+scn.checks.length+' 个'], code:0};
  }
  if(sub==='reset'){ vm._resetRequest=true; return {lines:[C('↺ 将在退出终端时重置环境（或点右上角「重开」）','hint')], code:0}; }
  return {lines:[C('lab: 支持 check / hint / status / reset','hint')], code:0};
};

/* ---- 数据库 ---- */
function mysqlAuth(vm, args){
  var user='root', pw=null, pwGiven=false, host='localhost', dbname=null, sql=null;
  for(var i=0;i<args.length;i++){ var a=args[i];
    if(a==='-u'){ user=args[++i]; continue; }
    if(a==='-p'){ pwGiven=true; if(args[i+1]&&args[i+1][0]!=='-'&&args[i].length===2){ pw=args[++i]; } continue; }
    if(a.indexOf('-p')===0&&a.length>2){ pwGiven=true; pw=a.slice(2); continue; }
    if(a==='--password'){ pwGiven=true; pw=args[++i]; continue; }
    if(a==='-h'){ host=args[++i]; continue; }
    if(a==='-e'||a==='--execute'){ sql=args[++i]; continue; }
    if(a==='-P'||a==='-S'||a==='--socket'){ args[++i]; continue; }
    if(a==='-D'||a==='--database'){ dbname=args[++i]; continue; }
    if(a[0]==='-') continue;
    if(dbname===null){ dbname=a; }
  }
  return {user:user, pw:pw, pwGiven:pwGiven, host:host, dbname:dbname, sql:sql};
}
CMDS['mysql']=function(vm,args,cc){
  if(!vm.pkgs['mariadb-server']&&!vm.pkgs['mariadb-client']) return notFound('mysql');
  var s=vm.svcs['mariadb'];
  if(!s||!s.running) return {lines:[C("ERROR 2002 (HY000): Can't connect to local server through socket '/run/mysqld/mysqld.sock' (2)","err"),C('💡 MariaDB 没在运行——systemctl start mariadb','hint')], code:1};
  var au=mysqlAuth(vm,args);
  if(au.host!=='localhost'&&au.host!=='127.0.0.1') return {lines:[C('ERROR 2003 (HY000): Can\'t connect to MySQL server on \''+au.host+'\' (111)','err')], code:1};
  if(au.user!=='root'){
    var u=vm.sql.u[au.user];
    if(!u) return {lines:[C("ERROR 1045 (28000): Access denied for user '"+au.user+"'@'localhost' (using password: "+(au.pwGiven?'YES':'NO')+')','err')], code:1};
    if(u.pw){
      if(!au.pwGiven) return {lines:[C("ERROR 1045 (28000): Access denied for user '"+au.user+"'@'localhost' (using password: NO)","err"), C('💡 该用户有密码，请用 -p密码 形式（模拟器不支持交互式输入）','hint')], code:1};
      if(String(au.pw)!==String(u.pw)) return {lines:[C("ERROR 1045 (28000): Access denied for user '"+au.user+"'@'localhost' (using password: YES)","err")], code:1};
    }
  }
  var script = au.sql!==null?au.sql:(cc.stdin?cc.stdin.map(textOf).join('\n'):null);
  if(script===null) return {lines:[C('（模拟器不做交互式 mysql；请用: mysql -e "SQL语句" 或 管道输入）','hint')], code:1};
  var r=sqlRun(vm, script, au.user, au.dbname||null);
  var lines=r.lines.map(function(l){ return l; });
  return {lines:lines, code:r.code};
};
CMDS['mariadb']=CMDS['mysql'];
CMDS['mysqladmin']=function(vm,args){
  if(args[0]==='status') return {lines:['Uptime: 100  Threads: 1  Questions: 3  Slow queries: 0  Opens: 12  Flush tables: 1  Open tables: 0'], code:0};
  return {lines:[C('mysqladmin: 支持 status','hint')], code:0};
};
CMDS['mysqldump']=function(vm,args){
  if(!vm.pkgs['mariadb-server']) return notFound('mysqldump');
  var s=vm.svcs['mariadb'];
  if(!s||!s.running) return {lines:[C('mysqldump: Got error: 2002: Can\'t connect to local server','err')], code:1};
  var au=mysqlAuth(vm,args);
  var dbs=[], dbname=null;
  for(var i=0;i<args.length;i++){ if(args[i][0]!=='-'){ dbname=args[i]; break; } }
  if(!dbname) return {lines:[C('mysqldump: 用法: mysqldump [-u 用户] 库名 > 备份.sql','hint')], code:1};
  var db=vm.sql.dbs[dbname];
  if(!db){ return {lines:[C("mysqldump: Got error: 1049: Unknown database '"+dbname+"' when selecting the database","err")], code:1}; }
  if(au.user!=='root'&&!sqlAccess(vm,au.user,dbname,'SELECT')) return {lines:[C("mysqldump: Got error: 1044: Access denied for user '"+au.user+"'@'localhost' to database '"+dbname+"'","err")], code:1};
  var out=['-- MariaDB dump 10.19  Distrib 10.11.7-MariaDB, for debian-linux-gnu','--','-- Host: localhost    Database: '+dbname,'-- ------------------------------------------------------','-- Server version\t10.11.7-MariaDB','','/*!40101 SET NAMES utf8mb4 */;',''];
  var tbls=Object.keys(db.tables);
  for(var t=0;t<tbls.length;t++){
    var tb=db.tables[tbls[t]];
    out.push('DROP TABLE IF EXISTS `'+tbls[t]+'`;');
    out.push('CREATE TABLE `'+tbls[t]+'` (');
    out.push(tb.cols.map(function(c,i){ return '  `'+c+'` '+(i===0?'int(11)':'varchar(255)'); }).join(',\n'));
    out.push(');');
    for(var r2=0;r2<tb.rows.length;r2++){
      out.push('INSERT INTO `'+tbls[t]+'` VALUES ('+tb.rows[r2].map(function(v){ return typeof v==='number'?v:"'"+String(v).replace(/'/g,"''")+"'"; }).join(',')+');');
    }
    out.push('');
  }
  out.push('-- Dump completed on '+new Date().toISOString().slice(0,19).replace('T',' '));
  return {lines:out, code:0};
};

/* ---- 容器 ---- */
CMDS['docker']=function(vm,args){
  if(!vm.pkgs['docker.io']) return notFound('docker');
  var sub=args[0];
  var more=args.slice(1);
  if(sub==='version'&&!VM._silent){ return {lines:['Client: Docker Engine - Community',' Version:           26.1.4','Server: Docker Engine - Community',' Engine:','  Version:          26.1.4'], code:0}; }
  if(!dockerDaemonUp(vm)) return {lines:[C('Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?','err'),C('💡 先启动: systemctl start docker','hint')], code:1};
  if(sub==='run'){
    var r=dockerRun(vm, more);
    if(r.err) return {lines:[C(r.err,'err')], code:125};
    var lines=(r.lines||[]);
    if(r.lines&&!r.lines.length) return {lines:[], code:0};
    if(!r.lines||!r.lines.length) return {lines:[], code:0};
    return {lines:lines, code:0};
  }
  if(sub==='ps'){
    return {lines:dockerPs(vm, more.indexOf('-a')>=0||more.indexOf('--all')>=0), code:0};
  }
  if(sub==='images'){
    var lines2=['REPOSITORY   TAG       IMAGE ID       CREATED         SIZE'];
    for(var k in vm.docker.images){ lines2.push((k.split(':')[0]).padEnd(12)+' '+(vm.docker.images[k].tag||'latest').padEnd(9)+' '+Math.random().toString(16).slice(2,14).padEnd(14)+' 2 minutes ago   187MB'); }
    return {lines:lines2, code:0};
  }
  if(sub==='stop'||sub==='rm'){
    var names=more.filter(function(a){ return a[0]!=='-'; });
    var lines3=[];
    for(var i=0;i<names.length;i++){
      var c=vm.docker.containers[names[i]];
      if(!c){ lines3.push(C('Error response from daemon: No such container: '+names[i],'err')); continue; }
      if(sub==='stop'){ c.running=false; lines3.push(names[i]); }
      else { if(c.running) lines3.push(C('Error response from daemon: cannot remove a running container '+names[i]+' (stop it first, or use -f)','err')); else { delete vm.docker.containers[names[i]]; lines3.push(names[i]); } }
    }
    return {lines:lines3, code:0};
  }
  if(sub==='start'){ var ns=more.filter(function(a){return a[0]!=='-';}), l4=[];
    for(var j=0;j<ns.length;j++){ var c2=vm.docker.containers[ns[j]]; if(c2){ c2.running=true; l4.push(ns[j]); } else l4.push(C('No such container: '+ns[j],'err')); }
    return {lines:l4, code:0};
  }
  if(sub==='logs'){ var nm=more[0], c3=vm.docker.containers[nm];
    if(!c3) return {lines:[C('No such container: '+nm,'err')], code:1};
    return {lines:['/docker-entrypoint.sh: Configuration complete; ready for start up','nginx/1.24.0: 注意——容器内 nginx 已启动','172.17.0.1 - - [20/Sep/2026:10:30:01 +0000] "GET / HTTP/1.1" 200 615 "-" "curl/8.5.0"'], code:0};
  }
  if(sub==='pull'){ return {lines:dockerPull(vm,more[0]||'nginx'), code:0}; }
  if(sub==='volume'){
    if(more[0]==='create'){ vm.docker.volumes[more[1]]={name:more[1],path:'/var/lib/docker/volumes/'+more[1]+'/_data'}; return {lines:[more[1]], code:0}; }
    if(more[0]==='ls'){ var l5=[]; for(var v in vm.docker.volumes) l5.push(v); return {lines:l5, code:0}; }
  }
  return {lines:[C('docker: 模拟器支持 run/ps/images/stop/start/rm/logs/pull/volume','hint')], code:0};
};

/* ---- 自动化 / 目录 ---- */
CMDS['ansible-playbook']=function(vm,args){
  if(!vm.pkgs['ansible-core']) return notFound('ansible-playbook');
  var file=null;
  for(var i=0;i<args.length;i++){ if(args[i][0]!=='-'){ file=args[i]; break; } }
  if(!file) return {lines:[C('ansible-playbook: 用法: ansible-playbook 剧本.yml','err')], code:1};
  var c=vm.read(file);
  if(c===null) return {lines:[C('ERROR! the playbook: '+file+' could not be found','err')], code:1};
  return ansibleRun(vm, c);
};
CMDS['ansible']=CMDS['ansible-playbook'];
CMDS['ldapadd']=function(vm,args){
  if(!vm.pkgs['slapd']) return notFound('ldapadd');
  var s=vm.svcs['slapd'];
  if(!s||!s.running) return {lines:[C('ldap_sasl_bind(SIMPLE): Can\'t contact LDAP server (-1)','err'),C('💡 先启动: systemctl start slapd','hint')], code:1};
  var file=null;
  for(var i=0;i<args.length;i++){ if(args[i]==='-f'){ file=args[++i]; continue; } if(args[i]==='-D'||args[i]==='-w'||args[i]==='-H'||args[i]==='-x'){ if(args[i]!=='-x') args[++i]; continue; } }
  if(!file) return {lines:[C('ldapadd: 用法: ldapadd -x -D cn=admin,dc=... -w 密码 -f 文件.ldif','err')], code:1};
  var c=vm.read(file);
  if(c===null) return {lines:[C('ldapadd: cannot open file "'+file+'"','err')], code:1};
  return ldapAdd(vm, c);
};
CMDS['ldapsearch']=function(vm,args){
  if(!vm.pkgs['slapd']) return notFound('ldapsearch');
  var s=vm.svcs['slapd'];
  if(!s||!s.running) return {lines:[C('ldap_sasl_bind(SIMPLE): Can\'t contact LDAP server (-1)','err'),C('💡 先启动: systemctl start slapd','hint')], code:1};
  var base=null, filter=null;
  for(var i=0;i<args.length;i++){
    if(args[i]==='-b'){ base=args[++i]; continue; }
    if(args[i]==='-D'||args[i]==='-w'||args[i]==='-H'){ args[++i]; continue; }
    if(args[i]==='-x'||args[i][0]==='-') continue;
    if(filter===null) filter=args[i];
  }
  return ldapSearch(vm, base, filter);
};

/* ---- 证书 / 密钥 / SSH ---- */
CMDS['openssl']=function(vm,args){
  if(args[0]==='req'){
    var keyout=null, out=null, subj=null;
    for(var i=0;i<args.length;i++){ var a=args[i];
      if(a==='-keyout'){ keyout=args[++i]; continue; }
      if(a==='-out'){ out=args[++i]; continue; }
      if(a==='-subj'){ subj=args[++i]; continue; }
    }
    if(!keyout||!out) return {lines:[C('openssl: 用法: openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout 密钥 -out 证书 -subj "/CN=域名"','err')], code:1};
    var cn=subj?subj.replace(/.*CN=/,'').replace(/\/.*$/,''):'localhost';
    var key='-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQ'+'C8f2k3mN4xYqZ1'+'\n8pQbW7dT2VhXmK6sR9uJ3oL1nE5gA0cF4iH7kM8pQ2wZ1xY6vB3nD5jR9tS4uW7aE2\nsK3mK8qL9pRstU2vWxYzAbCdEfGhIjKlMnOpQrStUvWxYz0123\n-----END PRIVATE KEY-----\n';
    var cert='-----BEGIN CERTIFICATE-----\nMIIDazCCAlOgAwIBAgIUJ1a2b3c4d5e6f7g8h9i0jKLMNOPQRSTUV\nw0QzGm2nO3pQ4rS5tU6vW7xY8zA9bC0dE1fG2hI=\n（自签证书 · CN='+cn+'）\n-----END CERTIFICATE-----\n';
    vm.write(keyout, key, {m:0o600});
    vm.write(out, cert);
    return {lines:['...+......+.+............+.........','-----','Generating a RSA private key','............++++++','writing new private key to \''+keyout+'\'','-----','✓ 已生成: 密钥 '+keyout+' / 证书 '+out+'（自签，CN='+cn+'）'], code:0};
  }
  if(args[0]==='x509'&&args[1]==='-noout'&&args[3]==='-text'){
    var c=vm.read(args[2]);
    if(c===null) return {lines:[C('Could not open file '+args[2],'err')], code:1};
    var cn=(c.match(/CN=([^\n（]+)/)||[])[1]||'unknown';
    return {lines:['Certificate:','    Data:','        Version: 3 (0x2)','        Subject: CN = '+cn,'    Signature Algorithm: sha256WithRSAEncryption'], code:0};
  }
  return {lines:[C('openssl: 模拟器支持 req -x509 生成自签证书 / x509 -noout -text -in 证书','hint')], code:0};
};
CMDS['ssh-keygen']=function(vm,args){
  var f=null, t='rsa';
  for(var i=0;i<args.length;i++){ var a=args[i];
    if(a==='-t'){ t=args[++i]; continue; }
    if(a==='-f'){ f=args[++i]; continue; }
    if(a==='-N'||a==='-C'){ args[++i]; continue; }
  }
  if(!f) return {lines:[C('ssh-keygen: 用法: ssh-keygen -t ed25519 -f /root/.ssh/id_ed25519 -N ""','err')], code:1};
  var dir=parentOf(f); if(!vm.isDir(dir)) vm.mkdirP(dir,0o700);
  var priv='-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW\nQyNTUxOQAAACBFakeKeyForSimulator0000000000000000000000000AAA=\n-----END OPENSSH PRIVATE KEY-----\n';
  var pub='ssh-'+t+' AAAAC3NzaC1lZDI1NTE5AAAAILabFakeKeyForSimulator0000000000000000000000 root@srv1\n';
  vm.write(f, priv, {m:0o600});
  vm.write(f+'.pub', pub);
  return {lines:['Generating public/private '+t+' key pair.','Your identification has been saved in '+f,'Your public key has been saved in '+f+'.pub','The key fingerprint is:','SHA256:xJ3kL9mN2pQ8rS5tU7vW1xY4zA6bC0dE1fG2hI3j root@srv1','The key\'s randomart image is:','+--[ED25519 256]--+','|    .o+*B=o..    |','|   . =.o..o.     |','+----[SHA256]-----+'], code:0};
};
CMDS['sshd']=function(vm,args){
  var c=vm.read('/etc/ssh/sshd_config');
  if(c===null) return {lines:[C('sshd: cannot open /etc/ssh/sshd_config','err')], code:255};
  var lines=c.split('\n'), bad=0, err=null;
  var known={port:1,permitrootlogin:1,passwordauthentication:1,pubkeyauthentication:1,authorizedkeysfile:1,
    permitemptypasswords:1,usePAM:1,x11forwarding:1,challengeresponseauthentication:1,kbdinteractiveauthentication:1,
    maxauthtries:1,logingracetime:1,clientaliveinterval:1,clientalivecountmax:1,allowusers:1,denyusers:1,allowgroups:1,
    denygroups:1,syslogfacility:1,loglevel:1,printmotd:1,acceptenv:1,subsystem:1,hostkey:1,addressfamily:1,listenaddress:1};
  for(var i=0;i<lines.length;i++){
    var t=lines[i].replace(/#.*$/,'').trim(); if(!t) continue;
    var m=t.match(/^(\w+)\s+(\S+)/); if(!m) continue;
    var key=m[1].toLowerCase(), val=m[2];
    if(!known[key]){ bad++; err='sshd: line '+(i+1)+': Bad configuration option: '+m[1]; break; }
    if((key==='permitrootlogin'||key==='passwordauthentication'||key==='pubkeyauthentication'||key==='permitemptypasswords')&&['yes','no','prohibit-password','forced-commands-only','without-password'].indexOf(val)<0){
      bad++; err='sshd: line '+(i+1)+': Bad yes/no argument: '+val; break;
    }
  }
  if(bad) return {lines:[C(err,'err'),C('/etc/ssh/sshd_config: terminating, 1 bad configuration option','err')], code:255};
  return {lines:['/etc/ssh/sshd_config: terminating, 0 bad configuration lines'], code:0};
};
CMDS['ssh']=function(vm,args){
  return {lines:[C('（模拟器只有 srv1 一台机器，ssh 远程登录不可用；SSH 加固练习请: 编辑 sshd_config → sshd -t 验证 → systemctl restart sshd）','hint')], code:0};
};
CMDS['scp']=CMDS['ssh'];
CMDS['crontab']=function(vm,args){
  var f='/var/spool/cron/crontabs/root';
  if(args[0]==='-l'){ var c=vm.read(f); if(c===null) return {lines:[C('no crontab for root','dim')], code:1}; var ls=c.replace(/\n$/,'').split('\n'); return {lines:ls, code:0}; }
  if(args[0]==='-r'){ vm.rm(f,false); return {lines:[], code:0}; }
  if(args[0]==='-e'){ vm.mkdirP('/var/spool/cron/crontabs',0o700);
    if(!vm.exists(f)) vm.write(f,'# Edit this file to introduce tasks to be run by cron.\n# 格式: 分 时 日 月 周 命令\n# 例如: 0 3 * * * /opt/backup.sh\n#\n',{m:0o600});
    return {lines:[], code:0, editor:{path:f, mode:'edit'}};
  }
  if(args[0]&&args[0][0]!==' '){ var cc2=vm.read(args[0]); if(cc2===null) return {lines:[C('crontab: '+args[0]+': No such file or directory','err')], code:1};
    vm.write(f, cc2, {m:0o600}); return {lines:[], code:0}; }
  return {lines:[C('crontab: 支持 -l 查看 / -e 编辑 / -r 删除 / crontab 文件 安装','hint')], code:0};
};
CMDS['tar']=function(vm,args){
  var flags='', f=null, items=[];
  for(var i=0;i<args.length;i++){ var a=args[i];
    if(a==='-f'){ f=args[++i]; continue; }
    if(a==='-C'){ items.push({c:args[++i]}); continue; }
    if(a[0]==='-'){ flags+=a.slice(1); continue; }
    if(/^[a-z]+f[a-z]*$/.test(a)){ flags+=a; continue; }
    items.push(a);
  }
  /* 支持 tar czf out.tar.gz 目录 写法 */
  if(!f&&args.length>=2&&/^[a-z]*f[a-z]*$/.test(args[0])===false){ }
  if(flags.indexOf('c')>=0){
    var outFile=f||args[1];
    var src=null;
    for(var ti=0;ti<items.length;ti++){ var it=items[ti]; if(it&&it.c===undefined&&it!==outFile&&vm.exists(it)){ src=it; break; } }
    if(!src) src='.';
    var p3=vm.p(src), total=0;
    var pref=p3==='/'?'/':p3+'/';
    for(var k in vm.f){ if(k===p3||k.indexOf(pref)===0) total+=vm.sizeOf(k); }
    var est=Math.round(total*0.35)+1024;
    vm.write(vm.p(outFile), '[gzip compressed data, '+est+' bytes]');
    vm.sz[vm.p(outFile)]=est;
    return {lines:[], code:0};
  }
  if(flags.indexOf('t')>=0){ var c=vm.read(f); if(c===null) return {lines:[C('tar: '+f+': Cannot open: No such file or directory','err')], code:2}; return {lines:['./','./index.html'], code:0}; }
  if(flags.indexOf('x')>=0){ return {lines:[C('（模拟器：tar -x 解包不做模拟；重点是会打包、会备份）','hint')], code:0}; }
  return {lines:[C('tar: 支持 czf 打包 / tf 查看','hint')], code:0};
};
CMDS['testparm']=function(vm,args){
  if(!vm.pkgs['samba']) return notFound('testparm');
  var c=vm.read('/etc/samba/smb.conf');
  if(c===null) return {lines:[C('Load smb config files from /etc/samba/smb.conf','err'),C('Error loading services.','err')], code:1};
  var lines=c.split('\n');
  for(var i=0;i<lines.length;i++){
    var t=lines[i].replace(/[#;].*$/,'').trim(); if(!t) continue;
    if(/^\[.*\]$/.test(t)) continue;
    if(t.indexOf('=')<0) return {lines:[C('Load smb config files from /etc/samba/smb.conf','err'),C('ERROR: Badly formatted line '+(i+1)+' in /etc/samba/smb.conf','err')], code:1};
  }
  return {lines:['Load smb config files from /etc/samba/smb.conf','Loaded services file OK.','Weak crypto is allowed','','Server type: ROLE_STANDALONE'], code:0};
};
CMDS['python3']=function(vm,args){
  if(args[0]==='-V'||args[0]==='--version') return {lines:['Python 3.12.3'], code:0};
  if(args[0]==='-m'&&args[1]==='http.server'){
    var port=parseInt(args[2]||'8000',10);
    var s=vm.svc('pyhttp',true); s.installed=true; s.running=true; s.port=port; s.root=vm.cwd;
    vm.log('python3','Serving HTTP on 0.0.0.0 port '+port);
    return {lines:['Serving HTTP on 0.0.0.0 port '+port+' (http://0.0.0.0:'+port+'/) ...',C('（模拟器：已在后台运行；停止用 pkill python3）','dim')], code:0};
  }
  return {lines:[C('（模拟器：python 仅支持 -V 和 -m http.server 端口）','hint')], code:0};
};
CMDS['pkill']=function(vm,args){
  var s=vm.svc('pyhttp');
  if(s&&s.running){ s.running=false; return {lines:[], code:0}; }
  return {lines:[C('pkill: 没有匹配的进程','dim')], code:1};
};
CMDS['kill']=CMDS['pkill'];
CMDS['nginx']=function(vm,args){
  if(!vm.pkgs['nginx']) return notFound('nginx');
  if(args[0]==='-t'){ var pr=svcParseConf(vm,'nginx');
    if(pr.ok) return {lines:['nginx: the configuration file /etc/nginx/nginx.conf syntax is ok','nginx: configuration file /etc/nginx/nginx.conf test is successful'], code:0};
    return {lines:[C(pr.err,'err'),C('nginx: configuration file /etc/nginx/nginx.conf test failed','err')], code:1};
  }
  if(args[0]==='-v') return {lines:['nginx version: nginx/1.24.0 (Ubuntu)'], code:0};
  if(args[0]==='-s'&&args[1]==='reload'){ return svcRestart(vm,'nginx',true); }
  return {lines:[C('nginx: 支持 -t 检查配置 / -v 版本 / -s reload 重载','hint')], code:0};
};
CMDS['dnsmasq']=function(vm,args){
  if(!vm.pkgs['dnsmasq']) return notFound('dnsmasq');
  if(args[0]==='--test'){
    var conf='/etc/dnsmasq.conf';
    for(var i=0;i<args.length;i++) if(args[i]==='-C') conf=args[++i];
    var c=vm.read(conf);
    if(c===null) return {lines:[C('dnsmasq: cannot read '+conf+': No such file or directory','err')], code:1};
    var pr=parseDnsmasq(vm,c);
    if(pr.ok) return {lines:['dnsmasq: syntax check OK.'], code:0};
    return {lines:[C(pr.err,'err')], code:1};
  }
  if(args[0]==='--version') return {lines:['Dnsmasq version 2.90  Copyright (c) 2000-2024 Simon Kelley'], code:0};
  return {lines:[C('dnsmasq: 支持 --test 检查配置','hint')], code:0};
};
CMDS['haproxy']=function(vm,args){
  if(!vm.pkgs['haproxy']) return notFound('haproxy');
  if(args[0]==='-c'||args.join('').indexOf('-c')>=0){
    var f='/etc/haproxy/haproxy.cfg';
    for(var i=0;i<args.length;i++) if(args[i]==='-f') f=args[++i];
    var c=vm.read(f);
    if(c===null) return {lines:[C('[ALERT] cannot open configuration file '+f,'err')], code:1};
    var pr=parseHaproxy(vm,c);
    if(pr.ok) return {lines:['Configuration file is valid'], code:0};
    return {lines:[C(pr.err,'err')], code:1};
  }
  if(args[0]==='-v'||args[0]==='--version') return {lines:['HAProxy version 2.8.5-1ubuntu3'], code:0};
  return {lines:[C('haproxy: 支持 -c -f 配置检查 / -v 版本','hint')], code:0};
};

/* =====================================================================
   八、命令管线： execLine → execPipeline → execSingle
   ===================================================================== */
function runScript(vm, args, raw){
  var file=null, dashc=null;
  var ci=raw.indexOf(' -c ');
  if(ci>=0){ dashc=raw.slice(ci+4).trim().replace(/^["']|["']$/g,''); }
  if(dashc){ return execLine(vm, dashc); }
  for(var i=0;i<args.length;i++){ var a=args[i];
    if(a==='-c'){ break; }
    if(a[0]==='-') continue;
    if(!file){ file=a; break; }
  }
  if(!file) return {lines:[C('（模拟器：用法 sh 脚本.sh；直接粘贴命令到终端也可以）','hint')], code:1};
  var c=vm.read(file);
  if(c===null) return {lines:[C('sh: 0: cannot open '+file+': No such file','err')], code:2};
  var src=vm.read(file).split('\n'), out=[], code=0;
  for(var L=0;L<src.length;L++){
    var t=src[L].trim();
    if(!t||t[0]==='#'||t.indexOf('#!')===0) continue;
    if(/^(if|for|while|case|fi|done|then|else|elif|esac|do|\}|function)\b/.test(t)){ out.push(C('（模拟器不支持控制语句，已跳过：'+t+'）','dim')); continue; }
    var mas=t.match(/^([A-Za-z_]\w*)=(.+)$/);
    if(mas&&t.indexOf(' ')<0){ vm.env[mas[1]]=mas[2].replace(/^["']|["']$/g,''); continue; }
    var r=execLine(vm, t);
    out=out.concat(r.lines);
    code=(r.code===undefined?0:r.code);
    if(out.length>400){ out.push(C('（输出过长，已截断）','dim')); break; }
  }
  return {lines:out, code:code};
}
CMDS['sh']=function(vm,args,cc){ return runScript(vm,args,cc.raw.replace(/^\s*sh\s+/,'')); };
CMDS['bash']=CMDS['sh'];
CMDS['nano']=function(vm,args){
  var f=args[0]; if(!f) return {lines:[C('nano: 用法: nano 文件路径','hint')], code:1};
  return {lines:[], code:0, editor:{path:f, mode:'edit'}};
};
CMDS['vi']=CMDS['nano']; CMDS['vim']=CMDS['nano']; CMDS['edit']=CMDS['nano'];
function pipeFilter(vm, seg, feed){
  var toks=tokenize(seg); if(!toks.length) return null;
  var name=toks[0], args=toks.slice(1);
  if(['grep','head','tail','wc','sort','uniq','cut','tr','awk'].indexOf(name)>=0&&CMDS[name]){
    return CMDS[name](vm,args,{stdin:feed});
  }
  if(name==='chpasswd') return CMDS['chpasswd'](vm,args,{stdin:feed});
  if(name==='mysql'||name==='mariadb') return CMDS['mysql'](vm,args,{stdin:feed});
  if(name==='tee'){ var f=args[0]; if(f) vm.write(f, feed.map(textOf).join('\n')+'\n'); return {lines:feed.slice(), code:0}; }
  if(name==='cat') return {lines:feed.slice(), code:0};
  if(name==='wc') return CMDS['wc'](vm,args,{stdin:feed});
  return null;
}
function execPipeline(vm, cmd){
  var segs=splitPipe(cmd);
  if(segs.length===1) return execSingle(vm, segs[0], {});
  var first=execSingle(vm, segs[0], {});
  var feed=first.lines.map(function(l){ return typeof l==='string'?l:l.s; });
  var errNote=first.lines.filter(function(l){ return typeof l==='object'&&l.c==='err'; });
  var code=(first.code===undefined?0:first.code);
  for(var i=1;i<segs.length;i++){
    var r=pipeFilter(vm, segs[i], feed);
    if(r===null) return {lines:errNote.concat([C('（模拟器：管道右侧暂不支持该命令：'+segs[i]+'；支持 grep/head/tail/wc/sort/uniq/cut/tr/awk/chpasswd/mysql）','err')]), code:1};
    feed=r.lines.map(function(l){ return typeof l==='string'?l:l.s; });
    code=(r.code===undefined?0:r.code);
  }
  return {lines:feed, code:code};
}
function execSingle(vm, cmd, ctx){
  ctx=ctx||{};
  cmd=cmd.trim(); if(!cmd) return {lines:[], code:0};
  if(cmd[0]==='>'){
    var rest0=cmd.slice(cmd[1]==='>'?2:1).trim();
    var t0=tokenize(rest0)[0];
    if(t0){ vm.write(t0,''); vm.sz[vm.p(t0)]=0; return {lines:[], code:0}; }
    return {lines:[C('bash: syntax error near unexpected token `>\'','err')], code:2};
  }
  if(cmd.indexOf('<<')>=0) return {lines:[C('（模拟器不支持 heredoc <<；请用 nano 直接编辑文件，一步到位）','hint')], code:1};
  cmd=expandEnv(vm, cmd, vm.lastCode||0);
  var redir=findRedirect(cmd);
  var cmd2=cmd, redirect=null;
  if(redir&&!redir.heredoc){
    cmd2=redir.pre.trim();
    var rt=tokenize(redir.rest);
    redirect={op:redir.op, path:rt[0]?globExpand(vm,rt[0])[0]:null, fd:redir.fd||1};
  } else if(redir&&redir.heredoc){ return {lines:[C('（模拟器不支持 heredoc）','hint')], code:1}; }
  var toks=tokenize(cmd2);
  if(!toks.length) return {lines:[], code:0};
  var expanded=[toks[0]];
  for(var i=1;i<toks.length;i++){ var g=globExpand(vm,toks[i]); for(var j=0;j<g.length;j++) expanded.push(g[j]); }
  toks=expanded;
  while(toks[0]==='sudo'){ toks.shift();
    while(toks[0]&&toks[0][0]==='-'){ if(toks[0]==='-u'){ toks.shift(); toks.shift(); } else toks.shift(); }
  }
  var name=toks[0], args=toks.slice(1);
  if(name==='cat'&&!args.length&&redirect&&redirect.op==='>'){
    return {lines:[], code:0, editor:{path:vm.p(redirect.path), mode:'new'}};
  }
  var res;
  if(CMDS[name]) res=CMDS[name](vm, args, {raw:cmd2, tokens:toks, stdin:ctx.stdin});
  else res={lines:[C('bash: '+name+': command not found','err')], code:127};
  if(redirect&&redirect.path&&!res.editor&&redirect.path!=='/dev/null'){
    var wl=res.lines.filter(function(l){ return !(typeof l==='object'&&l.c==='err'); }).map(textOf);
    var wt=wl.join('\n')+(wl.length?'\n':'');
    if(redirect.op==='>>'){ vm.write(redirect.path, (vm.read(redirect.path)||'')+wt); }
    else vm.write(redirect.path, wt);
    if(res.code===0){ res.lines=res.lines.filter(function(l){ return typeof l==='object'&&l.c==='err'; }); }
  }
  return res;
}
function execLine(vm, line){
  line=String(line).replace(/^\s+|\s+$/g,'');
  if(!line) return {lines:[], code:0};
  vm.hist.push(line);
  if(vm.hist.length>200) vm.hist.shift();
  var chain=splitChain(line);
  var out=[], code=0, clear=false, exit=false;
  for(var i=0;i<chain.length;i++){
    var seg=chain[i];
    if(seg.op==='&&'&&code!==0) continue;
    if(seg.op==='||'&&code===0) continue;
    var r=execPipeline(vm, seg.cmd);
    out=out.concat(r.lines);
    if(r.clear) clear=true;
    if(r.exit) exit=true;
    code=(r.code===undefined?0:r.code);
    vm.lastCode=code;
    if(r.editor) return {lines:out, code:code, editor:r.editor};
    if(out.length>500){ out.push(C('（输出过长，已截断）','dim')); break; }
  }
  return {lines:out, code:code, clear:clear, exit:exit};
}

/* =====================================================================
   九、评分 / 存档
   ===================================================================== */
function grade(vm, scn){
  var items=[], total=0, got=0;
  for(var i=0;i<scn.checks.length;i++){
    var c=scn.checks[i], ok=false, msg=null;
    try{
      var r=c.f(vm);
      if(r===true) ok=true;
      else if(r&&typeof r==='object'){ ok=!!r.ok; msg=r.msg||null; }
    }catch(e){ ok=false; msg='检查出错: '+e.message; }
    items.push({d:c.d, p:c.p, ok:ok, msg:msg, tip:ok?null:(c.tip||null)});
    total+=c.p; if(ok) got+=c.p;
  }
  return {items:items, total:total, got:got, pct:total?Math.round(got/total*100):0};
}
function vmToJSON(vm){
  return JSON.stringify({
    v:1, hostname:vm.hostname, timezone:vm.timezone, cwd:vm.cwd,
    f:vm.f, sz:vm.sz, pkgs:vm.pkgs,
    svcs:vm.svcs, users:vm.users, groups:vm.groups, env:vm.env,
    fw:vm.fw, sql:vm.sql, docker:vm.docker, sim:vm.sim,
    ansible:vm.ansible, ldapE:vm.ldapE, sambaShares:vm.sambaShares,
    journal:vm.journal.slice(-80), hist:vm.hist.slice(-50), rrCount:vm.rrCount, lastCode:vm.lastCode
  });
}
function vmFromJSON(vm, str){
  try{
    var o=JSON.parse(str); if(!o||o.v!==1) return false;
    ['hostname','timezone','cwd','f','sz','pkgs','svcs','users','groups','env','fw','sql','docker','sim','ansible','ldapE','hist'].forEach(function(k){
      if(o[k]!==undefined) vm[k]=o[k];
    });
    vm.journal=(o.journal||[]).map(function(e){ e.t=e.t?new Date(e.t):new Date(); return e; });
    vm.rrCount=o.rrCount||0; vm.lastCode=o.lastCode||0;
    for(var name in vm.svcs){
      var s=vm.svcs[name];
      if(s.running&&s.snap){ var pre=svcParseConf(vm,name); if(pre.ok){ s.rt=pre.rt||null; if(name==='dnsmasq') s.rt2=pre.rt; } }
    }
    return true;
  }catch(e){ return false; }
}
root.LabEngine.VM=VM; root.LabEngine.C=C; root.LabEngine.pad=pad; root.LabEngine.norm=norm; root.LabEngine.fmtSize=fmtSize; root.LabEngine.parseMode=parseMode;
root.LabEngine.VERSION='1.0';
root.LabEngine.parentOf=parentOf; root.LabEngine.baseOf=baseOf; root.LabEngine.modeStr=modeStr;
root.LabEngine.execLine=execLine; root.LabEngine.execSingle=execSingle;
root.LabEngine.grade=grade; root.LabEngine.vmToJSON=vmToJSON; root.LabEngine.vmFromJSON=vmFromJSON;
root.LabEngine.newVM=function(id){ return new VM(id); };
root.LabEngine.CMDS=CMDS;
root.LabEngine._test={ tokenize:tokenize, splitChain:splitChain, splitPipe:splitPipe, parseNginx:parseNginx, parseDnsmasq:parseDnsmasq, parseHaproxy:parseHaproxy, ansibleParse:ansibleParse, sqlRun:sqlRun };
if(typeof module!=='undefined'&&module.exports) module.exports=root.LabEngine;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));
