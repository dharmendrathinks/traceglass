export function bytes(value: number | null): string {
  if (value === null) return "Unknown";
  const a = Math.abs(value);
  if (a >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  if (a >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${Math.round(value)} B`;
}
export function duration(value: number | null): string {
  if (value === null) return "Unknown";
  return Math.abs(value) >= 1000
    ? `${(value / 1000).toFixed(2)} s`
    : `${Math.round(value)} ms`;
}
export function signed(
  value: number | null,
  format: (x: number | null) => string = (x) => String(x),
): string {
  return value === null ? "Unknown" : `${value > 0 ? "+" : ""}${format(value)}`;
}
