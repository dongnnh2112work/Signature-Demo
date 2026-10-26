export type KmPhase = "idle" | "fly" | "flash" | "video" | "crossfade";

export type KmState = {
  phase: KmPhase;
  primed: boolean;
  generation: number;
};

export type KmEvent =
  | { type: "signal"; active: boolean; reducedMotion: boolean }
  | { type: "advance"; generation: number };

/** Owner-approved 30% slowdown on fly + stagger. Flash timing is unchanged. */
export const KM_FLY_SLOWDOWN = 1.3;
/** Per-card fly duration. Ease-in; delay is added on top. */
export const KM_FLY_DURATION_MS = Math.round(1520 * KM_FLY_SLOWDOWN);
export const KM_STAGGER_MIN_MS = Math.round(120 * KM_FLY_SLOWDOWN);
export const KM_STAGGER_MAX_MS = Math.round(360 * KM_FLY_SLOWDOWN);
/** Wait until the last (most delayed) card has arrived. */
export const KM_FLY_MS = KM_FLY_DURATION_MS + KM_STAGGER_MAX_MS;
/** Radial bloom expand + fade. */
export const KM_FLASH_MS = 820;
export const KM_CROSSFADE_MS = 720;
export const KM_RETURN_MS = 700;
export const KM_FLY_SCALE = 0.08;
export const KM_TOTAL_MS = KM_FLY_MS + KM_FLASH_MS;
export const KM_ANIMATED_PROPS = ["transform", "opacity"] as const;
export const KM_EASE_IN = "cubic-bezier(0.55, 0.06, 0.68, 0.19)";

export type KmBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type KmPoint = { cx: number; cy: number };

/** Visual center of the logo in root-local coordinates, including any transform. */
export function logoCenter(logo: KmBox, root: Pick<KmBox, "left" | "top">): KmPoint {
  return {
    cx: logo.left - root.left + logo.width / 2,
    cy: logo.top - root.top + logo.height / 2,
  };
}

/** Top-left of a card whose center lands on `center`. */
export function kmCardFlyTarget(center: KmPoint, cardW: number, cardH: number) {
  return {
    x: center.cx - cardW / 2,
    y: center.cy - cardH / 2,
  };
}

export function createKmState(): KmState {
  return { phase: "idle", primed: false, generation: 0 };
}

export function reduceKm(state: KmState, event: KmEvent): KmState {
  if (event.type === "advance") {
    if (event.generation !== state.generation) {
      return state;
    }
    if (state.phase === "fly") {
      return { ...state, phase: "flash" };
    }
    if (state.phase === "flash" || state.phase === "crossfade") {
      return { ...state, phase: "video" };
    }
    return state;
  }

  if (!state.primed) {
    return {
      phase: event.active ? "video" : "idle",
      primed: true,
      generation: state.generation,
    };
  }

  if (event.active) {
    if (state.phase !== "idle") {
      return state;
    }
    return {
      ...state,
      phase: event.reducedMotion ? "crossfade" : "fly",
    };
  }

  if (state.phase === "idle") {
    return state;
  }
  return {
    phase: "idle",
    primed: true,
    generation: state.generation + 1,
  };
}

export function kmPhaseDelay(phase: KmPhase): number | null {
  if (phase === "fly") {
    return KM_FLY_MS;
  }
  if (phase === "flash") {
    return KM_FLASH_MS;
  }
  if (phase === "crossfade") {
    return KM_CROSSFADE_MS;
  }
  return null;
}

export function kmVideoShouldPlay(phase: KmPhase) {
  return phase === "fly" || phase === "flash" || phase === "video" || phase === "crossfade";
}

export function kmVideoVisible(phase: KmPhase) {
  return phase === "flash" || phase === "video" || phase === "crossfade";
}

export function kmWallVisible(phase: KmPhase) {
  return phase === "idle" || phase === "fly" || phase === "crossfade";
}

export function kmFlashVisible(phase: KmPhase) {
  return phase === "flash";
}

export function kmShouldRestartVideo(from: KmPhase, to: KmPhase) {
  return from === "idle" && (to === "fly" || to === "crossfade" || to === "video");
}

export function kmFlyDelay(distance: number, maxDistance: number) {
  const t = maxDistance <= 0 ? 0 : Math.min(1, Math.max(0, distance / maxDistance));
  return Math.round(KM_STAGGER_MIN_MS + t * (KM_STAGGER_MAX_MS - KM_STAGGER_MIN_MS));
}
