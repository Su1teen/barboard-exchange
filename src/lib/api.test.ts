import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  API_URL,
  ApiError,
  fetchCurrentRound,
  fetchNextRound,
  fetchProducts,
  resolveApiUrl,
} from "@/lib/api";
import type { CurrentRoundResponse, NextRoundResponse, ProductsResponse } from "@/lib/api";

const okResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const product = {
  id: "p1",
  name: "Gin Tonic",
  category: "Коктейли",
  price: 3290,
  currency: "KZT",
  previousPrice: 3000,
  changePercent: 9.7,
  isAvailable: true,
};

const currentRound: CurrentRoundResponse = {
  generatedAt: "2026-08-21T13:45:00.000Z",
  timezone: "Asia/Almaty",
  status: "ok",
  currentRound: {
    id: "r1",
    roundKey: "2026-08-21-18-45-Asia-Almaty",
    startsAt: "2026-08-21T13:45:00.000Z",
    endsAt: "2026-08-21T14:00:00.000Z",
    status: "PUBLISHED",
  },
  products: [product],
};

const nextRound: NextRoundResponse = {
  roundKey: "2026-08-21-19-00-Asia-Almaty",
  startsAt: "2026-08-21T14:00:00.000Z",
  endsAt: "2026-08-21T14:15:00.000Z",
  countdownSeconds: 120,
  intervalMinutes: 15,
  timezone: "Asia/Almaty",
};

const productsResponse: ProductsResponse = {
  generatedAt: "2026-08-21T13:45:00.000Z",
  timezone: "Asia/Almaty",
  products: [product],
};

describe("api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses VITE_API_URL when set", () => {
    expect(resolveApiUrl({ VITE_API_URL: "https://example.test" })).toBe("https://example.test");
  });

  it("falls back to localhost when VITE_API_URL is absent", () => {
    expect(resolveApiUrl({})).toBe("http://localhost:3000");
  });

  it("API_URL is resolved from import.meta.env at module load", () => {
    expect(typeof API_URL).toBe("string");
    expect(API_URL.length).toBeGreaterThan(0);
  });

  it("fetchCurrentRound returns parsed payload on success", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () =>
      okResponse(currentRound),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchCurrentRound();
    expect(result.status).toBe("ok");
    expect(result.products).toHaveLength(1);
    expect(result.products[0]?.name).toBe("Gin Tonic");

    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe(`${API_URL}/api/v1/public/rounds/current`);
    expect(call?.[1]?.credentials).toBe("omit");
  });

  it("fetchNextRound hits the next-round endpoint", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () =>
      okResponse(nextRound),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchNextRound();
    expect(result.countdownSeconds).toBe(120);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${API_URL}/api/v1/public/rounds/next`);
  });

  it("fetchProducts hits the products endpoint", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () =>
      okResponse(productsResponse),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchProducts();
    expect(result.products[0]?.id).toBe("p1");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${API_URL}/api/v1/public/products`);
  });

  it("throws ApiError on non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 503 })),
    );
    await expect(fetchProducts()).rejects.toMatchObject({
      name: "ApiError",
      status: 503,
    });
  });

  it("throws ApiError with status 0 on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Failed to fetch");
      }),
    );
    await expect(fetchProducts()).rejects.toMatchObject({ status: 0 });
  });
});

describe("ApiError", () => {
  it("carries status and endpoint", () => {
    const err = new ApiError("boom", 500, "/products");
    expect(err.status).toBe(500);
    expect(err.endpoint).toBe("/products");
    expect(err.message).toBe("boom");
  });
});
