/* lib.js — だんご大家族 MV · 核心库（risograph 印刷风格）
 * 全局挂载，无模块依赖，file:// 直接可用
 */
'use strict';

var W = 1920, H = 1080, FPS = 30;

/* ── 色板：实测自《红豆》原片 + 团子色系扩展 ───────────── */
var P = {
  // 纸面
  paper:     '#E6D5BE',
  paperPink: '#DEB3A6',
  cream:     '#F3E9D8',
  creamDk:   '#DCCDB4',
  // 青绿
  teal:      '#2C6E75',
  tealDk:    '#1F5359',
  tealLt:    '#3E8B92',
  // 夜
  night:     '#1A2340',
  indigo:    '#22305A',
  indigoLt:  '#3B4F85',
  indigoMid: '#2C3E6E',
  // 墨
  ink:       '#1E1A18',
  ink2:      '#3A322C',
  // 红
  red:       '#C93A3C',
  redDk:     '#8E2323',
  seal:      '#B23134',
  // 团子
  dw:        '#F7F2E7',  // 白团子
  dp:        '#EFA6B2',  // 粉
  dg:        '#8FBF6A',  // 绿（草团子）
  dy:        '#E8C25A',  // 黄（月见）
  db:        '#C08A50',  // 焦（烤团子）
  dm:        '#9B6B8E',  // 紫（芝麻）
  // 环境
  moon:      '#F2E2B0',
  moonDk:    '#DFC98A',
  snow:      '#D9D2C6',
  green:     '#3E7A55',
  greenDk:   '#2A5740',
  wood:      '#8A6234',
  woodDk:    '#5E4322',
  sky:       '#4A6398'
};

/* ── 数学 ─────────────────────────────────────────────── */
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
/** 归一化进度：t 在 [t0,t1] 区间内的 0..1 */
function prog(t, t0, t1) { return clamp((t - t0) / Math.max(1e-6, t1 - t0), 0, 1); }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function easeIn(t) { return t * t * t; }
function easeInOut(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function easeOutBack(t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
function easeOutElastic(t) {
  var c4 = (2 * Math.PI) / 3;
  if (t <= 0) return 0; if (t >= 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}
function easeOutBounce(t) {
  var n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + .75; }
  if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + .9375; }
  t -= 2.625 / d1; return n1 * t * t + .984375;
}

/* ── 确定性伪随机 ─────────────────────────────────────── */
function mulberry(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
/** 稳定哈希 → 0..1，同一 seed 永远同值（用于星星/纸纹） */
function hash1(n) { var x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }
function hash2(a, b) { var x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); }

/* ── 半调网点（照实测：1080p 网距 11px / 9.2px / 28px） ── */
var _htCache = {};
function halftoneCanvas(px, r, alpha, sq) {
  var key = px + '_' + r + '_' + alpha + '_' + (sq ? 1 : 0);
  if (_htCache[key]) return _htCache[key];
  var n = Math.max(2, Math.round(px));
  var c = document.createElement('canvas');
  c.width = n; c.height = n;
  var g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,' + alpha + ')';
  if (sq) {
    g.fillRect(n / 2 - r, n / 2 - r, r * 2, r * 2);
  } else {
    g.beginPath(); g.arc(n / 2, n / 2, r, 0, Math.PI * 2); g.fill();
  }
  _htCache[key] = c;
  return c;
}
/** 在整幅上盖一层网点（multiply） */
function halftone(ctx, px, r, alpha, sq, phase) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  var pat = ctx.createPattern(halftoneCanvas(px, r, alpha, sq), 'repeat');
  if (phase) ctx.translate(phase[0] || 0, phase[1] || 0);
  ctx.fillStyle = pat;
  ctx.fillRect(-64, -64, W + 128, H + 128);
  ctx.restore();
}

/* ── 套印错位（riso 签名）：同一形状画两遍，偏移 + multiply ── */
function riso(ctx, drawFn, dx, dy, color, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = alpha === undefined ? 0.30 : alpha;
  ctx.translate(dx, dy);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  drawFn(ctx);
  ctx.restore();
}

/* ── 形状 ─────────────────────────────────────────────── */
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function starPath(ctx, x, y, rOut, rIn, n, rot) {
  n = n || 5; rot = rot || -Math.PI / 2;
  ctx.beginPath();
  for (var i = 0; i < n * 2; i++) {
    var rr = i % 2 ? rIn : rOut;
    var a = rot + i * Math.PI / n;
    var px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
function polyPath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}
/** 填充 + 描边（本片统一：平涂 + 墨线） */
function inked(ctx, fill, lw, stroke) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke || P.ink; ctx.stroke(); }
}

/* ── 字体 ─────────────────────────────────────────────── */
var F_SANS = '"Yu Gothic UI","Yu Gothic","Meiryo","MS PGothic","Microsoft YaHei",sans-serif';
var F_ROUND = '"UD Digi Kyokasho N-B","Yu Gothic UI","Meiryo","Microsoft YaHei",sans-serif';
var F_SERIF = '"Yu Mincho","MS PMincho","SimSun",serif';

function setFont(ctx, size, weight, family) {
  ctx.font = (weight || 700) + ' ' + size + 'px ' + (family || F_SANS);
}
function textCenter(ctx, str, x, y, size, color, weight, family) {
  setFont(ctx, size, weight, family);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color || P.ink;
  ctx.fillText(str, x, y);
}
/** 竖排：逐字下落 */
function textVertical(ctx, str, x, y, size, color, lh, weight, family) {
  setFont(ctx, size, weight, family);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color || P.ink;
  for (var i = 0; i < str.length; i++) ctx.fillText(str[i], x, y + i * lh);
}
/** 字距均分的横排（本片字幕带字距）
 *  可选 strokeColor / sw：先描边再填，用于浅底上的浅色标题 */
function textTrackedBase(ctx, str, x, y, size, color, tracking, weight, family, strokeColor, sw) {
  setFont(ctx, size, weight, family);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  var total = 0;
  for (var i = 0; i < str.length; i++) total += ctx.measureText(str[i]).width + tracking;
  total -= tracking;
  var cx = x - total / 2;
  if (strokeColor) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = sw || 8; ctx.strokeStyle = strokeColor;
    var sx = cx;
    for (var k = 0; k < str.length; k++) {
      ctx.strokeText(str[k], sx, y);
      sx += ctx.measureText(str[k]).width + tracking;
    }
    cx = x - total / 2;
  }
  ctx.fillStyle = color || P.ink;
  for (var j = 0; j < str.length; j++) {
    ctx.fillText(str[j], cx, y);
    cx += ctx.measureText(str[j]).width + tracking;
  }
  return total;
}
/* 场景内标题的中文对照：凡是命中 ZH_TITLE 的标题，自动在其下方补一行中文小字。
 *  这样不必改 scenes.js 里 34 处调用；片尾字幕循环用 window.__noZhTitle 关闭。
 *  两道闸：__noZhSub 在画字幕时置位（字幕自带中文，不能再补一遍）；
 *  标题与当前歌词同句时也跳过（同一句中文否则会出现两次）。 */
var __noZhSub = false;
function textTracked(ctx, str, x, y, size, color, tracking, weight, family, strokeColor, sw) {
  var total = textTrackedBase(ctx, str, x, y, size, color, tracking, weight, family, strokeColor, sw);
  if (!__noZhSub && !window.__noZhTitle && typeof ZH_TITLE !== 'undefined' && ZH_TITLE[str]
      && str !== window.__curLyric) {
    var zs = Math.max(26, Math.round(size * .60));
    ctx.save();
    ctx.globalAlpha = (ctx.globalAlpha || 1) * .92;
    textTrackedBase(ctx, ZH_TITLE[str], x, y + size * .84, zs,
      color || P.ink, Math.max(2, Math.round(zs * .14)), 600, family || F_SANS, strokeColor, sw ? sw * .7 : undefined);
    ctx.restore();
  }
  return total;
}
function measureTracked(ctx, str, size, tracking, weight, family) {
  setFont(ctx, size, weight, family);
  var total = 0;
  for (var i = 0; i < str.length; i++) total += ctx.measureText(str[i]).width + tracking;
  return total - tracking;
}

/* ── 背景 ─────────────────────────────────────────────── */
function bgNight(ctx, t) {
  var g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#141C36'); g.addColorStop(.55, P.indigo); g.addColorStop(1, P.indigoLt);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function bgPaper(ctx) {
  var g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#EDDCC6'); g.addColorStop(.5, P.paper); g.addColorStop(1, '#D9C4A8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function bgPink(ctx) {
  var g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#E7C3B6'); g.addColorStop(1, '#D2A294');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function bgTeal(ctx) {
  var g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, P.tealLt); g.addColorStop(1, P.tealDk);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function bgDawn(ctx) {
  var g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#3B4F85'); g.addColorStop(.42, '#9C7E9E');
  g.addColorStop(.68, '#E0A48C'); g.addColorStop(1, '#F0CFA8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function bgCream(ctx) {
  var g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#F6EEDF'); g.addColorStop(1, '#E2D3BB');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
var BG = { night: bgNight, paper: bgPaper, pink: bgPink, teal: bgTeal, dawn: bgDawn, cream: bgCream };

/* ── 星野（确定性） ───────────────────────────────────── */
function drawStars(ctx, t, count, alpha, maxY) {
  count = count || 90; alpha = alpha === undefined ? .85 : alpha; maxY = maxY || H * .78;
  ctx.save();
  for (var i = 0; i < count; i++) {
    var x = hash1(i * 3.1) * W;
    var y = hash1(i * 7.7 + 13) * maxY;
    var r = 1.2 + hash1(i * 2.3 + 5) * 2.6;
    var tw = .55 + .45 * Math.sin(t * (1.1 + hash1(i) * 1.6) + i);
    ctx.globalAlpha = alpha * tw;
    ctx.fillStyle = '#FFF6DC';
    starPath(ctx, x, y, r * 2.6, r * 0.9, 4, hash1(i * 5.5) * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ── 字幕条（双语：日文原词为主 + 中文译文为辅，同一张米黄纸条） ──
 *   text = 日文原词，zh = 中文译文（可空），mode = 'big' 时改走大字版式 */
function drawSubtitle(ctx, text, t, alpha, mode, zh) {
  if (!text && !zh) return;
  alpha = alpha === undefined ? 1 : alpha;
  if (alpha <= 0.01) return;
  if (mode === 'big') return drawSubBig(ctx, text, t, alpha, zh);
  if (!text) text = '';
  var _prevNoZh = __noZhSub; __noZhSub = true;   // 字幕自带中文，禁止标题对照再补一遍

  var size = 44, track = 5;          // 日文行
  var zsize = 32, ztrack = 3;        // 中文行
  var hasZh = !!zh;
  var tw = measureTracked(ctx, text, size, track);
  if (hasZh) tw = Math.max(tw, measureTracked(ctx, zh, zsize, ztrack));
  var padX = 52, padY = 18;
  var bh = padY * 2 + size + (hasZh ? 10 + zsize : 0);
  var bw = tw + padX * 2;
  var bx = W / 2 - bw / 2, by = H - 48 - bh;
  var jaY = by + padY + size / 2;
  var zhY = jaY + size / 2 + 10 + zsize / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  // 纸带（两端撕裂：锯齿）
  ctx.beginPath();
  var teeth = 7, tw2 = 12;
  ctx.moveTo(bx, by + 6);
  for (var i = 0; i < teeth; i++) {
    var yy = by + (bh / teeth) * i;
    ctx.lineTo(bx - (i % 2 ? tw2 : 2), yy + bh / teeth * .5);
  }
  ctx.lineTo(bx, by + bh - 6);
  ctx.lineTo(bx + bw, by + bh - 6);
  for (var j = 0; j < teeth; j++) {
    var yy2 = by + bh - (bh / teeth) * j;
    ctx.lineTo(bx + bw + (j % 2 ? tw2 : 2), yy2 - bh / teeth * .5);
  }
  ctx.lineTo(bx + bw, by + 6);
  ctx.closePath();
  ctx.fillStyle = 'rgba(240,226,206,.92)';
  ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(30,26,24,.55)'; ctx.stroke();
  // 套印错位：红版偏移
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = alpha * .18;
  ctx.translate(3, -2);
  ctx.fillStyle = P.red;
  ctx.fill();
  ctx.restore();

  if (text) textTracked(ctx, text, W / 2, jaY, size, '#C0392B', track, 700, F_SANS);
  if (hasZh) {
    // 中文行：墨色 + 极细红下划线，视觉上从属于日文行
    textTracked(ctx, zh, W / 2, zhY, zsize, '#3A2E28', ztrack, 600, F_SANS);
    ctx.save();
    ctx.globalAlpha = alpha * .55;
    ctx.strokeStyle = P.red; ctx.lineWidth = 2;
    var uw = measureTracked(ctx, zh, zsize, ztrack) / 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - uw, zhY + zsize * .60);
    ctx.lineTo(W / 2 + uw, zhY + zsize * .60);
    ctx.stroke();
    ctx.restore();
  }
  __noZhSub = _prevNoZh;
  ctx.restore();
}

/* ── 副歌金句版式：居中大字 + 红规线（去掉纸条，构图更大气） ── */
function drawSubBig(ctx, text, t, alpha, zh) {
  var _prevNoZh = __noZhSub; __noZhSub = true;
  if (!text && !zh) { __noZhSub = _prevNoZh; return; }
  if (!text) { __noZhSub = _prevNoZh; return drawSubtitle(ctx, '', t, alpha, null, zh); }
  var size = 88, track = 10;
  var tw = measureTracked(ctx, text, size, track);
  // 长句自动降档，避免出画
  if (tw > W - 320) { size = 72; track = 8; tw = measureTracked(ctx, text, size, track); }
  if (tw > W - 320) { size = 58; track = 6; tw = measureTracked(ctx, text, size, track); }
  var zs = Math.round(size * .40), zt = 6;
  var cy = H * .775;
  var halfW = Math.min(W * .42, tw / 2 + 90);
  var ruleUp = cy - size * .72, ruleDn = cy + size * .72;
  var zy = ruleDn + zs * 1.06;

  ctx.save();
  ctx.globalAlpha = alpha;
  // 淡底：横向渐隐的米色光带，压住背景细节但不抢字
  var g = ctx.createLinearGradient(W / 2 - halfW, 0, W / 2 + halfW, 0);
  g.addColorStop(0, 'rgba(243,233,216,0)');
  g.addColorStop(.18, 'rgba(243,233,216,.74)');
  g.addColorStop(.82, 'rgba(243,233,216,.74)');
  g.addColorStop(1, 'rgba(243,233,216,0)');
  ctx.fillStyle = g;
  ctx.fillRect(W / 2 - halfW, ruleUp - size * .30, halfW * 2, (zh ? zy + zs * .72 : ruleDn + size * .30) - (ruleUp - size * .30));

  // 上下红规线（两端渐隐）
  for (var k = -1; k <= 1; k += 2) {
    var ly = k < 0 ? ruleUp : ruleDn;
    var lg = ctx.createLinearGradient(W / 2 - halfW, 0, W / 2 + halfW, 0);
    lg.addColorStop(0, 'rgba(201,58,60,0)');
    lg.addColorStop(.22, 'rgba(201,58,60,.85)');
    lg.addColorStop(.78, 'rgba(201,58,60,.85)');
    lg.addColorStop(1, 'rgba(201,58,60,0)');
    ctx.strokeStyle = lg;
    ctx.lineWidth = k < 0 ? 7 : 4;
    ctx.beginPath(); ctx.moveTo(W / 2 - halfW, ly); ctx.lineTo(W / 2 + halfW, ly); ctx.stroke();
  }

  // 套印错位：先画一层偏移红字，再画墨字
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = alpha * .26;
  ctx.translate(4, -3);
  textTracked(ctx, text, W / 2, cy, size, P.red, track, 800, F_SANS);
  ctx.restore();
  textTracked(ctx, text, W / 2, cy, size, '#7E1F22', track, 800, F_SANS);

  // 中文译文：压在下方红规线之下，不碰日文大字
  if (zh) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = alpha * .20;
    ctx.translate(2.5, -2);
    textTracked(ctx, zh, W / 2, zy, zs, P.red, zt, 600, F_SANS);
    ctx.restore();
    textTracked(ctx, zh, W / 2, zy, zs, '#3A2E28', zt, 600, F_SANS);
  }
  __noZhSub = _prevNoZh;
  ctx.restore();
}

/* ── 场景内中文小字：跟在日文标题下方（日文保留为主，中文为辅） ── */
function drawZhTitle(ctx, ja, x, y, size, color, family, strokeColor, sw) {
  var zh = (typeof ZH_TITLE !== 'undefined' && ZH_TITLE[ja]) || '';
  if (!zh) return 0;
  var s = Math.max(26, Math.round(size * .62));
  return textTracked(ctx, zh, x, y + size * .82, s, color || 'rgba(107,74,58,.92)',
    Math.max(2, Math.round(s * .12)), 600, family || F_SANS, strokeColor, sw);
}

/* ── 竖排诗卡（器乐段补足画面，取参考片诗卡意） ─────────── */
function drawCard(ctx, text, t, alpha, px, py) {
  if (!text) return;
  var size = 86, lh = size * 1.16;
  var padX = 46, padY = 48;
  /* 印章要单独占一块底部留白。
   *   早先印章画在 y0 + ch - padY*.72，而 ch 已含 2*padY —— 于是印章
   *   正好落在最后一个字身上（「游」「族」被红章压住）。现在把正文
   *   与印章分成两段算高度，章下有 padY 的呼吸空间。 */
  var sealSize = Math.round(size * .62);
  var sealGap = 22;
  var bodyH = text.length * lh;
  var ch = padY * 2 + bodyH + sealGap + sealSize;
  if (ch > H * .66) {
    size = 70; lh = size * 1.16;
    sealSize = Math.round(size * .62);
    bodyH = text.length * lh;
    ch = padY * 2 + bodyH + sealGap + sealSize;
  }
  var cw = size + padX * 2;
  // px / py 为 0~1 的比例坐标（由 zh.js 的 SUB_CARDS 指定）；不给就居中
  var cx = W * (px === undefined ? .5 : px);
  var cy = H * (py === undefined ? .52 : py);
  var x0 = cx - cw / 2, y0 = cy - ch / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(0, (1 - easeOut(Math.min(1, alpha))) * 22);
  // 纸卡
  ctx.fillStyle = 'rgba(243,233,216,.88)';
  roundRect(ctx, x0, y0, cw, ch, 10);
  ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(30,26,24,.50)'; ctx.stroke();
  // 套印错位
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = alpha * .16;
  ctx.translate(3, -2);
  ctx.fillStyle = P.teal;
  roundRect(ctx, x0, y0, cw, ch, 10);
  ctx.fill();
  ctx.restore();
  // 竖排红字（正文块从卡顶 padY 开始）
  textVertical(ctx, text, cx, y0 + padY + lh * .50, size, '#B23134', lh, 700, F_SERIF);
  // 朱红印章：正文块下方，章下留 padY
  drawSeal(ctx, '团子', cx, y0 + ch - padY - sealSize / 2, sealSize);
  ctx.restore();
}

/* ── 标题卡元素：竖排标题 + 朱红印章 ─────────────────── */
function drawVerticalTitle(ctx, text, x, y, size, color, lh) {
  ctx.save();
  ctx.shadowColor = 'rgba(30,26,24,.22)'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3;
  textVertical(ctx, text, x, y, size, color || P.ink, lh || size * 1.14, 700, F_SERIF);
  ctx.restore();
}
function drawSeal(ctx, text, x, y, size) {
  ctx.save();
  ctx.fillStyle = P.seal;
  roundRect(ctx, x - size / 2, y - size / 2, size, size, 8);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .25;
  ctx.translate(2.5, -2);
  roundRect(ctx, x - size / 2, y - size / 2, size, size, 8);
  ctx.fillStyle = P.ink; ctx.fill();
  ctx.restore();
  var fs = text.length > 2 ? size * .34 : size * .40;
  setFont(ctx, fs, 700, F_SERIF);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFF8EE';
  var lines = text.length > 2 ? [text.slice(0, 2), text.slice(2)] : [text];
  for (var i = 0; i < lines.length; i++)
    ctx.fillText(lines[i], x, y + (i - (lines.length - 1) / 2) * fs * 1.06);
  ctx.restore();
}
