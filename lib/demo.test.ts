import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEMO_ADMIN_BANNER,
  adminSessionView,
  allowAdminAction,
  isDemoOpenAdmin,
  keyMomentWriteStrategy,
  signatureDeleteStrategy,
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
    assert.equal(view.deleteAllowed, true);
    assert.equal(view.canDelete, true);
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
    assert.equal(view.deleteAllowed, true);
    assert.equal(view.canDelete, true);
  });

  it("DELETE is allowed in demo without a service role key", () => {
    const demoEnvs = [
      {},
      { ADMIN_PIN: "" },
      { DEMO_OPEN_ADMIN: "1" },
      { ADMIN_PIN: "x", DEMO_OPEN_ADMIN: "1" },
    ];
    for (const env of demoEnvs) {
      assert.equal(
        allowAdminAction("delete", {
          tokenValid: false,
          hasServiceRole: false,
          env,
        }),
        true,
      );
      const view = adminSessionView({
        tokenValid: false,
        canDeleteWithAuth: false,
        hasServiceRole: false,
        env,
      });
      assert.equal(view.deleteAllowed, true);
      assert.equal(view.canDelete, true);
    }
  });

  it("DELETE requires a signed cookie when the service role key exists", () => {
    assert.equal(
      allowAdminAction("delete", {
        tokenValid: false,
        hasServiceRole: true,
        env: { DEMO_OPEN_ADMIN: "1" },
      }),
      false,
    );
    assert.equal(
      allowAdminAction("delete", {
        tokenValid: true,
        hasServiceRole: true,
        env: { DEMO_OPEN_ADMIN: "1" },
      }),
      true,
    );
    const view = adminSessionView({
      tokenValid: false,
      canDeleteWithAuth: true,
      hasServiceRole: true,
      env: {},
    });
    assert.equal(view.canDelete, false);
  });

  it("DELETE always requires a cookie outside demo mode", () => {
    assert.equal(
      allowAdminAction("delete", {
        tokenValid: false,
        hasServiceRole: false,
        env: { ADMIN_PIN: "secret" },
      }),
      false,
    );
    const view = adminSessionView({
      tokenValid: true,
      canDeleteWithAuth: true,
      hasServiceRole: true,
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

describe("signature delete strategy", () => {
  it("uses the local store when Supabase is not configured", () => {
    assert.equal(
      signatureDeleteStrategy({
        hasSupabaseConfig: false,
        hasServiceRole: false,
        demo: true,
      }),
      "local",
    );
  });

  it("uses anon DELETE in demo when the service role key is missing", () => {
    assert.equal(
      signatureDeleteStrategy({
        hasSupabaseConfig: true,
        hasServiceRole: false,
        demo: true,
      }),
      "anon-delete",
    );
  });

  it("uses the service role when present", () => {
    assert.equal(
      signatureDeleteStrategy({
        hasSupabaseConfig: true,
        hasServiceRole: true,
        demo: true,
      }),
      "service",
    );
  });

  it("is unavailable outside demo without a service role key", () => {
    assert.equal(
      signatureDeleteStrategy({
        hasSupabaseConfig: true,
        hasServiceRole: false,
        demo: false,
      }),
      "unavailable",
    );
  });
});
