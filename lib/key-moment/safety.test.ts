import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { event } from "../event.ts";
import {
  canSubmitKeyMoment,
  confirmDialogInitialFocus,
  keyMomentPrompt,
  nextKeyMomentState,
} from "./safety.ts";

describe("admin Key Moment safety", () => {
  it("requires a confirm to turn Key Moment on", () => {
    assert.equal(keyMomentPrompt(false), "activate");
    assert.equal(nextKeyMomentState("activate"), true);
    assert.equal(event.adminKeyMomentConfirm.includes("Key Visual"), true);
  });

  it("requires a reconfirm to turn Key Moment off, with Cancel as the default focus", () => {
    assert.equal(keyMomentPrompt(true), "deactivate");
    assert.equal(nextKeyMomentState("deactivate"), false);
    assert.equal(confirmDialogInitialFocus("deactivate"), "cancel");
    assert.equal(event.adminKeyMomentOffConfirm, "Xác nhận tắt Key Moment?");
  });

  it("does not submit while a request is in flight", () => {
    assert.equal(canSubmitKeyMoment(false), true);
    assert.equal(canSubmitKeyMoment(true), false);
  });
});
