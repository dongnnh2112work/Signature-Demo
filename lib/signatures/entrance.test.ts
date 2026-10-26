import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  WISH_ENTER_MAX_ANIMATED,
  WISH_ENTER_SCALE,
  mergeAdmitBatch,
  placeRandomNonOverlapping,
  rectsOverlap,
  shouldAnimateEntrance,
} from "./entrance.ts";

describe("wish entrance motion", () => {
  it("does not scale new wishes (fade only)", () => {
    assert.equal(WISH_ENTER_SCALE, 1);
  });

  it("places a concurrent burst at distinct non-overlapping positions", () => {
    let seed = 1;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const placed = placeRandomNonOverlapping(
      12,
      [],
      { vw: 1920, vh: 1080, width: 160, height: 76 },
      rng,
    );
    assert.equal(placed.length, 12);
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        assert.equal(
          rectsOverlap(placed[i], placed[j]),
          false,
          `overlap ${i} vs ${j}`,
        );
      }
    }
  });

  it("merges a burst in one batch (no serialized queue)", () => {
    const current = [{ id: "a" }];
    const burst = Array.from({ length: 50 }, (_, i) => ({ id: `n${i}` }));
    const next = mergeAdmitBatch(current, burst);
    assert.equal(next.length, 51);
    assert.equal(next[0].id, "a");
    assert.equal(next[50].id, "n49");
  });

  it("caps fade-ins for very large bursts; the rest still appear", () => {
    assert.equal(shouldAnimateEntrance(0), true);
    assert.equal(shouldAnimateEntrance(WISH_ENTER_MAX_ANIMATED - 1), true);
    assert.equal(shouldAnimateEntrance(WISH_ENTER_MAX_ANIMATED), false);
    assert.equal(shouldAnimateEntrance(80), false);
  });
});
