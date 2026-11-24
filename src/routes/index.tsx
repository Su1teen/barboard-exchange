import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

const PAGE_MS = 10000;
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

// ── TV stage ───────────────────────────────────────────────────────────────

/**
 * Fixed logical canvas for the TV board. The whole dashboard is designed at
 * exactly 1920×1080 and the outer viewport only applies a single uniform
 * "contain" scale, centered with letterboxing. The composition is therefore
 * identical at any window size, browser zoom level, or OS display scaling —
 * a 1080p TV at 125% Windows scaling (1536×864 CSS px) simply gets the stage
 * at scale 0.8 instead of a broken "responsive" layout.
 */
export const TV_STAGE_WIDTH = 1920;
export const TV_STAGE_HEIGHT = 1080;

type TvStageMetrics = { scale: number; offsetX: number; offsetY: number };

/** Uniform "contain" scale + letterbox offsets for a viewport size. */
function computeTvStageMetrics(width: number, height: number): TvStageMetrics {
  const scale = Math.min(width / TV_STAGE_WIDTH, height / TV_STAGE_HEIGHT);
  return {
    scale,
    offsetX: Math.max(0, (width - TV_STAGE_WIDTH * scale) / 2),
    offsetY: Math.max(0, (height - TV_STAGE_HEIGHT * scale) / 2),
  };
}

// SSR-safe layout effect: measure before the first paint on the client,
// no-op warning-free on the server.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// ── Screen Wake Lock ────────────────────────────────────────────────────────

/**
 * Prevents the TV from sleeping while the dashboard is visible.
 *
 * Strategy (two-tier):
 *  1. Screen Wake Lock API — the modern, clean solution. Reacquired whenever
 *     the document becomes visible again (e.g. tab switch / screensaver wake).
 *  2. Silent video — an invisible <video> playing a canvas-generated stream
 *     (always on, re-kicked every 30 s). Smart TV browsers (Tizen, webOS)
 *     that ignore the Wake Lock API still keep the screen on for playing
 *     video, like YouTube. Zero visual/audio impact.
 *
 * Both paths are no-ops if the API or the playback are unavailable — the
 * application never breaks due to missing browser support.
 */
function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const useFallbackRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let paintTimer: number | undefined;

    // ── Attempt Wake Lock API ──────────────────────────────────────────────
    async function acquireWakeLock() {
      // Already held — nothing to do.
      if (wakeLockRef.current && !wakeLockRef.current.released) return;

      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          // Mark released when the browser releases it (e.g. tab hidden).
          wakeLockRef.current.addEventListener("release", () => {
            wakeLockRef.current = null;
          });
          return;
        }
      } catch {
        // Permission denied or API error — fall through to video fallback.
      }

      // ── Video fallback ─────────────────────────────────────────────────
      startVideoFallback();
    }

    function startVideoFallback() {
      if (useFallbackRef.current) {
        // Already running — just make sure playback did not stall.
        void videoRef.current?.play().catch(() => {});
        return;
      }

      try {
        // A real, endlessly playing video track generated from a tiny canvas
        // (no media file to decode). The canvas is repainted once a second so
        // the stream never goes idle. Browsers keep the screen awake for a
        // playing, on-screen video; it sits full-size behind the board with
        // opacity 0, so guests never see it.
        const canvas = document.createElement("canvas");
        canvas.width = 2;
        canvas.height = 2;
        const ctx = canvas.getContext("2d");
        if (!ctx || typeof canvas.captureStream !== "function") return;
        let tick = 0;
        const paint = () => {
          tick = (tick + 1) % 2;
          ctx.fillStyle = tick ? "#000" : "#010101";
          ctx.fillRect(0, 0, 2, 2);
        };
        paint();
        paintTimer = window.setInterval(paint, 1000);

        const vid = document.createElement("video");
        vid.srcObject = canvas.captureStream(1);
        vid.muted = true;
        vid.loop = true;
        vid.playsInline = true;
        vid.setAttribute("aria-hidden", "true");
        vid.style.cssText =
          "position:fixed;inset:0;width:100%;height:100%;opacity:0;pointer-events:none;z-index:-1;";
        document.body.appendChild(vid);
        videoRef.current = vid;
        useFallbackRef.current = true;
        vid.play().catch(() => {
          // Autoplay blocked — retried on the next tick / remote key press.
        });
      } catch {
        // Silently ignore any errors in the fallback.
      }
    }

    // ── Reacquire on visibility change (e.g. after screensaver or tab switch) ──
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void acquireWakeLock();
      }
    }
    // Some TV browsers grant wake lock / autoplay only after a remote press.
    const onInteraction = () => void acquireWakeLock();

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onInteraction);
    window.addEventListener("keydown", onInteraction);
    window.addEventListener("pointerdown", onInteraction);
    // The system may silently drop the lock (power policy) while the page
    // stays visible — re-check periodically.
    const recheckTimer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void acquireWakeLock();
      startVideoFallback();
    }, 30_000);
    void acquireWakeLock();
    // Belt and braces: TV browsers often expose the Wake Lock API but ignore
    // it, so the playing-video fallback runs regardless.
    startVideoFallback();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onInteraction);
      window.removeEventListener("keydown", onInteraction);
      window.removeEventListener("pointerdown", onInteraction);
      window.clearInterval(recheckTimer);
      if (paintTimer !== undefined) window.clearInterval(paintTimer);
      useFallbackRef.current = false;
      // Release Wake Lock if held.
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      // Remove video fallback element.
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.remove();
        videoRef.current = null;
      }
    };
  }, []);
}

/**
 * Tracks the real viewport (`window.innerWidth/innerHeight`, which already
 * account for browser zoom and OS display scaling) and returns the stage
 * transform. `null` until the first measurement so SSR/first paint fall
 * back to the pure-CSS `--tv-scale` rule.
 */
function useTvStageMetrics(): TvStageMetrics | null {
  const [metrics, setMetrics] = useState<TvStageMetrics | null>(null);

  useIsomorphicLayoutEffect(() => {
    const update = () => setMetrics(computeTvStageMetrics(window.innerWidth, window.innerHeight));
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  return metrics;
}

export function TvStage({ children }: { children: React.ReactNode }) {
  const metrics = useTvStageMetrics();
  return (
    <div className="tv-viewport">
      <div
        className="tv-stage"
        data-testid="tv-stage"
        style={
          metrics
            ? {
                transform: `translate(${metrics.offsetX}px, ${metrics.offsetY}px) scale(${metrics.scale})`,
              }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
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
      <span className="pill pill--flat pill--dim">
        <Sparkles className="ico ico--16" strokeWidth={2.5} />
        Первый раунд
      </span>
    );
  }

  const flat = trend === "flat";
  const tone = flat ? "pill--flat" : trend === "down" ? "pill--good" : "pill--bad";

  const Icon = flat ? Minus : trend === "down" ? ArrowDownRight : ArrowUpRight;

  return (
    <span className={`pill ${tone}`}>
      <Icon className="ico ico--20" strokeWidth={2.5} />
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

  // Read-only frontend metadata (originalPrice, minPrice, category). Used only
  // as a fallback: the backend payload is authoritative when it carries the
  // fields.
  const meta: ProductMeta | undefined = useMemo(() => resolveProductMeta(product), [product]);
  const originalPrice = product.originalPrice ?? meta?.originalPrice ?? null;
  const minPrice = product.minPrice ?? meta?.minPrice ?? null;
  const level = typeof product.priceLevelPercent === "number" ? product.priceLevelPercent : null;

  // Image: slug → normalized name → category fallback. Always a valid src.
  const imageSrc = useMemo(() => resolveProductImage(product), [product]);

  // Discount from original price (independent from round changePercent).
  const discount = originalPrice !== null ? discountPercent(originalPrice, product.price) : null;
  const isMinPrice = minPrice !== null && product.price <= minPrice;

  // Controlled error: if the API price is not a finite number, show a
  // per-card error without breaking the rest of the grid.
  const priceValid = typeof product.price === "number" && Number.isFinite(product.price);

  let priceColor = "price--flat"; // flat
  if (trend === "down") priceColor = "price--down";
  else if (trend === "up") priceColor = "price--up";

  let cardClass = "";
  if (product.changePercent < -4) cardClass = " product-card--drop";
  else if (product.changePercent > 4) cardClass = " product-card--spike";

  return (
    <article className={`product-card${cardClass}`}>
      {/* Product image — always a valid local static import. */}
      <div className="product-card__image">
        <img
          src={imageSrc}
          alt={product.name}
          className="product-card__img"
          loading="lazy"
          // Prevent any broken-image icon from ever showing — if the static
          // import somehow fails, hide the img element gracefully.
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
          }}
        />
      </div>

      <div className="product-card__content">
        <div className="product-card__identity">
          <p className="product-name">{product.name}</p>
          {product.category ? <span className="product-category">{product.category}</span> : null}
        </div>

        <div className="product-card__price-row">
          <div className="product-card__prices">
            {priceValid ? (
              <span
                key={current}
                className={`product-price ${priceColor} ${
                  previous !== null && current < previous ? "price-pop--down" : "price-pop--up"
                }`}
              >
                {formatPrice(product.price)}
              </span>
            ) : (
              <span className="product-price price--bad">Цена недоступна</span>
            )}

            {/* Original (menu) price — from the API, else static metadata. */}
            {originalPrice !== null && (
              <span className="product-original-price">обычная {formatPrice(originalPrice)}</span>
            )}
          </div>

          <div className="product-card__change">
            <RoundChange product={product} />
          </div>
        </div>

        {/* Discount + min-price badges row. */}
        <div className="badges">
          {discount !== null && (
            <span
              className={`badge pill ${
                discount > 0 ? "pill--good" : discount < 0 ? "pill--bad" : "pill--flat"
              }`}
            >
              {discount > 0
                ? `Скидка ${formatDiscount(discount)}`
                : discount < 0
                  ? `Наценка ${formatDiscount(discount)}`
                  : "0%"}
            </span>
          )}

          {level !== null && (
            <span className="badge product-level pill pill--flat" data-testid="price-level">
              {`Уровень ${level > 0 ? "+" : ""}${level}%`}
            </span>
          )}

          {isMinPrice && (
            <span className="badge pill pill--amber">
              <Flame className="ico ico--16" strokeWidth={2.5} />
              Мин. цена
            </span>
          )}
        </div>
      </div>
    </article>
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
    <div className="exchange-ticker">
      <div className="exchange-ticker__track">
        {line.map((item, i) => (
          <span key={i} className="exchange-ticker__item">
            <item.icon className="ico ico--20 ico--amber" strokeWidth={2.5} />
            {item.content}
          </span>
        ))}
      </div>
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
    <div className="center-message">
      <Icon className="ico ico--48 center-message__icon" strokeWidth={2} />
      <p className="center-message__title">{title}</p>
      {subtitle ? <p className="center-message__subtitle">{subtitle}</p> : null}
      {action}
    </div>
  );
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

  // Tell the legacy-browser watchdog (see src/lib/polyfills.ts) that the modern
  // app started, so the fallback renderer stays out of the way.
  useEffect(() => {
    (window as unknown as { __tvReady?: boolean }).__tvReady = true;
  }, []);

  const clock = useClock(10000);
  useWakeLock();
  const roundOpen = data?.roundStatus === "ok" && (data?.round ?? null) !== null;
  const nextStartsAt = data?.nextRound?.startsAt ?? null;
  const countdown = useCountdown(nextStartsAt);
  const countdownLabel = formatCountdown(countdown);

  return (
    <TvStage>
      <main className="main-layout">
        <div className="main-layout__glow" />

        <header className="exchange-header">
          <div className="exchange-header__brand">
            <h1 className="exchange-header__title">
              XOXO <span className="exchange-header__title-dim">Exchange</span>
            </h1>
            <span className="exchange-header__live">
              {isRefreshing ? <RefreshCw className="ico ico--12 spin" strokeWidth={3} /> : null}
              Live
            </span>
          </div>

          <div className="exchange-header__meta">
            <span className="exchange-header__round">
              <RoundBadge
                roundKey={data?.round?.roundKey ?? null}
                roundOpen={roundOpen}
                endsAt={data?.round?.endsAt ?? null}
                countdownLabel={countdownLabel}
              />
            </span>
            <span className="exchange-header__updated">обн. {formatUpdated(lastUpdatedAt)}</span>
            <span className="exchange-header__clock">{clock}</span>
          </div>
        </header>

        {isStale ? (
          <div className="stale-banner fade-in">
            <p className="stale-banner__text">
              Данные не обновлены — показаны последние полученные котировки.
            </p>
            <button type="button" onClick={retry} className="stale-banner__button">
              <RefreshCw className="ico ico--16" strokeWidth={2.5} />
              Повторить
            </button>
          </div>
        ) : null}

        <section className="exchange-content">
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
                <button type="button" onClick={retry} className="center-message__button">
                  <RefreshCw className="ico ico--20" strokeWidth={2.5} />
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
            <div key={safePageIndex} className="page fade-in">
              <div className="page-dots">
                {totalPages > 1 && (
                  <div className="page-dots__list">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <span
                        key={i}
                        className={`page-dots__dot${i === safePageIndex ? " page-dots__dot--active" : ""}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="cards-grid">
                {visibleItems.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </section>

        <Ticker products={products} roundOpen={roundOpen} countdownLabel={countdownLabel} />
      </main>
    </TvStage>
  );
}

export function RoundBadge({
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
    <span className="round-badge">
      {roundOpen ? (
        <>
          <Flame className="ico ico--16 ico--amber" strokeWidth={2.5} />
          <span className="round-badge__text">
            Раунд {roundLabel(roundKey)} · до {formatTime(endsAt)}
          </span>
        </>
      ) : (
        <>
          <Clock className="ico ico--16 ico--dim" strokeWidth={2.5} />
          <span className="round-badge__text">След. раунд через {countdownLabel}</span>
        </>
      )}
    </span>
  );
}
