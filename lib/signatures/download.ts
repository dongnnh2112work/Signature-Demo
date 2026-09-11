function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc ^= data[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function u32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function zipStore(files: { name: string; data: Uint8Array }[]) {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = file.data;
    const crc = crc32(data);
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data,
    ]);
    const central = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralDir = concat(centrals);
  const end = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);

  return new Blob([concat([...locals, centralDir, end])], {
    type: "application/zip",
  });
}

function sizedSvg(svg: string) {
  if (/width\s*=/.test(svg) && /height\s*=/.test(svg)) {
    return svg;
  }
  const viewBox = svg.match(/viewBox="([^"]+)"/i)?.[1]?.split(/[\s,]+/).map(Number);
  const width = viewBox?.[2] || 800;
  const height = viewBox?.[3] || 400;
  return svg.replace(
    /<svg\b/i,
    `<svg width="${width}" height="${height}"`,
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSvg(svg: string, filename: string) {
  downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), filename);
}

export async function svgToPngBlob(svg: string, scale = 2) {
  const prepared = sizedSvg(svg);
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(prepared)}`;

  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("svg render failed"));
    image.src = svgUrl;
  });

  const width = Math.max(Math.round((image.naturalWidth || 800) * scale), 400);
  const height = Math.max(Math.round((image.naturalHeight || 400) * scale), 200);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas unavailable");
  }
  ctx.fillStyle = "#0b0a09";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!blob) {
    throw new Error("png encode failed");
  }
  return blob;
}

export async function downloadPng(svg: string, filename: string) {
  downloadBlob(await svgToPngBlob(svg), filename);
}

export function signatureFileName(id: string, createdAt: string, ext = "svg") {
  const stamp = createdAt.replace(/[:.]/g, "-").slice(0, 19);
  return `chu-ky-${stamp}-${id.slice(0, 8)}.${ext}`;
}

export async function downloadSignaturesOffline(
  rows: { id: string; svg: string; created_at: string }[],
) {
  const encoder = new TextEncoder();
  const files: { name: string; data: Uint8Array }[] = [];

  for (const row of rows) {
    const base = signatureFileName(row.id, row.created_at, "svg").replace(/\.svg$/, "");
    files.push({
      name: `svg/${base}.svg`,
      data: encoder.encode(row.svg),
    });
    const png = await svgToPngBlob(row.svg);
    files.push({
      name: `png/${base}.png`,
      data: new Uint8Array(await png.arrayBuffer()),
    });
  }

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Chữ ký Key Moment 2026–2027</title>
  <style>
    body { margin: 0; background: #0b0a09; color: #faf4e6; font-family: sans-serif; }
    h1 { text-align: center; font-weight: 600; padding: 32px 16px 8px; }
    p { text-align: center; opacity: .6; margin: 0 0 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; padding: 16px 24px 48px; }
    figure { margin: 0; background: #16130e; border-radius: 12px; padding: 12px; }
    img { width: 100%; height: 120px; object-fit: contain; }
    figcaption { font-size: 12px; opacity: .55; margin-top: 8px; }
  </style>
</head>
<body>
  <h1>Cam kết 2026–2027</h1>
  <p>${rows.length} chữ ký — PNG + SVG, mở file này khi không có mạng</p>
  <div class="grid">
    ${rows
      .map((row, index) => {
        const base = signatureFileName(row.id, row.created_at, "svg").replace(
          /\.svg$/,
          "",
        );
        return `<figure><img src="png/${base}.png" alt="Chữ ký ${index + 1}" /><figcaption>#${index + 1} · ${row.created_at}</figcaption></figure>`;
      })
      .join("\n")}
  </div>
</body>
</html>`;

  files.push({ name: "index.html", data: encoder.encode(html) });
  downloadBlob(zipStore(files), "chu-ky-key-moment-offline.zip");
}
