import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeExternalUrl,
  normalizeSettings,
  normalizeSiteIds
} from "../src/main/securityPolicy.js";
import { DEFAULT_SETTINGS } from "../src/shared/site.js";

test("external URLs are restricted to web protocols", () => {
  assert.equal(normalizeExternalUrl("example.com/login"), "https://example.com/login");
  assert.throws(() => normalizeExternalUrl("file:///C:/secret.txt"), /HTTP 或 HTTPS/);
  assert.throws(() => normalizeExternalUrl("ftp://example.com/archive"), /HTTP 或 HTTPS/);
});

test("batch IDs are unique and bounded", () => {
  assert.deepEqual(normalizeSiteIds(["a", "a", "b"]), ["a", "b"]);
  assert.throws(() => normalizeSiteIds([]), /1 至 50/);
  assert.throws(() => normalizeSiteIds("a"), /格式无效/);
});

test("settings are constrained to supported values", () => {
  assert.deepEqual(
    normalizeSettings({ zoomLevel: 999, fontScale: 1, themeMode: "unknown" }, DEFAULT_SETTINGS),
    { zoomLevel: 140, fontScale: 85, themeMode: "light" }
  );
});
