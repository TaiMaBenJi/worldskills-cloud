# 云计算学习中心 · WorldSkills Cloud Computing 中文学习资料库

> 面向**世界技能大赛云计算项目（Skill 39）**选手与自学者的开源中文学习平台。
> 11 万字保姆级教程 + 全中文国际赛题库 + 单文件离线学习中心 + 安卓 App——**一个仓库，从零基础到竞赛水平**。

![学习中心首页](assets/screen-home.jpg)
![导航与分组](assets/screen-nav.jpg)
![沉浸阅读](assets/screen-app.jpg)

---

## ✨ 包含什么

| 模块 | 内容 | 位置 |
|------|------|------|
| 📖 **保姆级中文教程**（16 章） | 从"什么是文件"讲到 AWS/容器/自动化/安全，每步带命令、输出示例、排错指南与练习答案 | [`docs/tutorial/`](docs/tutorial/) |
| 🧠 **精通之路**（7 篇） | 从"级联话术"到母语级能力的训练体系：全景地图 / 五级阶梯 / 领域修炼 / 架构模式 / 全平台 / 365 天训练系统 | [`docs/mastery/`](docs/mastery/) |
| 💻 **计算机母语之路**（5 篇） | 《计算机系统要素》《C Primer Plus》《思考快与慢》《编译原理》《高级编译器》五书共生学习体系（24 个月路线） | [`docs/cs-mastery/`](docs/cs-mastery/) |
| 🗺 **知识体系**（12 章） | Linux / 网络 / 企业服务 / OpenStack / AWS / 容器 / IaC / 可观测 / 安全 / 前沿 / 竞赛 / 认证 | [`docs/knowledge/`](docs/knowledge/) |
| 🏆 **韩国赛题中文库**（59 份） | 2021–2025 韩国技能竞赛云计算真题：题面 + 评分标准（全中文翻译，评分命令可直接照用） | [`exam/korea-zh/`](exam/korea-zh/) |
| 🫧 **离线学习中心** | 单文件 `study.html`：3200+ 篇资料全文检索、阅读进度记忆、液态玻璃界面、完全离线 | [Releases 下载](https://github.com/TaiMaBenJi/worldskills-cloud/releases/latest) |
| 📱 **安卓 App** | WebView 套壳，安装即用（2.9 MB，纯离线） | [`app/CloudStudy-v1.0.apk`](app/CloudStudy-v1.0.apk) |

## 🚀 三种使用方式

**① 装 App（推荐手机党）**
下载 [`app/CloudStudy-v1.0.apk`](app/CloudStudy-v1.0.apk) → 安装 → 打开「云计算学习」。
> 安装时系统提示"未知来源/风险应用"属正常侧载提示，本 App 无任何联网权限。

**② 浏览器打开学习中心**
从 [**Releases 页面**](https://github.com/TaiMaBenJi/worldskills-cloud/releases/latest) 下载 `study.html`（14 MB 单文件）→ 任意浏览器直接打开。全部内容离线可用。

**③ 直接读文档**
从 [`docs/tutorial/00-开始之前`](docs/tutorial/00-开始之前-零基础先读我.md) 开始，按顺序阅读。

## 📂 目录结构

```
worldskills-cloud/
├── app/                 # 安卓 App（网页版 study.html 从 Releases 下载）
├── docs/                # 教程与知识体系（Markdown 源）
│   ├── tutorial/        #   16 章保姆级教程
│   ├── mastery/         #   精通之路 7 篇
│   ├── cs-mastery/      #   计算机母语之路 5 篇
│   └── knowledge/       #   知识体系 12 章
├── exam/
│   └── korea-zh/        # 韩国赛题中文翻译（题面+评分标准）
├── tools/               # 构建工具链（页面生成器 / APK 构建脚本 / 模板）
└── assets/              # 截图
```

## 🛠 自行构建

### 重新生成学习中心（study.html）

```bash
# 环境：Python 3 + Pillow；依赖 Markdown 库
pip install markdown pillow
# 将 docs/exam 下的资料按 tools/build_liquid.py 内的路径约定放置后：
python3 tools/build_liquid.py
```

### 构建安卓 App

`tools/rebuild_apk.sh` 展示完整流程：
1. 生成 `study.html` → 放入 `assets/`
2. 编写 `AndroidManifest.xml` + 最小 WebView Activity（smali 模板见 `tools/apk-template/`）
3. 用 `smali.jar` 汇编 classes.dex
4. 用 `aapt2 compile/link` 打包资源与页面
5. 合并 dex → 用 `uber-apk-signer` 签名（或你的自有密钥）
6. `adb install -r` 安装

> 模板（`tools/apk-template/`）包含可直接复用的 Manifest、MainActivity.smali 与图标。

## 📚 内容来源与致谢

- **官方**：WorldSkills Occupational Standards（WSOS 2026 上海）
- **赛题**：韩国技能竞赛公开资料、各国选手公开训练仓库等**公开渠道**整理
- **教程与方法论**：本项目原创编写
- 资料仅供学习交流，相关版权归原出处所有；如涉版权问题请提 Issue 处理。

## 📄 License

- 代码与工具：**MIT**（见 [LICENSE](LICENSE)）
- 原创文档与教程：**CC BY-NC-SA 4.0**（署名-非商业性使用-相同方式共享）

## ⭐ 路线图

- [ ] 收录更多国家/地区赛题（中/英/日/葡…）
- [ ] 教程配套视频提纲
- [ ] 学习打卡与测验模块

---

**如果这个项目帮到了你，给一个 ⭐ Star 就是最好的支持。**
