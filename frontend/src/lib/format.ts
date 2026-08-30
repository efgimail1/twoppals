/**
 * Fungsi inti — satu-satunya tempat logika parsing angka dari backend.
 * Backend kirim Decimal sebagai string presisi (ex: "17000.00", "15000.00"),
 * jadi perlu dideteksi dulu formatnya sebelum diproses sebagai angka.
 */
function parseBackendOrTypedNumber(value: number | string): number {
  if (typeof value === "number") return Math.round(value);

  const trimmed = value.trim();

  // Format desimal murni dari backend: 1 titik, arbitrary digits di belakang koma
  // (backend may send high-precision Decimal strings). Parse and round.
  if (/^-?\d+\.\d+$/.test(trimmed)) {
    return Math.round(parseFloat(trimmed));
  }

  // Selain itu anggap hasil ketikan/format ribuan manual (titik = pemisah ribuan)
  return Number(trimmed.replace(/\D/g, "")) || 0;
}

export function formatRupiah(value: number | string): string {
  const num = parseBackendOrTypedNumber(value);
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("id-ID").format(num);
}

export function parseRupiah(formatted: string): number {
  return parseBackendOrTypedNumber(formatted);
}

export function formatNumber(value: number | string): string {
  return formatRupiah(value); // logikanya identik, cuma beda nama biar jelas konteks pakainya
}

export function parseNumber(formatted: string): number {
  return parseRupiah(formatted);
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