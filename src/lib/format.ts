/** Price formatting helpers for the bar exchange TV dashboard. */

export const roundTo10 = (value: number): number => Math.round(value / 10) * 10;

export const formatPrice = (value: number): string =>
  `${roundTo10(value)
    .toLocaleString("ru-RU")
    .replace(/\u00A0/g, " ")} ₸`;

export const formatPercent = (value: number): string =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

/**
 * Discount from the original menu price.
 *
 *   discountPercent = ((originalPrice - currentPrice) / originalPrice) * 100
 *
 * - Positive → the customer pays less than the original price (a discount).
 * - Zero     → current price equals the original price.
 * - Negative → the current price is above the original (a markup / growth).
 *
 * `originalPrice` is the denominator — never `minPrice`.
 * Returns `null` when `originalPrice` is missing or ≤ 0 (cannot divide).
 */
export function discountPercent(originalPrice: number, currentPrice: number): number | null {
  if (typeof originalPrice !== "number" || typeof currentPrice !== "number") return null;
  if (!Number.isFinite(originalPrice) || !Number.isFinite(currentPrice)) return null;
  if (originalPrice <= 0) return null;
  return ((originalPrice - currentPrice) / originalPrice) * 100;
}

/**
 * Round-to-round price change.
 *
 *   roundChangePercent = ((currentPrice - previousPrice) / previousPrice) * 100
 *
 * Used only when the backend does not provide an authoritative `changePercent`
 * but does provide a `previousPrice`. Returns `null` when `previousPrice` is
 * missing, null, or ≤ 0 (first round / cannot divide).
 */
export function roundChangePercent(
  currentPrice: number,
  previousPrice: number | null,
): number | null {
  if (previousPrice === null || previousPrice === undefined) return null;
  if (typeof currentPrice !== "number" || typeof previousPrice !== "number") return null;
  if (!Number.isFinite(currentPrice) || !Number.isFinite(previousPrice)) return null;
  if (previousPrice <= 0) return null;
  return ((currentPrice - previousPrice) / previousPrice) * 100;
}

/**
 * Format a discount value for display.
 *
 * - Positive discount (customer saves) → "−20.5%" (uses the Unicode minus).
 * - Zero → "0%".
 * - Negative discount (markup / growth) → "+12.5%".
 *
 * One decimal place, matching the TV dashboard style.
 */
export function formatDiscount(value: number): string {
  if (value > 0) return `\u2212${value.toFixed(1)}%`;
  if (value < 0) return `+${Math.abs(value).toFixed(1)}%`;
  return "0%";
}
