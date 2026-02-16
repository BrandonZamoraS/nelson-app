const defaultLocale = "es-AR";

export function formatDate(
  value: string | null | undefined,
  locale = defaultLocale,
) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

export function formatDateTime(value: string, locale = defaultLocale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatCurrencyCents(
  cents: number,
  currency = "USD",
  locale = "en-US",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDashboardUsd(cents: number) {
  const units = Math.round(cents / 100);
  return `$ ${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(units)}`;
}
