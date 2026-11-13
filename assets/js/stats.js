/* 统计页：年份切换 + 月份筛选 + 远征 */
(function () {
  "use strict";

  var A = window.Archive;
  A.initHeader("stats");

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function keyOf(y, m) { return y + "-" + pad(m); }
  function yearOf(iso) { return Number(String(iso).slice(0, 4)); }

  /* ---------- 可选年份：数据前后各留一年 ---------- */
  var yearsIn = {};
  A.shows.forEach(function (s) { yearsIn[yearOf(s.date)] = true; });
  A.cheki.forEach(function (c) { yearsIn[yearOf(c.date)] = true; });
  A.trips.forEach(function (t) { yearsIn[yearOf(t.from)] = true; });
  var known = Object.keys(yearsIn).map(Number).sort(function (a, b) { return a - b; });
  if (!known.length) known = [new Date().getFullYear()];
  var minY = known[0], maxY = known[known.length - 1];
  var years = [];
  for (var y = minY - 1; y <= maxY + 1; y++) years.push(y);

  var thisYear = new Date().getFullYear();
  var state = { year: years.indexOf(thisYear) >= 0 ? thisYear : maxY, month: null };
  document.title = "统计 — " + (A.site.title || "Cheki Archive");

  /* ---------- 取数 ---------- */
  function tripDaysIn(t, year, monthKey) {
    if (monthKey) return A.tripDaysInMonth(t, monthKey);
    var n = 0;
    for (var m = 1; m <= 12; m++) n += A.tripDaysInMonth(t, keyOf(year, m));
    return n;
  }

  function selection() {
    var year = String(state.year);
    var inMonth = state.month;
    var shows = A.shows.filter(function (s) {
      return s.date.slice(0, 4) === year && (!inMonth || s.date.slice(0, 7) === inMonth);
    });
    var cheki = A.cheki.filter(function (c) {
      return c.date.slice(0, 4) === year && (!inMonth || c.date.slice(0, 7) === inMonth);
    });
    var trips = A.trips.filter(function (t) {
      if (inMonth) return t.from.slice(0, 7) === inMonth;
      return t.from.slice(0, 4) === year;
    });
    var tripSpend = trips.reduce(function (n, t) { return n + A.tripTotal(t); }, 0);
    var tripDays = A.trips.reduce(function (n, t) { return n + tripDaysIn(t, state.year, inMonth); }, 0);
    var showSpend = shows.reduce(function (n, s) { return n + A.totalCost(s); }, 0);
    return {
      shows: shows, cheki: cheki, trips: trips,
      tripSpend: tripSpend, tripDays: tripDays,
      showSpend: showSpend,
      spend: showSpend + tripSpend
    };
  }

  /* ---------- 月份条 ---------- */
  function monthCells(year) {
    var cells = [];
    var yearShows = A.shows.filter(function (s) { return s.date.slice(0, 4) === String(year); });
    var yearCheki = A.cheki.filter(function (c) { return c.date.slice(0, 4) === String(year); });
    var yearTrips = A.trips.filter(function (t) { return t.from.slice(0, 4) === String(year); });
    var yearSpend = yearShows.reduce(function (n, s) { return n + A.totalCost(s); }, 0) +
      yearTrips.reduce(function (n, t) { return n + A.tripTotal(t); }, 0);
    var yearDays = A.trips.reduce(function (n, t) { return n + tripDaysIn(t, year, null); }, 0);

    cells.push({
      key: null, label: "全年", spend: yearSpend,
      meta: yearShows.length + " 场 · " + yearCheki.length + " 张",
      trip: yearDays ? "远征 " + yearDays + " 天" : ""
    });

    for (var m = 1; m <= 12; m++) {
      var k = keyOf(year, m);
      var ms = yearShows.filter(function (s) { return s.date.slice(0, 7) === k; });
      var mc = yearCheki.filter(function (c) { return c.date.slice(0, 7) === k; });
      var mt = A.trips.filter(function (t) { return t.from.slice(0, 7) === k; });
      var days = A.trips.reduce(function (n, t) { return n + A.tripDaysInMonth(t, k); }, 0);
      cells.push({
        key: k, label: m + "月",
        spend: ms.reduce(function (n, s) { return n + A.totalCost(s); }, 0) +
          mt.reduce(function (n, t) { return n + A.tripTotal(t); }, 0),
        meta: ms.length + " 场 · " + mc.length + " 张",
        trip: days ? "远征 " + days + " 天" : ""
      });
    }
    return cells;
  }

  function renderStrip() {
    var el = document.getElementById("month-strip");
    el.innerHTML = monthCells(state.year).map(function (c) {
      var active = (c.key === state.month) || (!c.key && !state.month);
      return '<button type="button" class="mcell' + (active ? " is-active" : "") + '"' +
        ' data-month="' + (c.key || "") + '" aria-pressed="' + active + '">' +
        '<span class="mc-m">' + c.label + '</span>' +
        '<span class="mc-v">' + A.yen(c.spend) + '</span>' +
        '<span class="mc-s">' + c.meta + '</span>' +
        (c.trip ? '<span class="mc-t">' + c.trip + '</span>' : "") +
        '</button>';
    }).join("");
  }

  /* ---------- KPI ---------- */
  function renderKpis(sel) {
    var most = sel.shows.slice().sort(function (a, b) { return A.totalCost(b) - A.totalCost(a); })[0];
    var kpis = [
      { label: "累计支出", value: A.yen(sel.spend), unit: "" },
      { label: "参战", value: sel.shows.length, unit: "场" },
      { label: "拍立得", value: sel.cheki.length, unit: "张" },
      { label: "远征", value: sel.tripDays, unit: "天" },
      { label: "平均每场", value: sel.shows.length ? A.yen(Math.round(sel.showSpend / sel.shows.length)) : "—", unit: "" },
      { label: "最贵一场", value: most ? A.yen(A.totalCost(most)) : "—",
        unit: most ? A.fmtDot(most.date) + " " + A.venues[most.venue].short : "" }
    ];
    document.getElementById("kpis").innerHTML = kpis.map(function (k) {
      return '<div class="kpi"><dt>' + k.label + '</dt><dd>' + k.value +
        (k.unit ? '<small>' + k.unit + '</small>' : "") + '</dd></div>';
    }).join("");
  }

  /* ---------- 分类 ---------- */
  var GROUPS = [
    { key: "ticket", label: "票务・饮品", color: "#b23c2c", of: function (s) { return s.ticket + (s.costs.drink || 0); } },
    { key: "cheki", label: "拍立得", color: "#c2a15a", of: function (s) { return s.costs.cheki || 0; } },
    { key: "goods", label: "物贩", color: "#6f8f6a", of: function (s) { return s.costs.goods || 0; } },
    { key: "other", label: "其他", color: "#9a8f80", of: function (s) { return s.costs.other || 0; } },
    { key: "trip", label: "远征", color: "#5b7a99", of: null }
  ];

  /* ---------- 每月支出 ---------- */
  function renderChart() {
    var months = [];
    for (var m = 1; m <= 12; m++) months.push(keyOf(state.year, m));
    var data = months.map(function (k) {
      var ms = A.shows.filter(function (s) { return s.date.slice(0, 7) === k; });
      var mt = A.trips.filter(function (t) { return t.from.slice(0, 7) === k; });
      return {
        key: k,
        shows: ms,
        trip: mt.reduce(function (n, t) { return n + A.tripTotal(t); }, 0)
      };
    });

    var totals = data.map(function (d) {
      return d.trip + d.shows.reduce(function (n, s) { return n + A.totalCost(s); }, 0);
    });
    var maxMonth = Math.max.apply(null, totals.concat([1]));
    var step = 5000;
    [1000, 2000, 2500, 5000, 10000, 20000, 50000].some(function (s) {
      if (Math.ceil(maxMonth / s) <= 6) { step = s; return true; }
      return false;
    });
    var yMax = Math.ceil(maxMonth / step) * step || step;

    var W = 820, H = 300, padL = 46, padR = 8, padT = 18, padB = 34;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;
    var slot = plotW / 12;
    var bw = Math.min(38, slot * 0.55);

    var svg = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="每月支出柱状图" preserveAspectRatio="none">'];
    for (var v = 0; v <= yMax; v += step) {
      var y = padT + plotH - (v / yMax) * plotH;
      svg.push('<line class="grid-line" x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y.toFixed(1) + '"/>');
      svg.push('<text class="axis-txt" x="' + (padL - 10) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end">' +
        (v === 0 ? "0" : (v / 1000) + "k") + '</text>');
    }

    data.forEach(function (d, i) {
      var cx = padL + slot * i + slot / 2;
      var cursor = padT + plotH;
      var mTotal = 0;
      var active = !state.month || state.month === d.key;
      svg.push('<g class="bar-group' + (active ? "" : " is-dim") + '" data-month="' + d.key + '">');
      GROUPS.forEach(function (g) {
        var val = g.key === "trip" ? d.trip : d.shows.reduce(function (n, s) { return n + g.of(s); }, 0);
        if (!val) return;
        mTotal += val;
        var h = (val / yMax) * plotH;
        cursor -= h;
        svg.push('<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + cursor.toFixed(1) + '" width="' + bw.toFixed(1) +
          '" height="' + h.toFixed(1) + '" fill="' + g.color + '" opacity="0.92"><title>' +
          Number(d.key.slice(5)) + "月 " + g.label + " " + A.yen(val) + '</title></rect>');
      });
      if (mTotal > 0) {
        svg.push('<text class="axis-txt" x="' + cx.toFixed(1) + '" y="' + (cursor - 6).toFixed(1) + '" text-anchor="middle">' +
          Math.round(mTotal / 1000) + "k</text>");
      }
      svg.push('<text class="axis-txt" x="' + cx.toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle">' + (i + 1) + '月</text>');
      svg.push('</g>');
    });
    svg.push('</svg>');
    document.getElementById("monthly").innerHTML = svg.join("");

    var yearShows = A.shows.filter(function (s) { return s.date.slice(0, 4) === String(state.year); });
    var yearTrips = A.trips.filter(function (t) { return t.from.slice(0, 4) === String(state.year); });
    document.getElementById("legend").innerHTML = GROUPS.map(function (g) {
      var sum = g.key === "trip"
        ? yearTrips.reduce(function (n, t) { return n + A.tripTotal(t); }, 0)
        : yearShows.reduce(function (n, s) { return n + g.of(s); }, 0);
      return '<li><i style="background:' + g.color + '"></i>' + g.label + ' ' + A.yen(sum) + '</li>';
    }).join("");
  }

  /* ---------- 类别 / 场馆 / 曲目 / 衣装 ---------- */
  function drawBars(el, items, max, fmt) {
    if (!items.length) { el.innerHTML = '<p class="bars-empty">这个范围还没有记录。</p>'; return; }
    el.innerHTML = items.map(function (it) {
      var w = Math.max(1.5, (it.value / (max || 1)) * 100);
      return '<div class="bar-row"><span class="name">' + A.esc(it.name) + '</span>' +
        '<span class="bar-track"><span class="bar-fill" style="width:' + w.toFixed(1) + '%"></span></span>' +
        '<span class="num">' + fmt(it) + '</span></div>';
    }).join("");
  }

  function renderDetails(sel) {
    var catMap = {};
    sel.shows.forEach(function (s) {
      A.breakdown(s).forEach(function (r) {
        if (!catMap[r.key]) catMap[r.key] = { name: r.label, value: 0 };
        catMap[r.key].value += r.value;
      });
    });
    if (sel.tripSpend) catMap.trip = { name: "远征", value: sel.tripSpend };
    var cats = Object.keys(catMap).map(function (k) { return catMap[k]; })
      .sort(function (a, b) { return b.value - a.value; });
    drawBars(document.getElementById("cats"), cats, cats[0] ? cats[0].value : 1, function (it) { return A.yen(it.value); });

    var venueMap = {};
    sel.shows.forEach(function (s) {
      if (!venueMap[s.venue]) {
        venueMap[s.venue] = { name: (A.venues[s.venue] || {}).short || s.venue, count: 0, spend: 0 };
      }
      venueMap[s.venue].count++;
      venueMap[s.venue].spend += A.totalCost(s);
    });
    var venues = Object.keys(venueMap).map(function (k) { return venueMap[k]; })
      .sort(function (a, b) { return b.count - a.count; });
    drawBars(document.getElementById("venues"), venues, venues[0] ? venues[0].count : 1, function (it) {
      return it.count + " 场 · " + A.yen(it.spend);
    });

    var songMap = {};
    sel.shows.forEach(function (s) {
      (s.setlist || []).forEach(function (song) { songMap[song] = (songMap[song] || 0) + 1; });
    });
    var songs = Object.keys(songMap).map(function (k) { return { name: k, value: songMap[k] }; })
      .sort(function (a, b) { return b.value - a.value; }).slice(0, 8);
    drawBars(document.getElementById("songs"), songs, songs[0] ? songs[0].value : 1, function (it) {
      return it.value + " 次";
    });

    var costumeMap = {};
    sel.cheki.forEach(function (c) {
      var name = c.costume || "未标注";
      costumeMap[name] = (costumeMap[name] || 0) + 1;
    });
    var costumes = Object.keys(costumeMap).map(function (k) { return { name: k, value: costumeMap[k] }; })
      .sort(function (a, b) { return b.value - a.value; });
    document.getElementById("costumes").innerHTML = costumes.length
      ? costumes.map(function (it) {
        return '<span class="costume">' + A.esc(it.name) + ' <b>' + it.value + '</b></span>';
      }).join("")
      : '<p class="bars-empty">这个范围还没有记录。</p>';
  }

  function render() {
    document.getElementById("year-label").textContent = state.year;
    var sel = selection();

    var scope = state.month
      ? state.year + " 年 " + Number(state.month.slice(5)) + " 月"
      : state.year + " 年";
    document.getElementById("lede").textContent =
      scope + " · " + sel.shows.length + " 场 · " + sel.cheki.length + " 张 · " +
      A.yen(sel.spend) + (sel.tripSpend ? "（含远征 " + A.yen(sel.tripSpend) + "）" : "");

    renderStrip();
    renderKpis(sel);
    renderChart();
    renderDetails(sel);
  }

  /* ---------- 交互 ---------- */
  document.querySelector(".year-switch").addEventListener("click", function (e) {
    var b = e.target.closest("[data-year]");
    if (!b) return;
    var i = years.indexOf(state.year) + Number(b.dataset.year);
    if (i < 0 || i >= years.length) return;
    state.year = years[i];
    state.month = null;
    render();
  });

  document.getElementById("month-strip").addEventListener("click", function (e) {
    var b = e.target.closest("[data-month]");
    if (!b) return;
    state.month = b.dataset.month || null;
    render();
  });

  document.getElementById("monthly").addEventListener("click", function (e) {
    var g = e.target.closest("[data-month]");
    if (!g) return;
    var k = g.dataset.month;
    state.month = state.month === k ? null : k;
    render();
  });

  render();
})();
