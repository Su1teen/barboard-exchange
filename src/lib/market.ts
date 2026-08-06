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
};

export type Category = {
  id: string;
  title: string;
  subtitle: string;
  items: Drink[];
};

const make = (
  id: string,
  name: string,
  base: number,
  image: string,
  spread = 0.22,
): Drink => ({
  id,
  name,
  base,
  min: Math.round(base * (1 - spread)),
  max: Math.round(base * (1 + spread)),
  image,
});

export const CATEGORIES: Category[] = [
  {
    id: "beer",
    title: "Пиво",
    subtitle: "Draft & Bottled",
    items: [
      make("b1", "Heineken", 1900, beerImg),
      make("b2", "Guinness Draught", 2400, beerImg),
      make("b3", "Paulaner Weissbier", 2200, beerImg),
      make("b4", "Corona Extra", 2100, beerImg),
      make("b5", "Hoegaarden", 2000, beerImg),
      make("b6", "Stella Artois", 1800, beerImg),
      make("b7", "Leffe Blonde", 2300, beerImg),
      make("b8", "Kozel Dark", 1600, beerImg),
      make("b9", "Erdinger", 2500, beerImg),
      make("b10", "Pilsner Urquell", 1700, beerImg),
      make("b11", "Bud Light", 1400, beerImg),
      make("b12", "Krombacher", 2050, beerImg),
    ],
  },
  {
    id: "cocktails",
    title: "Коктейли",
    subtitle: "Signature Bar",
    items: [
      make("c1", "Whiskey Sour", 3200, cocktailImg),
      make("c2", "Negroni", 3400, cocktailImg),
      make("c3", "Old Fashioned", 3600, cocktailImg),
      make("c4", "Aperol Spritz", 3000, cocktailImg),
      make("c5", "Margarita", 3100, cocktailImg),
      make("c6", "Espresso Martini", 3500, cocktailImg),
      make("c7", "Mojito", 2800, cocktailImg),
      make("c8", "Daiquiri", 2900, cocktailImg),
      make("c9", "Cosmopolitan", 3050, cocktailImg),
      make("c10", "Manhattan", 3700, cocktailImg),
      make("c11", "Gin Tonic", 2600, cocktailImg),
      make("c12", "Moscow Mule", 2950, cocktailImg),
    ],
  },
  {
    id: "spirits",
    title: "Крепкий алкоголь",
    subtitle: "Whiskey & Rare Spirits",
    items: [
      make("s1", "Jameson", 2700, whiskeyImg),
      make("s2", "Chivas Regal 12", 4200, whiskeyImg),
      make("s3", "Jack Daniel's", 3100, whiskeyImg),
      make("s4", "Macallan 12", 8600, whiskeyImg),
      make("s5", "Hennessy VS", 5200, whiskeyImg),
      make("s6", "Glenfiddich 12", 5600, whiskeyImg),
      make("s7", "Bombay Sapphire", 2500, whiskeyImg),
      make("s8", "Beluga Noble", 3300, whiskeyImg),
      make("s9", "Bacardi Carta", 2400, whiskeyImg),
      make("s10", "Patrón Silver", 6100, whiskeyImg),
      make("s11", "Monkey Shoulder", 3900, whiskeyImg),
      make("s12", "Jägermeister", 2200, whiskeyImg),
    ],
  },
  {
    id: "wine",
    title: "Вино",
    subtitle: "Cellar Selection",
    items: [
      make("w1", "Chardonnay", 2900, wineImg),
      make("w2", "Pinot Noir", 3600, wineImg),
      make("w3", "Cabernet Sauvignon", 3800, wineImg),
      make("w4", "Merlot", 3200, wineImg),
      make("w5", "Sauvignon Blanc", 3000, wineImg),
      make("w6", "Rioja Reserva", 4400, wineImg),
      make("w7", "Prosecco", 3400, wineImg),
      make("w8", "Chianti Classico", 4100, wineImg),
      make("w9", "Malbec", 3300, wineImg),
      make("w10", "Riesling", 2800, wineImg),
      make("w11", "Rosé de Provence", 3500, wineImg),
      make("w12", "Champagne Brut", 7800, wineImg),
    ],
  },
];

export const ALL_ITEMS = CATEGORIES.flatMap((c) => c.items);

export const formatPrice = (value: number) =>
  `${Math.round(value).toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸`;