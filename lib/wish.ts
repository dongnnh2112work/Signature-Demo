import { escapeXml, unescapeXml } from "@/lib/sanitize";

function splitPair(value: string) {
  const dashed = value.split(/\s*[–—/-]\s*/);
  if (dashed.length >= 2 && dashed[0] && dashed[1]) {
    return {
      title: dashed[0].trim(),
      subtitle: dashed.slice(1).join(" ").trim().toUpperCase(),
    };
  }
  return null;
}

export function splitWish(message: string): { title: string; subtitle: string } {
  const text = message.trim();
  if (!text) {
    return { title: "", subtitle: "" };
  }

  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 2) {
    return splitPair(lines[0]) ?? {
      title: lines[0],
      subtitle: lines.slice(1).join(" ").toUpperCase(),
    };
  }

  const dashed = splitPair(text);
  if (dashed) {
    return dashed;
  }

  const words = text.split(/\s+/);
  if (words.length >= 3) {
    const mid = Math.max(1, Math.ceil(words.length / 2));
    return {
      title: words.slice(0, mid).join(" "),
      subtitle: words.slice(mid).join(" ").toUpperCase(),
    };
  }
  if (words.length === 2) {
    return { title: words[0], subtitle: words[1].toUpperCase() };
  }
  return { title: text, subtitle: "" };
}

export function messageToSvg(message: string) {
  const safe = escapeXml(message);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" width="800" height="200" data-kind="wish"><text x="32" y="116" font-size="48" fill="#faf4e6">${safe}</text></svg>`;
}

export function messageFromRow(row: {
  message?: string | null;
  svg?: string | null;
}) {
  if (row.message && row.message.trim()) {
    return row.message.trim();
  }
  const svg = row.svg ?? "";
  if (/data-kind="wish"/i.test(svg)) {
    const match = svg.match(/<text\b[^>]*>([\s\S]*?)<\/text>/i);
    return unescapeXml(match?.[1] ?? "").trim();
  }
  return "";
}

export function isWishSvg(svg: string) {
  return /data-kind="wish"/i.test(svg);
}
