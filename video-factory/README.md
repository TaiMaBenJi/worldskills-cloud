# 🎬 教程视频工厂（video-factory）

> 把任意 Markdown 图文教程，自动转换成**带配音 + 图解画面 + 流程图**的视频课程。
> 本项目用它生产了全部 **62 集视频课**：机房管理 15 集 + 保姆级教程 18 集 + 进阶专题 29 集。

## 这是什么

一套"文档 → 视频"的全自动流水线，跑在 **Android 手机**（Alpine Linux 容器环境）上：

```
Markdown 教程
   │  ① gen_*.py 脚本生成器（章节结构 → 分镜：每页要点 + 旁白）
   ▼
视频脚本（EPISODE dict：封面/要点卡/流程图/表格/对比/金句/结尾 九种版式）
   │  ② render.py（PIL 设计系统，1920×1080 深色科技风，Noto CJK 字体）
   ▼
幻灯片帧 PNG
   │  ③ 语音合成配音 + fix_tts.py（限流自愈重试）
   │  ④ build_episode.py（ffmpeg：图片时间轴 + 音频对轨，一次编码成片）
   ▼
1080p MP4（每集 6~12 分钟，约 10MB，-tune stillimage 高效压缩）
   │  ⑤ gen_*_md.py 生成总览页（video 标签，App 内嵌播放）
   ▼
安卓 App（WebView 加载 study.html，视频打包进 assets，全离线）
```

## 目录

| 文件 | 作用 |
|---|---|
| `render.py` | 核心设计系统：9 种版式（封面/要点/卡片/流程/大数字/表格/对比/金句/结尾） |
| `build_episode.py` | 单集构建流水线（帧→配音→合成），支持断点续跑 |
| `fix_tts.py` | 配音限流自愈：单并发 + 快重试，补跑缺失音频段 |
| `gen_video_md.py` | 机房视频课总览页生成器 |
| `gen_handout.py` | 全台词讲义生成器（文字版） |
| `qa_check.py` | 成片质检（时长/音轨/画面） |
| `course/gen_course_script.py` | **章节 md → 视频脚本**自动转换器（要点提取 + 旁白裁剪） |
| `course/gen_course_video_md.py` | 教程视频课总览页生成器 |
| `pipelines/` | 批量构建与收尾的总控脚本（可断点续跑） |
| `scripts/` | 分镜脚本源码（room / course 全系列） |

## 用法（单集）

```bash
# 1) 写一集分镜脚本（参考 scripts/ 下的样例）
# 2) 构建（自动渲染帧 + 配音 + 合成）
VIDEO_ROOT=/path/to/project python3 build_episode.py scripts/your-ep.py
# 3) 产物在 out/ 下
```

## 关键技术点

- **设计系统**：深色科技风 + 强调色系统（青/橙/绿/紫/红），标题 58px、正文 40px、大数字 96px
- **音频对齐**：每段旁白 `apad` 补齐 0.72s 尾静音 → 图片 concat 时间轴（duration 指令）与拼接音频精确对轨
- **配音容错**：配音引擎遇到概率性连接重置（Connection reset）时，`2 + 2.5n` 秒递增重试，单段最多 14 次
- **配音服务整体不可达时的兜底（实测）**：`speech.platform.bing.com` 出现 `curl HTTP=000 / SSL exit 35` 时，重试救不回（fix_tts 只会一直循环）。离线备用音轨（已装，无需联网）：
  ```
  espeak-ng -v cmn -w seg.wav "要朗读的中文文本"     # 实测 4.8s / 212KB wav，中文可读（音色机械）
  ```
  应急策略：① 先无音轨出片（字幕已有）→ 端点恢复后 `fix_tts.py` 补音轨重编；② 或 espeak-ng 生成备用音轨顶替，标注重制。**判据：先 `curl` 探端点，HTTP 000/SSL 错 = 端点级故障，不是限流**（限流表现为 HTTP 400/连接重置但可连）。
- **编码参数**：`libx264 -preset veryfast -tune stillimage -crf 23 -r 10`，静态内容每集仅约 10MB
- **断点续跑**：每个环节以产物存在性判断是否跳过，进程被杀后可无损重启

## 许可

MIT（随主仓库）
