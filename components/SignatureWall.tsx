"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SignatureSvg } from "@/components/SignatureSvg";
import { event } from "@/lib/event";
import {
  listSignatures,
  subscribeSignatures,
} from "@/lib/signatures/client";
import {
  SIGNATURE_ASPECT,
  layoutSignatures,
  placePopup,
  type Box,
} from "@/lib/signatures/layout";
import type { SignatureRow } from "@/lib/supabase/types";

const POPUP_MS = 2400;

type Popup = {
  id: string;
  svg: string;
  left: number;
  top: number;
  rotate: number;
  width: number;
  height: number;
};

function makePopup(
  row: SignatureRow,
  packed: Box[],
  vw: number,
  vh: number,
): Popup | null {
  const self = packed.find((box) => box.id === row.id);
  const others = packed.filter((box) => box.id !== row.id);
  const base = self?.width ?? 140;

  for (const scale of [1.85, 1.5, 1.25, 1]) {
    const width = Math.round(base * scale);
    const height = Math.round(width * SIGNATURE_ASPECT);
    const placed = placePopup(others, vw, vh, width, height);
    if (placed) {
      return { id: row.id, svg: row.svg, width, height, ...placed };
    }
  }

  return null;
}

export function SignatureWall() {
  const mainRef = useRef<HTMLElement>(null);
  const viewRef = useRef({ w: 0, h: 0 });
  const [view, setView] = useState(() => {
    if (typeof window === "undefined") {
      return { w: 0, h: 0 };
    }
    const next = { w: window.innerWidth, h: window.innerHeight };
    viewRef.current = next;
    return next;
  });
  const [items, setItems] = useState<SignatureRow[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [error, setError] = useState("");
  const seenIdsRef = useRef<Set<string>>(new Set());
  const itemsRef = useRef<SignatureRow[]>([]);
  const timeoutsRef = useRef<number[]>([]);

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
      const packed = layoutSignatures(
        nextItems.map((item) => item.id),
        w,
        h,
      );
      const popup = makePopup(row, packed, w, h);
      if (!popup) {
        return;
      }
      setPopups((prev) => [...prev, popup]);
      const timeout = window.setTimeout(() => {
        setPopups((prev) => prev.filter((item) => item.id !== row.id));
      }, POPUP_MS);
      timeoutsRef.current.push(timeout);
    }

    async function start() {
      try {
        const rows = await listSignatures();
        if (cancelled) {
          return;
        }
        for (const row of rows) {
          seenIdsRef.current.add(row.id);
        }
        itemsRef.current = rows;
        setItems(rows);
      } catch {
        if (!cancelled) {
          setError(event.wallError);
        }
        return;
      }

      if (cancelled) {
        return;
      }

      unsubscribe = subscribeSignatures((row) => admit(row, true));
    }

    void start();

    return () => {
      cancelled = true;
      unsubscribe();
      for (const timeout of timeoutsRef.current) {
        window.clearTimeout(timeout);
      }
    };
  }, []);

  const boxes = useMemo(
    () =>
      layoutSignatures(
        items.map((item) => item.id),
        view.w,
        view.h,
      ),
    [items, view],
  );
  const boxById = useMemo(
    () => new Map(boxes.map((box) => [box.id, box])),
    [boxes],
  );
  const popupIds = useMemo(
    () => new Set(popups.map((popup) => popup.id)),
    [popups],
  );

  return (
    <main
      ref={mainRef}
      className="relative h-dvh w-screen overflow-hidden bg-black text-cream"
    >
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-6 py-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.32em] text-gold uppercase">
            {event.name}
          </p>
          <h1 className="mt-1 text-lg font-medium text-cream/90">
            {event.wallTitle}
          </h1>
        </div>
        <p className="text-sm tabular-nums text-cream/45">{items.length}</p>
      </header>

      {error ? (
        <p className="flex h-full items-center justify-center px-8 text-center text-cream/70">
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="flex h-full items-center justify-center text-lg tracking-wide text-cream/35">
          {event.wallWaiting}
        </p>
      ) : (
        <div className="absolute inset-0">
          {items.map((item) => {
            const box = boxById.get(item.id);
            if (!box || popupIds.has(item.id)) {
              return null;
            }
            return (
              <article
                key={item.id}
                className="signature-tile pointer-events-none absolute"
                style={{
                  left: box.left,
                  top: box.top,
                  width: box.width,
                  height: box.height,
                  transform: `rotate(${box.rotate}deg)`,
                }}
              >
                <SignatureSvg svg={item.svg} className="h-full w-full" />
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
            left: popup.left,
            top: popup.top,
            width: popup.width,
            height: popup.height,
            transform: `rotate(${popup.rotate}deg)`,
          }}
        >
          <article className="signature-popup h-full w-full rounded-2xl border border-gold/40 bg-[#16130e] p-4">
            <SignatureSvg svg={popup.svg} className="h-full w-full" />
          </article>
        </div>
      ))}
    </main>
  );
}
