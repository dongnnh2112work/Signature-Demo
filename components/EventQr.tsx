"use client";

import { QRCodeSVG } from "qrcode.react";
import { event } from "@/lib/event";

type Props = {
  url: string;
};

export function EventQr({ url }: Props) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-xs font-medium tracking-[0.28em] text-gold uppercase">
        {event.name} · {event.yearLabel}
      </p>
      <h1 className="mt-4 max-w-xl text-3xl font-semibold text-cream sm:text-4xl">
        {event.qrTitle}
      </h1>
      <p className="mt-3 text-base text-cream/60">{event.qrHint}</p>

      <div className="mt-10 rounded-3xl bg-white p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
        <QRCodeSVG value={url} size={280} level="M" includeMargin={false} />
      </div>

      <p className="mt-6 break-all text-sm text-gold/90">{url}</p>
      <p className="mt-10 text-xs text-cream/40">{event.qrStaffNote}</p>
    </main>
  );
}
