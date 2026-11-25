/**
 * Legacy renderer for the TV board.
 *
 * Cheap set-top boxes ship browsers so old that the React/TanStack bundle
 * (ES modules, dynamic import, hydration) never starts. A watchdog in <head>
 * (see src/lib/legacy-watchdog.ts) loads THIS file, built as one classic,
 * down-levelled IIFE script (vite.legacy.config.ts → public/legacy/legacy.js),
 * when the React app has not reported ready.
 *
 * It re-implements the board 1:1 with the same markup/CSS classes as
 * src/routes/index.tsx, reusing the shared formatting and product-metadata
 * helpers, and polls the same public API with the same merge rules as
 * src/hooks/useExchangeData.ts. Keep it plain ES5-style (var, functions, XHR).
 */

import type { PublicProduct } from "@/lib/api";
import { roundTo10 } from "@/lib/format";
import { resolveProductImage, resolveProductMeta } from "@/lib/products";

/* eslint-disable @typescript-eslint/no-explicit-any, no-var, prefer-const */

declare const __API_URL__: string;

const PAGE_MS = 10000;
const PAGE_SIZE = 4;
const POLL_MS = 30000;
const API_PREFIX = "/api/v1/public";

// ── Small helpers ──────────────────────────────────────────────────────────

function esc(s: unknown): string {
  return String(s === null || s === undefined ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

function hhmm(d: Date): string {
  return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}

function group(n: number): string {
  // Manual thousands grouping: Intl/toLocaleString("ru-RU") may be missing on
  // old browsers, and the board must always show the full price.
  var s = String(Math.abs(Math.round(n)));
  var out = "";
  while (s.length > 3) {
    out = " " + s.slice(-3) + out;
    s = s.slice(0, -3);
  }
  return (n < 0 ? "-" : "") + s + out;
}

function price(v: number): string {
  return group(roundTo10(v)) + " ₸";
}

function roundLabel(key: string | null | undefined): string {
  if (!key) return "—";
  var parts = key.split("-");
  for (var i = 0; i < parts.length; i++) {
    if (/^\d{2}$/.test(parts[i] as string) && parts[i + 1]) {
      return parts[i] + ":" + parts[i + 1];
    }
  }
  return key;
}

function countdownLabel(seconds: number | null): string {
  if (seconds === null) return "—";
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  return m + ":" + (s < 10 ? "0" + s : s);
}

// ── Icons (lucide paths, inlined) ──────────────────────────────────────────

var ICONS: Record<string, string> = {
  flame:
    '<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>',
  up: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  down: '<path d="m7 7 10 10"/><path d="M17 7v10H7"/>',
  minus: '<path d="M5 12h14"/>',
  sparkles:
    '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  refresh:
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  waves:
    '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  trendingDown: '<path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/>',
};

function icon(name: string, size: number, extra?: string, stroke?: number): string {
  return (
    '<svg class="ico ico--' +
    size +
    (extra ? " " + extra : "") +
    '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
    (stroke || 2.5) +
    '" stroke-linecap="round" stroke-linejoin="round">' +
    ICONS[name] +
    "</svg>"
  );
}

// ── State ──────────────────────────────────────────────────────────────────

type Data = {
  round: any;
  roundStatus: string;
  products: PublicProduct[];
  nextRound: any;
};

var state = {
  data: null as Data | null,
  isLoading: true,
  isRefreshing: false,
  error: null as string | null,
  isStale: false,
  lastUpdatedAt: null as number | null,
  pageIndex: 0,
};

// ── API ────────────────────────────────────────────────────────────────────

function apiBase(): string {
  const w = window as any;
  return typeof w.__API_URL__ === "string" && w.__API_URL__ ? w.__API_URL__ : __API_URL__;
}

// Same-origin proxy first (always reachable and trusted by the old browser:
// it is the origin that served this page), then the backend directly.
function bases(): string[] {
  const direct = apiBase();
  return direct ? ["", direct] : [""];
}

var lastNetworkDetail = "";

function getJson(path: string, cb: (err: number | null, body?: any) => void): void {
  var list = bases();
  var attempt = function (i: number): void {
    var base = list[i] as string;
    var xhr = new XMLHttpRequest();
    var finished = false;
    var fail = function (status: number): void {
      if (finished) return;
      finished = true;
      lastNetworkDetail = (base || "same-origin") + ": " + status;
      if (i + 1 < list.length) return attempt(i + 1);
      cb(status);
    };
    try {
      xhr.open("GET", base + API_PREFIX + path, true);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.timeout = 15000;
    } catch (e) {
      return fail(0);
    }
    xhr.onload = function () {
      if (xhr.status < 200 || xhr.status >= 300) return fail(xhr.status);
      try {
        var parsed = JSON.parse(xhr.responseText);
        finished = true;
        cb(null, parsed);
      } catch (e) {
        fail(xhr.status || 500);
      }
    };
    xhr.onerror = xhr.ontimeout = function () {
      fail(0);
    };
    try {
      xhr.send();
    } catch (e) {
      fail(0);
    }
  };
  attempt(0);
}

function buildData(current: any, next: any, fallback: PublicProduct[]): Data {
  var cur: PublicProduct[] = (current && current.products) || [];
  var products: PublicProduct[];
  if (cur.length === 0) products = fallback;
  else if (fallback.length === 0) products = cur;
  else {
    var seen: Record<string, boolean> = {};
    products = [];
    for (var i = 0; i < cur.length; i++) {
      products.push(cur[i] as PublicProduct);
      seen[(cur[i] as PublicProduct).id] = true;
    }
    for (var j = 0; j < fallback.length; j++) {
      if (!seen[(fallback[j] as PublicProduct).id]) products.push(fallback[j] as PublicProduct);
    }
  }
  return {
    round: current.currentRound,
    roundStatus: current.status,
    products: products,
    nextRound: next,
  };
}

var inFlight = false;

function load(): void {
  if (inFlight) return;
  inFlight = true;
  state.isLoading = state.data === null;
  state.isRefreshing = state.data !== null;
  renderAll();

  var current: any, next: any, products: any;
  var pending = 3;
  var currentErr: number | null = null;

  function done(): void {
    if (--pending > 0) return;
    inFlight = false;
    if (currentErr !== null || !current) {
      state.isLoading = false;
      state.isRefreshing = false;
      state.error = state.data
        ? null
        : currentErr === 0
          ? "Не удалось связаться с биржей. Проверьте подключение. (" + lastNetworkDetail + ")"
          : currentErr
            ? "Ошибка биржи (" + currentErr + "). Повторите попытку позже."
            : "Не удалось получить данные биржи.";
      state.isStale = state.data !== null;
    } else {
      state.data = buildData(current, next || null, (products && products.products) || []);
      state.isLoading = false;
      state.isRefreshing = false;
      state.error = null;
      state.isStale = false;
      state.lastUpdatedAt = Date.now();
    }
    renderAll();
  }

  getJson("/rounds/current", function (err, body) {
    if (err !== null) currentErr = err;
    else current = body;
    done();
  });
  getJson("/rounds/next", function (err, body) {
    next = err === null ? body : null;
    done();
  });
  getJson("/products", function (err, body) {
    products = err === null ? body : null;
    done();
  });
}

// ── Rendering ──────────────────────────────────────────────────────────────

function cardHtml(p: PublicProduct): string {
  var trend = p.changePercent > 0.05 ? "up" : p.changePercent < -0.05 ? "down" : "flat";
  var current = roundTo10(p.price);
  var previous =
    p.previousPrice === null || p.previousPrice === undefined ? null : roundTo10(p.previousPrice);
  var meta = resolveProductMeta(p);
  var originalPrice =
    p.originalPrice !== undefined ? p.originalPrice : meta ? meta.originalPrice : null;
  var minPrice = p.minPrice !== undefined ? p.minPrice : meta ? meta.minPrice : null;
  var level = typeof p.priceLevelPercent === "number" ? p.priceLevelPercent : null;
  var img = resolveProductImage(p);
  var isMin = minPrice !== null && p.price <= minPrice;
  var priceValid = typeof p.price === "number" && isFinite(p.price);

  var priceColor = trend === "down" ? "price--down" : trend === "up" ? "price--up" : "price--flat";
  var cardClass = "";
  if (p.changePercent < -4) cardClass = " product-card--drop";
  else if (p.changePercent > 4) cardClass = " product-card--spike";

  var badges = "";
  if (level !== null) {
    badges +=
      '<span class="badge product-level pill ' +
      (level > 0 ? "pill--bad" : "pill--good") +
      '" data-testid="price-level">Уровень ' +
      (level > 0 ? "+" : "") +
      level +
      "%</span>";
  }
  if (isMin) {
    badges += '<span class="badge pill pill--amber">' + icon("flame", 16) + "Мин. цена</span>";
  }

  return (
    '<article class="product-card' +
    cardClass +
    '"><div class="product-card__image"><img class="product-card__img" src="' +
    esc(img) +
    '" alt="' +
    esc(p.name) +
    '" onerror="this.style.visibility=\'hidden\'"></div>' +
    '<div class="product-card__content"><div class="product-card__identity"><p class="product-name">' +
    esc(p.name) +
    "</p>" +
    (p.category ? '<span class="product-category">' + esc(p.category) + "</span>" : "") +
    '</div><div class="product-card__price-row"><div class="product-card__prices">' +
    (priceValid
      ? '<span class="product-price ' +
        priceColor +
        " " +
        (previous !== null && current < previous ? "price-pop--down" : "price-pop--up") +
        '">' +
        esc(price(p.price)) +
        "</span>"
      : '<span class="product-price price--bad">Цена недоступна</span>') +
    (originalPrice !== null
      ? '<span class="product-original-price">обычная ' + esc(price(originalPrice)) + "</span>"
      : "") +
    '</div></div><div class="badges">' +
    badges +
    "</div></div></article>"
  );
}

function centered(iconName: string, title: string, subtitle?: string, withRetry?: boolean): string {
  return (
    '<div class="center-message">' +
    icon(iconName, 48, "center-message__icon", 2) +
    '<p class="center-message__title">' +
    esc(title) +
    "</p>" +
    (subtitle ? '<p class="center-message__subtitle">' + esc(subtitle) + "</p>" : "") +
    (withRetry
      ? '<button type="button" class="center-message__button" data-retry="1">' +
        icon("refresh", 20) +
        "Повторить запрос</button>"
      : "") +
    "</div>"
  );
}

var els: {
  viewport: HTMLElement;
  stage: HTMLElement;
  header: HTMLElement;
  banner: HTMLElement;
  content: HTMLElement;
  ticker: HTMLElement;
} | null = null;

var lastContentSig = "";
var lastTickerSig = "";
var lastBannerSig = "";

function roundOpen(): boolean {
  var d = state.data;
  return !!d && d.roundStatus === "ok" && d.round !== null && d.round !== undefined;
}

function countdownSeconds(): number | null {
  var next = state.data && state.data.nextRound;
  if (!next || !next.startsAt) return null;
  var t = new Date(next.startsAt).getTime();
  if (isNaN(t)) return null;
  return Math.max(0, Math.ceil((t - Date.now()) / 1000));
}

function renderHeader(): void {
  if (!els) return;
  var d = state.data;
  var open = roundOpen();
  var cd = countdownLabel(countdownSeconds());
  var endsAt = d && d.round && d.round.endsAt ? hhmm(new Date(d.round.endsAt)) : "—";
  var updated = state.lastUpdatedAt
    ? hhmm(new Date(state.lastUpdatedAt)) + ":" + pad2(new Date(state.lastUpdatedAt).getSeconds())
    : "—";
  var round = open
    ? '<span class="round-badge">' +
      icon("flame", 16, "ico--amber") +
      '<span class="round-badge__text">Раунд ' +
      esc(roundLabel(d && d.round ? d.round.roundKey : null)) +
      " · до " +
      esc(endsAt) +
      "</span></span>"
    : '<span class="round-badge">' +
      icon("clock", 16, "ico--dim") +
      '<span class="round-badge__text">След. раунд через ' +
      esc(cd) +
      "</span></span>";
  els.header.innerHTML =
    '<div class="exchange-header__brand"><h1 class="exchange-header__title">XOXO <span class="exchange-header__title-dim">Exchange</span></h1>' +
    '<span class="exchange-header__live">' +
    (state.isRefreshing ? icon("refresh", 12, "spin", 3) : "") +
    "Live</span></div>" +
    '<div class="exchange-header__meta"><span class="exchange-header__round">' +
    round +
    '</span><span class="exchange-header__updated">обн. ' +
    esc(updated) +
    '</span><span class="exchange-header__clock">' +
    esc(hhmm(new Date())) +
    "</span></div>";
}

function renderBanner(): void {
  if (!els) return;
  var sig = state.isStale ? "1" : "0";
  if (sig === lastBannerSig) return;
  lastBannerSig = sig;
  els.banner.style.display = state.isStale ? "flex" : "none";
  els.banner.innerHTML = state.isStale
    ? '<p class="stale-banner__text">Данные не обновлены — показаны последние полученные котировки.</p><button type="button" class="stale-banner__button" data-retry="1">' +
      icon("refresh", 16) +
      "Повторить</button>"
    : "";
}

function renderContent(): void {
  if (!els) return;
  var products = (state.data && state.data.products) || [];
  var totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  var pageIndex = Math.min(state.pageIndex, totalPages - 1);
  var html: string;
  var cd = countdownLabel(countdownSeconds());

  if (state.isLoading) {
    html = centered("refresh", "Загрузка биржи…", "Получаем живые котировки напитков");
  } else if (state.error && !state.data) {
    html = centered("trendingDown", "Биржа недоступна", state.error, true);
  } else if (products.length === 0) {
    html = centered(
      "clock",
      "Биржа скоро откроется",
      roundOpen() ? "Активные котировки появятся с началом раунда" : "Следующий раунд через " + cd,
    );
  } else {
    var visible = products.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);
    var dots = "";
    if (totalPages > 1) {
      dots = '<div class="page-dots__list">';
      for (var i = 0; i < totalPages; i++) {
        dots +=
          '<span class="page-dots__dot' +
          (i === pageIndex ? " page-dots__dot--active" : "") +
          '"></span>';
      }
      dots += "</div>";
    }
    var cards = "";
    for (var k = 0; k < visible.length; k++) cards += cardHtml(visible[k] as PublicProduct);
    html =
      '<div class="page fade-in"><div class="page-dots">' +
      dots +
      '</div><div class="cards-grid">' +
      cards +
      "</div></div>";
  }
  // Only touch the DOM when something changed, so animations are not restarted
  // by the clock tick.
  if (html === lastContentSig) return;
  lastContentSig = html;
  els.content.innerHTML = html;
}

function renderTicker(): void {
  if (!els) return;
  var products = (state.data && state.data.products) || [];
  var sorted = products.slice().sort(function (a, b) {
    return b.changePercent - a.changePercent;
  });
  var top = sorted[0];
  var bottom = sorted[sorted.length - 1];
  var line: { icon: string; content: string }[] = [];
  if (!roundOpen()) {
    line.push({
      icon: "clock",
      content:
        "БИРЖА СКОРО ОТКРОЕТСЯ — СЛЕДУЮЩИЙ РАУНД ЧЕРЕЗ " + countdownLabel(countdownSeconds()),
    });
  } else {
    line.push({ icon: "sparkles", content: "XOXO EXCHANGE — ЖИВЫЕ ЦЕНЫ БАРА" });
  }
  if (top && top.changePercent > 0) {
    line.push({
      icon: "up",
      content: top.name.toUpperCase() + " +" + top.changePercent.toFixed(1) + "% — РОСТ",
    });
  }
  if (bottom && bottom.changePercent < 0) {
    line.push({
      icon: "down",
      content: bottom.name.toUpperCase() + " " + bottom.changePercent.toFixed(1) + "% — ВЫГОДНО",
    });
  }
  if (line.length < 3) line.push({ icon: "waves", content: "СЛЕДИТЕ ЗА КОТИРОВКАМИ НА ЭКРАНЕ" });
  var all = line.concat(line, line);
  var html = '<div class="exchange-ticker__track">';
  for (var i = 0; i < all.length; i++) {
    var it = all[i] as { icon: string; content: string };
    html +=
      '<span class="exchange-ticker__item">' +
      icon(it.icon, 20, "ico--amber") +
      esc(it.content) +
      "</span>";
  }
  html += "</div>";
  // The countdown text changes every second while the exchange is closed; only
  // re-render (and restart the marquee) when the visible text really changed.
  if (html === lastTickerSig) return;
  lastTickerSig = html;
  els.ticker.innerHTML = html;
}

function renderAll(): void {
  if (!els) return;
  renderHeader();
  renderBanner();
  renderContent();
  renderTicker();
}

// ── Stage scaling (same math as TvStage) ───────────────────────────────────

function fitStage(): void {
  if (!els) return;
  var w = window.innerWidth;
  var h = window.innerHeight;
  var scale = Math.min(w / 1920, h / 1080);
  var ox = Math.max(0, (w - 1920 * scale) / 2);
  var oy = Math.max(0, (h - 1080 * scale) / 2);
  var t = "translate(" + ox + "px, " + oy + "px) scale(" + scale + ")";
  els.stage.style.transform = t;
  (els.stage.style as any).webkitTransform = t;
}

// ── Keep-awake: silent canvas video (same trick as the React app) ──────────

function startKeepAwake(): void {
  try {
    var nav: any = navigator;
    if (nav.wakeLock && nav.wakeLock.request) nav.wakeLock.request("screen").catch(function () {});
  } catch (e) {
    /* ignore */
  }
  try {
    var canvas: any = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    var ctx = canvas.getContext("2d");
    if (!ctx || typeof canvas.captureStream !== "function") return;
    var tick = 0;
    var paint = function () {
      tick = (tick + 1) % 2;
      ctx.fillStyle = tick ? "#000" : "#010101";
      ctx.fillRect(0, 0, 2, 2);
    };
    paint();
    setInterval(paint, 1000);
    var vid: any = document.createElement("video");
    vid.srcObject = canvas.captureStream(1);
    vid.muted = true;
    vid.loop = true;
    vid.setAttribute("playsinline", "");
    vid.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;opacity:0;pointer-events:none;z-index:-1;";
    document.body.appendChild(vid);
    var kick = function () {
      var p = vid.play();
      if (p && p.catch) p.catch(function () {});
    };
    kick();
    setInterval(kick, 30000);
  } catch (e) {
    /* ignore */
  }
}

// ── Boot ───────────────────────────────────────────────────────────────────

function start(): void {
  var w = window as any;
  if (w.__tvLegacyStarted) return;
  w.__tvLegacyStarted = true;

  // Hide the server-rendered (non-hydrated) board.
  var old = document.querySelectorAll(".tv-viewport");
  for (var i = 0; i < old.length; i++) (old[i] as HTMLElement).style.display = "none";

  var viewport = document.createElement("div");
  viewport.className = "tv-viewport";
  viewport.id = "tv-legacy";
  viewport.innerHTML =
    '<div class="tv-stage"><main class="main-layout"><div class="main-layout__glow"></div>' +
    '<header class="exchange-header"></header>' +
    '<div class="stale-banner fade-in" style="display:none"></div>' +
    '<section class="exchange-content"></section>' +
    '<div class="exchange-ticker"></div></main></div>';
  document.body.appendChild(viewport);

  var q = function (sel: string): HTMLElement {
    return viewport.querySelector(sel) as HTMLElement;
  };
  els = {
    viewport: viewport,
    stage: q(".tv-stage"),
    header: q(".exchange-header"),
    banner: q(".stale-banner"),
    content: q(".exchange-content"),
    ticker: q(".exchange-ticker"),
  };
  // The CSS fallback transform uses typed arithmetic old browsers lack; the
  // inline transform from fitStage() always wins.
  fitStage();
  window.addEventListener("resize", fitStage);

  viewport.addEventListener("click", function (e) {
    var t: any = e.target;
    while (t && t !== viewport) {
      if (t.getAttribute && t.getAttribute("data-retry")) return load();
      t = t.parentNode;
    }
  });

  renderAll();
  load();
  setInterval(load, POLL_MS);
  setInterval(function () {
    var len = (state.data && state.data.products.length) || 0;
    if (len === 0) return;
    var total = Math.max(1, Math.ceil(len / PAGE_SIZE));
    state.pageIndex = (state.pageIndex + 1) % total;
    renderContent();
  }, PAGE_MS);
  setInterval(function () {
    renderHeader();
    renderTicker();
    if (!state.data || state.data.products.length === 0) renderContent();
  }, 1000);
  startKeepAwake();

  // If the modern app finally becomes ready, hand the screen back to it.
  var handBack = setInterval(function () {
    if (!w.__tvReady) return;
    clearInterval(handBack);
    if (viewport.parentNode) viewport.parentNode.removeChild(viewport);
    for (var j = 0; j < old.length; j++) (old[j] as HTMLElement).style.display = "";
    w.__tvLegacyStarted = false;
  }, 2000);
}

if (document.body) start();
else document.addEventListener("DOMContentLoaded", start);
