/**
 * Parsing angka dari BACKEND. Backend kirim Decimal sebagai teks presisi
 * (ex: "9000.00", "17000.00") - titik di sini SELALU tanda desimal.
 */
function parseBackendDecimal(value: number | string): number {
  if (typeof value === "number") return Math.round(value);
  const num = parseFloat(value.trim());
  return isNaN(num) ? 0 : Math.round(num);
}

export function formatRupiah(value: number | string): string {
  const num = parseBackendDecimal(value);
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("id-ID").format(num);
}

export function formatNumber(value: number | string): string {
  return formatRupiah(value);
}

/**
 * Parsing teks yang SEDANG DIKETIK USER di form. Titik di sini SELALU
 * pemisah ribuan - aman dibuang semua.
 */
export function parseRupiah(typed: string): number {
  return Number(typed.replace(/\D/g, "")) || 0;
}

export function parseNumber(typed: string): number {
  return parseRupiah(typed);
}

export function formatRupiahInput(typed: string): string {
  const num = parseRupiah(typed);
  if (!num) return "";
  return new Intl.NumberFormat("id-ID").format(num);
}

export function formatQty(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "";
  return num.toLocaleString("id-ID", { maximumFractionDigits: 3 });
}

export const STOCK_UNITS = [
  "pcs", "pack", "porsi", "gram", "kg", "liter", "ml",
  "box", "lusin", "botol", "cup", "dus", "ikat", "toples",
];