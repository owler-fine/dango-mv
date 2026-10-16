/* scenes.js — 《だんご大家族》全部场景（纯 Canvas2D 代码绘制）
 * 每个场景函数签名：f(ctx, t, lt, sc)
 *   t  = 全曲绝对时间（用于跨镜连续的动效：星星闪烁、云飘）
 *   lt = 场景内本地时间（用于入场动画）
 *   sc = 场景对象 {id, t0, t1, ch, ...}
 */
'use strict';

/* ══════════════ 通用件 ══════════════ */

function gradSky(ctx, stops) {
  var g = ctx.createLinearGradient(0, 0, 0, H);
  for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

/** 波浪丘陵 */
function hills(ctx, baseY, color, amp, freq, phase, lw) {
  ctx.beginPath();
  ctx.moveTo(-20, H + 20);
  for (var x = -20; x <= W + 20; x += 8) {
    var y = baseY + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.7 + phase * 1.7) * amp * .34;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 20, H + 20);
  ctx.closePath();
  inked(ctx, color, lw || 0);
}

/** 平地 */
function groundPlane(ctx, y, color, lw) {
  ctx.beginPath();
  ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
  inked(ctx, color, lw || 0);
}

/** 落下的彩纸/花瓣/音符 */
function confetti(ctx, t, n, colors, seed, glyphs) {
  for (var i = 0; i < n; i++) {
    var x = hash1(i * 2.7 + seed) * W;
    var sp = 46 + hash1(i * 5.3 + seed) * 110;
    var y = ((t * sp + hash1(i * 1.9 + seed) * (H + 300)) % (H + 300)) - 150;
    var rot = t * (0.8 + hash1(i) * 1.8) + i;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.globalAlpha = .88;
    var c = colors[i % colors.length];
    if (glyphs) {
      setFont(ctx, 34 + hash1(i) * 16, 700, F_SANS);
      ctx.fillStyle = c; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(glyphs[i % glyphs.length], 0, 0);
    } else if (i % 3 === 0) {
      circle(ctx, 0, 0, 8); inked(ctx, c, 0);
    } else if (i % 3 === 1) {
      roundRect(ctx, -9, -6, 18, 12, 3); inked(ctx, c, 0);
    } else {
      starPath(ctx, 0, 0, 10, 4.2, 5, 0); inked(ctx, c, 0);
    }
    ctx.restore();
  }
}

/** 云（本片统一：三瓣相切半圆 + 平底，无折角）
 *  三瓣圆心同在底边 y 上、彼此相切 → 轮廓必然光滑。
 */
function cloud(ctx, x, y, s, color, lw) {
  var r2 = s * .46, r1 = s * .30, r3 = s * .30;
  var x2 = x + s * .02;
  var x1 = x2 - r2 - r1;      // 与中瓣相切
  var x3 = x2 + r2 + r3;
  ctx.beginPath();
  ctx.moveTo(x1 - r1, y);
  ctx.arc(x1, y, r1, Math.PI, Math.PI * 2, false);
  ctx.arc(x2, y, r2, Math.PI, Math.PI * 2, false);
  ctx.arc(x3, y, r3, Math.PI, Math.PI * 2, false);
  ctx.closePath();
  inked(ctx, color || '#F7F2E7', lw === undefined ? 6 : lw);
}

/** 漂浮云层带 */
function cloudBand(ctx, t, y, n, s, alpha, speed) {
  ctx.save();
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  for (var i = 0; i < n; i++) {
    var x = ((hash1(i * 3.3 + y) * W + t * (speed || 16) * (0.6 + hash1(i) * .8)) % (W + 500)) - 250;
    cloud(ctx, x, y + hash1(i * 7.1) * 60, s * (.7 + hash1(i * 2.1) * .6), '#FBF6EC', 5);
  }
  ctx.restore();
}

/** 地面小草/花 */
function sprouts(ctx, y, n, color, seed, t) {
  for (var i = 0; i < n; i++) {
    var x = hash1(i * 4.7 + seed) * W;
    var s = 0.7 + hash1(i * 2.3 + seed) * .8;
    var sw = Math.sin(t * 1.4 + i) * .10;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(sw);
    ctx.strokeStyle = color || P.green; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s * 16, -s * 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 14, -s * 34); ctx.stroke();
    ctx.restore();
  }
}

/** 竹签（斜插） */
function skewerStick(ctx, x, y, len, ang, lw) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, len);
  ctx.lineWidth = (lw || 10) + 3; ctx.strokeStyle = P.woodDk; ctx.stroke();
  ctx.lineWidth = lw || 10; ctx.strokeStyle = P.wood; ctx.stroke();
  ctx.restore();
}

/** 小木屋 / 团子屋 */
function house(ctx, x, y, w, body, roof, lw) {
  var h = w * .78;
  ctx.save();
  roundRect(ctx, x - w / 2, y - h, w, h, 6); inked(ctx, body || P.cream, lw || 6);
  polyPath(ctx, [[x - w * .62, y - h], [x, y - h * 1.62], [x + w * .62, y - h]]);
  inked(ctx, roof || P.red, lw || 6);
  roundRect(ctx, x - w * .16, y - h * .52, w * .32, h * .52, 4); inked(ctx, P.wood, 5);
  circle(ctx, x + w * .27, y - h * .72, w * .09); inked(ctx, P.moon, 4);
  ctx.restore();
}

/** 大圆环排列的团子 */
function ringOfDango(ctx, t, cx, cy, R, n, s, opts) {
  /* 环形阵列 + 相邻两只真的牵上手。
   *   位置先在圆周上排好（上下方向压扁成椭圆），再按相邻关系画 linkHands。 */
  var pts = [];
  for (var i = 0; i < n; i++) {
    var a = (i / n) * Math.PI * 2 - Math.PI / 2 + t * .12;
    var x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * .58;
    var sc = .82 + (Math.sin(a) + 1) * .16;
    pts.push({ x: x, y: y, s: s * sc, a: a, i: i });
  }
  // 先画牵手的手臂（压在身体下面，看起来是手从身体后面伸出来握在一起）
  for (var k = 0; k < n; k++) {
    var p = pts[k], q = pts[(k + 1) % n];
    linkHands(ctx, p.x, q.x, (p.y + q.y) / 2, (p.s + q.s) / 2, 6, 1);
  }
  for (var j = 0; j < n; j++) {
    var pt = pts[j];
    var o = Object.assign({}, opts[j % opts.length] || {});
    o.phase = j * 1.1;
    o.pose = 'none';            // 手臂统一由 linkHands 提供
    ctx.save();
    if (Math.sin(pt.a) > 0) ctx.globalAlpha = .98;
    drawDango(ctx, pt.x, pt.y, pt.s, t, o);
    ctx.restore();
  }
}

/* ══════════════ 团子配色表 ══════════════ */
var V = {
  plain: { color: P.dw, cheekColor: '#F0A8B0' },
  pink: { color: P.dp, cheekColor: '#D9455A', bow: P.red },
  green: { color: P.dg, cheekColor: '#E8879A' },
  yellow: { color: P.dy, eyes: 'sleepy', cheekColor: '#E8879A' },
  brown: { color: P.db, toast: true, cheekColor: '#D9455A' },
  purple: { color: P.dm, seeds: true, cheekColor: '#C76A86' },
  red: { color: '#D9705F', cheekColor: '#C0392B' },
  cream: { color: '#F0E0C4', cheekColor: '#E8A090' },
  old: { color: P.dw, glasses: true, eyes: 'sleepy', cheekColor: '#E8A090' },
  baby: { color: '#FFF6EA', cheekColor: '#F4A0A8' }
};

/* 一排团子 */
function dangoRow(ctx, t, y, s, variants, spread) {
  var n = variants.length;
  spread = spread || W * .78;
  for (var i = 0; i < n; i++) {
    var x = W / 2 - spread / 2 + (n === 1 ? spread / 2 : spread * i / (n - 1));
    var o = Object.assign({}, variants[i]);
    o.phase = i * .9;
    o.bob = 8;
    drawDango(ctx, x, y, s, t, o);
  }
}

/* ══════════════ 场景 ══════════════ */

/* 序：团子星全景 + 标题 */
function scIntro(ctx, t, lt) {
  gradSky(ctx, [[0, '#2A3A6B'], [.42, '#4A5E96'], [.72, '#8A7FA8'], [1, '#D9A48E']]);
  drawStars(ctx, t, 70, .8, H * .62);
  drawMoon(ctx, W * .20, H * .30, 118, t, { color: P.moon });
  cloudBand(ctx, t, H * .52, 4, 190, .55, 10);
  hills(ctx, H * .74, '#3E4A78', 26, .0032, 1.2);
  hills(ctx, H * .82, '#2E3762', 22, .0046, 3.4);
  groundPlane(ctx, H * .88, '#26305A');
  sprouts(ctx, H * .90, 16, '#3E6E52', 3, t);

  var n = 5, s = 116;
  for (var i = 0; i < n; i++) {
    var x = W * .5 - (n - 1) * 82 + i * 164;
    var o = Object.assign({}, [V.plain, V.pink, V.green, V.yellow, V.purple][i]);
    o.phase = i * 1.2; o.bob = 10;
    drawDango(ctx, x, H * .775, s, t, o);
  }
  // 标题：夜空底色深、霞光底色浅，用浅字 + 深色投影保证两种底色都可读
  var a = prog(lt, 1.6, 3.0);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha = a;
    ctx.shadowColor = 'rgba(12,10,14,.62)';
    ctx.shadowBlur = 16; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 4;
    drawVerticalTitle(ctx, 'だんご大家族', W * .5 + 700, 210, 78, '#FFF6E4', 88);
    drawVerticalTitle(ctx, '团子大家族', W * .5 + 612, 300, 40, '#F0D8A8', 48);
    ctx.restore();
  }
  var b = prog(lt, 3.2, 4.6);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha = b;
    textTracked(ctx, 'CLANNAD ～AFTER STORY～ 挿入歌', W / 2, H * .215, 40, '#F7EFE0', 8, 700, F_SANS);
    ctx.restore();
  }
}

/* だんご だんご だんご だんご —— 四只蹦跳 */
function scChant(ctx, t, lt) {
  gradSky(ctx, [[0, '#3B4F85'], [.6, '#6C7BAE'], [1, '#C9A48F']]);
  drawStars(ctx, t, 46, .55, H * .5);
  cloudBand(ctx, t, H * .40, 3, 210, .5, 14);
  hills(ctx, H * .70, '#4C5A88', 24, .0035, 0);
  groundPlane(ctx, H * .84, '#2F3A66');
  sprouts(ctx, H * .86, 14, '#3E6E52', 5, t);

  var n = 4, s = 138;
  for (var i = 0; i < n; i++) {
    var x = W * .5 - 330 + i * 220;
    // 每拍弹一下：99BPM → 0.606s
    var beat = Math.floor((lt + i * .15) / .606);
    var pop = Math.max(0, 1 - ((lt + i * .15) % .606) / .30);
    var yy = H * .76 - easeOutBounce(Math.min(1, pop * 1.6)) * 70;
    var o = Object.assign({}, [V.pink, V.plain, V.green, V.yellow][i]);
    o.phase = i * 1.6; o.bob = 0;
    o.pose = pop > .05 ? 'cheer' : 'stand';
    o.eyes = pop > .05 ? 'happy' : 'dot';
    drawDango(ctx, x, yy, s * (1 + pop * .06), t, o);
  }
  confetti(ctx, t, 16, [P.red, P.dy, P.dp, P.dw], 9);
}

/* 大家族合影 */
function scFamily(ctx, t, lt) {
  bgCream(ctx);
  hills(ctx, H * .68, '#DCC9A8', 18, .003, 2);
  groundPlane(ctx, H * .80, '#CBB894');

  var rows = [
    { y: H * .74, s: 128, list: [V.brown, V.red, V.plain, V.green, V.yellow] },
    { y: H * .60, s: 104, list: [V.purple, V.pink, V.plain, V.cream] }
  ];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    for (var i = 0; i < row.list.length; i++) {
      var spread = W * .74;
      var x = W / 2 - spread / 2 + spread * i / (row.list.length - 1);
      var o = Object.assign({}, row.list[i]);
      o.phase = i * .8 + r * 2;
      o.bob = 7;
      o.pose = 'cheer';
      o.eyes = 'happy';
      drawDango(ctx, x, row.y, row.s, t, o);
    }
  }
  // 横幅
  var a = prog(lt, .3, 1.2);
  ctx.save(); ctx.globalAlpha = a;
  var bw = 700, bh = 120;
  roundRect(ctx, W / 2 - bw / 2, 96 - 40 * (1 - easeOutBack(a)), bw, bh, 16);
  inked(ctx, P.red, 7);
  textTracked(ctx, 'だんご大家族', W / 2, 96 + bh / 2 - 40 * (1 - easeOutBack(a)), 62, '#FFF6E4', 10, 700, F_SANS);
  ctx.restore();
  confetti(ctx, t, 22, [P.red, P.dy, P.dp, P.dw, P.green], 4);
}

/* やんちゃな焼きだんご —— 炭火烤团子 */
function scYaki(ctx, t, lt) {
  gradSky(ctx, [[0, '#3A2A22'], [.55, '#6B4432'], [1, '#A9704A']]);
  // 炭火
  groundPlane(ctx, H * .74, '#4A3226');
  var fy = H * .86;
  for (var i = 0; i < 26; i++) {
    var x = W * .16 + hash1(i * 3.1) * W * .68;
    var w = 40 + hash1(i * 5.7) * 46;
    ctx.save();
    ctx.globalAlpha = .9;
    roundRect(ctx, x, fy + hash1(i * 2.3) * 26, w, 30, 12);
    inked(ctx, i % 3 ? '#2E211A' : '#4A382C', 4);
    ctx.restore();
  }
  // 火苗
  for (var k = 0; k < 14; k++) {
    var fx = W * .2 + hash1(k * 4.1) * W * .6;
    var fl = 40 + Math.abs(Math.sin(t * 6 + k)) * 90;
    ctx.save();
    ctx.globalAlpha = .55 + Math.abs(Math.sin(t * 5 + k)) * .35;
    polyPath(ctx, [[fx, fy + 20], [fx - 16, fy - fl * .3], [fx, fy - fl], [fx + 16, fy - fl * .3]]);
    inked(ctx, k % 2 ? '#F2A03C' : '#E2652E', 0);
    ctx.restore();
  }
  // 串着的团子（烤）
  var n = 3;
  for (var j = 0; j < n; j++) {
    var sx = W * .30 + j * 300;
    skewerStick(ctx, sx, H * .30, 300, 0, 10);
    for (var m = 0; m < 4; m++) {
      var cy = H * .36 + m * 78;
      var r = 40;
      dangoRound(ctx, sx, cy, r, j === 1 ? '#C08A50' : (j === 2 ? '#D9A468' : '#CE9558'), 6);
      ctx.save();
      ctx.globalAlpha = .40; ctx.fillStyle = '#5E3A18';
      for (var q = 0; q < 3; q++) {
        var a2 = hash1(q * 7.1 + j + m) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(sx + Math.cos(a2) * 14, cy + Math.sin(a2) * 14, 8, 5, a2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      if (m === 0) {
        faceEyes(ctx, sx, cy - 4, 13, 4.6, 'dot', 0);
        faceCheeks(ctx, sx, cy + 6, 19, 6, 4.4);
        faceMouth(ctx, sx, cy + 13, 13, 'cat');
      }
    }
  }
  // 蒸汽
  for (var p = 0; p < 10; p++) {
    var px = W * .3 + (p % 3) * 300 + Math.sin(t * 2 + p) * 20;
    var py = H * .30 - ((t * 60 + p * 60) % 200);
    ctx.save();
    ctx.globalAlpha = .18 * (1 - ((t * 60 + p * 60) % 200) / 200);
    circle(ctx, px, py, 26 + p % 3 * 8); inked(ctx, '#FFF4E0', 0);
    ctx.restore();
  }
  // 调皮的表情标记
  ctx.save();
  ctx.globalAlpha = .95;
  textTracked(ctx, 'やんちゃ', W * .82, H * .22, 58, '#FFE9B8', 6, 700, F_SANS);
  ctx.restore();
}

/* やさしいあんだんご —— 红豆馅团子（碗） */
function scAn(ctx, t, lt) {
  gradSky(ctx, [[0, '#6E3E48'], [.6, '#9E6A6A'], [1, '#D8AE9A']]);
  groundPlane(ctx, H * .78, '#7A4A44');
  // 木碗
  var cx = W * .5, cy = H * .74;
  ctx.beginPath();
  ctx.moveTo(cx - 400, cy - 60);
  ctx.quadraticCurveTo(cx - 340, cy + 210, cx, cy + 220);
  ctx.quadraticCurveTo(cx + 340, cy + 210, cx + 400, cy - 60);
  ctx.closePath();
  inked(ctx, '#8A5A3E', 8);
  // 碗口（木沿）
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy - 60, 400, 78, 0, 0, Math.PI * 2);
  inked(ctx, '#5E3A28', 8);

  /* ── 红豆馅液面：一张连通的曲面，团子往下沉到哪儿，哪儿就凹 ──
   *   采样一条水平线，对每个团子叠一个高斯凹陷，再 fill 到底。
   *   这样团子上浮下潜时馅料始终是「一整片」，不会出现分离的半圆片。 */
  var n = 4, size = 108, sR = size * .5;
  var rx = 372, ry = 64, menY = cy - 62;
  var xs = [], ys = [];
  for (var i = 0; i < n; i++) {
    xs.push(cx - 210 + i * 140);
    // 上浮下沉：整组一起呼吸，相位略微错开
    ys.push(cy - 130 + Math.sin(t * 1.6 + i * .9) * 16);
  }
  function surfaceY(px) {
    var y = menY;
    for (var k = 0; k < n; k++) {
      // 团子「吃水线」：比中心低一点点，沉得越深凹陷越深
      var submerge = Math.max(0, ys[k] + sR * .62 - menY);
      var u = (px - xs[k]) / (sR * 2.1);
      y += submerge * Math.exp(-u * u);      // 高斯：平顺过渡，无硬边
    }
    return y;
  }
  ctx.beginPath();
  ctx.moveTo(cx - rx, menY);
  for (var px = cx - rx; px <= cx + rx; px += 6) ctx.lineTo(px, surfaceY(px));
  ctx.lineTo(cx + rx, menY);
  // 沿碗口内沿下探，首尾接上，闭合出一整片馅
  ctx.lineTo(cx + rx, menY + ry);
  ctx.ellipse(cx, menY, rx, ry, 0, 0, Math.PI, false);
  ctx.lineTo(cx - rx, menY);
  ctx.closePath();
  inked(ctx, '#7A1421', 0);
  // 液面高光：沿曲面走一道细亮线，强调「这是一片液面」
  ctx.save();
  ctx.strokeStyle = 'rgba(255,190,180,.30)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - rx + 30, surfaceY(cx - rx + 30) + 14);
  for (var qx = cx - rx + 30; qx <= cx + rx - 30; qx += 8) ctx.lineTo(qx, surfaceY(qx) + 14);
  ctx.stroke();
  ctx.restore();

  // 馅里冒出来的团子（身体压在液面下，只见上半）
  for (var j = 0; j < n; j++) {
    var o = Object.assign({}, [V.plain, V.pink, V.plain, V.green][j]);
    o.phase = j * 1.1; o.bob = 0;
    o.pose = 'sit';
    drawDango(ctx, xs[j], ys[j], size, t, o);
  }
  ctx.restore();
  // 温柔光晕（径向渐变，避免硬边圆像气泡）
  ctx.save();
  var gr = ctx.createRadialGradient(cx, cy - 190, 40, cx, cy - 190, 380);
  gr.addColorStop(0, 'rgba(255,233,208,.34)');
  gr.addColorStop(.55, 'rgba(255,222,190,.13)');
  gr.addColorStop(1, 'rgba(255,214,180,0)');
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(cx, cy - 190, 380, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = .9;
  textTracked(ctx, 'やさしい', W * .5, H * .16, 56, '#FFE4D4', 8, 700, F_SANS);
  ctx.restore();
}

/* すこし夢見がちな —— 做梦 */
function scYume(ctx, t, lt) {
  gradSky(ctx, [[0, '#4A3E78'], [.55, '#7E6BA8'], [1, '#C9A6C4']]);
  drawStars(ctx, t, 60, .7, H * .8);
  // 云床
  cloudBand(ctx, t, H * .66, 5, 230, .85, 8);
  // 睡觉的团子
  var x = W * .42, y = H * .70;
  var o = Object.assign({}, V.plain);
  o.eyes = 'sleepy'; o.mouth = 'wobble'; o.bob = 5; o.phase = 0;
  drawDango(ctx, x, y, 150, t, o);
  // zzz
  for (var i = 0; i < 3; i++) {
    var p = ((t * .42 + i * .34) % 1);
    ctx.save();
    ctx.globalAlpha = .85 * (1 - p);
    setFont(ctx, 44 + p * 46, 700, F_SANS);
    ctx.fillStyle = '#FFF0D8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('z', x + 140 + p * 130, y - 120 - p * 150);
    ctx.restore();
  }
  // 梦泡泡
  var bx = W * .74, by = H * .34;
  var bub = 1 + Math.sin(t * 1.4) * .03;
  ctx.save();
  circle(ctx, bx, by, 168 * bub); inked(ctx, 'rgba(255,246,230,.55)', 7);
  ctx.save();
  circle(ctx, bx, by, 162 * bub); ctx.clip();
  gradSky(ctx, [[0, '#3E3A70'], [1, '#9A86C0']]);
  drawMoon(ctx, bx + 50, by - 60, 46, t, {});
  drawDango(ctx, bx - 40, by + 40, 92, t, Object.assign({}, V.pink, { bob: 4 }));
  ctx.restore();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = .9;
  textTracked(ctx, '夢見がち', W * .5, H * .135, 54, '#F2E2F4', 8, 700, F_SANS);
  ctx.restore();
}

/* 月見だんご —— 赏月 */
function scTsukimi(ctx, t, lt) {
  gradSky(ctx, [[0, '#141C36'], [.5, '#26325C'], [1, '#3E4E80']]);
  drawStars(ctx, t, 110, .9, H * .74);
  drawMoon(ctx, W * .5, H * .30, 190, t, { color: '#F5E7B8' });
  // 供台
  groundPlane(ctx, H * .80, '#2A2A3E');
  roundRect(ctx, W * .5 - 300, H * .76, 600, 40, 8); inked(ctx, '#6B4E2E', 7);
  // 三只月见团子（叠塔）
  var cx = W * .5;
  var stack = [
    { x: cx, y: H * .70, s: 108 },
    { x: cx - 150, y: H * .72, s: 92 },
    { x: cx + 150, y: H * .72, s: 92 }
  ];
  for (var i = 0; i < stack.length; i++) {
    var o = Object.assign({}, V.yellow);
    o.phase = i * 1.3; o.bob = 4;
    drawDango(ctx, stack[i].x, stack[i].y, stack[i].s, t, o);
  }
  // 芒草
  for (var k = 0; k < 9; k++) {
    var gx = W * .06 + k * W * .11;
    var sway = Math.sin(t * 1.1 + k) * .12;
    ctx.save();
    ctx.translate(gx, H * .84); ctx.rotate(sway);
    ctx.strokeStyle = '#C9B078'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -230); ctx.stroke();
    for (var m = 0; m < 7; m++) {
      ctx.beginPath();
      ctx.moveTo(0, -230 + m * 22);
      ctx.lineTo((m % 2 ? 1 : -1) * 30, -250 + m * 22); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = .92;
  textTracked(ctx, '月見だんご', W * .5, H * .135, 54, '#FFF0C8', 8, 700, F_SANS);
  ctx.restore();
}

/* おすましごまだんご —— 芝麻团子 */
function scGoma(ctx, t, lt) {
  bgCream(ctx);
  // 芝麻雨
  for (var i = 0; i < 90; i++) {
    var x = hash1(i * 3.7) * W;
    var y = ((t * (90 + hash1(i * 2.1) * 140) + hash1(i * 5.3) * H) % (H + 120)) - 60;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(t * 2 + i);
    ctx.globalAlpha = .85;
    ctx.fillStyle = '#2A2420';
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  groundPlane(ctx, H * .78, '#D6C4A4');
  var cx = W * .5, cy = H * .70;
  var o = Object.assign({}, V.purple);
  o.phase = 0; o.bob = 5; o.pose = 'hold';
  o.eyes = 'happy'; o.mouth = 'open'; o.open = Math.sin(t * 4) * .3;
  drawDango(ctx, cx, cy, 176, t, o);
  // 端庄表情标记
  ctx.save();
  ctx.globalAlpha = .9;
  textTracked(ctx, 'おすまし', W * .5, H * .16, 56, '#5A4A3A', 8, 700, F_SANS);
  ctx.restore();
  // 碟子
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy + 108, 190, 40, 0, 0, Math.PI * 2); inked(ctx, '#E8DCC4', 7);
  ctx.restore();
}

/* 四つ子串だんご —— 四连串 */
function scKushi(ctx, t, lt) {
  gradSky(ctx, [[0, '#2E6E58'], [.55, '#4E8C6A'], [1, '#A8C08A']]);
  groundPlane(ctx, H * .82, '#2E5A44');
  var n = 3;
  for (var j = 0; j < n; j++) {
    var x = W * .26 + j * 340;
    var sway = Math.sin(t * 1.5 + j) * .05;
    ctx.save();
    ctx.translate(x, H * .86); ctx.rotate(sway);
    ctx.translate(-x, -H * .86);
    drawSkewerDango(ctx, x, H * .52, 132, t, {
      colors: [V.pink.color, V.plain.color, V.green.color, V.yellow.color],
      phase: j * 1.4
    });
    ctx.restore();
  }
  // 飘落樱瓣
  confetti(ctx, t, 18, ['#F6C6CE', '#FBE0E4', '#F2A8B6'], 12);
  ctx.save();
  ctx.globalAlpha = .92;
  textTracked(ctx, '四つ子串だんご', W * .5, H * .135, 56, '#FFF6E8', 8, 700, F_SANS);
  ctx.restore();
}

/* みんなみんなあわせて —— 集合 */
function scMinna(ctx, t, lt) {
  bgCream(ctx);
  hills(ctx, H * .70, '#E2D2B4', 20, .0032, 1);
  groundPlane(ctx, H * .82, '#D2BE9C');
  // 从两侧飞入
  var vs = [V.pink, V.plain, V.green, V.yellow, V.purple, V.brown, V.red, V.cream, V.plain];
  for (var i = 0; i < vs.length; i++) {
    var target = W * .5 - 400 + i * 100;
    var from = i % 2 ? W + 300 : -300;
    var p = easeOut(prog(lt, i * .07, i * .07 + .8));
    var x = lerp(from, target, p);
    var o = Object.assign({}, vs[i]);
    o.phase = i * .7; o.bob = 7; o.pose = 'cheer'; o.eyes = 'happy';
    var s = 96 + (i === 4 ? 22 : 0);
    drawDango(ctx, x, H * .74 + (i % 2 ? 26 : 0), s, t, o);
  }
  ctx.save();
  ctx.globalAlpha = prog(lt, 1.2, 2.0);
  textTracked(ctx, 'みんな みんな あわせて', W * .5, H * .20, 60, '#5A4636', 8, 700, F_SANS);
  ctx.restore();
}

/* 100人家族 —— 密集群像 */
function sc100(ctx, t, lt) {
  bgPink(ctx);
  hills(ctx, H * .66, '#C9A79A', 16, .003, 2);
  groundPlane(ctx, H * .78, '#B9968A');
  var colors = [V.pink, V.plain, V.green, V.yellow, V.purple, V.brown, V.red, V.cream];
  var idx = 0;
  for (var r = 0; r < 4; r++) {
    var y = H * .24 + r * 116;
    var s = 66 + r * 13;
    var cols = 15 - r;
    for (var c = 0; c < cols; c++) {
      var x = W * .5 - (cols - 1) * (W * .82) / (cols - 1) / 2 + c * (W * .82) / (cols - 1);
      var o = Object.assign({}, colors[idx % colors.length]);
      idx++;
      o.phase = (r * 3 + c) * .6;
      o.bob = 6;
      o.pose = 'cheer';
      o.eyes = 'happy';
      drawDango(ctx, x, y, s, t, o);
    }
  }
  // 100 大字（放在群像下方空地，避免压住团子）
  var p = easeOutBack(prog(lt, .5, 1.5));
  ctx.save();
  ctx.globalAlpha = Math.min(1, p * 1.4);
  ctx.translate(W * .5, H * .765);
  ctx.scale(lerp(.4, 1, p), lerp(.4, 1, p));
  setFont(ctx, 190, 700, F_SANS);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 16; ctx.strokeStyle = '#FFF6E4'; ctx.strokeText('100', 0, 0);
  ctx.fillStyle = P.red; ctx.fillText('100', 0, 0);
  ctx.restore();
  // 顶部标题：「100人家族」整句（原先只写「人家族」是残字，看着莫名其妙）
  ctx.save();
  ctx.globalAlpha = .95;
  textTracked(ctx, '100人家族', W * .5, H * .135, 56, '#6B4A3A', 10, 700, F_SANS);
  ctx.restore();
  confetti(ctx, t, 24, [P.red, P.dy, P.dw, P.pink], 21);
}

/* 赤ちゃんだんごは いつも幸せの中で —— 摇篮 */
function scBaby(ctx, t, lt) {
  gradSky(ctx, [[0, '#8A6AA8'], [.5, '#C08FC0'], [1, '#F0C4B8']]);
  drawStars(ctx, t, 44, .5, H * .55);
  // 光环
  for (var i = 0; i < 3; i++) {
    ctx.save();
    ctx.globalAlpha = .16 - i * .04;
    circle(ctx, W * .5, H * .58, 260 + i * 90 + Math.sin(t * 1.3 + i) * 12);
    inked(ctx, '#FFF6E0', 0);
    ctx.restore();
  }
  // 摇篮：低矮船体 + 整顶篷（拱 + 波浪垂边）+ 两根摇脚
  var cx = W * .5, cy = H * .70;
  var BW = 310;                 // 半宽
  var rimY = cy - 30;           // 沿口高度
  var hemY = rimY - 108;        // 篷的垂边高度
  var rock = Math.sin(t * 1.6) * .055;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rock); ctx.translate(-cx, -cy);

  // 摇脚（压在船体下面）
  ctx.lineWidth = 14; ctx.strokeStyle = P.ink; ctx.lineCap = 'round';
  for (var s = -1; s <= 1; s += 2) {
    ctx.beginPath();
    ctx.arc(cx + s * 168, rimY + 46, 150, Math.PI * .22, Math.PI * .78);
    ctx.stroke();
  }
  // 船体
  ctx.beginPath();
  ctx.moveTo(cx - BW, rimY);
  ctx.quadraticCurveTo(cx - BW * .92, rimY + 188, cx, rimY + 206);
  ctx.quadraticCurveTo(cx + BW * .92, rimY + 188, cx + BW, rimY);
  ctx.closePath();
  inked(ctx, '#D9A87E', 8);
  // 木纹
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - BW, rimY);
  ctx.quadraticCurveTo(cx - BW * .92, rimY + 188, cx, rimY + 206);
  ctx.quadraticCurveTo(cx + BW * .92, rimY + 188, cx + BW, rimY);
  ctx.closePath(); ctx.clip();
  ctx.globalAlpha = .20; ctx.strokeStyle = P.ink; ctx.lineWidth = 5;
  for (var w = 0; w < 3; w++) {
    ctx.beginPath();
    ctx.moveTo(cx - BW, rimY + 52 + w * 54);
    ctx.quadraticCurveTo(cx, rimY + 100 + w * 54, cx + BW, rimY + 52 + w * 54);
    ctx.stroke();
  }
  ctx.restore();
  // 沿口
  ctx.beginPath(); ctx.moveTo(cx - BW, rimY); ctx.lineTo(cx + BW, rimY);
  ctx.lineWidth = 9; ctx.strokeStyle = P.ink; ctx.stroke();

  // 篷：拱形 + 竖条纹 + 波浪垂边
  function canopyPath() {
    ctx.beginPath();
    ctx.moveTo(cx - BW * .98, hemY);
    ctx.quadraticCurveTo(cx - BW * .80, rimY - 336, cx, rimY - 344);
    ctx.quadraticCurveTo(cx + BW * .80, rimY - 336, cx + BW * .98, hemY);
    ctx.closePath();
  }
  canopyPath(); inked(ctx, '#E8B9C0', 8);
  ctx.save(); canopyPath(); ctx.clip();
  ctx.globalAlpha = .16; ctx.strokeStyle = P.ink; ctx.lineWidth = 13;
  for (var v = -3; v <= 3; v++) {
    ctx.beginPath();
    ctx.moveTo(cx + v * 68, hemY + 40);
    ctx.lineTo(cx + v * 30, rimY - 350);
    ctx.stroke();
  }
  ctx.restore();
  // 篷顶小球
  ctx.beginPath(); ctx.arc(cx, rimY - 356, 21, 0, Math.PI * 2); inked(ctx, '#C98A96', 6);
  // 垂边小球
  for (var b = 0; b <= 7; b++) {
    var bx = cx - BW * .98 + (BW * 1.96) * b / 7;
    ctx.beginPath(); ctx.arc(bx, hemY + 14, 21, 0, Math.PI * 2); inked(ctx, '#F0CDD3', 6);
  }
  // 婴儿团子（在篷下面）
  var o = Object.assign({}, V.baby);
  o.phase = 0; o.bob = 3; o.pose = 'none';
  o.eyes = 'sleepy'; o.mouth = 'smile';
  drawDango(ctx, cx, rimY - 22, 132, t, o);
  ctx.restore();
  // 飘心
  for (var k = 0; k < 8; k++) {
    var p2 = ((t * .3 + k * .125) % 1);
    ctx.save();
    ctx.globalAlpha = .8 * (1 - p2);
    var hx = cx + Math.sin(k * 2.3) * 240;
    var hy = cy - 120 - p2 * 320;
    var hs = 22 + Math.sin(k) * 6;
    ctx.translate(hx, hy);
    polyPath(ctx, [[0, hs * .5], [-hs, -hs * .3], [-hs * .55, -hs], [0, -hs * .45], [hs * .55, -hs], [hs, -hs * .3]]);
    inked(ctx, '#F2879A', 0);
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = .92;
  textTracked(ctx, '赤ちゃんだんごは', W * .5, H * .16, 58, '#FFF2E8', 8, 700, F_SANS);
  ctx.restore();
}

/* いつも幸せの中で */
function scShiawase(ctx, t, lt) {
  bgCream(ctx);
  // 幸せの光線
  ctx.save();
  ctx.globalAlpha = .20;
  for (var i = 0; i < 24; i++) {
    var a = i * Math.PI / 12 + t * .1;
    polyPath(ctx, [[W / 2, H * .58], [W / 2 + Math.cos(a) * 1200, H * .58 + Math.sin(a) * 1200],
    [W / 2 + Math.cos(a + .07) * 1200, H * .58 + Math.sin(a + .07) * 1200]]);
    inked(ctx, '#F2C878', 0);
  }
  ctx.restore();
  groundPlane(ctx, H * .80, '#DCC9A6');
  var vs = [V.baby, V.plain, V.pink, V.green, V.yellow, V.purple, V.plain, V.cream];
  dangoRow(ctx, t, H * .74, 112, vs, W * .84);
  // 大心
  var p = easeOutBack(prog(lt, .2, 1.4));
  ctx.save();
  ctx.translate(W * .5, H * .34);
  ctx.scale(p, p);
  polyPath(ctx, [[0, 90], [-170, -50], [-95, -140], [0, -60], [95, -140], [170, -50]]);
  inked(ctx, '#E8657E', 9);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = .95;
  textTracked(ctx, 'いつも幸せの中で', W * .5, H * .135, 56, '#6B4A3A', 8, 700, F_SANS);
  ctx.restore();
}

/* 年寄りだんごは 目を細めてる —— 老团子 */
function scToshiyori(ctx, t, lt) {
  bgTeal(ctx);
  groundPlane(ctx, H * .80, '#1B4A50');
  // 老团子（眼镜 + 眯眼 + 胡子）：主体放大，成为画面中心
  var cx = W * .5, cy = H * .60;
  var o = Object.assign({}, V.old);
  o.phase = 0; o.bob = 4; o.pose = 'hold'; o.lw = 9; o.noLegs = true;
  drawDango(ctx, cx, cy, 300, t, o);
  // 胡须（沿下巴弧线，扇形铺开）
  ctx.save();
  ctx.strokeStyle = '#F2EDE2'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  for (var i = -3; i <= 3; i++) {
    var a = i * .13;
    ctx.beginPath();
    ctx.moveTo(cx + i * 20, cy + 96);
    ctx.quadraticCurveTo(cx + i * 34 + Math.sin(a) * 30, cy + 140, cx + i * 46, cy + 176);
    ctx.stroke();
  }
  ctx.restore();
  // 拐杖（贴在手边）
  ctx.save();
  ctx.strokeStyle = P.wood; ctx.lineWidth = 16; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx + 232, cy + 60); ctx.lineTo(cx + 256, H * .82); ctx.stroke();
  ctx.strokeStyle = P.woodDk; ctx.lineWidth = 5; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + 224, cy + 24, 38, -Math.PI * .25, Math.PI * 1.05); ctx.stroke();
  ctx.restore();
  // 小团子围坐（拉近，左右各一，抬高到与老团子同一视觉层）
  var kids = [[V.baby, W * .17], [V.pink, W * .30], [V.green, W * .72], [V.yellow, W * .85]];
  for (var k = 0; k < kids.length; k++) {
    var oo = Object.assign({}, kids[k][0]);
    oo.phase = k * 1.5; oo.bob = 6; oo.pose = 'sit';
    oo.eyes = 'happy';
    drawDango(ctx, kids[k][1], H * .78, 118, t, oo);
  }
  ctx.save();
  ctx.globalAlpha = .92;
  textTracked(ctx, '年寄りだんごは', W * .5, H * .155, 56, '#FFF2DC', 8, 700, F_SANS);
  ctx.restore();
}

/* 目を細めてる */
function scHosome(ctx, t, lt) {
  bgCream(ctx);
  groundPlane(ctx, H * .86, '#D8C6A4');
  var cx = W * .5, cy = H * .52;
  // 眯眼特写：占满画面，压缩留白
  // 眯眼进度：先全睁着平静一会儿，然后 1.1s 里缓缓合上，最后保持在眯着的状态
  var sq = easeInOut(prog(lt, .9, 2.0));
  var o = Object.assign({}, V.old);
  o.phase = 0; o.bob = 0; o.pose = 'none'; o.lw = 13;
  o.eyes = 'squint'; o.squint = sq;
  drawDango(ctx, cx, cy, 430, t, o);
  /* 原先这里画过「眯眼强调弧」（两条 P.red 的弧压在眼睛上方）。
   *   实拍看就是老人脸上一道擦不掉的红色划痕 —— 而且眯眼本身已经由
   *   上眼睑落下表达了，不需要再加提示，直接删掉。 */
  // 幸福光点
  ctx.save();
  for (var k = 0; k < 10; k++) {
    var p = ((t * .35 + k * .1) % 1);
    ctx.globalAlpha = .55 * (1 - p);
    starPath(ctx, W * .5 + Math.sin(k * 2.7) * 520, H * .82 - p * 620, 12 + hash1(k) * 10, 5, 4, t * .4);
    inked(ctx, '#E8B93C', 0);
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = .95;
  textTracked(ctx, '目を細めてる', W * .5, H * .135, 58, '#6B4A3A', 8, 700, F_SANS);
  ctx.restore();
}

/* なかよしだんご 手をつなぎ —— 手牵手 */
function scNakayoshi(ctx, t, lt, sc) {
  var p2 = sc && sc.pass === 2;          // 副歌2 复唱：换机位
  if (p2) gradSky(ctx, [[0, '#15203C'], [.55, '#2E4472'], [1, '#6A7BA8']]);
  else gradSky(ctx, [[0, '#3B4F85'], [.55, '#7A88B8'], [1, '#D9B49A']]);
  drawStars(ctx, t, p2 ? 120 : 50, p2 ? .85 : .55, H * .5);
  hills(ctx, H * .74, p2 ? '#2E3A66' : '#5A6894', 22, .0034, p2 ? 2.4 : 1);
  groundPlane(ctx, H * .86, p2 ? '#1E2A4E' : '#3E4A76');
  var n = p2 ? 5 : 7, s = p2 ? 132 : 116;
  var spread = p2 ? W * .46 : W * .62;
  var baseY = p2 ? H * .74 : H * .78;
  var hugDelay = p2 ? .30 : .55;
  var vs2 = [V.plain, V.pink, V.yellow, V.green, V.cream];
  /* 歌词「なかよしだんご 手をつなぎ」唱到「手をつなぎ」时，手臂伸出去牵上。
   *   逐个牵手，从左到右错开 0.16s，牵上时手臂微微一顿（easeOutBack）。 */
  var hugAll = 0;
  for (var i = 0; i < n; i++) {
    var x = W / 2 - spread / 2 + spread * i / (n - 1);
    var vs = p2 ? vs2 : [V.pink, V.plain, V.green, V.yellow, V.purple, V.cream, V.red];
    var o = Object.assign({}, vs[i]);
    o.phase = i * .8; o.bob = p2 ? 12 : 8;
    o.pose = (i === 0) ? 'linkL' : (i === n - 1 ? 'linkR' : 'none');
    drawDango(ctx, x, baseY, s, t, o);
  }
  // 牵手：相邻两团子之间补一对胳膊 + 紧扣的手
  for (var k = 0; k < n - 1; k++) {
    var x1 = W / 2 - spread / 2 + spread * k / (n - 1);
    var x2 = W / 2 - spread / 2 + spread * (k + 1) / (n - 1);
    var hug = easeOutBack(clamp((lt - hugDelay - k * .16) / .70, 0, 1));
    hugAll = Math.max(hugAll, hug);
    linkHands(ctx, x1, x2, baseY, s, 7, hug);
  }
  /* 两端不补"场外好友"：端团子外侧那条手臂由 pose 的 linkL/linkR 补成自然下垂
   *   的短臂（见 dango.js），所以两端是完整团子、既牵上手又不显得断手。 */
  // 牵上手之后才浮出小心心，并且浮在紧扣的手上方
  for (var m = 0; m < n - 1; m++) {
    var hx = (W / 2 - spread / 2 + spread * m / (n - 1) + W / 2 - spread / 2 + spread * (m + 1) / (n - 1)) / 2;
    var hh = easeOutBack(clamp((lt - hugDelay - .30 - m * .16) / .80, 0, 1));
    if (hh <= .02) continue;
    var pulse = .6 + .4 * Math.sin(t * 3 + m);
    ctx.save();
    ctx.globalAlpha = .85 * pulse * hh;
    ctx.translate(hx, baseY - s * .39 - 34 * hh);
    var hs = (14 + pulse * 6) * hh;
    polyPath(ctx, [[0, hs * .5], [-hs, -hs * .3], [-hs * .55, -hs], [0, -hs * .45], [hs * .55, -hs], [hs, -hs * .3]]);
    inked(ctx, '#F2879A', 0);
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = .92;
  textTracked(ctx, 'なかよしだんご', W * .5, H * .16, 58, p2 ? '#E8F0FF' : '#FFF2DC', 8, 700, F_SANS);
  ctx.restore();
}

/* 大きなまるい輪になるよ —— 大圆环 */
function scWa(ctx, t, lt, sc) {
  var p2 = sc && sc.pass === 2;
  if (p2) gradSky(ctx, [[0, '#241C3E'], [.5, '#4A3A72'], [1, '#9A7FA8']]);
  else gradSky(ctx, [[0, '#1E2A52'], [.55, '#3E5088'], [1, '#7A8CB8']]);
  drawStars(ctx, t, p2 ? 140 : 90, .8, H * .82);
  var p = easeOut(prog(lt, 0, 1.6));
  // 副歌2：环更大、更外扩、团子更多，形成"更大的圆"
  var R = p2 ? lerp(120, 390, p) : lerp(90, 300, p);
  var cnt = p2 ? 16 : 12;
  var cy = p2 ? H * .52 : H * .50;
  ringOfDango(ctx, t, W * .5, cy, R, cnt,
    lerp(60, p2 ? 104 : 96, p),
    p2 ? [V.purple, V.red, V.plain, V.yellow, V.green, V.pink, V.brown, V.cream]
      : [V.pink, V.plain, V.green, V.yellow, V.purple, V.cream]);
  // 轮中心
  ctx.save();
  ctx.globalAlpha = .35 + .2 * Math.sin(t * 1.6);
  circle(ctx, W * .5, cy, R * (p2 ? .44 : .52));
  inked(ctx, p2 ? '#FFE2A8' : '#FFEFC8', 0);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = .95;
  textTracked(ctx, '大きなまるい輪', W * .5, H * .135, 58, p2 ? '#FFE8C0' : '#FFF6E4', 8, 700, F_SANS);
  ctx.restore();
}

/* 町をつくり だんご星の上 —— 团子小镇 */
function scMachi(ctx, t, lt, sc) {
  var p2 = sc && sc.pass === 2;
  if (p2) gradSky(ctx, [[0, '#3A2438'], [.5, '#7A4E52'], [1, '#C89A7E']]);
  else gradSky(ctx, [[0, '#28325C'], [.5, '#4E5E92'], [1, '#8A94C0']]);
  drawStars(ctx, t, p2 ? 30 : 70, p2 ? .45 : .7, H * .5);
  drawMoon(ctx, p2 ? W * .16 : W * .84, p2 ? H * .18 : H * .22, p2 ? 78 : 96, t, {});
  hills(ctx, H * .72, p2 ? '#5A3E44' : '#3A4674', 24, .003, p2 ? 1.8 : 0);
  groundPlane(ctx, H * .84, p2 ? '#4A2E38' : '#2E3862');
  // 小镇
  var xs = p2 ? [W * .12, W * .28, W * .44, W * .60, W * .76, W * .92]
    : [W * .18, W * .34, W * .50, W * .66, W * .82];
  var ws = p2 ? [140, 120, 170, 130, 150, 120] : [180, 150, 220, 160, 190];
  for (var i = 0; i < xs.length; i++) {
    house(ctx, xs[i], H * .84, ws[i],
      i % 2 ? (p2 ? '#E8C8A0' : P.cream) : '#E8D2B0',
      i % 3 ? P.red : P.teal, 7);
  }
  // 团子走在街上 —— 只用「镜内本地时间」算位置，避免同一镜在片中被复用两次时出现半只团子卡在画外
  var nw = p2 ? 5 : 3;
  var walk = p2 ? -1 : 1;                 // 副歌2 反向走（右→左）
  for (var k = 0; k < nw; k++) {
    var span = W + 300;
    var raw = (lt * 90 * (1 + k * .2) + k * 480) % span;
    var px = walk > 0 ? raw - 150 : W + 150 - raw;
    var o = Object.assign({}, [V.pink, V.green, V.yellow, V.purple, V.cream][k % 5]);
    o.phase = k * 1.3; o.bob = 8; o.pose = 'stand';
    drawDango(ctx, px, H * .80, p2 ? 74 : 84, t, o);
  }
  ctx.save();
  ctx.globalAlpha = .92;
  textTracked(ctx, '町をつくり', W * .5, H * .135, 58, p2 ? '#FFE0C8' : '#FFF6E4', 8, 700, F_SANS);
  ctx.restore();
}

/* だんご星の上 —— 团子星球 */
function scDangoHoshi(ctx, t, lt) {
  gradSky(ctx, [[0, '#12182E'], [.6, '#1E2A52'], [1, '#3A4A78']]);
  drawStars(ctx, t, 130, .9, H * .9);
  // 大星球
  var cx = W * .5, cy = H * 1.06, R = 700;
  circle(ctx, cx, cy, R); inked(ctx, '#C9A882', 0);
  // 星球上的陆地
  ctx.save();
  circle(ctx, cx, cy, R); ctx.clip();
  ctx.globalAlpha = .5; ctx.fillStyle = '#8FBF6A';
  for (var i = 0; i < 7; i++) {
    var a = hash1(i * 3.1) * Math.PI * 2;
    var rr = hash1(i * 5.7) * R * .8;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * rr, cy - R * .35 + Math.sin(a) * rr * .5,
      90 + hash1(i) * 130, 50 + hash1(i * 2.3) * 60, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  circle(ctx, cx, cy, R); ctx.lineWidth = 9; ctx.strokeStyle = P.ink; ctx.stroke();
  // 星球上的团子
  for (var k = 0; k < 8; k++) {
    var px = W * .12 + k * W * .11;
    var py = H * .80 + Math.sin(k * 1.7) * 30;
    var o = Object.assign({}, [V.pink, V.plain, V.green, V.yellow, V.purple, V.brown, V.red, V.cream][k]);
    o.phase = k * 1.1; o.bob = 7;
    drawDango(ctx, px, py, 78, t, o);
  }
  ctx.save();
  ctx.globalAlpha = .92;
  textTracked(ctx, 'だんご星の上', W * .5, H * .135, 58, '#FFF6E4', 8, 700, F_SANS);
  ctx.restore();
}

/* みんなで笑いあうよ —— 大笑 */
function scWarai(ctx, t, lt, sc) {
  var p2 = sc && sc.pass === 2;
  if (p2) { gradSky(ctx, [[0, '#E8B48C'], [.6, '#E8C8A0'], [1, '#D8B890']]); }
  else bgCream(ctx);
  groundPlane(ctx, H * .82, p2 ? '#C9A87C' : '#D6C2A0');
  var vs = p2 ? [V.cream, V.purple, V.green, V.pink, V.yellow, V.plain]
    : [V.pink, V.green, V.yellow, V.plain, V.purple, V.red];
  var n = p2 ? 7 : 6;
  var spread = p2 ? W * .74 : W * .48;
  for (var i = 0; i < n; i++) {
    var x = W * .5 - spread / 2 + i * (spread / (n - 1));
    var o = Object.assign({}, vs[i % vs.length]);
    o.phase = i * 1.1;
    o.bob = 14;
    o.pose = 'cheer';
    o.eyes = 'happy';
    o.mouth = 'open';
    o.open = Math.abs(Math.sin(t * 3.4 + i));
    drawDango(ctx, x, H * .74, p2 ? 108 : 124, t, o);
  }
  // 笑声符号
  for (var k = 0; k < 12; k++) {
    var p = ((t * .55 + k * .083) % 1);
    ctx.save();
    ctx.globalAlpha = .9 * (1 - p);
    var sx = W * .1 + hash1(k * 3.3) * W * .8;
    var sy = H * .62 - p * 300;
    setFont(ctx, 40 + hash1(k) * 26, 700, F_SANS);
    ctx.fillStyle = [P.red, '#E8A03C', '#4E9E5C'][k % 3];
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(['♪', '♫', '！', 'w'][k % 4], sx, sy);
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = .95;
  textTracked(ctx, 'みんなで笑いあうよ', W * .5, H * .135, 58, '#6B4A3A', 8, 700, F_SANS);
  ctx.restore();
}

/* うさぎもそらで手をふってみてる —— 兔子挥手 */
function scUsagi(ctx, t, lt, sc) {
  var p2 = sc && sc.pass === 2;
  if (p2) gradSky(ctx, [[0, '#2A1E3E'], [.55, '#4A3A6E'], [1, '#8A7AA8']]);
  else gradSky(ctx, [[0, '#1A2340'], [.55, '#2E3C6E'], [1, '#5A6A9E']]);
  drawStars(ctx, t, p2 ? 130 : 100, .85, H * .85);
  drawMoon(ctx, p2 ? W * .74 : W * .26, p2 ? H * .24 : H * .30, p2 ? 132 : 150, t, { color: p2 ? '#F0DCA8' : '#F5E7B8' });
  // 兔在月亮上
  drawRabbit(ctx, p2 ? W * .74 : W * .26, p2 ? H * .19 : H * .245, p2 ? 104 : 118, t, { eyes: 'happy' });
  // 云
  cloudBand(ctx, t, p2 ? H * .62 : H * .68, 4, 230, .75, 12);
  // 天上的团子们（抬头挥手）
  var n = p2 ? 5 : 4;
  var startX = p2 ? W * .10 : W * .48;
  var step = p2 ? 175 : 190;
  for (var i = 0; i < n; i++) {
    var x = startX + i * step;
    var o = Object.assign({}, [V.pink, V.plain, V.green, V.yellow, V.cream][i % 5]);
    o.phase = i * 1.2; o.bob = 6; o.pose = 'wave';
    o.eyes = 'happy'; o.mouth = 'open'; o.open = Math.abs(Math.sin(t * 3 + i));
    drawDango(ctx, x, p2 ? H * .76 : H * .72, p2 ? 92 : 104, t, o);
  }
  ctx.save();
  ctx.globalAlpha = .92;
  textTracked(ctx, 'うさぎも そらで手をふってみてる', W * .5, H * .135, 52, p2 ? '#E8DCFF' : '#FFF6E4', 6, 700, F_SANS);
  ctx.restore();
}

/* でっかいおつきさま —— 大月亮 */
function scOtsuki(ctx, t, lt, sc) {
  var p2 = sc && sc.pass === 2;
  if (p2) gradSky(ctx, [[0, '#14203A'], [.5, '#2A3C62'], [1, '#5A6E9E']]);
  else gradSky(ctx, [[0, '#0E1428'], [.5, '#1E2848'], [1, '#3A4874']]);
  drawStars(ctx, t, p2 ? 180 : 140, .95, H);
  var p = easeOut(prog(lt, 0, 2.2));
  var R = p2 ? lerp(120, 300, p) : lerp(140, 340, p);
  var moonY = p2 ? H * .46 : H * .54;
  drawMoon(ctx, W * .5, moonY, R, t, { color: p2 ? '#F0E0C0' : '#F7E9BE' });
  // 兔影
  ctx.save();
  ctx.globalAlpha = .28 * p;
  drawRabbit(ctx, W * .5, moonY - R * .08, R * .34, t, { eyes: 'sleepy' });
  ctx.restore();
  // 光晕（只描环，不盖月盘）—— 副歌2 画两圈
  ctx.save();
  ctx.globalAlpha = .22;
  circle(ctx, W * .5, moonY, R * 1.22 + Math.sin(t * 1.2) * 14);
  ctx.lineWidth = 16; ctx.strokeStyle = '#FFF0C8'; ctx.stroke();
  if (p2) {
    ctx.globalAlpha = .14;
    circle(ctx, W * .5, moonY, R * 1.48 + Math.sin(t * 1.2 + 1) * 18);
    ctx.lineWidth = 10; ctx.stroke();
  }
  ctx.restore();
  // 前景团子剪影 —— 副歌2 换成 7 只、更小、更贴地
  var nf = p2 ? 7 : 5;
  var sizef = p2 ? 96 : 118;
  var spreadf = p2 ? W * .74 : W * .42;
  for (var i = 0; i < nf; i++) {
    var x = W * .5 - spreadf / 2 + spreadf * i / (nf - 1);
    ctx.save();
    ctx.globalAlpha = .95;
    var o = Object.assign({}, p2 ? [V.plain, V.cream][i % 2] : V.plain);
    o.phase = i * 1.1; o.bob = 7;
    drawDango(ctx, x, p2 ? H * .82 : H * .80, sizef, t, o);
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = .95;
  textTracked(ctx, 'でっかいおつきさま', W * .5, H * .135, 58, p2 ? '#E8F0FF' : '#FFF6E4', 8, 700, F_SANS, 'rgba(16,22,44,.75)', 12);
  ctx.restore();
}

/* うれしいこと 悲しいことも —— 喜怒哀乐 */
function scUreshii(ctx, t, lt, sc) {
  var p2 = sc && sc.pass === 2;
  if (p2) { bgPink(ctx); groundPlane(ctx, H * .82, '#C09A8E'); }
  else { bgCream(ctx); groundPlane(ctx, H * .82, '#D8C6A4'); }
  var emotions = p2 ? ['sleepy', 'angry', 'dot', 'happy'] : ['happy', 'dot', 'angry', 'sleepy'];
  var mouths = p2 ? ['flat', 'wobble', 'smile', 'open'] : ['open', 'smile', 'wobble', 'flat'];
  var colors = p2 ? [P.dg, '#D9705F', P.dw, P.dp] : [P.dp, P.dw, '#D9705F', P.dg];
  for (var i = 0; i < 4; i++) {
    var x = W * .5 - 390 + i * 260;
    var o = Object.assign({}, { color: colors[i] });
    o.phase = i * 1.3; o.bob = 8;
    o.eyes = emotions[i]; o.mouth = mouths[i];
    o.open = Math.abs(Math.sin(t * 2.6 + i));
    o.cheekColor = i === 2 ? '#C0392B' : '#E8747C';
    drawDango(ctx, x, H * .72, p2 ? 132 : 150, t, o);
    // 表情符号
    var sym = (p2 ? ['z', '！', '…', '♪'] : ['♪', '…', '！', 'z'])[i];
    ctx.save();
    ctx.globalAlpha = .9;
    setFont(ctx, 56, 700, F_SANS);
    ctx.fillStyle = [P.red, '#8A7A68', '#D9705F', '#7A88B8'][i];
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var bob2 = Math.sin(t * 2.4 + i) * 10;
    ctx.fillText(sym, x, H * .52 + bob2);
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = .95;
  textTracked(ctx, 'うれしいこと 悲しいことも', W * .5, H * .135, 56, p2 ? '#5A3A34' : '#6B4A3A', 8, 700, F_SANS);
  ctx.restore();
}

/* 全部まるめて —— 揉成一个大团子 */
function scMarumete(ctx, t, lt, sc) {
  var p2 = sc && sc.pass === 2;
  if (p2) gradSky(ctx, [[0, '#2E1E4E'], [.6, '#5A3E72'], [1, '#A8829A']]);
  else gradSky(ctx, [[0, '#3E4E80'], [.6, '#6E7EA8'], [1, '#C9B49A']]);
  groundPlane(ctx, H * .84, p2 ? '#3E2E56' : '#4A5680');
  var cx = W * .5, cy = p2 ? H * .52 : H * .56;
  // 小团子飞向中心
  var colors = p2 ? [V.cream, V.red, V.green, V.purple, V.yellow, V.plain, V.pink, V.brown]
    : [V.pink, V.plain, V.green, V.yellow, V.purple, V.red, V.cream, V.brown];
  for (var i = 0; i < colors.length; i++) {
    var a = i / colors.length * Math.PI * 2 + t * (p2 ? -.3 : .3);
    var p = ((t * .32 + i * .125) % 1);
    var dist = lerp(p2 ? 720 : 620, 0, easeIn(p));
    var x = cx + Math.cos(a) * dist;
    var y = cy + Math.sin(a) * dist * .7;
    var o = Object.assign({}, colors[i]);
    o.phase = i; o.bob = 0;
    ctx.save();
    ctx.globalAlpha = .35 + .65 * (1 - p);
    drawDango(ctx, x, y, 76 * (1 - p * .4), t, o);
    ctx.restore();
  }
  // 大团子（核心）
  var grow = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.4));
  var o2 = Object.assign({}, p2 ? V.cream : V.plain);
  o2.phase = 0; o2.bob = 6; o2.pose = 'hold';
  o2.eyes = 'happy'; o2.mouth = p2 ? 'open' : 'smile';
  o2.open = Math.abs(Math.sin(t * 2.2));
  drawDango(ctx, cx, cy, (p2 ? 210 : 240) * grow, t, o2);
  // 光晕
  ctx.save();
  ctx.globalAlpha = .18;
  circle(ctx, cx, cy, (p2 ? 220 : 250) + Math.sin(t * 2) * 20); inked(ctx, '#FFF0C8', 0);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = .95;
  textTracked(ctx, '全部まるめて', W * .5, H * .135, 58, p2 ? '#FFE8D8' : '#FFF6E4', 8, 700, F_SANS);
  ctx.restore();
}

/* ══════════════ 间奏一：团子星的一天 ══════════════ */

function scMorning(ctx, t, lt) {
  bgDawn(ctx);
  drawMoon(ctx, W * .18, H * .22, 70, t, { alpha: .5, color: '#FFF0D0' });
  // 初日
  var sun = prog(lt, 0, 4);
  circle(ctx, W * .78, lerp(H * .68, H * .26, sun), 96);
  inked(ctx, '#F7D98A', 0);
  cloudBand(ctx, t, H * .40, 4, 200, .7, 10);
  hills(ctx, H * .70, '#8A7EA0', 22, .0032, 1);
  groundPlane(ctx, H * .82, '#6E6A88');
  sprouts(ctx, H * .84, 18, '#4E7A5A', 7, t);
  // 起床的团子
  for (var i = 0; i < 5; i++) {
    var x = W * .18 + i * W * .16;
    var o = Object.assign({}, [V.pink, V.plain, V.green, V.yellow, V.purple][i]);
    var wake = easeOutBounce(prog(lt, .6 + i * .25, 1.6 + i * .25));
    o.phase = i * 1.1; o.bob = 6;
    o.eyes = lt > 1.4 + i * .25 ? 'dot' : 'sleepy';
    o.mouth = lt > 1.8 + i * .25 ? 'open' : 'flat';
    drawDango(ctx, x, H * .80 + (1 - wake) * 40, 104, t, o);
  }
  textTracked(ctx, 'あさ', W * .5, H * .16, 54, '#FFF2E0', 10, 700, F_SANS);
}

function scNoon(ctx, t, lt) {
  gradSky(ctx, [[0, '#5AA0C8'], [.6, '#8AC4D8'], [1, '#D8E0C0']]);
  circle(ctx, W * .82, H * .18, 110); inked(ctx, '#F7E070', 0);
  for (var i = 0; i < 12; i++) {
    var a = i * Math.PI / 6 + t * .4;
    polyPath(ctx, [[W * .82 + Math.cos(a) * 130, H * .18 + Math.sin(a) * 130],
    [W * .82 + Math.cos(a) * 178, H * .18 + Math.sin(a) * 178],
    [W * .82 + Math.cos(a + .22) * 178, H * .18 + Math.sin(a + .22) * 178]]);
    ctx.save(); ctx.globalAlpha = .55; inked(ctx, '#F7E070', 0); ctx.restore();
  }
  cloudBand(ctx, t, H * .34, 5, 220, .9, 18);
  hills(ctx, H * .72, '#7EA858', 26, .003, 0);
  groundPlane(ctx, H * .84, '#5E8A44');
  // 野餐
  ctx.save();
  ctx.beginPath(); ctx.ellipse(W * .5, H * .90, 460, 80, 0, 0, Math.PI * 2);
  inked(ctx, '#E8D8B8', 0); ctx.restore();
  for (var k = 0; k < 4; k++) {
    var x = W * .5 - 260 + k * 174;
    var o = Object.assign({}, [V.pink, V.plain, V.green, V.yellow][k]);
    o.phase = k * 1.2; o.bob = 9; o.pose = 'sit';
    o.eyes = 'happy'; o.mouth = 'open'; o.open = Math.abs(Math.sin(t * 3 + k));
    drawDango(ctx, x, H * .80, 116, t, o);
  }
  textTracked(ctx, 'ひる', W * .5, H * .15, 54, '#2E4A2E', 10, 700, F_SANS);
}

function scTea(ctx, t, lt) {
  bgCream(ctx);
  groundPlane(ctx, H * .86, '#D8C4A0');
  // 茶桌
  var tableY = H * .74;
  roundRect(ctx, W * .16, tableY, W * .68, 38, 12); inked(ctx, '#8A6234', 8);
  // 桌腿
  ctx.save();
  ctx.fillStyle = '#7A5530';
  ctx.fillRect(W * .21, tableY + 38, 34, H * .86 - tableY - 38);
  ctx.fillRect(W * .79 - 34, tableY + 38, 34, H * .86 - tableY - 38);
  ctx.restore();
  // 茶壶（坐在桌面上）
  var cx = W * .30, cy = tableY - 78;
  circle(ctx, cx, cy, 78); inked(ctx, P.teal, 7);
  ctx.save();
  ctx.beginPath(); ctx.arc(cx + 82, cy - 6, 44, -Math.PI * .62, Math.PI * .52);
  ctx.lineWidth = 13; ctx.strokeStyle = P.teal; ctx.stroke(); ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.moveTo(cx - 64, cy - 46); ctx.lineTo(cx - 84, cy - 104);
  ctx.lineWidth = 12; ctx.strokeStyle = P.teal; ctx.stroke(); ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.moveTo(cx - 62, cy - 68); ctx.quadraticCurveTo(cx, cy - 118, cx + 62, cy - 68);
  ctx.lineWidth = 13; ctx.strokeStyle = P.ink; ctx.stroke(); ctx.restore();
  // 蒸汽
  for (var s = 0; s < 6; s++) {
    var p = ((t * .4 + s * .167) % 1);
    ctx.save(); ctx.globalAlpha = .34 * (1 - p);
    circle(ctx, cx - 84 + Math.sin(p * 6 + s) * 22, cy - 120 - p * 200, 16 + p * 24);
    inked(ctx, '#FFF8E8', 0); ctx.restore();
  }
  // 茶杯（放大，坐在桌上）
  for (var i = 0; i < 3; i++) {
    var x = W * .50 + i * 150;
    roundRect(ctx, x - 52, tableY - 78, 104, 78, 14); inked(ctx, '#F2E8D4', 8);
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x, tableY - 78, 52, 15, 0, 0, Math.PI * 2);
    inked(ctx, '#E8DCC4', 7); ctx.restore();
    // 茶汤
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x, tableY - 78, 42, 11, 0, 0, Math.PI * 2);
    inked(ctx, '#C9A87C', 0); ctx.restore();
  }
  // 盘子 + 串团子
  var px = W * .80;
  ctx.save();
  ctx.beginPath(); ctx.ellipse(px, tableY - 6, 150, 34, 0, 0, Math.PI * 2);
  inked(ctx, '#EFE4CE', 8); ctx.restore();
  for (var k = 0; k < 3; k++) {
    drawSkewerDango(ctx, px - 74 + k * 74, tableY - 46, 56, t + k * .6,
      { colors: [[P.dp, P.dw, P.dg, P.dy], [P.dw, P.dg, P.dy, P.dp], [P.dg, P.dy, P.dp, P.dw]][k] });
  }
  // 坐在桌边的三只团子
  for (var m = 0; m < 3; m++) {
    var mx = W * .50 + m * 150;
    var o = Object.assign({}, [V.plain, V.pink, V.green][m]);
    o.phase = m * 1.3; o.bob = 5; o.pose = 'sit';
    o.eyes = 'happy'; o.mouth = 'open'; o.open = Math.abs(Math.sin(t * 2.2 + m));
    drawDango(ctx, mx, tableY - 176, 92, t, o);
  }
  textTracked(ctx, 'おやつ', W * .5, H * .15, 54, '#6B4A3A', 10, 700, F_SANS);
}

function scDusk(ctx, t, lt) {
  gradSky(ctx, [[0, '#3E3A78'], [.35, '#8A5A88'], [.62, '#D97A6A'], [1, '#F2C078']]);
  circle(ctx, W * .5, H * .74, 130); inked(ctx, '#F7D98A', 0);
  cloudBand(ctx, t, H * .40, 5, 250, .75, 8);
  hills(ctx, H * .70, '#5A4270', 24, .0032, 2);
  groundPlane(ctx, H * .84, '#3E3058');
  // 归家的团子剪影
  for (var i = 0; i < 4; i++) {
    var x = W * .22 + i * W * .18;
    var o = Object.assign({}, { color: '#2A2246', cheekAlpha: 0 });
    o.phase = i * 1.2; o.bob = 7; o.pose = 'stand';
    drawDango(ctx, x, H * .80, 108, t, o);
  }
  textTracked(ctx, 'ゆうがた', W * .5, H * .155, 54, '#FFF2E0', 10, 700, F_SANS);
}

function scNight(ctx, t, lt) {
  gradSky(ctx, [[0, '#0E1428'], [.55, '#1E2A52'], [1, '#38466E']]);
  drawStars(ctx, t, 130, .95, H * .8);
  drawMoon(ctx, W * .80, H * .24, 118, t, { color: '#F5E7B8' });
  hills(ctx, H * .74, '#1E2646', 24, .003, 1);
  groundPlane(ctx, H * .84, '#141A34');
  // 篝火（加大：柴堆 + 三层火舌 + 火星）
  var fx = W * .5, fy = H * .84;
  ctx.save();
  ctx.strokeStyle = '#6B4A2A'; ctx.lineWidth = 22; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(fx - 120, fy + 26); ctx.lineTo(fx + 118, fy - 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fx - 118, fy - 12); ctx.lineTo(fx + 120, fy + 24); ctx.stroke();
  ctx.restore();
  for (var k = 0; k < 9; k++) {
    var fl = 170 + Math.abs(Math.sin(t * 3.4 + k * .8)) * 150 - (k % 3) * 40;
    var wob = Math.sin(t * 4.2 + k) * 30;
    var bx = fx - 78 + k * 20;
    ctx.save();
    ctx.globalAlpha = .62 + Math.abs(Math.sin(t * 5 + k * 1.3)) * .34;
    ctx.beginPath();
    ctx.moveTo(bx - 34, fy + 14);
    ctx.quadraticCurveTo(bx - 46 + wob * .5, fy - fl * .55, bx + wob, fy - fl);
    ctx.quadraticCurveTo(bx + 46 + wob * .5, fy - fl * .55, bx + 34, fy + 14);
    ctx.closePath();
    inked(ctx, ['#E2652E', '#F2A03C', '#F7D06A'][k % 3], 0);
    ctx.restore();
  }
  // 火星
  for (var m = 0; m < 16; m++) {
    var sp = ((t * .42 + m * .0625) % 1);
    ctx.save();
    ctx.globalAlpha = .85 * (1 - sp);
    circle(ctx, fx + Math.sin(m * 3.1) * 130, fy - 120 - sp * 420, 4 + hash1(m) * 5);
    inked(m % 3 ? '#F7D06A' : '#E2652E', 0);
    ctx.restore();
  }
  // 围火团子（围着火堆坐一圈，左右各二、正前方一）
  var seats = [[-360, H * .80], [-215, H * .835], [215, H * .835], [360, H * .80], [0, H * .875]];
  for (var i = 0; i < seats.length; i++) {
    var o = Object.assign({}, [V.pink, V.plain, V.green, V.yellow, V.purple][i]);
    o.phase = i * 1.1; o.bob = 6; o.pose = 'sit'; o.eyes = 'happy';
    o.mouth = 'open'; o.open = Math.abs(Math.sin(t * 2.4 + i));
    drawDango(ctx, fx + seats[i][0], seats[i][1], i === 4 ? 108 : 96, t, o);
  }
  textTracked(ctx, 'よる', W * .5, H * .155, 54, '#FFF2E0', 10, 700, F_SANS, 'rgba(10,14,30,.6)', 10);
}

function scMoonrise(ctx, t, lt) {
  gradSky(ctx, [[0, '#0A1024'], [.6, '#1A2444'], [1, '#3A4874']]);
  drawStars(ctx, t, 150, .95, H);
  var p = easeOut(prog(lt, 0, 3.4));
  drawMoon(ctx, W * .5, lerp(H * 1.25, H * .40, p), 200, t, { color: '#F7E9BE' });
  groundPlane(ctx, H * .90, '#0E1428');
  // 剪影团子：夜色里用冷色眼部/嘴部描线代替实心墨点，远看也能认出是团子
  var RIM = '#8FA8D8';
  for (var i = 0; i < 6; i++) {
    var x = W * .1 + i * W * .16;
    var o = Object.assign({}, { color: '#0E1428', cheekAlpha: 0 });
    o.phase = i; o.bob = 4; o.pose = 'stand';
    o.eyes = 'rim'; o.faceInk = RIM; o.lw = 0; o.mouth = 'smile';
    drawDango(ctx, x, H * .86, 96, t, o);
    // 轮廓加一道月光边缘光，把黑影从夜空里"托"出来
    ctx.save();
    ctx.globalAlpha = .40;
    ctx.strokeStyle = '#7A8CC8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, H * .86 + Math.sin(t * 2.2 + i) * 4, 48, 48 * 1.16, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/* ══════════════ 间奏二：宇宙巡游 ══════════════ */

function scGalaxy(ctx, t, lt) {
  gradSky(ctx, [[0, '#080C1E'], [.5, '#141C38'], [1, '#2A3460']]);
  drawStars(ctx, t, 200, .95, H);
  // 银河带（细密星尘 + 明确边界，避免大光斑像散景）
  ctx.save();
  ctx.translate(W * .5, H * .5); ctx.rotate(-.34);
  for (var i = 0; i < 260; i++) {
    var u = hash1(i * 3.1) - .5;
    var gx = u * W * 1.5;
    var gy = (hash1(i * 7.7) - .5) * 96 * (1 - Math.abs(u) * .7);
    var rr = 1.6 + hash1(i * 5.5) * 4.2;
    ctx.globalAlpha = .16 + hash1(i * 2.3) * .46;
    ctx.fillStyle = i % 5 ? '#DCE4F8' : '#F6DCC2';
    circle(ctx, gx, gy, rr); ctx.fill();
  }
  // 带内亮核
  for (var j = 0; j < 26; j++) {
    ctx.globalAlpha = .30 + hash1(j * 9.1) * .34;
    ctx.fillStyle = '#FFFFFF';
    circle(ctx, (hash1(j * 4.3) - .5) * W * 1.1, (hash1(j * 6.9) - .5) * 44, 1.2 + hash1(j * 8.2) * 2.0);
    ctx.fill();
  }
  ctx.restore();
  // 飞过的团子（排队巡游）。用「镜内本地时间」算相位，
  // 并把 4 只等距铺满一个循环，任何时刻画面上都有 3~4 只在框内。
  for (var k = 0; k < 4; k++) {
    var p = ((lt * .16 + k * .25) % 1);
    var x = lerp(-320, W + 320, p);
    var y = H * .52 + Math.sin(p * Math.PI) * -70 + k * 6;
    var o = Object.assign({}, [V.pink, V.plain, V.green, V.yellow][k]);
    o.phase = k * 1.2; o.bob = 5; o.pose = 'none'; o.eyes = 'happy';
    // 拖尾（收细、贴近身体）
    ctx.save();
    for (var m = 1; m <= 8; m++) {
      ctx.globalAlpha = .20 * (1 - m / 9);
      circle(ctx, x - 52 - m * 26, y + m * 2, 17 - m * 1.7);
      inked(ctx, '#9AB4E8', 0);
    }
    ctx.restore();
    drawDango(ctx, x, y, 96, t, o);
  }
  textTracked(ctx, 'ぎんが', W * .5, H * .135, 54, '#E8EEFF', 10, 700, F_SANS);
}

function scDangoPlanet(ctx, t, lt) {
  gradSky(ctx, [[0, '#0A1024'], [.6, '#1A2444'], [1, '#2E3A66']]);
  drawStars(ctx, t, 160, .9, H);
  var cx = W * .5, cy = H * .60, R = 340;
  var TILT = -.28;                  // 星环的倾斜角
  var RING_A = R * 1.28;            // 环的长半轴（收到不伸出行星太远）
  var RING_B = R * .40;             // 环的短半轴

  /* ── 轨道模型 ──────────────────────────────────────────
   * 团子沿这条倾斜椭圆巡游（与星环同一条曲线）。
   * 关键修正（踩过的坑）：
   *   1) 前后不能用 cos(参数角) 判定 —— 椭圆整体旋转了 TILT 之后，
   *      屏幕上的"前/后"由旋转后的 y 决定，跟参数角的正余弦不是一回事。
   *      这里改成：把点算到屏幕坐标后，用「这块要画的点相对行星中心的
   *      切向大小」判断 —— 即该点位于椭圆的上半支还是下半支。
   *   2) 遮挡不能用"整只在背后/整只在前面"二分，会出现「还压在行星上
   *      就整只消失」。改成按行星圆做**相交裁剪**：圆外的团子整只画，
   *      圆内的按比例裁，跨在边缘的露出未被盖住的那部分。
   * 实现方式：每只团子都画两遍，第一遍在行星之前（被行星盖住），
   * 第二遍在行星之后（盖住行星）。第二遍用行星圆做 clip 的反相 ——
   * canvas 没有反相 clip，所以第二遍改成：先画行星，再把它上面那块
   * 团子「补回来」，靠的是行星圆本身的 clip 只保留圆外部分。 */
  function orbitPoint(ang) {
    var ex = Math.cos(ang) * RING_A;
    var ey = Math.sin(ang) * RING_B;
    var sx = cx + ex * Math.cos(TILT) - ey * Math.sin(TILT);
    var sy = cy + ex * Math.sin(TILT) + ey * Math.cos(TILT);
    // 旋转后，椭圆短轴的屏幕方向决定"前/后"：ey > 0 的一侧朝屏幕下方 = 前面
    return { x: sx, y: sy, behind: ey < 0 };
  }

  /* 环上任意一段的路径（截取参数角 a0→a1），用于把环切开成前后两半。
   * 注意：ctx.ellipse 的起止角是**几何角**，会被长短半轴压扁，
   * 与参数角不是一回事；所以这里改用逐点折线，保证切点和轨道点一致。 */
  function ringArc(a0, a1) {
    var STEPS = 96;
    ctx.beginPath();
    for (var i = 0; i <= STEPS; i++) {
      var ang = a0 + (a1 - a0) * (i / STEPS);
      var p0 = orbitPoint(ang);
      if (i === 0) ctx.moveTo(p0.x, p0.y); else ctx.lineTo(p0.x, p0.y);
    }
    ctx.stroke();
  }
  /* 环与行星圆的交角 θ₀：环在球内的条件是 A²cos²θ + B²sin²θ < R²
   *   （旋转不改变模长），解得 |θ| < θ₀。
   *   所以「球外可见段」= |θ| ∈ (θ₀, π-θ₀) 之外的两段，
   *   也就是环从行星左右两侧绕出来的那两小段。 */
  function ringOuterT() {
    var c2 = (R * R - RING_B * RING_B) / (RING_A * RING_A - RING_B * RING_B);
    if (c2 <= 0) return Math.PI * .5;   // 环整个在球内（退化）：给个安全值
    if (c2 >= 1) return 0;              // 环整个在球外：不用裁
    return Math.acos(Math.sqrt(c2));
  }
  var RING_T = ringOuterT();
  function drawRing(a0, a1, alpha, outer) {
    var fn = outer ? ringArcOuter : ringArc;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 26; ctx.strokeStyle = '#8FA8D8'; fn(a0, a1);
    ctx.lineWidth = 10; ctx.strokeStyle = '#CFD8F2'; fn(a0, a1);
    ctx.restore();
  }
  /* 前/后支都只画球外的两小段 —— 环不会浮在球面上。 */
  function ringArcOuter(a0, a1) {
    if (RING_T <= 0) { ringArc(a0, a1); return; }
    ringArc(-RING_T, RING_T);                    // 右侧绕出段
    ringArc(Math.PI - RING_T, Math.PI + RING_T); // 左侧绕出段
  }

  // 三只团子沿轨道等距分布（各差 2π/3）。用**镜内本地时间**驱动，
  // 这样这镜在片中出现一次就固定从同一相位开始，不会因为全曲时间
  // 不同而出现「刚好三只全在背面」的空画面。
  var N = 3, BODIES = [V.pink, V.green, V.yellow];
  var speed = .42;
  var angles = [];
  for (var s0 = 0; s0 < N; s0++) angles.push((lt * speed + s0 * Math.PI * 2 / N) % (Math.PI * 2));

  /* 一只团子的两遍画法：
   *   pass 'back'  —— 只在「行星圆之外」的部分可见（被行星挡住的那半）
   *   pass 'front' —— 整只都画（它本来就该盖在行星上）
   * 于是团子转进行星背后时，圆外那半留在前面、圆内那半被行星吃掉，
   * 形成「被遮住 → 露出一部分 → 完全露出」的连续过程，不会整只瞬移。 */
  function dangoClipped(p, size, o, pass) {
    ctx.save();
    if (pass === 'back') {
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.moveTo(cx + R, cy);
      ctx.arc(cx, cy, R, 0, Math.PI * 2, true);   // 反向弧 = 挖掉行星圆
      ctx.closePath();
      ctx.clip('evenodd');
    }
    drawDango(ctx, p.x, p.y, size, t, o);
    ctx.restore();
  }

  /* ── 第 1 层：环的后半段（球外部分绕在行星左右两侧） ── */
  drawRing(Math.PI, Math.PI * 2, 0.55, true);

  /* ── 第 2 层：星球本体 ── */
  circle(ctx, cx, cy, R); inked(ctx, '#D9B98A', 9);
  ctx.save();
  circle(ctx, cx, cy, R); ctx.clip();
  var spin = t * .35;
  for (var i = 0; i < 9; i++) {
    var a = hash1(i * 3.1) * Math.PI * 2 + spin;
    var rr = hash1(i * 5.7) * R * .78;
    ctx.globalAlpha = .55; ctx.fillStyle = i % 3 ? '#8FBF6A' : '#6EA8C8';
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .8,
      46 + hash1(i) * 70, 26 + hash1(i * 2.3) * 36, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  /* ── 第 3 层：星球背后的团子（被行星圆裁掉圆内部分） ── */
  for (var kb = 0; kb < N; kb++) {
    var pb = orbitPoint(angles[kb]);
    if (!pb.behind) continue;
    var ob = Object.assign({}, BODIES[kb]);
    ob.phase = kb; ob.bob = 3; ob.pose = 'none';
    ctx.save(); ctx.globalAlpha = .88;
    dangoClipped(pb, 82, ob, 'back');
    ctx.restore();
  }

  /* ── 第 4 层：环的前半段（经过行星时绕到球后，不浮在表面上） ── */
  drawRing(0, Math.PI, 0.80, true);

  /* ── 第 5 层：星球前面的团子（只画落在行星圆内的那部分，压在行星上） ── */
  for (var kf = 0; kf < N; kf++) {
    var pf = orbitPoint(angles[kf]);
    if (pf.behind) continue;
    var of = Object.assign({}, BODIES[kf]);
    of.phase = kf; of.bob = 3; of.pose = 'none';
    ctx.save(); dangoClipped(pf, 92, of, 'front'); ctx.restore();
  }

  textTracked(ctx, 'だんご星', W * .5, H * .135, 54, '#E8EEFF', 10, 700, F_SANS);
}

/* 画星环的一半：back=true 画「星球背后」那半，back=false 画前面那半。
 *   背后的那半要够亮才能从星球两侧露出来，否则会被星球完全吃掉。 */
function drawRingHalf(ctx, cx, cy, R, tilt, back, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 26; ctx.strokeStyle = '#8FA8D8';
  ringArcPath(ctx, cx, cy, R, tilt, back); ctx.stroke();
  ctx.lineWidth = 10; ctx.strokeStyle = '#CFD8F2';
  ringArcPath(ctx, cx, cy, R, tilt, back); ctx.stroke();
  ctx.restore();
}

function ringArcPath(ctx, cx, cy, R, tilt, back) {
  // 椭圆极角 0..PI 是上半圈（对应环的后半），PI..2PI 是下半圈
  var a0 = back ? Math.PI : 0;
  var a1 = back ? Math.PI * 2 : Math.PI;
  ctx.beginPath();
  ctx.ellipse(cx, cy, R * 1.6, R * .36, tilt, a0, a1);
}

function scMoonClose(ctx, t, lt) {
  gradSky(ctx, [[0, '#080C1E'], [1, '#1E2848']]);
  drawStars(ctx, t, 110, .85, H);
  var p = easeOut(prog(lt, 0, 3.6));
  drawMoon(ctx, W * .5, H * .56, lerp(230, 390, p), t, { color: '#F7E9BE' });
  // 兔
  ctx.save();
  ctx.globalAlpha = .9;
  drawRabbit(ctx, W * .5, H * .50, 150 * p, t, { eyes: 'happy' });
  ctx.restore();
  // 光晕环（描环）
  for (var i = 0; i < 3; i++) {
    ctx.save();
    ctx.globalAlpha = .20 - i * .05;
    circle(ctx, W * .5, H * .56, 470 + i * 70 + Math.sin(t * 1.4 + i) * 12);
    ctx.lineWidth = 14 - i * 3; ctx.strokeStyle = '#FFF0C8'; ctx.stroke();
    ctx.restore();
  }
  textTracked(ctx, 'おつきさま', W * .5, H * .135, 54, '#E8EEFF', 10, 700, F_SANS, 'rgba(12,16,36,.7)', 11);
}

function scRabbitJump(ctx, t, lt) {
  gradSky(ctx, [[0, '#101838'], [.6, '#28325C'], [1, '#4A5A90']]);
  drawStars(ctx, t, 120, .9, H * .9);
  // 云阶
  for (var i = 0; i < 5; i++) {
    cloud(ctx, W * (.1 + i * .21), H * (.30 + (i % 2) * .18), 150, '#EDE4D2', 6);
  }
  // 跳跃的兔子
  var n = 4;
  for (var k = 0; k < n; k++) {
    var cyc = (t * .5 + k * .25) % 1;
    var jump = Math.sin(cyc * Math.PI);
    var x = W * (.14 + k * .24);
    var y = H * .70 - jump * 220;
    var rot = Math.cos(cyc * Math.PI) * .3;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot); ctx.translate(-x, -y);
    drawRabbit(ctx, x, y, 112, t, { eyes: 'happy', phase: k });
    ctx.restore();
    // 星星尘
    ctx.save();
    ctx.globalAlpha = .5;
    for (var m = 0; m < 4; m++) {
      starPath(ctx, x - 40 + m * 26, y + 60 + Math.sin(t * 3 + m) * 8, 10, 4, 5, 0);
      inked(ctx, '#FFF0C8', 0);
    }
    ctx.restore();
  }
  textTracked(ctx, 'うさぎ', W * .5, H * .135, 54, '#E8EEFF', 10, 700, F_SANS);
}

function scHandRing(ctx, t, lt) {
  gradSky(ctx, [[0, '#0C1228'],[.6, '#1E2A52'],[1, '#3A4874']]);
  drawStars(ctx, t, 140, .9, H * .85);
  var R = lerp(140, 380, easeOut(prog(lt, 0, 2.6)));
  ringOfDango(ctx, t, W * .5, H * .54, R, 16, 92,
    [V.pink, V.plain, V.green, V.yellow, V.purple, V.cream, V.red, V.brown]);
  // 手拉手的连接线：不是静态圆环，而是一段段长出来，最后闭合成环
  var hug = easeInOut(prog(lt, .5, 2.2));
  ctx.save();
  ctx.globalAlpha = .38 * hug;
  ctx.lineWidth = 8; ctx.strokeStyle = '#F2D8A8'; ctx.lineCap = 'round';
  var segs = 16;
  for (var i = 0; i < segs; i++) {
    // 每段从 0 长出来，按顺时针错开
    var g = clamp((hug * segs) - i, 0, 1);
    if (g <= 0) continue;
    var a0 = Math.PI * 2 * (i / segs) - Math.PI / 2;
    var a1 = a0 + Math.PI * 2 / segs * g;
    ctx.beginPath(); ctx.arc(W * .5, H * .54, R, a0, a1); ctx.stroke();
  }
  ctx.restore();
  textTracked(ctx, 'てをつなぎ', W * .5, H * .135, 54, '#E8EEFF', 10, 700, F_SANS);
}

function scReunion(ctx, t, lt) {
  gradSky(ctx, [[0, '#141C36'], [.55, '#2E3C6E'], [1, '#6E7EA8']]);
  drawStars(ctx, t, 120, .8, H * .7);
  drawMoon(ctx, W * .5, H * .26, 140, t, { color: '#F5E7B8' });
  cloudBand(ctx, t, H * .62, 5, 240, .85, 8);
  // 所有团子聚在云上，手牵手挤成一排
  var colors = [V.pink, V.plain, V.green, V.yellow, V.purple, V.brown, V.red, V.cream, V.plain, V.pink, V.green];
  var n = colors.length, spread = W * .76, s = 100;
  function rowY(i) { return H * .76 + (i % 2 ? 30 : 0); }
  for (var i = 0; i < n; i++) {
    var x = W / 2 - spread / 2 + spread * i / (n - 1);
    var o = Object.assign({}, colors[i]);
    o.phase = i * .7; o.bob = 10; o.eyes = 'happy';
    // 奇数号只伸左手、偶数号只伸右手（外侧臂自动下垂），最左/最右各多一条自然垂臂
    if (i % 2 === 0) o.pose = 'linkL'; else o.pose = 'linkR';
    if (i === n - 1) o.pose = 'linkL';
    drawDango(ctx, x, rowY(i), s, t, o);
  }
  // 一对手牵一段：只连「同高」的相邻两团子，避免跨排拉出斜线
  for (var k = 0; k < n - 1; k += 2) {
    var x1 = W / 2 - spread / 2 + spread * k / (n - 1);
    var x2 = W / 2 - spread / 2 + spread * (k + 1) / (n - 1);
    var hug = easeOutBack(clamp((lt - .30 - k * .07) / .60, 0, 1));
    linkHands(ctx, x1, x2, rowY(k), s, 7, hug);
  }
  // 最后一只单独成对（n 为奇数时）
  if (n % 2 === 1) {
    var xa = W / 2 - spread / 2 + spread * (n - 2) / (n - 1);
    var xb = W / 2 - spread / 2 + spread * (n - 1) / (n - 1);
    var hugL = easeOutBack(clamp((lt - .30 - (n - 2) * .07) / .60, 0, 1));
    linkHands(ctx, xa, xb, (rowY(n - 2) + rowY(n - 1)) / 2, s, 7, hugL);
  }
  // 队伍两端各站一只牵着手的好友（各露出一半，制造"还有更多"的延伸感）
  var _prevNoZh = __noZhSub; __noZhSub = true;
  var edge = [V.cream, V.yellow];
  for (var e = 0; e < 2; e++) {
    var ex2 = e === 0 ? (W / 2 - spread / 2 - s * .95) : (W / 2 + spread / 2 + s * .95);
    var oe = Object.assign({}, edge[e]);
    oe.phase = e * 2.1; oe.bob = 10; oe.eyes = 'happy';
    oe.pose = e === 0 ? 'linkR' : 'linkL';
    drawDango(ctx, ex2, rowY(0), s, t, oe);
  }
  linkHands(ctx, W / 2 - spread / 2, W / 2 - spread / 2 - s * .95, rowY(0), s, 7, 1);
  linkHands(ctx, W / 2 + spread / 2, W / 2 + spread / 2 + s * .95, rowY(0), s, 7, 1);
  __noZhSub = _prevNoZh;
  confetti(ctx, t, 20, [P.red, P.dy, P.dw, P.pink, P.green], 33);
  textTracked(ctx, 'みんなで', W * .5, H * .135, 54, '#E8EEFF', 10, 700, F_SANS);
}

function scFadeStars(ctx, t, lt) {
  gradSky(ctx, [[0, '#080C1E'], [.6, '#141C38'], [1, '#2A3460']]);
  var a = 1 - prog(lt, 2.2, 5.2) * .55;
  ctx.save();
  ctx.globalAlpha = a;
  drawStars(ctx, t, 200, .95, H);
  ctx.restore();
  // 中心一颗大星
  var pulse = .85 + .15 * Math.sin(t * 1.8);
  starPath(ctx, W * .5, H * .46, 120 * pulse, 48 * pulse, 4, t * .3);
  inked(ctx, '#FFF6DC', 0);
  ctx.save();
  ctx.globalAlpha = .35;
  circle(ctx, W * .5, H * .46, 220 + Math.sin(t * 1.6) * 20);
  inked(ctx, '#FFF6DC', 0);
  ctx.restore();
}

/* ══════════════ 尾奏 ══════════════ */

function scEndChant(ctx, t, lt) {
  gradSky(ctx, [[0, '#2A3A6B'], [.55, '#4E5E92'], [1, '#C9A48F']]);
  drawStars(ctx, t, 60, .6, H * .5);
  cloudBand(ctx, t, H * .46, 4, 220, .6, 12);
  hills(ctx, H * .74, '#4A5688', 22, .0032, 1);
  groundPlane(ctx, H * .86, '#2E3862');
  var n = 6, s = 118;
  for (var i = 0; i < n; i++) {
    var x = W * .5 - 480 + i * 192;
    var beat = Math.floor((lt + i * .12) / .606);
    var pop = Math.max(0, 1 - ((lt + i * .12) % .606) / .30);
    var yy = H * .78 - easeOutBounce(Math.min(1, pop * 1.6)) * 60;
    var o = Object.assign({}, [V.pink, V.plain, V.green, V.yellow, V.purple, V.cream][i]);
    o.phase = i * 1.4; o.bob = 0;
    o.pose = pop > .05 ? 'cheer' : 'stand';
    o.eyes = pop > .05 ? 'happy' : 'dot';
    drawDango(ctx, x, yy, s, t, o);
  }
  confetti(ctx, t, 18, [P.red, P.dy, P.dp, P.dw], 44);
}

function scEndFamily(ctx, t, lt) {
  bgPink(ctx);
  hills(ctx, H * .68, '#C9A79A', 16, .003, 2);
  groundPlane(ctx, H * .80, '#B9968A');
  var colors = [V.pink, V.plain, V.green, V.yellow, V.purple, V.brown, V.red, V.cream, V.plain];
  var n = colors.length, spread = W * .80;
  for (var i = 0; i < n; i++) {
    var x = W / 2 - spread / 2 + spread * i / (n - 1);
    var o = Object.assign({}, colors[i]);
    o.phase = i * .8; o.bob = 9; o.pose = 'cheer'; o.eyes = 'happy';
    drawDango(ctx, x, H * .74, 118, t, o);
  }
  confetti(ctx, t, 26, [P.red, P.dy, P.dw, P.pink, P.green], 55);
}

function scEndCard(ctx, t, lt) {
  gradSky(ctx, [[0, '#1A2340'], [.6, '#2E3C6E'], [1, '#4A5A90']]);
  drawStars(ctx, t, 140, .9, H);
  drawMoon(ctx, W * .5, H * .20, 118, t, { color: '#F5E7B8' });
  cloudBand(ctx, t, H * .44, 4, 220, .7, 8);
  // 一排团子站在云上（画面上部）
  for (var i = 0; i < 5; i++) {
    var x = W * .5 - 340 + i * 170;
    var o = Object.assign({}, [V.pink, V.plain, V.green, V.yellow, V.purple][i]);
    o.phase = i * 1.1; o.bob = 7; o.pose = 'wave'; o.eyes = 'happy';
    drawDango(ctx, x, H * .50, 100, t, o);
  }
  // 片尾字幕：下半幅压一层暗底，保证字清晰
  var a = prog(lt, 1.0, 2.4);
  if (a > 0) {
    ctx.save();
    ctx.globalAlpha = a * .72;
    var g = ctx.createLinearGradient(0, H * .58, 0, H);
    g.addColorStop(0, 'rgba(10,14,26,0)');
    g.addColorStop(.35, 'rgba(10,14,26,.85)');
    g.addColorStop(1, 'rgba(10,14,26,.95)');
    ctx.fillStyle = g; ctx.fillRect(0, H * .58, W, H * .42);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = a;
    // 双语片尾：日文主行 + 中文小字，逐行累计偏移（总高 376px，末行落在 y=1024 内）
    var lines = [
      ['だんご大家族', 60, '#FFF6E4', 0],
      ['团子大家族', 34, '#F0D8A8', 52],
      ['作詞・作曲　麻枝准', 30, '#E8DCC8', 52],
      ['作词・作曲　麻枝准', 22, '#C8BCA8', 34],
      ['編曲　加藤恒太', 30, '#E8DCC8', 46],
      ['编曲　加藤恒太', 22, '#C8BCA8', 34],
      ['歌　茶太', 30, '#E8DCC8', 46],
      ['演唱　茶太', 22, '#C8BCA8', 34],
      ['出典　CLANNAD ～AFTER STORY～', 26, '#D8CCB8', 46],
      ['出处　CLANNAD ～AFTER STORY～', 20, '#BCB0A0', 32]
    ];
    var y0 = H * .60, yc = y0;
    for (var k = 0; k < lines.length; k++) {
      yc += lines[k][3];
      var ap = prog(lt, 1.0 + k * .18, 1.7 + k * .18);
      ctx.save();
      ctx.globalAlpha = a * ap;
      textTrackedBase(ctx, lines[k][0], W * .5, yc, lines[k][1], lines[k][2], 8, 700, F_SANS);
      ctx.restore();
    }
    ctx.restore();
  }
}
