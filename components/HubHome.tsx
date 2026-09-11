"use client";

import Link from "next/link";
import { event } from "@/lib/event";

const routes = [
  {
    href: "/admin",
    title: event.hubAdmin,
    hint: event.hubAdminHint,
  },
  {
    href: "/sign",
    title: event.hubSign,
    hint: event.hubSignHint,
  },
  {
    href: "/wall",
    title: event.hubLed,
    hint: event.hubLedHint,
  },
] as const;

export function HubHome() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-12">
      <p className="text-center text-xs font-medium tracking-[0.28em] text-gold uppercase">
        {event.hubEyebrow}
      </p>
      <h1 className="mt-3 text-center text-4xl font-semibold text-cream">
        {event.hubTitle}
      </h1>
      <p className="mt-2 text-center text-sm text-cream/55">{event.hubSubtitle}</p>

      <nav className="mt-10 flex flex-col gap-3">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-5 transition-colors hover:border-gold/40 hover:bg-white/[0.08]"
          >
            <p className="text-lg font-semibold text-cream">{route.title}</p>
            <p className="mt-1 text-sm text-cream/55">{route.hint}</p>
          </Link>
        ))}
      </nav>

      <Link
        href="/qr"
        className="mt-8 text-center text-sm text-gold/80 underline-offset-4 hover:underline"
      >
        {event.hubQr}
      </Link>
    </main>
  );
}
