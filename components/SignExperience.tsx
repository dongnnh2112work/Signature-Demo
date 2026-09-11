"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { SIGNED_STORAGE_KEY, SIGNED_SVG_STORAGE_KEY, event } from "@/lib/event";
import { insertSignature } from "@/lib/signatures/client";
import { downloadPng, downloadSvg } from "@/lib/signatures/download";
import {
  SignaturePad,
  type SignaturePadHandle,
} from "@/components/SignaturePad";

type Status = "form" | "thanks";

function subscribeSigned(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getSignedSnapshot() {
  return window.localStorage.getItem(SIGNED_STORAGE_KEY) === "1";
}

function getSignedServerSnapshot() {
  return false;
}

export function SignExperience() {
  const padRef = useRef<SignaturePadHandle>(null);
  const [status, setStatus] = useState<Status>("form");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const alreadySigned = useSyncExternalStore(
    subscribeSigned,
    getSignedSnapshot,
    getSignedServerSnapshot,
  );

  function clearPad() {
    padRef.current?.clear();
    setError("");
  }

  async function confirm() {
    setError("");
    if (padRef.current?.isEmpty()) {
      setError(event.emptySignature);
      return;
    }

    const svg = padRef.current?.toSVG() ?? "";
    if (svg.length < 40) {
      setError(event.emptySignature);
      return;
    }

    setSubmitting(true);
    try {
      await insertSignature(svg);
    } catch {
      setSubmitting(false);
      setError(event.submitError);
      return;
    }
    setSubmitting(false);

    window.localStorage.setItem(SIGNED_STORAGE_KEY, "1");
    window.localStorage.setItem(SIGNED_SVG_STORAGE_KEY, svg);
    setStatus("thanks");
  }

  if (status === "thanks" || alreadySigned) {
    const title =
      status === "thanks" ? event.thanksTitle : event.alreadySignedTitle;
    const body =
      status === "thanks" ? event.thanksBody : event.alreadySignedBody;
    const savedSvg =
      typeof window === "undefined"
        ? ""
        : window.localStorage.getItem(SIGNED_SVG_STORAGE_KEY) ?? "";

    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10 text-center">
        <p className="text-xs font-medium tracking-[0.28em] text-gold uppercase">
          {event.name}
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-cream">{title}</h1>
        <p className="mt-3 text-base leading-7 text-cream/70">{body}</p>
        {savedSvg ? (
          <div className="mx-auto mt-8 flex w-full max-w-xs flex-col gap-3">
            <button
              type="button"
              onClick={() => downloadSvg(savedSvg, "chu-ky-cam-ket.svg")}
              className="h-12 rounded-full bg-gold px-6 text-sm font-semibold text-[#1a1408]"
            >
              {event.thanksDownload}
            </button>
            <button
              type="button"
              onClick={() => void downloadPng(savedSvg, "chu-ky-cam-ket.png")}
              className="h-12 rounded-full border border-white/15 px-6 text-sm font-medium text-cream/85"
            >
              {event.thanksDownloadPng}
            </button>
          </div>
        ) : null}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6">
      <header className="text-center">
        <p className="text-xs font-medium tracking-[0.28em] text-gold uppercase">
          {event.name} · {event.yearLabel}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-cream">{event.title}</h1>
        <p className="mt-2 text-sm text-cream/55">{event.subtitle}</p>
      </header>

      <p className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-center text-[15px] leading-7 text-cream/85">
        {event.pledge}
      </p>

      <p className="mt-6 mb-2 text-center text-xs tracking-wide text-cream/45">
        {event.signHint}
      </p>

      <div className="relative min-h-[220px] flex-1 overflow-hidden rounded-2xl border border-gold/35 bg-[#141210]">
        <SignaturePad
          ref={padRef}
          className="absolute inset-0 h-full w-full touch-none"
        />
      </div>

      {error ? (
        <p className="mt-3 text-center text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3 pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={clearPad}
          className="h-12 rounded-full border border-white/15 text-sm font-medium text-cream/80"
        >
          {event.clearLabel}
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={submitting}
          className="h-12 rounded-full bg-gold text-sm font-semibold text-[#1a1408] disabled:opacity-60"
        >
          {submitting ? event.submittingLabel : event.confirmLabel}
        </button>
      </div>
    </main>
  );
}
