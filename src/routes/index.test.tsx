import { readFileSync } from "node:fs";
import path from "node:path";

import { cleanup, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";

import type { PublicProduct } from "@/lib/api";
import { formatDiscount, formatPrice } from "@/lib/format";
import { PRODUCT_IMAGES } from "@/lib/products";

import { ProductCard, RoundBadge, TvStage } from "@/routes/index";

const makeProduct = (overrides: Partial<PublicProduct> = {}): PublicProduct => ({
  id: "p1",
  name: "Jameson",
  category: "Крепкий алкоголь",
  price: 1450,
  currency: "KZT",
  previousPrice: null,
  changePercent: 0,
  isAvailable: false,
  ...overrides,
});

afterEach(() => {
  cleanup();
});

// ── Price rendering ─────────────────────────────────────────────────────────

describe("ProductCard price mapping", () => {
  it("renders the current price for a normal product (price 1450)", () => {
    render(<ProductCard product={makeProduct({ price: 1450 })} />);
    expect(screen.getByText(formatPrice(1450))).toBeInTheDocument();
    // The "awaiting" placeholders must never appear when a price is present.
    expect(screen.queryByText("скоро")).not.toBeInTheDocument();
    expect(screen.queryByText("ожидание")).not.toBeInTheDocument();
  });

  it("treats price 0 as a valid price and renders it", () => {
    render(<ProductCard product={makeProduct({ price: 0 })} />);
    expect(screen.getByText(formatPrice(0))).toBeInTheDocument();
    expect(screen.queryByText("скоро")).not.toBeInTheDocument();
    expect(screen.queryByText("ожидание")).not.toBeInTheDocument();
  });

  it("renders the price when previousPrice is null", () => {
    render(<ProductCard product={makeProduct({ price: 1450, previousPrice: null })} />);
    expect(screen.getByText(formatPrice(1450))).toBeInTheDocument();
  });

  it("renders the price when changePercent is 0", () => {
    render(<ProductCard product={makeProduct({ price: 1450, changePercent: 0 })} />);
    expect(screen.getByText(formatPrice(1450))).toBeInTheDocument();
  });

  it("renders the price when isAvailable is false", () => {
    render(<ProductCard product={makeProduct({ price: 1450, isAvailable: false })} />);
    expect(screen.getByText(formatPrice(1450))).toBeInTheDocument();
    expect(screen.queryByText("скоро")).not.toBeInTheDocument();
    expect(screen.queryByText("ожидание")).not.toBeInTheDocument();
  });

  it("renders the product name and current price together", () => {
    render(<ProductCard product={makeProduct({ name: "Jameson", price: 1450 })} />);
    expect(screen.getByText("Jameson")).toBeInTheDocument();
    expect(screen.getByText(formatPrice(1450))).toBeInTheDocument();
  });

  it("renders the price for the exact production-shaped payload", () => {
    // Mirrors the documented production /api/v1/public/products item.
    const product: PublicProduct = {
      id: "abc",
      name: "Jameson",
      category: "Крепкий алкоголь",
      price: 2000,
      currency: "KZT",
      previousPrice: null,
      changePercent: 0,
      isAvailable: false,
    };
    render(<ProductCard product={product} />);
    expect(screen.getByText("Jameson")).toBeInTheDocument();
    expect(screen.getByText(formatPrice(2000))).toBeInTheDocument();
  });

  it("does not replace API price with minPrice", () => {
    // Jameson minPrice is 1590, but we set price to 2000 — the card must
    // show 2000, not 1590.
    render(<ProductCard product={makeProduct({ id: "jameson", name: "Jameson", price: 2000 })} />);
    expect(screen.getByText(formatPrice(2000))).toBeInTheDocument();
    expect(screen.queryByText(formatPrice(1590))).not.toBeInTheDocument();
  });

  it("shows controlled error for undefined/non-finite price", () => {
    const product = makeProduct({
      id: "jameson",
      name: "Jameson",
      price: undefined as unknown as number,
    });
    render(<ProductCard product={product} />);
    expect(screen.getByText("Цена недоступна")).toBeInTheDocument();
  });
});

// ── Image rendering ─────────────────────────────────────────────────────────

describe("ProductCard image rendering", () => {
  it("renders an img element with a valid src (Jameson)", () => {
    render(<ProductCard product={makeProduct({ id: "jameson", name: "Jameson" })} />);
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBeTruthy();
    expect(img.getAttribute("src")).toBe(PRODUCT_IMAGES["jameson"]);
    expect(img.getAttribute("alt")).toBe("Jameson");
  });

  it("renders a fallback image for products without a dedicated photo", () => {
    // Jack Daniels has no dedicated image → spirits fallback (whiskey.png).
    render(
      <ProductCard
        product={makeProduct({
          id: "jack-daniels",
          name: "Jack Daniels",
          category: "Крепкий алкоголь",
        })}
      />,
    );
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBeTruthy();
    // Should NOT be an empty string or broken URL.
    expect(img.getAttribute("src")!.length).toBeGreaterThan(0);
  });

  it("renders a cocktail fallback for Gin Tonic", () => {
    render(
      <ProductCard
        product={makeProduct({ id: "gin-tonic", name: "Gin Tonic", category: "Коктейли" })}
      />,
    );
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBeTruthy();
  });
});

// ── Discount rendering ──────────────────────────────────────────────────────

describe("ProductCard discount rendering", () => {
  it("shows discount badge for Jameson 2000 → 1590 (20.5%)", () => {
    render(<ProductCard product={makeProduct({ id: "jameson", name: "Jameson", price: 1590 })} />);
    // Jameson originalPrice = 2000, currentPrice = 1590 → discount 20.5%
    // The badge text is "Скидка −20.5%" — use a regex to match the discount value.
    expect(screen.getByText(/Скидка/)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(formatDiscount(20.5).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))),
    ).toBeInTheDocument();
    // Original price label is shown.
    expect(screen.getByText(/обычная/)).toBeInTheDocument();
  });

  it("shows discount badge for Absolut 1450 → 990 (31.7%)", () => {
    render(<ProductCard product={makeProduct({ id: "absolut", name: "Absolut", price: 990 })} />);
    expect(
      screen.getByText(new RegExp(formatDiscount(31.7).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))),
    ).toBeInTheDocument();
  });

  it("shows 0% when currentPrice equals originalPrice", () => {
    render(<ProductCard product={makeProduct({ id: "jameson", name: "Jameson", price: 2000 })} />);
    // Jameson originalPrice = 2000, currentPrice = 2000 → 0% discount.
    // The discount badge shows "0%" (from formatDiscount(0)).
    expect(screen.getByText(/^0%$/)).toBeInTheDocument();
  });

  it("shows markup badge when currentPrice > originalPrice", () => {
    render(<ProductCard product={makeProduct({ id: "jameson", name: "Jameson", price: 2500 })} />);
    // 2000 → 2500 = -25% discount = markup
    expect(screen.getByText(/Наценка/)).toBeInTheDocument();
  });

  it("discount is independent from changePercent — changePercent 0 still shows discount", () => {
    render(
      <ProductCard
        product={makeProduct({
          id: "jameson",
          name: "Jameson",
          price: 1590,
          changePercent: 0,
        })}
      />,
    );
    // changePercent is 0, but discount from original (2000 → 1590) is 20.5%.
    expect(
      screen.getByText(new RegExp(formatDiscount(20.5).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))),
    ).toBeInTheDocument();
  });
});

// ── Minimum price badge ─────────────────────────────────────────────────────

describe("ProductCard minimum price badge", () => {
  it("shows Минимальная цена badge when currentPrice === minPrice", () => {
    // Jameson minPrice = 1590.
    render(<ProductCard product={makeProduct({ id: "jameson", name: "Jameson", price: 1590 })} />);
    expect(screen.getByText("Мин. цена")).toBeInTheDocument();
  });

  it("shows Минимальная цена badge when currentPrice is below minPrice", () => {
    // Jameson minPrice = 1590, price = 1500 (below min).
    render(<ProductCard product={makeProduct({ id: "jameson", name: "Jameson", price: 1500 })} />);
    expect(screen.getByText("Мин. цена")).toBeInTheDocument();
  });

  it("does not show Минимальная цена badge when currentPrice > minPrice", () => {
    render(<ProductCard product={makeProduct({ id: "jameson", name: "Jameson", price: 2000 })} />);
    expect(screen.queryByText(/Минимальная цена/)).not.toBeInTheDocument();
  });
});

// ── Round change indicator ──────────────────────────────────────────────────

describe("ProductCard round change indicator", () => {
  it("shows Первый раунд when previousPrice is null and changePercent is 0", () => {
    render(
      <ProductCard
        product={makeProduct({
          id: "jameson",
          name: "Jameson",
          previousPrice: null,
          changePercent: 0,
        })}
      />,
    );
    expect(screen.getByText("Первый раунд")).toBeInTheDocument();
  });

  it("shows round change percentage when changePercent is non-zero", () => {
    render(
      <ProductCard
        product={makeProduct({
          id: "jameson",
          name: "Jameson",
          price: 1750,
          previousPrice: 1590,
          changePercent: 10.1,
        })}
      />,
    );
    expect(screen.getByText("+10.1%")).toBeInTheDocument();
  });

  it("shows 0% round change when changePercent is 0 but previousPrice exists", () => {
    render(
      <ProductCard
        product={makeProduct({
          id: "jameson",
          name: "Jameson",
          price: 1590,
          previousPrice: 1590,
          changePercent: 0,
        })}
      />,
    );
    // formatPercent(0) returns "0.0%" — the round-change badge shows this.
    expect(screen.getByText("0.0%")).toBeInTheDocument();
    expect(screen.queryByText("Первый раунд")).not.toBeInTheDocument();
  });
});

// ── TV layout contracts ──────────────────────────────────────────────────────

describe("Guest board TV layout", () => {
  it("renders exactly one compact round label", () => {
    render(
      <RoundBadge
        roundKey="2026-08-24-08-24-Asia-Almaty"
        roundOpen
        endsAt="2026-08-24T18:30:00+05:00"
        countdownLabel="—"
      />,
    );

    expect(screen.getByText(/Раунд 08:24 · до/)).toBeInTheDocument();
    expect(screen.queryByText(/ROUND 08:24/)).not.toBeInTheDocument();
    expect(screen.queryByText("Живые котировки")).not.toBeInTheDocument();
  });

  it("keeps long identity text in separate, constrained rows", () => {
    render(
      <ProductCard
        product={makeProduct({
          name: "Очень длинное локализованное название напитка для телевизионного экрана",
          category: "Категория с очень длинным локализованным описанием",
        })}
      />,
    );

    const card = document.querySelector(".product-card");
    expect(card).toBeInTheDocument();
    expect(card?.querySelector(".product-name")).toHaveClass("product-name");
    expect(card?.querySelector(".product-category")).toHaveClass("product-category");
    expect(card?.querySelector(".product-price")).toHaveClass("product-price");
  });

  it("uses a wrapping badge row for the minimum-price status", () => {
    render(<ProductCard product={makeProduct({ id: "jameson", price: 1590 })} />);
    const badges = document.querySelector(".badges");

    expect(badges).toHaveClass("badges");
    expect(screen.getByText("Мин. цена")).toBeInTheDocument();
  });
});

// ── Category display ────────────────────────────────────────────────────────

describe("ProductCard category display", () => {
  it("shows the category label from the API", () => {
    render(
      <ProductCard product={makeProduct({ name: "Jameson", category: "Крепкий алкоголь" })} />,
    );
    expect(screen.getByText("Крепкий алкоголь")).toBeInTheDocument();
  });
});

// ── TV stage scaling ─────────────────────────────────────────────────────────

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    writable: true,
    value: height,
  });
}

function stageTransform(el: HTMLElement): { x: number; y: number; scale: number } {
  const style = el.getAttribute("style") ?? "";
  const m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+)\)/.exec(style);
  expect(m, `expected a stage transform, got "${style}"`).not.toBeNull();
  return { x: Number(m![1]), y: Number(m![2]), scale: Number(m![3]) };
}

describe("TvStage", () => {
  const VIEWPORTS: [number, number][] = [
    [1920, 1080],
    [1366, 768],
    [1280, 720],
    [3840, 2160],
    // Typical Windows desktop at 125% scaling on a 1080p panel.
    [1536, 864],
  ];

  it.each(VIEWPORTS)("fits the 1920×1080 canvas into %i×%i", (w, h) => {
    setViewport(w, h);
    render(
      <TvStage>
        <div />
      </TvStage>,
    );
    const stage = screen.getByTestId("tv-stage");
    const { x, y, scale } = stageTransform(stage);

    const expectedScale = Math.min(w / 1920, h / 1080);
    expect(scale).toBeCloseTo(expectedScale, 6);
    // Scaled canvas never exceeds the viewport on either axis.
    expect(1920 * scale).toBeLessThanOrEqual(w + 0.5);
    expect(1080 * scale).toBeLessThanOrEqual(h + 0.5);
    // Letterbox offsets center the stage.
    expect(x).toBeCloseTo((w - 1920 * scale) / 2, 1);
    expect(y).toBeCloseTo((h - 1080 * scale) / 2, 1);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
  });

  it("keeps a 16:9 letterboxed stage on a 4:3 viewport", () => {
    setViewport(1024, 768);
    render(
      <TvStage>
        <div />
      </TvStage>,
    );
    const { x, y, scale } = stageTransform(screen.getByTestId("tv-stage"));
    expect(scale).toBeCloseTo(1024 / 1920, 6);
    expect(x).toBeCloseTo(0, 1);
    expect(y).toBeCloseTo(96, 1); // vertical letterbox
  });

  it("recomputes the transform on window resize", () => {
    setViewport(1920, 1080);
    render(
      <TvStage>
        <div />
      </TvStage>,
    );
    const stage = screen.getByTestId("tv-stage");
    expect(stageTransform(stage).scale).toBeCloseTo(1, 6);

    setViewport(1536, 864);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(stageTransform(stage).scale).toBeCloseTo(0.8, 6);
  });
});

// ── CSS regression contracts (financial values must never truncate) ──────────

const cssSource = readFileSync(path.resolve(process.cwd(), "src/styles.css"), "utf8").replace(
  /\/\*[^]*?\*\//g,
  "",
);

/** Concatenate all declaration blocks for a selector (e.g. ".product-price"). */
function cssRule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "g");
  return [...cssSource.matchAll(re)].map((m) => m[1]).join("\n");
}

describe("TV layout CSS contracts", () => {
  it("defines a fixed 1920×1080 stage", () => {
    const stage = cssRule(".tv-stage");
    expect(stage).toContain("width: 1920px");
    expect(stage).toContain("height: 1080px");
    expect(stage).toContain("transform-origin");
  });

  it("has no viewport media queries that could reshuffle the board", () => {
    // The composition is fixed inside the stage; the viewport only scales it.
    expect(cssSource).not.toMatch(/@media\s*\(/);
  });

  it("never truncates or shrinks the current price", () => {
    const price = cssRule(".product-price");
    expect(price).not.toContain("text-overflow");
    expect(price).not.toContain("overflow");
    expect(price).not.toMatch(/font-size:\s*clamp|vw|vh/);
    expect(price).toContain("white-space: nowrap");
    expect(price).toContain("tabular-nums");
  });

  it("never ellipsizes the prices column or the round-change badge", () => {
    const prices = cssRule(".product-card__prices");
    expect(prices).not.toContain("text-overflow");
    expect(prices).not.toContain("overflow");
    expect(prices).toContain("flex: none");

    // No wildcard ellipsis helper on price children.
    expect(cssSource).not.toMatch(/\.product-card__prices\s*>\s*\*/);

    const change = cssRule(".product-card__change");
    expect(change).not.toContain("text-overflow");
    const changeSpan = cssRule(".product-card__change > span");
    expect(changeSpan).not.toContain("text-overflow");
    expect(changeSpan).not.toContain("overflow");
  });

  it("keeps the original price fully visible", () => {
    const original = cssRule(".product-original-price");
    expect(original).not.toContain("text-overflow");
    expect(original).not.toContain("overflow");
    expect(original).toContain("white-space: nowrap");
  });
});

// ── Long / large financial data renders in full ─────────────────────────────

describe("ProductCard long data rendering", () => {
  it("renders a 5-digit price in full (12 990 ₸)", () => {
    render(
      <ProductCard
        product={makeProduct({
          id: "monkey-shoulder",
          name: "Monkey Shoulder",
          category: "Крепкий алкоголь",
          price: 12990,
          previousPrice: 11000,
          changePercent: 18.1,
        })}
      />,
    );
    const price = document.querySelector(".product-price");
    expect(price).toBeInTheDocument();
    expect(price!.textContent).toBe(formatPrice(12990));
    expect(screen.getByText("обычная 3 500 ₸")).toBeInTheDocument();
    // Price above the original menu price → markup badge, shown in full.
    expect(screen.getByText(/Наценка/)).toBeInTheDocument();
  });

  it("renders the full discount case (2 490 ₸ vs обычная 3 500 ₸ → −28.9%)", () => {
    render(
      <ProductCard
        product={makeProduct({
          id: "monkey-shoulder",
          name: "Monkey Shoulder",
          category: "Крепкий алкоголь",
          price: 2490,
          previousPrice: 3200,
          changePercent: -22.2,
        })}
      />,
    );
    expect(document.querySelector(".product-price")!.textContent).toBe(formatPrice(2490));
    expect(screen.getByText("обычная 3 500 ₸")).toBeInTheDocument();
    // 3500 → 2490 is a 28.857% discount — the badge must show it in full.
    expect(screen.getByText(/Скидка/)).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(
          formatDiscount(((3500 - 2490) / 3500) * 100).replace(/[-.*+?^${}()|[\]\\]/g, "\\$&"),
        ),
      ),
    ).toBeInTheDocument();
  });

  it("renders cocktail names and categories without breaking the card", () => {
    render(
      <ProductCard
        product={makeProduct({
          id: "red-bull-whiskey",
          name: "Red Bull Whiskey",
          category: "Коктейли",
          price: 2190,
          previousPrice: 3200,
          changePercent: -31.5,
        })}
      />,
    );
    expect(document.querySelector(".product-price")!.textContent).toBe(formatPrice(2190));
    expect(screen.getByText("обычная 3 200 ₸")).toBeInTheDocument();
    // "Мин. цена" — 2190 ≤ 2190 minPrice.
    expect(screen.getByText("Мин. цена")).toBeInTheDocument();
  });

  it("keeps the round-change badge outside the prices column", () => {
    render(
      <ProductCard
        product={makeProduct({ price: 2490, previousPrice: 2000, changePercent: 24.5 })}
      />,
    );
    const row = document.querySelector(".product-card__price-row");
    expect(row).toBeInTheDocument();
    // The badge is a sibling of the prices stack — it can never squeeze the
    // current price into an ellipsis.
    expect(row!.querySelector(".product-card__prices > .product-card__change")).toBeNull();
    expect(row!.querySelector(":scope > .product-card__change")).not.toBeNull();
    expect(row!.querySelector(".product-card__prices .product-price")!.textContent).toBe(
      formatPrice(2490),
    );
  });
});
