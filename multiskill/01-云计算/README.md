# ☁️ 01 · 云计算模块（WorldSkills Skill 39）

本赛项的完整资料就在本仓库主线里：

| 想做什么 | 去哪 |
|----------|------|
| 系统学教程（20 章保姆级） | [`../../docs/tutorial/00-开始之前-零基础先读我.md`](../../docs/tutorial/00-开始之前-零基础先读我.md) |
| 浏览器内实训（22 场景自动评分） | [`../../lab/standalone.html`](../../lab/standalone.html) |
| 刷韩国真题（2021-2025 中文版） | [`../../exam/korea-zh/`](../../exam/korea-zh/) |
| **真机 WSL 实操训练场**（本项目特色） | [`../cloud-lab/mission.md`](../cloud-lab/mission.md) |

## cloud-lab 是什么

`multiskill/cloud-lab/` 是在一台真 Ubuntu 22.04（WSL2）上运转的迷你训练场：

- `build_lb.sh` —— 一键重建"迷你高可用平台"：nginx 443 HTTPS → 负载均衡轮询 → 两个后端容器
- `mission.md` + `grad.sh` —— 32 分制模拟赛题（用户与权限 / Web 服务 / 自动化备份 / 容器化部署），评分脚本自动判分
- `drills.md` + `make_fault.sh` + `check_lb.sh` —— 三起"生产事故"排错演练（注入故障 → 排查 → 体检）
- `参考答案/` —— 各任务的参考实现（防剧透，先做后看）

使用方式见 [`../cloud-lab/mission.md`](../cloud-lab/mission.md)；环境要求与排错见 [`../../docs/tutorial/01-Linux零基础-保姆级.md`](../../docs/tutorial/01-Linux零基础-保姆级.md)。
