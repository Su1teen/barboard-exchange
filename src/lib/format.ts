/** Price formatting helpers for the bar exchange TV dashboard. */

export const roundTo10 = (value: number): number => Math.round(value / 10) * 10;

export const formatPrice = (value: number): string =>
  `${roundTo10(value)
    .toLocaleString("ru-RU")
    .replace(/\u00A0/g, " ")} ₸`;

export const formatPercent = (value: number): string =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
