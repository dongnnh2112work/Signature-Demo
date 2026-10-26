import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { realtimeNeedsRefetch } from "./realtime.ts";

describe("realtime reconnect refetch", () => {
  it("does not refetch on the first SUBSCRIBED", () => {
    assert.deepEqual(realtimeNeedsRefetch("SUBSCRIBED", false), {
      disconnected: false,
      refetch: false,
    });
  });

  it("refetches on SUBSCRIBED after CHANNEL_ERROR / TIMED_OUT / CLOSED", () => {
    for (const status of ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"] as const) {
      const afterError = realtimeNeedsRefetch(status, false);
      assert.deepEqual(afterError, { disconnected: true, refetch: false });
      assert.deepEqual(realtimeNeedsRefetch("SUBSCRIBED", afterError.disconnected), {
        disconnected: false,
        refetch: true,
      });
    }
  });

  it("ignores unrelated status updates", () => {
    assert.deepEqual(realtimeNeedsRefetch("CHANNEL_ERROR", false), {
      disconnected: true,
      refetch: false,
    });
    assert.deepEqual(realtimeNeedsRefetch("unknown", true), {
      disconnected: true,
      refetch: false,
    });
  });
});
