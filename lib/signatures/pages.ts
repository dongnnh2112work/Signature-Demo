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

/**
 * Replace the wall with a server snapshot, dropping rows that disappeared
 * (missed DELETE). Keep only live inserts that arrived during the fetch.
 */
export function reconcileSignatureSnapshot<T extends { id: string }>(
  current: T[],
  snapshot: T[],
  keepIds: Iterable<string> = [],
) {
  const keep = new Set(keepIds);
  const seen = new Set<string>();
  const next: T[] = [];
  for (const row of snapshot) {
    if (!row.id || seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    next.push(row);
  }
  for (const row of current) {
    if (!row.id || seen.has(row.id) || !keep.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    next.push(row);
  }
  return next;
}
