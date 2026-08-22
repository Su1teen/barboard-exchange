import { describe, expect, it } from "vitest";

import {
  CATEGORY_FALLBACK_IMAGES,
  PRODUCT_IMAGES,
  PRODUCT_META,
  normalizeKey,
  resolveCategory,
  resolveProductImage,
  resolveProductMeta,
} from "@/lib/products";

// ── normalizeKey ────────────────────────────────────────────────────────────

describe("normalizeKey", () => {
  it("lowercases and hyphen-joins latin names", () => {
    expect(normalizeKey("Jameson")).toBe("jameson");
    expect(normalizeKey("Red Bull Vodka")).toBe("red-bull-vodka");
    expect(normalizeKey("Corona Extra")).toBe("corona-extra");
    expect(normalizeKey("Bacardi Black")).toBe("bacardi-black");
    expect(normalizeKey("Monkey Shoulder")).toBe("monkey-shoulder");
  });

  it("strips diacritics (Jägermeister)", () => {
    expect(normalizeKey("Jägermeister")).toBe("jagermeister");
    expect(normalizeKey("Jäger")).toBe("jagermeister");
    expect(normalizeKey("Jager")).toBe("jagermeister");
  });

  it("resolves Nemiroff / Nemoriff spelling variant", () => {
    expect(normalizeKey("Nemiroff")).toBe("nemiroff");
    expect(normalizeKey("Nemoriff")).toBe("nemiroff");
  });

  it("resolves Oakheart / Okheart spelling variant", () => {
    expect(normalizeKey("Oakheart")).toBe("oakheart");
    expect(normalizeKey("Okheart")).toBe("oakheart");
  });

  it("resolves Ballantines / Ballatines spelling variant", () => {
    expect(normalizeKey("Ballantines")).toBe("ballantines");
    expect(normalizeKey("Ballatines")).toBe("ballantines");
  });

  it("resolves Tsingtao / Tsintao spelling variant", () => {
    expect(normalizeKey("Tsingtao")).toBe("tsingtao");
    expect(normalizeKey("Tsintao")).toBe("tsingtao");
  });

  it("transliterates Cyrillic names", () => {
    expect(normalizeKey("Миллер")).toBe("miller");
    expect(normalizeKey("Немецкое")).toBe("german");
    expect(normalizeKey("Хортица Айс")).toBe("hortitsa-ice");
    expect(normalizeKey("Кызылжар")).toBe("kyzylzhar");
  });

  it("handles Bud / Buds variant", () => {
    expect(normalizeKey("Bud")).toBe("bud");
    expect(normalizeKey("Buds")).toBe("bud");
  });

  it("returns empty string for null/undefined/empty", () => {
    expect(normalizeKey(null)).toBe("");
    expect(normalizeKey(undefined)).toBe("");
    expect(normalizeKey("")).toBe("");
  });
});

// ── resolveCategory ─────────────────────────────────────────────────────────

describe("resolveCategory", () => {
  it("maps Russian category labels to internal categories", () => {
    expect(resolveCategory("Крепкий алкоголь")).toBe("spirits");
    expect(resolveCategory("Бутылочное пиво")).toBe("beer");
    expect(resolveCategory("Коктейли")).toBe("cocktail");
  });

  it("defaults to spirits for unrecognized categories", () => {
    expect(resolveCategory("Unknown")).toBe("spirits");
    expect(resolveCategory(null)).toBe("spirits");
    expect(resolveCategory(undefined)).toBe("spirits");
  });
});

// ── resolveProductImage ─────────────────────────────────────────────────────

describe("resolveProductImage", () => {
  it("resolves image by normalized id (slug)", () => {
    const img = resolveProductImage({
      id: "jameson",
      name: "Jameson",
      category: "Крепкий алкоголь",
    });
    expect(img).toBe(PRODUCT_IMAGES["jameson"]);
    expect(img).toBeTruthy();
  });

  it("resolves image by normalized name when id does not match", () => {
    const img = resolveProductImage({
      id: "uuid-123",
      name: "Jameson",
      category: "Крепкий алкоголь",
    });
    expect(img).toBe(PRODUCT_IMAGES["jameson"]);
  });

  it("resolves Jägermeister via diacritic stripping", () => {
    const img = resolveProductImage({
      id: "x",
      name: "Jägermeister",
      category: "Крепкий алкоголь",
    });
    expect(img).toBe(PRODUCT_IMAGES["jagermeister"]);
  });

  it("resolves Nemoriff to the Nemiroff image", () => {
    const img = resolveProductImage({ id: "x", name: "Nemoriff", category: "Крепкий алкоголь" });
    expect(img).toBe(PRODUCT_IMAGES["nemiroff"]);
  });

  it("resolves Okheart to the Oakheart image", () => {
    const img = resolveProductImage({ id: "x", name: "Okheart", category: "Крепкий алкоголь" });
    expect(img).toBe(PRODUCT_IMAGES["oakheart"]);
  });

  it("resolves Ballatines to the Ballantines image", () => {
    const img = resolveProductImage({ id: "x", name: "Ballatines", category: "Крепкий алкоголь" });
    expect(img).toBe(PRODUCT_IMAGES["ballantines"]);
  });

  it("resolves Cyrillic name Миллер to the Miller image", () => {
    const img = resolveProductImage({ id: "x", name: "Миллер", category: "Бутылочное пиво" });
    expect(img).toBe(PRODUCT_IMAGES["miller"]);
  });

  it("resolves Cyrillic name Немецкое to the German image", () => {
    const img = resolveProductImage({ id: "x", name: "Немецкое", category: "Крепкий алкоголь" });
    expect(img).toBe(PRODUCT_IMAGES["german"]);
  });

  it("resolves Corona Extra (space in name)", () => {
    const img = resolveProductImage({ id: "x", name: "Corona Extra", category: "Бутылочное пиво" });
    expect(img).toBe(PRODUCT_IMAGES["corona-extra"]);
  });

  it("resolves Red Bull Vodka (space in name)", () => {
    const img = resolveProductImage({ id: "x", name: "Red Bull Vodka", category: "Коктейли" });
    expect(img).toBe(PRODUCT_IMAGES["red-bull-vodka"]);
  });

  it("falls back to whiskey image for spirits without a dedicated photo", () => {
    const img = resolveProductImage({
      id: "x",
      name: "Jack Daniels",
      category: "Крепкий алкоголь",
    });
    expect(img).toBe(CATEGORY_FALLBACK_IMAGES["spirits"]);
    expect(img).toBeTruthy();
  });

  it("falls back to beer image for bottled beer without a dedicated photo", () => {
    const img = resolveProductImage({ id: "x", name: "Paulaner", category: "Бутылочное пиво" });
    expect(img).toBe(CATEGORY_FALLBACK_IMAGES["beer"]);
    expect(img).toBeTruthy();
  });

  it("falls back to cocktail image for cocktails without a dedicated photo", () => {
    const img = resolveProductImage({ id: "x", name: "Gin Tonic", category: "Коктейли" });
    expect(img).toBe(CATEGORY_FALLBACK_IMAGES["cocktail"]);
    expect(img).toBeTruthy();
  });

  it("falls back to cocktail for Red Bull Jäger (no dedicated image)", () => {
    const img = resolveProductImage({ id: "x", name: "Red Bull Jäger", category: "Коктейли" });
    expect(img).toBe(CATEGORY_FALLBACK_IMAGES["cocktail"]);
  });

  it("never returns an empty string or undefined", () => {
    const img = resolveProductImage({ id: "", name: "", category: "" });
    expect(img).toBeTruthy();
    expect(typeof img).toBe("string");
    expect(img.length).toBeGreaterThan(0);
  });

  it("all 17 PRODUCT_IMAGES entries are non-empty strings", () => {
    for (const [slug, src] of Object.entries(PRODUCT_IMAGES)) {
      expect(typeof src).toBe("string");
      expect(src.length).toBeGreaterThan(0);
      expect(slug).toBeTruthy();
    }
  });
});

// ── resolveProductMeta ──────────────────────────────────────────────────────

describe("resolveProductMeta", () => {
  it("resolves metadata by normalized id", () => {
    const meta = resolveProductMeta({ id: "jameson", name: "Jameson" });
    expect(meta).toBeDefined();
    expect(meta?.originalPrice).toBe(2000);
    expect(meta?.minPrice).toBe(1590);
    expect(meta?.category).toBe("spirits");
  });

  it("resolves metadata by normalized name when id does not match", () => {
    const meta = resolveProductMeta({ id: "uuid", name: "Absolut" });
    expect(meta?.originalPrice).toBe(1450);
    expect(meta?.minPrice).toBe(990);
  });

  it("resolves metadata for Cyrillic name Миллер", () => {
    const meta = resolveProductMeta({ id: "uuid", name: "Миллер" });
    expect(meta?.originalPrice).toBe(1650);
    expect(meta?.minPrice).toBe(990);
    expect(meta?.category).toBe("beer");
  });

  it("resolves metadata for Jägermeister (diacritics)", () => {
    const meta = resolveProductMeta({ id: "uuid", name: "Jägermeister" });
    expect(meta?.originalPrice).toBe(2000);
    expect(meta?.minPrice).toBe(1590);
  });

  it("returns undefined for unknown products", () => {
    const meta = resolveProductMeta({ id: "unknown-uuid", name: "Mystery Drink" });
    expect(meta).toBeUndefined();
  });

  it("all 27 products have metadata entries", () => {
    expect(Object.keys(PRODUCT_META)).toHaveLength(27);
  });

  it("every metadata entry has positive originalPrice and minPrice", () => {
    for (const [slug, meta] of Object.entries(PRODUCT_META)) {
      expect(meta.originalPrice).toBeGreaterThan(0);
      expect(meta.minPrice).toBeGreaterThan(0);
      expect(meta.minPrice).toBeLessThanOrEqual(meta.originalPrice);
      expect(slug).toBeTruthy();
    }
  });
});
