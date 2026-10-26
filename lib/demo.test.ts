import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEMO_ADMIN_BANNER,
  adminSessionView,
  allowAdminAction,
  isDemoOpenAdmin,
  keyMomentWriteStrategy,
} from "./demo.ts";

describe("demo-mode gate", () => {
  it("no ADMIN_PIN => open admin + banner (zero-env path)", () => {
    const view = adminSessionView({
      tokenValid: false,
      canDeleteWithAuth: false,
      env: {},
    });
    assert.equal(view.ok, true);
    assert.equal(view.demo, true);
    assert.equal(view.demoBanner, DEMO_ADMIN_BANNER);
    assert.equal(view.keyMomentAllowed, true);
    assert.equal(view.deleteAllowed, false);
    assert.equal(view.canDelete, false);
  });

  it("whitespace-only ADMIN_PIN is treated as unset => demo", () => {
    const view = adminSessionView({
      tokenValid: false,
      canDeleteWithAuth: false,
      env: { ADMIN_PIN: "   " },
    });
    assert.equal(isDemoOpenAdmin({ ADMIN_PIN: "   " }), true);
    assert.equal(view.ok, true);
    assert.equal(view.demo, true);
    assert.equal(view.demoBanner, DEMO_ADMIN_BANNER);
  });

  it("ADMIN_PIN set and DEMO_OPEN_ADMIN unset => locked (secure default)", () => {
    const view = adminSessionView({
      tokenValid: false,
      canDeleteWithAuth: true,
      env: { ADMIN_PIN: "2468" },
    });
    assert.equal(view.ok, false);
    assert.equal(view.demo, false);
    assert.equal(view.demoBanner, null);
    assert.equal(view.keyMomentAllowed, false);
    assert.equal(view.deleteAllowed, false);
    assert.equal(view.canDelete, false);
  });

  it("setting ADMIN_PIN immediately restores PIN login", () => {
    const before = adminSessionView({
      tokenValid: false,
      canDeleteWithAuth: false,
      env: {},
    });
    const after = adminSessionView({
      tokenValid: false,
      canDeleteWithAuth: false,
      env: { ADMIN_PIN: "event-pin" },
    });
    assert.equal(before.ok, true);
    assert.equal(before.demo, true);
    assert.equal(after.ok, false);
    assert.equal(after.demo, false);
    assert.equal(after.demoBanner, null);
    assert.equal(after.keyMomentAllowed, false);
  });

  it("DEMO_OPEN_ADMIN is only on when exactly 1", () => {
    for (const flag of [undefined, "", "0", "true", "yes", "TRUE"]) {
      assert.equal(
        isDemoOpenAdmin({ ADMIN_PIN: "secret", DEMO_OPEN_ADMIN: flag }),
        false,
        `expected locked when DEMO_OPEN_ADMIN=${JSON.stringify(flag)}`,
      );
    }
    assert.equal(
      isDemoOpenAdmin({ ADMIN_PIN: "secret", DEMO_OPEN_ADMIN: "1" }),
      true,
    );
  });

  it("DEMO_OPEN_ADMIN=1 opens admin even when ADMIN_PIN is set", () => {
    const view = adminSessionView({
      tokenValid: false,
      canDeleteWithAuth: true,
      env: { ADMIN_PIN: "secret", DEMO_OPEN_ADMIN: "1" },
    });
    assert.equal(view.ok, true);
    assert.equal(view.demo, true);
    assert.equal(view.demoBanner, DEMO_ADMIN_BANNER);
    assert.equal(view.keyMomentAllowed, true);
    assert.equal(view.deleteAllowed, false);
    assert.equal(view.canDelete, false);
  });

  it("DELETE is never opened by demo mode", () => {
    const demoEnvs = [
      {},
      { ADMIN_PIN: "" },
      { DEMO_OPEN_ADMIN: "1" },
      { ADMIN_PIN: "x", DEMO_OPEN_ADMIN: "1" },
    ];
    for (const env of demoEnvs) {
      assert.equal(
        allowAdminAction("delete", { tokenValid: false, env }),
        false,
      );
      const view = adminSessionView({
        tokenValid: false,
        canDeleteWithAuth: true,
        env,
      });
      assert.equal(view.deleteAllowed, false);
      assert.equal(view.canDelete, false);
    }
  });

  it("DELETE still requires a signed cookie when demo is on", () => {
    assert.equal(
      allowAdminAction("delete", {
        tokenValid: true,
        env: { DEMO_OPEN_ADMIN: "1" },
      }),
      true,
    );
    const view = adminSessionView({
      tokenValid: true,
      canDeleteWithAuth: true,
      env: { ADMIN_PIN: "secret" },
    });
    assert.equal(view.ok, true);
    assert.equal(view.demo, false);
    assert.equal(view.canDelete, true);
    assert.equal(view.deleteAllowed, true);
  });
});

describe("key moment write strategy", () => {
  it("uses the local store when Supabase is not configured", () => {
    assert.equal(
      keyMomentWriteStrategy({
        hasSupabaseConfig: false,
        hasServiceRole: false,
      }),
      "local",
    );
  });

  it("falls back to anon UPDATE when the service role key is missing", () => {
    assert.equal(
      keyMomentWriteStrategy({
        hasSupabaseConfig: true,
        hasServiceRole: false,
      }),
      "anon-update",
    );
  });

  it("uses the service role when present", () => {
    assert.equal(
      keyMomentWriteStrategy({
        hasSupabaseConfig: true,
        hasServiceRole: true,
      }),
      "service",
    );
  });
});
