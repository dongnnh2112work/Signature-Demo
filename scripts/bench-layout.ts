import { layoutSignatures } from "../lib/signatures/layout.ts";

function bench(n: number, vw = 1920, vh = 1080) {
  const ids = Array.from({ length: n }, (_, i) => `wish-${i}-${Math.random()}`);
  const tCold = performance.now();
  const last = layoutSignatures(ids, vw, vh);
  const cold = performance.now() - tCold;
  const times: number[] = [];
  for (let i = 0; i < 8; i += 1) {
    const t0 = performance.now();
    layoutSignatures(ids, vw, vh);
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const pages = new Set(last.boxes.map((box) => box.page)).size;
  return {
    n,
    placed: last.boxes.length,
    pageCount: last.pageCount,
    pagesUsed: pages,
    cellWidth: last.cellWidth,
    empty: last.boxes.length === 0,
    ms_cold: Number(cold.toFixed(3)),
    ms_warm_median: Number(times[Math.floor(times.length / 2)].toFixed(3)),
  };
}

const out = [30, 100, 150, 200, 300].map((n) => bench(n));
console.log(JSON.stringify(out, null, 2));
