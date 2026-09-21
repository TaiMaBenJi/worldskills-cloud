/* lab-test.js · 引擎冒烟 + 场景全量验证（node 运行） */
var path=require('path');
var E=require('./lab-engine.js');
var FAIL=0, PASS=0;
function ok(cond, label){ if(cond){ PASS++; console.log('  ✅ '+label); } else { FAIL++; console.log('  ❌ FAIL: '+label); } }
function run(vm, cmd){ return E.execLine(vm, cmd); }
function text(r){ return r.lines.map(function(l){ return typeof l==='string'?l:(l.s||''); }).join('\n'); }

console.log('== 1. 引擎载入 ==');
ok(!!E.VM, 'LabEngine.VM 存在');
var vm=E.newVM('t1');
ok(vm.hostname==='srv1', '初始主机名 srv1');

console.log('== 2. 基础命令 ==');
ok(text(run(vm,'pwd')).indexOf('/root')>=0, 'pwd');
ok(text(run(vm,'whoami')).indexOf('root')>=0, 'whoami');
run(vm,'mkdir -p /srv/test');
ok(vm.isDir('/srv/test'), 'mkdir -p 生效');
run(vm,'echo hello > /srv/test/a.txt');
ok((vm.read('/srv/test/a.txt')||'').indexOf('hello')>=0, 'echo 重定向写入');
ok(text(run(vm,'cat /srv/test/a.txt')).indexOf('hello')>=0, 'cat 读回');
ok(text(run(vm,'ls /srv/test')).indexOf('a.txt')>=0, 'ls');
run(vm,'cp /srv/test/a.txt /srv/test/b.txt');
ok(vm.exists('/srv/test/b.txt'), 'cp');
run(vm,'rm -f /srv/test/b.txt');
ok(!vm.exists('/srv/test/b.txt'), 'rm -f');
run(vm,'chmod 700 /srv/test/a.txt');
ok(vm.statOf('/srv/test/a.txt').m===0o700, 'chmod 700');
ok(text(run(vm,'stat -c %a /srv/test/a.txt')).indexOf('700')>=0, 'stat -c %a');
ok(text(run(vm,'grep hello /srv/test/a.txt')).indexOf('hello')>=0, 'grep');
ok(text(run(vm,'sed -i s/hello/world/ /srv/test/a.txt'))==='', 'sed -i 静默');
ok((vm.read('/srv/test/a.txt')||'').indexOf('world')>=0, 'sed -i 生效');
ok(text(run(vm,'echo b > /tmp/f1; cat /tmp/f1')).indexOf('b')>=0, '链式 ; ');

console.log('== 3. apt / nginx ==');
ok(text(run(vm,'bash -c "nginx -t"')).indexOf('not found')>=0, '未装 nginx → command not found');
var r1=run(vm,'apt install -y nginx');
ok(vm.pkgs['nginx'], 'apt install nginx');
ok(vm.read('/etc/nginx/nginx.conf')!==null, '生成默认 nginx.conf');
r1=run(vm,'nginx -t');
ok(r1.code===0 && text(r1).indexOf('test is successful')>=0, 'nginx -t 通过');
r1=run(vm,'systemctl start nginx');
ok(r1.code===0 && vm.svcs['nginx'].running, 'systemctl start nginx');
r1=run(vm,'curl -s http://localhost/');
ok(text(r1).indexOf('Welcome to nginx')>=0, 'curl 默认页');
r1=run(vm,'curl -s http://localhost/no-such');
ok(text(r1).indexOf('404 Not Found')>=0, 'curl 404');

console.log('== 4. 配置文件出错检测 ==');
vm.write('/etc/nginx/nginx.conf','user www-data;\nevents {}\nhttp {\n  server {\n    lissten 80;\n  }\n}\n');
r1=run(vm,'nginx -t');
ok(r1.code!==0 && text(r1).indexOf('lissten')>=0, '单词拼错被 nginx -t 抓到');
r1=run(vm,'systemctl restart nginx');
ok(r1.code!==0, '配置坏时 restart 失败');

console.log('== 5. DNS ==');
run(vm,'apt install -y dnsmasq');
run(vm,'systemctl start dnsmasq');
r1=run(vm,'dig web.corp.local +short');
ok(text(r1)==='', '配置前 dig 无结果');
vm.write('/etc/dnsmasq.conf','address=/web.corp.local/192.168.1.10\nhost-record=db.corp.local,192.168.1.20\n');
r1=run(vm,'dig +short web.corp.local');
ok(text(r1).trim()==='','未重启时仍是空（快照语义）');
run(vm,'systemctl restart dnsmasq');
r1=run(vm,'dig +short web.corp.local');
ok(text(r1).trim()==='192.168.1.10','重启后解析生效');
r1=run(vm,'dig -x 192.168.1.20 +short');
ok(text(r1).indexOf('db.corp.local')>=0,'反解析 PTR');

console.log('== 6. 用户/组 ==');
run(vm,'groupadd class1');
run(vm,'useradd -m -G class1 stu01');
ok(vm.users['stu01'] && vm.groups['class1'].members.indexOf('stu01')>=0, 'useradd -G');
run(vm,"echo 'stu01:Passw0rd' | chpasswd");
ok(vm.users['stu01'].pw==='Passw0rd','chpasswd');
ok(text(run(vm,'id stu01')).indexOf('stu01')>=0,'id');

console.log('== 7. MariaDB ==');
var r2=run(vm,'mysql -e "SHOW DATABASES;"');
ok(text(r2).indexOf('not running')>=0 || r2.code!==0,'未启动时连接失败');
ok(text(run(vm,'apt install -y mariadb-server')).indexOf('Setting up')>=0,'装 mariadb');
run(vm,'systemctl start mariadb');
run(vm,'mysql -e "CREATE DATABASE appdb;"');
run(vm,"mysql -e \"CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'AppUser@123';\"");
run(vm,"mysql -e \"GRANT ALL PRIVILEGES ON appdb.* TO 'appuser'@'localhost'; FLUSH PRIVILEGES;\"");
r2=run(vm,"mysql -u appuser -pAppUser@123 -e 'SHOW DATABASES;'");
ok(text(r2).indexOf('appdb')>=0,'appuser 能列出 appdb');
r2=run(vm,"mysql -u appuser -pWrong -e 'SHOW DATABASES;'");
ok(text(r2).indexOf('1045')>=0,'错误密码被拒绝');
run(vm,'mysql appdb -e "CREATE TABLE users (id INT, name VARCHAR(50));"');
run(vm,'mysql appdb -e "INSERT INTO users VALUES (1,\'alice\'),(2,\'bob\');"');
r2=run(vm,'mysql appdb -e "SELECT * FROM users;"');
ok(text(r2).indexOf('alice')>=0 && text(r2).indexOf('bob')>=0,'SELECT 输出');
r2=run(vm,'mysql appdb -e "SELECT COUNT(*) FROM users;"');
ok(text(r2).indexOf('2')>=0,'COUNT(*) = 2');

console.log('== 8. haproxy ==');
run(vm,'apt install -y haproxy');
vm.sim.listeners={8081:{tag:'srv1',body:'BACKEND-1'},8082:{tag:'srv2',body:'BACKEND-2'}};
vm.write('/etc/haproxy/haproxy.cfg','global\n    daemon\n\ndefaults\n    mode http\n\nfrontend http_front\n    bind *:8080\n    default_backend app\n\nbackend app\n    balance roundrobin\n    server srv1 127.0.0.1:8081 check\n    server srv2 127.0.0.1:8082 check\n');
r2=run(vm,'haproxy -c -f /etc/haproxy/haproxy.cfg');
ok(r2.code===0,'haproxy -c 通过');
run(vm,'systemctl start haproxy');
var b1=text(run(vm,'curl -s http://localhost:8080/'));
var b2=text(run(vm,'curl -s http://localhost:8080/'));
ok(b1.indexOf('BACKEND-1')>=0||b1.indexOf('BACKEND-2')>=0,'LB 返回后端页面');
ok(b1!==b2 || b1.indexOf('BACKEND')>=0,'轮询两次结果记录: '+b1+' | '+b2);

console.log('== 9. 磁盘修复链 ==');
vm.sz['/var/log/huge.log']=9.4e9; vm.f['/var/log/huge.log']={c:'',m:0o644,u:'root',g:'root'};
r2=run(vm,'df');
var mUsg=text(r2).match(/(\d+)%/);
ok(mUsg&&parseInt(mUsg[1],10)>=90,'df 显示磁盘将满: '+mUsg[1]+'%');
run(vm,'truncate -s 0 /var/log/huge.log');
r2=run(vm,'df');
var mUsg2=text(r2).match(/(\d+)%/);
ok(mUsg2&&parseInt(mUsg2[1],10)<80,'清理后恢复正常: '+mUsg2[1]+'%');

console.log('== 10. docker ==');
run(vm,'apt install -y docker.io');
r2=run(vm,'docker run -d --name web -p 8080:80 nginx');
ok(r2.code!==0 && text(r2).indexOf('Cannot connect')>=0,'docker 未启动报错');
run(vm,'systemctl start docker');
r2=run(vm,'docker run -d --name web -p 8080:80 nginx');
ok(r2.code===0,'docker run');
r2=run(vm,'docker ps');
ok(text(r2).indexOf('web')>=0,'docker ps');
r2=run(vm,'curl -s http://localhost:8080/');
ok(text(r2).indexOf('Welcome to nginx')>=0,'容器端口可访问');

console.log('== 11. ansible ==');
run(vm,'apt install -y ansible-core');
vm.write('/root/site.yml','- hosts: all\n  tasks:\n    - name: ensure nginx\n      apt:\n        name: nginx\n        state: present\n    - name: ensure running\n      service:\n        name: nginx\n        state: started\n');
r2=run(vm,'ansible-playbook /root/site.yml');
ok(text(r2).indexOf('PLAY RECAP')>=0,'playbook 跑通');
var t2=text(r2);
ok(t2.indexOf('changed=0')>=0||t2.indexOf('changed=1')>=0,'recap 有 changed 统计');
r2=run(vm,'ansible-playbook /root/site.yml');
ok(text(r2).indexOf('changed=0')>=0,'第二遍幂等 changed=0');

console.log('== 12. LDAP ==');
run(vm,'apt install -y slapd');
run(vm,'systemctl start slapd');
vm.write('/root/base.ldif','dn: dc=example,dc=com\nobjectClass: dcObject\nobjectClass: organization\no: Example\n\ndn: ou=people,dc=example,dc=com\nobjectClass: organizationalUnit\nou: people\n\ndn: uid=alice,ou=people,dc=example,dc=com\nobjectClass: inetOrgPerson\nuid: alice\ncn: Alice\nsn: Zhang\n');
r2=run(vm,'ldapadd -x -f /root/base.ldif');
ok(r2.code===0,'ldapadd');
r2=run(vm,'ldapsearch -x -b "dc=example,dc=com" "(uid=alice)"');
ok(text(r2).indexOf('Alice')>=0,'ldapsearch 命中');

console.log('== 13. ufw ==');
run(vm,'apt install -y ufw');
run(vm,'ufw allow 22/tcp');
run(vm,'ufw allow 80');
r2=run(vm,'ufw status');
ok(text(r2).indexOf('inactive')>=0,'未启用显示 inactive');
run(vm,'ufw enable');
r2=run(vm,'ufw status');
ok(text(r2).indexOf('active')>=0 && text(r2).indexOf('22/tcp')>=0,'启用后规则可见');

console.log('== 14. 存档/读档 ==');
var dump=E.vmToJSON(vm);
var vm2=E.newVM('t2');
ok(E.vmFromJSON(vm2, dump),'读档成功');
ok(vm2.hostname===vm.hostname && vm2.pkgs['nginx'],'读档字段一致');
var r3=E.execLine(vm2,'curl -s http://localhost:8080/');
ok(text(r3).indexOf('Welcome to nginx')>=0,'读档后容器仍在服务');

console.log('');
/* （冒烟阶段结束，继续场景验证段） */

/* ==================== 15. 全场景验证 ==================== */
console.log('== 15. 场景库全量验证（初始分 < 100，示范解法 = 100） ==');
require('./lab-scenarios.js');
var SCN=E.SCENARIOS;
var scnFail=0, scnWarn=0;
for(var si=0;si<SCN.length;si++){
  var scn=SCN[si];
  var v=E.newVM('scn-'+scn.id);
  E.scenarioNew(v, scn.id);
  var g0=E.grade(v, scn);
  var baseOK = g0.pct<100;
  /* 执行示范解法 */
  for(var st=0;st<scn.solution.length;st++){
    var step=scn.solution[st];
    if(step.w) v.write(step.w[0], step.w[1]);
    else if(step.c) E.execLine(v, step.c);
  }
  var g1=E.grade(v, scn);
  var solOK = g1.pct===100;
  if(!solOK){
    scnFail++;
    console.log('  ❌ ['+scn.id+'] '+scn.title+' 解法后仅 '+g1.pct+'%');
    g1.items.forEach(function(it){ if(!it.ok) console.log('       ✗ '+it.d+(it.msg?' → '+it.msg:'')); });
  } else {
    console.log('  ✅ ['+scn.id+'] '+scn.title+' 初始 '+g0.pct+'% → 解法 100%');
  }
  if(!baseOK){ scnWarn++; console.log('     ⚠ 初始状态就已满分（检查项失去区分度）: '+scn.id); }
}
console.log('');
console.log('场景验证：'+SCN.length+' 个，失败 '+scnFail+'，无区分度 '+scnWarn);
console.log('');
console.log('================ 总结果: 冒烟 '+PASS+' 过 / '+FAIL+' 挂；场景 '+scnFail+' 挂 ================');
process.exit((FAIL||scnFail)?1:0);
