"use client";

import { useState, useSyncExternalStore } from "react";
import { Emblem } from "@/components/Emblem";
import { FestiveBackdrop } from "@/components/FestiveBackdrop";
import {
  SIGNED_MESSAGE_STORAGE_KEY,
  SIGNED_STORAGE_KEY,
  event,
} from "@/lib/event";
import { MESSAGE_MAX_LENGTH } from "@/lib/sanitize";
import { insertSignature } from "@/lib/signatures/client";
import { downloadPng, downloadSvg, wishBannerSvg } from "@/lib/signatures/download";

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
  const [status, setStatus] = useState<Status>("form");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const alreadySigned = useSyncExternalStore(
    subscribeSigned,
    getSignedSnapshot,
    getSignedServerSnapshot,
  );

  async function confirm() {
    setError("");
    const text = message.trim();
    if (text.length < 2) {
      setError(event.emptySignature);
      return;
    }

    setSubmitting(true);
    try {
      await insertSignature(text.slice(0, MESSAGE_MAX_LENGTH));
    } catch {
      setSubmitting(false);
      setError(event.submitError);
      return;
    }
    setSubmitting(false);

    window.localStorage.setItem(SIGNED_STORAGE_KEY, "1");
    window.localStorage.setItem(SIGNED_MESSAGE_STORAGE_KEY, text);
    setStatus("thanks");
  }

  if (status === "thanks" || alreadySigned) {
    const title =
      status === "thanks" ? event.thanksTitle : event.alreadySignedTitle;
    const body =
      status === "thanks" ? event.thanksBody : event.alreadySignedBody;
    const saved =
      typeof window === "undefined"
        ? ""
        : window.localStorage.getItem(SIGNED_MESSAGE_STORAGE_KEY) ?? "";

    return (
      <FestiveBackdrop className="min-h-dvh">
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10 text-center">
          <Emblem className="mx-auto w-24" />
          <h1 className="font-display mt-4 text-3xl font-semibold text-[#f4e4b0] italic">
            {title}
          </h1>
          <p className="mt-3 text-base leading-7 text-cream/70">{body}</p>
          {saved ? (
            <div className="mx-auto mt-8 flex w-full max-w-xs flex-col gap-3">
              <button
                type="button"
                onClick={() => downloadSvg(wishBannerSvg(saved), "loi-chuc.svg")}
                className="h-12 rounded-full bg-gold px-6 text-sm font-semibold text-[#1a1408]"
              >
                {event.thanksDownload}
              </button>
              <button
                type="button"
                onClick={() => void downloadPng(wishBannerSvg(saved), "loi-chuc.png")}
                className="h-12 rounded-full border border-white/15 px-6 text-sm font-medium text-cream/85"
              >
                {event.thanksDownloadPng}
              </button>
            </div>
          ) : null}
        </main>
      </FestiveBackdrop>
    );
  }

  return (
    <FestiveBackdrop className="min-h-dvh">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6">
        <header className="text-center">
          <Emblem className="mx-auto w-[5.5rem]" />
          <h1 className="font-display mt-3 text-[2rem] leading-tight font-semibold text-[#f4e4b0] italic">
            {event.title}
          </h1>
          <p className="mt-2 text-sm text-cream/70">{event.subtitle}</p>
        </header>

        <label className="mt-8 flex min-h-[220px] flex-1 flex-col">
          <span className="sr-only">{event.signHint}</span>
          <textarea
            value={message}
            maxLength={MESSAGE_MAX_LENGTH}
            placeholder={event.signHint}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[180px] flex-1 resize-none rounded-2xl border border-gold/40 bg-[#0e1c3a]/80 px-4 py-4 text-[15px] leading-7 text-cream outline-none placeholder:text-cream/35 focus:border-gold"
          />
          <span className="mt-2 text-right text-xs tabular-nums text-cream/45">
            {message.length}/{MESSAGE_MAX_LENGTH}
          </span>
        </label>

        {error ? (
          <p className="mt-3 text-center text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void confirm()}
          disabled={submitting}
          className="mt-4 mb-[env(safe-area-inset-bottom)] inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gold text-sm font-semibold text-[#1a1408] disabled:opacity-60"
        >
          {submitting ? event.submittingLabel : event.confirmLabel}
          <svg
            className="send-icon"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M4 12h14M12 5l7 7-7 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </main>
    </FestiveBackdrop>
  );
}
