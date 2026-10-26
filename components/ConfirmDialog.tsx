"use client";

type Props = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  initialFocus?: "cancel" | "confirm";
};

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  initialFocus,
}: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-2xl border border-gold/40 bg-[#12244a] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
      >
        <h2 id="confirm-title" className="text-lg font-semibold text-cream">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-cream/70">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            autoFocus={initialFocus === "cancel"}
            onClick={onCancel}
            className="h-10 rounded-full border border-white/15 px-4 text-sm text-cream/80"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            autoFocus={initialFocus === "confirm"}
            onClick={onConfirm}
            className="h-10 rounded-full bg-gold px-4 text-sm font-semibold text-[#1a1408]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
