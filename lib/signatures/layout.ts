export type Box = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: number;
  page: number;
};

export type LayoutResult = {
  boxes: Box[];
  pageCount: number;
  cellWidth: number;
  cellHeight: number;
};

export const SIGNATURE_ASPECT = 0.48;

const HEADER = 100;
const MARGIN = 24;
const GAP = 12;
const MIN_WIDTH = 112;
const MAX_WIDTH = 268;
const STAR_RATIO = 0.2;

function hashId(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function boxesOverlap(a: Box, b: Box, gap = GAP) {
  return !(
    a.left + a.width + gap <= b.left ||
    b.left + b.width + gap <= a.left ||
    a.top + a.height + gap <= b.top ||
    b.top + b.height + gap <= a.top
  );
}

function starBlocked(
  x: number,
  y: number,
  w: number,
  h: number,
  vw: number,
  vh: number,
) {
  const cx = vw / 2;
  const cy = vh * 0.52;
  const r = Math.min(vw, vh) * STAR_RATIO;
  const bx = x + w / 2;
  const by = y + h / 2;
  return (bx - cx) ** 2 + (by - cy) ** 2 < r * r;
}

function cellsFor(vw: number, vh: number, width: number, height: number) {
  const areaW = vw - MARGIN * 2;
  const areaH = vh - HEADER - MARGIN;
  const colStep = width + GAP;
  const rowStep = height + GAP;
  const cols = Math.max(1, Math.floor((areaW + GAP) / colStep));
  const rows = Math.max(1, Math.floor((areaH + GAP) / rowStep));
  const gridW = cols * colStep - GAP;
  const gridH = rows * rowStep - GAP;
  const ox = MARGIN + Math.max(0, (areaW - gridW) / 2);
  const oy = HEADER + Math.max(0, (areaH - gridH) / 2);
  const cells: { left: number; top: number }[] = [];

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const left = ox + c * colStep;
      const top = oy + r * rowStep;
      if (!starBlocked(left, top, width, height, vw, vh)) {
        cells.push({ left, top });
      }
    }
  }

  if (cells.length === 0) {
    cells.push({ left: MARGIN, top: HEADER });
  }

  const cx = vw / 2;
  const cy = vh * 0.52;
  cells.sort((a, b) => {
    const ar = Math.hypot(a.left + width / 2 - cx, a.top + height / 2 - cy);
    const br = Math.hypot(b.left + width / 2 - cx, b.top + height / 2 - cy);
    const ringA = Math.round(ar / 90);
    const ringB = Math.round(br / 90);
    if (ringA !== ringB) {
      return ringA - ringB;
    }
    const aa = Math.atan2(a.top - cy, a.left - cx);
    const ba = Math.atan2(b.top - cy, b.left - cx);
    return aa - ba;
  });

  return cells;
}

function pack(ids: string[], vw: number, vh: number): LayoutResult {
  let chosenW = MIN_WIDTH;
  let chosenCells: { left: number; top: number }[] = cellsFor(
    vw,
    vh,
    MIN_WIDTH,
    Math.round(MIN_WIDTH * SIGNATURE_ASPECT),
  );

  for (let w = MAX_WIDTH; w >= MIN_WIDTH; w -= 4) {
    const height = Math.round(w * SIGNATURE_ASPECT);
    const cells = cellsFor(vw, vh, w, height);
    if (cells.length >= ids.length) {
      chosenW = w;
      chosenCells = cells;
      break;
    }
    if (w === MIN_WIDTH) {
      chosenW = w;
      chosenCells = cells;
    }
  }

  const height = Math.round(chosenW * SIGNATURE_ASPECT);
  const perPage = Math.max(1, chosenCells.length);
  const pageCount = Math.max(1, Math.ceil(ids.length / perPage));
  const boxes: Box[] = ids.map((id, i) => {
    const slot = chosenCells[i % perPage];
    const jitter = (hashId(id) % 9) - 4;
    return {
      id,
      left: slot.left,
      top: slot.top,
      width: chosenW,
      height,
      rotate: jitter * 0.55,
      page: Math.floor(i / perPage),
    };
  });

  return { boxes, pageCount, cellWidth: chosenW, cellHeight: height };
}

type Cache = {
  vw: number;
  vh: number;
  ids: string[];
  result: LayoutResult;
};

let cache: Cache | null = null;

export function layoutSignatures(ids: string[], vw: number, vh: number): LayoutResult {
  if (ids.length === 0 || vw < 120 || vh < 120) {
    return { boxes: [], pageCount: 1, cellWidth: 0, cellHeight: 0 };
  }

  if (
    cache &&
    cache.vw === vw &&
    cache.vh === vh &&
    cache.ids.length === ids.length &&
    cache.ids.every((id, i) => id === ids[i])
  ) {
    return cache.result;
  }

  const fresh = pack(ids, vw, vh);

  if (
    cache &&
    cache.vw === vw &&
    cache.vh === vh &&
    cache.result.cellWidth === fresh.cellWidth &&
    cache.result.pageCount === fresh.pageCount &&
    cache.ids.length < ids.length &&
    cache.ids.every((id, i) => ids[i] === id)
  ) {
    const boxes = cache.result.boxes.concat(fresh.boxes.slice(cache.ids.length));
    const result = { ...fresh, boxes };
    cache = { vw, vh, ids: ids.slice(), result };
    return result;
  }

  cache = { vw, vh, ids: ids.slice(), result: fresh };
  return fresh;
}

export function placePopup(
  occupied: Box[],
  vw: number,
  vh: number,
  width: number,
  height: number,
) {
  const minL = MARGIN;
  const minT = HEADER;
  const maxL = vw - MARGIN - width;
  const maxT = vh - MARGIN - height;
  if (maxL < minL || maxT < minT) {
    return null;
  }

  const cx = vw / 2 - width / 2;
  const cy = vh * 0.28 - height / 2;
  const preferred = { left: cx, top: Math.max(minT, cy), rotate: -2 };
  const candidate: Box = {
    id: "popup",
    left: preferred.left,
    top: preferred.top,
    width,
    height,
    rotate: 0,
    page: 0,
  };
  if (!occupied.some((box) => boxesOverlap(candidate, box, 12))) {
    return preferred;
  }

  for (let i = 0; i < 40; i += 1) {
    const left = minL + ((hashId(`p${i}`) % 1000) / 1000) * (maxL - minL);
    const top = minT + ((hashId(`t${i}`) % 1000) / 1000) * (maxT - minT);
    candidate.left = left;
    candidate.top = top;
    if (occupied.some((box) => boxesOverlap(candidate, box, 12))) {
      continue;
    }
    if (starBlocked(left, top, width, height, vw, vh)) {
      continue;
    }
    return { left, top, rotate: ((i % 9) - 4) * 1.2 };
  }

  return { left: minL, top: minT, rotate: 0 };
}
