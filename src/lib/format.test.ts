import { describe, expect, it } from "vitest";

import { discountPercent, formatDiscount, formatPercent, roundChangePercent } from "@/lib/format";

// ── discountPercent ─────────────────────────────────────────────────────────

describe("discountPercent", () => {
  it("Absolut 1450 → 990 gives ~31.7%", () => {
    const result = discountPercent(1450, 990);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(31.724, 1);
    expect(result!.toFixed(1)).toBe("31.7");
  });

  it("Jameson 2000 → 1590 gives ~20.5%", () => {
    const result = discountPercent(2000, 1590);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(20.5, 1);
    expect(result!.toFixed(1)).toBe("20.5");
  });

  it("Mojito 2800 → 1890 gives ~32.5%", () => {
    const result = discountPercent(2800, 1890);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(32.5, 1);
    expect(result!.toFixed(1)).toBe("32.5");
  });

  it("currentPrice equal to originalPrice gives 0%", () => {
    const result = discountPercent(2000, 2000);
    expect(result).toBe(0);
  });

  it("currentPrice above originalPrice gives negative (markup)", () => {
    const result = discountPercent(2000, 2500);
    expect(result).toBeLessThan(0);
    expect(result).toBeCloseTo(-25, 1);
  });

  it("returns null when originalPrice is 0 (cannot divide)", () => {
    expect(discountPercent(0, 100)).toBeNull();
  });

  it("returns null when originalPrice is negative", () => {
    expect(discountPercent(-100, 50)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(discountPercent(NaN, 100)).toBeNull();
    expect(discountPercent(100, Infinity)).toBeNull();
  });

  it("is independent from changePercent — discount is calculated from originalPrice only", () => {
    // Even if changePercent would be 0, the discount is still computed.
    const result = discountPercent(2000, 1590);
    expect(result).toBeCloseTo(20.5, 1);
  });
});

// ── roundChangePercent ──────────────────────────────────────────────────────

describe("roundChangePercent", () => {
  it("previousPrice 1590 → currentPrice 1750 gives +10.1%", () => {
    const result = roundChangePercent(1750, 1590);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(10.06, 1);
    expect(result!.toFixed(1)).toBe("10.1");
  });

  it("previousPrice 1750 → currentPrice 1590 gives -9.1%", () => {
    const result = roundChangePercent(1590, 1750);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(-9.14, 1);
    expect(result!.toFixed(1)).toBe("-9.1");
  });

  it("equal prices give 0%", () => {
    expect(roundChangePercent(1590, 1590)).toBe(0);
  });

  it("returns null when previousPrice is null (first round)", () => {
    expect(roundChangePercent(1590, null)).toBeNull();
  });

  it("returns null when previousPrice is 0 (cannot divide)", () => {
    expect(roundChangePercent(100, 0)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(roundChangePercent(NaN, 100)).toBeNull();
    expect(roundChangePercent(100, Infinity)).toBeNull();
  });
});

// ── formatDiscount ──────────────────────────────────────────────────────────

describe("formatDiscount", () => {
  it("formats positive discount with Unicode minus", () => {
    expect(formatDiscount(20.5)).toBe("\u221220.5%");
  });

  it("formats zero as 0%", () => {
    expect(formatDiscount(0)).toBe("0%");
  });

  it("formats negative discount (markup) with plus sign", () => {
    expect(formatDiscount(-12.5)).toBe("+12.5%");
  });

  it("formats 31.7% discount", () => {
    expect(formatDiscount(31.7)).toBe("\u221231.7%");
  });
});

// ── formatPercent (existing, sanity check) ─────────────────────────────────

describe("formatPercent", () => {
  it("formats positive with plus sign", () => {
    expect(formatPercent(10.1)).toBe("+10.1%");
  });

  it("formats negative with minus sign", () => {
    expect(formatPercent(-9.1)).toBe("-9.1%");
  });

  it("formats zero without sign (toFixed(1) gives 0.0%)", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });
});
