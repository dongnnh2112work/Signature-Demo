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
/** Extra cover if the first decoded frame is late. */
export const KM_FLASH_HOLD_MAX_MS = 500;
/** Peak of the approved 820ms bloom (34% keyframe). */
export const KM_FLASH_PEAK_MS = Math.round(KM_FLASH_MS * 0.34);
/**
 * Start playback after the bloom is covering, late enough that
 * currentTime at the 820ms fade stays under 0.5s even with a
 * couple of frames of sampling lag.
 */
export const KM_FLASH_PLAY_AT_MS = Math.max(KM_FLASH_PEAK_MS, KM_FLASH_MS - 300);
export const KM_HAVE_ENOUGH_DATA = 4;
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

export type KmLogoStyle = {
  width: number;
  height: number;
  opacity: number;
  display: string;
  visibility?: string;
};

/** True when the emblem itself is painted (not collapsed, hidden, or faded). */
export function kmLogoVisible(style: KmLogoStyle) {
  return (
    style.width >= 8 &&
    style.height >= 8 &&
    style.opacity > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  );
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

export type KmVideoAction = "pause" | "preload" | "play";

/** Fly preloads a paused frame-0; playback starts at flash (or video/crossfade). */
export function kmVideoAction(phase: KmPhase): KmVideoAction {
  if (phase === "fly") {
    return "preload";
  }
  if (phase === "flash" || phase === "video" || phase === "crossfade") {
    return "play";
  }
  return "pause";
}

export function kmVideoShouldPlay(phase: KmPhase) {
  return kmVideoAction(phase) === "play";
}

export function kmVideoShouldPreload(phase: KmPhase) {
  return kmVideoAction(phase) === "preload";
}

export function kmVideoReadyToReveal(readyState: number) {
  return readyState >= KM_HAVE_ENOUGH_DATA;
}

/**
 * When to advance out of flash. Never shorter than the approved bloom;
 * if the first frame is late, wait up to KM_FLASH_HOLD_MAX_MS extra.
 */
export function kmFlashAdvanceAtMs(firstFrameAtMs: number | null) {
  const cap = KM_FLASH_MS + KM_FLASH_HOLD_MAX_MS;
  if (firstFrameAtMs == null) {
    return cap;
  }
  return Math.min(cap, Math.max(KM_FLASH_MS, firstFrameAtMs));
}

/** currentTime at flash fade if playback began at `playAtMs` into the flash. */
export function kmRevealCurrentTimeSec(playAtMs: number, fadeAtMs: number) {
  return Math.max(0, fadeAtMs - playAtMs) / 1000;
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

export function kmShouldSeekToStart(from: KmPhase, to: KmPhase) {
  return (
    kmShouldRestartVideo(from, to) || (from === "fly" && to === "flash")
  );
}

export type KmVideoNode = {
  pause: () => void;
  play: () => Promise<void>;
  currentTime: number;
  muted: boolean;
  paused: boolean;
  readyState: number;
};

export async function playKmVideo(
  video: KmVideoNode,
  muted: boolean,
  fromStart = true,
) {
  video.muted = muted;
  if (fromStart) {
    video.currentTime = 0;
  }
  try {
    await video.play();
    return "ok" as const;
  } catch {
    video.muted = true;
    try {
      await video.play();
      return "muted" as const;
    } catch {
      return "blocked" as const;
    }
  }
}

export async function preloadKmVideo(video: KmVideoNode, muted: boolean) {
  video.muted = muted;
  video.pause();
  video.currentTime = 0;
  if (!kmVideoReadyToReveal(video.readyState)) {
    return "loading" as const;
  }
  const result = await playKmVideo(video, muted, true);
  video.pause();
  video.currentTime = 0;
  return result === "blocked" ? "blocked" : ("primed" as const);
}

export function kmFlyDelay(distance: number, maxDistance: number) {
  const t = maxDistance <= 0 ? 0 : Math.min(1, Math.max(0, distance / maxDistance));
  return Math.round(KM_STAGGER_MIN_MS + t * (KM_STAGGER_MAX_MS - KM_STAGGER_MIN_MS));
}
