import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SIGNATURE_FETCH_PAGE,
  hasMoreSignatureRows,
  mergeSignatureRows,
  reconcileSignatureSnapshot,
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

  it("drops wishes missing from a snapshot unless they arrived during the fetch", () => {
    const current = [
      { id: "keep", created_at: "1" },
      { id: "deleted", created_at: "2" },
      { id: "live", created_at: "3" },
    ];
    const snapshot = [{ id: "keep", created_at: "1" }];
    assert.deepEqual(
      reconcileSignatureSnapshot(current, snapshot, ["live"]),
      [
        { id: "keep", created_at: "1" },
        { id: "live", created_at: "3" },
      ],
    );
    assert.deepEqual(reconcileSignatureSnapshot(current, [], []), []);
  });
});
