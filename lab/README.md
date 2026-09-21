# lab/ — 应用内模拟实训引擎（模拟实训室）

**组成**
- `lab-engine.js` — 虚拟服务器 VM（文件系统/软件包/服务/用户/网络/MySQL/Docker/Ansible/LDAP）＋类 bash 命令解释器＋评分。纯 JS 无依赖，浏览器/Node 双兼容。
- `lab-scenarios.js` — 22 个实训场景（对标 wsarena 评分点）＋ 4 张模拟赛试卷（mini/std/full/fix）。
- `lab-ui.js` — 终端界面：命令输入、nano 编辑器、评分面板、任务面板、示范演示、模拟赛（计时/交卷/报告）。
- `lab.css` — 终端样式。
- `lab-test.js` — Node 测试：57 项冒烟 + 22 场景「初始分<100 / 解法=100」全量验证。
- `standalone.html` — 浏览器独立预览（开发用）。

**构建**：`build_liquid.py` 会把 lab.css / 三个 js 注入 study.html（占位符 `/*@@LAB_CSS@@*/`、`/*@@LAB_JS@@*/`，构建后 replace，避免 f-string 花括号转义）。随后 `cloudstudy-apk/tools/rebuild_apk.sh` 全量重建 APK。

**测试**：`cd lab && node lab-test.js` （要求全绿再重建！）

**开发坑（重要）**
- 浏览器**缓存子资源**：改了 js 后预览，必须换文件名（cp 成 `lab-ui-v3.js` 之类）+ 换页面文件名才能确保加载新版；`?v=` 只对页面本身有效，管不住 <script src>。
- study.html 里所有 JS 是**同一朵 <script>**：lab 代码追加在主脚本之后，允许使用主脚本的 `addXP/unlockBadge/renderLabCenter/startSim` 等全局函数。
- `lab-ui.js` 在 node 下直接 return（无 DOM）；浏览器在 DOMContentLoaded 时 `init()`，务必确认 `window._labUIBound===1` 再交互（外部脚本加载有竞态）。
- 评分对勾（自动）在每条命令后静默执行；正式领奖在「📊 评分」按钮。
- 存档：`wg.lsv.<场景id>`（VM 快照）、`wg.labprog`（最佳分）、`wg.exam`/`wg.exams`（模拟赛）。
