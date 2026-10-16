/* beats.js — 快切段（190.71–237.55s，全曲最响）的逐拍动机帧
 * 每拍一个独立构图，0.606s 一刀；动机库 16 种，按确定性序列轮转
 */
'use strict';

var MOTIFS = ['star', 'face', 'heart', 'moon', 'ring', 'glyph', 'confetti',
  'planet', 'rabbit', 'note', 'stripe', 'skewer', 'cloud', 'seal', 'burst', 'wave'];

/* 每拍弹入的通用包装：缩放 + 旋转 + 淡入
 * 快切段一拍只有 0.606s，淡入必须短（≈0.11s），否则半拍都在"渐显"里看不清。
 */
function beatPop(ctx, lt, dur, fn) {
  var p = clamp(lt / dur, 0, 1);
  var s = 0.86 + 0.14 * easeOutBack(p) + 0.03 * Math.sin(p * Math.PI);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(s, s);
  ctx.translate(-W / 2, -H / 2);
  ctx.globalAlpha = clamp(p * 6, 0, 1);
  fn(p);
  ctx.restore();
}

/* 逐拍背景：每拍换一组配色，保持"印在纸上"的统一感 */
function beatBackdrop(ctx, idx, t) {
  var sets = [
    ['#E6D5BE', '#D9C4A8'], ['#2C6E75', '#1F5359'], ['#22305A', '#3B4F85'],
    ['#DEB3A6', '#C99A8E'], ['#F3E9D8', '#E0D0B4'], ['#1A2340', '#2C3E6E'],
    ['#8E2323', '#B23134'], ['#3E7A55', '#2A5740'], ['#E8C25A', '#D9A83C'],
    ['#9B6B8E', '#7A4E70'], ['#C08A50', '#A06E38'], ['#F7F2E7', '#E6DCC8']
  ];
  var s = sets[idx % sets.length];
  var g = ctx.createLinearGradient(0, 0, W * .4, H);
  g.addColorStop(0, s[0]); g.addColorStop(1, s[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function isLight(hex) {
  var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
}
function lum(hex) {
  var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
/* 若前景色与当前拍底色明度太接近（会被"吃掉"），换成对比色 */
function pickFill(idx, color, alt, thresh) {
  var base = BEAT_BASES[idx % BEAT_BASES.length];
  var d = Math.abs(lum(color) - lum(base));
  return d < (thresh || .22) ? alt : color;
}

/* 底色明度分档：浅 / 中 / 深。中档底色（赭石、紫）最容易把前景吃掉，
   这时必须同时用极深与极浅两色，靠明度差而不是色相来分离。 */
function beatBand(idx) {
  var l = lum(BEAT_BASES[idx % BEAT_BASES.length]);
  return l > .62 ? 'light' : (l < .42 ? 'dark' : 'mid');
}
/* 与当前拍底色保证对比的一组颜色（用于彩纸、条带等大面积元素） */
function beatPalette(idx) {
  var b = beatBand(idx);
  if (b === 'light') return [P.red, '#2C6E75', '#22305A', '#E8A03C', '#3E7A55', '#E8657E'];
  if (b === 'dark') return ['#FFF6E4', '#FFD98A', '#FFB3C0', '#BFE8C0', '#CFE0FF', '#FFE9B8'];
  return ['#FFF6E4', '#1E1A18', P.red, '#2C6E75', '#FFE9B8', '#22305A'];
}

/* 中档底色（赭石 #C08A50、紫 #9B6B8E）上，单一墨色线太弱 —— 用"浅色描边 + 深色芯"的双色描边，
   保证任何底色上都有可见轮廓。 */
function inkStroke(ctx, idx, lw, darkColor, lightColor) {
  var b = beatBand(idx);
  ctx.lineWidth = lw;
  ctx.strokeStyle = b === 'light' ? (lightColor || '#FFF6E4')
    : (b === 'dark' ? P.ink : (lightColor || '#FFF6E4'));
  ctx.stroke();
  if (b === 'mid') {
    ctx.lineWidth = Math.max(2, lw * .34);
    ctx.strokeStyle = darkColor || P.ink;
    ctx.stroke();
  }
}

/* 判定当前拍背景是深是浅，用于选线色 */
var BEAT_BASES = ['#E6D5BE', '#2C6E75', '#22305A', '#DEB3A6', '#F3E9D8', '#1A2340',
  '#8E2323', '#3E7A55', '#E8C25A', '#9B6B8E', '#C08A50', '#F7F2E7'];
function beatLight(idx) {
  return beatBand(idx) === 'light';
}
function beatInk(idx) {
  return beatBand(idx) === 'dark' ? '#FFF6E4' : P.ink;
}

/* ══════════ 16 个动机 ══════════ */
var MOTIF_FN = {

  star: function (ctx, t, lt, idx) {
    var ink = beatInk(idx);
    drawStars(ctx, t, 40, .7, H);
    beatPop(ctx, lt, .34, function (p) {
      var rot = lt * .5;
      starPath(ctx, W * .5, H * .5, 320, 130, 4, rot);
      inked(ctx, ink, 14);
      starPath(ctx, W * .5, H * .5, 150, 60, 4, -rot * 1.4);
      inked(ctx, ink === P.ink ? P.red : '#FFF6E4', 0);
    });
  },

  face: function (ctx, t, lt, idx) {
    // 团子大特写：脸占满画面
    var ink = beatInk(idx);
    var o = Object.assign({}, [V.plain, V.pink, V.green, V.yellow, V.purple, V.brown][idx % 6]);
    o.phase = 0; o.bob = 0; o.pose = 'none'; o.lw = 16;
    o.eyes = ['dot', 'happy', 'sleepy', 'dot'][idx % 4];
    o.mouth = ['smile', 'open', 'cat', 'wobble'][idx % 4];
    o.open = .5;
    beatPop(ctx, lt, .30, function () {
      drawDango(ctx, W * .5, H * .56, 660, t, o);
    });
  },

  heart: function (ctx, t, lt, idx) {
    var band = beatBand(idx);
    // 心形永远是粉红 —— 靠"深色轮廓"而不是改色来分离，浅底/中底都看得见
    var outline = band === 'dark' ? '#FFF6E4' : P.ink;
    beatPop(ctx, lt, .30, function () {
      ctx.translate(W * .5, H * .52);
      var sc = 1 + .06 * Math.sin(lt * 14);
      ctx.scale(sc, sc);
      polyPath(ctx, [[0, 300], [-460, -80], [-250, -330], [0, -140], [250, -330], [460, -80]]);
      inked(ctx, '#E8657E', 20, outline);
      polyPath(ctx, [[0, 200], [-300, -60], [-160, -220], [0, -90], [160, -220], [300, -60]]);
      inked(ctx, '#F2879A', 0);
    });
  },

  moon: function (ctx, t, lt, idx) {
    var band = beatBand(idx);
    // 月亮本身是米黄；浅底上必须换成深色月盘，否则整块消失
    var moon = band === 'light' ? '#E8C25A' : '#F7E9BE';
    var stroke = band === 'dark' ? '#FFF6E4' : P.ink;
    beatPop(ctx, lt, .34, function () {
      drawMoon(ctx, W * .5, H * .50, 380, t, { color: moon, lw: 14, stroke: stroke });
      drawRabbit(ctx, W * .5, H * .42, 130, t, { eyes: 'happy' });
    });
  },

  ring: function (ctx, t, lt, idx) {
    var band = beatBand(idx);
    var ink = beatInk(idx);
    beatPop(ctx, lt, .40, function () {
      var R = 340;
      ctx.save();
      // 中档底色：外圈浅色 + 内芯深色，双色描边保证任何底色上都有轮廓
      ctx.globalAlpha = .62;
      circle(ctx, W * .5, H * .5, R);
      if (band === 'mid') {
        ctx.lineWidth = 24; ctx.strokeStyle = '#FFF6E4'; ctx.stroke();
        ctx.lineWidth = 14; ctx.strokeStyle = P.ink; ctx.stroke();
      } else {
        ctx.lineWidth = 16; ctx.strokeStyle = ink; ctx.stroke();
      }
      circle(ctx, W * .5, H * .5, R * .30); ctx.lineWidth = 12;
      ctx.globalAlpha = .40;
      ctx.strokeStyle = band === 'mid' ? P.ink : ink;
      ctx.stroke();
      ctx.restore();
      var n = 10;
      var P_ = [];
      for (var i = 0; i < n; i++) {
        var a = i / n * Math.PI * 2 - Math.PI / 2 + t * .18;
        P_.push({ x: W * .5 + Math.cos(a) * R, y: H * .5 + Math.sin(a) * R, a: a, i: i });
      }
      // 牵手：先在相邻两只之间补上胳膊与紧扣的手
      for (var q = 0; q < n; q++) {
        var pa = P_[q], pb = P_[(q + 1) % n];
        linkHands(ctx, pa.x, pb.x, (pa.y + pb.y) / 2, 200, 6, 1);
      }
      for (var j = 0; j < n; j++) {
        var pj = P_[j];
        var o = Object.assign({}, [V.pink, V.plain, V.green, V.yellow, V.purple, V.cream, V.red, V.brown][j % 8]);
        o.phase = j * .9; o.bob = 5; o.pose = 'none'; o.eyes = 'happy';
        drawDango(ctx, pj.x, pj.y, 200, t, o);
      }
      // 中心：手拉手的心（同上，用轮廓分离）
      var hb = 1 + .08 * Math.sin(lt * 10);
      ctx.save();
      ctx.translate(W * .5, H * .5); ctx.scale(hb, hb);
      polyPath(ctx, [[0, 150], [-230, -40], [-125, -165], [0, -70], [125, -165], [230, -40]]);
      inked(ctx, '#E8657E', 18, band === 'dark' ? '#FFF6E4' : P.ink);
      ctx.restore();
    });
  },

  glyph: function (ctx, t, lt, idx) {
    var ink = beatInk(idx);
    var words = ['だんご', 'だんご', '大家族', 'まるい輪', 'おつきさま', 'てをつなぎ',
      'だんご星', 'みんなで'];
    var zhWords = ['团子', '团子', '大家族', '圆圆的圈', '月亮', '手牵着手',
      '团子星', '大家一起'];
    var w = words[idx % words.length];
    var zw = zhWords[idx % zhWords.length];
    beatPop(ctx, lt, .28, function () {
      var size = w.length > 4 ? 210 : 260;
      ctx.save();
      ctx.translate(W * .5, H * .5);
      ctx.rotate((hash1(idx) - .5) * .10);
      setFont(ctx, size, 700, F_SANS);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 22; ctx.strokeStyle = ink === P.ink ? '#FFF6E4' : P.ink;
      ctx.strokeText(w, 0, 0);
      ctx.fillStyle = ink; ctx.fillText(w, 0, 0);
      // 中文对照小字
      setFont(ctx, Math.round(size * .26), 600, F_SANS);
      ctx.lineWidth = 12;
      ctx.strokeText(zw, 0, size * .66);
      ctx.fillStyle = ink; ctx.fillText(zw, 0, size * .66);
      ctx.restore();
    });
  },

  confetti: function (ctx, t, lt, idx) {
    var band = beatBand(idx);
    var cols = beatPalette(idx);
    beatPop(ctx, lt, .30, function () {
      var p = clamp(lt / .42, 0, 1);
      // 中心实体圆盘（先立住画面重心，否则整帧只剩一个空心环）
      circle(ctx, W * .5, H * .5, 132);
      inked(ctx, '#FFF6E4', band === 'light' ? 12 : 10, band === 'light' ? P.ink : P.ink);
      setFont(ctx, 96, 700, F_SANS);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = P.red;
      ctx.fillText('だんご', W * .5, H * .5 + 4);
      // 扩散环：浅底深环 / 深底浅环 + 内芯
      circle(ctx, W * .5, H * .5, 170 + easeOut(p) * 620);
      if (band === 'light') {
        ctx.lineWidth = 30; ctx.strokeStyle = '#FFF6E4'; ctx.stroke();
        ctx.lineWidth = 18; ctx.strokeStyle = P.ink; ctx.stroke();
      } else {
        ctx.lineWidth = 30; ctx.strokeStyle = P.ink; ctx.stroke();
        ctx.lineWidth = 16; ctx.strokeStyle = '#FFF6E4'; ctx.stroke();
      }
      // 放射线：让"爆发"读得出来
      ctx.save();
      ctx.globalAlpha = (1 - p) * .55;
      for (var s = 0; s < 16; s++) {
        var a = s / 16 * Math.PI * 2 + idx * .21;
        ctx.beginPath();
        ctx.moveTo(W * .5 + Math.cos(a) * (210 + p * 300), H * .5 + Math.sin(a) * (210 + p * 300));
        ctx.lineTo(W * .5 + Math.cos(a) * (330 + p * 620), H * .5 + Math.sin(a) * (330 + p * 620));
        ctx.lineWidth = 14; ctx.lineCap = 'round';
        ctx.strokeStyle = cols[s % cols.length]; ctx.stroke();
      }
      ctx.restore();
      confetti(ctx, t * 2.2, 90, cols, idx * 7);
    });
  },

  planet: function (ctx, t, lt, idx) {
    var base = pickFill(idx, '#D9B98A', '#C08A50');
    beatPop(ctx, lt, .36, function () {
      var cx = W * .5, cy = H * .52, R = 260;
      circle(ctx, cx, cy, R); inked(ctx, base, 14);
      ctx.save();
      circle(ctx, cx, cy, R); ctx.clip();
      ctx.globalAlpha = .55; ctx.fillStyle = pickFill(idx, '#8FBF6A', '#4E9E5C');
      for (var i = 0; i < 5; i++) {
        var a = hash1(i * 3.1 + idx) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * R * .5, cy + Math.sin(a) * R * .5,
          70, 40, a, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = .75;
      ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.7, R * .34, -.3, 0, Math.PI * 2);
      ctx.lineWidth = 22; ctx.strokeStyle = pickFill(idx, '#8FA8D8', '#4A6398');
      ctx.stroke();
      ctx.restore();
    });
  },

  rabbit: function (ctx, t, lt, idx) {
    var moon = pickFill(idx, '#F5E7B8', '#F7E9BE', .10);
    beatPop(ctx, lt, .32, function () {
      drawMoon(ctx, W * .5, H * .62, 220, t, { color: moon, lw: 12 });
      var p = clamp(lt / .5, 0, 1);
      drawRabbit(ctx, W * .5, H * .62 - easeOutBounce(p) * 300, 190, t, { eyes: 'happy' });
    });
  },

  note: function (ctx, t, lt, idx) {
    var ink = beatInk(idx);
    var pal = beatPalette(idx);
    beatPop(ctx, lt, .30, function () {
      for (var i = 0; i < 9; i++) {
        var a = i / 9 * Math.PI * 2 + t * .6;
        var r = 220 + hash1(i * 3.3 + idx) * 200;
        setFont(ctx, 90 + hash1(i * 5.1) * 70, 700, F_SANS);
        ctx.fillStyle = [ink, pal[2], pal[3], pal[4]][i % 4];
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(['♪', '♫', '♬'][i % 3],
          W * .5 + Math.cos(a) * r, H * .5 + Math.sin(a) * r * .8);
      }
      circle(ctx, W * .5, H * .5, 110); inked(ctx, ink, 12);
    });
  },

  stripe: function (ctx, t, lt, idx) {
    var p = clamp(lt / .30, 0, 1);
    var cols = beatLight(idx) ? [P.red, P.teal, '#E8A03C', P.indigo, '#3E7A55', '#E8657E']
      : ['#FFF6E4', P.dy, '#FFB3C0', '#9AB4E8', '#BFE8C0', '#FFE9B8'];
    for (var i = 0; i < 12; i++) {
      var off = (i % 2 ? -1 : 1) * (1 - easeOut(p)) * W;
      ctx.save();
      ctx.translate(off, 0);
      ctx.fillStyle = cols[(i + idx) % cols.length];
      ctx.fillRect(0, H * i / 12, W, H / 12 + 2);
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = easeOut(p);
    setFont(ctx, 240, 700, F_SANS);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // 字色永远与条带形成对比：浅底用墨色 + 白描边，深底用米白 + 墨描边
    var light = beatLight(idx);
    ctx.lineWidth = 22;
    ctx.strokeStyle = light ? '#FFF6E4' : P.ink;
    ctx.strokeText('だんご', W * .5, H * .5);
    ctx.fillStyle = light ? P.ink : '#FFF6E4';
    ctx.fillText('だんご', W * .5, H * .5);
    // 中文对照小字
    setFont(ctx, 76, 600, F_SANS);
    ctx.lineWidth = 14;
    ctx.strokeText('团子', W * .5, H * .5 + 186);
    ctx.fillStyle = light ? P.ink : '#FFF6E4';
    ctx.fillText('团子', W * .5, H * .5 + 186);
    ctx.restore();
  },

  skewer: function (ctx, t, lt, idx) {
    beatPop(ctx, lt, .34, function () {
      var n = 4;
      for (var j = 0; j < n; j++) {
        var x = W * .5 + (j - (n - 1) / 2) * 330;
        var rot = (j - (n - 1) / 2) * .16;
        ctx.save();
        ctx.translate(x, H * .5); ctx.rotate(rot);
        drawSkewerDango(ctx, 0, 0, 132, t, {
          colors: [V.pink.color, V.plain.color, V.green.color, V.yellow.color],
          phase: j
        });
        ctx.restore();
      }
    });
  },

  cloud: function (ctx, t, lt, idx) {
    beatPop(ctx, lt, .34, function () {
      // 几朵小云浮着，团子坐在最大的一朵上
      cloud(ctx, W * .22, H * .34, 300, '#F7F2E7', 10);
      cloud(ctx, W * .80, H * .28, 240, '#F7F2E7', 10);
      cloud(ctx, W * .5, H * .78, 760, '#F7F2E7', 14);
      for (var i = 0; i < 4; i++) {
        var o = Object.assign({}, [V.pink, V.plain, V.green, V.yellow][i]);
        o.phase = i * 1.1; o.bob = 10; o.pose = 'cheer'; o.eyes = 'happy';
        drawDango(ctx, W * .5 + (i - 1.5) * 190, H * .70, 150, t, o);
      }
    });
  },

  seal: function (ctx, t, lt, idx) {
    var p = clamp(lt / .26, 0, 1);
    var s = lerp(2.4, 1, easeOutBack(p));
    ctx.save();
    ctx.translate(W * .5, H * .5);
    ctx.rotate(-.06);
    ctx.scale(s, s);
    ctx.globalAlpha = clamp(p * 2.2, 0, 1);
    var size = 620;
    roundRect(ctx, -size / 2, -size / 2, size, size, 26);
    inked(ctx, P.seal, 16);
    setFont(ctx, 240, 700, F_SERIF);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFF6E4';
    ctx.fillText('团子', 0, -70);
    setFont(ctx, 120, 700, F_SERIF);
    ctx.fillText('大家族', 0, 130);
    ctx.restore();
  },

  burst: function (ctx, t, lt, idx) {
    var p = clamp(lt / .42, 0, 1);
    ctx.save();
    ctx.translate(W * .5, H * .5);
    var n = 28;
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2 + hash1(i * 3.1 + idx) * .2;
      var r0 = 60 + hash1(i * 5.3) * 60;
      var r1 = r0 + easeOut(p) * (900 + hash1(i * 2.7) * 400);
      ctx.save();
      ctx.globalAlpha = 1 - p * .5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0 * .7);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1 * .7);
      ctx.lineWidth = 12 + hash1(i) * 16;
      ctx.strokeStyle = [P.red, '#E8A03C', '#4E9E5C', '#FFF6E4', '#E8657E'][i % 5];
      ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    circle(ctx, W * .5, H * .5, 90 + (1 - p) * 40); inked(ctx, '#FFF6E4', 12);
    starPath(ctx, W * .5, H * .5, 70, 30, 6, t * .8); inked(ctx, P.red, 0);
  },

  wave: function (ctx, t, lt, idx) {
    var ink = beatInk(idx);
    beatPop(ctx, lt, .34, function () {
      // 层叠的同心弧（手拉手的轮）
      for (var i = 0; i < 7; i++) {
        ctx.save();
        ctx.globalAlpha = .85 - i * .10;
        ctx.beginPath();
        ctx.arc(W * .5, H * .78, 120 + i * 105, Math.PI * 1.04, Math.PI * 1.96);
        ctx.lineWidth = 18 - i; ctx.strokeStyle = i % 2 ? ink : P.red;
        ctx.lineCap = 'round'; ctx.stroke();
        ctx.restore();
      }
      for (var k = 0; k < 5; k++) {
        var a = Math.PI * 1.10 + k * (Math.PI * .8 / 4);
        var o = Object.assign({}, [V.pink, V.plain, V.green, V.yellow, V.purple][k]);
        o.phase = k * 1.1; o.bob = 8; o.pose = 'cheer'; o.eyes = 'happy';
        drawDango(ctx, W * .5 + Math.cos(a) * (120 + 3 * 105), H * .78 + Math.sin(a) * (120 + 3 * 105), 130, t, o);
      }
    });
  }
};

/* 快切段的场景入口：sc.motif 指定动机，sc.beat 是段内第几拍 */
function scBeat(ctx, t, lt, sc) {
  var idx = sc.motifIdx === undefined ? 0 : sc.motifIdx;
  beatBackdrop(ctx, idx, t);
  var m = sc.motif || MOTIFS[idx % MOTIFS.length];
  var fn = MOTIF_FN[m] || MOTIF_FN.star;
  fn(ctx, t, lt, idx);
  // 统一叠一层纸网，保住"印刷"质感
  halftone(ctx, idx % 3 === 0 ? 11 : (idx % 3 === 1 ? 9.2 : 15), 1.7, .16, false);
  // 拍点白闪（每拍开头 60ms）
  if (lt < .06) {
    ctx.save();
    ctx.globalAlpha = (1 - lt / .06) * .22;
    ctx.fillStyle = '#FFF6E4'; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}
