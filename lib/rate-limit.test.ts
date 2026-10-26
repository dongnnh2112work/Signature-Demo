import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SIGNATURE_CLIENT_BURST,
  SIGNATURE_CLIENT_WINDOW_MS,
  SIGNATURE_IP_BURST,
  SIGNATURE_IP_WINDOW_MS,
  SIGNATURE_POST_BURST,
  SIGNATURE_POST_WINDOW_MS,
  allowSignaturePost,
  rateLimit,
  resetRateLimit,
} from "./rate-limit.ts";

describe("signature POST rate limit", () => {
  it("keeps the per-client burst of 5 / 10s", () => {
    assert.equal(SIGNATURE_CLIENT_BURST, 5);
    assert.equal(SIGNATURE_CLIENT_WINDOW_MS, 10_000);
    assert.equal(SIGNATURE_POST_BURST, 5);
    assert.equal(SIGNATURE_POST_WINDOW_MS, 10_000);
    resetRateLimit();
    const key = `sig:test-${Date.now()}`;
    for (let i = 0; i < SIGNATURE_CLIENT_BURST; i += 1) {
      assert.equal(rateLimit(key, SIGNATURE_CLIENT_BURST, SIGNATURE_CLIENT_WINDOW_MS), true);
    }
    assert.equal(rateLimit(key, SIGNATURE_CLIENT_BURST, SIGNATURE_CLIENT_WINDOW_MS), false);
    resetRateLimit(key);
  });

  it("limits each client separately while sharing a generous IP ceiling", () => {
    assert.equal(SIGNATURE_IP_BURST, 300);
    assert.equal(SIGNATURE_IP_WINDOW_MS, 60_000);
    resetRateLimit();
    const ip = "203.0.113.10";
    for (let i = 0; i < 8; i += 1) {
      const clientId = `guest-${String(i).padStart(4, "0")}-device`;
      for (let n = 0; n < SIGNATURE_CLIENT_BURST; n += 1) {
        assert.equal(allowSignaturePost({ clientId, ip }), true, `client ${i} hit ${n}`);
      }
      assert.equal(allowSignaturePost({ clientId, ip }), false);
    }
    resetRateLimit();
  });

  it("falls back to a per-IP client bucket when the header is missing", () => {
    resetRateLimit();
    const ip = "198.51.100.4";
    for (let i = 0; i < SIGNATURE_CLIENT_BURST; i += 1) {
      assert.equal(allowSignaturePost({ clientId: null, ip }), true);
    }
    assert.equal(allowSignaturePost({ clientId: null, ip }), false);
    resetRateLimit();
  });
});
