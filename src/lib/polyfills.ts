/**
 * Tiny runtime polyfills for very old browsers (cheap set-top boxes with
 * ancient Chromium/WebView builds). Syntax is down-levelled by the build
 * target; this file only covers a few newer runtime APIs that the app or its
 * dependencies may touch. Every block is a no-op in modern browsers.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const g: any = typeof globalThis !== "undefined" ? globalThis : (self as any);

if (typeof g.globalThis === "undefined") g.globalThis = g;

if (typeof g.queueMicrotask !== "function") {
  g.queueMicrotask = (cb: () => void) => {
    Promise.resolve().then(cb);
  };
}

if (!Object.fromEntries) {
  (Object as any).fromEntries = (entries: Iterable<[PropertyKey, unknown]>) => {
    const out: Record<PropertyKey, unknown> = {};
    for (const [k, v] of entries) out[k as any] = v;
    return out;
  };
}

if (!(Object as any).hasOwn) {
  (Object as any).hasOwn = (obj: object, key: PropertyKey) =>
    Object.prototype.hasOwnProperty.call(obj, key);
}

if (!Array.prototype.flat) {
  Object.defineProperty(Array.prototype, "flat", {
    configurable: true,
    writable: true,
    value: function flat(this: unknown[], depth = 1): unknown[] {
      const walk = (arr: unknown[], d: number): unknown[] =>
        arr.reduce<unknown[]>(
          (acc, item) => acc.concat(Array.isArray(item) && d > 0 ? walk(item, d - 1) : [item]),
          [],
        );
      return walk(this, depth);
    },
  });
}

if (!Array.prototype.flatMap) {
  Object.defineProperty(Array.prototype, "flatMap", {
    configurable: true,
    writable: true,
    value: function flatMap(this: unknown[], fn: (v: unknown, i: number, a: unknown[]) => unknown) {
      return this.map(fn).reduce<unknown[]>((acc, item) => acc.concat(item as any), []);
    },
  });
}

if (!(Array.prototype as any).at) {
  Object.defineProperty(Array.prototype, "at", {
    configurable: true,
    writable: true,
    value: function at(this: unknown[], index: number) {
      const i = Math.trunc(index) || 0;
      return this[i < 0 ? this.length + i : i];
    },
  });
}

if (!(String.prototype as any).replaceAll) {
  Object.defineProperty(String.prototype, "replaceAll", {
    configurable: true,
    writable: true,
    value: function replaceAll(this: string, search: string | RegExp, replacement: any) {
      if (search instanceof RegExp) return this.replace(search, replacement);
      return this.split(search).join(replacement);
    },
  });
}

if (!(Promise as any).allSettled) {
  (Promise as any).allSettled = (promises: Iterable<unknown>) =>
    Promise.all(
      Array.from(promises, (p) =>
        Promise.resolve(p).then(
          (value) => ({ status: "fulfilled", value }),
          (reason) => ({ status: "rejected", reason }),
        ),
      ),
    );
}

export {};
