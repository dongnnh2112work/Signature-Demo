import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  KM_ANIMATED_PROPS,
  KM_FLASH_MS,
  KM_FLY_DURATION_MS,
  KM_FLY_MS,
  KM_STAGGER_MAX_MS,
  KM_STAGGER_MIN_MS,
  KM_TOTAL_MS,
  createKmState,
  kmFlyDelay,
  kmPhaseDelay,
  kmShouldRestartVideo,
  kmVideoShouldPlay,
  kmVideoVisible,
  kmWallVisible,
  reduceKm,
} from "./sequence.ts";

describe("Key Moment wall sequence", () => {
  it("runs fly → flash → video on a live activate", () => {
    let state = reduceKm(createKmState(), {
      type: "signal",
      active: false,
      reducedMotion: false,
    });
    assert.equal(state.phase, "idle");
    assert.equal(state.primed, true);

    state = reduceKm(state, { type: "signal", active: true, reducedMotion: false });
    assert.equal(state.phase, "fly");
    assert.equal(kmPhaseDelay("fly"), KM_FLY_MS);
    assert.equal(kmVideoShouldPlay("fly"), true);
    assert.equal(kmVideoVisible("fly"), false);
    assert.equal(kmWallVisible("fly"), true);
    assert.equal(kmShouldRestartVideo("idle", "fly"), true);

    state = reduceKm(state, { type: "advance", generation: state.generation });
    assert.equal(state.phase, "flash");
    assert.equal(kmVideoVisible("flash"), true);
    assert.equal(kmWallVisible("flash"), false);

    state = reduceKm(state, { type: "advance", generation: state.generation });
    assert.equal(state.phase, "video");
    assert.equal(kmShouldRestartVideo("flash", "video"), false);
    assert.ok(KM_TOTAL_MS >= 2500 && KM_TOTAL_MS <= 3000);
    assert.ok(KM_FLY_DURATION_MS >= 1500 && KM_FLY_MS <= 2000);
    assert.ok(KM_FLASH_MS >= 400 && KM_FLASH_MS <= 900);
  });

  it("aborts cleanly mid-sequence and ignores a stale advance", () => {
    let state = reduceKm(createKmState(), {
      type: "signal",
      active: false,
      reducedMotion: false,
    });
    state = reduceKm(state, { type: "signal", active: true, reducedMotion: false });
    assert.equal(state.phase, "fly");
    const gen = state.generation;

    state = reduceKm(state, { type: "signal", active: false, reducedMotion: false });
    assert.equal(state.phase, "idle");
    assert.ok(state.generation > gen);
    assert.equal(kmWallVisible("idle"), true);
    assert.equal(kmVideoShouldPlay("idle"), false);

    state = reduceKm(state, { type: "advance", generation: gen });
    assert.equal(state.phase, "idle");

    state = reduceKm(state, { type: "signal", active: true, reducedMotion: false });
    assert.equal(state.phase, "fly");
    state = reduceKm(state, { type: "advance", generation: state.generation });
    assert.equal(state.phase, "flash");
    state = reduceKm(state, { type: "signal", active: false, reducedMotion: false });
    assert.equal(state.phase, "idle");
  });

  it("skips the sequence when Key Moment is already active on load", () => {
    const state = reduceKm(createKmState(), {
      type: "signal",
      active: true,
      reducedMotion: false,
    });
    assert.equal(state.phase, "video");
    assert.equal(state.primed, true);
    assert.equal(kmVideoVisible("video"), true);
    assert.equal(kmShouldRestartVideo("idle", "video"), true);
  });

  it("uses a simple crossfade when reduced motion is preferred", () => {
    let state = reduceKm(createKmState(), {
      type: "signal",
      active: false,
      reducedMotion: true,
    });
    state = reduceKm(state, { type: "signal", active: true, reducedMotion: true });
    assert.equal(state.phase, "crossfade");
    state = reduceKm(state, { type: "advance", generation: state.generation });
    assert.equal(state.phase, "video");
  });

  it("staggers fly-in by distance and only animates transform and opacity", () => {
    assert.equal(kmFlyDelay(0, 1000), KM_STAGGER_MIN_MS);
    assert.equal(kmFlyDelay(1000, 1000), KM_STAGGER_MAX_MS);
    assert.ok(kmFlyDelay(400, 1000) > KM_STAGGER_MIN_MS);
    assert.ok(KM_STAGGER_MAX_MS - KM_STAGGER_MIN_MS <= 300);
    assert.deepEqual([...KM_ANIMATED_PROPS], ["transform", "opacity"]);
  });
});
