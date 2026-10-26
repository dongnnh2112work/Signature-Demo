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
import { mergeSignatureRows } from "@/lib/signatures/pages";
import { SIGNATURE_ASPECT, layoutSignatures } from "@/lib/signatures/layout";
import type { SignatureRow } from "@/lib/supabase/types";

const POPUP_MS = 2400;
const PAGE_MS = 7000;

type Popup = {
  id: string;
  message: string;
  svg?: string;
  left: number;
  top: number;
  rotate: number;
  width: number;
  height: number;
};

function makePopup(row: SignatureRow, vw: number, vh: number): Popup {
  const width = Math.min(300, Math.max(168, Math.round(vw * 0.26)));
  const height = Math.round(width * SIGNATURE_ASPECT);
  return {
    id: row.id,
    message: row.message,
    svg: row.svg,
    width,
    height,
    left: Math.max(16, (vw - width) / 2),
    top: Math.max(72, vh * 0.16),
    rotate: -2,
  };
}

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

export function SignatureWall() {
  const mainRef = useRef<HTMLElement>(null);
  const viewRef = useRef({ w: 0, h: 0 });
  const [view, setView] = useState(() => {
    if (typeof window === "undefined") {
      return { w: 0, h: 0 };
    }
    return { w: window.innerWidth, h: window.innerHeight };
  });
  const [items, setItems] = useState<SignatureRow[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [veilKey, setVeilKey] = useState(0);
  const [page, setPage] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioUnlockedRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const itemsRef = useRef<SignatureRow[]>([]);
  const timeoutsRef = useRef<Set<number>>(new Set());
  const wasRevealedRef = useRef(false);

  function later(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      timeoutsRef.current.delete(id);
      fn();
    }, ms);
    timeoutsRef.current.add(id);
    return id;
  }

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

    function admit(row: SignatureRow, showPopup: boolean) {
      if (!row?.id || seenIdsRef.current.has(row.id)) {
        return;
      }
      seenIdsRef.current.add(row.id);
      const nextItems = [...itemsRef.current, row];
      itemsRef.current = nextItems;
      setItems(nextItems);

      if (!showPopup) {
        return;
      }

      const { w, h } = viewRef.current;
      const popup = makePopup(row, w, h);
      setPopups((prev) => [...prev, popup]);
      later(() => {
        setPopups((prev) => prev.filter((item) => item.id !== row.id));
      }, POPUP_MS);
    }

    function remove(id: string) {
      seenIdsRef.current.delete(id);
      const nextItems = itemsRef.current.filter((item) => item.id !== id);
      itemsRef.current = nextItems;
      setItems(nextItems);
    }

    async function pullSnapshot() {
      const rows = await listSignatures();
      if (cancelled) {
        return;
      }
      const merged = mergeSignatureRows(itemsRef.current, rows);
      for (const row of merged) {
        seenIdsRef.current.add(row.id);
      }
      itemsRef.current = merged;
      setItems(merged);
    }

    async function start() {
      // Subscribe first, then fetch + merge/dedupe so rows arriving
      // during the initial read are not dropped.
      unsubscribe = subscribeSignatures(
        (row) => admit(row, true),
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
      ),
    [items, view],
  );

  useEffect(() => {
    if (layout.pageCount <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setPage((current) => (current + 1) % layout.pageCount);
    }, PAGE_MS);
    return () => window.clearInterval(timer);
  }, [layout.pageCount]);

  const boxById = useMemo(
    () => new Map(layout.boxes.map((box) => [box.id, box])),
    [layout.boxes],
  );
  const popupIds = useMemo(
    () => new Set(popups.map((popup) => popup.id)),
    [popups],
  );
  const fullness = Math.min(1, items.length / 80);
  const livePage = layout.pageCount <= 1 ? 0 : page % layout.pageCount;

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
          <p className="text-sm tabular-nums text-cream/45">
            {items.length}
            {layout.pageCount > 1 ? ` · ${livePage + 1}/${layout.pageCount}` : ""}
          </p>
        </header>

        <Emblem
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
              if (!box || popupIds.has(item.id)) {
                return null;
              }
              const onPage = box.page === livePage;
              return (
                <article
                  key={item.id}
                  className="wish-tile pointer-events-none"
                  style={{
                    width: box.width,
                    height: box.height,
                    opacity: onPage ? 1 : 0,
                    transform: `translate3d(${box.left}px, ${box.top}px, 0) rotate(${box.rotate}deg)`,
                    transition: "opacity 0.9s ease",
                    zIndex: onPage ? 2 : 1,
                  }}
                >
                  <div
                    className={onPage ? "wish-tile-inner" : undefined}
                    style={
                      onPage
                        ? { animationDelay: `${(box.left + box.top) % 4000}ms` }
                        : undefined
                    }
                  >
                    <WishVisual message={item.message} svg={item.svg} />
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {popups.map((popup) => (
          <div
            key={popup.id}
            className="pointer-events-none absolute z-30"
            style={{
              width: popup.width,
              height: popup.height,
              transform: `translate3d(${popup.left}px, ${popup.top}px, 0) rotate(${popup.rotate}deg)`,
            }}
          >
            <div className="signature-popup h-full w-full">
              <WishVisual message={popup.message} svg={popup.svg} />
            </div>
          </div>
        ))}
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
