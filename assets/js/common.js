/* ------------------------------------------------------------------
 * 公共逻辑：数据索引、格式化、收藏、主题、灯箱
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  var A = window.ARCHIVE;
  var venues = A.venues;
  var showById = {};
  A.shows.forEach(function (s) { showById[s.id] = s; });

  var cheki = A.cheki.map(function (c) {
    var s = showById[c.show] || {};
    return Object.assign({}, c, {
      showData: s,
      date: s.date || "",
      venueKey: s.venue || "",
      event: s.event || "",
      venueName: (venues[s.venue] || {}).name || "",
      venueShort: (venues[s.venue] || {}).short || "",
      venueArea: (venues[s.venue] || {}).area || "",
      eventType: s.type || ""
    });
  });
  cheki.sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });
  cheki.forEach(function (c, i) { c.no = i + 1; });

  var chekiById = {};
  cheki.forEach(function (c) { chekiById[c.id] = c; });

  /* ---------- 远征 ---------- */
  var trips = (A.trips || []).slice().sort(function (a, b) { return a.from < b.from ? -1 : 1; });

  function tripTotal(t) {
    var c = (t && t.costs) || {};
    return Number(c.transport || 0) + Number(c.lodging || 0) + Number(c.food || 0) + Number(c.other || 0);
  }

  function tripDays(t) {
    if (!t) return 0;
    return Math.round((parseDate(t.to) - parseDate(t.from)) / 86400000) + 1;
  }

  function tripForDate(iso) {
    for (var i = 0; i < trips.length; i++) {
      if (trips[i].from <= iso && iso <= trips[i].to) return trips[i];
    }
    return null;
  }

  function tripsInMonth(key) {
    return trips.filter(function (t) {
      return t.from.slice(0, 7) <= key && key <= t.to.slice(0, 7);
    });
  }

  function tripDaysInMonth(t, key) {
    var first = key + "-01";
    var lastDate = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0);
    var last = key + "-" + pad(lastDate.getDate());
    var a = t.from > first ? t.from : first;
    var b = t.to < last ? t.to : last;
    if (a > b) return 0;
    return Math.round((parseDate(b) - parseDate(a)) / 86400000) + 1;
  }

  /* ---------- 格式化 ---------- */
  function yen(n) {
    return "¥" + Number(n || 0).toLocaleString("ja-JP");
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function parseDate(iso) {
    var p = String(iso).split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function fmtDate(iso) {
    var p = String(iso).split("-");
    return p[0] + "." + p[1] + "." + p[2];
  }
  function fmtDot(iso) {
    var p = String(iso).split("-");
    return Number(p[1]) + "." + Number(p[2]);
  }
  function fmtMonth(key) {
    var p = key.split("-");
    return { y: p[0], m: p[1] };
  }
  var WEEK = ["日", "月", "火", "水", "木", "金", "土"];
  function weekday(iso) { return WEEK[parseDate(iso).getDay()]; }
  function dateDay(iso) { return parseDate(iso).getDay(); }

  function totalCost(show) {
    var c = show.costs || {};
    return Number(show.ticket || 0) + Number(c.drink || 0) + Number(c.cheki || 0) +
      Number(c.goods || 0) + Number(c.other || 0);
  }

  var COST_LABELS = {
    ticket: "门票",
    drink: "饮品",
    cheki: "拍立得",
    goods: "物贩",
    other: "其他"
  };

  function breakdown(show) {
    var rows = [{ key: "ticket", label: COST_LABELS.ticket, value: Number(show.ticket || 0) }];
    ["drink", "cheki", "goods", "other"].forEach(function (k) {
      var v = Number((show.costs || {})[k] || 0);
      if (v > 0) rows.push({ key: k, label: COST_LABELS[k], value: v });
    });
    return rows;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- 收藏 ---------- */
  var FAV_KEY = "archive-favs";
  function getFavs() {
    try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); }
    catch (e) { return new Set(); }
  }
  function saveFavs(s) {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(s))); } catch (e) {}
  }
  function isFav(id) { return getFavs().has(id); }
  function toggleFav(id) {
    var s = getFavs();
    if (s.has(id)) s.delete(id); else s.add(id);
    saveFavs(s);
    document.dispatchEvent(new CustomEvent("favchange", { detail: { id: id, fav: s.has(id) } }));
    return s.has(id);
  }

  /* ---------- 主题 ---------- */
  function initTheme() {
    var root = document.documentElement;
    var saved = null;
    try { saved = localStorage.getItem("archive-theme"); } catch (e) {}
    if (saved) root.dataset.theme = saved;
    var btns = document.querySelectorAll("[data-theme-toggle]");
    function sync() {
      var dark = root.dataset.theme === "dark" ||
        (!root.dataset.theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
      btns.forEach(function (b) {
        b.setAttribute("aria-label", dark ? "切换到浅色" : "切换到深色");
        b.textContent = dark ? "☀" : "☾";
      });
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var dark = root.dataset.theme === "dark" ||
          (!root.dataset.theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
        root.dataset.theme = dark ? "light" : "dark";
        try { localStorage.setItem("archive-theme", root.dataset.theme); } catch (e) {}
        sync();
      });
    });
    sync();
  }

  /* ---------- 灯箱 ---------- */
  function Lightbox() {
    var self = this;
    var el = document.createElement("div");
    el.className = "lb";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "拍立得预览");
    el.hidden = true;
    el.innerHTML =
      '<button class="lb-close" aria-label="关闭预览">×</button>' +
      '<button class="lb-nav lb-prev" aria-label="上一张">←</button>' +
      '<div class="lb-stage"><img alt=""></div>' +
      '<button class="lb-nav lb-next" aria-label="下一张">→</button>' +
      '<aside class="lb-side">' +
      '<p class="lb-count"></p>' +
      '<p class="lb-date"></p>' +
      '<h2 class="lb-event"></h2>' +
      '<p class="lb-sub"></p>' +
      '<p class="lb-msg"></p>' +
      '<div class="lb-actions">' +
      '<button class="lb-fav" type="button"></button>' +
      '<a class="lb-link" href="#">查看详情 →</a>' +
      '</div>' +
      '</aside>';

    document.body.appendChild(el);
    this.el = el;
    this.img = el.querySelector(".lb-stage img");
    this.ids = [];
    this.index = 0;
    this.lastFocus = null;

    el.querySelector(".lb-close").addEventListener("click", function () { self.close(); });
    el.querySelector(".lb-prev").addEventListener("click", function () { self.go(-1); });
    el.querySelector(".lb-next").addEventListener("click", function () { self.go(1); });
    el.querySelector(".lb-fav").addEventListener("click", function () {
      var c = chekiById[self.ids[self.index]];
      if (c) { toggleFav(c.id); self.renderFav(); }
    });
    el.addEventListener("click", function (e) { if (e.target === el) self.close(); });

    document.addEventListener("keydown", function (e) {
      if (el.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); self.close(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); self.go(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); self.go(1); }
      else if (e.key === "Tab") { self.trap(e); }
    });
  }

  Lightbox.prototype.trap = function (e) {
    var f = this.el.querySelectorAll("button, a[href]");
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  Lightbox.prototype.open = function (list, id) {
    this.ids = list.map(function (c) { return c.id; });
    var i = this.ids.indexOf(id);
    this.index = i < 0 ? 0 : i;
    this.lastFocus = document.activeElement;
    this.el.hidden = false;
    document.body.classList.add("is-locked");
    this.render();
    this.el.querySelector(".lb-close").focus();
  };

  Lightbox.prototype.close = function () {
    this.el.hidden = true;
    document.body.classList.remove("is-locked");
    if (this.lastFocus && this.lastFocus.focus) this.lastFocus.focus();
  };

  Lightbox.prototype.go = function (d) {
    if (!this.ids.length) return;
    this.index = (this.index + d + this.ids.length) % this.ids.length;
    this.render();
  };

  Lightbox.prototype.renderFav = function () {
    var c = chekiById[this.ids[this.index]];
    var btn = this.el.querySelector(".lb-fav");
    var fav = c ? isFav(c.id) : false;
    btn.textContent = fav ? "♥ 已收藏" : "♡ 收藏";
    btn.classList.toggle("is-on", fav);
    btn.setAttribute("aria-pressed", fav ? "true" : "false");
  };

  Lightbox.prototype.render = function () {
    if (!this.ids.length) return;
    var c = chekiById[this.ids[this.index]];
    if (!c) return;
    var img = this.img;
    img.src = c.photo || Art.photo(c.id);
    img.alt = fmtDate(c.date) + " " + c.venueName + " " + c.costume;

    this.el.querySelector(".lb-count").textContent = (this.index + 1) + " / " + this.ids.length;
    this.el.querySelector(".lb-date").textContent = fmtDate(c.date) + "（" + weekday(c.date) + "）";
    this.el.querySelector(".lb-event").textContent = c.event;
    this.el.querySelector(".lb-sub").textContent =
      c.venueName + " ・ " + c.costume + " ・ " + (c.signed ? "签名" : "无签名");
    var msg = this.el.querySelector(".lb-msg");
    msg.textContent = c.message ? "「" + c.message + "」" : "";
    msg.hidden = !c.message;
    var link = this.el.querySelector(".lb-link");
    link.href = "cheki.html?id=" + encodeURIComponent(c.id);
    this.renderFav();
  };

  /* ---------- 页头 ---------- */
  function initHeader(active) {
    var site = A.site || {};
    var name = site.brand || "Personal Louvre";
    var sub = site.sub || "Cheki Archive";
    document.querySelectorAll(".brand-name").forEach(function (el) { el.textContent = name; });
    document.querySelectorAll(".brand-sub").forEach(function (el) { el.textContent = sub; });
    document.querySelectorAll("[data-site-note]").forEach(function (el) {
      if (site.note) el.textContent = site.note;
    });
    document.querySelectorAll(".nav a").forEach(function (a) {
      if (a.dataset.nav === active) a.classList.add("is-active");
    });
    var footYear = document.getElementById("foot-year");
    if (footYear) footYear.textContent = new Date().getFullYear();
    initTheme();

    if (window.Mode) window.Mode.init();
  }

  document.documentElement.dataset.mode = window.Mode ? window.Mode.readMode() : "viewer";

  window.Archive = {
    group: A.group,
    member: A.member,
    site: A.site || {},
    venues: venues,
    shows: A.shows,
    cheki: cheki,
    trips: trips,
    chekiById: chekiById,
    showById: showById,
    yen: yen,
    fmtDate: fmtDate,
    fmtDot: fmtDot,
    fmtMonth: fmtMonth,
    weekday: weekday,
    dateDay: dateDay,
    totalCost: totalCost,
    breakdown: breakdown,
    tripTotal: tripTotal,
    tripDays: tripDays,
    tripForDate: tripForDate,
    tripsInMonth: tripsInMonth,
    tripDaysInMonth: tripDaysInMonth,
    esc: esc,
    isFav: isFav,
    toggleFav: toggleFav,
    getFavs: getFavs,
    initHeader: initHeader,
    isEditor: function () { return !!(window.Mode && window.Mode.isEditor()); },
    openGate: function () { if (window.Mode) window.Mode.openGate(); },
    setMode: function (m) { if (window.Mode) window.Mode.setMode(m); },
    Lightbox: Lightbox
  };
})();
