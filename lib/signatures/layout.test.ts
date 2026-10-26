import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BASE_CARD_HEIGHT,
  BASE_CARD_WIDTH,
  MIN_CARD_SCALE,
  boxAabb,
  defaultBrandExclusions,
  layoutSignatures,
  rectsOverlap,
  resetLayoutCache,
  rotatedAabb,
} from "./layout.ts";

const LOGO = { left: 820, top: 380, width: 280, height: 280 };

function centers(layout: ReturnType<typeof layoutSignatures>) {
  return layout.boxes.map((box) => [
    box.id,
    Number((box.left + box.width / 2).toFixed(3)),
    Number((box.top + box.height / 2).toFixed(3)),
    Number(box.rotate.toFixed(3)),
  ]);
}

function assertClear(ids: string[], layout: ReturnType<typeof layoutSignatures>) {
  const aabbs = layout.boxes.map((box) => ({ id: box.id, ...boxAabb(box) }));
  for (let i = 0; i < aabbs.length; i += 1) {
    assert.equal(
      rectsOverlap(aabbs[i], LOGO, 0),
      false,
      `${aabbs[i].id} intersects logo`,
    );
    for (let j = i + 1; j < aabbs.length; j += 1) {
      assert.equal(
        rectsOverlap(aabbs[i], aabbs[j], 0),
        false,
        `${aabbs[i].id} overlaps ${aabbs[j].id}`,
      );
    }
  }
  assert.equal(layout.boxes.length, ids.length - layout.hidden);
}

describe("scattered wall layout", () => {
  it("keeps positions stable across relayouts", () => {
    resetLayoutCache();
    const ids = Array.from({ length: 12 }, (_, i) => `stable-${i}`);
    const a = layoutSignatures(ids, 1920, 1080, [LOGO]);
    const b = layoutSignatures(ids, 1920, 1080, [LOGO]);
    assert.deepEqual(centers(a), centers(b));
  });

  it("does not overlap cards or the logo at 10, 50 and 150 wishes", () => {
    for (const n of [10, 50, 150]) {
      resetLayoutCache();
      const ids = Array.from({ length: n }, (_, i) => `crowd-${n}-${i}`);
      const layout = layoutSignatures(ids, 1920, 1080, [LOGO]);
      assert.ok(layout.boxes.length > 0, `placed none for n=${n}`);
      assertClear(ids, layout);
      assert.ok(layout.scale >= MIN_CARD_SCALE - 1e-6);
      for (const box of layout.boxes) {
        assert.ok(box.scale >= MIN_CARD_SCALE * 0.88 - 1e-6);
      }
    }
  });

  it("scales the whole card with one factor", () => {
    resetLayoutCache();
    const ids = Array.from({ length: 40 }, (_, i) => `scale-${i}`);
    const layout = layoutSignatures(ids, 1920, 1080, [LOGO]);
    assert.ok(layout.boxes.length > 0);
    for (const box of layout.boxes) {
      assert.ok(box.scale > 0);
      assert.equal(Number(box.width.toFixed(4)), Number((BASE_CARD_WIDTH * box.scale).toFixed(4)));
      assert.equal(Number(box.height.toFixed(4)), Number((BASE_CARD_HEIGHT * box.scale).toFixed(4)));
    }
  });

  it("shrinks cards before rotating the oldest out", () => {
    resetLayoutCache();
    const few = layoutSignatures(
      Array.from({ length: 8 }, (_, i) => `grow-${i}`),
      1920,
      1080,
      [LOGO],
    );
    resetLayoutCache();
    const many = layoutSignatures(
      Array.from({ length: 80 }, (_, i) => `grow-${i}`),
      1920,
      1080,
      [LOGO],
    );
    assert.ok(many.scale <= few.scale);
    assert.ok(many.hidden === 0 || many.scale <= MIN_CARD_SCALE + 0.02);
  });

  it("excludes rotated boxes from brand marks", () => {
    const aabb = rotatedAabb(960, 520, 180, 86, 6);
    assert.equal(rectsOverlap(aabb, defaultBrandExclusions(1920, 1080)[0], 0), true);
    const clear = rotatedAabb(200, 200, 180, 86, -6);
    assert.equal(rectsOverlap(clear, defaultBrandExclusions(1920, 1080)[0], 0), false);
  });

  it("does not reshuffle existing wishes when a new one arrives", () => {
    resetLayoutCache();
    const first = Array.from({ length: 8 }, (_, i) => `keep-${i}`);
    const before = layoutSignatures(first, 1920, 1080, [LOGO]);
    const after = layoutSignatures([...first, "newbie"], 1920, 1080, [LOGO]);
    const afterById = new Map(centers(after).map((row) => [row[0], row]));
    for (const row of centers(before)) {
      assert.deepEqual(afterById.get(row[0]), row);
    }
  });
});
