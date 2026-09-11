import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { SignatureRow } from "@/lib/supabase/types";

const filePath = process.env.VERCEL
  ? path.join("/tmp", "signatures.json")
  : path.join(process.cwd(), ".data", "signatures.json");

let memory: SignatureRow[] | null = null;

function readAll(): SignatureRow[] {
  if (memory) {
    return memory;
  }
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
    memory = Array.isArray(parsed) ? (parsed as SignatureRow[]) : [];
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

export function listLocalSignatures() {
  return readAll();
}

export function deleteLocalSignature(id: string) {
  const rows = readAll().filter((row) => row.id !== id);
  writeAll(rows);
}

export function clearLocalSignatures() {
  writeAll([]);
}

export function addLocalSignature(svg: string): SignatureRow {
  const row: SignatureRow = {
    id: crypto.randomUUID(),
    svg,
    created_at: new Date().toISOString(),
  };
  const rows = readAll();
  rows.push(row);
  writeAll(rows);
  return row;
}
