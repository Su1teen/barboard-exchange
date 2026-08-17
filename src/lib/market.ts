import beerImg from "@/assets/beer.png";
import cocktailImg from "@/assets/cocktail.png";
import whiskeyImg from "@/assets/whiskey.png";
import wineImg from "@/assets/wine.png";

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
import monkeyshoulderImg from "@/assets/images/monkeyshoulder.jpg";
import nemiroffImg from "@/assets/images/nemoriff.jpg";
import okheartImg from "@/assets/images/okheart.jpg";
import redbullvodkaImg from "@/assets/images/rebullvodka.jpg";
import tsingtaoImg from "@/assets/images/tsintao.jpg";

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

const DRINK_IMAGES: Record<string, string> = {
  d1: germanImg,
  d2: millerImg,
  d3: beefeaterImg,
  d4: jagermeisterImg,
  d5: okheartImg,
  d6: bacardiImg,
  d7: ballantinesImg,
  d8: jamesonImg,
  d9: chivasImg,
  d10: monkeyshoulderImg,
  d11: absolutImg,
  d12: nemiroffImg,

  s1: "https://images.unsplash.com/photo-1607622750671-6cd9a99eabd1?w=400&h=400&fit=crop", // Хортица Айс
  s2: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400&h=400&fit=crop", // Кызылжар

  b1: millerImg,
  b2: budsImg,
  b3: coronaImg,
  b4: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Paulaner_Hefe-Weissbier.JPG/200px-Paulaner_Hefe-Weissbier.JPG", // Paulaner
  b5: tsingtaoImg,
  b6: hoegaardenImg,

  c1: redbullvodkaImg,
  c2: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=400&fit=crop", // Redbull Jäger
  c3: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&h=400&fit=crop", // Redbull Whisky
  c4: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Gin_and_Tonic_with_ingredients.jpg/440px-Gin_and_Tonic_with_ingredients.jpg", // Gin Tonic
  c5: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=400&h=400&fit=crop", // Long Island
  c6: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Whiskey_Sour.jpg/440px-Whiskey_Sour.jpg", // Whisky Sour
  c7: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Mojito98.jpg/440px-Mojito98.jpg", // Mojito
};

const FALLBACK_BY_PREFIX: Record<string, string> = {
  d: whiskeyImg,
  s: whiskeyImg,
  b: beerImg,
  c: cocktailImg,
};

const make = (
  id: string,
  name: string,
  min: number,
  base: number,
  originalPrice: number,
): Drink => ({
  id,
  name,
  min,
  base,
  originalPrice,
  max: originalPrice,
  image: DRINK_IMAGES[id] ?? FALLBACK_BY_PREFIX[id[0]] ?? beerImg,
  fallbackImage: FALLBACK_BY_PREFIX[id[0]] ?? beerImg,
});

export const CATEGORIES: Category[] = [
  {
    id: "draft",
    title: "Разливные напитки",
    subtitle: "Draft & Spirits",
    items: [
      make("d1", "Немецкое разливное", 790, 1030, 1340),
      make("d2", "Miller разливное", 1190, 1790, 2260),
      make("d3", "Beefeater Gin", 1590, 2230, 2860),
      make("d4", "Jägermeister", 1590, 1910, 2540),
      make("d5", "Orchard", 1590, 2860, 3500),
      make("d6", "Bacardi", 1190, 1610, 2020),
      make("d7", "Ballantine's", 1590, 2540, 3180),
      make("d8", "Jameson", 1590, 2390, 3020),
      make("d9", "Chivas Regal", 2590, 3370, 4140),
      make("d13", "Jack Daniels", 2590, 4400, 5180),
      make("d10", "Monkey Shoulder", 2990, 4190, 5380),
      make("d11", "Absolut", 990, 1290, 1580),
      make("d12", "Nemiroff", 890, 1340, 1690),
    ],
  },
  {
    id: "spirits",
    title: "Крепкий алкоголь",
    subtitle: "Vodka & Spirits",
    items: [
      make("s1", "Хортица Айс", 590, 940, 1180),
      make("s2", "Кызылжар", 590, 830, 1060),
    ],
  },
  {
    id: "beer",
    title: "Бутылочное пиво",
    subtitle: "Bottled Beer",
    items: [
      make("b1", "Miller", 990, 1390, 1880),
      make("b2", "Bud", 990, 1490, 1980),
      make("b3", "Corona Extra", 2590, 3370, 4140),
      make("b4", "Paulaner", 1990, 2990, 3580),
      make("b5", "Tsingtao", 1990, 2790, 3780),
      make("b6", "Hoegaarden", 1990, 3180, 3980),
    ],
  },
  {
    id: "cocktails",
    title: "Коктейли",
    subtitle: "Signature Bar",
    items: [
      make("c1", "Redbull + Vodka", 2190, 2850, 3500),
      make("c2", "Redbull + Jäger", 2190, 3070, 3940),
      make("c4", "Gin Tonic", 2190, 3290, 4160),
      make("c3", "Redbull + Whisky", 2190, 3500, 4380),
      make("c7", "Mojito", 1890, 2650, 3400),
      make("c5", "Long Island", 2490, 3240, 4230),
      make("c6", "Whisky Sour", 2190, 3290, 4160),
    ],
  },
];

export const ALL_ITEMS = CATEGORIES.flatMap((c) => c.items);

export const roundTo10 = (value: number): number =>
  Math.round(value / 10) * 10;

export const formatPrice = (value: number) =>
  `${roundTo10(value).toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸`;