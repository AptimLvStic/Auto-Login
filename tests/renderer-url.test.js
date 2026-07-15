import test from "node:test";
import assert from "node:assert/strict";
import { resolveRendererUrl } from "../src/main/rendererUrl.js";

test("resolveRendererUrl uses a valid file URL for packaged Windows builds", () => {
  const result = resolveRendererUrl("D:\\Apps\\Auto Login\\resources\\app.asar\\src\\main", "");

  assert.equal(
    result,
    "file:///D:/Apps/Auto%20Login/resources/app.asar/dist/index.html"
  );
});

test("resolveRendererUrl preserves the Vite development server URL", () => {
  assert.equal(
    resolveRendererUrl("D:\\ignored", "http://127.0.0.1:5173"),
    "http://127.0.0.1:5173"
  );
});
