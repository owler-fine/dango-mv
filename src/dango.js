/* dango.js — 团子角色库（纯 Canvas2D 路径，确定性、可任意缩放）
 * 每个角色 = 基础团子体 + 装饰件；换装通过 opts 传入
 */
'use strict';

/* 基础团子体：圆角立方体感的团子（宽 w 高 h） */
function dangoBody(ctx, x, y, w, h, color, lw) {
  lw = lw === undefined ? 7 : lw;
  var r = w * .46;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + r * .5, y - h / 2);
  ctx.quadraticCurveTo(x + w / 2, y - h / 2, x + w / 2, y - h / 2 + h * .30);
  ctx.quadraticCurveTo(x + w / 2, y + h / 2, x + w / 2 - r * .35, y + h / 2);
  ctx.quadraticCurveTo(x, y + h / 2 + h * .06, x - w / 2 + r * .35, y + h / 2);
  ctx.quadraticCurveTo(x - w / 2, y + h / 2, x - w / 2, y - h / 2 + h * .30);
  ctx.quadraticCurveTo(x - w / 2, y - h / 2, x - w / 2 + r * .5, y - h / 2);
  ctx.closePath();
  inked(ctx, color, lw);
}
/* 完全圆形的团子（白团子/红豆） */
function dangoRound(ctx, x, y, r, color, lw) {
  circle(ctx, x, y, r);
  inked(ctx, color, lw === undefined ? 7 : lw);
}

/* ── 脸部件 ────────────────────────────────────────────── */
function faceEyes(ctx, x, y, dx, r, style, blink, ink) {
  style = style || 'dot';
  r = r || 6.5; dx = dx === undefined ? 20 : dx;
  var open = 1 - blink;
  var INK = ink || P.ink;
  ctx.save();
  ctx.fillStyle = INK; ctx.strokeStyle = INK;
  ctx.lineWidth = 6; ctx.lineCap = 'round';
  if (open < .12) {
    // 眨眼：一条弧线
    ctx.beginPath();
    ctx.moveTo(x - dx - r, y); ctx.quadraticCurveTo(x - dx, y + r * .8, x - dx + r, y);
    ctx.moveTo(x + dx - r, y); ctx.quadraticCurveTo(x + dx, y + r * .8, x + dx + r, y);
    ctx.stroke();
  } else if (style === 'happy') {
    ctx.beginPath();
    ctx.moveTo(x - dx - r * 1.1, y + r * .5);
    ctx.quadraticCurveTo(x - dx, y - r * 1.3, x - dx + r * 1.1, y + r * .5);
    ctx.moveTo(x + dx - r * 1.1, y + r * .5);
    ctx.quadraticCurveTo(x + dx, y - r * 1.3, x + dx + r * 1.1, y + r * .5);
    ctx.stroke();
  } else if (style === 'angry') {
    ctx.beginPath();
    ctx.moveTo(x - dx - r * 1.2, y - r * 1.1); ctx.lineTo(x - dx + r * .9, y + r * .1);
    ctx.moveTo(x + dx + r * 1.2, y - r * 1.1); ctx.lineTo(x + dx - r * .9, y + r * .1);
    ctx.stroke();
    circle(ctx, x - dx, y + r * .55, r * .52); ctx.fill();
    circle(ctx, x + dx, y + r * .55, r * .52); ctx.fill();
  } else if (style === 'rim') {
    /* 逆光/剪影眼：不填实心，只用亮色描出眼形，夜里也能读出表情 */
    ctx.lineWidth = 7 * .62;
    ctx.beginPath();
    ctx.moveTo(x - dx - r * 1.05, y);
    ctx.quadraticCurveTo(x - dx, y - r * 1.25, x - dx + r * 1.05, y);
    ctx.moveTo(x + dx - r * 1.05, y);
    ctx.quadraticCurveTo(x + dx, y - r * 1.25, x + dx + r * 1.05, y);
    ctx.stroke();
  } else if (style === 'sleepy') {
    ctx.beginPath();
    ctx.moveTo(x - dx - r, y); ctx.lineTo(x - dx + r, y);
    ctx.moveTo(x + dx - r, y); ctx.lineTo(x + dx + r, y);
    ctx.stroke();
  } else if (style === 'squint') {
    /* 眯眼：不是画弧线，而是让上眼睑像帘子一样落下来盖住眼睛。
     *   blink 当「眯眼程度」用：0 = 圆眼全开，1 = 只剩上弯的一道细缝。
     *   眼裂高度 eyeH 从 r 收到 r*.20，同时下沿上抬、上沿下垂成弯月；
     *   眼型被 90% 圆形的眼裂裁掉，所以眼睛不会长到团子轮廓之外。 */
    var sq = clamp(blink, 0, 1);
    var e = easeInOut(sq);
    var eyeH = r * (1 - e * .80);          // 眼裂高度：r → r*.20
    var lift = r * e * .28;                // 下沿随眯眼上抬
    for (var q = -1; q <= 1; q += 2) {
      var ex = x + q * dx;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, y - lift, r, eyeH, 0, 0, Math.PI * 2);
      ctx.clip();
      // 眼白（米白）打底
      ctx.fillStyle = '#FBF4E6'; ctx.fill();
      // 眼珠在眼裂内保持可见（被裁到缝里）
      var pr = r * .60;
      ctx.fillStyle = P.ink;
      circle(ctx, ex, y - lift + eyeH * .18, Math.min(pr, eyeH * 1.5)); ctx.fill();
      // 高光
      ctx.globalAlpha = .95; ctx.fillStyle = '#fff';
      circle(ctx, ex + pr * .34, y - lift - eyeH * .40, Math.max(1.4, pr * .30)); ctx.fill();
      ctx.restore();
      // 上眼睑：从全部打开到只剩一道弯月缝，描边跟着收细
      ctx.save();
      ctx.strokeStyle = P.ink; ctx.lineWidth = 6 * (1 - e * .45);
      ctx.lineCap = 'round';
      var lidR = r * (1 + e * .06);
      ctx.beginPath();
      ctx.arc(ex, y - lift + eyeH * .30, lidR, Math.PI * 1.04, Math.PI * 1.96);
      ctx.stroke();
      ctx.restore();
    }
  } else {
    circle(ctx, x - dx, y, r); ctx.fill();
    circle(ctx, x + dx, y, r); ctx.fill();
    // 高光
    ctx.globalAlpha = .95; ctx.fillStyle = '#fff';
    circle(ctx, x - dx + r * .35, y - r * .38, r * .34); ctx.fill();
    circle(ctx, x + dx + r * .35, y - r * .38, r * .34); ctx.fill();
  }
  ctx.restore();
}
function faceCheeks(ctx, x, y, dx, rx, ry, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha === undefined ? .8 : alpha;
  ctx.fillStyle = color || '#E8747C';
  ctx.beginPath(); ctx.ellipse(x - dx, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + dx, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function faceMouth(ctx, x, y, w, style, open, ink) {
  style = style || 'smile';
  ctx.save();
  ctx.strokeStyle = ink || P.ink; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (style === 'smile') {
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x, y + w * .55, x + w / 2, y); ctx.stroke();
  } else if (style === 'open') {
    ctx.beginPath(); ctx.moveTo(x - w / 2, y);
    ctx.quadraticCurveTo(x, y + w * (0.8 + 0.5 * (open || 0)), x + w / 2, y);
    ctx.closePath(); inked(ctx, '#B93B3B', 5);
    ctx.beginPath(); ctx.moveTo(x - w * .3, y + w * .34); ctx.lineTo(x + w * .3, y + w * .34);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
  } else if (style === 'cat') {
    ctx.beginPath();
    ctx.moveTo(x - w * .5, y); ctx.quadraticCurveTo(x - w * .25, y + w * .42, x, y);
    ctx.quadraticCurveTo(x + w * .25, y + w * .42, x + w * .5, y);
    ctx.stroke();
  } else if (style === 'flat') {
    ctx.beginPath(); ctx.moveTo(x - w * .4, y); ctx.lineTo(x + w * .4, y); ctx.stroke();
  } else if (style === 'wobble') {
    ctx.beginPath(); ctx.moveTo(x - w * .5, y);
    ctx.quadraticCurveTo(x - w * .25, y - w * .25, x, y);
    ctx.quadraticCurveTo(x + w * .25, y + w * .25, x + w * .5, y);
    ctx.stroke();
  }
  ctx.restore();
}
function faceGlasses(ctx, x, y, dx, r, legs) {
  ctx.save();
  ctx.strokeStyle = P.ink; ctx.lineWidth = 6;
  circle(ctx, x - dx, y, r); ctx.stroke();
  circle(ctx, x + dx, y, r); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - dx + r, y); ctx.lineTo(x + dx - r, y); ctx.stroke();
  /* 镜腿：只在小尺寸下画。大特写下这两条斜线会变成脸上两道横痕，
   *   看着像擦不掉的划痕，所以 o.noLegs 时省略。 */
  if (!legs) {
    ctx.beginPath(); ctx.moveTo(x - dx - r, y); ctx.lineTo(x - dx - r - r * .55, y - r * .12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + dx + r, y); ctx.lineTo(x + dx + r + r * .55, y - r * .12); ctx.stroke();
  }
  ctx.restore();
}

/* ── 手脚 ─────────────────────────────────────────────── */
function dangoLimbs(ctx, x, y, w, h, pose, phase, lw) {
  pose = pose || 'stand';
  lw = lw === undefined ? 7 : lw;
  phase = phase || 0;
  var sw = Math.sin(phase);
  ctx.save();
  ctx.strokeStyle = P.ink; ctx.lineWidth = lw; ctx.lineCap = 'round';
  var armY = y - h * .02, armX = w * .5;
  var legY = y + h * .5, legX = w * .26;

  function arm(sx, ang, len) {
    var L = len || w * .40;
    var ex = sx + Math.cos(ang) * L;
    var ey = armY + Math.sin(ang) * L;
    ctx.beginPath(); ctx.moveTo(sx, armY); ctx.lineTo(ex, ey); ctx.stroke();
    circle(ctx, ex, ey, lw * .92); inked(ctx, P.cream, lw * .55);
  }
  function leg(sx, ang) {
    var ex = sx + Math.sin(ang) * h * .16;
    var ey = legY + h * .18;
    ctx.beginPath(); ctx.moveTo(sx, legY); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(ex, ey + 4, lw * 1.15, lw * .62, 0, 0, Math.PI * 2);
    inked(ctx, P.cream, lw * .5);
  }
  if (pose === 'cheer') {
    arm(x - armX, -Math.PI * .82 + sw * .16);
    arm(x + armX, -Math.PI * .18 - sw * .16);
    leg(x - legX, -.16); leg(x + legX, .16);
  } else if (pose === 'hold') {
    arm(x - armX, -Math.PI * .12 - sw * .1);
    arm(x + armX, -Math.PI * .88 + sw * .1);
    leg(x - legX, -.1); leg(x + legX, .1);
  } else if (pose === 'sit') {
    arm(x - armX, -Math.PI * .30); arm(x + armX, -Math.PI * .70);
  } else if (pose === 'wave') {
    arm(x - armX, -Math.PI * .5); arm(x + armX, -Math.PI * 1.05 + sw * .35);
    leg(x - legX, -.1); leg(x + legX, .1);
  } else if (pose === 'none') {
    /* 无手脚 */
  } else if (pose === 'linkL') {
    /* 右手伸向右侧邻伴；左手自然下垂在身侧（不是"断臂"） */
    arm(x - armX, -Math.PI * .34 + sw * .10);
    arm(x - armX - w * .04, -Math.PI * .56 - sw * .06, w * .26);
    leg(x - legX, -.1); leg(x + legX, .1);
  } else if (pose === 'linkR') {
    /* 左手伸向左侧邻伴；右手自然下垂在身侧 */
    arm(x + armX, -Math.PI * .66 - sw * .10);
    arm(x + armX + w * .04, -Math.PI * .44 + sw * .06, w * .26);
    leg(x - legX, -.1); leg(x + legX, .1);
  } else if (pose === 'linkBoth') {
    /* 圆环：双手都伸向两侧邻伴（外侧那条由 linkHands 补） */
    arm(x - armX, -Math.PI * .34 + sw * .10);
    arm(x + armX, -Math.PI * .66 - sw * .10);
    leg(x - legX, -.1); leg(x + legX, .1);
  } else {
    arm(x - armX, -Math.PI * .28 + sw * .08);
    arm(x + armX, -Math.PI * .72 - sw * .08);
    leg(x - legX, -.1); leg(x + legX, .1);
  }
  ctx.restore();
}

/* ── 牵手手臂（两团子共用一对胳膊 + 紧扣的手） ───────────
 *   在两只团子之间画：左团子的右臂 + 右团子的左臂 + 中间紧扣的手。
 *   手的落点 = 两中心连线的中点，永远贴合，不会出现「像牵手但没碰到」。
 *   s = 团子尺寸，hug = 0(分开) → 1(牵紧)，决定手臂抬多高、手握多实。 */
function linkHands(ctx, x1, x2, y, s, lw, hug) {
  hug = clamp(hug === undefined ? 1 : hug, 0, 1);
  lw = lw === undefined ? 7 : lw;
  var h = s * 1.16;
  var mx = (x1 + x2) / 2;
  // 手的位置：抬到身体中部偏上，牵得越紧越靠上
  var hy = y - h * (.02 + .10 * hug);
  var r = s * .5;
  var ax1 = x1 + r * .92, ax2 = x2 - r * .92;
  var ay = y - h * .02;
  // 手臂悬垂量：没牵紧时手臂自然下垂，牵紧时抬平
  var sag = (1 - hug) * h * .17;
  ctx.save();
  ctx.strokeStyle = P.ink; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax1, ay);
  ctx.quadraticCurveTo(ax1 + (mx - ax1) * .42, ay + sag, mx, hy);
  ctx.moveTo(ax2, ay);
  ctx.quadraticCurveTo(ax2 + (mx - ax2) * .42, ay + sag, mx, hy);
  ctx.stroke();
  // 紧扣的手：两只小圆交叠
  var hr = lw * .82;
  circle(ctx, mx - hr * .72, hy, hr); inked(ctx, P.cream, lw * .5);
  circle(ctx, mx + hr * .72, hy, hr); inked(ctx, P.cream, lw * .5);
  ctx.restore();
}

/* ══ 角色定义 ═══════════════════════════════════════════
 * 每个函数签名：draw(ctx, x, y, s, t, o)
 *   x,y = 中心；s = 尺寸（团子宽度）；t = 局部时间；o = 选项
 *   o.holdIn / o.holdOut：与左/右邻伴牵手（后续 linkHands 会补上手）
 * ═══════════════════════════════════════════════════════ */

/* 通用团子（可换色/换表情/换装） */
function drawDango(ctx, x, y, s, t, o) {
  o = o || {};
  var w = s, h = s * 1.16;
  var color = o.color || P.dw;
  var lw = o.lw || 7;
  var blink = o.blink ? 1 : 0;
  if (o.squint !== undefined) blink = o.squint;   // squint 复用 blink 通道当「眯眼程度」
  var bob = Math.sin(t * 2.2 + (o.phase || 0)) * (o.bob === undefined ? 4 : o.bob);
  y += bob;

  dangoLimbs(ctx, x, y, w, h, o.pose, t * 3 + (o.phase || 0), lw);
  dangoRound(ctx, x, y, w * .5, color, lw);

  if (o.stripe) {  // 腹部条纹（服装）
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, w * .5 - 2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = o.stripe;
    ctx.fillRect(x - w, y + h * .16, w * 2, h * .13);
    ctx.restore();
  }
  if (o.apron) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, w * .5 - 2, 0, Math.PI * 2); ctx.clip();
    polyPath(ctx, [[x - w * .30, y + h * .22], [x + w * .30, y + h * .22],
    [x + w * .24, y + h * .52], [x - w * .24, y + h * .52]]);
    inked(ctx, o.apron, 0);
    ctx.restore();
  }
  if (o.bow) {  // 蝴蝶结
    ctx.save();
    var by = y - h * .40;
    polyPath(ctx, [[x, by], [x - w * .21, by - w * .12], [x - w * .21, by + w * .12]]);
    inked(ctx, o.bow, 5);
    polyPath(ctx, [[x, by], [x + w * .21, by - w * .12], [x + w * .21, by + w * .12]]);
    inked(ctx, o.bow, 5);
    circle(ctx, x, by, w * .062); inked(ctx, o.bow, 5);
    ctx.restore();
  }
  if (o.sprout) {  // 芽
    ctx.save();
    var sy = y - h * .46;
    ctx.beginPath(); ctx.moveTo(x - 3, sy + 16); ctx.lineTo(x - 3, sy); ctx.stroke();
    ctx.strokeStyle = P.ink; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x - 3, sy + 16); ctx.lineTo(x - 3, sy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 3, sy + 4);
    ctx.quadraticCurveTo(x - 20, sy - 6, x - 24, sy + 12);
    ctx.quadraticCurveTo(x - 12, sy + 14, x - 3, sy + 4); inked(ctx, P.green, 4.5);
    ctx.beginPath(); ctx.moveTo(x - 3, sy + 4);
    ctx.quadraticCurveTo(x + 14, sy - 6, x + 18, sy + 12);
    ctx.quadraticCurveTo(x + 6, sy + 14, x - 3, sy + 4); inked(ctx, P.green, 4.5);
    ctx.restore();
  }
  if (o.toast) {  // 烤痕
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, w * .5 - 2, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = .42; ctx.fillStyle = '#6B3A18';
    for (var i = 0; i < 5; i++) {
      var a = hash1(i * 9.1 + x) * Math.PI * 2;
      var rr = w * .5 * (.35 + hash1(i * 4.3) * .5);
      ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * rr, y + Math.sin(a) * rr,
        w * .10, w * .07, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  if (o.seeds) {  // 芝麻
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, w * .5 - 2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#2A2420';
    for (var k = 0; k < 26; k++) {
      var ax = x + (hash1(k * 3.7 + 1) - .5) * w * .82;
      var ay = y + (hash1(k * 5.1 + 7) - .5) * h * .74;
      ctx.beginPath(); ctx.ellipse(ax, ay, 3.4, 2.2, hash1(k) * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  var ey = y - h * .10;
  var edx = w * .205;
  var er = w * .068;
  if (o.glasses) {
    faceEyes(ctx, x, ey, edx, er * .62, o.eyes || 'dot', blink, o.faceInk);
    faceGlasses(ctx, x, ey, edx, er * 1.95, o.noLegs);
  } else {
    faceEyes(ctx, x, ey, edx, er, o.eyes || 'dot', blink, o.faceInk);
  }
  faceCheeks(ctx, x, y + h * .06, w * .265, w * .072, w * .05,
    o.cheekColor || '#E8747C', o.cheekAlpha);
  faceMouth(ctx, x, y + h * .145, w * .18, o.mouth || 'smile', o.open, o.faceInk);
  return { w: w, h: h };
}

/* 月见团子（黄，带月牙） */
function drawMoonDango(ctx, x, y, s, t, o) {
  o = o || {};
  var r = drawDango(ctx, x, y, s, t, Object.assign({}, o, { color: P.dy, eyes: 'sleepy' }));
  ctx.save();
  ctx.globalAlpha = .9;
  ctx.fillStyle = '#FFF4CE';
  circle(ctx, x + s * .30, y - s * .34, s * .10); ctx.fill();
  ctx.restore();
  return r;
}

/* 四つ子串团子：一根竹签串 4 个 */
function drawSkewerDango(ctx, x, y, s, t, o) {
  o = o || {};
  var n = 4, gap = s * .62;
  var colors = o.colors || [P.dp, P.dw, P.dg, P.dy];
  ctx.save();
  // 竹签
  ctx.beginPath();
  ctx.moveTo(x, y - gap * (n - 1) / 2 - s * .70);
  ctx.lineTo(x, y + gap * (n - 1) / 2 + s * .70);
  ctx.lineWidth = 9; ctx.strokeStyle = P.wood; ctx.stroke();
  ctx.lineWidth = 3; ctx.strokeStyle = P.woodDk; ctx.stroke();
  ctx.restore();
  for (var i = 0; i < n; i++) {
    var cy = y + (i - (n - 1) / 2) * gap;
    var rr = s * .40;
    dangoRound(ctx, x, cy, rr, colors[i], 6);
    if (i === n - 1 || i === 0) {
      // 只给最上和最下的画脸
      faceEyes(ctx, x, cy - rr * .10, rr * .34, rr * .13, 'dot', 0);
      faceCheeks(ctx, x, cy + rr * .12, rr * .46, rr * .11, rr * .08);
      faceMouth(ctx, x, cy + rr * .30, rr * .28, i === 0 ? 'smile' : 'cat');
    }
  }
  return { w: s, h: gap * 4 };
}

/* 兔（うさぎ）：坐在月亮上 */
function drawRabbit(ctx, x, y, s, t, o) {
  o = o || {};
  var bob = Math.sin(t * 2 + (o.phase || 0)) * 3;
  y += bob;
  ctx.save();
  // 耳
  ctx.save();
  ctx.translate(x - s * .17, y - s * .52);
  ctx.rotate(-.24 + Math.sin(t * 1.6) * .07);
  ctx.beginPath(); ctx.ellipse(0, 0, s * .10, s * .30, 0, 0, Math.PI * 2); inked(ctx, P.dw, 6);
  ctx.beginPath(); ctx.ellipse(0, 0, s * .045, s * .19, 0, 0, Math.PI * 2); inked(ctx, '#F3B7BE', 0);
  ctx.restore();
  ctx.save();
  ctx.translate(x + s * .17, y - s * .52);
  ctx.rotate(.24 - Math.sin(t * 1.6) * .07);
  ctx.beginPath(); ctx.ellipse(0, 0, s * .10, s * .30, 0, 0, Math.PI * 2); inked(ctx, P.dw, 6);
  ctx.beginPath(); ctx.ellipse(0, 0, s * .045, s * .19, 0, 0, Math.PI * 2); inked(ctx, '#F3B7BE', 0);
  ctx.restore();
  // 身体
  ctx.beginPath(); ctx.ellipse(x, y, s * .40, s * .34, 0, 0, Math.PI * 2); inked(ctx, P.dw, 7);
  // 尾巴
  circle(ctx, x + s * .42, y + s * .14, s * .11); inked(ctx, P.cream, 5);
  // 脸
  faceEyes(ctx, x, y - s * .06, s * .145, s * .055, o.eyes || 'dot', 0);
  faceCheeks(ctx, x, y + s * .08, s * .21, s * .06, s * .042, '#F3B7BE');
  faceMouth(ctx, x, y + s * .12, s * .13, 'cat');
  ctx.restore();
  return { w: s, h: s };
}

/* 大月亮（おつきさま） */
function drawMoon(ctx, x, y, r, t, o) {
  o = o || {};
  ctx.save();
  ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
  circle(ctx, x, y, r); inked(ctx, o.color || P.moon, o.lw || 0, o.stroke);
  // 环形山
  ctx.globalAlpha *= .55;
  ctx.fillStyle = P.moonDk;
  var craters = [[-.30, -.24, .17], [.26, -.10, .13], [-.08, .34, .12], [.36, .30, .085], [-.42, .18, .075]];
  for (var i = 0; i < craters.length; i++) {
    circle(ctx, x + craters[i][0] * r, y + craters[i][1] * r, craters[i][2] * r); ctx.fill();
  }
  ctx.restore();
  return r;
}
