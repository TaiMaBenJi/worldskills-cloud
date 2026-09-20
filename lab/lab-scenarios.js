/* =====================================================================
   lab-scenarios.js · 模拟实训场景库（22 个任务 · 对标 wsarena 真机训练场）
   每个场景: setup(vm) 造初始状态 / checks 自动评分 / solution 示范步骤
   ===================================================================== */
(function(root){
'use strict';
var E=root.LabEngine;
function L(vm,cmd){ return E.execLine(vm,cmd); }
function tx(r){ return r.lines.map(function(l){ return typeof l==='string'?l:(l.s||''); }).join('\n'); }
function http(vm,url,opt){
  opt=opt||{};
  var m=String(url).match(/^(https?):\/\/([^\/:]+)(?::(\d+))?(\/.*)?$/);
  var ssl=m[1]==='https';
  return E.dispatchHttp(vm,{host:m[2], port:m[3]?parseInt(m[3],10):(ssl?443:80), path:m[4]||'/',
    ssl:ssl, method:opt.method||'GET', headers:opt.headers||{Host:m[2]}, _depth:0});
}
function preNginx(vm){ E.pkgInstall(vm,'nginx'); L(vm,'systemctl start nginx'); }
var NGX_HEAD='user www-data;\nevents {}\nhttp {\n    include /etc/nginx/mime.types;\n';

var SCN=[
/* ================= WEB ================= */
{
  id:'web1', mod:'Web', title:'部署 Nginx 静态网站', min:20,
  brief:'装好 Nginx，把首页改成你自己的页面（必须包含文字：Hello WorldSkills），启动服务，让 curl 能访问到；再确认访问不存在的路径会返回 404。',
  hints:['装完先别急着改配置：apt install nginx 后自带一个能跑的默认配置','首页文件在 /var/www/html/index.html，用 nano 编辑它','服务起不来先 nginx -t 看报错；改完配置记得 systemctl restart nginx'],
  chips:['apt install -y nginx','systemctl start nginx','curl -s http://localhost/','nginx -t'],
  files:[{p:'/var/www/html/index.html',t:'站点首页'},{p:'/etc/nginx/nginx.conf',t:'nginx 主配置'}],
  setup:function(vm){},
  checks:[
    {d:'Nginx 已安装', p:10, f:function(vm){ return !!vm.pkgs['nginx']; }},
    {d:'Nginx 正在运行（80 端口已监听）', p:15, f:function(vm){ var s=vm.svcs['nginx']; return !!(s&&s.running); }, tip:'systemctl start nginx'},
    {d:'首页包含 Hello WorldSkills', p:25, f:function(vm){ return {ok:(vm.read('/var/www/html/index.html')||'').indexOf('Hello WorldSkills')>=0, msg:'编辑 /var/www/html/index.html'}; }},
    {d:'curl localhost 返回 200 且能看到你的页面', p:35, f:function(vm){ var r=http(vm,'http://localhost/'); return {ok:r.status===200&&(r.body||'').indexOf('Hello WorldSkills')>=0, msg:'当前状态码 '+r.status}; },
      tip:'nginx 运行中 + 首页存在 = 200'},
    {d:'不存在的路径返回 404', p:15, f:function(vm){ var r=http(vm,'http://localhost/no-such-page-xyz'); return r.status===404; }}
  ],
  solution:[
    {c:'apt install -y nginx'},
    {w:['/var/www/html/index.html','<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"><title>我的云服务器</title></head>\n<body>\n<h1>Hello WorldSkills</h1>\n<p>第一个站点上线成功！</p>\n</body>\n</html>\n']},
    {c:'systemctl start nginx'},
    {c:'curl -s http://localhost/'}
  ],
  exam:['mini']
},
{
  id:'web2', mod:'Web', title:'虚拟主机：一台服务器两个站点', min:25,
  brief:'用同一个 80 端口跑两个站点：app.corp.local → /var/www/app，api.corp.local → /var/www/api（两个目录自己建，首页文字分别为 APP SITE 和 API SITE）。用 curl -H "Host: …" 验证两个域名各回各的站点。',
  hints:['先建目录: mkdir -p /var/www/app /var/www/api（编辑器不会自动建目录）','核心：两个 server 块，listen 都是 80，用 server_name 区分','curl 命令: curl -H "Host: app.corp.local" http://localhost/'],
  chips:['nginx -t','systemctl restart nginx','curl -H "Host: app.corp.local" http://localhost/','curl -H "Host: api.corp.local" http://localhost/'],
  files:[{p:'/etc/nginx/nginx.conf',t:'nginx 主配置'},{p:'/var/www/app/index.html',t:'app 首页'},{p:'/var/www/api/index.html',t:'api 首页'}],
  setup:function(vm){ preNginx(vm); },
  checks:[
    {d:'配置里能看到两个 server_name（app/api）', p:20, f:function(vm){ var pr=E.parseNginx(vm,vm.read('/etc/nginx/nginx.conf')||''); var names=[].concat.apply([],pr.servers.map(function(s){return s.names;})); return {ok:names.indexOf('app.corp.local')>=0&&names.indexOf('api.corp.local')>=0, msg:'server_name: '+names.join(' ')}; }},
    {d:'curl -H Host:app.corp.local 返回 APP SITE', p:25, f:function(vm){ var r=http(vm,'http://localhost/',{headers:{Host:'app.corp.local'}}); return {ok:r.status===200&&(r.body||'').indexOf('APP SITE')>=0, msg:'状态码 '+r.status}; }},
    {d:'curl -H Host:api.corp.local 返回 API SITE', p:25, f:function(vm){ var r=http(vm,'http://localhost/',{headers:{Host:'api.corp.local'}}); return {ok:r.status===200&&(r.body||'').indexOf('API SITE')>=0, msg:'状态码 '+r.status}; }},
    {d:'nginx -t 配置语法通过', p:15, f:function(vm){ return L(vm,'nginx -t').code===0; }},
    {d:'nginx 正在运行（已重启加载新配置）', p:15, f:function(vm){ var s=vm.svcs['nginx']; return !!(s&&s.running&&s.snap&&s.snap.indexOf('app.corp.local')>=0); }, tip:'改完配置要 systemctl restart nginx 才生效'}
  ],
  solution:[
    {c:'mkdir -p /var/www/app /var/www/api'},
    {w:['/var/www/app/index.html','<!DOCTYPE html><html><body><h1>APP SITE</h1></body></html>\n']},
    {w:['/var/www/api/index.html','<!DOCTYPE html><html><body><h1>API SITE</h1></body></html>\n']},
    {w:['/etc/nginx/nginx.conf', NGX_HEAD+
      '    server {\n        listen 80;\n        server_name app.corp.local;\n        root /var/www/app;\n        index index.html;\n    }\n'+
      '    server {\n        listen 80;\n        server_name api.corp.local;\n        root /var/www/api;\n        index index.html;\n    }\n}\n']},
    {c:'nginx -t'},
    {c:'systemctl restart nginx'},
    {c:'curl -H "Host: app.corp.local" http://localhost/'}
  ],
  exam:['full']
},
{
  id:'web3', mod:'Web', title:'HTTPS：自签证书 + 强制跳转', min:30,
  brief:'给站点配 HTTPS：自签证书放 /etc/nginx/certs/（site.crt + site.key）；443 返回 SECURE SITE 页面；80 的全部请求 301 跳转到 https。测试: curl -k https://localhost/ 和 curl -i http://localhost/。',
  hints:['生成证书: openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/nginx/certs/site.key -out /etc/nginx/certs/site.crt -subj "/CN=localhost"','跳转写法（server 块里）: return 301 https://$host$request_uri;','自签证书浏览器/curl 会警告属正常——比赛用 -k 跑通即可'],
  chips:['openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/nginx/certs/site.key -out /etc/nginx/certs/site.crt -subj "/CN=localhost"','nginx -t','systemctl restart nginx','curl -k https://localhost/','curl -i http://localhost/'],
  files:[{p:'/etc/nginx/nginx.conf',t:'nginx 主配置'},{p:'/var/www/html/index.html',t:'站点首页'}],
  setup:function(vm){ preNginx(vm); vm.write('/var/www/html/index.html','<h1>SECURE SITE</h1>\n'); },
  checks:[
    {d:'证书文件已生成（certs/site.crt + site.key）', p:15, f:function(vm){ return vm.exists('/etc/nginx/certs/site.crt')&&vm.exists('/etc/nginx/certs/site.key'); }},
    {d:'curl -k https://localhost/ 返回 200 + SECURE SITE', p:35, f:function(vm){ var r=http(vm,'https://localhost/'); return {ok:r.status===200&&(r.body||'').indexOf('SECURE SITE')>=0, msg:'状态码 '+r.status}; }},
    {d:'http 请求返回 301 跳转到 https', p:25, f:function(vm){ var r=http(vm,'http://localhost/'); return {ok:r.status===301&&String(r.headers&&r.headers['Location']||'').indexOf('https://')===0, msg:'状态码 '+r.status+' Location: '+((r.headers||{})['Location']||'-')}; }},
    {d:'nginx -t 通过 + 服务运行中', p:25, f:function(vm){ var s=vm.svcs['nginx']; return {ok:L(vm,'nginx -t').code===0&&!!(s&&s.running), msg:'检查配置与重启'}; }}
  ],
  solution:[
    {c:'mkdir -p /etc/nginx/certs'},
    {c:'openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/nginx/certs/site.key -out /etc/nginx/certs/site.crt -subj "/CN=localhost"'},
    {w:['/etc/nginx/nginx.conf', NGX_HEAD+
      '    server {\n        listen 80;\n        server_name _;\n        return 301 https://$host$request_uri;\n    }\n'+
      '    server {\n        listen 443 ssl;\n        server_name _;\n        ssl_certificate /etc/nginx/certs/site.crt;\n        ssl_certificate_key /etc/nginx/certs/site.key;\n        root /var/www/html;\n        index index.html;\n    }\n}\n']},
    {c:'nginx -t'},
    {c:'systemctl restart nginx'},
    {c:'curl -k https://localhost/'}
  ],
  exam:['std']
},
/* ================= DNS ================= */
{
  id:'dns1', mod:'DNS', title:'DNS 正解析（dnsmasq）', min:25,
  brief:'装 dnsmasq 并配置 corp.local 域名的解析: web.corp.local→192.168.1.10，db.corp.local→192.168.1.20，mail.corp.local→192.168.1.25。重启服务后用 dig 验证。',
  hints:['配置写在 /etc/dnsmasq.conf，语法: address=/域名/IP','改完必须 systemctl restart dnsmasq（本模拟器严格执行这一点）','验证: dig +short web.corp.local'],
  chips:['apt install -y dnsmasq','systemctl restart dnsmasq','dig +short web.corp.local','dnsmasq --test'],
  files:[{p:'/etc/dnsmasq.conf',t:'dnsmasq 配置'}],
  setup:function(vm){},
  checks:[
    {d:'dnsmasq 已安装并在运行', p:15, f:function(vm){ var s=vm.svcs['dnsmasq']; return !!(vm.pkgs['dnsmasq']&&s&&s.running); }},
    {d:'web.corp.local → 192.168.1.10', p:20, f:function(vm){ var r=E.dnsLookup(vm,'web.corp.local','A'); return {ok:r.status==='NOERROR'&&r.value==='192.168.1.10', msg:(r.value||r.status)}; }},
    {d:'db.corp.local → 192.168.1.20', p:20, f:function(vm){ var r=E.dnsLookup(vm,'db.corp.local','A'); return {ok:r.status==='NOERROR'&&r.value==='192.168.1.20', msg:(r.value||r.status)}; }},
    {d:'mail.corp.local → 192.168.1.25', p:20, f:function(vm){ var r=E.dnsLookup(vm,'mail.corp.local','A'); return {ok:r.status==='NOERROR'&&r.value==='192.168.1.25', msg:(r.value||r.status)}; }},
    {d:'不存在的域名返回 NXDOMAIN', p:10, f:function(vm){ var r=E.dnsLookup(vm,'nope.corp.local','A'); return r.status==='NXDOMAIN'; }},
    {d:'dnsmasq --test 语法检查通过', p:15, f:function(vm){ return L(vm,'dnsmasq --test').code===0; }}
  ],
  solution:[
    {c:'apt install -y dnsmasq'},
    {w:['/etc/dnsmasq.conf','# corp.local 区域解析\naddress=/web.corp.local/192.168.1.10\naddress=/db.corp.local/192.168.1.20\naddress=/mail.corp.local/192.168.1.25\n']},
    {c:'systemctl restart dnsmasq'},
    {c:'dig +short web.corp.local'}
  ],
  exam:['std']
},
{
  id:'dns2', mod:'DNS', title:'DNS 反解析（PTR）', min:20,
  brief:'在现有基础上加一条反解析：192.168.1.10 ↔ web.corp.local。要求 dig -x 192.168.1.10 能查到 web.corp.local（提示：host-record 会同时建立正反解析），改完记得重启服务。',
  hints:['host-record=web.corp.local,192.168.1.10 会同时建 A 和 PTR','验证: dig -x 192.168.1.10 +short','原来的 address= 记录没有 PTR，这就是要换成/补上 host-record 的原因'],
  chips:['dig -x 192.168.1.10 +short','systemctl restart dnsmasq','dnsmasq --test'],
  files:[{p:'/etc/dnsmasq.conf',t:'dnsmasq 配置'}],
  setup:function(vm){
    E.pkgInstall(vm,'dnsmasq');
    vm.write('/etc/dnsmasq.conf','# corp.local 区域解析\naddress=/web.corp.local/192.168.1.10\naddress=/db.corp.local/192.168.1.20\n');
    L(vm,'systemctl restart dnsmasq');
  },
  checks:[
    {d:'dig -x 192.168.1.10 返回 web.corp.local', p:35, f:function(vm){ var r=E.dnsLookup(vm,'10.1.168.192.in-addr.arpa','PTR'); return {ok:r.status==='NOERROR'&&String(r.value||'').indexOf('web.corp.local')===0, msg:(r.value||r.status)}; }},
    {d:'正向解析依然正常（web.corp.local → .10）', p:25, f:function(vm){ var r=E.dnsLookup(vm,'web.corp.local','A'); return {ok:r.status==='NOERROR'&&r.value==='192.168.1.10', msg:(r.value||r.status)}; }},
    {d:'db.corp.local 解析未被破坏', p:15, f:function(vm){ var r=E.dnsLookup(vm,'db.corp.local','A'); return r.status==='NOERROR'&&r.value==='192.168.1.20'; }},
    {d:'dnsmasq 运行中 + 配置检查通过', p:25, f:function(vm){ var s=vm.svcs['dnsmasq']; return {ok:!!(s&&s.running)&&L(vm,'dnsmasq --test').code===0, msg:'检查服务状态与语法'}; }}
  ],
  solution:[
    {w:['/etc/dnsmasq.conf','# corp.local 区域解析\nhost-record=web.corp.local,192.168.1.10\naddress=/db.corp.local/192.168.1.20\n']},
    {c:'systemctl restart dnsmasq'},
    {c:'dig -x 192.168.1.10 +short'}
  ],
  exam:['full']
},
/* ================= 排障 ================= */
{
  id:'fix1', mod:'排障', title:'急诊室：nginx 起不来', min:20,
  brief:'同事说"网站挂了"：nginx 装了但服务起不来。请定位问题、修好配置、把服务跑起来，让 curl localhost 返回 Welcome to nginx 页面。',
  hints:['第一步永远是 nginx -t（看配置报错）和 systemctl status nginx（看服务状态）','报错会指出行号，去看那一行长什么样','修好配置后: systemctl start nginx'],
  chips:['nginx -t','systemctl status nginx','journalctl -u nginx -n 20','systemctl start nginx','curl -s http://localhost/'],
  files:[{p:'/etc/nginx/nginx.conf',t:'nginx 主配置'}],
  setup:function(vm){
    E.pkgInstall(vm,'nginx');
    vm.write('/etc/nginx/nginx.conf', NGX_HEAD+'    server {\n        lissten 80 default_server;\n        server_name _;\n        root /var/www/html;\n        index index.html;\n    }\n}\n');
  },
  checks:[
    {d:'nginx -t 配置检查通过', p:25, f:function(vm){ return {ok:L(vm,'nginx -t').code===0, msg:'还有语法错误没修完'}; }},
    {d:'nginx 服务已运行', p:25, f:function(vm){ var s=vm.svcs['nginx']; return !!(s&&s.running); }},
    {d:'curl localhost 返回 Welcome 页面（200）', p:50, f:function(vm){ var r=http(vm,'http://localhost/'); return {ok:r.status===200&&(r.body||'').indexOf('Welcome to nginx')>=0, msg:'状态码 '+r.status}; }}
  ],
  solution:[
    {w:['/etc/nginx/nginx.conf', NGX_HEAD+'    server {\n        listen 80 default_server;\n        server_name _;\n        root /var/www/html;\n        index index.html;\n    }\n}\n']},
    {c:'nginx -t'},
    {c:'systemctl start nginx'},
    {c:'curl -s http://localhost/'}
  ],
  exam:['fix']
},
{
  id:'fix2', mod:'排障', title:'急诊室：磁盘爆满', min:20,
  brief:'告警：/ 分区使用率 96%，服务开始写不进数据。找出把磁盘吃满的文件并处理掉（清理或截断），让使用率回到 80% 以下。',
  hints:['du -sh /var/* 和 du -sh /var/log/* 逐层找大文件','日志文件不用删——truncate -s 0 文件 清空内容还能继续用','也可以用 > 文件 重定向清空'],
  chips:['df -h','du -sh /var/log/*','ls -lh /var/log','truncate -s 0 /var/log/room-app.log'],
  files:[],
  setup:function(vm){
    vm.f['/var/log/room-app.log']={c:'', m:0o644, u:'root', g:'root'};
    vm.sz['/var/log/room-app.log']=9.4e9;
  },
  checks:[
    {d:'磁盘使用率已降到 80% 以下', p:60, f:function(vm){ var used=vm.diskUsed(), total=vm.disk.total; var pct=Math.round(used/total*100); return {ok:pct<80, msg:'当前 '+pct+'%'}; }},
    {d:'元凶日志已清理/截断（<100MB）', p:40, f:function(vm){ var s=vm.sizeOf('/var/log/room-app.log'); return {ok:s<100*1e6, msg:'当前大小 '+E.fmtSize(s)}; }}
  ],
  solution:[
    {c:'df -h'},
    {c:'du -sh /var/log/*'},
    {c:'truncate -s 0 /var/log/room-app.log'},
    {c:'df -h'}
  ],
  exam:['fix']
},
{
  id:'fix3', mod:'排障', title:'急诊室：403 权限', min:20,
  brief:'网站内容明明在，访问却 403 Forbidden。找出权限问题修好它，让 curl localhost 返回 PAGE OK。',
  hints:['403 最常见的两种原因：目录权限不让人进（缺 x）、首页文件不可读（缺 r）','看看 /var/www/html 的权限: ls -ld /var/www/html','nginx worker 是 www-data 用户——它要有权"走进"目录才能读到文件'],
  chips:['curl -i http://localhost/','ls -ld /var/www/html','stat -c %a /var/www/html','chmod 755 /var/www/html'],
  files:[],
  setup:function(vm){
    preNginx(vm);
    vm.write('/var/www/html/index.html','<h1>PAGE OK</h1>\n');
    vm.chmod('/var/www/html', 0o700);
    vm.chown('/var/www/html','root','root');
  },
  checks:[
    {d:'curl localhost 返回 200 + PAGE OK', p:60, f:function(vm){ var r=http(vm,'http://localhost/'); return {ok:r.status===200&&(r.body||'').indexOf('PAGE OK')>=0, msg:'状态码 '+r.status}; }},
    {d:'/var/www/html 权限已修复（允许其他用户进入）', p:40, f:function(vm){ var st=vm.statOf('/var/www/html'); return {ok:!!(st&&(st.m&0o001)), msg:'当前模式 '+E.modeStr(st?st.m:0)}; }}
  ],
  solution:[
    {c:'curl -i http://localhost/'},
    {c:'ls -ld /var/www/html'},
    {c:'chmod 755 /var/www/html'},
    {c:'curl -s http://localhost/'}
  ],
  exam:['fix']
},
/* ================= 数据库 ================= */
{
  id:'db1', mod:'数据库', title:'建库、建用户、授权', min:20,
  brief:'装 MariaDB 并启动；创建数据库 appdb；创建用户 appuser@localhost（密码 AppUser@123）；把 appdb 的全部权限授给该用户并验证。',
  hints:['服务名是 mariadb: systemctl start mariadb','SQL 可以一条条来: mysql -e "CREATE DATABASE appdb;"','授权后跟一句 FLUSH PRIVILEGES; 是好习惯'],
  chips:['apt install -y mariadb-server','systemctl start mariadb','mysql -e "SHOW DATABASES;"','mysql -u appuser -pAppUser@123 -e "SHOW DATABASES;"'],
  files:[],
  setup:function(vm){},
  checks:[
    {d:'mariadb 已安装并在运行', p:20, f:function(vm){ var s=vm.svcs['mariadb']; return !!(vm.pkgs['mariadb-server']&&s&&s.running); }},
    {d:'数据库 appdb 已创建', p:20, f:function(vm){ return !!vm.sql.dbs['appdb']; }},
    {d:'appuser 能用密码登录', p:20, f:function(vm){ var r=L(vm,"mysql -u appuser -pAppUser@123 -e 'SHOW DATABASES;'"); return {ok:r.code===0, msg:'登录失败——检查用户与密码'}; }},
    {d:'appuser 能看到 appdb（授权生效）', p:25, f:function(vm){ var r=L(vm,"mysql -u appuser -pAppUser@123 -e 'SHOW DATABASES;'"); return {ok:tx(r).indexOf('appdb')>=0, msg:'授权没生效或没刷新权限'}; }},
    {d:'权限级别为 ALL（可建表）', p:15, f:function(vm){ return sqGrantCheck(vm); }}
  ],
  solution:[
    {c:'apt install -y mariadb-server'},
    {c:'systemctl start mariadb'},
    {c:'mysql -e "CREATE DATABASE appdb;"'},
    {c:'mysql -e "CREATE USER \'appuser\'@\'localhost\' IDENTIFIED BY \'AppUser@123\';"'},
    {c:'mysql -e "GRANT ALL PRIVILEGES ON appdb.* TO \'appuser\'@\'localhost\'; FLUSH PRIVILEGES;"'},
    {c:'mysql -u appuser -pAppUser@123 -e "SHOW DATABASES;"'}
  ],
  exam:['mini']
},
{
  id:'db2', mod:'数据库', title:'建表与数据操作', min:20,
  brief:'库和用户已备好。在 appdb 里建表 students(id, name)，插入 3 行数据：alice / bob / carol；最后用 appuser 账号查询验证数据在。',
  hints:['建表语法: CREATE TABLE students (id INT, name VARCHAR(50));','插入: INSERT INTO students VALUES (1,\'alice\'),(2,\'bob\'),(3,\'carol\');','不带 -e 的交互模式这里不可用——继续用 -e "SQL"'],
  chips:['mysql appdb -e "SHOW TABLES;"','mysql appdb -e "SELECT * FROM students;"','mysql -u appuser -pAppUser@123 appdb -e "SELECT * FROM students;"'],
  files:[],
  setup:function(vm){
    E.pkgInstall(vm,'mariadb-server'); L(vm,'systemctl start mariadb');
    E.sqlRun(vm,'CREATE DATABASE appdb;','root',null);
    E.sqlRun(vm,"CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'AppUser@123';",'root',null);
    E.sqlRun(vm,"GRANT ALL PRIVILEGES ON appdb.* TO 'appuser'@'localhost';",'root',null);
  },
  checks:[
    {d:'表 students 已创建', p:25, f:function(vm){ return !!(vm.sql.dbs['appdb']&&vm.sql.dbs['appdb'].tables['students']); }},
    {d:'表里有 3 行数据', p:25, f:function(vm){ var t=vm.sql.dbs['appdb']&&vm.sql.dbs['appdb'].tables['students']; return {ok:!!(t&&t.rows.length===3), msg:'当前 '+(t?t.rows.length:0)+' 行'}; }},
    {d:'包含 alice / bob / carol', p:25, f:function(vm){ var t=vm.sql.dbs['appdb']&&vm.sql.dbs['appdb'].tables['students']; var s=JSON.stringify(t?t.rows:[]); return {ok:s.indexOf('alice')>=0&&s.indexOf('bob')>=0&&s.indexOf('carol')>=0, msg:'数据缺名字'}; }},
    {d:'appuser 能查询到数据', p:25, f:function(vm){ var r=E.sqlRun(vm,'SELECT * FROM students;','appuser','appdb'); return {ok:r.lines.join('\n').indexOf('alice')>=0, msg:'用 appuser 查一次试试'}; }}
  ],
  solution:[
    {c:'mysql appdb -e "CREATE TABLE students (id INT, name VARCHAR(50));"'},
    {c:"mysql appdb -e \"INSERT INTO students VALUES (1,'alice'),(2,'bob'),(3,'carol');\""},
    {c:'mysql -u appuser -pAppUser@123 appdb -e "SELECT * FROM students;"'}
  ],
  exam:['full']
},
/* ================= 高可用 ================= */
{
  id:'ha1', mod:'高可用', title:'HAProxy 负载均衡', min:25,
  brief:'两台后端服务器已经有：srv1=127.0.0.1:8081（返回 BACKEND-1），srv2=127.0.0.1:8082（返回 BACKEND-2）。装 HAProxy，让 8080 前端在两者之间轮询，验证两次请求轮流命中两台。',
  hints:['配置文件: /etc/haproxy/haproxy.cfg，用 haproxy -c -f 检查语法','结构: frontend http_front(bind *:8080, default_backend app) + backend app(server srv1 127.0.0.1:8081 check)','启动: systemctl start haproxy；验证: 连敲两次 curl http://localhost:8080/'],
  chips:['apt install -y haproxy','haproxy -c -f /etc/haproxy/haproxy.cfg','systemctl start haproxy','curl -s http://localhost:8080/','curl -s http://localhost:8080/'],
  files:[{p:'/etc/haproxy/haproxy.cfg',t:'HAProxy 配置'}],
  setup:function(vm){
    vm.sim.listeners={ 8081:{tag:'srv1',body:'<!DOCTYPE html><html><body><h1>BACKEND-1</h1></body></html>\n'},
                       8082:{tag:'srv2',body:'<!DOCTYPE html><html><body><h1>BACKEND-2</h1></body></html>\n'} };
  },
  checks:[
    {d:'HAProxy 已安装并在运行', p:20, f:function(vm){ var s=vm.svcs['haproxy']; return !!(vm.pkgs['haproxy']&&s&&s.running); }},
    {d:'配置文件语法检查通过', p:15, f:function(vm){ return L(vm,'haproxy -c -f /etc/haproxy/haproxy.cfg').code===0; }},
    {d:'curl :8080 正常返回 200', p:15, f:function(vm){ var r=http(vm,'http://localhost:8080/'); return {ok:r.status===200, msg:'状态码 '+r.status}; }},
    {d:'多轮请求两台后端都被命中（轮询生效）', p:50, f:function(vm){ var seen={}; for(var i=0;i<6;i++){ var r=http(vm,'http://localhost:8080/'); if(r.status!==200) return {ok:false, msg:'第 '+(i+1)+' 次请求异常: '+r.status}; var b=r.body||''; if(b.indexOf('BACKEND-1')>=0) seen.b1=1; if(b.indexOf('BACKEND-2')>=0) seen.b2=1; } return {ok:!!(seen.b1&&seen.b2), msg:'只命中了 '+(seen.b1?'srv1':(seen.b2?'srv2':'无'))+'——检查 balance roundrobin'}; }}
  ],
  solution:[
    {c:'apt install -y haproxy'},
    {w:['/etc/haproxy/haproxy.cfg','global\n    daemon\n    maxconn 2048\n\ndefaults\n    mode http\n    timeout connect 5s\n    timeout client 30s\n    timeout server 30s\n\nfrontend http_front\n    bind *:8080\n    default_backend app\n\nbackend app\n    balance roundrobin\n    server srv1 127.0.0.1:8081 check\n    server srv2 127.0.0.1:8082 check\n']},
    {c:'haproxy -c -f /etc/haproxy/haproxy.cfg'},
    {c:'systemctl start haproxy'},
    {c:'curl -s http://localhost:8080/'}
  ],
  exam:['std']
},
{
  id:'ha2', mod:'高可用', title:'健康检查：坏节点自动剔除', min:20,
  brief:'srv2（8082）已经宕机连不上了，但 srv1（8081）还好。要求 HAProxy 的两个 server 行都带健康检查（check），让坏的自动被剔除，连续访问 :8080 始终返回 BACKEND-1、不出现 5xx。',
  hints:['给 server 行加上 check 关键字：server srv2 127.0.0.1:8082 check','改完 restart: systemctl restart haproxy','验证要连打多次: curl -s http://localhost:8080/ —— 每次都应返回 BACKEND-1'],
  chips:['haproxy -c -f /etc/haproxy/haproxy.cfg','systemctl restart haproxy','curl -s http://localhost:8080/'],
  files:[{p:'/etc/haproxy/haproxy.cfg',t:'HAProxy 配置'}],
  setup:function(vm){
    E.pkgInstall(vm,'haproxy');
    vm.sim.listeners={ 8081:{tag:'srv1',body:'<!DOCTYPE html><html><body><h1>BACKEND-1</h1></body></html>\n'} }; /* 8082 挂了 */
    vm.write('/etc/haproxy/haproxy.cfg','global\n    daemon\n\ndefaults\n    mode http\n    timeout connect 5s\n    timeout client 30s\n    timeout server 30s\n\nfrontend http_front\n    bind *:8080\n    default_backend app\n\nbackend app\n    balance roundrobin\n    server srv1 127.0.0.1:8081\n    server srv2 127.0.0.1:8082\n');
    L(vm,'systemctl start haproxy');
  },
  checks:[
    {d:'配置里两个 server 都带 check 健康检查', p:30, f:function(vm){ var c=vm.read('/etc/haproxy/haproxy.cfg')||''; var l1=/server\s+srv1[^\n]*check/.test(c), l2=/server\s+srv2[^\n]*check/.test(c); return {ok:l1&&l2, msg:'给 server 行加 check'}; }},
    {d:'连续 5 次请求全部成功且只命中 srv1（坏节点已被剔除）', p:50, f:function(vm){ for(var i=0;i<5;i++){ var r=http(vm,'http://localhost:8080/'); if(r.status!==200) return {ok:false, msg:'第 '+(i+1)+' 次返回 '+r.status+'——坏节点没被剔除'}; if((r.body||'').indexOf('BACKEND-2')>=0) return {ok:false, msg:'命中了会宕机的 srv2'}; } return true; }},
    {d:'HAProxy 运行中 + 配置检查通过', p:20, f:function(vm){ var s=vm.svcs['haproxy']; return {ok:!!(s&&s.running)&&L(vm,'haproxy -c -f /etc/haproxy/haproxy.cfg').code===0, msg:''}; }}
  ],
  solution:[
    {w:['/etc/haproxy/haproxy.cfg','global\n    daemon\n\ndefaults\n    mode http\n    timeout connect 5s\n    timeout client 30s\n    timeout server 30s\n\nfrontend http_front\n    bind *:8080\n    default_backend app\n\nbackend app\n    balance roundrobin\n    server srv1 127.0.0.1:8081 check\n    server srv2 127.0.0.1:8082 check\n']},
    {c:'systemctl restart haproxy'},
    {c:'curl -s http://localhost:8080/'}
  ],
  exam:['full']
},
/* ================= 机房管理 ================= */
{
  id:'room1', mod:'机房', title:'标准化基线：主机名/时区/日志轮转', min:20,
  brief:'把服务器标准化为机房标准: ① 主机名 room-srv1；② 时区 Asia/Shanghai；③ 为 /var/log/room/*.log 配置日志轮转——每天轮转、保留 7 份（配置文件 /etc/logrotate.d/room）。',
  hints:['主机名: hostnamectl set-hostname room-srv1','时区: timedatectl set-timezone Asia/Shanghai','轮转文件里要有 /var/log/room/*.log 和 daily、rotate 7 两个指令'],
  chips:['hostnamectl set-hostname room-srv1','timedatectl set-timezone Asia/Shanghai','date','logrotate -d /etc/logrotate.d/room'],
  files:[{p:'/etc/logrotate.d/room',t:'日志轮转配置'}],
  setup:function(vm){},
  checks:[
    {d:'主机名 = room-srv1', p:20, f:function(vm){ return {ok:vm.hostname==='room-srv1'&&(vm.read('/etc/hostname')||'').indexOf('room-srv1')>=0, msg:'用 hostnamectl set-hostname'}; }},
    {d:'时区 = Asia/Shanghai', p:20, f:function(vm){ return {ok:vm.timezone==='Asia/Shanghai'&&(vm.read('/etc/timezone')||'').indexOf('Asia/Shanghai')>=0, msg:'用 timedatectl set-timezone'}; }},
    {d:'/etc/logrotate.d/room 已创建', p:15, f:function(vm){ return vm.exists('/etc/logrotate.d/room'); }},
    {d:'轮转策略含 daily（每天）', p:15, f:function(vm){ var c=vm.read('/etc/logrotate.d/room')||''; return /^\s*daily/m.test(c); }},
    {d:'轮转策略含 rotate 7（保留 7 份）', p:15, f:function(vm){ var c=vm.read('/etc/logrotate.d/room')||''; return /rotate\s+7/.test(c); }},
    {d:'logrotate -d 校验通过', p:15, f:function(vm){ var r=L(vm,'logrotate -d /etc/logrotate.d/room'); return {ok:r.code===0&&tx(r).indexOf('rotating pattern')>=0, msg:'文件格式或路径有问题'}; }}
  ],
  solution:[
    {c:'hostnamectl set-hostname room-srv1'},
    {c:'timedatectl set-timezone Asia/Shanghai'},
    {w:['/etc/logrotate.d/room','/var/log/room/*.log {\n    daily\n    rotate 7\n    compress\n    missingok\n    notifempty\n}\n']},
    {c:'logrotate -d /etc/logrotate.d/room'}
  ],
  exam:['full']
},
{
  id:'room2', mod:'机房', title:'账号与作业目录（粘滞位）', min:20,
  brief:'机房实操标准配置: ① 建班级组 class1，学生账号 stu01、stu02 加入（要有家目录）；② 教师账号 teacher 加入 wheel 组；③ 作业收集目录 /srv/share/homework 权限设为 1777（粘滞位：学生只能删自己的文件）。',
  hints:['useradd -m -G class1 stu01','usermod -aG wheel teacher','chmod 1777 /srv/share/homework —— 1 就是粘滞位'],
  chips:['groupadd class1','useradd -m -G class1 stu01','useradd -m -G class1 stu02','usermod -aG wheel teacher','chmod 1777 /srv/share/homework','ls -ld /srv/share/homework'],
  files:[],
  setup:function(vm){},
  checks:[
    {d:'组 class1 存在且含 stu01、stu02', p:25, f:function(vm){ var g=vm.groups['class1']; return {ok:!!(g&&g.members.indexOf('stu01')>=0&&g.members.indexOf('stu02')>=0), msg:'成员: '+(g?g.members.join(','):'-')}; }},
    {d:'teacher 已加入 wheel 组', p:20, f:function(vm){ return !!(vm.groups['wheel']&&vm.groups['wheel'].members.indexOf('teacher')>=0); }},
    {d:'/srv/share/homework 权限为 1777', p:30, f:function(vm){ var st=vm.statOf('/srv/share/homework'); return {ok:!!(st&&st.dir&&st.m===0o1777), msg:'当前 '+(st?E.modeStr(st.m):'-')}; }},
    {d:'stu01 / stu02 家目录已创建', p:25, f:function(vm){ return {ok:!!(vm.users['stu01']&&vm.isDir('/home/stu01'))&&!!(vm.users['stu02']&&vm.isDir('/home/stu02')), msg:'useradd 要加 -m'}; }}
  ],
  solution:[
    {c:'groupadd class1'},
    {c:'useradd -m -G class1 stu01'},
    {c:'useradd -m -G class1 stu02'},
    {c:'useradd -m teacher'},
    {c:'usermod -aG wheel teacher'},
    {c:'mkdir -p /srv/share/homework'},
    {c:'chmod 1777 /srv/share/homework'}
  ],
  exam:['full']
},
{
  id:'room3', mod:'机房', title:'自动化巡检脚本', min:25,
  brief:'写一个机房巡检脚本 /usr/local/bin/room-check.sh，至少检查三项：磁盘(用 df)、服务(用 systemctl is-active 检查 sshd)、时间(用 date)，输出要人话；加执行权限并保证能跑通。',
  hints:['脚本就是按顺序写命令，echo 输出标题','检查服务: systemctl is-active sshd —— 输出 active 或 inactive','改完 chmod +x 再直接跑: /usr/local/bin/room-check.sh'],
  chips:['nano /usr/local/bin/room-check.sh','chmod +x /usr/local/bin/room-check.sh','/usr/local/bin/room-check.sh'],
  files:[{p:'/usr/local/bin/room-check.sh',t:'巡检脚本'}],
  setup:function(vm){},
  checks:[
    {d:'脚本存在且有执行权限', p:25, f:function(vm){ var st=vm.statOf('/usr/local/bin/room-check.sh'); return {ok:!!(st&&!st.dir&&(st.m&0o111)), msg:'chmod +x 加上执行权限'}; }},
    {d:'脚本能跑通（exit 0）', p:20, f:function(vm){ var r=L(vm,'sh /usr/local/bin/room-check.sh'); return {ok:r.code===0, msg:'运行报错了，检查内容'}; }},
    {d:'输出包含磁盘检查', p:15, f:function(vm){ var r=L(vm,'sh /usr/local/bin/room-check.sh'); return tx(r).indexOf('磁盘')>=0; }},
    {d:'输出包含服务检查', p:20, f:function(vm){ var r=L(vm,'sh /usr/local/bin/room-check.sh'); return /服务|sshd|active/i.test(tx(r)); }},
    {d:'输出包含时间检查', p:20, f:function(vm){ var r=L(vm,'sh /usr/local/bin/room-check.sh'); return /时间|20\d\d/.test(tx(r)); }}
  ],
  solution:[
    {w:['/usr/local/bin/room-check.sh','#!/bin/sh\necho "== 磁盘检查 =="\ndf -h /\necho "== 服务检查 =="\nsystemctl is-active sshd\necho "== 时间检查 =="\ndate\n']},
    {c:'chmod +x /usr/local/bin/room-check.sh'},
    {c:'/usr/local/bin/room-check.sh'}
  ],
  exam:['full']
},
/* ================= 系统与安全 ================= */
{
  id:'sys1', mod:'系统', title:'账号规划 + SSH 安全加固', min:25,
  brief:'① 建运维账号 deploy（带家目录）；② SSH 加固: 禁止 root 直接登录、禁止密码登录、启用密钥登录；③ 给 root 放一个公钥（内容随意，格式类似 ssh-ed25519 AAAA... 即可）；④ 用 sshd -t 验证配置合法。',
  hints:['配置项: PermitRootLogin no / PasswordAuthentication no / PubkeyAuthentication yes','authorized_keys 路径: /root/.ssh/authorized_keys，权限 600 更标准','改完记得 sshd -t 验证一遍（比赛评分就这么查）'],
  chips:['useradd -m deploy','nano /etc/ssh/sshd_config','sshd -t','systemctl restart sshd'],
  files:[{p:'/etc/ssh/sshd_config',t:'SSH 配置'},{p:'/root/.ssh/authorized_keys',t:'公钥文件'}],
  setup:function(vm){},
  checks:[
    {d:'deploy 用户已创建（含家目录）', p:15, f:function(vm){ return !!(vm.users['deploy']&&vm.isDir('/home/deploy')); }},
    {d:'PermitRootLogin no（禁止 root 直登）', p:20, f:function(vm){ return /^\s*PermitRootLogin\s+no\s*$/m.test(vm.read('/etc/ssh/sshd_config')||''); }},
    {d:'PasswordAuthentication no（禁密码登录）', p:20, f:function(vm){ return /^\s*PasswordAuthentication\s+no\s*$/m.test(vm.read('/etc/ssh/sshd_config')||''); }},
    {d:'PubkeyAuthentication yes（启用密钥）', p:15, f:function(vm){ return /^\s*PubkeyAuthentication\s+yes\s*$/m.test(vm.read('/etc/ssh/sshd_config')||''); }},
    {d:'authorized_keys 里放了公钥', p:20, f:function(vm){ return (vm.read('/root/.ssh/authorized_keys')||'').indexOf('ssh-')>=0; }},
    {d:'sshd -t 配置检查通过', p:10, f:function(vm){ return L(vm,'sshd -t').code===0; }}
  ],
  solution:[
    {c:'useradd -m deploy'},
    {w:['/etc/ssh/sshd_config','Port 22\nPermitRootLogin no\nPasswordAuthentication no\nPubkeyAuthentication yes\nAuthorizedKeysFile .ssh/authorized_keys\n']},
    {w:['/root/.ssh/authorized_keys','ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILabFakeKeyForSimulator0000000000000000000000 admin@srv1\n']},
    {c:'chmod 600 /root/.ssh/authorized_keys'},
    {c:'sshd -t'}
  ],
  exam:['full']
},
{
  id:'fw1', mod:'安全', title:'防火墙最小放行', min:15,
  brief:'装 ufw 防火墙：默认禁止外部主动连入，但放行 22（SSH）、80（HTTP）、443（HTTPS）三个端口，然后启用。用 ufw status 看到三条 ALLOW 规则。',
  hints:['ufw 的坑：启用前先把 22 放行了，否则你会把自己锁在门外','写全这么写更清楚: ufw allow 22/tcp','最后一步才是 ufw enable'],
  chips:['apt install -y ufw','ufw allow 22/tcp','ufw allow 80','ufw allow 443','ufw enable','ufw status numbered'],
  files:[],
  setup:function(vm){},
  checks:[
    {d:'防火墙已启用', p:30, f:function(vm){ return {ok:!!(vm.fw.active&&vm.fw.tool==='ufw'), msg:'还差 ufw enable'}; }},
    {d:'已放行 22（SSH）', p:20, f:function(vm){ return !!vm.fw.rules.filter(function(r){return r.port===22&&r.action==='ALLOW';}).length; }},
    {d:'已放行 80（HTTP）', p:20, f:function(vm){ return !!vm.fw.rules.filter(function(r){return r.port===80&&r.action==='ALLOW';}).length; }},
    {d:'已放行 443（HTTPS）', p:20, f:function(vm){ return !!vm.fw.rules.filter(function(r){return r.port===443&&r.action==='ALLOW';}).length; }},
    {d:'没有误封业务端口（80/443 未被 deny）', p:10, f:function(vm){ return !vm.fw.rules.filter(function(r){ return (r.port===80||r.port===443)&&r.action==='DENY'; }).length; }}
  ],
  solution:[
    {c:'apt install -y ufw'},
    {c:'ufw allow 22/tcp'},
    {c:'ufw allow 80'},
    {c:'ufw allow 443'},
    {c:'ufw enable'},
    {c:'ufw status'}
  ],
  exam:['mini']
},
/* ================= 运维自动化 ================= */
{
  id:'bak1', mod:'运维', title:'备份脚本 + 定时任务', min:25,
  brief:'写 /opt/backup.sh：把 /srv/site 打包备份到 /backup/（文件名带日期，如 site-20260920.tar.gz；/backup 目录不存在要自动建）；加执行权限、手动跑通一次；最后配 crontab 每天凌晨 3 点自动执行。',
  hints:['打包命令: tar czf /backup/site-$(date +%Y%m%d).tar.gz /srv/site（模拟器支持 $(date …) 替换）','crontab -e 打开的就是 root 的计划表，写: 0 3 * * * /opt/backup.sh','crontab -l 检查写没写进去'],
  chips:['nano /opt/backup.sh','chmod +x /opt/backup.sh','sh /opt/backup.sh','crontab -e','crontab -l'],
  files:[{p:'/opt/backup.sh',t:'备份脚本'},{p:'/var/spool/cron/crontabs/root',t:'crontab 计划表'}],
  setup:function(vm){
    vm.write('/srv/site/index.html','<h1>BACKUP ME</h1>\n');
  },
  checks:[
    {d:'备份脚本存在且有执行权限', p:20, f:function(vm){ var st=vm.statOf('/opt/backup.sh'); return {ok:!!(st&&(st.m&0o111)), msg:'别忘了 chmod +x'}; }},
    {d:'/backup 下已生成日期命名的备份包', p:30, f:function(vm){ var ok=vm.children('/backup').filter(function(f){ return /^site-.*\.tar\.gz$/.test(f); }).length>0; return {ok:ok, msg:'手动跑一次脚本验证'}; }},
    {d:'crontab 已配置 backup.sh 任务', p:30, f:function(vm){ var c=vm.read('/var/spool/cron/crontabs/root')||''; return {ok:c.indexOf('backup.sh')>=0, msg:'crontab -e 里写 0 3 * * * /opt/backup.sh'}; }},
    {d:'任务时间 = 每天 03:00 执行', p:20, f:function(vm){ var c=vm.read('/var/spool/cron/crontabs/root')||''; return /0\s+3\s+\*\s+\*\s+\*/.test(c); }}
  ],
  solution:[
    {w:['/opt/backup.sh','#!/bin/sh\nmkdir -p /backup\ntar czf /backup/site-$(date +%Y%m%d).tar.gz /srv/site\necho "backup done"\n']},
    {c:'chmod +x /opt/backup.sh'},
    {c:'sh /opt/backup.sh'},
    {w:['/var/spool/cron/crontabs/root','# 每天凌晨 3 点备份站点\n0 3 * * * /opt/backup.sh\n']},
    {c:'crontab -l'}
  ],
  exam:['std']
},
{
  id:'docker1', mod:'容器', title:'容器化部署网站', min:25,
  brief:'装 Docker 并启动；用 nginx 镜像跑一个容器：名字 web，宿主 8080 映射到容器 80，把 /srv/site 目录挂载进容器充当网站根目录；最后 curl :8080 验证返回 CONTAINER SITE。',
  hints:['一句话拉起: docker run -d --name web -p 8080:80 -v /srv/site:/usr/share/nginx/html nginx','忘了启动守护进程会报 Cannot connect to the Docker daemon','验证: curl -s http://localhost:8080/'],
  chips:['apt install -y docker.io','systemctl start docker','docker run -d --name web -p 8080:80 -v /srv/site:/usr/share/nginx/html nginx','docker ps','curl -s http://localhost:8080/'],
  files:[{p:'/srv/site/index.html',t:'站点首页'}],
  setup:function(vm){ vm.write('/srv/site/index.html','<h1>CONTAINER SITE</h1>\n'); },
  checks:[
    {d:'Docker 已安装且守护进程在运行', p:20, f:function(vm){ var s=vm.svcs['docker']; return !!(vm.pkgs['docker.io']&&s&&s.running); }},
    {d:'容器 web 正在运行', p:20, f:function(vm){ var c=vm.docker.containers['web']; return {ok:!!(c&&c.running), msg:'docker ps 看看有没有它'}; }},
    {d:'8080 端口可访问（状态 200）', p:30, f:function(vm){ var r=http(vm,'http://localhost:8080/'); return {ok:r.status===200, msg:'状态码 '+r.status+'——检查端口映射 -p 8080:80'}; }},
    {d:'页面内容来自挂载目录（CONTAINER SITE）', p:30, f:function(vm){ var r=http(vm,'http://localhost:8080/'); return {ok:(r.body||'').indexOf('CONTAINER SITE')>=0, msg:'检查 -v /srv/site:/usr/share/nginx/html'}; }}
  ],
  solution:[
    {c:'apt install -y docker.io'},
    {c:'systemctl start docker'},
    {c:'docker run -d --name web -p 8080:80 -v /srv/site:/usr/share/nginx/html nginx'},
    {c:'docker ps'},
    {c:'curl -s http://localhost:8080/'}
  ],
  exam:['std']
},
{
  id:'ans1', mod:'自动化', title:'Ansible 剧本与幂等', min:25,
  brief:'装 ansible；写剧本 /root/site.yml，确保 nginx 已安装并处于运行状态；对 srv1 执行剧本两次——第二次必须 changed=0（幂等的意义）。',
  hints:['剧本骨架: - hosts: all / tasks: / - name: xxx / apt: name=nginx state=present','再补一个 service 任务: service: name=nginx state=started','连跑两次: ansible-playbook /root/site.yml —— 第二次看 PLAY RECAP'],
  chips:['apt install -y ansible-core','nano /root/site.yml','ansible-playbook /root/site.yml','ansible-playbook /root/site.yml'],
  files:[{p:'/root/site.yml',t:'Ansible 剧本'}],
  setup:function(vm){},
  checks:[
    {d:'nginx 已安装并正在运行（剧本目标达成）', p:25, f:function(vm){ var s=vm.svcs['nginx']; return {ok:!!(vm.pkgs['nginx']&&s&&s.running), msg:'先让剧本跑出效果'}; }},
    {d:'剧本已执行至少两次', p:25, f:function(vm){ return {ok:!!(vm.ansible&&vm.ansible.runs>=2), msg:'再跑一遍：ansible-playbook /root/site.yml'}; }},
    {d:'第二次执行 changed=0（幂等）', p:40, f:function(vm){ return {ok:!!(vm.ansible&&vm.ansible.last&&vm.ansible.last.changed===0&&vm.ansible.last.failed===0), msg:'最后一遍还有变更——检查任务写法和状态'}; }},
    {d:'剧本没有失败任务', p:10, f:function(vm){ return !!(vm.ansible&&vm.ansible.last&&vm.ansible.last.failed===0); }}
  ],
  solution:[
    {c:'apt install -y ansible-core'},
    {w:['/root/site.yml','- hosts: all\n  tasks:\n    - name: ensure nginx installed\n      apt:\n        name: nginx\n        state: present\n    - name: ensure nginx running\n      service:\n        name: nginx\n        state: started\n']},
    {c:'ansible-playbook /root/site.yml'},
    {c:'ansible-playbook /root/site.yml'}
  ],
  exam:['full']
},
{
  id:'ldap1', mod:'目录', title:'OpenLDAP：目录服务入门', min:25,
  brief:'装 slapd 并启动；写一个 LDIF 文件建目录树：base=dc=example,dc=com、OU=people、用户 alice；用 ldapadd 导入、ldapsearch 验证能查到 alice。',
  hints:['LDIF 用空行分隔条目，每条从 dn: 开始','导入: ldapadd -x -f /root/base.ldif','验证: ldapsearch -x -b "dc=example,dc=com" "(uid=alice)"'],
  chips:['apt install -y slapd','systemctl start slapd','nano /root/base.ldif','ldapadd -x -f /root/base.ldif','ldapsearch -x -b "dc=example,dc=com" "(uid=alice)"'],
  files:[{p:'/root/base.ldif',t:'LDIF 文件'}],
  setup:function(vm){},
  checks:[
    {d:'slapd 已安装并在运行', p:20, f:function(vm){ var s=vm.svcs['slapd']; return !!(vm.pkgs['slapd']&&s&&s.running); }},
    {d:'基础域 dc=example,dc=com 已建立', p:20, f:function(vm){ return vm.ldapE.filter(function(e){return e.dn.toLowerCase()==='dc=example,dc=com';}).length>0; }},
    {d:'OU=people 已建立', p:20, f:function(vm){ return vm.ldapE.filter(function(e){return /ou=people/i.test(e.dn);}).length>0; }},
    {d:'ldapsearch 能查到用户 alice', p:40, f:function(vm){ var r=E.ldapSearch(vm,'dc=example,dc=com','(uid=alice)'); return {ok:r.lines.join('\n').indexOf('alice')>=0, msg:'导入或搜索语法有问题'}; }}
  ],
  solution:[
    {c:'apt install -y slapd'},
    {c:'systemctl start slapd'},
    {w:['/root/base.ldif','dn: dc=example,dc=com\nobjectClass: dcObject\nobjectClass: organization\no: Example Org\ndc: example\n\ndn: ou=people,dc=example,dc=com\nobjectClass: organizationalUnit\nou: people\n\ndn: uid=alice,ou=people,dc=example,dc=com\nobjectClass: inetOrgPerson\nuid: alice\ncn: Alice Zhang\nsn: Zhang\n']},
    {c:'ldapadd -x -f /root/base.ldif'},
    {c:'ldapsearch -x -b "dc=example,dc=com" "(uid=alice)"'}
  ],
  exam:['full']
},
{
  id:'samba1', mod:'共享', title:'Samba 文件共享', min:25,
  brief:'装 samba；配两个共享: [public] 指向 /srv/public（允许访客读），[homework] 指向 /srv/share/homework（仅 class1 组可写）；用 testparm 验证配置。',
  hints:['smb.conf 结构: [共享名] 下面写 path= / browseable= / read only= / valid users=','组用户写法: valid users = @class1','验证: testparm -s 输出 Loaded services file OK 才算过'],
  chips:['apt install -y samba','nano /etc/samba/smb.conf','testparm -s','systemctl start smbd'],
  files:[{p:'/etc/samba/smb.conf',t:'Samba 配置'}],
  setup:function(vm){},
  checks:[
    {d:'smbd 已安装并在运行', p:15, f:function(vm){ var s=vm.svcs['smbd']; return !!(vm.pkgs['samba']&&s&&s.running); }},
    {d:'共享 [public] 配置正确（指向 /srv/public）', p:25, f:function(vm){ var c=vm.read('/etc/samba/smb.conf')||''; return /\[public\][\s\S]*?path\s*=\s*\/srv\/public/.test(c); }},
    {d:'共享 [homework] 配置正确（指向 /srv/share/homework）', p:25, f:function(vm){ var c=vm.read('/etc/samba/smb.conf')||''; return /\[homework\][\s\S]*?path\s*=\s*\/srv\/share\/homework/.test(c); }},
    {d:'homework 限制为 class1 组可访问', p:15, f:function(vm){ var c=vm.read('/etc/samba/smb.conf')||''; return /\[homework\][\s\S]*?valid users\s*=\s*@class1/.test(c); }},
    {d:'testparm 校验通过', p:20, f:function(vm){ var r=L(vm,'testparm -s'); return {ok:r.code===0&&tx(r).indexOf('Loaded services file OK')>=0, msg:tx(r).slice(0,160)}; }}
  ],
  solution:[
    {c:'apt install -y samba'},
    {w:['/etc/samba/smb.conf','[global]\n   workgroup = WORKGROUP\n   server string = %h server\n   map to guest = bad user\n   dns proxy = no\n\n[public]\n   path = /srv/public\n   browseable = yes\n   read only = yes\n   guest ok = yes\n\n[homework]\n   path = /srv/share/homework\n   browseable = yes\n   read only = no\n   valid users = @class1\n']},
    {c:'mkdir -p /srv/public /srv/share/homework'},
    {c:'testparm -s'},
    {c:'systemctl start smbd'}
  ],
  exam:['full']
}
];
function sqGrantCheck(vm){
  var u=vm.sql.u['appuser'];
  if(!u) return false;
  return u.grants.some(function(g){ return g.db==='appdb'&&String(g.privs).toUpperCase().indexOf('ALL')===0; });
}
var BY={};
for(var i=0;i<SCN.length;i++) BY[SCN[i].id]=SCN[i];
E.SCENARIOS=SCN; E.SCENARIO_BY_ID=BY;
E.scenarioNew=function(vm,id){
  var s=BY[id]; if(!s) return null;
  vm.scenario=s;
  if(s.setup) s.setup(vm);
  return s;
};
E.EXAM_PAPERS=[
  {id:'mini', t:'⚡ 迷你模拟', dur:30, desc:'3 个基础任务 · 30 分钟 · 体验比赛节奏', ids:['web1','db1','fw1']},
  {id:'std',  t:'🎯 标准模拟', dur:90, desc:'5 个进阶任务 · 90 分钟 · 向省赛看齐', ids:['dns1','web3','ha1','bak1','docker1']},
  {id:'full', t:'🏆 全真模拟（4 小时）', dur:240, desc:'8 个任务 · 4 小时 · 世界赛 Module 风格', ids:['sys1','dns2','web2','ldap1','samba1','ha2','ans1','room3']},
  {id:'fix', t:'🛠 排障特训', dur:45, desc:'3 个急诊任务 · 45 分钟 · 比赛抢分神器', ids:['fix1','fix2','fix3']}
];
E.examById=function(id){ for(var i=0;i<E.EXAM_PAPERS.length;i++) if(E.EXAM_PAPERS[i].id===id) return E.EXAM_PAPERS[i]; return null; };
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));
if(typeof module!=='undefined'&&module.exports) module.exports=globalThis.LabEngine;
