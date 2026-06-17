import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import {
  autoLogin,
  toLaunchResult
} from "../src/main/loginAutomation.js";
import { LOGIN_RESULT } from "../src/shared/site.js";

function createDom() {
  const html = fs.readFileSync(
    path.join(process.cwd(), "tests/fixtures/mock-login.html"),
    "utf8"
  );
  return new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable"
  });
}

test("autoLogin fills and submits a standard login form", async () => {
  const dom = createDom();
  const result = await autoLogin(dom.window.document, {
    username: "alice",
    password: "secret",
    usernameSelector: "#user",
    passwordSelector: "#pass",
    submitSelector: "#submit",
    submitDelayMs: 0
  });

  assert.equal(result.status, LOGIN_RESULT.SUCCESS);
  assert.equal(dom.window.document.querySelector("#user").value, "alice");
  assert.equal(dom.window.document.querySelector("#pass").value, "secret");
  assert.equal(dom.window.submitClicks, 1);
});

test("autoLogin reports missing selectors", async () => {
  const dom = createDom();
  const result = await autoLogin(dom.window.document, {
    username: "alice",
    password: "secret",
    usernameSelector: "#missing",
    passwordSelector: "#pass",
    submitSelector: "#submit",
    submitDelayMs: 0
  });

  assert.equal(result.status, LOGIN_RESULT.SELECTOR_NOT_FOUND);
});

test("toLaunchResult maps page load timeout", () => {
  const error = new Error("Timeout");
  error.code = "PAGE_LOAD_TIMEOUT";
  const result = toLaunchResult(error);
  assert.equal(result.status, LOGIN_RESULT.PAGE_LOAD_ERROR);
});
