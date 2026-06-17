import test from "node:test";
import assert from "node:assert/strict";
import { createSecurityService } from "../src/main/security.js";

test("security service fallback encrypts and decrypts", () => {
  const security = createSecurityService({
    forceFallback: true,
    namespace: "test-suite"
  });

  const encrypted = security.encrypt("hunter2");
  const decrypted = security.decrypt(encrypted);

  assert.notEqual(encrypted, "hunter2");
  assert.equal(decrypted, "hunter2");
});

