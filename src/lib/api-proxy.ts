/**
 * Same-origin proxy for the public exchange API.
 *
 * Why: the TV set-top box runs an ancient browser. Calling the backend
 * directly from it can fail for reasons the page cannot fix — a TLS
 * certificate chain / protocol version the old browser rejects, mixed content
 * (https page → http API), CORS quirks, a blocked foreign host. The board page
 * itself loads fine from this origin, so the server forwards the three public
 * read-only endpoints and the clients simply call their own origin first.
 *
 * Only GET/HEAD on a fixed whitelist of public paths is forwarded; nothing
 * else (no cookies, no auth headers, no arbitrary URLs) ever leaves the worker.
 */

import { API_URL } from "./api";

const ALLOWED_PATHS = new Set([
  "/api/v1/public/products",
  "/api/v1/public/rounds/current",
  "/api/v1/public/rounds/next",
]);

const UPSTREAM_TIMEOUT_MS = 15_000;

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "accept, content-type",
};

/** Returns a Response when the request targets the public API, else null. */
export async function proxyPublicApi(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  if (!ALLOWED_PATHS.has(path)) return null;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch(`${API_URL}${path}${url.search}`, {
      method: request.method,
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const body = await upstream.arrayBuffer();
    return new Response(request.method === "HEAD" ? null : body, {
      status: upstream.status,
      headers: {
        ...CORS_HEADERS,
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        // Live prices: never let a CDN or the TV browser serve stale data.
        "cache-control": "no-store",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "upstream_unavailable" }), {
      status: 502,
      headers: { ...CORS_HEADERS, "content-type": "application/json", "cache-control": "no-store" },
    });
  } finally {
    clearTimeout(timer);
  }
}
