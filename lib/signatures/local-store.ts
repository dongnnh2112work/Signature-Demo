import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { SignatureRow } from "@/lib/supabase/types";
import { messageFromRow, messageToSvg } from "@/lib/wish";

const filePath = process.env.VERCEL
  ? path.join("/tmp", "signatures.json")
  : path.join(process.cwd(), ".data", "signatures.json");

let memory: SignatureRow[] | null = null;

function normalize(row: SignatureRow): SignatureRow {
  const message = messageFromRow(row);
  return {
    id: row.id,
    created_at: row.created_at,
    message,
  };
}

function readAll(): SignatureRow[] {
  if (memory) {
    return memory;
  }
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
    memory = Array.isArray(parsed)
      ? (parsed as SignatureRow[]).map(normalize)
      : [];
  } catch {
    memory = [];
  }
  return memory;
}

function writeAll(rows: SignatureRow[]) {
  memory = rows;
  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(rows), "utf8");
  } catch {
    // Vercel serverless may not persist disk; memory still serves this instance.
  }
}

export function listLocalSignatures(after?: string) {
  const rows = readAll();
  if (!after) {
    return rows;
  }
  return rows.filter((row) => row.created_at > after);
}

export function localSignatureTotal() {
  return readAll().length;
}

export function localSignatureCursor() {
  const rows = readAll();
  return rows[rows.length - 1]?.created_at ?? null;
}

export function deleteLocalSignature(id: string) {
  const rows = readAll().filter((row) => row.id !== id);
  writeAll(rows);
}

export function clearLocalSignatures() {
  writeAll([]);
}

export function addLocalSignature(message: string): SignatureRow {
  const row: SignatureRow = {
    id: crypto.randomUUID(),
    message,
    created_at: new Date().toISOString(),
    svg: messageToSvg(message),
  };
  const rows = readAll();
  rows.push(row);
  writeAll(rows);
  return { id: row.id, created_at: row.created_at, message: row.message };
}
