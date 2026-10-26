const MAX_MESSAGE = 200;
const MAX_SVG = 48_000;

const ALLOWED_TAGS = new Set([
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "rect",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "defs",
  "title",
  "desc",
]);

const ALLOWED_ATTR = new Set([
  "d",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "viewBox",
  "xmlns",
  "width",
  "height",
  "x",
  "y",
  "dx",
  "dy",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "transform",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "font-size",
  "font-family",
  "text-anchor",
  "points",
  "data-kind",
]);

export function sanitizeMessage(input: string) {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MESSAGE);
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function unescapeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function isSafeAttrValue(value: string) {
  const v = value.trim().toLowerCase();
  return (
    !v.includes("javascript:") &&
    !v.includes("data:") &&
    !v.includes("expression(") &&
    !v.startsWith("url(")
  );
}

/**
 * Strict whitelist sanitizer for legacy signature SVGs.
 * Rejects scripts, event handlers, foreignObject, and unknown tags/attrs.
 */
export function sanitizeSvgMarkup(svg: string): string | null {
  if (typeof svg !== "string" || svg.length < 20 || svg.length > MAX_SVG) {
    return null;
  }
  if (!/<svg[\s>]/i.test(svg)) {
    return null;
  }
  const lower = svg.toLowerCase();
  if (
    lower.includes("<script") ||
    lower.includes("foreignobject") ||
    lower.includes("<iframe") ||
    lower.includes("<image") ||
    lower.includes("<use") ||
    lower.includes("javascript:") ||
    lower.includes("<style") ||
    /\bon[a-z]+\s*=/.test(lower)
  ) {
    return null;
  }

  const stripped = svg.replace(/<!--[\s\S]*?-->/g, "").trim();
  const pieces: string[] = [];
  const token = /<\/?([a-zA-Z][\w:-]*)([^>]*)\/?>|([^<]+)/g;
  let match: RegExpExecArray | null;
  const stack: string[] = [];

  while ((match = token.exec(stripped))) {
    if (match[3] !== undefined) {
      if (stack[stack.length - 1] === "text" || stack[stack.length - 1] === "tspan") {
        pieces.push(escapeXml(unescapeXml(match[3])));
      }
      continue;
    }

    const tag = match[1].toLowerCase();
    const rawAttrs = match[2] ?? "";
    const selfClosing = /\/\s*$/.test(rawAttrs) || match[0].endsWith("/>");
    const closing = match[0].startsWith("</");

    if (!ALLOWED_TAGS.has(tag)) {
      return null;
    }

    if (closing) {
      if (stack.pop() !== tag) {
        return null;
      }
      pieces.push(`</${tag}>`);
      continue;
    }

    const attrs: string[] = [];
    const attrRe = /([a-zA-Z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRe.exec(rawAttrs))) {
      const name = attrMatch[1];
      const value = attrMatch[3] ?? attrMatch[4] ?? "";
      if (name.startsWith("xmlns")) {
        if (name === "xmlns" && value.includes("svg")) {
          attrs.push(`xmlns="${escapeXml(value)}"`);
        }
        continue;
      }
      if (!ALLOWED_ATTR.has(name) || !isSafeAttrValue(value)) {
        continue;
      }
      attrs.push(`${name}="${escapeXml(value)}"`);
    }

    const open = attrs.length ? `<${tag} ${attrs.join(" ")}` : `<${tag}`;
    if (selfClosing) {
      pieces.push(`${open}/>`);
    } else {
      stack.push(tag);
      pieces.push(`${open}>`);
    }
  }

  if (stack.length) {
    return null;
  }
  const out = pieces.join("");
  return /<svg[\s>]/i.test(out) ? out : null;
}

export const MESSAGE_MAX_LENGTH = MAX_MESSAGE;
export const SVG_MAX_LENGTH = MAX_SVG;
export const POST_BODY_MAX = 8_192;
