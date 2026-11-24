/**
 * Runtime polyfills for very old browsers (cheap set-top boxes with ancient
 * Chromium/WebView builds), shipped as a tiny ES5 inline <script> in <head>.
 *
 * It MUST run before the bundled app code: the router/hydration code calls
 * APIs such as String.prototype.replaceAll while the entry module is still
 * evaluating, so an import inside the bundle would be too late. Every block
 * is a no-op in modern browsers. Keep this string plain ES5.
 */
export const POLYFILL_SCRIPT = `
(function () {
  var g = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : window;
  function def(obj, name, fn) {
    if (!obj[name]) Object.defineProperty(obj, name, { configurable: true, writable: true, value: fn });
  }
  if (typeof g.globalThis === "undefined") g.globalThis = g;
  def(g, "queueMicrotask", function (cb) { Promise.resolve().then(cb); });
  def(Object, "fromEntries", function (entries) {
    var out = {};
    for (var i = 0, a = Array.prototype.slice.call(entries); i < a.length; i++) out[a[i][0]] = a[i][1];
    return out;
  });
  def(Object, "hasOwn", function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); });
  def(Object, "entries", function (o) { return Object.keys(o).map(function (k) { return [k, o[k]]; }); });
  def(Object, "values", function (o) { return Object.keys(o).map(function (k) { return o[k]; }); });
  def(Array.prototype, "flat", function flat(depth) {
    var d = depth === undefined ? 1 : depth;
    return this.reduce(function (acc, item) {
      return acc.concat(Array.isArray(item) && d > 0 ? flat.call(item, d - 1) : [item]);
    }, []);
  });
  def(Array.prototype, "flatMap", function (fn, thisArg) {
    return this.map(fn, thisArg).reduce(function (acc, item) { return acc.concat(item); }, []);
  });
  def(Array.prototype, "at", function (i) {
    var n = Math.trunc(i) || 0;
    return this[n < 0 ? this.length + n : n];
  });
  def(Array.prototype, "includes", function (v, from) { return this.indexOf(v, from) !== -1; });
  def(Array.prototype, "findLast", function (fn) {
    for (var i = this.length - 1; i >= 0; i--) if (fn(this[i], i, this)) return this[i];
  });
  def(Array.prototype, "findLastIndex", function (fn) {
    for (var i = this.length - 1; i >= 0; i--) if (fn(this[i], i, this)) return i;
    return -1;
  });
  def(String.prototype, "replaceAll", function (search, rep) {
    if (search instanceof RegExp) return this.replace(search, rep);
    return typeof rep === "function" ? this.split(search).join("\u0000").replace(/\u0000/g, rep) : this.split(search).join(rep);
  });
  def(String.prototype, "at", function (i) {
    var n = Math.trunc(i) || 0;
    return this.charAt(n < 0 ? this.length + n : n);
  });
  def(Promise, "allSettled", function (list) {
    return Promise.all(Array.prototype.map.call(list, function (p) {
      return Promise.resolve(p).then(
        function (value) { return { status: "fulfilled", value: value }; },
        function (reason) { return { status: "rejected", reason: reason }; }
      );
    }));
  });
  def(Promise, "withResolvers", function () {
    var resolve, reject;
    var promise = new Promise(function (res, rej) { resolve = res; reject = rej; });
    return { promise: promise, resolve: resolve, reject: reject };
  });
  def(g, "structuredClone", function (v) { return JSON.parse(JSON.stringify(v)); });
  if (typeof URL !== "undefined") def(URL, "canParse", function (u, b) { try { new URL(u, b); return true; } catch (e) { return false; } });
  if (typeof AbortSignal !== "undefined") def(AbortSignal, "timeout", function (ms) {
    var c = new AbortController();
    setTimeout(function () { c.abort(); }, ms);
    return c.signal;
  });
})();
`;

/**
 * Watchdog: if the React app has not reported ready (window.__tvReady, set in
 * the Index route's mount effect) a few seconds after load — the bundle failed
 * to parse/run on an old set-top browser — load the classic ES5 renderer that
 * is built into /legacy/legacy.js. Plain ES5; harmless on modern browsers.
 */
export const LEGACY_WATCHDOG_SCRIPT = `
(function () {
  setTimeout(function () {
    if (window.__tvReady) return;
    var s = document.createElement("script");
    s.src = "/legacy/legacy.js";
    (document.body || document.documentElement).appendChild(s);
  }, 5000);
})();
`;
