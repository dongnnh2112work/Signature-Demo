import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MESSAGE_MAX_LENGTH } from "./sanitize.ts";
import { SIGN_REPEAT_SENDS, signFormAfterSuccess } from "./sign-flow.ts";

describe("repeat sends on /sign", () => {
  it("does not lock the sender after a successful send", () => {
    assert.equal(SIGN_REPEAT_SENDS, true);
    const next = signFormAfterSuccess();
    assert.equal(next.alreadySigned, false);
    assert.equal(next.persistLock, false);
    assert.equal(next.status, "form");
    assert.equal(next.message, "");
  });

  it("keeps the 200-character wish limit", () => {
    assert.equal(MESSAGE_MAX_LENGTH, 200);
  });
});
