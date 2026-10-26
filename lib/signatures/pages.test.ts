import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SIGNATURE_FETCH_PAGE,
  hasMoreSignatureRows,
  mergeSignatureRows,
  signatureRange,
} from "./pages.ts";

describe("signature pagination", () => {
  it("uses inclusive ranges that walk past the 1000-row default", () => {
    assert.equal(SIGNATURE_FETCH_PAGE, 1000);
    assert.deepEqual(signatureRange(0), { from: 0, to: 999 });
    assert.deepEqual(signatureRange(1000), { from: 1000, to: 1999 });
    assert.equal(hasMoreSignatureRows(1000), true);
    assert.equal(hasMoreSignatureRows(999), false);
    assert.equal(hasMoreSignatureRows(0), false);
  });

  it("merges and dedupes by id, keeping first-seen order", () => {
    const current = [
      { id: "a", created_at: "1" },
      { id: "b", created_at: "2" },
    ];
    const incoming = [
      { id: "b", created_at: "2" },
      { id: "c", created_at: "3" },
      { id: "a", created_at: "1" },
    ];
    assert.deepEqual(mergeSignatureRows(current, incoming), [
      { id: "a", created_at: "1" },
      { id: "b", created_at: "2" },
      { id: "c", created_at: "3" },
    ]);
  });
});
