# dango-mv

用 Canvas2D 逐帧画出来的一支 MV。**没有剪辑软件，没有图片素材，没有视频素材，没有视频模型。**

成片：273 秒 / 1920×1080 / 30fps / 8191 帧。每一帧都是一段 JavaScript 在 `<canvas>` 上现算现画，由浏览器逐帧截图，再由 ffmpeg 封装成 MP4。项目里唯一的二进制输入是一首 MP3。

```
input/song.mp3  ──┐
                  ├─→  src/index.html  ──→  Edge headless 逐帧截图  ──→  frames/*.jpg  ──→  ffmpeg  ──→  out/*.mp4
input/lyrics.lrc ─┘        (Canvas2D)         (playwright)                              (+ song.mp3 混流)
```

---

## 为什么值得看

**整条管线不依赖任何"动画框架"。** 没有 Remotion，没有 Chromium 全家桶，没有 AE 表达式。渲染器就是一个 HTML 文件加十个 JS 文件，跑在系统自带的 Edge 上。总代码量：

| 文件 | 行数 | 职责 |
|---|---|---|
| `src/lib.js` | 475 | 数学 / 缓动 / 半调网点 / 套印错位 / 字体 / 形状 / 字幕三种版式 / 印章 |
| `src/scenes.js` | 1735 | 40+ 个场景函数（每个场景 = 一个纯函数 `(ctx, t, lt, sc)`） |
| `src/dango.js` | 428 | 团子角色库：身体、表情、四肢、牵手 |
| `src/beats.js` | 428 | 快切段：16 种逐拍动机 + 12 组底色轮转 + 对比度分档 |
| `src/timeline.js` | 153 | 80 个分镜 + 字幕表派生 + 快切段按拍生成 |
| `src/main.js` | 159 | 渲染主循环 + 逐帧抓取接口 + 章节进度条 |
| `src/zh.js` | 120 | 中文字幕三条线：双语纸条 / 副歌大字 / 竖排诗卡 |

**动效不是"抽帧"，是 t 的纯函数。** `renderFrame(t)` 可以在任意时间点被调用，乱序调用结果一致 —— 这正是逐帧截图可行的前提，也是它能断点续渲的原因。

---

## 跑起来

### 依赖

**Python 包**：

```bash
pip install -r requirements.txt
```

必需的是 `playwright`（驱动浏览器逐帧截图）、`numpy`（测速与对齐的信号处理）、`Pillow`（拼联系表）。可选 `faster-whisper`，只有"只给音频、不给歌词"的自动对齐场景才用到。

`playwright install msedge` **不是必须的** —— 本项目不下载 playwright 自带的浏览器，而是直接驱动系统已装的 Edge/Chrome（见下方 `env.py` 探测逻辑）。系统没有浏览器时才需要它。

**外部程序**：

| 程序 | 必要性 | 说明 |
|---|---|---|
| Edge 或 Chrome | 必需 | 渲染器宿主，系统自带即可 |
| ffmpeg | 必需 | 逐帧 JPEG 编码 + 混流成 MP4 |

**这两个不需要装 py 包，也不需要改源码** —— `tools/env.py` 按「环境变量 → 常见安装位置 → PATH」三级探测，Windows / macOS / Linux 常见路径都覆盖了。找不到时会打印修复提示。手动指定：

```bash
# Windows
set EDGE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
set FFMPEG=C:\ffmpeg\bin\ffmpeg.exe

# macOS / Linux
export EDGE="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
export FFMPEG=/usr/local/bin/ffmpeg
```

自检（确认路径都能解析）：

```bash
python -c "import sys; sys.path.insert(0,'tools'); import env; print(env.browser_path()); print(env.ffmpeg_path())"
```

> **Windows 用户注意**：若 `git push` / `clone` 报 `TLS connect error: unexpected eof while reading`，
> 是 git 的 openssl 后端与你本机代理冲突。改用 Windows 原生 TLS：
> ```bash
> git config http.sslBackend schannel
> ```

### 三条命令

```bash
# 1. 冒烟测试：抓 16 个时间点的静帧到 stills/，顺便检查场景有没有抛异常
python tools/render_frames.py check

# 2. 逐镜审图：每个分镜抓一张中点位图到 shots/，同时写 manifest.json
python tools/render_frames.py shots

# 3. 全片：逐帧抓取 + 编码成 out/mv.mp4（本机实测约 605s）
python tools/render_frames.py full
```

`full` 支持断点续渲 —— 已存在的帧会被跳过，中断后重跑不会重算。

```bash
python tools/render_frames.py full --fps 30 --from 0 --to 30
```

### 换成你自己的歌

`input/README-投喂格式.md` 写了三种歌词格式（纯文本 / LRC / 带段落标记）。骨架换歌要动的地方：

1. `src/timeline.js` 的 `BPM`、`DUR`、`SHOTS` —— 分镜表按歌词逐句切
2. `src/lyrics.js` —— 由 `tools/lrc_to_js.py` 从 LRC 生成
3. `src/zh.js` 的 `ZH_LINES` —— 中文译文，时间戳与 `lyrics.js` 一一对应
4. `src/main.js` 的 `CHAPTERS` —— 章节进度条的分段名

---

## 踩过的坑

这部分是仓库里最值钱的东西。每一条都是调试出来的，不是教程里抄得到的。

### 1. 行星遮挡：极角判定在屏幕空间会符号反转

画一颗带环的行星，需要判断某个团子是在行星前面还是后面。一开始用轨道参数角算前后（`cos(角度) > 0` 就是前面），转到屏幕坐标之后符号反了 —— 尤其当镜头本身有旋转时。

**做法**：给轨道位置打标记，把一组采样点的前后状态全打出来，逐个核对；改用旋转后的短轴方向 `ey < 0` 判定。遮挡随后被拆成五层：

```
环后 → 球 → 背后团子 → 环前 → 面前团子
```

背后团子用 `ctx.clip` 挖掉行星圆，而不是靠绘制顺序硬叠。

### 2. 行星环的"浮面"感

用椭圆几何角去切环的前后两半，是错的 —— 环的投影椭圆和球在屏幕上并不共享同一个参数化角度。结果环看起来像贴在球前面的一个扁圈。

**做法**：改成几何求交，求出环在球外的两段圆弧的边界角 θ₀：

```js
const th0 = Math.acos(Math.sqrt((R*R - B*B) / (A*A - B*B)));
```

只画球外的两段折线，环的"穿过去"的感觉才出来。

### 3. 复唱段落逐像素相同

副歌在两分钟处完整重复一次，歌词一模一样。第一版是把八个场景函数原样再放一遍 —— 两个相隔 82 秒的镜头逐像素相同，观众一眼就看出是复制粘贴。

**做法**：场景函数加 `pass` 参数，`timeline.js` 里副歌 1 传 `{pass: 1}`、副歌 2 传 `{pass: 2}`，八个函数各自按 pass 切换机位 / 色温 / 团子数量 / 走向。相同的歌词，不同的构图。

### 4. 剪影团子的轮廓会消失

一个夜戏场景里，团子的身体颜色恰好和背景同色，而轮廓用的是深墨色描边 —— 两个颜色贴在一起，整个轮廓被吃掉，团子变成一个发光的卤蛋。

**做法**：轮廓换冷蓝（`#8FA8D8`），眼睛换一种靠"月光边缘光"（`#7A8CC8`）勾出形状的眼型。

### 5. 牵手的手臂只画了一半

一排团子牵手，手臂只画了朝内的那条。站在队伍两端的团子，外侧手臂缺失，截图上看就是"断手"。

**做法**：`linkL` / `linkR` 补外侧自然下垂的短臂（`w*0.26`），手圆半径从 `lw*0.78` 提到 `lw*0.92`，整排间距从 `W*0.82` 收到 `W*0.62`。

### 6. 快切段每一刀都晚半拍

BPM 99 ⇒ 拍长 0.606060s。快切段一开始建在整秒 `t = 210.000` 上，而真实第 347 拍落在 `t = 210.303` —— 差 303ms，正好是半拍。听感就是"卡不上拍"。

**做法**：从真实拍点 `210.303` 起算，容差收敛到 ±1 帧内。

### 7. 分镜切点必须等于歌词起唱时间

歌词把「赤ちゃんだんごは」和「いつも幸せの中で」分成两句，画面却占了一镜跨两句 —— 结果从这一镜起，后面**每个**镜头都比字幕提前一格。

**做法**：`timeline.js` 里每个 `t0` 都等于对应那句歌词的起唱时间，不做累加推算。

### 8. 中档底色会把前景吃掉

快切段每拍换一组底色。赭石（`#C08A50`）和紫（`#9B6B8E`）这两种"中档明度"的底色上，任何单一墨色线条都会糊掉。

**做法**：底色按明度分档 `light / mid / dark`，中档底色用"浅色描边 + 深色芯"的双色描边（`inkStroke`），靠明度差而不是色相分离。

---

## 目录

```
src/        渲染器全部源码（浏览器直接打开 index.html 可预览，带音频同步）
tools/      渲染、分析、审图脚本
input/      投喂模板（歌与歌词放这里，不进版本库）
frames/     逐帧 JPEG 输出（不进版本库）
out/        成片与封面（不进版本库）
```

单独预览某一帧：

```
src/index.html                  带音频播放的实时预览
src/index.html?nopreview        只画第 0 帧（headless 抓帧走这个）
```

---

## 关于这份代码的来源

这个项目由 AI 生成、人工审校迭代完成 —— 画面构图、调参、踩坑定位都经过反复实测。仓库里保留了大量"为什么这样做"的注释（尤其是 `timeline.js` 和 `beats.js`），因为这些坑比代码本身更值得留。

---

## 授权

- **代码**：MIT（见 `LICENSE`）
- **画面风格**：risograph 印刷风格，色板实测自参考片，非任何商业素材
- **输入音频与歌词**：不进版本库。若要复现，请自备音频；演示曲目的词曲版权归原权利人所有
- **字体**：只用系统字体（Yu Gothic / Yu Mincho / 微软雅黑 等），仓库不分发任何字体文件

个人项目，不承诺维护。
