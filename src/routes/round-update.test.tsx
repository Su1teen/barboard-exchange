/**
 * Сценарий из прод-инцидента: Bud стоит 1550 ₸ / -30%, за раунд проходит
 * 10 продаж, бэкенд закрывает раунд и публикует 1750 ₸ / -20%. Табло обязано
 * показать новую цену по 30-секундному опросу, без перезагрузки страницы.
 */
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CurrentRoundResponse, NextRoundResponse, ProductsResponse } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  fetchCurrentRound: vi.fn(),
  fetchNextRound: vi.fn(),
  fetchProducts: vi.fn(),
}));

import { fetchCurrentRound, fetchNextRound, fetchProducts } from "@/lib/api";
import { POLL_INTERVAL_MS, useExchangeData } from "@/hooks/useExchangeData";
import { ProductCard } from "@/routes/index";

const mockedCurrent = vi.mocked(fetchCurrentRound);
const mockedNext = vi.mocked(fetchNextRound);
const mockedProducts = vi.mocked(fetchProducts);

const bud = (price: number, priceLevelPercent: number, previousPrice: number | null) => ({
  id: "bud",
  name: "Bud",
  category: "Бутылочное пиво",
  price,
  currency: "KZT",
  previousPrice,
  changePercent: previousPrice === null ? 0 : ((price - previousPrice) / previousPrice) * 100,
  isAvailable: true,
  originalPrice: 2190,
  minPrice: 1550,
  priceLevelPercent,
  discountPercent: Math.round(((2190 - price) / 2190) * 100),
});

const roundResponse = (
  roundKey: string,
  product: ReturnType<typeof bud>,
): CurrentRoundResponse => ({
  generatedAt: "2026-08-21T13:45:00.000Z",
  timezone: "Asia/Almaty",
  status: "ok",
  currentRound: {
    id: roundKey,
    roundKey,
    startsAt: "2026-08-21T13:45:00.000Z",
    endsAt: "2026-08-21T14:00:00.000Z",
    status: "PUBLISHED",
  },
  products: [product],
});

const nextRound: NextRoundResponse = {
  roundKey: "2026-08-21-19-00-Asia-Almaty",
  startsAt: "2026-08-21T14:00:00.000Z",
  endsAt: "2026-08-21T14:15:00.000Z",
  countdownSeconds: 120,
  intervalMinutes: 15,
  timezone: "Asia/Almaty",
};

const productsResponse = (product: ReturnType<typeof bud>): ProductsResponse => ({
  generatedAt: "2026-08-21T13:45:00.000Z",
  timezone: "Asia/Almaty",
  products: [product],
});

let mountCount = 0;

function Board() {
  const { data } = useExchangeData();
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      mountCount += 1;
    }
  }, []);
  return (
    <div>
      {(data?.products ?? []).map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

describe("обновление цены Bud по опросу публичного API", () => {
  beforeEach(() => {
    mountCount = 0;
    mockedCurrent.mockReset();
    mockedNext.mockReset();
    mockedProducts.mockReset();
    mockedNext.mockResolvedValue(nextRound);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("1550 ₸ / -30% → 1750 ₸ / -20% без перезагрузки страницы", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const before = bud(1550, -30, null);
    mockedCurrent.mockResolvedValue(roundResponse("2026-08-21-18-45-Asia-Almaty", before));
    mockedProducts.mockResolvedValue(productsResponse(before));

    render(<Board />);

    await waitFor(() => expect(screen.getByText("1 550 ₸")).toBeInTheDocument());
    expect(screen.getByTestId("price-level")).toHaveTextContent("Уровень -30%");
    expect(screen.getByText("обычная 2 190 ₸")).toBeInTheDocument();

    const after = bud(1750, -20, 1550);
    mockedCurrent.mockResolvedValue(roundResponse("2026-08-21-19-00-Asia-Almaty", after));
    mockedProducts.mockResolvedValue(productsResponse(after));

    await act(async () => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText("1 750 ₸")).toBeInTheDocument());
    expect(screen.getByTestId("price-level")).toHaveTextContent("Уровень -20%");
    // Старая цена уходит вместе с exit-анимацией карточки.
    await waitFor(() => expect(screen.queryByText("1 550 ₸")).not.toBeInTheDocument());
    // Никакой перезагрузки/перемонтирования: тот же экземпляр компонента.
    expect(mountCount).toBe(1);
  });

  it("минимальная цена из метаданных не подменяет актуальную цену API", async () => {
    const after = bud(1750, -20, 1550);
    mockedCurrent.mockResolvedValue(roundResponse("2026-08-21-19-00-Asia-Almaty", after));
    mockedProducts.mockResolvedValue(productsResponse(after));

    render(<Board />);

    await waitFor(() => expect(screen.getByText("1 750 ₸")).toBeInTheDocument());
    expect(screen.queryByText("Мин. цена")).not.toBeInTheDocument();
  });
});
