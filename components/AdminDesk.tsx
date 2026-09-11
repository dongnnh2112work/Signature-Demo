"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SignatureSvg } from "@/components/SignatureSvg";
import { event } from "@/lib/event";
import {
  clearSignatures,
  deleteSignature,
  listSignatures,
} from "@/lib/signatures/client";
import type { SignatureRow } from "@/lib/supabase/types";
import {
  downloadPng,
  downloadSignaturesOffline,
  downloadSvg,
  signatureFileName,
} from "@/lib/signatures/download";

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("vi-VN");
}

export function AdminDesk() {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [rows, setRows] = useState<SignatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listSignatures());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch("/api/admin/session")
      .then((res) => res.json())
      .then((data: { ok?: boolean }) => {
        setAuthed(Boolean(data.ok));
        if (data.ok) {
          void refresh();
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [refresh]);

  async function login() {
    setPinError("");
    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      setPinError(event.adminPinError);
      return;
    }
    setAuthed(true);
    void refresh();
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await deleteSignature(id);
      setRows((prev) => prev.filter((row) => row.id !== id));
    } finally {
      setBusyId("");
    }
  }

  async function clearAll() {
    if (!window.confirm(event.adminClearConfirm)) {
      return;
    }
    setBusyId("all");
    try {
      await clearSignatures();
      setRows([]);
    } finally {
      setBusyId("");
    }
  }

  if (!authed) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6">
        <Link href="/" className="text-xs text-cream/45">
          ← {event.hubTitle}
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-cream">
          {event.adminTitle}
        </h1>
        <label className="mt-6 text-sm text-cream/70">
          {event.adminPinLabel}
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void login();
              }
            }}
            className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-cream outline-none focus:border-gold/50"
          />
        </label>
        {pinError ? (
          <p className="mt-3 text-sm text-red-300" role="alert">
            {pinError}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void login()}
          className="mt-5 h-12 rounded-full bg-gold text-sm font-semibold text-[#1a1408]"
        >
          {event.adminPinAction}
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-xs text-cream/45">
            ← {event.hubTitle}
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-cream">
            {event.adminTitle}
          </h1>
          <p className="mt-1 text-sm text-cream/55">
            {event.adminCount}: {rows.length}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void downloadSignaturesOffline(rows)}
            disabled={rows.length === 0}
            className="h-10 rounded-full bg-gold px-4 text-sm font-medium text-[#1a1408] disabled:opacity-40"
          >
            {event.adminDownloadAll}
          </button>
          <button
            type="button"
            onClick={() => void clearAll()}
            disabled={busyId === "all" || rows.length === 0}
            className="h-10 rounded-full border border-white/15 px-4 text-sm text-cream/80 disabled:opacity-40"
          >
            {event.adminClear}
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <Link className="rounded-full bg-gold px-4 py-2 font-medium text-[#1a1408]" href="/wall">
          {event.adminOpenLed}
        </Link>
        <Link className="rounded-full border border-white/15 px-4 py-2 text-cream/80" href="/sign">
          {event.adminOpenSign}
        </Link>
        <Link className="rounded-full border border-white/15 px-4 py-2 text-cream/80" href="/qr">
          {event.adminOpenQr}
        </Link>
      </div>

      {loading ? (
        <p className="mt-10 text-sm text-cream/45">Đang tải…</p>
      ) : rows.length === 0 ? (
        <p className="mt-10 text-sm text-cream/45">{event.adminEmpty}</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-3"
            >
              <div className="h-16 w-28 shrink-0">
                <SignatureSvg svg={row.svg} className="h-full w-full" />
              </div>
              <p className="min-w-0 flex-1 text-sm text-cream/70">
                {formatTime(row.created_at)}
              </p>
              <button
                type="button"
                onClick={() =>
                  downloadSvg(row.svg, signatureFileName(row.id, row.created_at, "svg"))
                }
                className="text-sm text-gold/90"
              >
                {event.adminDownload}
              </button>
              <button
                type="button"
                onClick={() =>
                  void downloadPng(
                    row.svg,
                    signatureFileName(row.id, row.created_at, "png"),
                  )
                }
                className="text-sm text-gold/90"
              >
                {event.adminDownloadPng}
              </button>
              <button
                type="button"
                onClick={() => void remove(row.id)}
                disabled={busyId === row.id}
                className="text-sm text-red-300 disabled:opacity-40"
              >
                {event.adminDelete}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
