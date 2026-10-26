export const WISH_ENTER_MS = 640;
export const WISH_ENTER_MAX_ANIMATED = 48;

/** Entrance is opacity-only. No scale / zoom / shrink. */
export const WISH_ENTER_SCALE = 1;

export type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function rectsOverlap(a: Rect, b: Rect, gap = 12) {
  return !(
    a.left + a.width + gap <= b.left ||
    b.left + b.width + gap <= a.left ||
    a.top + a.height + gap <= b.top ||
    b.top + b.height + gap <= a.top
  );
}

/**
 * Place many new wishes at once, each in its own random slot.
 * No queue — the whole burst is placed in one pass. Overlap is avoided
 * when there is room; leftover items still get a fallback slot.
 */
export function placeRandomNonOverlapping(
  count: number,
  occupied: Rect[],
  bounds: { vw: number; vh: number; width: number; height: number },
  rng: () => number = Math.random,
) {
  const { vw, vh, width, height } = bounds;
  const minL = 24;
  const minT = 100;
  const maxL = vw - 24 - width;
  const maxT = vh - 24 - height;
  const taken = occupied.slice();
  const placed: Rect[] = [];

  for (let n = 0; n < count; n += 1) {
    let found: Rect | null = null;
    if (maxL >= minL && maxT >= minT) {
      for (let attempt = 0; attempt < 48; attempt += 1) {
        const left = minL + rng() * (maxL - minL);
        const top = minT + rng() * (maxT - minT);
        const box = { left, top, width, height };
        if (!taken.some((other) => rectsOverlap(box, other))) {
          found = box;
          break;
        }
      }
    }
    if (!found) {
      found = {
        left: minL + (n % 7) * 8,
        top: minT + (n % 5) * 8,
        width,
        height,
      };
    }
    placed.push(found);
    taken.push(found);
  }

  return placed;
}

export function shouldAnimateEntrance(
  indexInBurst: number,
  cap = WISH_ENTER_MAX_ANIMATED,
) {
  return indexInBurst < cap;
}

export function mergeAdmitBatch<T extends { id: string }>(
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
