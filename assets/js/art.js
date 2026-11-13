/* ------------------------------------------------------------------
 * 占位图生成
 * 没有真实照片时，用 id 派生出稳定的「现场感」渐变照片。
 * 同一张拍立得永远得到同一张图（确定性随机）。
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  function hashStr(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function uri(svg) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* 正面：舞台灯 + 剪影 */
  function photo(id) {
    var r = rng(hashStr(id));
    var hue = Math.floor(r() * 360);
    var hue2 = (hue + 30 + r() * 130) % 360;
    var hue3 = (hue + 200) % 360;
    var cx = 300 + (r() - 0.5) * 170;
    var headCy = 420 + (r() - 0.5) * 70;
    var headRx = 52 + r() * 14;
    var headRy = headRx * (1.14 + r() * 0.12);
    var shW = 132 + r() * 38;
    var shY = headCy + 112;
    var bokeh = "";
    var n = 6 + Math.floor(r() * 4);

    for (var i = 0; i < n; i++) {
      var x = Math.round(r() * 600);
      var y = Math.round(r() * 620);
      var rad = Math.round(24 + r() * 120);
      var h = Math.round([hue, hue2, hue3][Math.floor(r() * 3)]);
      var o = (0.2 + r() * 0.45).toFixed(2);
      bokeh += '<circle cx="' + x + '" cy="' + y + '" r="' + rad +
        '" fill="hsl(' + h + ' 60% ' + Math.round(52 + r() * 24) + '%)" opacity="' + o + '"/>';
    }

    var sparks = "";
    for (var k = 0; k < 14; k++) {
      sparks += '<circle cx="' + Math.round(r() * 600) + '" cy="' + Math.round(r() * 560) +
        '" r="' + (1 + r() * 3.5).toFixed(1) + '" fill="#fff4d8" opacity="' + (0.25 + r() * 0.45).toFixed(2) + '"/>';
    }

    var streaks = "";
    for (var s = 0; s < 3; s++) {
      var sx = Math.round((r() - 0.2) * 700);
      var sy = Math.round(r() * 800);
      streaks += '<rect x="' + sx + '" y="' + sy + '" width="' + Math.round(30 + r() * 90) +
        '" height="' + Math.round(320 + r() * 380) + '" rx="40" fill="hsl(' +
        Math.round(hue2) + ' 80% 70%)" opacity="' + (0.05 + r() * 0.07).toFixed(2) + '"/>';
    }

    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">' +
      '<defs>' +
      '<linearGradient id="g" x1="0" y1="0" x2="0.35" y2="1">' +
      '<stop offset="0" stop-color="hsl(' + hue + ' 42% 28%)"/>' +
      '<stop offset="0.55" stop-color="hsl(' + hue2 + ' 46% 16%)"/>' +
      '<stop offset="1" stop-color="hsl(' + hue3 + ' 38% 8%)"/>' +
      '</linearGradient>' +
      '<radialGradient id="v" cx="0.5" cy="0.42" r="0.78">' +
      '<stop offset="0.5" stop-color="#000" stop-opacity="0"/>' +
      '<stop offset="1" stop-color="#000" stop-opacity="0.55"/>' +
      '</radialGradient>' +
      '<radialGradient id="glow" cx="0.5" cy="0.26" r="0.62">' +
      '<stop offset="0" stop-color="hsl(' + hue + ' 95% 68%)" stop-opacity="0.3"/>' +
      '<stop offset="1" stop-color="hsl(' + hue + ' 95% 68%)" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<filter id="b" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="40"/></filter>' +
      '<filter id="b2" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="16"/></filter>' +
      '</defs>' +
      '<rect width="600" height="800" fill="url(#g)"/>' +
      '<rect width="600" height="800" fill="url(#glow)"/>' +
      '<g filter="url(#b)" opacity="0.92">' + bokeh + '</g>' +
      '<g filter="url(#b2)" opacity="0.45">' + streaks + '</g>' +
      '<g filter="url(#b2)" opacity="0.92">' +
      '<ellipse cx="' + Math.round(cx) + '" cy="' + Math.round(headCy) + '" rx="' + Math.round(headRx) + '" ry="' + Math.round(headRy) + '" fill="#0b0908"/>' +
      '<path d="M' + Math.round(cx - shW) + ' 800 Q' + Math.round(cx - shW * 0.82) + ' ' + Math.round(shY) + ' ' +
      Math.round(cx) + ' ' + Math.round(shY - 24) + ' Q' + Math.round(cx + shW * 0.82) + ' ' + Math.round(shY) + ' ' +
      Math.round(cx + shW) + ' 800 Z" fill="#0b0908"/>' +
      '<ellipse cx="' + Math.round(cx) + '" cy="' + Math.round(headCy) + '" rx="' + Math.round(headRx) + '" ry="' + Math.round(headRy) +
      '" fill="none" stroke="hsl(' + Math.round(hue) + ' 70% 62%)" stroke-opacity="0.35" stroke-width="3"/>' +
      '</g>' +
      '<g opacity="0.55">' + sparks + '</g>' +
      '<rect width="600" height="800" fill="url(#v)"/>' +
      '</svg>';

    return uri(svg);
  }

  /* 背面：签名 + 日期 + 留言 */
  function back(id, meta) {
    meta = meta || {};
    var r = rng(hashStr(id + "-back"));
    var message = meta.message || "";
    var dateText = meta.dateText || "";
    var nameText = meta.nameText || "";
    var size = message.length > 18 ? 32 : message.length > 10 ? 38 : 46;
    var perLine = Math.max(8, Math.floor(460 / size));
    var lines = [];
    for (var li = 0; li < message.length && lines.length < 3; li += perLine) {
      lines.push(message.slice(li, li + perLine));
    }
    if (message.length > perLine * 3) {
      lines[2] = lines[2].slice(0, Math.max(1, lines[2].length - 1)) + "…";
    }

    var sig =
      "M" + Math.round(300 + r() * 40) + " " + Math.round(628 + r() * 20) +
      " c -30 -40, -62 10, -34 34 s 52 -44, 78 -12 s -6 46, 22 34 s 40 -30, 62 -26";

    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">' +
      '<defs><radialGradient id="p" cx="0.4" cy="0.25" r="0.9">' +
      '<stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#efe6d2"/>' +
      '</radialGradient></defs>' +
      '<rect width="600" height="800" fill="url(#p)"/>' +
      '<rect x="26" y="26" width="548" height="748" fill="none" stroke="#d9cdb4" stroke-width="2" opacity="0.7"/>' +
      (dateText
        ? '<text x="60" y="108" font-family="Georgia, serif" font-size="26" fill="#8a7f6a" letter-spacing="2">' + esc(dateText) + '</text>'
        : "") +
      (message
        ? '<text x="60" y="330" font-family="\'Segoe Print\',\'Bradley Hand\',\'Yu Mincho\',cursive" font-size="' + size +
          '" fill="#2b3a55" transform="rotate(-2 60 330)">' +
          lines.map(function (l, i) {
            return '<tspan x="60" dy="' + (i ? Math.round(size * 1.38) : 0) + '">' + esc(l) + '</tspan>';
          }).join("") +
          '</text>'
        : "") +
      '<path d="' + sig + '" fill="none" stroke="#2b3a55" stroke-width="5" stroke-linecap="round" opacity="0.85"/>' +
      (nameText
        ? '<text x="60" y="705" font-family="\'Segoe Print\',cursive" font-size="30" fill="#5c5344">' + esc(nameText) + '</text>'
        : "") +
      '<text x="540" y="745" text-anchor="end" font-family="Georgia, serif" font-size="14" fill="#b6a98e" letter-spacing="3">POLAROID</text>' +
      '</svg>';

    return uri(svg);
  }

  window.Art = { photo: photo, back: back };
})();
