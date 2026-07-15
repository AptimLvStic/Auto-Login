import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import {
  autoLogin,
  createLoginScript,
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
    timeoutMs: 0,
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
    timeoutMs: 0,
    submitDelayMs: 0
  });

  assert.equal(result.status, LOGIN_RESULT.SELECTOR_NOT_FOUND);
});

test("autoLogin waits for delayed login fields", async () => {
  const dom = new JSDOM("<body></body>", { runScripts: "dangerously" });
  dom.window.setTimeout(() => {
    dom.window.document.body.innerHTML = `
      <input id="user" />
      <input id="pass" type="password" />
      <button id="submit">Submit</button>
    `;
  }, 10);

  const result = await autoLogin(dom.window.document, {
    username: "alice",
    password: "secret",
    usernameSelector: "#user",
    passwordSelector: "#pass",
    submitSelector: "#submit",
    timeoutMs: 200,
    pollIntervalMs: 10,
    submitDelayMs: 0
  });

  assert.equal(result.status, LOGIN_RESULT.SUCCESS);
  assert.equal(dom.window.document.querySelector("#user").value, "alice");
  assert.equal(dom.window.document.querySelector("#pass").value, "secret");
});

test("createLoginScript executes safely in an isolated page context", async () => {
  const dom = createDom();
  const script = createLoginScript({
    username: "alice@example.com",
    password: "a\\b\"c",
    usernameSelector: "#user",
    passwordSelector: "#pass",
    submitSelector: "#submit",
    timeoutMs: 0,
    submitDelayMs: 0
  });

  const result = await dom.window.eval(script);
  assert.equal(result.status, LOGIN_RESULT.SUCCESS);
  assert.equal(dom.window.document.querySelector("#user").value, "alice@example.com");
  assert.equal(dom.window.document.querySelector("#pass").value, "a\\b\"c");
  assert.equal(dom.window.submitClicks, 1);
});

test("toLaunchResult maps page load timeout", () => {
  const error = new Error("Timeout");
  error.code = "PAGE_LOAD_TIMEOUT";
  const result = toLaunchResult(error);
  assert.equal(result.status, LOGIN_RESULT.PAGE_LOAD_ERROR);
});
