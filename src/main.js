/* main.js — 渲染主循环 + 逐帧抓取接口
 * 两种模式：
 *   1) 预览：requestAnimationFrame 实时播放（带音频同步）
 *   2) 抓帧：window.__seek(t) 同步画一帧，供 headless 截图 / MediaRecorder 逐帧编码
 * 所有绘制都是 t 的纯函数 → 任意帧可乱序重绘，结果一致。
 */
'use strict';

var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = true;
ctx.textRendering = 'geometricPrecision';

/* 跨镜连续状态（片头/片尾的推进感、套印抖动） */
function crossState(t) {
  return {
    titleIn: prog(t, 0.4, 2.2),
    // 片尾淡出：只留最后 2.2s，否则会盖掉片尾字幕
    endFade: prog(t, DUR - 2.2, DUR - 0.4)
  };
}

/** 画一帧（核心） */
function renderFrame(t) {
  t = clamp(t, 0, DUR);

  var sc = shotAt(t);
  var lt = t - sc.t0;
  var dur = sc.t1 - sc.t0;

  /* 当前歌词（供 textTracked 判断：标题与歌词同句时不再补一遍中文小字） */
  var subPre = subAt(t);
  window.__curLyric = subPre ? subPre.text : '';

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);

  /* ── 场景本体 ───────────────────────────── */
  try {
    sc.fn(ctx, t, lt, sc);
  } catch (e) {
    ctx.fillStyle = '#8E2323'; ctx.fillRect(0, 0, W, H);
    setFont(ctx, 48, 700, F_SANS);
    ctx.fillStyle = '#FFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ERR ' + sc.name + ': ' + e.message, W / 2, H / 2);
    if (window.__errors) window.__errors.push(sc.name + ' @' + t.toFixed(2) + ' :: ' + e.message);
  }

  /* ── 转场：场景切换 0.22s 白闪 + 轻微推移 ── */
  var inP = lt / .22;
  if (inP < 1 && !sc.noFlash) {
    ctx.save();
    ctx.globalAlpha = (1 - easeOut(inP)) * .34;
    ctx.fillStyle = '#FFF6E4'; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* ── 全片统一印刷层 ─────────────────────── */
  if (!sc.raw) {
    halftone(ctx, 11, 1.7, .17, false, [0, 0]);
  }

  /* ── 字幕（日文原词 + 中文译文） ─────────── */
  var sub = subAt(t);
  var card = cardAt(t);
  if (sub && t > 1.2 && t < DUR - 8) {
    drawSubtitle(ctx, sub.text, t, sub.alpha, sub.mode, sub.zh);
  } else if (card && t > 1.2 && t < DUR - 8) {
    drawCard(ctx, card.text, t, card.alpha, card.x, card.y);
  }

  /* ── 顶部 HUD：章节进度条 ───────────────── */
  if (t > 3 && t < DUR - 4) {
    drawHUD(ctx, t);
  }

  /* ── 片尾淡出 ───────────────────────────── */
  var cs = crossState(t);
  if (cs.endFade > 0) {
    ctx.save();
    ctx.globalAlpha = cs.endFade;
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  ctx.restore();
}

/* 章节进度条（照实测：底部细条 + 当前段落名） */
var CHAPTERS = [
  { t0: 0.000, name: '前奏' },
  { t0: 19.150, name: '主歌' },
  { t0: 57.570, name: '主歌' },
  { t0: 75.250, name: '副歌' },
  { t0: 115.250, name: '间奏 · 团子星的一天' },
  { t0: 157.100, name: '副歌' },
  { t0: 190.710, name: '间奏 · 宇宙巡游' },
  { t0: 237.550, name: '尾奏' }
];
function chapterAt(t) {
  var c = CHAPTERS[0];
  for (var i = 0; i < CHAPTERS.length; i++) if (t >= CHAPTERS[i].t0) c = CHAPTERS[i];
  return c;
}
function drawHUD(ctx, t) {
  var c = chapterAt(t);
  var pad = 64;
  var y = 30;                      // 顶部细条，远离字幕区
  var bw = W - pad * 2;
  ctx.save();
  ctx.globalAlpha = .38;
  roundRect(ctx, pad, y, bw, 6, 3);
  inked(ctx, 'rgba(30,26,24,.45)', 0);
  var p = clamp(t / DUR, 0, 1);
  roundRect(ctx, pad, y, bw * p, 6, 3);
  inked(ctx, '#E8B93C', 0);
  ctx.restore();

  // 时间码 / 章节名：深色底描边，保证在浅色纸底上同样可读
  ctx.save();
  ctx.globalAlpha = .80;
  var mm = Math.floor(t / 60), ss = Math.floor(t % 60);
  var tc = ('0' + mm).slice(-2) + ':' + ('0' + ss).slice(-2);
  setFont(ctx, 26, 700, F_SANS);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(20,17,15,.55)';
  ctx.lineJoin = 'round';
  ctx.strokeText(tc, pad, y + 40);
  ctx.fillStyle = '#FFF6E4';
  ctx.fillText(tc, pad, y + 40);
  ctx.textAlign = 'right';
  ctx.strokeText(c.name, W - pad, y + 40);
  ctx.fillText(c.name, W - pad, y + 40);
  ctx.restore();
}

/* ── 逐帧抓取接口（供 headless） ─────────────────────── */
window.__errors = [];
window.__seek = function (t) { renderFrame(t); return true; };
window.__duration = DUR;
window.__fps = FPS;
window.__shotList = function () {
  return SHOTS.map(function (s) {
    return { name: s.name, t0: s.t0, t1: s.t1 };
  });
};
window.__ready = true;

/* ── 预览播放 ───────────────────────────────────────── */
var audio = null, startWall = 0, playing = false, curT = 0;
function play(from) {
  curT = from || 0;
  if (!audio) { audio = new Audio('song.mp3'); }
  audio.currentTime = curT;
  audio.play();
  startWall = performance.now() / 1000 - curT;
  playing = true;
  loop();
}
function loop() {
  if (!playing) return;
  var t = audio && !audio.paused ? audio.currentTime : (performance.now() / 1000 - startWall);
  curT = t;
  renderFrame(t);
  if (t >= DUR) { playing = false; return; }
  requestAnimationFrame(loop);
}
window.__play = play;
window.__pause = function () { playing = false; if (audio) audio.pause(); };

/* 无音频时自动静默预览（headless 抓帧不走这里） */
if (location.search.indexOf('nopreview') < 0) {
  renderFrame(0);
}
