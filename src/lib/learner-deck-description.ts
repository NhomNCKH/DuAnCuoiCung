/** Bỏ tag nội bộ trong mô tả bộ (seed) để hiển thị cho học viên. */
export function learnerVisibleDescription(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const cleaned = raw
    .replace(/__[A-Z0-9_]+__/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned.length ? cleaned : null;
}
