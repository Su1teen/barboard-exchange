import beerImg from "@/assets/beer.png";
import cocktailImg from "@/assets/cocktail.png";
import whiskeyImg from "@/assets/whiskey.png";
import wineImg from "@/assets/wine.png";

export type Drink = {
  id: string;
  name: string;
  base: number;
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
 * Every entry maps a drink ID to a distinct Wikimedia Commons product photo
 * so each row in the grid shows a unique, recognisable image.
 */
const DRINK_IMAGES: Record<string, string> = {
  // ── Beer ──────────────────────────────────────────────
  b1: "https://commons.wikimedia.org/wiki/Special:FilePath/Heineken_Bottle.jpg",
  b2: "https://commons.wikimedia.org/wiki/Special:FilePath/GuinnessPint.JPG",
  b3: "https://commons.wikimedia.org/wiki/Special:FilePath/Paulaner_Hefe-Weissbier.JPG",
  b4: "https://commons.wikimedia.org/wiki/Special:FilePath/Corona_Extra_beer_bottle_(2019).png",
  b5: "https://commons.wikimedia.org/wiki/Special:FilePath/Hoegaarden_bottle.JPG",
  b6: "https://commons.wikimedia.org/wiki/Special:FilePath/Stella_Artois_bottle.jpg",
  b7: "https://commons.wikimedia.org/wiki/Special:FilePath/Leffe_blonde.jpg",
  b8: "https://commons.wikimedia.org/wiki/Special:FilePath/Velkopopovick%C3%BD_kozel_%C4%8Dern%C3%BD_(Beer-_czech_republic).jpg",
  b9: "https://commons.wikimedia.org/wiki/Special:FilePath/Erdinger-bottle-glass_RMO.jpg",
  b10: "https://commons.wikimedia.org/wiki/Special:FilePath/Pilsner_Urquell_330mL_Bottle.jpg",
  b11: "https://commons.wikimedia.org/wiki/Special:FilePath/Texas_edition_Bud_Light.png",
  b12: "https://commons.wikimedia.org/wiki/Special:FilePath/Krombacher_Pils.JPG",

  // ── Cocktails ─────────────────────────────────────────
  c1: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Whiskey_Sour.jpg/440px-Whiskey_Sour.jpg",
  c2: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Negroni_at_Nightwood_Restaurant.jpg/440px-Negroni_at_Nightwood_Restaurant.jpg",
  c3: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Whisky_Old_Fashioned1.jpg/440px-Whisky_Old_Fashioned1.jpg",
  c4: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Aperol_Spritz_%2835146498094%29.jpg/440px-Aperol_Spritz_%2835146498094%29.jpg",
  c5: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/MargaritaReal.jpg/440px-MargaritaReal.jpg",
  c6: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Espresso_Martini.jpg/440px-Espresso_Martini.jpg",
  c7: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Mojito98.jpg/440px-Mojito98.jpg",
  c8: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Classic_Daiquiri_in_Cocktail_Glass.jpg/440px-Classic_Daiquiri_in_Cocktail_Glass.jpg",
  c9: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Cosmopolitan_%285076906532%29.jpg/440px-Cosmopolitan_%285076906532%29.jpg",
  c10: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Manhattan_Cocktail2.jpg/440px-Manhattan_Cocktail2.jpg",
  c11: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Gin_and_Tonic_with_ingredients.jpg/440px-Gin_and_Tonic_with_ingredients.jpg",
  c12: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Moscow_Mule_at_Rye%2C_San_Francisco.jpg/440px-Moscow_Mule_at_Rye%2C_San_Francisco.jpg",

  // ── Spirits ───────────────────────────────────────────
  s1: "https://commons.wikimedia.org/wiki/Special:FilePath/Jameson_Irish_Whiskey.JPG",
  s2: "https://commons.wikimedia.org/wiki/Special:FilePath/Chivas_regal_12yo.jpg",
  s3: "https://commons.wikimedia.org/wiki/Special:FilePath/Jack_daniels_bottle.jpg",
  s4: "https://commons.wikimedia.org/wiki/Special:FilePath/The_Macallan_12_yo_new.png",
  s5: "https://commons.wikimedia.org/wiki/Special:FilePath/2023_Hennessy_V.S._Cognac.jpg",
  s6: "https://commons.wikimedia.org/wiki/Special:FilePath/Bottle_of_Glenfiddich_12yo.jpg",
  s7: "https://commons.wikimedia.org/wiki/Special:FilePath/Bombay_sapphire_bottle.jpg",
  s8: "https://commons.wikimedia.org/wiki/Special:FilePath/Caviar_et_Vodka_Beluga_002.jpg",
  s9: "https://commons.wikimedia.org/wiki/Special:FilePath/Bacardi_rum_bottle.jpg",
  s10: "https://commons.wikimedia.org/wiki/Special:FilePath/Tequila_Silver,_Reposado,_and_Anejo.jpg",
  s11: "https://commons.wikimedia.org/wiki/Special:FilePath/Monkey_Shoulder_scotch_bottle.jpg",
  s12: "https://commons.wikimedia.org/wiki/Special:FilePath/Jagermeister_1l_bottle.jpg",

  // ── Wine ──────────────────────────────────────────────
  w1: "https://commons.wikimedia.org/wiki/Special:FilePath/Chablis_bottle_and_wine.jpg",
  w2: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Pinot_Noir_being_poured_into_a_wine_glass.jpg",
  w3: "https://commons.wikimedia.org/wiki/Special:FilePath/Alexander_Valley_California_Cabernet_Sauvignon.jpg",
  w4: "https://commons.wikimedia.org/wiki/Special:FilePath/2015_Smith_Story_Pickberry_Merlot_-_Sarah_Stierch.jpg",
  w5: "https://commons.wikimedia.org/wiki/Special:FilePath/Wine_bottles_of_Sauvignon_Blanc.jpg",
  w6: "https://commons.wikimedia.org/wiki/Special:FilePath/Bottles_of_Rioja_Wine.jpg",
  w7: "https://commons.wikimedia.org/wiki/Special:FilePath/A_bottle_of_Prosecco.jpg",
  w8: "https://commons.wikimedia.org/wiki/Special:FilePath/Banfi_Chianti_Classico_2005.jpg",
  w9: "https://commons.wikimedia.org/wiki/Special:FilePath/Argentine_Malbec.jpg",
  w10: "https://commons.wikimedia.org/wiki/Special:FilePath/Alsace_Riesling_2007.jpg",
  w11: "https://commons.wikimedia.org/wiki/Special:FilePath/Amphore_C%C3%B4tes_de_Provence_ros%C3%A9.JPG",
  w12: "https://commons.wikimedia.org/wiki/Special:FilePath/Champagne_bottle%2C_2015-%2801%29.jpg",
};

/** Fallback local asset keyed by category prefix letter */
const FALLBACK_BY_PREFIX: Record<string, string> = {
  b: beerImg,
  c: cocktailImg,
  s: whiskeyImg,
  w: wineImg,
};

const make = (
  id: string,
  name: string,
  base: number,
  spread = 0.22,
): Drink => ({
  id,
  name,
  base,
  min: Math.round(base * (1 - spread)),
  max: Math.round(base * (1 + spread)),
  image: DRINK_IMAGES[id] ?? FALLBACK_BY_PREFIX[id[0]] ?? beerImg,
  fallbackImage: FALLBACK_BY_PREFIX[id[0]] ?? beerImg,
});

export const CATEGORIES: Category[] = [
  {
    id: "beer",
    title: "Пиво",
    subtitle: "Draft & Bottled",
    items: [
      make("b1", "Heineken", 1900),
      make("b2", "Guinness Draught", 2400),
      make("b3", "Paulaner Weissbier", 2200),
      make("b4", "Corona Extra", 2100),
      make("b5", "Hoegaarden", 2000),
      make("b6", "Stella Artois", 1800),
      make("b7", "Leffe Blonde", 2300),
      make("b8", "Kozel Dark", 1600),
      make("b9", "Erdinger", 2500),
      make("b10", "Pilsner Urquell", 1700),
      make("b11", "Bud Light", 1400),
      make("b12", "Krombacher", 2050),
    ],
  },
  {
    id: "cocktails",
    title: "Коктейли",
    subtitle: "Signature Bar",
    items: [
      make("c1", "Whiskey Sour", 3200),
      make("c2", "Negroni", 3400),
      make("c3", "Old Fashioned", 3600),
      make("c4", "Aperol Spritz", 3000),
      make("c5", "Margarita", 3100),
      make("c6", "Espresso Martini", 3500),
      make("c7", "Mojito", 2800),
      make("c8", "Daiquiri", 2900),
      make("c9", "Cosmopolitan", 3050),
      make("c10", "Manhattan", 3700),
      make("c11", "Gin Tonic", 2600),
      make("c12", "Moscow Mule", 2950),
    ],
  },
  {
    id: "spirits",
    title: "Крепкий алкоголь",
    subtitle: "Whiskey & Rare Spirits",
    items: [
      make("s1", "Jameson", 2700),
      make("s2", "Chivas Regal 12", 4200),
      make("s3", "Jack Daniel's", 3100),
      make("s4", "Macallan 12", 8600),
      make("s5", "Hennessy VS", 5200),
      make("s6", "Glenfiddich 12", 5600),
      make("s7", "Bombay Sapphire", 2500),
      make("s8", "Beluga Noble", 3300),
      make("s9", "Bacardi Carta", 2400),
      make("s10", "Patrón Silver", 6100),
      make("s11", "Monkey Shoulder", 3900),
      make("s12", "Jägermeister", 2200),
    ],
  },
  {
    id: "wine",
    title: "Вино",
    subtitle: "Cellar Selection",
    items: [
      make("w1", "Chardonnay", 2900),
      make("w2", "Pinot Noir", 3600),
      make("w3", "Cabernet Sauvignon", 3800),
      make("w4", "Merlot", 3200),
      make("w5", "Sauvignon Blanc", 3000),
      make("w6", "Rioja Reserva", 4400),
      make("w7", "Prosecco", 3400),
      make("w8", "Chianti Classico", 4100),
      make("w9", "Malbec", 3300),
      make("w10", "Riesling", 2800),
      make("w11", "Rosé de Provence", 3500),
      make("w12", "Champagne Brut", 7800),
    ],
  },
];

export const ALL_ITEMS = CATEGORIES.flatMap((c) => c.items);

export const formatPrice = (value: number) =>
  `${Math.round(value).toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸`;