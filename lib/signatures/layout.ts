export type Box = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: number;
  page: number;
  /** One factor for the whole card: frame, padding, border, and text. */
  scale: number;
};

export type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type LayoutResult = {
  boxes: Box[];
  pageCount: number;
  cellWidth: number;
  cellHeight: number;
  scale: number;
  hidden: number;
};

export const SIGNATURE_ASPECT = 0.48;
export const BASE_CARD_WIDTH = 188;
export const BASE_CARD_HEIGHT = BASE_CARD_WIDTH * SIGNATURE_ASPECT;
export const MIN_CARD_SCALE = 0.52;
export const CARD_GAP = 8;
export const HEADER = 96;
export const MARGIN = 20;
export const MAX_ROTATE_DEG = 6;
export const LOGO_PAD = 28;

type Pose = { nx: number; ny: number; rotate: number; size: number };
type Cached = {
  nx: number;
  ny: number;
  cx: number;
  cy: number;
  vw: number;
  vh: number;
};

const poseCache = new Map<string, Cached>();

export function resetLayoutCache() {
  poseCache.clear();
}

export function hashId(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function wishPose(id: string): Pose {
  const rng = mulberry32(hashId(id));
  return {
    nx: rng(),
    ny: rng(),
    rotate: (rng() * 2 - 1) * MAX_ROTATE_DEG,
    size: 0.88 + rng() * 0.24,
  };
}

export function inflateRect(rect: Rect, pad: number): Rect {
  return {
    left: rect.left - pad,
    top: rect.top - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

export function rotatedAabb(
  cx: number,
  cy: number,
  width: number,
  height: number,
  rotateDeg: number,
): Rect {
  const rad = (rotateDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const bw = width * cos + height * sin;
  const bh = width * sin + height * cos;
  return {
    left: cx - bw / 2,
    top: cy - bh / 2,
    width: bw,
    height: bh,
  };
}

export function rectsOverlap(a: Rect, b: Rect, gap = CARD_GAP) {
  return !(
    a.left + a.width + gap <= b.left ||
    b.left + b.width + gap <= a.left ||
    a.top + a.height + gap <= b.top ||
    b.top + b.height + gap <= a.top
  );
}

export function boxesOverlap(a: Box, b: Box, gap = CARD_GAP) {
  return rectsOverlap(boxAabb(a), boxAabb(b), gap);
}

export function boxAabb(box: Box): Rect {
  return rotatedAabb(
    box.left + box.width / 2,
    box.top + box.height / 2,
    box.width,
    box.height,
    box.rotate,
  );
}

export function defaultBrandExclusions(vw: number, vh: number): Rect[] {
  const mark = Math.min(Math.min(vw, vh) * 0.28, 280);
  const size = mark + LOGO_PAD * 2;
  return [
    {
      left: vw / 2 - size / 2,
      top: vh / 2 - size / 2,
      width: size,
      height: size,
    },
  ];
}

function candidateNorms(id: string): { nx: number; ny: number }[] {
  const pose = wishPose(id);
  const rng = mulberry32(hashId(id) ^ 0x9e3779b9);
  const list = [{ nx: pose.nx, ny: pose.ny }];
  for (let i = 0; i < 36; i += 1) {
    list.push({ nx: rng(), ny: rng() });
  }
  return list;
}

function gridCenters(
  vw: number,
  vh: number,
  aabbW: number,
  aabbH: number,
) {
  const minX = MARGIN + aabbW / 2;
  const maxX = vw - MARGIN - aabbW / 2;
  const minY = HEADER + aabbH / 2;
  const maxY = vh - MARGIN - aabbH / 2;
  const spanX = Math.max(0, maxX - minX);
  const spanY = Math.max(0, maxY - minY);
  const stepX = Math.max(16, aabbW + CARD_GAP);
  const stepY = Math.max(16, aabbH + CARD_GAP);
  const cols = Math.max(1, Math.floor(spanX / stepX) + 1);
  const rows = Math.max(1, Math.floor(spanY / stepY) + 1);
  const out: { cx: number; cy: number }[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      out.push({
        cx: minX + (cols === 1 ? 0 : (c / (cols - 1)) * spanX),
        cy: minY + (rows === 1 ? 0 : (r / (rows - 1)) * spanY),
      });
    }
  }
  return out;
}

function centerFromNorm(
  nx: number,
  ny: number,
  vw: number,
  vh: number,
  aabbW: number,
  aabbH: number,
) {
  const minX = MARGIN + aabbW / 2;
  const maxX = vw - MARGIN - aabbW / 2;
  const minY = HEADER + aabbH / 2;
  const maxY = vh - MARGIN - aabbH / 2;
  return {
    cx: minX + nx * Math.max(0, maxX - minX),
    cy: minY + ny * Math.max(0, maxY - minY),
  };
}

function inBounds(rect: Rect, vw: number, vh: number) {
  return (
    rect.left >= MARGIN - 1 &&
    rect.top >= HEADER - 1 &&
    rect.left + rect.width <= vw - MARGIN + 1 &&
    rect.top + rect.height <= vh - MARGIN + 1
  );
}

function cardScale(id: string, crowdScale: number) {
  return wishPose(id).size * crowdScale;
}

function tryPlace(
  ids: string[],
  vw: number,
  vh: number,
  zones: Rect[],
  crowdScale: number,
): Box[] | null {
  const placed: Box[] = [];
  const aabbs: Rect[] = [];

  for (const id of ids) {
    const pose = wishPose(id);
    const scale = cardScale(id, crowdScale);
    const width = BASE_CARD_WIDTH * scale;
    const height = BASE_CARD_HEIGHT * scale;
    const probe = rotatedAabb(0, 0, width, height, pose.rotate);
    const aabbW = probe.width;
    const aabbH = probe.height;
    const cached = poseCache.get(id);
    const sameView = Boolean(cached && cached.vw === vw && cached.vh === vh);
    const tryCenter = (
      cx: number,
      cy: number,
      nx: number,
      ny: number,
    ): { box: Box; used: Cached } | null => {
      const aabb = rotatedAabb(cx, cy, width, height, pose.rotate);
      if (!inBounds(aabb, vw, vh)) {
        return null;
      }
      if (zones.some((zone) => rectsOverlap(aabb, zone))) {
        return null;
      }
      if (aabbs.some((other) => rectsOverlap(aabb, other))) {
        return null;
      }
      return {
        box: {
          id,
          left: cx - width / 2,
          top: cy - height / 2,
          width,
          height,
          rotate: pose.rotate,
          page: 0,
          scale,
        },
        used: { nx, ny, cx, cy, vw, vh },
      };
    };

    let found: { box: Box; used: Cached } | null = null;
    if (sameView && cached) {
      found = tryCenter(cached.cx, cached.cy, cached.nx, cached.ny);
    }
    if (!found) {
      for (const { nx, ny } of candidateNorms(id)) {
        const { cx, cy } = centerFromNorm(nx, ny, vw, vh, aabbW, aabbH);
        found = tryCenter(cx, cy, nx, ny);
        if (found) {
          break;
        }
      }
    }
    if (!found) {
      for (const cell of gridCenters(vw, vh, aabbW, aabbH)) {
        found = tryCenter(cell.cx, cell.cy, 0.5, 0.5);
        if (found) {
          break;
        }
      }
    }

    if (!found) {
      return null;
    }
    poseCache.set(id, found.used);
    placed.push(found.box);
    aabbs.push(
      rotatedAabb(
        found.box.left + found.box.width / 2,
        found.box.top + found.box.height / 2,
        found.box.width,
        found.box.height,
        found.box.rotate,
      ),
    );
  }

  return placed;
}

function fitVisible(
  ids: string[],
  vw: number,
  vh: number,
  zones: Rect[],
): { boxes: Box[]; scale: number } | null {
  const atFull = tryPlace(ids, vw, vh, zones, 1);
  if (atFull) {
    return { boxes: atFull, scale: 1 };
  }

  let best: { boxes: Box[]; scale: number } | null = null;
  let lo = MIN_CARD_SCALE;
  let hi = 1;
  for (let i = 0; i < 8; i += 1) {
    const mid = (lo + hi) / 2;
    const boxes = tryPlace(ids, vw, vh, zones, mid);
    if (boxes) {
      best = { boxes, scale: mid };
      lo = mid;
    } else {
      hi = mid;
    }
  }
  if (!best) {
    const boxes = tryPlace(ids, vw, vh, zones, MIN_CARD_SCALE);
    if (boxes) {
      return { boxes, scale: MIN_CARD_SCALE };
    }
  }
  return best;
}

function emptyLayout(hidden: number, scale = 1): LayoutResult {
  return {
    boxes: [],
    pageCount: 1,
    cellWidth: 0,
    cellHeight: 0,
    scale,
    hidden,
  };
}

export function layoutSignatures(
  ids: string[],
  vw: number,
  vh: number,
  exclusions: Rect[] = [],
): LayoutResult {
  const live = new Set(ids);
  for (const key of poseCache.keys()) {
    if (!live.has(key)) {
      poseCache.delete(key);
    }
  }

  if (ids.length === 0 || vw < 120 || vh < 120) {
    return emptyLayout(0);
  }

  const zones = (exclusions.length ? exclusions : defaultBrandExclusions(vw, vh)).map(
    (zone) => inflateRect(zone, exclusions.length ? LOGO_PAD : 0),
  );

  let fitted = fitVisible(ids, vw, vh, zones);
  let start = 0;
  if (!fitted) {
    let lo = 1;
    let hi = ids.length;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const attempt = fitVisible(ids.slice(mid), vw, vh, zones);
      if (attempt) {
        fitted = attempt;
        start = mid;
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }
  }

  if (!fitted) {
    return emptyLayout(ids.length, MIN_CARD_SCALE);
  }

  for (let i = 0; i < start; i += 1) {
    poseCache.delete(ids[i]);
  }

  const widths = fitted.boxes.map((box) => box.width);
  return {
    boxes: fitted.boxes,
    pageCount: 1,
    cellWidth: widths.length ? Math.min(...widths) : 0,
    cellHeight: widths.length ? Math.min(...widths) * SIGNATURE_ASPECT : 0,
    scale: fitted.scale,
    hidden: start,
  };
}
