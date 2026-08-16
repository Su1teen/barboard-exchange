import beerImg from "@/assets/beer.png";
import cocktailImg from "@/assets/cocktail.png";
import whiskeyImg from "@/assets/whiskey.png";
import wineImg from "@/assets/wine.png";

export type Drink = {
  id: string;
  name: string;
  base: number;
  originalPrice: number;
  min: number;
  max: number;
  image: string;
  fallbackImage: string;
};

export type Category = {
  id: string;
  title: string;
  subtitle: string;
  items: Drink[];
};

/**
 * Per-drink image dictionary.
 * Every entry maps a drink ID to a distinct product photo URL.
 */
const DRINK_IMAGES: Record<string, string> = {
  // ── Разливные напитки ──────────────────────────────────
  d1: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=400&fit=crop", // Разливное пиво немецкое
  d2: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop", // Miller разливное
  d3: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Beefeater_gin.jpg/220px-Beefeater_gin.jpg", // Beefeater
  d4: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Jagermeister_bottle.jpg/200px-Jagermeister_bottle.jpg", // Jägermeister
  d5: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&h=400&fit=crop", // Orchard (сидр)
  d6: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Bacardi_Logo.svg/200px-Bacardi_Logo.svg.png", // Bacardi
  d7: "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=400&h=400&fit=crop", // Ballantine's
  d8: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Jameson_Irish_Whiskey.JPG/220px-Jameson_Irish_Whiskey.JPG", // Jameson
  d9: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Chivas_regal_12yo.jpg/200px-Chivas_regal_12yo.jpg", // Chivas Regal
  d10: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Monkey_Shoulder_scotch_bottle.jpg/200px-Monkey_Shoulder_scotch_bottle.jpg", // Monkey Shoulder
  d11: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Absolut_Vodka_-_Original.jpg/200px-Absolut_Vodka_-_Original.jpg", // Absolut
  d12: "https://images.unsplash.com/photo-1613063029958-6efb1a6c5e91?w=400&h=400&fit=crop", // Nemiroff

  // ── Крепкий алкоголь (водка/настойки) ──────────────────
  s1: "https://images.unsplash.com/photo-1607622750671-6cd9a99eabd1?w=400&h=400&fit=crop", // Хортица Айс
  s2: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400&h=400&fit=crop", // Кызылжар

  // ── Бутылочное пиво ────────────────────────────────────
  b1: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Miller_Lite_six_pack.jpg/250px-Miller_Lite_six_pack.jpg", // Miller
  b2: "https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=400&h=400&fit=crop", // Bud
  b3: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Corona_Extra_beer_bottle_%282019%29.png/150px-Corona_Extra_beer_bottle_%282019%29.png", // Corona Extra
  b4: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Paulaner_Hefe-Weissbier.JPG/200px-Paulaner_Hefe-Weissbier.JPG", // Paulaner
  b5: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Tsingtao_Beer.JPG/200px-Tsingtao_Beer.JPG", // Tsingtao
  b6: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Hoegaarden_bottle.JPG/200px-Hoegaarden_bottle.JPG", // Hoegaarden

  // ── Коктейли ───────────────────────────────────────────
  c1: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=400&fit=crop", // Redbull Vodka
  c2: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=400&fit=crop", // Redbull Jäger
  c3: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&h=400&fit=crop", // Redbull Whisky
  c4: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Gin_and_Tonic_with_ingredients.jpg/440px-Gin_and_Tonic_with_ingredients.jpg", // Gin Tonic
  c5: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=400&h=400&fit=crop", // Long Island
  c6: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Whiskey_Sour.jpg/440px-Whiskey_Sour.jpg", // Whisky Sour
  c7: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Mojito98.jpg/440px-Mojito98.jpg", // Mojito
};

/** Fallback local asset keyed by category prefix letter */
const FALLBACK_BY_PREFIX: Record<string, string> = {
  d: whiskeyImg,
  s: whiskeyImg,
  b: beerImg,
  c: cocktailImg,
};

const make = (
  id: string,
  name: string,
  originalPrice: number,
  base: number,
  spread = 0.22,
): Drink => ({
  id,
  name,
  originalPrice,
  base,
  min: Math.round(base * (1 - spread)),
  max: Math.round(base * (1 + spread)),
  image: DRINK_IMAGES[id] ?? FALLBACK_BY_PREFIX[id[0]] ?? beerImg,
  fallbackImage: FALLBACK_BY_PREFIX[id[0]] ?? beerImg,
});

export const CATEGORIES: Category[] = [
  {
    id: "draft",
    title: "Разливные напитки",
    subtitle: "Draft & Spirits",
    items: [
      make("d1", "Немецкое разливное", 1800, 1500),
      make("d2", "Miller разливное", 1500, 1300),
      make("d3", "Beefeater Gin", 2800, 2500),
      make("d4", "Jägermeister", 2500, 2200),
      make("d5", "Orchard", 2000, 1700),
      make("d6", "Bacardi", 2600, 2300),
      make("d7", "Ballantine's", 2400, 2100),
      make("d8", "Jameson", 3000, 2700),
      make("d9", "Chivas Regal", 4500, 4000),
      make("d10", "Monkey Shoulder", 4200, 3700),
      make("d11", "Absolut", 2200, 1900),
      make("d12", "Nemiroff", 1800, 1500),
    ],
  },
  {
    id: "spirits",
    title: "Крепкий алкоголь",
    subtitle: "Vodka & Spirits",
    items: [
      make("s1", "Хортица Айс", 1600, 1400),
      make("s2", "Кызылжар", 1400, 1200),
    ],
  },
  {
    id: "beer",
    title: "Бутылочное пиво",
    subtitle: "Bottled Beer",
    items: [
      make("b1", "Miller", 1200, 1000),
      make("b2", "Bud", 1200, 1050),
      make("b3", "Corona Extra", 1800, 1600),
      make("b4", "Paulaner", 2000, 1800),
      make("b5", "Tsingtao", 1500, 1300),
      make("b6", "Hoegaarden", 1800, 1600),
    ],
  },
  {
    id: "cocktails",
    title: "Коктейли",
    subtitle: "Signature Bar",
    items: [
      make("c1", "Redbull + Vodka", 2800, 2500),
      make("c2", "Redbull + Jäger", 3000, 2700),
      make("c3", "Redbull + Whisky", 3200, 2900),
      make("c4", "Gin Tonic", 2500, 2200),
      make("c5", "Long Island", 3500, 3100),
      make("c6", "Whisky Sour", 3000, 2700),
      make("c7", "Mojito", 2800, 2500),
    ],
  },
];

export const ALL_ITEMS = CATEGORIES.flatMap((c) => c.items);

/** Round to nearest 10 */
export const roundTo10 = (value: number): number =>
  Math.round(value / 10) * 10;

export const formatPrice = (value: number) =>
  `${roundTo10(value).toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸`;