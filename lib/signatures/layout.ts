export type Box = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: number;
};

export const SIGNATURE_ASPECT = 0.52;

const HEADER = 72;
const MARGIN = 32;
const GAP = 18;
const MIN_WIDTH = 56;
const MAX_WIDTH = 340;

function hashId(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function unit(n: number) {
  return (n % 10000) / 10000;
}

export function boxesOverlap(a: Box, b: Box, gap = GAP) {
  return !(
    a.left + a.width + gap <= b.left ||
    b.left + b.width + gap <= a.left ||
    a.top + a.height + gap <= b.top ||
    b.top + b.height + gap <= a.top
  );
}

function preferred(
  id: string,
  width: number,
  height: number,
  vw: number,
  vh: number,
) {
  const a = hashId(id);
  const b = hashId(`${id}:y`);
  const minL = MARGIN;
  const minT = HEADER;
  const maxL = Math.max(minL, vw - MARGIN - width);
  const maxT = Math.max(minT, vh - MARGIN - height);
  return {
    left: minL + unit(a) * (maxL - minL),
    top: minT + unit(b) * (maxT - minT),
  };
}

function clampBox(box: Box, vw: number, vh: number) {
  box.left = Math.min(
    Math.max(MARGIN, box.left),
    Math.max(MARGIN, vw - MARGIN - box.width),
  );
  box.top = Math.min(
    Math.max(HEADER, box.top),
    Math.max(HEADER, vh - MARGIN - box.height),
  );
}

function separate(boxes: Box[], vw: number, vh: number) {
  for (let iter = 0; iter < 80; iter += 1) {
    let moved = false;
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const dx = a.left + a.width / 2 - (b.left + b.width / 2);
        const dy = a.top + a.height / 2 - (b.top + b.height / 2);
        const overlapX = (a.width + b.width) / 2 + GAP - Math.abs(dx || 0.01);
        const overlapY = (a.height + b.height) / 2 + GAP - Math.abs(dy || 0.01);
        if (overlapX <= 0 || overlapY <= 0) {
          continue;
        }
        if (overlapX < overlapY) {
          const push = overlapX / 2 + 0.8;
          const dir = dx < 0 ? -1 : 1;
          a.left += dir * push;
          b.left -= dir * push;
        } else {
          const push = overlapY / 2 + 0.8;
          const dir = dy < 0 ? -1 : 1;
          a.top += dir * push;
          b.top -= dir * push;
        }
        moved = true;
      }
    }
    for (const box of boxes) {
      clampBox(box, vw, vh);
    }
    if (!moved) {
      break;
    }
  }
}

function hasOverlap(boxes: Box[]) {
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      if (boxesOverlap(boxes[i], boxes[j], GAP - 1)) {
        return true;
      }
    }
  }
  return false;
}

function tryPack(ids: string[], width: number, vw: number, vh: number) {
  const height = Math.round(width * SIGNATURE_ASPECT);
  if (height < 30) {
    return null;
  }
  const boxes: Box[] = ids.map((id) => {
    const pos = preferred(id, width, height, vw, vh);
    return {
      id,
      left: pos.left,
      top: pos.top,
      width,
      height,
      rotate: ((hashId(id) % 9) - 4) * 0.85,
    };
  });
  separate(boxes, vw, vh);
  if (hasOverlap(boxes)) {
    return null;
  }
  return boxes;
}

export function layoutSignatures(ids: string[], vw: number, vh: number) {
  if (ids.length === 0 || vw < 120 || vh < 120) {
    return [] as Box[];
  }

  let lo = MIN_WIDTH;
  let hi = MAX_WIDTH;
  let best: Box[] = [];

  while (lo <= hi) {
    const mid = Math.round((lo + hi) / 2);
    const packed = tryPack(ids, mid, vw, vh);
    if (packed) {
      best = packed;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (best.length === 0) {
    return tryPack(ids, MIN_WIDTH, vw, vh) ?? [];
  }

  const relaxed = Math.max(MIN_WIDTH, Math.round(best[0].width * 0.9));
  return tryPack(ids, relaxed, vw, vh) ?? best;
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

  for (let i = 0; i < 120; i += 1) {
    const left = minL + Math.random() * (maxL - minL);
    const top = minT + Math.random() * (maxT - minT);
    const candidate: Box = {
      id: "popup",
      left,
      top,
      width,
      height,
      rotate: 0,
    };
    if (occupied.some((box) => boxesOverlap(candidate, box, 12))) {
      continue;
    }
    return { left, top, rotate: (Math.random() - 0.5) * 14 };
  }

  return null;
}
