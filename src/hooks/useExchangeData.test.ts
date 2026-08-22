import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POLL_INTERVAL_MS, useExchangeData } from "@/hooks/useExchangeData";
import type { CurrentRoundResponse, NextRoundResponse, ProductsResponse } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    endpoint: string;
    constructor(message: string, status: number, endpoint: string) {
      super(message);
      this.status = status;
      this.endpoint = endpoint;
    }
  },
  fetchCurrentRound: vi.fn(),
  fetchNextRound: vi.fn(),
  fetchProducts: vi.fn(),
}));

import { fetchCurrentRound, fetchNextRound, fetchProducts } from "@/lib/api";

const mockedCurrent = vi.mocked(fetchCurrentRound);
const mockedNext = vi.mocked(fetchNextRound);
const mockedProducts = vi.mocked(fetchProducts);

const makeProduct = (
  overrides: Partial<{
    id: string;
    name: string;
    category: string;
    price: number;
    previousPrice: number | null;
    changePercent: number;
    isAvailable: boolean;
  }>,
) => ({
  id: "p1",
  name: "Gin Tonic",
  category: "Коктейли",
  price: 3290,
  currency: "KZT",
  previousPrice: 3000,
  changePercent: 9.7,
  isAvailable: true,
  ...overrides,
});

const round = (
  products: ReturnType<typeof makeProduct>[],
  status: "ok" | "no_published_round" = "ok",
): CurrentRoundResponse => ({
  generatedAt: "2026-08-21T13:45:00.000Z",
  timezone: "Asia/Almaty",
  status,
  currentRound:
    status === "ok"
      ? {
          id: "r1",
          roundKey: "2026-08-21-18-45-Asia-Almaty",
          startsAt: "2026-08-21T13:45:00.000Z",
          endsAt: "2026-08-21T14:00:00.000Z",
          status: "PUBLISHED",
        }
      : null,
  products,
});

const next: NextRoundResponse = {
  roundKey: "2026-08-21-19-00-Asia-Almaty",
  startsAt: "2026-08-21T14:00:00.000Z",
  endsAt: "2026-08-21T14:15:00.000Z",
  countdownSeconds: 120,
  intervalMinutes: 15,
  timezone: "Asia/Almaty",
};

const productsPayload = (products: ReturnType<typeof makeProduct>[]): ProductsResponse => ({
  generatedAt: "2026-08-21T13:45:00.000Z",
  timezone: "Asia/Almaty",
  products,
});

function setResponses(
  current: CurrentRoundResponse,
  nextResp: NextRoundResponse = next,
  productsResp: ProductsResponse = productsPayload(current.products),
) {
  mockedCurrent.mockResolvedValue(current);
  mockedNext.mockResolvedValue(nextResp);
  mockedProducts.mockResolvedValue(productsResp);
}

async function flushInitial() {
  // Flush the microtask chain from the synchronous `load()` call in the effect.
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useExchangeData", () => {
  beforeEach(() => {
    mockedCurrent.mockReset();
    mockedNext.mockReset();
    mockedProducts.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads a successful API response", async () => {
    setResponses(round([makeProduct({})]));
    const { result } = renderHook(() => useExchangeData());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.data?.products).toHaveLength(1);
    expect(result.current.data?.round?.roundKey).toBe("2026-08-21-18-45-Asia-Almaty");
    expect(result.current.data?.nextRound?.countdownSeconds).toBe(120);
    expect(result.current.lastUpdatedAt).not.toBeNull();
  });

  it("surfaces an error state when the primary endpoint fails", async () => {
    mockedCurrent.mockRejectedValue(new Error("Network"));
    mockedNext.mockResolvedValue(next);
    mockedProducts.mockResolvedValue(productsPayload([]));

    const { result } = renderHook(() => useExchangeData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).not.toBeNull();
  });

  it("reports empty products when no round is published and menu is empty", async () => {
    setResponses(round([], "no_published_round"), next, productsPayload([]));

    const { result } = renderHook(() => useExchangeData());

    await waitFor(() => expect(result.current.data).not.toBeNull());

    expect(result.current.data?.products).toHaveLength(0);
    expect(result.current.data?.roundStatus).toBe("no_published_round");
  });

  it("exposes a price increase via positive changePercent", async () => {
    setResponses(round([makeProduct({ changePercent: 12.4, price: 3370, previousPrice: 3000 })]));
    const { result } = renderHook(() => useExchangeData());

    await waitFor(() => expect(result.current.data).not.toBeNull());

    const product = result.current.data?.products[0];
    expect(product?.changePercent).toBeGreaterThan(0);
    expect(product?.price).toBeGreaterThan(product?.previousPrice ?? 0);
  });

  it("exposes a price decrease via negative changePercent", async () => {
    setResponses(round([makeProduct({ changePercent: -7.1, price: 2790, previousPrice: 3000 })]));
    const { result } = renderHook(() => useExchangeData());

    await waitFor(() => expect(result.current.data).not.toBeNull());

    const product = result.current.data?.products[0];
    expect(product?.changePercent).toBeLessThan(0);
    expect(product?.price).toBeLessThan(product?.previousPrice ?? Infinity);
  });

  it("marks data as stale when a refresh fails after a successful load", async () => {
    setResponses(round([makeProduct({})]));
    const { result } = renderHook(() => useExchangeData());

    await waitFor(() => expect(result.current.isStale).toBe(false));

    // Next poll fails.
    mockedCurrent.mockRejectedValueOnce(new Error("boom"));

    // Trigger a refresh via retry (deterministic, no fake timers needed).
    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.isStale).toBe(true));

    // Previous data is retained, no hard error shown.
    expect(result.current.data?.products).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("retry triggers a fresh load after an error", async () => {
    mockedCurrent.mockRejectedValueOnce(new Error("first fail"));
    mockedNext.mockResolvedValue(next);
    mockedProducts.mockResolvedValue(productsPayload([]));

    const { result } = renderHook(() => useExchangeData());

    await waitFor(() => expect(result.current.error).not.toBeNull());

    // Subsequent call succeeds.
    mockedCurrent.mockResolvedValue(round([makeProduct({})]));

    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.data?.products).toHaveLength(1));

    expect(result.current.error).toBeNull();
  });

  // ── Timing-sensitive tests (fake timers) ──────────────────────────────────

  it("polls on the 30s interval", async () => {
    vi.useFakeTimers();
    setResponses(round([makeProduct({})]));
    const { result } = renderHook(() => useExchangeData());

    await flushInitial();
    expect(mockedCurrent).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
    expect(mockedCurrent).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
    expect(mockedCurrent).toHaveBeenCalledTimes(3);

    expect(result.current.data?.products).toHaveLength(1);
  });

  it("cleans up the polling timer on unmount (no further fetches)", async () => {
    vi.useFakeTimers();
    setResponses(round([makeProduct({})]));
    const { unmount } = renderHook(() => useExchangeData());

    await flushInitial();
    expect(mockedCurrent).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    });

    // No additional fetches after unmount.
    expect(mockedCurrent).toHaveBeenCalledTimes(1);
  });

  // ── buildData merge (requirement: keep product.price when round override
  //    is absent) ────────────────────────────────────────────────────────────

  it("merges round products onto the menu, keeping menu price for products without a round override", async () => {
    const roundProduct = makeProduct({
      id: "p1",
      name: "Gin Tonic",
      price: 3370,
      previousPrice: 3000,
      changePercent: 12.4,
      isAvailable: true,
    });
    const menuOnly = makeProduct({
      id: "p2",
      name: "Jameson",
      price: 2000,
      previousPrice: null,
      changePercent: 0,
      isAvailable: false,
    });

    const current = round([roundProduct]);
    setResponses(current, next, productsPayload([roundProduct, menuOnly]));

    const { result } = renderHook(() => useExchangeData());

    await waitFor(() => expect(result.current.data?.products).toHaveLength(2));

    const products = result.current.data?.products ?? [];
    const p1 = products.find((p) => p.id === "p1");
    const p2 = products.find((p) => p.id === "p2");

    // Round override wins for p1.
    expect(p1?.price).toBe(3370);
    // Menu-only product keeps its own price (no round override).
    expect(p2?.price).toBe(2000);
    expect(p2?.previousPrice).toBeNull();
    expect(p2?.isAvailable).toBe(false);
  });

  it("falls back to the menu products when the round has no products", async () => {
    const menu = makeProduct({
      id: "p2",
      name: "Jameson",
      price: 2000,
      previousPrice: null,
      changePercent: 0,
      isAvailable: false,
    });
    setResponses(round([], "no_published_round"), next, productsPayload([menu]));

    const { result } = renderHook(() => useExchangeData());

    await waitFor(() => expect(result.current.data?.products).toHaveLength(1));

    const product = result.current.data?.products[0];
    expect(product?.price).toBe(2000);
    expect(product?.isAvailable).toBe(false);
  });
});
