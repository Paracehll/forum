const countFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** 统一计数的短格式，例如 1k、1.2k、1m。 */
export function formatCount(value: number): string {
  return countFormatter.format(value).toLowerCase();
}
