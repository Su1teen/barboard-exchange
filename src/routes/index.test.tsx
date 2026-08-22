import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { PublicProduct } from "@/lib/api";
import { formatPrice } from "@/lib/format";

import { ProductCard } from "@/routes/index";

const makeProduct = (overrides: Partial<PublicProduct> = {}): PublicProduct => ({
  id: "p1",
  name: "Jameson",
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
    // No "пред." label when there is no previous price.
    expect(screen.queryByText(/^пред\./)).not.toBeInTheDocument();
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
});
