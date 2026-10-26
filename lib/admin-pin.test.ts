import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PIN_FAIL_LIMIT,
  PIN_LOCK_MS,
  adminSessionSecretMissingMessage,
  getAdminSessionSecret,
  mustHaveSessionSecret,
  pinLoginBlocked,
  pinsMatch,
  recordPinLogin,
  resetPinLoginAttempts,
} from "./admin-pin.ts";
import { isDemoOpenAdmin } from "./demo.ts";

describe("admin PIN compare", () => {
  it("accepts the matching PIN with a constant-time hash compare", () => {
    assert.equal(pinsMatch("2468", "2468"), true);
    assert.equal(pinsMatch("event-pin", "event-pin"), true);
  });

  it("rejects a wrong PIN even when lengths differ", () => {
    assert.equal(pinsMatch("2468", "0000"), false);
    assert.equal(pinsMatch("1", "2468"), false);
    assert.equal(pinsMatch("24680", "2468"), false);
    assert.equal(pinsMatch("", "2468"), false);
  });
});

describe("ADMIN_SESSION_SECRET", () => {
  it("does not fall back to ADMIN_PIN", () => {
    assert.equal(
      getAdminSessionSecret({ ADMIN_PIN: "2468", ADMIN_SESSION_SECRET: "" }),
      null,
    );
    assert.equal(getAdminSessionSecret({ ADMIN_PIN: "2468" }), null);
    assert.equal(
      getAdminSessionSecret({
        ADMIN_PIN: "2468",
        ADMIN_SESSION_SECRET: "  cookie-secret  ",
      }),
      "cookie-secret",
    );
  });

  it("requires ADMIN_SESSION_SECRET outside demo, not inside", () => {
    const env = { ADMIN_PIN: "2468" };
    assert.equal(isDemoOpenAdmin(env), false);
    assert.equal(mustHaveSessionSecret(isDemoOpenAdmin(env), env), true);
    assert.equal(mustHaveSessionSecret(true, env), false);
    assert.equal(
      mustHaveSessionSecret(false, { ADMIN_SESSION_SECRET: "cookie-secret" }),
      false,
    );
    assert.equal(mustHaveSessionSecret(isDemoOpenAdmin({}), {}), false);
  });

  it("explains the 503 when the session secret is missing", () => {
    assert.match(
      adminSessionSecretMissingMessage({ NODE_ENV: "production" }),
      /session secret/i,
    );
  });
});

describe("PIN attempt lockout", () => {
  it("locks after repeated failures and unlocks after the window", () => {
    resetPinLoginAttempts();
    const key = "lockout-test";
    const t0 = 1_000_000;
    for (let i = 0; i < PIN_FAIL_LIMIT - 1; i += 1) {
      const result = recordPinLogin(key, false, t0);
      assert.equal(result.locked, false);
      assert.equal(pinLoginBlocked(key, t0), false);
    }
    const locked = recordPinLogin(key, false, t0);
    assert.equal(locked.locked, true);
    assert.equal(pinLoginBlocked(key, t0), true);
    assert.equal(pinLoginBlocked(key, t0 + PIN_LOCK_MS - 1), true);
    assert.equal(pinLoginBlocked(key, t0 + PIN_LOCK_MS), false);
    resetPinLoginAttempts();
  });

  it("clears failures after a successful PIN", () => {
    resetPinLoginAttempts();
    const key = "success-reset";
    recordPinLogin(key, false, 10);
    recordPinLogin(key, true, 11);
    assert.equal(pinLoginBlocked(key, 11), false);
    resetPinLoginAttempts();
  });
});
