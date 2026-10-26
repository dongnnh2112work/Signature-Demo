"use client";

import { useState } from "react";
import { Emblem } from "@/components/Emblem";
import { FestiveBackdrop } from "@/components/FestiveBackdrop";
import { event } from "@/lib/event";
import { MESSAGE_MAX_LENGTH } from "@/lib/sanitize";
import { insertSignature } from "@/lib/signatures/client";
import { signFormAfterSuccess } from "@/lib/sign-flow";

export function SignExperience() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function confirm() {
    setError("");
    setFlash("");
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

    const next = signFormAfterSuccess();
    setMessage(next.message);
    setFlash(event.thanksBody);
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
        {flash ? (
          <p className="mt-3 text-center text-sm text-gold" role="status">
            {flash}
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
