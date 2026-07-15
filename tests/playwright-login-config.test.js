import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test("playwright login example config contains a runnable workflow", () => {
  const filePath = path.join(process.cwd(), "scripts", "playwright-login.example.json");
  const config = JSON.parse(fs.readFileSync(filePath, "utf8"));

  assert.equal(config.browserName, "chromium");
  assert.equal(Array.isArray(config.workflows), true);
  assert.equal(config.workflows.length > 0, true);

  const workflow = config.workflows[0];
  assert.equal(typeof workflow.loginUrl, "string");
  assert.equal(workflow.loginUrl.startsWith("file:///"), true);
  assert.equal(workflow.usernameSelector, "#user");
  assert.equal(workflow.passwordSelector, "#pass");
  assert.equal(workflow.submitSelector, "#submit");
});

test("playwright login script can validate config without playwright installed", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playwright-login-config-"));
  const configPath = path.join(tempDir, "workflow.json");

  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        workflows: [
          {
            name: "broken",
            loginUrl: "",
            username: "alice",
            password: "secret",
            usernameSelector: "#user",
            passwordSelector: "#pass",
            submitSelector: "#submit"
          }
        ]
      },
      null,
      2
    ),
    "utf8"
  );

  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.execPath, ["scripts/playwright-login.mjs", "--config", configPath], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /validation_error/i);
  assert.match(result.stderr, /missing required field/i);
  assert.match(result.stderr, /loginUrl/i);
});
