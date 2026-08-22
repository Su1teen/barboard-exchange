import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { PublicProduct } from "@/lib/api";
import { formatDiscount, formatPrice } from "@/lib/format";
import { PRODUCT_IMAGES } from "@/lib/products";

import { ProductCard } from "@/routes/index";

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
    expect(screen.getByText(new RegExp(formatDiscount(20.5).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeInTheDocument();
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
    expect(screen.getByText(/Минимальная цена/)).toBeInTheDocument();
  });

  it("shows Минимальная цена badge when currentPrice is below minPrice", () => {
    // Jameson minPrice = 1590, price = 1500 (below min).
    render(<ProductCard product={makeProduct({ id: "jameson", name: "Jameson", price: 1500 })} />);
    expect(screen.getByText(/Минимальная цена/)).toBeInTheDocument();
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

// ── Category display ────────────────────────────────────────────────────────

describe("ProductCard category display", () => {
  it("shows the category label from the API", () => {
    render(
      <ProductCard product={makeProduct({ name: "Jameson", category: "Крепкий алкоголь" })} />,
    );
    expect(screen.getByText("Крепкий алкоголь")).toBeInTheDocument();
  });
});
