"use client";

import { QRCodeSVG } from "qrcode.react";
import { Emblem } from "@/components/Emblem";
import { FestiveBackdrop } from "@/components/FestiveBackdrop";
import { event } from "@/lib/event";

type Props = {
  url: string;
};

export function EventQr({ url }: Props) {
  return (
    <FestiveBackdrop className="min-h-dvh">
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-10 text-center">
        <Emblem className="w-16" />
        <p className="mt-3 text-xs font-medium tracking-[0.28em] text-gold uppercase">
          {event.name} · {event.yearLabel}
        </p>
        <h1 className="font-display mt-4 max-w-xl text-3xl font-semibold text-[#f4e4b0] italic sm:text-4xl">
          {event.qrTitle}
        </h1>
        <p className="mt-3 text-base text-cream/60">{event.qrHint}</p>

        <div className="mt-10 rounded-3xl bg-white p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
          <QRCodeSVG value={url} size={280} level="M" includeMargin={false} />
        </div>

        <p className="mt-6 break-all text-sm text-gold/90">{url}</p>
        <p className="mt-10 text-xs text-cream/40">{event.qrStaffNote}</p>
      </main>
    </FestiveBackdrop>
  );
}
