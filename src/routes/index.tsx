import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Flame,
  Minus,
  Sparkles,
  Tag,
  TrendingDown,
  Waves,
} from "lucide-react";

import { ALL_ITEMS, CATEGORIES, formatPrice, roundTo10, type Drink } from "@/lib/market";

export const Route = createFileRoute("/")(  {
  head: () => ({
    meta: [
      { title: "XOXO Exchange — живые цены бара" },
      {
        name: "description",
        content:
          "TV-дашборд алкогольной биржи: живые цены на разливные напитки, пиво, крепкий алкоголь и коктейли, обвалы рынка и лучшие предложения бара.",
      },
      { property: "og:title", content: "XOXO Exchange — живые цены бара" },
      {
        property: "og:description",
        content:
          "Живые котировки напитков, обвалы рынка каждые 30 секунд и лучшие цены вечера.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TICK_MS = 4000;
const ROTATE_MS = 15000;
const CRASH_EVERY_MS = 30000;
const CRASH_DURATION_MS = 8000;

type Quote = { price: number; prev: number; history: number[] };

const initialQuotes = (): Record<string, Quote> =>
  Object.fromEntries(
    ALL_ITEMS.map((d) => [d.id, { price: d.base, prev: d.base, history: Array(20).fill(d.base) }])
  );

function nextPrice(drink: Drink, current: number) {
  const swing = (drink.max - drink.min) * 0.18;
  const pull = (drink.base - current) * 0.15;
  const raw = current + pull + (Math.random() - 0.5) * 2 * swing;
  return Math.min(drink.max, Math.max(drink.min, Math.round(raw)));
}

function useMarket() {
  const [quotes, setQuotes] = useState<Record<string, Quote>>(initialQuotes);
  const [crashing, setCrashing] = useState(false);
  const [msToCrash, setMsToCrash] = useState(CRASH_EVERY_MS);
  const crashingRef = useRef(false);

  useEffect(() => {
    crashingRef.current = crashing;
  }, [crashing]);

  useEffect(() => {
    const tick = setInterval(() => {
      if (crashingRef.current) return;
      setQuotes((prev) => {
        const next: Record<string, Quote> = {};
        for (const drink of ALL_ITEMS) {
          const cur = prev[drink.id]!.price;
          const hist = prev[drink.id]!.history;
          const nextPr = nextPrice(drink, cur);
          next[drink.id] = { price: nextPr, prev: cur, history: [...hist.slice(-19), nextPr] };
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const start = Date.now();
    const countdown = setInterval(() => {
      const elapsed = (Date.now() - start) % CRASH_EVERY_MS;
      setMsToCrash(CRASH_EVERY_MS - elapsed);
    }, 250);

    const crash = setInterval(() => {
      setCrashing(true);
      setQuotes((prev) => {
        const next: Record<string, Quote> = {};
        for (const drink of ALL_ITEMS) {
          const hist = prev[drink.id]!.history;
          next[drink.id] = { price: drink.min, prev: prev[drink.id]!.price, history: [...hist.slice(-19), drink.min] };
        }
        return next;
      });
      setTimeout(() => setCrashing(false), CRASH_DURATION_MS);
    }, CRASH_EVERY_MS);

    return () => {
      clearInterval(countdown);
      clearInterval(crash);
    };
  }, []);

  return { quotes, crashing, secondsToCrash: Math.ceil(msToCrash / 1000) };
}

// ── Hot-deal hook ─────────────────────────────────────────────────────────────
const HOT_DEAL_ROTATE_MS = 20000;

type HotDeal = {
  drink: Drink;
  ordersLeft: number;
  price: number;
};

function pickHotDeal(quotes: Record<string, Quote>): HotDeal {
  // collect all drinks that are at or very close to their minimum price
  const candidates = ALL_ITEMS.filter((d) => {
    const q = quotes[d.id];
    return q && q.price <= d.min * 1.05;
  });
  const pool = candidates.length > 0 ? candidates : ALL_ITEMS;
  const drink = pool[Math.floor(Math.random() * pool.length)]!;
  return {
    drink,
    ordersLeft: 2 + Math.floor(Math.random() * 4), // 2–5
    price: quotes[drink.id]?.price ?? drink.min,
  };
}

function useHotDeal(quotes: Record<string, Quote>) {
  const [deal, setDeal] = useState<HotDeal | null>(null);
  const quotesRef = useRef(quotes);

  useEffect(() => {
    quotesRef.current = quotes;
  }, [quotes]);

  useEffect(() => {
    // slight delay on first mount so prices have ticked at least once
    const init = setTimeout(() => setDeal(pickHotDeal(quotesRef.current)), 800);
    const rotate = setInterval(
      () => setDeal(pickHotDeal(quotesRef.current)),
      HOT_DEAL_ROTATE_MS,
    );
    return () => {
      clearTimeout(init);
      clearInterval(rotate);
    };
  }, []);

  return deal;
}

// ── Hot-deal banner component ──────────────────────────────────────────────────
function HotDealBanner({ deal }: { deal: HotDeal }) {
  return (
    <motion.div
      key={deal.drink.id}
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-30 mx-10 mb-4 flex items-center gap-5 overflow-hidden rounded-2xl border border-amber-300/25 bg-amber-400/10 px-5 py-3 backdrop-blur-2xl shadow-[0_0_40px_rgba(251,191,36,0.15)]"
    >
      {/* subtle glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_0%_50%,rgba(251,191,36,0.12),transparent_70%)]" />

      {/* drink photo */}
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.06] ring-1 ring-amber-200/20">
        <img
          src={deal.drink.image}
          alt={deal.drink.name}
          loading="lazy"
          width={112}
          height={112}
          onError={(e) => {
            const t = e.currentTarget;
            if (t.src !== deal.drink.fallbackImage) t.src = deal.drink.fallbackImage;
          }}
          className="h-full w-full object-cover"
        />
      </div>

      {/* tag icon */}
      <Tag className="size-6 shrink-0 text-amber-200/80" strokeWidth={2.5} />

      {/* text block */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-lg font-extrabold uppercase tracking-[0.14em] text-amber-100/90">
          {deal.drink.name}
        </p>
        <p className="text-sm font-semibold text-amber-200/60">
          Минимальная цена вечера
        </p>
      </div>

      {/* price */}
      <p className="shrink-0 text-2xl font-extrabold tabular-nums text-white">
        {formatPrice(deal.price)}
      </p>

      {/* orders-left badge */}
      <div
        className="shrink-0 flex items-center gap-2 rounded-full bg-amber-300/15 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.08em] text-amber-100 ring-1 ring-amber-300/30 animate-pulse"
        style={{ animationDuration: "3.5s" }}
      >
        <Clock className="size-4 opacity-80" strokeWidth={2} />
        <span>Осталось {deal.ordersLeft} порции</span>
      </div>
    </motion.div>
  );
}

function Delta({ price, prev }: { price: number; prev: number }) {
  const diff = price - prev;
  const pct = prev === 0 ? 0 : (diff / prev) * 100;
  const flat = Math.abs(pct) < 0.05;

  const tone = flat
    ? "bg-white/5 text-white/50 ring-white/10"
    : diff < 0
      ? "bg-emerald-400/10 text-emerald-300 ring-emerald-300/20"
      : "bg-rose-400/10 text-rose-300 ring-rose-300/20";

  const Icon = flat ? Minus : diff < 0 ? ArrowDownRight : ArrowUpRight;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xl font-bold tabular-nums ring-1 ${tone}`}
    >
      <Icon className="size-5" strokeWidth={2.5} />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function Sparkline({ history, diff }: { history: number[]; diff: number }) {
  if (history.length < 2) return null;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const width = 200;
  const height = 50;

  const points = history.map((val, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return [x, y];
  });

  let path = `M ${points[0][0]},${points[0][1]} `;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const cpx1 = p0[0] + (p1[0] - p0[0]) / 2;
    const cpy1 = p0[1];
    const cpx2 = p0[0] + (p1[0] - p0[0]) / 2;
    const cpy2 = p1[1];
    path += `C ${cpx1},${cpy1} ${cpx2},${cpy2} ${p1[0]},${p1[1]} `;
  }

  const strokeColor =
    diff < 0
      ? "stroke-green-400"
      : diff > 0
        ? "stroke-red-400"
        : "stroke-white/30";

  return (
    <div className="pointer-events-none absolute inset-0 z-0 opacity-5">
      <svg
        preserveAspectRatio="none"
        viewBox={`0 -5 ${width} ${height + 10}`}
        className="h-full w-full"
      >
        <path
          d={path}
          fill="none"
          className={strokeColor}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/**
 * DrinkCard — shows original price (strikethrough) and current exchange price
 * with trend color indication. Price rounded to nearest 10.
 */
function DrinkCard({ drink, quote }: { drink: Drink; quote: Quote }) {
  const atFloor = quote.price <= drink.min * 1.02;
  const diff = quote.price - quote.prev;
  const pct = quote.prev === 0 ? 0 : (diff / quote.prev) * 100;

  // Compare current exchange price vs original price for trend color of the new price
  const exchangePrice = roundTo10(quote.price);
  const originalPrice = roundTo10(drink.originalPrice);
  const priceDiffFromOriginal = exchangePrice - originalPrice;

  // Determine trend color for the exchange price text
  let exchangePriceColor = "text-white/60"; // flat
  if (priceDiffFromOriginal < 0) {
    exchangePriceColor = "text-emerald-400"; // cheaper = green
  } else if (priceDiffFromOriginal > 0) {
    exchangePriceColor = "text-rose-400"; // more expensive = red
  }

  let cardClass = "border-white/10 bg-white/[0.04]";
  if (pct < -4) {
    cardClass = "border-green-500/20 bg-green-500/[0.03] shadow-[0_0_20px_rgba(34,197,94,0.08)]";
  } else if (pct > 4) {
    cardClass = "border-red-900/30 bg-black/40 shadow-[0_0_20px_rgba(239,68,68,0.08)]";
  }

  return (
    <div
      className={`relative flex items-center gap-4 overflow-hidden rounded-2xl border px-4 py-3 backdrop-blur-2xl transition-all duration-700 ${cardClass}`}
    >
      <Sparkline history={quote.history} diff={diff} />
      <div className="relative z-10 flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.05] ring-1 ring-white/10">
        <img
          src={drink.image}
          alt={drink.name}
          loading="lazy"
          width={128}
          height={128}
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src !== drink.fallbackImage) {
              target.src = drink.fallbackImage;
            }
          }}
          className="h-full w-full object-cover drop-shadow-[0_6px_16px_rgba(0,0,0,0.55)]"
        />
      </div>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex items-center gap-2">
          <p className="truncate text-xl font-bold tracking-tight text-white/90">
            {drink.name}
          </p>
          {atFloor ? (
            <span
              title="Минимальная цена"
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-300/10 text-amber-200/90 ring-1 ring-amber-200/20"
            >
              <Flame className="size-4" strokeWidth={2.5} />
            </span>
          ) : null}
        </div>

        {/* Price block: original (strikethrough) + exchange price with trend color */}
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-4">
            {/* Original price - strikethrough */}
            <span className="text-3xl font-black tabular-nums text-white/80 line-through decoration-red-500/70 decoration-[3px]">
              {formatPrice(drink.originalPrice)}
            </span>
            {/* Exchange price - colored by trend */}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={exchangePrice}
                initial={{ opacity: 0, y: exchangePrice < roundTo10(quote.prev) ? -8 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: exchangePrice < roundTo10(quote.prev) ? 8 : -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={`text-2xl font-bold leading-none tabular-nums tracking-tight ${exchangePriceColor}`}
              >
                {formatPrice(quote.price)}
              </motion.span>
            </AnimatePresence>
          </div>
          <Delta price={quote.price} prev={quote.prev} />
        </div>
      </div>
    </div>
  );
}

function Ticker({
  crashing,
  secondsToCrash,
}: {
  crashing: boolean;
  secondsToCrash: number;
}) {
  const items = useMemo(
    () => [
      { icon: Flame, content: "ОСТАЛОСЬ 5 ПОРЦИЙ MILLER ПО МИНИМУМУ" },
      {
        icon: Waves,
        content: crashing ? (
          "ОБВАЛ РЫНКА ИДЁТ ПРЯМО СЕЙЧАС — БЕРИТЕ, ПОКА ДЁШЕВО"
        ) : (
          <>
            ОБВАЛ РЫНКА ЧЕРЕЗ{" "}
            <motion.span
              key={secondsToCrash}
              animate={secondsToCrash <= 5 ? { scale: [1.05, 1] } : { scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`inline-block font-mono tabular-nums transition-colors duration-500 ${
                secondsToCrash <= 10 ? "text-amber-400" : "text-white/40"
              }`}
            >
              {secondsToCrash}
            </motion.span>{" "}
            СЕК.
          </>
        ),
      },
      { icon: ArrowUpRight, content: "REDBULL + VODKA БЬЁТ РЕКОРДЫ ПРОДАЖ" },
      { icon: TrendingDown, content: "MOJITO УПАЛ НА 14% ЗА ПОСЛЕДНИЕ 10 МИНУТ" },
      { icon: Sparkles, content: "CHIVAS REGAL — ЛОТ ВЕЧЕРА НА БАРНОЙ БИРЖЕ" },
    ],
    [crashing, secondsToCrash],
  );

  const line = [...items, ...items];

  return (
    <div className="relative overflow-hidden border-t border-white/10 bg-white/[0.04] py-5 backdrop-blur-2xl">
      <motion.div
        className="flex w-max items-center gap-20 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 38, ease: "linear", repeat: Infinity }}
      >
        {line.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-4 text-3xl font-bold uppercase tracking-[0.22em] text-white/40"
          >
            <item.icon className="size-7 text-amber-200/50" strokeWidth={2.5} />
            {item.content}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/** Compute grid classes based on item count */
function gridClasses(itemCount: number): string {
  if (itemCount <= 2) return "grid-cols-2 grid-rows-1";
  if (itemCount <= 4) return "grid-cols-2 grid-rows-2";
  if (itemCount <= 6) return "grid-cols-3 grid-rows-2";
  if (itemCount <= 9) return "grid-cols-3 grid-rows-3";
  return "grid-cols-3 grid-rows-4";
}

function Index() {
  const { quotes, crashing, secondsToCrash } = useMarket();
  const hotDeal = useHotDeal(quotes);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % CATEGORIES.length), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const category = CATEGORIES[index]!;
  const [clock, setClock] = useState("");
  useEffect(() => {
    const update = () =>
      setClock(
        new Date().toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#07080c] font-display text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_15%_-10%,rgba(120,140,190,0.22),transparent_60%),radial-gradient(90%_70%_at_100%_110%,rgba(190,150,110,0.14),transparent_60%)]" />

      <AnimatePresence>
        {crashing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(190,70,90,0.28),rgba(20,6,10,0.55))] backdrop-blur-[2px]"
          />
        ) : null}
      </AnimatePresence>

      <header className="relative z-30 flex items-center justify-between px-10 pt-8 pb-5">
        <div className="flex items-baseline gap-5">
          <h1 className="text-4xl font-extrabold tracking-tight">
            XOXO <span className="text-white/45">Exchange</span>
          </h1>
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-1 text-sm font-bold uppercase tracking-[0.24em] text-white/50 backdrop-blur-xl">
            Live
          </span>
        </div>

        <div className="flex items-center gap-3">
          {CATEGORIES.map((c, i) => (
            <span
              key={c.id}
              className={`rounded-full border px-4 py-1.5 text-base font-bold tracking-wide transition-colors duration-500 ${
                i === index
                  ? "border-white/20 bg-white/[0.10] text-white/90"
                  : "border-white/5 bg-white/[0.03] text-white/30"
              }`}
            >
              {c.title}
            </span>
          ))}
          <span className="ml-4 text-2xl font-extrabold tabular-nums text-white/70">
            {clock}
          </span>
        </div>
      </header>

      <AnimatePresence>
        {crashing ? (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-30 mx-10 mb-4 flex items-center justify-center gap-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 py-4 backdrop-blur-2xl"
          >
            <TrendingDown className="size-8 text-rose-200/90" strokeWidth={2.5} />
            <p className="text-3xl font-extrabold tracking-[0.06em] text-rose-100/95">
              ОБВАЛ РЫНКА! ВСЕ ЦЕНЫ СНИЖЕНЫ
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Hot-deal banner — hidden during full market crash (all prices already minimum) */}
      <AnimatePresence>
        {!crashing && hotDeal ? (
          <HotDealBanner deal={hotDeal} />
        ) : null}
      </AnimatePresence>

      <section className="relative z-10 min-h-0 flex-1 px-10 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={category.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="flex h-full flex-col"
          >
            <div className="mb-4 flex items-baseline gap-4">
              <h2 className="text-3xl font-extrabold tracking-tight text-white/90">
                {category.title}
              </h2>
              <p className="text-base font-semibold uppercase tracking-[0.24em] text-white/30">
                {category.subtitle}
              </p>
            </div>

            <div className={`grid min-h-0 flex-1 gap-3 ${gridClasses(category.items.length)}`}>
              {category.items.slice(0, 12).map((drink) => (
                <DrinkCard key={drink.id} drink={drink} quote={quotes[drink.id]!} />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      <div className="relative z-30">
        <Ticker crashing={crashing} secondsToCrash={secondsToCrash} />
      </div>
    </main>
  );
}
