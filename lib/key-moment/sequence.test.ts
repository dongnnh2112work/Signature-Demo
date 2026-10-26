import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  KM_ANIMATED_PROPS,
  KM_FLASH_MS,
  KM_FLY_DURATION_MS,
  KM_FLY_MS,
  KM_FLY_SLOWDOWN,
  KM_STAGGER_MAX_MS,
  KM_STAGGER_MIN_MS,
  KM_TOTAL_MS,
  createKmState,
  kmCardFlyTarget,
  kmFlyDelay,
  kmLogoVisible,
  kmPhaseDelay,
  kmShouldRestartVideo,
  kmVideoShouldPlay,
  kmVideoVisible,
  kmWallVisible,
  logoCenter,
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
    assert.equal(KM_FLY_SLOWDOWN, 1.3);
    assert.equal(KM_FLY_DURATION_MS, Math.round(1520 * 1.3));
    assert.equal(KM_STAGGER_MIN_MS, Math.round(120 * 1.3));
    assert.equal(KM_STAGGER_MAX_MS, Math.round(360 * 1.3));
    assert.equal(KM_FLY_MS, KM_FLY_DURATION_MS + KM_STAGGER_MAX_MS);
    assert.equal(KM_FLASH_MS, 820);
    assert.equal(KM_TOTAL_MS, KM_FLY_MS + KM_FLASH_MS);
    assert.ok(KM_FLY_DURATION_MS >= 1900 && KM_FLY_DURATION_MS <= 2100);
    assert.ok(KM_FLY_MS >= 2400 && KM_FLY_MS <= 2500);
    assert.ok(KM_TOTAL_MS >= 3200 && KM_TOTAL_MS <= 3400);
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
    assert.ok(KM_STAGGER_MAX_MS - KM_STAGGER_MIN_MS <= 320);
    assert.deepEqual([...KM_ANIMATED_PROPS], ["transform", "opacity"]);
  });

  it("aims the fly-in at the measured logo center", () => {
    const root = { left: 40, top: 10, width: 1024, height: 576 };
    const logo = { left: 472, top: 218, width: 160, height: 160 };
    const center = logoCenter(logo, root);
    assert.equal(center.cx, 512);
    assert.equal(center.cy, 288);

    const cardW = 188;
    const cardH = 90.24;
    const target = kmCardFlyTarget(center, cardW, cardH);
    assert.equal(target.x + cardW / 2, center.cx);
    assert.equal(target.y + cardH / 2, center.cy);

    const scaled = { left: logo.left - 8, top: logo.top - 8, width: 176, height: 176 };
    const scaledCenter = logoCenter(scaled, root);
    assert.equal(scaledCenter.cx, center.cx);
    assert.equal(scaledCenter.cy, center.cy);
  });

  it("keeps the logo element visible in idle, fly, flash, and video", () => {
    const painted = { width: 161, height: 161, opacity: 1, display: "block", visibility: "visible" };
    for (const phase of ["idle", "fly", "flash", "video"] as const) {
      assert.equal(kmLogoVisible(painted), true, phase);
    }
    assert.equal(kmLogoVisible({ width: 0, height: 0, opacity: 1, display: "block" }), false);
    assert.equal(kmLogoVisible({ width: 161, height: 161, opacity: 0, display: "block" }), false);
    assert.equal(kmLogoVisible({ width: 161, height: 161, opacity: 1, display: "none" }), false);
    assert.equal(
      kmLogoVisible({ width: 161, height: 161, opacity: 1, display: "block", visibility: "hidden" }),
      false,
    );
  });
});
