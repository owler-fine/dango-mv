/* cover.js — B站封面 1146×717 渲染（复用正片 lib.js / dango.js）
 * 设计依据：视觉传达设计师评审（构图分区 / 缩略图可读性 / 元素优先级）
 * 与正片的差别：纸底更亮、网点更淡、撕纸条移到右侧、轨道降噪、暗角压边
 */
'use strict';

var CW = 1146, CH = 717;

/* 封面专用色板：在正片色板基础上提亮纸底，保证 320px 缩略图不糊 */
var CF = {
  paper: '#F1E4CB',
  paperDk: '#DCC9A6',
  paperLt: '#F7EEDC',
  slip: '#EDD9A8',
  vermilion: '#C93A3C',
  // P0：标题红字压深一档，与纸底对比度从 2.6:1 提到 ≈3.4:1（WCAG AA 大字门槛 3:1）
  vermilionDeep: '#B02F31',
  vermilionDk: '#8E2323',
  teal: '#2C6E75',
  ink: '#1E1A18'
};

var coverCanvas = document.getElementById('cover');
var cc = coverCanvas.getContext('2d', { alpha: false });
cc.imageSmoothingEnabled = true;
cc.textRendering = 'geometricPrecision';

/* P0（视觉设计师评审）：封面专用的团子色覆盖。
 * 只作用于封面，不改 lib.js 正片色板 —— 正片 80 个镜头仍用原色。
 * 原因：绿 #8FBF6A 与粉 #EFA6B2 相对亮度都是 ≈191，
 * 缩略图灰阶下互相融合；这里把粉压暗、绿提亮，亮度差拉到 >15。 */
var P_COVER = {
  dp: '#E898A8',   // 粉：压暗（原 #EFA6B2，亮度 191 → 174）
  dg: '#9AC96F'    // 绿：提亮（原 #8FBF6A，亮度 191 → 203）
};
function coverDangoColor(c) {
  if (c === P.dp) return P_COVER.dp;
  if (c === P.dg) return P_COVER.dg;
  return c;
}

/* ── 工具：封面坐标系下的撕纸条 ─────────────────────── */
function tornStrip(ctx, x, y, w, h, fill, jitter, segs) {
  jitter = jitter === undefined ? 6 : jitter;
  segs = segs || 5;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - jitter * hash1(1.7), y);
  for (var i = 1; i <= segs; i++) {
    ctx.lineTo(x + (w / segs) * i, y + (hash1(i * 3.1 + 11) - .5) * jitter * 2);
  }
  ctx.lineTo(x + w, y + h);
  for (var j = segs - 1; j >= 0; j--) {
    ctx.lineTo(x + (w / segs) * j, y + h + (hash1(j * 5.3 + 29) - .5) * jitter * 2);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(30,26,24,.42)';
  ctx.stroke();
  ctx.restore();
}

/* ── 工具：五角星（正片 starPath 的封面版） ──────────── */
function starPathS(ctx, x, y, rOut, rIn, n) {
  ctx.beginPath();
  for (var i = 0; i < n * 2; i++) {
    var rr = i % 2 ? rIn : rOut;
    var a = -Math.PI / 2 + i * Math.PI / n;
    var px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/* ── 点阵波（团队设计的背景选项二：封面采用） ────────── */
function dotWaveField(ctx) {
  ctx.save();
  ctx.fillStyle = CF.teal;
  var y0 = CH * 0.60, A = CH * 0.085, k = 0.0105;
  for (var y = 0; y < CH; y += 14) {
    for (var x = 0; x < CW; x += 14) {
      var wave = y0 + Math.sin(x * k) * A + Math.sin(x * k * 2.7 + 1.1) * A * 0.35;
      var d = Math.abs(y - wave);
      if (d > 74) continue;
      var a = (1 - d / 74);
      a = a * a * 0.30;
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x, y, 2.0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

/* ── 星光 / 团子星座 ─────────────────────────────────── */
function coverStars(ctx) {
  ctx.save();
  ctx.fillStyle = CF.vermilion;
  for (var i = 0; i < 26; i++) {
    var x = hash1(i * 7.3 + 3) * CW;
    var y = hash1(i * 11.9 + 17) * CH * 0.62;
    var r = 0.9 + hash1(i * 2.1 + 5) * 1.5;
    var a = 0.16 + hash1(i * 5.7 + 23) * 0.30;
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // 三颗团子座五角星
  var pts = [[0.255, 0.115], [0.335, 0.215], [0.205, 0.235], [0.435, 0.085], [0.535, 0.155]];
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = CF.vermilion;
  for (var k = 0; k < pts.length; k++) {
    starPathS(ctx, pts[k][0] * CW, pts[k][1] * CH, k === 0 ? 8 : 5.5, k === 0 ? 3.2 : 2.2, 5);
    ctx.fill();
  }
  ctx.restore();
}

/* ── 轨道弧（椭圆，含行星环求交的同款几何） ──────────── */
function coverOrbit(ctx, cx, cy, rx, ry, tilt, a0, a1, color, lw, alpha, dash) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  for (var i = 0; i <= 120; i++) {
    var a = a0 + (a1 - a0) * (i / 120);
    var x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    var px = cx + x * Math.cos(tilt) - y * Math.sin(tilt);
    var py = cy + x * Math.sin(tilt) + y * Math.cos(tilt);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

/* ── 轨道上的小团子（带透视缩放 + 描边） ─────────────── */
function orbitDango(ctx, cx, cy, rx, ry, tilt, a, s, color, o) {
  o = o || {};
  var x = Math.cos(a) * rx, y = Math.sin(a) * ry;
  var px = cx + x * Math.cos(tilt) - y * Math.sin(tilt);
  var py = cy + x * Math.sin(tilt) + y * Math.cos(tilt);
  var depth = Math.sin(a);                 // <0 在后方
  var persp = 1 + depth * 0.18;            // 后方略小
  drawDango(ctx, px, py, s * persp, o.t || 0, Object.assign({
    color: coverDangoColor(color),
    eyes: o.eyes || 'dot',
    mouth: o.mouth || 'smile',
    blink: o.blink,
    lw: Math.max(3, s * 0.062)
  }, o.extra || {}));
  return { x: px, y: py, behind: depth < 0 };
}

/* ── 主渲染 ─────────────────────────────────────────── */
function renderCover() {
  var t = 0;   // 封面是静态帧，相位固定

  /* 1. 纸底渐变（比正片亮一档，缩略图不糊） */
  var g = cc.createLinearGradient(0, 0, CW, CH);
  g.addColorStop(0, CF.paperLt);
  g.addColorStop(.48, CF.paper);
  g.addColorStop(1, CF.paperDk);
  cc.fillStyle = g; cc.fillRect(0, 0, CW, CH);

  /* 2. 点阵波（章节进度条的点阵语言，横贯下半） */
  dotWaveField(cc);

  /* 3. 星光 + 团子座 */
  coverStars(cc);

  /* 4. 轨道弧：一条朱红主轨绕团子家族，一条蓝绿细轨在外
   *    关键：主轨必须拆成「后段 / 前段」两截 ——
   *    后段（1.00π–2.00π 里 y 在椭圆上半的部分）画在团子家族之前，
   *    前段画在团子家族之后，这样才形成"绕过去"的立体感；
   *    一整条连画会让红线横切团子肚子，像被切开。
   *    OC 是唯一真源，弧与轨道团子共用，保证团子一定坐在弧线上。 */
  var OC = { cx: CW * 0.385, cy: CH * 0.500, rx: CW * 0.300, ry: CH * 0.285, tilt: -0.15 };
  var A0 = Math.PI * 0.84, A1 = Math.PI * 2.18;
  // 后段：a ∈ [1.00π, 2.00π]（椭圆参数角 y=sin(a)·ry ≤ 0 的那半，即视觉上的"上/后方"）
  coverOrbit(cc, OC.cx, OC.cy, OC.rx, OC.ry, OC.tilt, Math.PI * 1.00, Math.PI * 2.00,
    CF.vermilion, 3.2, 0.78, [13, 8]);
  // 副轨（蓝绿，更外圈，只画上弧，始终在后方）
  coverOrbit(cc, OC.cx, OC.cy, CW * 0.415, CH * 0.375, -0.15,
    Math.PI * 1.00, Math.PI * 1.94, CF.teal, 2.0, 0.42, [7, 10]);
  /* 5. 轨道后方的团子 —— 角度经探针脚本核算：
   *    视觉弧顶在 a≈1.55–1.60π（py≈224），family 顶边 353–447，
   *    所以 py+半高 < 353 的位置才不会被家族盖住。
   *    取 a=1.56π（弧顶偏左）与 a=1.78π（右上段，px≈1142 py≈277）*/
  orbitDango(cc, OC.cx, OC.cy, OC.rx, OC.ry, OC.tilt, Math.PI * 1.56, CH * 0.074, P.dm, { t: 0.9 });
  orbitDango(cc, OC.cx, OC.cy, OC.rx, OC.ry, OC.tilt, Math.PI * 1.78, CH * 0.058, P.db, { t: 2.1, eyes: 'happy' });
  // 右端再补一只远景小团子，压住弧的右下收尾（a=1.90π, px≈1267 py≈364 与黄团子上缘同高，带遮挡关系）
  orbitDango(cc, OC.cx, OC.cy, OC.rx, OC.ry, OC.tilt, Math.PI * 1.90, CH * 0.048, P.dy, { t: 1.1, eyes: 'dot' });

  /* 6. 主角团子家族：牵手横排（复用正片 linkHands / linkL / linkR 契约）
   *    重点：pose 必须传 link*，否则默认 stand 会两条手臂都朝外举，
   *    而 linkHands 画的牵手线落在身体下面被盖住 → 看着像没牵手。
   *    linkL = 左端（左手下垂，右手伸右）；linkR = 右端；linkBoth = 中间。
   *    5 只：紫 绿 粉(主角) 白 黄，整体拱形排布并整体左移避开 B 站角标。 */
  var baseY = CH * 0.545;
  var mainS = CH * 0.272;              // 主角直径 ≈ 195px（略收，给两端留边）
  var family = [
    { x: CW * 0.155, s: mainS * 0.74, c: P.dm, e: 'dot', m: 'cat', ph: 0.4, pose: 'linkL' },
    { x: CW * 0.258, s: mainS * 0.86, c: P.dg, e: 'happy', m: 'smile', ph: 1.3, pose: 'linkBoth' },
    { x: CW * 0.388, s: mainS * 1.00, c: P.dp, e: 'dot', m: 'smile', ph: 0.0, pose: 'linkBoth', hero: true },
    { x: CW * 0.522, s: mainS * 0.88, c: P.dw, e: 'happy', m: 'cat', ph: 2.2, pose: 'linkBoth' },
    { x: CW * 0.634, s: mainS * 0.76, c: P.dy, e: 'sleepy', m: 'smile', ph: 1.7, pose: 'linkR' }
  ];
  // 拱形：中间两只抬高，两端下沉
  var archY = [CH * 0.030, CH * 0.062, CH * 0.082, CH * 0.062, CH * 0.030];

  // 底影：一条极淡的墨色投影把家族"放在地上"，同时让腿不显得悬空
  cc.save();
  cc.globalAlpha = 0.13;
  cc.fillStyle = P.ink;
  cc.beginPath();
  cc.ellipse(CW * 0.385, baseY + mainS * 0.60, CW * 0.300, CH * 0.028, 0, 0, Math.PI * 2);
  cc.fill();
  cc.restore();

  for (var fi = 0; fi < family.length; fi++) {
    var f = family[fi];
    var dangoY = baseY - archY[fi];
    cc.save();
    if (f.hero) {                       // 主角加一圈暖光，缩略图里跳出来
      var rg = cc.createRadialGradient(f.x, dangoY, f.s * 0.30, f.x, dangoY, f.s * 0.98);
      rg.addColorStop(0, 'rgba(255,242,214,.90)');
      rg.addColorStop(1, 'rgba(255,242,214,0)');
      cc.fillStyle = rg;
      cc.beginPath(); cc.arc(f.x, dangoY, f.s * 0.98, 0, Math.PI * 2); cc.fill();
    }
    drawDango(cc, f.x, dangoY, f.s, t, {
      color: coverDangoColor(f.c),
      eyes: f.e,
      mouth: f.m,
      phase: f.ph,
      bob: 0,
      pose: f.pose,
      lw: Math.max(4, f.s * 0.058),
      cheekAlpha: f.hero ? 0.90 : 0.66
    });
    cc.restore();
  }

  // 紧扣的手：把相邻两只真正连上（画在团子之后，落在身体轮廓上方可见）
  for (var li = 0; li < family.length - 1; li++) {
    var a = family[li], b = family[li + 1];
    var aY = baseY - archY[li], bY = baseY - archY[li + 1];
    var mxC = (a.x + b.x) / 2;
    var hyC = (aY + bY) / 2 - Math.min(a.s, b.s) * 0.10;
    cc.save();
    cc.strokeStyle = P.ink;
    cc.lineCap = 'round';
    cc.lineWidth = Math.max(4, Math.min(a.s, b.s) * 0.070);
    var ax1 = a.x + a.s * 0.46, ax2 = b.x - b.s * 0.46;
    cc.beginPath();
    cc.moveTo(ax1, aY - a.s * 0.10);
    cc.quadraticCurveTo((ax1 + mxC) / 2, hyC - Math.min(a.s, b.s) * 0.14, mxC, hyC);
    cc.moveTo(ax2, bY - b.s * 0.10);
    cc.quadraticCurveTo((ax2 + mxC) / 2, hyC - Math.min(a.s, b.s) * 0.14, mxC, hyC);
    cc.stroke();
    // 紧扣的手：两只小圆交叠
    var hr = Math.max(5, Math.min(a.s, b.s) * 0.062);
    circle(cc, mxC - hr * 0.70, hyC, hr); inked(cc, P.cream, hr * 0.55);
    circle(cc, mxC + hr * 0.70, hyC, hr); inked(cc, P.cream, hr * 0.55);
    cc.restore();
  }

  /* 7. 前方团子：画在家族之后 → 压在家族身前，环才闭得上。
   *    取 a=1.36π（px≈450 py≈308），落在绿团子左侧空档，
   *    与绿团子（left=369）形成轻微咬合，遮挡关系读得出来。 */
  orbitDango(cc, OC.cx, OC.cy, OC.rx, OC.ry, OC.tilt, Math.PI * 1.36, CH * 0.062, P.dg, { t: 0.5 });

  /* 7b. 主轨前段 —— 只画"左端下沉"的那一小段，
   *     让它从绿/紫左侧空档掠过即止，不横扫家族腿部（原来画到 0.84π 会切腿） */
  coverOrbit(cc, OC.cx, OC.cy, OC.rx, OC.ry, OC.tilt, Math.PI * 0.96, Math.PI * 1.02,
    CF.vermilion, 3.2, 0.78, [13, 8]);
  coverOrbit(cc, OC.cx, OC.cy, OC.rx, OC.ry, OC.tilt, Math.PI * 2.00, Math.PI * 2.10,
    CF.vermilion, 3.2, 0.78, [13, 8]);
  // 前段被团子挡住的错觉补偿：在家族顶部压一层极淡暖雾，把弧线"推"到身后
  cc.save();
  var fog = cc.createLinearGradient(0, CH * 0.30, 0, CH * 0.52);
  fog.addColorStop(0, 'rgba(255,247,228,0)');
  fog.addColorStop(1, 'rgba(255,247,228,.34)');
  cc.fillStyle = fog;
  cc.fillRect(0, CH * 0.30, CW, CH * 0.22);
  cc.restore();

  /* 8. 标题带：撕裂纸条在底部
   *    P0 修正（视觉设计师评审）：
   *    · 上移到 0.770，与团子椭圆脚（家族底边 ≈0.618H / 667px）留出 ≥0.10H 空隙 → 杀掉"红字压腿"
   *    · 右边界收到 0.870W（1670px），彻底脱离 B站右下时长角标安全区（x>1760, y>1020）
   *    · 高度 0.165H：主标 92px + 副标 34px 两行都要在内，且上下留呼吸 */
  /* 8. 标题带：撕裂纸条在底部
   *    P0 修正（视觉设计师评审）：
   *    · 上移到 0.715，与团子椭圆脚（家族底边 ≈0.618H / 668px）留出 ≈0.10H 空隙 → 杀掉"红字压腿"
   *    · 右边界收到 0.870W（1670px），彻底脱离 B站右下时长角标安全区（x>1760, y>1020）
   *    · 高度 0.175H，底边落在 0.890H（961px），画面下沿留 119px 呼吸
   *      实测：主标基线 stripY+0.335H = 839.9，副标基线 stripY+0.900H = 952.5
   *      行差 112.6px > 92·0.5+92·0.22+34·0.5+12 = 95.2 ✓ 两行互不重合 */
  var stripY = CH * 0.715, stripH = CH * 0.175, stripW = CW * 0.862;
  tornStrip(cc, CW * 0.012, stripY, stripW, stripH, CF.slip, 7, 6);
  // 纸条套印错位（极淡）
  cc.save();
  cc.globalCompositeOperation = 'multiply';
  cc.globalAlpha = 0.13;
  cc.translate(4, -3);
  tornStrip(cc, CW * 0.012, stripY, stripW, stripH, CF.vermilion, 7, 6);
  cc.restore();

  /* 9. 标题文字（全部落在纸条安全带内） */
  var txC = CW * 0.443;               // 纸条中心（0.012 + 0.862/2 = 0.443）
  // 主标题：团子大家族。P0：字号 84 → 92（设计师要求缩略图字高 ≥48px @320）
  cc.save();
  cc.shadowColor = 'rgba(30,26,24,.30)';
  cc.shadowOffsetX = 3; cc.shadowOffsetY = 3;
  cc.shadowBlur = 0;
  textTrackedForCover(cc, '团子大家族', txC, stripY + stripH * 0.335, 92,
    CF.vermilionDeep, 8, 700, F_SANS);
  cc.restore();

  // 纸条内副标题（P1：字号 28 → 34，缩略图字高 ≈11px 才可读）
  // 行距重排：主标 92px 的 descent ≈ 92*0.22 ≈ 20px，
  // 基线差必须 ≥ (92*0.5 + 20) + 34*0.5 + 12 呼吸 ≈ 92px，
  // stripH=178 → 0.355 与 0.90 之间差 0.545*178 = 97px ✓
  textTrackedForCover(cc, 'CLANNAD  ·  だんご大家族', txC, stripY + stripH * 0.900, 34,
    CF.ink, 4, 700, F_SANS);

  // 左上角技术标签（P1：三行合两行并加粗，缩略图不再只是灰点） */
  cc.save();
  cc.globalAlpha = 0.92;
  textTrackedForCover(cc, '纯代码逐帧渲染', CW * 0.036, CH * 0.076, 30,
    CF.teal, 3, 700, F_SANS, CW * 0.036);
  textTrackedForCover(cc, '8191 帧 · 80 镜 · 4′33″', CW * 0.036, CH * 0.128, 24,
    CF.ink, 2, 600, F_SANS, CW * 0.036);
  cc.restore();

  // 印章：朱红方印放在纸条右端上方，完全避开右下角标区与纸条撕边
  drawSealForCover(cc, CW * 0.895, stripY - CH * 0.088, 58, '团子');

  /* 10. 半调网点（封面档：更淡更细，只做质感不抢读） */
  cc.save();
  cc.globalCompositeOperation = 'multiply';
  var pat = cc.createPattern(halftoneCanvas(9, 1.25, 0.115, false), 'repeat');
  cc.fillStyle = pat;
  cc.fillRect(0, 0, CW, CH);
  cc.restore();

  /* 11. 暗角（把视线压向中间） */
  var vg = cc.createRadialGradient(CW * 0.42, CH * 0.50, CH * 0.30,
    CW * 0.42, CH * 0.50, CH * 0.98);
  vg.addColorStop(0, 'rgba(60,44,28,0)');
  vg.addColorStop(1, 'rgba(60,44,28,.20)');
  cc.fillStyle = vg; cc.fillRect(0, 0, CW, CH);

  /* 12. 底部深色压底（托标题，增强对比） */
  var bg2 = cc.createLinearGradient(0, CH * 0.72, 0, CH);
  bg2.addColorStop(0, 'rgba(30,26,24,0)');
  bg2.addColorStop(1, 'rgba(30,26,24,.26)');
  cc.fillStyle = bg2; cc.fillRect(0, CH * 0.72, CW, CH * 0.28);

  return true;
}

/* 封面版字距排版：align 可选 'left'（给左上标签用），默认居中 */
function textTrackedForCover(ctx, str, x, y, size, color, tracking, weight, family, leftX) {
  setFont(ctx, size, weight, family);
  ctx.textBaseline = 'middle';
  var total = 0;
  for (var i = 0; i < str.length; i++) total += ctx.measureText(str[i]).width + tracking;
  total -= tracking;
  var cx;
  if (leftX !== undefined) { ctx.textAlign = 'left'; cx = leftX; }
  else { ctx.textAlign = 'left'; cx = x - total / 2; }
  ctx.fillStyle = color;
  for (var j = 0; j < str.length; j++) {
    ctx.fillText(str[j], cx, y);
    cx += ctx.measureText(str[j]).width + tracking;
  }
  return total;
}

/* 封面版印章 */
function drawSealForCover(ctx, x, y, size, text) {
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = P.seal;
  roundRect(ctx, x - size / 2, y - size / 2, size, size, 8);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .22;
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

/* ── 导出接口 ───────────────────────────────────────── */
window.__coverErrors = [];
window.__renderCover = function () {
  try { renderCover(); return true; }
  catch (e) { window.__coverErrors.push(e.message); return false; }
};
window.__coverReady = true;
