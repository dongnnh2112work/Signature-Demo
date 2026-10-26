"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FestiveBackdrop } from "@/components/FestiveBackdrop";
import { WishBanner } from "@/components/WishBanner";
import { event } from "@/lib/event";
import { setKeyMoment, subscribeKeyMoment } from "@/lib/key-moment/client";
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
  wishBannerSvg,
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
  const [demo, setDemo] = useState(false);
  const [demoBanner, setDemoBanner] = useState("");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [rows, setRows] = useState<SignatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [keyMoment, setKeyMomentOn] = useState(false);
  const [keyMomentBusy, setKeyMomentBusy] = useState(false);
  const [confirm, setConfirm] = useState<"key" | "clear" | null>(null);
  const [canDelete, setCanDelete] = useState(false);
  const [actionError, setActionError] = useState("");
  const ignorePollUntilRef = useRef(0);

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
    if (!authed) {
      return;
    }
    return subscribeKeyMoment((active) => {
      if (Date.now() < ignorePollUntilRef.current) {
        return;
      }
      setKeyMomentOn(active);
    });
  }, [authed]);

  useEffect(() => {
    void fetch("/api/admin/session")
      .then((res) => res.json())
      .then((data: {
        ok?: boolean;
        demo?: boolean;
        demoBanner?: string | null;
        canDelete?: boolean;
      }) => {
        setAuthed(Boolean(data.ok));
        setDemo(Boolean(data.demo));
        setDemoBanner(data.demoBanner || event.adminDemoBanner);
        setCanDelete(data.canDelete === true);
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
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      canDelete?: boolean;
    };
    if (!res.ok) {
      setPinError(data.error || event.adminPinError);
      return;
    }
    setCanDelete(data.canDelete === true);
    setAuthed(true);
    void refresh();
  }

  async function remove(id: string) {
    setBusyId(id);
    setActionError("");
    try {
      await deleteSignature(id);
      setRows((prev) => prev.filter((row) => row.id !== id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : event.adminActionError);
    } finally {
      setBusyId("");
    }
  }

  async function toggleKeyMoment() {
    const next = !keyMoment;
    setKeyMomentBusy(true);
    setActionError("");
    try {
      await setKeyMoment(next);
      setKeyMomentOn(next);
      ignorePollUntilRef.current = Date.now() + 4000;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : event.adminActionError);
    } finally {
      setKeyMomentBusy(false);
    }
  }

  async function clearAll() {
    setBusyId("all");
    setActionError("");
    try {
      await clearSignatures();
      setRows([]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : event.adminActionError);
    } finally {
      setBusyId("");
    }
  }

  if (!authed) {
    if (loading) {
      return (
        <FestiveBackdrop className="min-h-dvh">
          <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6">
            <p className="text-sm text-cream/55">Đang tải…</p>
          </main>
        </FestiveBackdrop>
      );
    }
    return (
      <FestiveBackdrop className="min-h-dvh">
        <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6">
          <Link href="/" className="text-xs text-cream/45">
            ← {event.hubTitle}
          </Link>
          <h1 className="font-display mt-6 text-2xl font-semibold text-[#f4e4b0] italic">
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
      </FestiveBackdrop>
    );
  }

  return (
    <FestiveBackdrop className="min-h-dvh">
      <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 py-8">
        {demo ? (
          <p
            role="status"
            data-demo-banner=""
            className="mb-5 rounded-xl border-2 border-[#e8c872] bg-[#c41e3a] px-4 py-3 text-sm font-semibold tracking-wide text-[#faf4e6] shadow-[0_0_0_3px_rgba(232,200,114,0.28)]"
          >
            {demoBanner || event.adminDemoBanner}
          </p>
        ) : null}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/" className="text-xs text-cream/45">
              ← {event.hubTitle}
            </Link>
            <h1 className="font-display mt-3 text-2xl font-semibold text-[#f4e4b0] italic">
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
              onClick={() => setConfirm("clear")}
              disabled={busyId === "all" || rows.length === 0 || !canDelete}
              className="h-10 rounded-full border border-white/15 px-4 text-sm text-cream/80 disabled:opacity-40"
            >
              {event.adminClear}
            </button>
          </div>
        </div>

        {!canDelete ? (
          <p className="mt-5 rounded-xl border border-gold/30 bg-black/20 px-4 py-3 text-sm text-cream/75">
            {event.adminNeedServiceRole}
          </p>
        ) : null}
        {actionError ? (
          <p className="mt-4 text-sm text-red-300" role="alert">
            {actionError}
          </p>
        ) : null}

        <section className="festive-frame mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/35 bg-gold/10 px-4 py-4">
          <div>
            <p className="text-xs font-medium tracking-[0.22em] text-gold uppercase">
              {event.adminKeyMomentTitle}
            </p>
            <p className="mt-1 text-sm text-cream/70">
              {keyMoment ? event.adminKeyMomentOn : event.adminKeyMomentOff}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!keyMoment) {
                setConfirm("key");
                return;
              }
              void toggleKeyMoment();
            }}
            disabled={keyMomentBusy}
            className="h-11 rounded-full bg-cream px-5 text-sm font-semibold text-[#1a1408] disabled:opacity-40"
          >
            {keyMoment ? event.adminKeyMomentDeactivate : event.adminKeyMomentActivate}
          </button>
        </section>

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
                  <WishBanner message={row.message} />
                </div>
                <p className="min-w-0 flex-1 text-sm text-cream/70">
                  {row.message}
                  <span className="mt-1 block text-xs text-cream/40">
                    {formatTime(row.created_at)}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() =>
                    downloadSvg(
                      wishBannerSvg(row.message),
                      signatureFileName(row.id, row.created_at, "svg"),
                    )
                  }
                  className="text-sm text-gold/90"
                >
                  {event.adminDownload}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void downloadPng(
                      wishBannerSvg(row.message),
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
                  disabled={busyId === row.id || !canDelete}
                  className="text-sm text-red-300 disabled:opacity-40"
                >
                  {event.adminDelete}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <ConfirmDialog
        open={confirm === "key"}
        title={event.adminKeyMomentTitle}
        body={event.adminKeyMomentConfirm}
        confirmLabel={event.adminConfirm}
        cancelLabel={event.adminCancel}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void toggleKeyMoment();
        }}
      />
      <ConfirmDialog
        open={confirm === "clear"}
        title={event.adminClear}
        body={event.adminClearConfirm}
        confirmLabel={event.adminClear}
        cancelLabel={event.adminCancel}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void clearAll();
        }}
      />
    </FestiveBackdrop>
  );
}
