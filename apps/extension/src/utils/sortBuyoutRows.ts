export function sortBuyoutRows<T extends { dataset: { buyoutRaw?: string } }>(
  rows: readonly T[],
  direction: 'asc' | 'desc',
): T[] {
  // Read each DOM value once. Unknown prices stay last in either direction.
  return rows
    .map((row) => ({ row, price: Number(row.dataset.buyoutRaw) }))
    .sort((a, b) => {
      const validA = Number.isFinite(a.price) && a.price > 0;
      const validB = Number.isFinite(b.price) && b.price > 0;
      if (validA !== validB) return validA ? -1 : 1;
      if (!validA) return 0;
      return direction === 'asc' ? a.price - b.price : b.price - a.price;
    })
    .map(({ row }) => row);
}
