/** Supabase default max rows per request. Paginate past this. */
export const SIGNATURE_FETCH_PAGE = 1000;

export function signatureRange(
  offset: number,
  pageSize = SIGNATURE_FETCH_PAGE,
) {
  return { from: offset, to: offset + pageSize - 1 };
}

export function hasMoreSignatureRows(
  batchCount: number,
  pageSize = SIGNATURE_FETCH_PAGE,
) {
  return batchCount >= pageSize;
}

export function mergeSignatureRows<T extends { id: string }>(
  current: T[],
  incoming: T[],
) {
  const seen = new Set(current.map((row) => row.id));
  const next = current.slice();
  for (const row of incoming) {
    if (!row.id || seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    next.push(row);
  }
  return next;
}
