"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Emblem } from "@/components/Emblem";
import { RasterSvg } from "@/components/RasterSvg";
import { WishBanner } from "@/components/WishBanner";
import { event } from "@/lib/event";
import { subscribeKeyMoment } from "@/lib/key-moment/client";
import {
  listSignatures,
  subscribeSignatures,
} from "@/lib/signatures/client";
import {
  WISH_ENTER_MS,
  mergeAdmitBatch,
  shouldAnimateEntrance,
} from "@/lib/signatures/entrance";
import {
  BASE_CARD_HEIGHT,
  BASE_CARD_WIDTH,
  type Rect,
  layoutSignatures,
} from "@/lib/signatures/layout";
import { reconcileSignatureSnapshot } from "@/lib/signatures/pages";
import type { SignatureRow } from "@/lib/supabase/types";

function WishVisual({
  message,
  svg,
  className,
}: {
  message: string;
  svg?: string;
  className?: string;
}) {
  if (message) {
    return <WishBanner message={message} className={className} />;
  }
  if (svg) {
    return (
      <div className={`wish-banner overflow-hidden ${className ?? ""}`}>
        <RasterSvg svg={svg} className="h-full w-full object-contain p-2" />
      </div>
    );
  }
  return <WishBanner message="…" className={className} />;
}

function measureExclusion(el: Element, root: Element): Rect {
  const a = el.getBoundingClientRect();
  const b = root.getBoundingClientRect();
  return {
    left: a.left - b.left,
    top: a.top - b.top,
    width: a.width,
    height: a.height,
  };
}

export function SignatureWall() {
  const mainRef = useRef<HTMLElement>(null);
  const emblemRef = useRef<HTMLImageElement>(null);
  const viewRef = useRef({ w: 0, h: 0 });
  const [view, setView] = useState(() => {
    if (typeof window === "undefined") {
      return { w: 0, h: 0 };
    }
    return { w: window.innerWidth, h: window.innerHeight };
  });
  const [items, setItems] = useState<SignatureRow[]>([]);
  const [exclusions, setExclusions] = useState<Rect[]>([]);
  const [entering, setEntering] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [veilKey, setVeilKey] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioUnlockedRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const admittedAtRef = useRef(new Map<string, number>());
  const itemsRef = useRef<SignatureRow[]>([]);
  const timeoutsRef = useRef<Set<number>>(new Set());
  const pendingRef = useRef<SignatureRow[]>([]);
  const rafRef = useRef(0);
  const primedRef = useRef(false);
  const wasRevealedRef = useRef(false);

  useEffect(() => {
    const node = mainRef.current;
    if (!node) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const next = {
        w: Math.round(entries[0]?.contentRect.width ?? 0),
        h: Math.round(entries[0]?.contentRect.height ?? 0),
      };
      viewRef.current = next;
      setView(next);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const emblem = emblemRef.current;
    const root = mainRef.current;
    if (!emblem || !root) {
      return;
    }
    const update = () => {
      const rect = measureExclusion(emblem, root);
      if (rect.width < 8 || rect.height < 8) {
        return;
      }
      setExclusions([rect]);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(emblem);
    observer.observe(root);
    emblem.addEventListener("load", update);
    return () => {
      observer.disconnect();
      emblem.removeEventListener("load", update);
    };
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => subscribeKeyMoment(setRevealed), []);

  useEffect(() => {
    const unlock = () => {
      audioUnlockedRef.current = true;
      const video = videoRef.current;
      if (video && !video.paused) {
        video.muted = false;
      }
    };
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const wasOn = wasRevealedRef.current;
    wasRevealedRef.current = revealed;

    if (!revealed) {
      video.pause();
      return;
    }

    const withSound = audioUnlockedRef.current;
    video.muted = !withSound;

    if (!wasOn) {
      setVeilKey((key) => key + 1);
      video.currentTime = 0;
    }

    void video.play().catch(() => {
      video.muted = true;
      void video.play().catch(() => {});
    });
  }, [revealed]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    function later(fn: () => void, ms: number) {
      const id = window.setTimeout(() => {
        timeoutsRef.current.delete(id);
        fn();
      }, ms);
      timeoutsRef.current.add(id);
      return id;
    }

    function markEntering(ids: string[]) {
      if (ids.length === 0) {
        return;
      }
      const animated = ids.filter((_, index) => shouldAnimateEntrance(index));
      if (animated.length === 0) {
        return;
      }
      setEntering((prev) => [...prev, ...animated]);
      later(() => {
        setEntering((prev) => prev.filter((id) => !animated.includes(id)));
      }, WISH_ENTER_MS);
    }

    function flushPending() {
      rafRef.current = 0;
      if (cancelled) {
        pendingRef.current = [];
        return;
      }
      const batch = pendingRef.current;
      pendingRef.current = [];
      if (batch.length === 0) {
        return;
      }
      const nextItems = mergeAdmitBatch(itemsRef.current, batch);
      itemsRef.current = nextItems;
      setItems(nextItems);
      markEntering(batch.map((row) => row.id));
    }

    function admit(row: SignatureRow) {
      if (!row?.id || seenIdsRef.current.has(row.id)) {
        return;
      }
      seenIdsRef.current.add(row.id);
      admittedAtRef.current.set(row.id, Date.now());
      pendingRef.current.push(row);
      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(flushPending);
      }
    }

    function remove(id: string) {
      seenIdsRef.current.delete(id);
      admittedAtRef.current.delete(id);
      pendingRef.current = pendingRef.current.filter((row) => row.id !== id);
      const nextItems = itemsRef.current.filter((item) => item.id !== id);
      itemsRef.current = nextItems;
      setItems(nextItems);
      setEntering((prev) => prev.filter((item) => item !== id));
    }

    async function pullSnapshot() {
      const started = Date.now();
      const rows = await listSignatures();
      if (cancelled) {
        return;
      }
      const keep: string[] = [];
      for (const [id, at] of admittedAtRef.current) {
        if (at >= started) {
          keep.push(id);
        }
      }
      const next = reconcileSignatureSnapshot(itemsRef.current, rows, keep);
      const fresh = primedRef.current
        ? next.filter((row) => !seenIdsRef.current.has(row.id)).map((row) => row.id)
        : [];
      primedRef.current = true;
      seenIdsRef.current = new Set(next.map((row) => row.id));
      itemsRef.current = next;
      setItems(next);
      markEntering(fresh);
    }

    async function start() {
      // Subscribe first, then fetch + merge/dedupe so rows arriving
      // during the initial read are not dropped.
      unsubscribe = subscribeSignatures(
        (row) => admit(row),
        (id) => remove(id),
        {
          onReconnect: () => {
            void pullSnapshot().catch(() => {
              // Keep the current wall; the next event or reconnect retries.
            });
          },
        },
      );

      try {
        await pullSnapshot();
        if (!cancelled) {
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError(event.wallError);
        }
      }
    }

    void start();

    const pending = timeoutsRef.current;
    return () => {
      cancelled = true;
      unsubscribe();
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      pendingRef.current = [];
      for (const timeout of pending) {
        window.clearTimeout(timeout);
      }
      pending.clear();
    };
  }, []);

  const layout = useMemo(
    () =>
      layoutSignatures(
        items.map((item) => item.id),
        view.w,
        view.h,
        exclusions,
      ),
    [items, view, exclusions],
  );

  const boxById = useMemo(
    () => new Map(layout.boxes.map((box) => [box.id, box])),
    [layout.boxes],
  );
  const enteringIds = useMemo(() => new Set(entering), [entering]);
  const fullness = Math.min(1, items.length / 80);

  return (
    <main
      ref={mainRef}
      className="relative h-dvh w-screen overflow-hidden bg-[#07122c] text-cream"
    >
      <div
        className={`wall-scene absolute inset-0 ${revealed ? "wall-scene-leave" : "wall-scene-show"}`}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 45%, rgba(42,109,181,0.35), transparent 42%), linear-gradient(180deg, #16325f 0%, #0b1b3f 48%, #07122c 100%)",
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wall-ribbons.svg"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.4 + fullness * 0.5 }}
        />
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 h-[38vmin] w-[38vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(232,200,114,${0.18 + fullness * 0.28}) 0%, transparent 68%)`,
            transform: `translate(-50%, -50%) scale(${0.92 + fullness * 0.12})`,
          }}
        />

        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-6 py-4">
          <div>
            <p className="text-[11px] font-medium tracking-[0.32em] text-gold uppercase">
              {event.name}
            </p>
            <h1 className="font-display mt-1 text-lg font-medium text-gold-soft italic text-[#f4e4b0]">
              {event.wallTitle}
            </h1>
          </div>
          <p className="text-sm tabular-nums text-cream/45">{items.length}</p>
        </header>

        <Emblem
          ref={emblemRef}
          className="pointer-events-none absolute top-1/2 left-1/2 z-10 w-[min(28vmin,280px)] -translate-x-1/2 -translate-y-1/2"
        />

        {error ? (
          <p className="relative z-20 flex h-full items-center justify-center px-8 text-center text-cream/70">
            {error}
          </p>
        ) : items.length === 0 ? (
          <p className="relative z-20 flex h-full items-center justify-center text-lg tracking-wide text-cream/35">
            {event.wallWaiting}
          </p>
        ) : (
          <div className="absolute inset-0 z-20">
            {items.map((item) => {
              const box = boxById.get(item.id);
              if (!box) {
                return null;
              }
              const cx = box.left + box.width / 2;
              const cy = box.top + box.height / 2;
              return (
                <article
                  key={item.id}
                  className={`wish-tile pointer-events-none${enteringIds.has(item.id) ? " wish-enter" : ""}`}
                  style={{
                    width: BASE_CARD_WIDTH,
                    height: BASE_CARD_HEIGHT,
                    transform: `translate3d(${cx - BASE_CARD_WIDTH / 2}px, ${cy - BASE_CARD_HEIGHT / 2}px, 0) rotate(${box.rotate}deg) scale(${box.scale})`,
                    zIndex: 2,
                  }}
                >
                  <div
                    className="wish-tile-inner"
                    style={{ animationDelay: `${(box.left + box.top) % 4000}ms` }}
                  >
                    <WishVisual message={item.message} svg={item.svg} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div
        className={`wall-scene absolute inset-0 ${revealed ? "wall-scene-show" : "wall-scene-wait"}`}
      >
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          src={event.keyVisualSrc}
          playsInline
          preload="auto"
        />
      </div>

      <div
        key={veilKey}
        className={`wall-unveil absolute inset-0 z-40 ${veilKey > 0 ? "wall-unveil-play" : ""}`}
      />
    </main>
  );
}
