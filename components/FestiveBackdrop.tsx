import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function FestiveBackdrop({ children, className }: Props) {
  return (
    <div className={`festive-bg relative overflow-hidden ${className ?? ""}`}>
      {/* eslint-disable @next/next/no-img-element */}
      <img
        src="/decor-lantern.svg"
        alt=""
        className="lantern-sway pointer-events-none absolute top-3 left-3 w-10 opacity-90 sm:w-14"
      />
      <img
        src="/decor-lantern.svg"
        alt=""
        className="lantern-sway pointer-events-none absolute top-3 right-3 w-10 opacity-90 sm:w-14"
        style={{ animationDelay: "-2.4s" }}
      />
      <img
        src="/decor-flower.svg"
        alt=""
        className="pointer-events-none absolute bottom-8 left-2 w-12 opacity-80 sm:w-16"
      />
      <img
        src="/decor-flower.svg"
        alt=""
        className="pointer-events-none absolute right-2 bottom-16 w-10 opacity-70 sm:w-14"
      />
      {/* eslint-enable @next/next/no-img-element */}
      {children}
    </div>
  );
}
