/* timeline.js — 分镜表（全部按实测歌词时间轴 + 99 BPM 拍点对齐）
 * 每镜：{t0, t1, fn, name, motif?, motifIdx?}
 * BPM 99 → 拍长 0.606060s
 */
'use strict';

var BPM = 99;
var BEAT = 60 / BPM;         // 0.606060s
var DUR = 273.031825;

var SHOTS = [];

function shot(t0, t1, fn, name, extra) {
  var s = { t0: t0, t1: t1, fn: fn, name: name };
  if (extra) for (var k in extra) s[k] = extra[k];
  SHOTS.push(s);
  return s;
}

/* ══════════ 前奏 0 – 19.15 ══════════ */
shot(0.000, 4.960, scIntro, '标题');
shot(4.960, 9.680, scChant, 'だんご×4 (1)');
shot(9.680, 13.880, scChant, 'だんご×4 (2)');
shot(13.880, 19.150, scFamily, '大家族合影');

/* ══════════ 主歌A 19.15 – 57.57 ══════════
 * 【对齐规则】每个切点必须等于它那一句歌词的起唱时间，否则字幕会比画面早一整镜。
 *   歌词（input/lyrics.lrc）：
 *     19.150 やんちゃな焼きだんご / 23.990 やさしいあんだんご / 28.850 すこし夢見がちな
 *     33.470 月見だんご       / 38.370 おすましごまだんご / 43.110 四つ子串だんご
 *     48.090 みんなみんなあわせて / 52.900 100人家族
 *   原先 scYume 跨 28.85→38.37，把「月見だんご」整句吞掉了，导致从 33.47 起后面
 *   每一镜都提前一格、字幕与画面差一镜。现在按歌词逐句切开。 */
shot(19.150, 23.990, scYaki, 'やんちゃな焼きだんご');
shot(23.990, 28.850, scAn, 'やさしいあんだんご');
shot(28.850, 33.470, scYume, 'すこし夢見がちな');
shot(33.470, 38.370, scTsukimi, '月見だんご');
shot(38.370, 43.110, scGoma, 'おすましごまだんご');
shot(43.110, 48.090, scKushi, '四つ子串だんご');
shot(48.090, 52.900, scMinna, 'みんなみんなあわせて');
shot(52.900, 57.570, sc100, '100人家族');

/* ══════════ 主歌B 57.57 – 75.25 ══════════
 *   57.570 赤ちゃんだんごは / 60.550 いつも幸せの中で / 67.170 年寄りだんごは / 70.090 目を細めてる
 *   歌词把「赤ちゃんだんごは」与「いつも幸せの中で」分成两句、分属两镜；
 *   「四つ子串だんご」在上面主歌A（43.11），不再重复占用这一格。 */
shot(57.570, 60.550, scBaby, '赤ちゃんだんごは');
shot(60.550, 67.170, scShiawase, 'いつも幸せの中で');
shot(67.170, 70.090, scToshiyori, '年寄りだんごは');
shot(70.090, 75.250, scHosome, '目を細めてる');

/* ══════════ 副歌1 75.25 – 115.25 ══════════
 * 【重要】副歌 2（157.10 起）会把这些场景函数**再放一遍**，歌词完全相同。
 *   所以这里逐镜传 pass:1，副歌 2 传 pass:2，场景内部据此切换机位/色温/
 *   构图，避免观众看到「时间不同、画面逐像素相同」。 */
shot(75.250, 80.320, scNakayoshi, 'なかよしだんご', { pass: 1 });
shot(80.320, 85.260, scWa, '大きなまるい輪', { pass: 1 });
shot(85.260, 89.600, scMachi, '町をつくり', { pass: 1 });
shot(89.600, 94.920, scWarai, 'みんなで笑いあう', { pass: 1 });
shot(94.920, 100.200, scUsagi, 'うさぎも手をふる', { pass: 1 });
shot(100.200, 104.400, scOtsuki, 'でっかいおつきさま', { pass: 1 });
shot(104.400, 109.150, scUreshii, 'うれしいこと悲しいこと', { pass: 1 });
shot(109.150, 115.250, scMarumete, '全部まるめて', { pass: 1 });

/* ══════════ 间奏1：团子星的一天 115.25 – 157.10 ══════════ */
shot(115.250, 122.500, scMorning, 'あさ');
shot(122.500, 129.500, scNoon, 'ひる');
shot(129.500, 136.500, scTea, 'おやつ');
shot(136.500, 143.500, scDusk, 'ゆうがた');
shot(143.500, 150.500, scNight, 'よる');
shot(150.500, 157.100, scMoonrise, 'つきのぼり');

/* ══════════ 副歌2 157.10 – 190.71（同词复唱，构图变奏） ══════════
 *   与副歌 1 同函数、同歌词，所以逐镜传 pass:2，场景内部据此换成
 *   另一套构图（机位/色温/数量/朝向），避免两次逐像素相同。 */
shot(157.100, 161.960, scNakayoshi, 'なかよしだんご (2)', { pass: 2 });
shot(161.960, 166.780, scWa, '大きなまるい輪 (2)', { pass: 2 });
shot(166.780, 171.390, scMachi, '町をつくり (2)', { pass: 2 });
shot(171.390, 176.270, scWarai, 'みんなで笑いあう (2)', { pass: 2 });
shot(176.270, 181.360, scUsagi, 'うさぎも手をふる (2)', { pass: 2 });
shot(181.360, 186.040, scOtsuki, 'でっかいおつきさま (2)', { pass: 2 });
shot(186.040, 190.710, scUreshii, 'うれしいこと悲しいこと (2)', { pass: 2 });

/* ══════════ 间奏2：宇宙巡游 190.71 – 237.55 ══════════ */
shot(190.710, 199.000, scMarumete, '全部まるめて (2)', { pass: 2 });
shot(199.000, 204.500, scGalaxy, 'ぎんが');
shot(204.500, 210.303, scDangoPlanet, 'だんご星');

/* 快切段：210.303 – 236.0，分层加速（先两拍一刀 → 一拍一刀 → 收回来）
 *
 * 【为什么起点是 210.303 而不是 210.000】
 *   BPM 99 ⇒ 拍长 0.606060s。实测第 347 拍落在 t=210.303，
 *   而 t=210.000 恰好是「拍与拍的正中间」（相位 0.5 的反拍）。
 *   之前整段快切都建在 210.000 上，等于每一刀都晚/早了半拍（303 ms），
 *   听感就是「没卡上拍」。改成从真实拍点 210.303 起算，容差 ±1 帧内。 */
var BEAT_T0 = 210.303, BEAT_T1 = 236.061, BEAT_STEP = 60 / BPM;
var _bi = 0, _t = BEAT_T0;
while (_t < BEAT_T1 - 1e-6) {
  /* 前 8s 每 2 拍一刀，中段每拍一刀，最后 3s 收回每 2 拍一刀 */
  var step = (_t < 218.5 || _t >= 233.0) ? BEAT_STEP * 2 : BEAT_STEP;
  var e = Math.min(_t + step, BEAT_T1);
  shot(_t, e, scBeat, 'beat-' + _bi, {
    motif: MOTIFS[_bi % MOTIFS.length],
    motifIdx: _bi,
    noFlash: true          // 快切段不用 0.22s 全屏白闪（0.6s 一刀会糊成一片），改用 scBeat 自己的 60ms 拍点闪
  });
  _t = e; _bi++;
}
shot(236.061, 237.550, scMoonClose, 'おつきさま');
shot(237.550, 240.000, scFadeStars, 'フェード');

/* ══════════ 尾奏 240 – 273.03 ══════════ */
shot(240.000, 247.210, scEndChant, 'だんご×4 (尾)');
shot(247.210, 256.820, scEndFamily, '大家族 (尾)');
shot(256.820, 266.380, scEndChant, 'だんご×4 (尾2)');
shot(266.380, DUR, scEndCard, 'スタッフロール');

/* ── 查镜 ─────────────────────────────────────────────── */
function shotAt(t) {
  if (t < 0) t = 0;
  for (var i = 0; i < SHOTS.length; i++) {
    if (t >= SHOTS[i].t0 && t < SHOTS[i].t1) return SHOTS[i];
  }
  return SHOTS[SHOTS.length - 1];
}
function shotIndexAt(t) {
  for (var i = 0; i < SHOTS.length; i++) {
    if (t >= SHOTS[i].t0 && t < SHOTS[i].t1) return i;
  }
  return SHOTS.length - 1;
}

/* ── 字幕表：从 LYRICS 派生（跳过制作名单/空行；器乐段自动消隐）
 *   每条带 zh = 中文译文，mode = 特殊版式（big = 副歌金句大字） ── */
var SUBS = (function () {
  var out = [];
  for (var i = 0; i < LYRICS.length; i++) {
    var L = LYRICS[i];
    if (!L.text) continue;
    if (/^(作词|作曲|编曲)\s*[:：]/.test(L.text)) continue;
    var next = DUR;
    for (var j = i + 1; j < LYRICS.length; j++) {
      if (LYRICS[j].text && !/^(作词|作曲|编曲)\s*[:：]/.test(LYRICS[j].text)) {
        next = LYRICS[j].t; break;
      }
    }
    var hold = Math.min(next - L.t, 6.4);
    if (hold < 0.6) hold = 0.6;
    var key = L.t.toFixed(3);
    out.push({
      t0: L.t, t1: L.t + hold, text: L.text,
      zh: zhFor(L.t),
      mode: SUB_MODES[key] || null
    });
  }
  return out;
})();

function subAt(t) {
  for (var i = 0; i < SUBS.length; i++) {
    if (t >= SUBS[i].t0 && t < SUBS[i].t1) {
      // 入/出各 0.25s 淡入淡出
      var a = Math.min(1, (t - SUBS[i].t0) / 0.25, (SUBS[i].t1 - t) / 0.25);
      return { text: SUBS[i].text, zh: SUBS[i].zh, mode: SUBS[i].mode, alpha: clamp(a, 0, 1) };
    }
  }
  return null;
}
