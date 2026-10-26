import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createClientId, parseClientId } from "./client-id.ts";

describe("guest client id", () => {
  it("accepts a localStorage-style random id", () => {
    assert.equal(parseClientId("a1b2c3d4-e5f6-7890-abcd-ef0123456789"), "a1b2c3d4-e5f6-7890-abcd-ef0123456789");
    assert.equal(parseClientId("abcdefgh"), "abcdefgh");
  });

  it("creates a storable random id", () => {
    const id = createClientId();
    assert.equal(parseClientId(id), id);
  });

  it("rejects missing or unsafe values", () => {
    assert.equal(parseClientId(null), null);
    assert.equal(parseClientId(""), null);
    assert.equal(parseClientId("short"), null);
    assert.equal(parseClientId("bad id!!"), null);
    assert.equal(parseClientId("x".repeat(65)), null);
  });
});
