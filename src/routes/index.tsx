import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Flame,
  Minus,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Waves,
} from "lucide-react";

import type { PublicProduct } from "@/lib/api";
import {
  formatDiscount,
  formatPercent,
  formatPrice,
  discountPercent,
  roundTo10,
} from "@/lib/format";
import { resolveProductImage, resolveProductMeta, type ProductMeta } from "@/lib/products";
import { POLL_INTERVAL_MS, useExchangeData } from "@/hooks/useExchangeData";

export const Route = createFileRoute("/")({
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
        content: "Живые котировки напитков, обвалы рынка каждые 30 секунд и лучшие цены вечера.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const PAGE_MS = 5000;
const PAGE_SIZE = 4;

// ── Helpers ────────────────────────────────────────────────────────────────

function useClock(intervalMs = 1000): string {
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
    const id = setInterval(update, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return clock;
}

/** Live countdown (seconds) to a target ISO timestamp. */
function useCountdown(targetIso: string | null): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!targetIso) {
      setRemaining(null);
      return;
    }
    const target = new Date(targetIso).getTime();
    const update = () => setRemaining(Math.max(0, Math.ceil((target - Date.now()) / 1000)));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  return remaining;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatUpdated(epoch: number | null): string {
  if (!epoch) return "—";
  return new Date(epoch).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatCountdown(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Short, TV-friendly label for a round key like "2026-08-21-18-45-Asia-Almaty".
function roundLabel(roundKey: string | null | undefined): string {
  if (!roundKey) return "—";
  const parts = roundKey.split("-");
  // Expect ...-HH-MM-... : find the first purely-numeric HH pair.
  const hhIdx = parts.findIndex((p) => /^\d{2}$/.test(p));
  if (hhIdx >= 0 && parts[hhIdx + 1]) {
    return `${parts[hhIdx]}:${parts[hhIdx + 1]}`;
  }
  return roundKey;
}

// ── Price movement indicator ───────────────────────────────────────────────

type Trend = "up" | "down" | "flat";

function trendOf(product: PublicProduct): Trend {
  if (product.changePercent > 0.05) return "up";
  if (product.changePercent < -0.05) return "down";
  return "flat";
}

/**
 * Round-change badge. Uses the backend `changePercent` as the authoritative
 * round change when present (|changePercent| > 0.05). When the backend reports
 * `changePercent === 0` but a `previousPrice` exists, the value is still 0 —
 * no movement. When `previousPrice` is null, the product is in its first
 * published round and we show "Первый раунд" instead of a percentage.
 */
function RoundChange({ product }: { product: PublicProduct }) {
  const hasPrevious = product.previousPrice !== null && product.previousPrice !== undefined;
  const change = product.changePercent;
  const trend: Trend = change > 0.05 ? "up" : change < -0.05 ? "down" : "flat";

  if (!hasPrevious && Math.abs(change) < 0.05) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-base font-bold text-white/40 ring-1 ring-white/10">
        <Sparkles className="size-4" strokeWidth={2.5} />
        Первый раунд
      </span>
    );
  }

  const flat = trend === "flat";
  const tone = flat
    ? "bg-white/5 text-white/50 ring-white/10"
    : trend === "down"
      ? "bg-emerald-400/10 text-emerald-300 ring-emerald-300/20"
      : "bg-rose-400/10 text-rose-300 ring-rose-300/20";

  const Icon = flat ? Minus : trend === "down" ? ArrowDownRight : ArrowUpRight;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xl font-bold tabular-nums ring-1 ${tone}`}
    >
      <Icon className="size-5" strokeWidth={2.5} />
      {formatPercent(change)}
    </span>
  );
}

// ── Product card ───────────────────────────────────────────────────────────

export function ProductCard({ product }: { product: PublicProduct }) {
  const trend = trendOf(product);

  const current = roundTo10(product.price);
  const previousRaw = product.previousPrice ?? null;
  const previous = previousRaw === null ? null : roundTo10(previousRaw);

  // Read-only frontend metadata (originalPrice, minPrice, category).
  const meta: ProductMeta | undefined = useMemo(() => resolveProductMeta(product), [product]);

  // Image: slug → normalized name → category fallback. Always a valid src.
  const imageSrc = useMemo(() => resolveProductImage(product), [product]);

  // Discount from original price (independent from round changePercent).
  const discount = meta ? discountPercent(meta.originalPrice, product.price) : null;
  const isMinPrice = meta !== undefined && product.price <= meta.minPrice;

  // Controlled error: if the API price is not a finite number, show a
  // per-card error without breaking the rest of the grid.
  const priceValid = typeof product.price === "number" && Number.isFinite(product.price);

  let priceColor = "text-white/60"; // flat
  if (trend === "down") priceColor = "text-emerald-400";
  else if (trend === "up") priceColor = "text-rose-400";

  let cardClass = "border-white/10 bg-white/[0.04]";
  if (product.changePercent < -4) {
    cardClass = "border-green-500/20 bg-green-500/[0.03] shadow-[0_0_20px_rgba(34,197,94,0.08)]";
  } else if (product.changePercent > 4) {
    cardClass = "border-red-900/30 bg-black/40 shadow-[0_0_20px_rgba(239,68,68,0.08)]";
  }

  return (
    <div
      className={`relative flex items-center gap-5 overflow-hidden rounded-2xl border px-5 py-4 backdrop-blur-2xl transition-all duration-700 ${cardClass}`}
    >
      {/* Product image — always a valid local static import. */}
      <div className="relative z-10 flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.05] ring-1 ring-white/10">
        <img
          src={imageSrc}
          alt={product.name}
          className="size-full object-cover"
          loading="lazy"
          // Prevent any broken-image icon from ever showing — if the static
          // import somehow fails, hide the img element gracefully.
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
          }}
        />
      </div>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex items-baseline gap-3">
          <p className="truncate text-2xl font-bold tracking-tight text-white/90">{product.name}</p>
          {product.category ? (
            <span className="shrink-0 text-sm font-semibold uppercase tracking-wide text-white/30">
              {product.category}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-4">
            {priceValid ? (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={current}
                  initial={{ opacity: 0, y: previous !== null && current < previous ? -8 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: previous !== null && current < previous ? 8 : -8 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className={`text-3xl font-extrabold leading-none tabular-nums tracking-tight ${priceColor}`}
                >
                  {formatPrice(product.price)}
                </motion.span>
              </AnimatePresence>
            ) : (
              <span className="text-xl font-bold text-rose-300/80">Цена недоступна</span>
            )}

            {/* Original (menu) price — only when we have static metadata. */}
            {meta && (
              <span className="text-lg font-semibold tabular-nums text-white/35">
                обычная {formatPrice(meta.originalPrice)}
              </span>
            )}
          </div>

          <RoundChange product={product} />
        </div>

        {/* Discount + min-price badges row. */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {discount !== null && (
            <span
              className={`inline-flex items-center rounded-full px-3 py-0.5 text-base font-bold tabular-nums ring-1 ${
                discount > 0
                  ? "bg-emerald-400/10 text-emerald-300 ring-emerald-300/20"
                  : discount < 0
                    ? "bg-rose-400/10 text-rose-300 ring-rose-300/20"
                    : "bg-white/5 text-white/50 ring-white/10"
              }`}
            >
              {discount > 0
                ? `Скидка ${formatDiscount(discount)}`
                : discount < 0
                  ? `Наценка ${formatDiscount(discount)}`
                  : "0%"}
            </span>
          )}

          {isMinPrice && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-3 py-0.5 text-base font-bold text-amber-200 ring-1 ring-amber-300/30">
              <Flame className="size-4" strokeWidth={2.5} />
              Минимальная цена
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Ticker (bottom marquee) — derived from real data ───────────────────────

function Ticker({
  products,
  roundOpen,
  countdownLabel,
}: {
  products: PublicProduct[];
  roundOpen: boolean;
  countdownLabel: string;
}) {
  const items = useMemo(() => {
    // Do not filter by `isAvailable` — the exchange is autonomous from iiko at
    // this stage, so every published product is shown. Sort by changePercent
    // to surface the top gainer / loser for the marquee.
    const sorted = [...products].sort((a, b) => b.changePercent - a.changePercent);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];

    const line: { icon: typeof Sparkles; content: string }[] = [];
    if (!roundOpen) {
      line.push({
        icon: Clock,
        content: `БИРЖА СКОРО ОТКРОЕТСЯ — СЛЕДУЮЩИЙ РАУНД ЧЕРЕЗ ${countdownLabel}`,
      });
    } else {
      line.push({ icon: Sparkles, content: "XOXO EXCHANGE — ЖИВЫЕ ЦЕНЫ БАРА" });
    }
    if (top && top.changePercent > 0) {
      line.push({
        icon: ArrowUpRight,
        content: `${top.name.toUpperCase()} +${top.changePercent.toFixed(1)}% — РОСТ`,
      });
    }
    if (bottom && bottom.changePercent < 0) {
      line.push({
        icon: ArrowDownRight,
        content: `${bottom.name.toUpperCase()} ${bottom.changePercent.toFixed(1)}% — ВЫГОДНО`,
      });
    }
    if (line.length < 3) {
      line.push({ icon: Waves, content: "СЛЕДИТЕ ЗА КОТИРОВКАМИ НА ЭКРАНЕ" });
    }
    return line;
  }, [products, roundOpen, countdownLabel]);

  const line = [...items, ...items, ...items];

  return (
    <div className="relative overflow-hidden border-t border-white/10 bg-white/[0.04] py-2.5 backdrop-blur-2xl">
      <motion.div
        className="flex w-max items-center gap-12 whitespace-nowrap"
        animate={{ x: ["0%", "-33.333%"] }}
        transition={{ duration: 38, ease: "linear", repeat: Infinity }}
      >
        {line.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-3 text-lg font-bold uppercase tracking-[0.18em] text-white/40"
          >
            <item.icon className="size-5 text-amber-200/50" strokeWidth={2.5} />
            {item.content}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ── Full-screen states ─────────────────────────────────────────────────────

function CenteredMessage({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: typeof RefreshCw;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-10 text-center">
      <Icon className="size-12 text-white/40" strokeWidth={2} />
      <p className="text-3xl font-extrabold tracking-tight text-white/90">{title}</p>
      {subtitle ? <p className="max-w-xl text-lg font-semibold text-white/45">{subtitle}</p> : null}
      {action}
    </div>
  );
}

/** Always display a 2×2 grid optimized for TV */
function gridClasses(): string {
  return "grid-cols-2 grid-rows-2";
}

// ── Page component ─────────────────────────────────────────────────────────

function Index() {
  const { data, isLoading, isRefreshing, error, isStale, lastUpdatedAt, retry } = useExchangeData();

  const [pageIndex, setPageIndex] = useState(0);
  const pageIndexRef = useRef(pageIndex);
  useEffect(() => {
    pageIndexRef.current = pageIndex;
  }, [pageIndex]);

  const products = data?.products ?? [];
  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));

  // Reset page when the product set changes length to avoid out-of-range pages.
  useEffect(() => {
    setPageIndex(0);
  }, [products.length]);

  useEffect(() => {
    if (products.length === 0) return;
    const id = setInterval(() => {
      setPageIndex((prev) => (prev + 1) % totalPages);
    }, PAGE_MS);
    return () => clearInterval(id);
  }, [products.length, totalPages]);

  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const visibleItems = products.slice(safePageIndex * PAGE_SIZE, (safePageIndex + 1) * PAGE_SIZE);

  const clock = useClock(10000);
  const roundOpen = data?.roundStatus === "ok" && (data?.round ?? null) !== null;
  const nextStartsAt = data?.nextRound?.startsAt ?? null;
  const countdown = useCountdown(nextStartsAt);
  const countdownLabel = formatCountdown(countdown);

  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#07080c] font-display text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_15%_-10%,rgba(120,140,190,0.22),transparent_60%),radial-gradient(90%_70%_at_100%_110%,rgba(190,150,110,0.14),transparent_60%)]" />

      <header className="relative z-30 flex items-center justify-between px-10 pt-4 pb-3">
        <div className="flex items-baseline gap-5">
          <h1 className="text-3xl font-extrabold tracking-tight">
            XOXO <span className="text-white/45">Exchange</span>
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-0.5 text-xs font-bold uppercase tracking-[0.24em] text-white/50 backdrop-blur-xl">
            {isRefreshing ? <RefreshCw className="size-3 animate-spin" strokeWidth={3} /> : null}
            Live
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm font-semibold text-white/55">
          <RoundBadge
            roundKey={data?.round?.roundKey ?? null}
            roundOpen={roundOpen}
            endsAt={data?.round?.endsAt ?? null}
            countdownLabel={countdownLabel}
          />
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 tabular-nums">
            обн. {formatUpdated(lastUpdatedAt)}
          </span>
          <span className="ml-1 text-xl font-extrabold tabular-nums text-white/70">{clock}</span>
        </div>
      </header>

      <AnimatePresence>
        {isStale ? (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-30 mx-10 mb-2 flex items-center justify-between gap-3 rounded-xl border border-amber-300/25 bg-amber-400/10 px-4 py-2 backdrop-blur-2xl"
          >
            <p className="text-base font-bold text-amber-100/90">
              Данные не обновлены — показаны последние полученные котировки.
            </p>
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-2 rounded-full bg-amber-300/15 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-amber-100 ring-1 ring-amber-300/30 transition-colors hover:bg-amber-300/25"
            >
              <RefreshCw className="size-4" strokeWidth={2.5} />
              Повторить
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <section className="relative z-10 min-h-0 flex-1 px-10 pb-4">
        {isLoading ? (
          <CenteredMessage
            icon={RefreshCw}
            title="Загрузка биржи…"
            subtitle="Получаем живые котировки напитков"
          />
        ) : error && !data ? (
          <CenteredMessage
            icon={TrendingDown}
            title="Биржа недоступна"
            subtitle={error}
            action={
              <button
                type="button"
                onClick={retry}
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-2.5 text-base font-bold text-white ring-1 ring-white/20 transition-colors hover:bg-white/20"
              >
                <RefreshCw className="size-5" strokeWidth={2.5} />
                Повторить запрос
              </button>
            }
          />
        ) : products.length === 0 ? (
          <CenteredMessage
            icon={Clock}
            title="Биржа скоро откроется"
            subtitle={
              roundOpen
                ? "Активные котировки появятся с началом раунда"
                : `Следующий раунд через ${countdownLabel}`
            }
          />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={safePageIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="flex h-full flex-col"
            >
              <div className="mb-3 flex items-center gap-4">
                <h2 className="text-2xl font-extrabold tracking-tight text-white/90">
                  {roundOpen ? "Живые котировки" : "Биржевое меню"}
                </h2>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/30">
                  Round {roundLabel(data?.round?.roundKey ?? null)}
                </p>
                {totalPages > 1 && (
                  <div className="ml-auto flex items-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <span
                        key={i}
                        className={`block size-2 rounded-full transition-all duration-500 ${
                          i === safePageIndex ? "bg-white/70 scale-125" : "bg-white/20"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className={`grid min-h-0 flex-1 gap-4 ${gridClasses()}`}>
                {visibleItems.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </section>

      <div className="relative z-30">
        <Ticker products={products} roundOpen={roundOpen} countdownLabel={countdownLabel} />
      </div>
    </main>
  );
}

function RoundBadge({
  roundKey,
  roundOpen,
  endsAt,
  countdownLabel,
}: {
  roundKey: string | null;
  roundOpen: boolean;
  endsAt: string | null;
  countdownLabel: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
      {roundOpen ? (
        <>
          <Flame className="size-4 text-amber-200/80" strokeWidth={2.5} />
          <span className="tabular-nums">
            Раунд {roundLabel(roundKey)} · до {formatTime(endsAt)}
          </span>
        </>
      ) : (
        <>
          <Clock className="size-4 text-white/50" strokeWidth={2.5} />
          <span className="tabular-nums">След. раунд через {countdownLabel}</span>
        </>
      )}
    </span>
  );
}
