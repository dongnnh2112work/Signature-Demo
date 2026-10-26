import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SIGNATURE_POST_BURST,
  SIGNATURE_POST_WINDOW_MS,
  rateLimit,
  resetRateLimit,
} from "./rate-limit.ts";

describe("signature POST rate limit", () => {
  it("allows about 1 per 2 seconds with a burst of 5, then blocks spam", () => {
    assert.equal(SIGNATURE_POST_BURST, 5);
    assert.equal(SIGNATURE_POST_WINDOW_MS, 10_000);
    resetRateLimit();
    const key = `sig:test-${Date.now()}`;
    for (let i = 0; i < SIGNATURE_POST_BURST; i += 1) {
      assert.equal(rateLimit(key, SIGNATURE_POST_BURST, SIGNATURE_POST_WINDOW_MS), true);
    }
    assert.equal(rateLimit(key, SIGNATURE_POST_BURST, SIGNATURE_POST_WINDOW_MS), false);
    resetRateLimit(key);
  });
});
