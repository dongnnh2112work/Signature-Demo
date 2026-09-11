import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { SignatureRow } from "@/lib/supabase/types";

const filePath = path.join(process.cwd(), ".data", "signatures.json");

function readAll(): SignatureRow[] {
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
    return Array.isArray(parsed) ? (parsed as SignatureRow[]) : [];
  } catch {
    return [];
  }
}

function writeAll(rows: SignatureRow[]) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(rows), "utf8");
}

export function listLocalSignatures() {
  return readAll();
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
