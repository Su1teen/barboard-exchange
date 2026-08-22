/**
 * Centralized product metadata for the bar exchange guest frontend.
 *
 * The backend (`GET /api/v1/public/products`) is the source of truth for the
 * current exchange `price`, `previousPrice`, `changePercent`, and
 * `isAvailable`. This module supplies read-only frontend-only metadata that
 * the backend does not expose:
 *
 *   - `originalPrice` — the static menu price (never taken from the API or
 *     iiko at runtime).
 *   - `minPrice` — the lower bound, used only for the "Минимальная цена" badge
 *     and UI safety. Never replaces the API price.
 *   - product images — local static imports from `src/assets/images`, resolved
 *     by stable slug → normalized name → category fallback. No external URLs,
 *     no broken images.
 *
 * Resolution order for both images and metadata:
 *   1. Stable slug (normalized `id` or `name`).
 *   2. Normalized display name (handles cyrillic, diacritics, spelling
 *      variants like Jäger/Jager, Nemiroff/Nemoriff, Oakheart/Okheart,
 *      Ballantines/Ballatines, Corona Extra, Red Bull Vodka).
 *   3. Category fallback image (spirits → whiskey, bottled beer → beer,
 *      cocktails → cocktail).
 */

import absolutImg from "@/assets/images/absolut.jpeg";
import bacardiImg from "@/assets/images/bacardi.jpeg";
import ballantinesImg from "@/assets/images/ballatines.webp";
import beefeaterImg from "@/assets/images/beefeater.jpg";
import budsImg from "@/assets/images/buds.jpg";
import chivasImg from "@/assets/images/chivas.jpg";
import coronaImg from "@/assets/images/corona extra.jpeg";
import germanImg from "@/assets/images/german.jpg";
import hoegaardenImg from "@/assets/images/hoegaarden.jpg";
import jagermeisterImg from "@/assets/images/jagermeister.jpg";
import jamesonImg from "@/assets/images/jameson.jpg";
import millerImg from "@/assets/images/miller.jpeg";
import monkeyShoulderImg from "@/assets/images/monkeyshoulder.jpg";
import nemiroffImg from "@/assets/images/nemoriff.jpg";
import oakheartImg from "@/assets/images/okheart.jpg";
import redBullVodkaImg from "@/assets/images/rebullvodka.jpg";
import tsingtaoImg from "@/assets/images/tsintao.jpg";

import beerFallbackImg from "@/assets/beer.png";
import cocktailFallbackImg from "@/assets/cocktail.png";
import whiskeyFallbackImg from "@/assets/whiskey.png";

// ── Types ──────────────────────────────────────────────────────────────────

/** Internal category key used for fallback images and metadata grouping. */
export type ProductCategory = "spirits" | "beer" | "cocktail";

/** Read-only frontend metadata for a single exchange product. */
export type ProductMeta = {
  originalPrice: number;
  minPrice: number;
  category: ProductCategory;
};

// ── Product images (slug → static import) ──────────────────────────────────

export const PRODUCT_IMAGES: Record<string, string> = {
  absolut: absolutImg,
  "bacardi-black": bacardiImg,
  ballantines: ballantinesImg,
  beefeater: beefeaterImg,
  bud: budsImg,
  chivas: chivasImg,
  "corona-extra": coronaImg,
  german: germanImg,
  hoegaarden: hoegaardenImg,
  jagermeister: jagermeisterImg,
  jameson: jamesonImg,
  miller: millerImg,
  "monkey-shoulder": monkeyShoulderImg,
  nemiroff: nemiroffImg,
  oakheart: oakheartImg,
  "red-bull-vodka": redBullVodkaImg,
  tsingtao: tsingtaoImg,
};

// ── Category fallback images ───────────────────────────────────────────────

export const CATEGORY_FALLBACK_IMAGES: Record<ProductCategory, string> = {
  spirits: whiskeyFallbackImg,
  beer: beerFallbackImg,
  cocktail: cocktailFallbackImg,
};

// ── Product metadata (slug → originalPrice / minPrice / category) ──────────

export const PRODUCT_META: Record<string, ProductMeta> = {
  // ── Крепкий алкоголь ───────────────────────────────────────────────────
  german: { originalPrice: 1190, minPrice: 790, category: "spirits" },
  beefeater: { originalPrice: 2000, minPrice: 1590, category: "spirits" },
  jagermeister: { originalPrice: 2000, minPrice: 1590, category: "spirits" },
  oakheart: { originalPrice: 2000, minPrice: 1590, category: "spirits" },
  "bacardi-black": { originalPrice: 1600, minPrice: 1190, category: "spirits" },
  ballantines: { originalPrice: 2000, minPrice: 1590, category: "spirits" },
  jameson: { originalPrice: 2000, minPrice: 1590, category: "spirits" },
  chivas: { originalPrice: 3000, minPrice: 2590, category: "spirits" },
  "jack-daniels": { originalPrice: 3000, minPrice: 2590, category: "spirits" },
  "monkey-shoulder": { originalPrice: 3500, minPrice: 2990, category: "spirits" },
  absolut: { originalPrice: 1450, minPrice: 990, category: "spirits" },
  nemiroff: { originalPrice: 1300, minPrice: 890, category: "spirits" },
  "hortitsa-ice": { originalPrice: 890, minPrice: 590, category: "spirits" },
  kyzylzhar: { originalPrice: 790, minPrice: 590, category: "spirits" },

  // ── Бутылочное пиво ────────────────────────────────────────────────────
  miller: { originalPrice: 1650, minPrice: 990, category: "beer" },
  bud: { originalPrice: 2190, minPrice: 990, category: "beer" },
  "corona-extra": { originalPrice: 2990, minPrice: 2590, category: "beer" },
  paulaner: { originalPrice: 2500, minPrice: 1990, category: "beer" },
  tsingtao: { originalPrice: 2500, minPrice: 1990, category: "beer" },
  hoegaarden: { originalPrice: 2500, minPrice: 1990, category: "beer" },

  // ── Коктейли ───────────────────────────────────────────────────────────
  "red-bull-vodka": { originalPrice: 3200, minPrice: 2190, category: "cocktail" },
  "red-bull-jager": { originalPrice: 3200, minPrice: 2190, category: "cocktail" },
  "gin-tonic": { originalPrice: 3200, minPrice: 2190, category: "cocktail" },
  "red-bull-whiskey": { originalPrice: 3200, minPrice: 2190, category: "cocktail" },
  mojito: { originalPrice: 2800, minPrice: 1890, category: "cocktail" },
  "long-island": { originalPrice: 3500, minPrice: 2490, category: "cocktail" },
  "whiskey-sour": { originalPrice: 3200, minPrice: 2190, category: "cocktail" },
};

// ── Normalization ──────────────────────────────────────────────────────────

/**
 * Explicit alias map for spelling variants that simple transliteration /
 * diacritic stripping cannot handle. Keys are in the POST-transliteration
 * form (lowercase latin, hyphen-joined) because the alias lookup happens
 * after transliteration.
 */
const ALIASES: Record<string, string> = {
  // Spelling variants in the image file names
  nemoriff: "nemiroff",
  okheart: "oakheart",
  ballatines: "ballantines",
  tsintao: "tsingtao",
  // Jäger / Jager / Jagermeister (diacritics are stripped before lookup)
  jager: "jagermeister",
  jagermeister: "jagermeister",
  // Red Bull Jäger → cocktail key (no dedicated image)
  "red-bull-jager": "red-bull-jager",
  // Cyrillic → latin product names (post-transliteration keys)
  // "Немецкое" transliterates to "nemetskoe" → map to "german"
  nemetskoe: "german",
  // "Хортица Айс" transliterates to "hortitsa-ays" → map to "hortitsa-ice"
  "hortitsa-ays": "hortitsa-ice",
  // Bud variants
  buds: "bud",
};

/**
 * Transliteration table for Cyrillic → Latin. Covers the characters used in
 * the product names (Миллер, Немецкое, Хортица, Кызылжар). Not a full
 * transliteration library — intentionally minimal.
 */
const CYRILLIC_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

/**
 * Normalize an arbitrary input (product id, name, or category) into a stable
 * lowercase hyphen-joined key. Handles:
 *   - lowercase
 *   - diacritic stripping (ä → a, é → e)
 *   - Cyrillic transliteration (Миллер → miller)
 *   - explicit alias resolution (nemoriff → nemiroff, okheart → oakheart,
 *     ballatines → ballantines, jager → jagermeister, etc.)
 *   - whitespace → hyphen
 */
export function normalizeKey(input: string | null | undefined): string {
  if (!input) return "";

  const lower = input.toLowerCase().trim();

  // Transliterate Cyrillic characters to Latin.
  let transliterated = "";
  for (const ch of lower) {
    transliterated += CYRILLIC_LATIN[ch] ?? ch;
  }

  // Strip diacritics: NFD decomposition then remove combining marks.
  const stripped = transliterated.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Replace any non-alphanumeric run with a single hyphen, trim hyphens.
  const key = stripped
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Resolve explicit aliases (e.g. nemoriff → nemiroff).
  return ALIASES[key] ?? key;
}

// ── Category resolution ────────────────────────────────────────────────────

/**
 * Map the backend's Russian category label to an internal `ProductCategory`.
 * Falls back to `"spirits"` if the category is unrecognized (safest default
 * for a bar exchange — most products are spirits).
 */
export function resolveCategory(category: string | null | undefined): ProductCategory {
  if (!category) return "spirits";
  const normalized = normalizeKey(category);
  if (
    normalized.includes("pivo") ||
    normalized.includes("beer") ||
    normalized.includes("bottled")
  ) {
    return "beer";
  }
  if (normalized.includes("kokteyl") || normalized.includes("cocktail")) {
    return "cocktail";
  }
  // "Крепкий алкоголь" → "krepskiy-alkogol" → includes "alkogol" → spirits
  return "spirits";
}

// ── Image resolution ───────────────────────────────────────────────────────

/**
 * Resolve a product image. Resolution order:
 *   1. `PRODUCT_IMAGES[normalizeKey(product.id)]`
 *   2. `PRODUCT_IMAGES[normalizeKey(product.name)]`
 *   3. `CATEGORY_FALLBACK_IMAGES[resolveCategory(product.category)]`
 *
 * The return value is always a valid static import URL — never an empty
 * string, never an external URL, never undefined.
 */
export function resolveProductImage(product: {
  id: string;
  name: string;
  category?: string;
}): string {
  const idKey = normalizeKey(product.id);
  if (PRODUCT_IMAGES[idKey]) return PRODUCT_IMAGES[idKey];

  const nameKey = normalizeKey(product.name);
  if (PRODUCT_IMAGES[nameKey]) return PRODUCT_IMAGES[nameKey];

  const category = resolveCategory(product.category);
  return CATEGORY_FALLBACK_IMAGES[category];
}

// ── Metadata resolution ────────────────────────────────────────────────────

/**
 * Resolve read-only frontend metadata (`originalPrice`, `minPrice`,
 * `category`) for a product. Resolution order:
 *   1. `PRODUCT_META[normalizeKey(product.id)]`
 *   2. `PRODUCT_META[normalizeKey(product.name)]`
 *   3. `undefined` — the product has no static metadata.
 *
 * Returns `undefined` when no metadata is found. The caller must handle this
 * gracefully (e.g. hide the discount badge, don't crash).
 */
export function resolveProductMeta(product: { id: string; name: string }): ProductMeta | undefined {
  const idKey = normalizeKey(product.id);
  if (PRODUCT_META[idKey]) return PRODUCT_META[idKey];

  const nameKey = normalizeKey(product.name);
  if (PRODUCT_META[nameKey]) return PRODUCT_META[nameKey];

  return undefined;
}
