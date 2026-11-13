/* 首页：按年份 / 月份 / 场次堆叠的拍立得墙 */
(function () {
  "use strict";

  var A = window.Archive;
  var lb = new A.Lightbox();
  A.initHeader("home");

  var timeline = document.getElementById("timeline");
  var countEl = document.getElementById("count");
  var yearLabel = document.getElementById("year-label");
  var yearSwitch = document.getElementById("year-switch");
  var heroMember = document.getElementById("hero-member");

  if (heroMember) heroMember.textContent = A.member;
  if (A.site && A.site.title) document.title = A.site.title;

  /* ---------- 年份范围 ---------- */
  var dataYears = {};
  A.cheki.forEach(function (c) { if (c.date) dataYears[Number(c.date.slice(0, 4))] = true; });
  var ys = Object.keys(dataYears).map(Number).sort(function (a, b) { return a - b; });
  var minY = ys.length ? ys[0] : new Date().getFullYear();
  var maxY = ys.length ? ys[ys.length - 1] : minY;
  var lowY = minY - 1;
  var highY = maxY + 1;
  var nowY = new Date().getFullYear();

  var state = { filter: "all", venue: "all", sort: "desc", year: (nowY >= lowY && nowY <= highY) ? nowY : maxY };

  function yearList() {
    return A.cheki.filter(function (c) { return c.date.slice(0, 4) === String(state.year); });
  }

  /* ---------- hero 数字 ---------- */
  function renderHero() {
    var list = yearList();
    var shows = {};
    list.forEach(function (c) { shows[c.show] = true; });
    var days = 0;
    A.trips.forEach(function (t) {
      var a = t.from > state.year + "-01-01" ? t.from : state.year + "-01-01";
      var b = t.to < state.year + "-12-31" ? t.to : state.year + "-12-31";
      if (a <= b) days += Math.round((new Date(b) - new Date(a)) / 86400000) + 1;
    });
    document.getElementById("stat-shows").textContent = Object.keys(shows).length;
    document.getElementById("stat-cheki").textContent = list.length;
    document.getElementById("stat-trip").textContent = days;
    yearLabel.textContent = state.year;
  }

  /* ---------- 场馆下拉 ---------- */
  var venueSel = document.getElementById("venue-filter");
  var seen = {};
  A.cheki.forEach(function (c) {
    var area = c.venueArea;
    if (!area || seen[area]) return;
    seen[area] = true;
    var o = document.createElement("option");
    o.value = area;
    o.textContent = area;
    venueSel.appendChild(o);
  });

  /* ---------- 过滤 / 排序 ---------- */
  function current() {
    var list = yearList();
    if (state.filter === "signed") list = list.filter(function (c) { return c.signed; });
    if (state.filter === "special") list = list.filter(function (c) { return c.special; });
    if (state.filter === "fav") list = list.filter(function (c) { return A.isFav(c.id); });
    if (state.venue !== "all") list = list.filter(function (c) { return c.venueArea === state.venue; });

    if (state.sort === "rarity") {
      list.sort(function (a, b) {
        if (b.rarity !== a.rarity) return b.rarity - a.rarity;
        return a.date < b.date ? 1 : -1;
      });
    } else {
      list.sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return a.id < b.id ? -1 : 1;
      });
      if (state.sort === "desc") list.reverse();
    }
    return list;
  }

  /* 月 → 场次（同一天多场时分开） */
  function groupedByMonth(list) {
    var months = new Map();
    list.forEach(function (c) {
      var mk = c.date.slice(0, 7);
      if (!months.has(mk)) months.set(mk, new Map());
      var shows = months.get(mk);
      if (!shows.has(c.show)) shows.set(c.show, { id: c.show, date: c.date, event: c.event, items: [] });
      shows.get(c.show).items.push(c);
    });
    var keys = Array.from(months.keys());
    keys.sort(function (a, b) {
      return state.sort === "asc" ? (a < b ? -1 : 1) : (a < b ? 1 : -1);
    });
    return keys.map(function (k) {
      var shows = Array.from(months.get(k).values());
      shows.sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return a.id < b.id ? -1 : 1;
      });
      if (state.sort === "desc") shows.reverse();
      var perDate = {};
      shows.forEach(function (s) { perDate[s.date] = (perDate[s.date] || 0) + 1; });
      var multi = Object.keys(perDate).some(function (d) { return perDate[d] > 1; });
      return { key: k, shows: shows, perDate: perDate, multi: multi };
    });
  }

  /* 统一向右倾斜 */
  function tiltOf(id) {
    var h = 0;
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return 0.15 + ((h >>> 0) % 95) / 100;
  }

  /* ---------- 渲染 ---------- */
  function layer(c, cls) {
    var alt = A.fmtDate(c.date) + " " + c.venueName;
    return '<span class="layer ' + cls + '">' +
      '<img src="' + (c.photo || Art.photo(c.id)) + '" alt="' + A.esc(alt) + '" loading="lazy" decoding="async">' +
      '</span>';
  }

  function stack(group, showId) {
    var top = group[0];
    var fav = A.isFav(top.id);
    var alt = A.fmtDate(top.date) + " " + top.venueName;
    var behind = "";
    if (group.length >= 3) behind += layer(group[2], "deep");
    if (group.length >= 2) behind += layer(group[1], "mid");

    return '' +
      '<article class="stack' + (fav ? " is-fav" : "") + '" data-top="' + A.esc(top.id) + '"' +
        ' style="--tilt:' + tiltOf(top.id).toFixed(2) + 'deg">' +
        '<a class="stack-main" href="cheki.html?id=' + encodeURIComponent(top.id) + '" aria-label="' + A.esc(alt) + '，共 ' + group.length + ' 张">' +
          behind +
          '<span class="layer top">' +
            '<img src="' + (top.photo || Art.photo(top.id)) + '" alt="' + A.esc(alt) + '" width="600" height="800" loading="lazy" decoding="async">' +
            '<span class="cap"><span class="d">' + A.fmtDot(top.date) + '</span><span class="v">' + A.esc(top.venueShort) + '</span></span>' +
          '</span>' +
        '</a>' +
        '<span class="fav-dot" aria-hidden="true">♥</span>' +
        (group.some(function (c) { return c.special; }) ? '<span class="s-special">特</span>' : "") +
        (group.length > 1 ? '<span class="s-count">' + group.length + ' 张</span>' : "") +
        '<button class="zoom" type="button" data-group="' + A.esc(showId) + '" aria-label="预览这一场的 ' + group.length + ' 张">⤢</button>' +
      '</article>';
  }

  function monthMeta(shows) {
    var items = shows.reduce(function (n, s) { return n + s.items.length; }, 0);
    return shows.length + " 场 · " + items + " 张";
  }

  function monthTrips(key) {
    var list = A.tripsInMonth(key);
    return '<div class="month-trips">' + list.map(function (t) {
      return '<button class="trip-chip" type="button" data-trip="' + A.esc(t.id) + '" title="编辑这趟远征">' +
        '<span class="tr-d">' + A.fmtDot(t.from) + "–" + A.fmtDot(t.to) + '</span>' +
        '<span class="tr-l">' + A.esc(t.label) + '</span>' +
        '<span class="tr-n">' + A.tripDays(t) + ' 天</span>' +
        '</button>';
    }).join("") +
    '<button class="trip-add" type="button" data-add-trip="' + key + '">＋ 远征</button></div>';
  }

  function showCell(show, dup, multi) {
    return '<div class="show-cell">' +
      (multi ? '<p class="show-label' + (dup ? "" : " is-empty") + '">' + A.esc(show.event) + '</p>' : '') +
      stack(show.items, show.id) +
    '</div>';
  }

  function emptyState() {
    if (!A.cheki.length) {
      return '<div class="empty"><p>还没有任何记录。</p>' +
        (A.isEditor()
          ? '<p class="empty-sub">点右下角「＋ 添加拍立得」，从第一张开始。</p>'
          : '<p class="empty-sub">这里还没有公开的拍立得。</p>') +
        '</div>';
    }
    return '<div class="empty"><p>' + state.year + ' 年还没有留下拍立得。</p>' +
      '<button type="button" id="reset-filter">回到有记录的年份</button></div>';
  }

  function render() {
    var list = current();
    var groups = groupedByMonth(list);
    var allYear = yearList();

    countEl.textContent = "显示 " + list.length + " / 本年 " + allYear.length;
    renderHero();

    if (!list.length) {
      timeline.innerHTML = emptyState();
      var rb = document.getElementById("reset-filter");
      if (rb) rb.addEventListener("click", function () {
        state.filter = "all"; state.venue = "all"; state.year = maxY;
        document.querySelectorAll("#filter-chips .chip").forEach(function (b) {
          b.setAttribute("aria-pressed", b.dataset.filter === "all" ? "true" : "false");
        });
        venueSel.value = "all";
        render();
      });
      return;
    }

    timeline.innerHTML = groups.map(function (g) {
      var p = A.fmtMonth(g.key);
      return '' +
        '<section class="month">' +
          '<header class="month-head">' +
            '<span class="y">' + p.y + '</span>' +
            '<span class="m">' + p.m + '</span>' +
            '<p class="meta">' + monthMeta(g.shows) + '</p>' +
            monthTrips(g.key) +
          '</header>' +
          '<div class="wall">' + g.shows.map(function (s) {
            return showCell(s, g.perDate[s.date] > 1, g.multi);
          }).join("") + '</div>' +
        '</section>';
    }).join("");
  }

  /* ---------- 交互 ---------- */
  document.getElementById("filter-chips").addEventListener("click", function (e) {
    var btn = e.target.closest(".chip");
    if (!btn) return;
    state.filter = btn.dataset.filter;
    this.querySelectorAll(".chip").forEach(function (b) {
      b.setAttribute("aria-pressed", b === btn ? "true" : "false");
    });
    render();
  });

  venueSel.addEventListener("change", function () {
    state.venue = this.value;
    render();
  });

  document.getElementById("sort").addEventListener("change", function () {
    state.sort = this.value;
    render();
  });

  yearSwitch.addEventListener("click", function (e) {
    var b = e.target.closest("[data-year]");
    if (!b) return;
    var y = state.year + Number(b.dataset.year);
    if (y < lowY || y > highY) return;
    state.year = y;
    render();
  });

  document.getElementById("random-btn").addEventListener("click", function () {
    var list = current();
    if (!list.length) return;
    var pick = list[Math.floor(Math.random() * list.length)];
    lb.open(list, pick.id);
  });

  timeline.addEventListener("click", function (e) {
    var trip = e.target.closest("[data-trip]");
    if (trip) {
      e.preventDefault();
      if (window.Editor) window.Editor.openTrip(trip.dataset.trip);
      return;
    }
    var addTrip = e.target.closest("[data-add-trip]");
    if (addTrip) {
      e.preventDefault();
      if (window.Editor) window.Editor.openTrip(null, addTrip.dataset.addTrip);
      return;
    }
    var z = e.target.closest("[data-group]");
    if (!z) return;
    e.preventDefault();
    var group = current().filter(function (c) { return c.show === z.dataset.group; });
    if (group.length) lb.open(group, group[0].id);
  });

  document.addEventListener("favchange", function (e) {
    var stackEl = timeline.querySelector('[data-top="' + e.detail.id + '"]');
    if (stackEl) stackEl.classList.toggle("is-fav", e.detail.fav);
    if (state.filter === "fav" && !e.detail.fav) render();
  });

  var addBtn = document.getElementById("add-btn");
  if (addBtn) addBtn.addEventListener("click", function () {
    if (!A.isEditor()) { A.openGate(); return; }
    if (window.Editor) window.Editor.openAdd();
  });

  var exportBtn = document.getElementById("export-btn");
  if (exportBtn) exportBtn.addEventListener("click", function () {
    if (window.Store) window.Store.exportJSON();
  });

  render();
})();
