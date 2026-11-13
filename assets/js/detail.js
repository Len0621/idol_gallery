/* 详情页：同一天的拍立得作为一组，左图可以左右翻页 */
(function () {
  "use strict";

  var A = window.Archive;
  A.initHeader("home");

  var WEEK_FULL = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
  var lb = new A.Lightbox();

  var params = new URLSearchParams(location.search);
  var detail = document.getElementById("detail");
  var notfound = document.getElementById("notfound");

  var firstId = params.get("id");
  if (!firstId || !A.chekiById[firstId]) {
    detail.hidden = true;
    notfound.hidden = false;
    document.title = "没有找到 — 参戦記録";
    return;
  }

  var group = A.cheki.filter(function (c) { return c.date === A.chekiById[firstId].date; });
  var index = Math.max(0, group.findIndex(function (c) { return c.id === firstId; }));
  var side = params.get("side") === "back" ? "back" : "front";

  function frontSrc(c) { return c.photo || Art.photo(c.id); }
  function backSrc(c) {
    return c.back || Art.back(c.id, {
      dateText: A.fmtDate(c.date),
      message: c.message,
      nameText: c.nameIn ? A.member : ""
    });
  }

  function render() {
    var c = group[index];
    var show = c.showData;
    var venue = A.venues[c.venueKey] || {};
    var total = A.totalCost(show);
    var trip = A.tripForDate(c.date);

    var rows = A.breakdown(show);
    var maxVal = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));

    var expHtml = rows.map(function (r) {
      var w = Math.max(2, Math.round((r.value / maxVal) * 100));
      return '' +
        '<div class="exp-row">' +
          '<span class="lbl">' + A.esc(r.label) + '</span>' +
          '<span class="exp-track"><span class="exp-fill" style="width:' + w + '%"></span></span>' +
          '<span class="val">' + A.yen(r.value) + '</span>' +
        '</div>';
    }).join("");

    var setlist = (show.setlist || []).map(function (song, i) {
      return '<li><span class="no">' + (i + 1 < 10 ? "0" : "") + (i + 1) + '</span>' + A.esc(song) + '</li>';
    }).join("");

    var multi = group.length > 1;
    var thumbs = group.map(function (x, i) {
      return '<button class="g-thumb' + (i === index ? " is-active" : "") + '" type="button" data-i="' + i +
        '" aria-label="第 ' + (i + 1) + ' 张">' +
        '<img src="' + frontSrc(x) + '" alt="" loading="lazy">' +
        '</button>';
    }).join("");

    var fav = A.isFav(c.id);

    document.title = A.fmtDate(c.date) + " " + show.event + " — " + (A.site.title || "参戦記録");
    var crumb = document.getElementById("crumb-date");
    if (crumb) crumb.textContent = A.fmtDate(c.date) + " " + c.venueShort;

    detail.innerHTML = '' +
      '<div class="stage-col">' +
        '<div class="gallery">' +
          '<button class="stage-polaroid" type="button" id="stage-open" aria-label="放大这张拍立得">' +
            '<img id="stage-img" src="' + (side === "back" ? backSrc(c) : frontSrc(c)) + '" alt="' +
              A.esc(A.fmtDate(c.date) + " " + c.venueName + " " + c.costume) + '" width="600" height="800">' +
          '</button>' +
          (multi
            ? '<button class="g-arrow prev" type="button" id="g-prev" aria-label="上一张"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg></button>' +
              '<button class="g-arrow next" type="button" id="g-next" aria-label="下一张"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>' +
              '<span class="g-count">' + (index + 1) + " / " + group.length + '</span>'
            : "") +
        '</div>' +
        (multi ? '<div class="g-thumbs">' + thumbs + '</div>' : "") +
        '<div class="stage-bar">' +
          '<div class="seg" role="group" aria-label="照片正反面">' +
            '<button type="button" data-side="front" aria-pressed="' + (side === "front") + '">正面</button>' +
            '<button type="button" data-side="back" aria-pressed="' + (side === "back") + '">背面</button>' +
          '</div>' +
          '<div class="bar-right">' +
            '<button class="fav-btn' + (fav ? " is-on" : "") + '" type="button" id="fav-btn" aria-pressed="' + fav + '">' +
              (fav ? "♥ 已收藏" : "♡ 收藏") +
            '</button>' +
            '<button class="edit-btn" type="button" id="edit-btn">✎ 编辑</button>' +
          '</div>' +
        '</div>' +
        '<p class="g-note">' + (multi
          ? "这一天 " + group.length + " 张 · 左右箭头或缩略图翻看"
          : "拍立得 No. " + c.no + " / " + A.cheki.length) + '</p>' +
      '</div>' +

      '<div class="info-col">' +
        '<div class="date-line">' +
          '<span class="big">' + A.fmtDate(c.date) + '</span>' +
          '<span>' + WEEK_FULL[A.dateDay(c.date)] + '</span>' +
          '<span class="tag accent">' + A.esc(show.type) + '</span>' +
          (c.special ? '<span class="tag special">特殊</span>' : "") +
        '</div>' +
        '<h1 class="event-title">' + A.esc(show.event) + '</h1>' +
        '<p class="venue-line">' + A.esc(venue.name || "") +
          '<span class="area">' + A.esc(venue.area || "") + '</span>' +
        '</p>' +
        (trip
          ? '<p class="trip-line"><span class="tr-label">' + A.esc(trip.label) + '</span>' +
            A.fmtDot(trip.from) + "–" + A.fmtDot(trip.to) + ' · ' + A.tripDays(trip) + ' 天</p>'
          : "") +

        '<section class="section exp-block">' +
          '<h2 class="section-title">这一场的开销 <small>共 ' + rows.length + ' 项</small></h2>' +
          '<div class="exp">' + expHtml + '</div>' +
          '<div class="exp-total"><span class="lbl">合计</span><span class="num">' + A.yen(total) + '</span></div>' +
        '</section>' +

        (setlist
          ? '<section class="section">' +
              '<h2 class="section-title">曲目 <small>' + show.setlist.length + ' 曲</small></h2>' +
              '<ol class="setlist">' + setlist + '</ol>' +
            '</section>'
          : "") +

        (show.memo
          ? '<section class="section">' +
              '<h2 class="section-title">备忘</h2>' +
              '<p class="memo">' + A.esc(show.memo) + '</p>' +
            '</section>'
          : "") +
      '</div>';

    bind(c);
    history.replaceState(null, "", "cheki.html?id=" + encodeURIComponent(c.id));
  }

  function bind(c) {
    var img = document.getElementById("stage-img");
    var seg = detail.querySelector(".seg");

    seg.addEventListener("click", function (e) {
      var b = e.target.closest("[data-side]");
      if (!b) return;
      side = b.dataset.side;
      seg.querySelectorAll("button").forEach(function (x) {
        x.setAttribute("aria-pressed", x === b ? "true" : "false");
      });
      img.src = side === "back" ? backSrc(c) : frontSrc(c);
    });

    document.getElementById("stage-open").addEventListener("click", function () {
      lb.open(group, c.id);
    });

    var prev = document.getElementById("g-prev");
    var next = document.getElementById("g-next");
    if (prev) prev.addEventListener("click", function () { go(-1); });
    if (next) next.addEventListener("click", function () { go(1); });

    detail.querySelectorAll(".g-thumb").forEach(function (t) {
      t.addEventListener("click", function () { go(Number(t.dataset.i) - index); });
    });

    var favBtn = document.getElementById("fav-btn");
    function paintFav(fav) {
      favBtn.classList.toggle("is-on", fav);
      favBtn.setAttribute("aria-pressed", fav ? "true" : "false");
      favBtn.textContent = fav ? "♥ 已收藏" : "♡ 收藏";
    }
    favBtn.addEventListener("click", function () { paintFav(A.toggleFav(c.id)); });

    document.getElementById("edit-btn").addEventListener("click", function () {
      if (!A.isEditor()) { A.openGate(); return; }
      if (window.Editor) window.Editor.openEdit(c.id);
    });
  }

  function go(step) {
    var n = group.length;
    if (!n) return;
    index = (index + step + n) % n;
    side = "front";
    render();
  }

  document.addEventListener("keydown", function (e) {
    if (e.target.matches("input, select, textarea")) return;
    if (document.body.classList.contains("is-locked")) return;
    var ed = document.getElementById("editor");
    if (ed && ed.open) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
  });

  render();
})();
