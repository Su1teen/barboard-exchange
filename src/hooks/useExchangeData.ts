import { useCallback, useEffect, useRef, useState } from "react";

import {
  ApiError,
  type CurrentRound,
  type CurrentRoundResponse,
  type CurrentRoundStatus,
  type NextRoundResponse,
  type PublicProduct,
  fetchCurrentRound,
  fetchNextRound,
  fetchProducts,
} from "@/lib/api";

/** Polling interval for background refreshes (30 seconds). */
export const POLL_INTERVAL_MS = 30_000;

export type ExchangeData = {
  round: CurrentRound | null;
  roundStatus: CurrentRoundStatus;
  products: PublicProduct[];
  nextRound: NextRoundResponse | null;
  /** `generatedAt` from the backend (ISO string), null until first success. */
  generatedAt: string | null;
};

export type ExchangeState = {
  data: ExchangeData | null;
  /** True only during the very first load (no data yet). */
  isLoading: boolean;
  /** True during background refreshes (data already present). */
  isRefreshing: boolean;
  /** Human-readable error message when there is no data to show. */
  error: string | null;
  /** True when we have data but the last refresh failed (data is stale). */
  isStale: boolean;
  /** Epoch ms of the last successful refresh. */
  lastUpdatedAt: number | null;
  retry: () => void;
};

const INITIAL_STATE: Omit<ExchangeState, "retry"> = {
  data: null,
  isLoading: true,
  isRefreshing: false,
  error: null,
  isStale: false,
  lastUpdatedAt: null,
};

function messageFrom(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return "Не удалось связаться с биржей. Проверьте подключение.";
    }
    return `Ошибка биржи (${error.status}). Повторите попытку позже.`;
  }
  return "Не удалось получить данные биржи.";
}

/**
 * Combines the three public endpoints into a single view model.
 *
 * `rounds/current` is the source of truth for the active round + live prices.
 * When no round is published yet, `products` is used to still show the bar's
 * exchange menu (prices pending). `rounds/next` feeds the countdown.
 */
function buildData(
  current: CurrentRoundResponse,
  next: NextRoundResponse | null,
  productsFallback: PublicProduct[],
): ExchangeData {
  const products = current.products.length > 0 ? current.products : productsFallback;

  return {
    round: current.currentRound,
    roundStatus: current.status,
    products,
    nextRound: next,
    generatedAt: current.generatedAt,
  };
}

export function useExchangeData(): ExchangeState {
  const [state, setState] = useState<Omit<ExchangeState, "retry">>(INITIAL_STATE);

  // Guards against concurrent fetches and out-of-order responses, and keeps the
  // polling to a single timer instance.
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const retryTokenRef = useRef(0);

  const load = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const token = ++retryTokenRef.current;

    setState((prev) => ({
      ...prev,
      isLoading: prev.data === null,
      isRefreshing: prev.data !== null,
      // Clear a previous error only once we successfully load; keep stale flag
      // until then so the UI can still show "данные не обновлены".
    }));

    try {
      const [current, next, products] = await Promise.all([
        fetchCurrentRound(),
        fetchNextRound().catch(() => null),
        fetchProducts().catch(() => ({
          generatedAt: "",
          timezone: "",
          products: [] as PublicProduct[],
        })),
      ]);

      if (!mountedRef.current || token !== retryTokenRef.current) return;

      const data = buildData(current, next, products.products);
      setState({
        data,
        isLoading: false,
        isRefreshing: false,
        error: null,
        isStale: false,
        lastUpdatedAt: Date.now(),
      });
    } catch (error) {
      if (!mountedRef.current || token !== retryTokenRef.current) return;
      setState((prev) => ({
        data: prev.data,
        isLoading: false,
        isRefreshing: false,
        error: prev.data ? null : messageFrom(error),
        isStale: prev.data !== null,
        lastUpdatedAt: prev.lastUpdatedAt,
      }));
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const retry = useCallback(() => {
    void load();
  }, [load]);

  useEffect(() => {
    mountedRef.current = true;
    void load();

    const id = setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(id);
      // Allow a subsequent mount to start a fresh load immediately.
      inFlightRef.current = false;
    };
  }, [load]);

  return { ...state, retry };
}
