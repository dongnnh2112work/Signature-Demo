"use client";

import { useEffect, useState } from "react";
import { sanitizeSvgMarkup } from "@/lib/sanitize";

const cache = new Map<string, string>();

type Props = {
  svg: string;
  className?: string;
};

export function RasterSvg({ svg, className }: Props) {
  const cached = cache.get(svg) ?? "";
  const [src, setSrc] = useState("");
  const display = cached || src;

  useEffect(() => {
    if (cache.has(svg)) {
      return;
    }
    const safe = sanitizeSvgMarkup(svg);
    if (!safe) {
      return;
    }

    let cancelled = false;
    const image = new Image();
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(safe)}`;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(image.naturalWidth || 400, 1);
      canvas.height = Math.max(image.naturalHeight || 200, 1);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }
      ctx.drawImage(image, 0, 0);
      const png = canvas.toDataURL("image/png");
      cache.set(svg, png);
      if (!cancelled) {
        setSrc(png);
      }
    };
    image.src = url;
    return () => {
      cancelled = true;
    };
  }, [svg]);

  if (!display) {
    return <div className={className} />;
  }
  // Data-URL from canvas; next/image is not appropriate here.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={display} alt="" className={className} />
  );
}
