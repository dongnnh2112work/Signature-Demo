import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const filePath = process.env.VERCEL
  ? path.join("/tmp", "key-moment.json")
  : path.join(process.cwd(), ".data", "key-moment.json");

let memory: boolean | null = null;

function readActive() {
  if (memory !== null) {
    return memory;
  }
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as { active?: unknown };
    memory = Boolean(parsed.active);
  } catch {
    memory = false;
  }
  return memory;
}

export function getLocalKeyMoment() {
  return readActive();
}

export function setLocalKeyMoment(active: boolean) {
  memory = active;
  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify({ active }), "utf8");
  } catch {
    // Memory still serves this process if the disk is not writable.
  }
  return memory;
}
