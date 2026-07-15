import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { autoLogin, toLaunchResult } from "../src/main/loginAutomation.js";
import { LOGIN_RESULT } from "../src/shared/site.js";

const require = createRequire(import.meta.url);

function parseArgs(argv) {
  const parsed = {
    configPath: "",
    outputDir: path.join(process.cwd(), "output", "playwright"),
    headed: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--config") {
      parsed.configPath = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (arg === "--output-dir") {
      parsed.outputDir = argv[index + 1] ?? parsed.outputDir;
      index += 1;
      continue;
    }

    if (arg === "--headed") {
      parsed.headed = true;
      continue;
    }

    if (!arg.startsWith("--") && !parsed.configPath) {
      parsed.configPath = arg;
    }
  }

  return parsed;
}

function ensureConfigPath(configPath) {
  const trimmed = String(configPath ?? "").trim();
  if (!trimmed) {
    const error = new Error("Missing config path. Use --config <file>.");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  return path.resolve(process.cwd(), trimmed);
}

function ensureOutputDir(outputDir) {
  const resolved = path.resolve(process.cwd(), outputDir);
  fs.mkdirSync(resolved, { recursive: true });
  return resolved;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function validateWorkflow(workflow) {
  const requiredFields = [
    "name",
    "loginUrl",
    "username",
    "password",
    "usernameSelector",
    "passwordSelector",
    "submitSelector"
  ];

  const missingField = requiredFields.find((field) => !String(workflow?.[field] ?? "").trim());
  if (missingField) {
    const error = new Error(`Workflow "${workflow?.name ?? "unnamed"}" is missing required field "${missingField}".`);
    error.code = "VALIDATION_ERROR";
    throw error;
  }
}

function sanitizeFileName(value) {
  return String(value ?? "workflow")
    .trim()
    // eslint-disable-next-line no-control-regex -- Windows file names cannot contain C0 controls.
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "workflow";
}

function resolveConfig(configFile) {
  const configDir = path.dirname(configFile);
  const config = readJson(configFile);
  const workflows = Array.isArray(config.workflows) ? config.workflows : [];

  if (workflows.length === 0) {
    const error = new Error("Config file must include at least one workflow.");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  workflows.forEach(validateWorkflow);

  return {
    browserName: config.browserName ?? "chromium",
    defaultTimeoutMs: Number(config.defaultTimeoutMs ?? 15000),
    submitWaitMs: Number(config.submitWaitMs ?? 1500),
    postSubmitSelector: String(config.postSubmitSelector ?? "").trim(),
    postSubmitUrlIncludes: String(config.postSubmitUrlIncludes ?? "").trim(),
    screenshotOnSuccess: config.screenshotOnSuccess !== false,
    screenshotOnFailure: config.screenshotOnFailure !== false,
    storageStatePath: String(config.storageStatePath ?? "").trim()
      ? path.resolve(configDir, config.storageStatePath)
      : "",
    workflows: workflows.map((workflow) => ({
      ...workflow,
      waitUntil: workflow.waitUntil ?? config.waitUntil ?? "domcontentloaded",
      timeoutMs: Number(workflow.timeoutMs ?? config.defaultTimeoutMs ?? 15000),
      submitWaitMs: Number(workflow.submitWaitMs ?? config.submitWaitMs ?? 1500),
      postSubmitSelector: String(workflow.postSubmitSelector ?? config.postSubmitSelector ?? "").trim(),
      postSubmitUrlIncludes: String(
        workflow.postSubmitUrlIncludes ?? config.postSubmitUrlIncludes ?? ""
      ).trim(),
      beforeFillWaitForSelector: String(workflow.beforeFillWaitForSelector ?? "").trim(),
      successMessage: String(workflow.successMessage ?? "").trim()
    }))
  };
}

async function loadPlaywright() {
  try {
    return require("playwright");
  } catch {
    const error = new Error(
      'Missing "playwright" dependency. Run "npm install -D playwright" and then "npx playwright install chromium".'
    );
    error.code = "VALIDATION_ERROR";
    throw error;
  }
}

async function waitForSuccessSignal(page, workflow) {
  const checks = [];

  if (workflow.postSubmitSelector) {
    checks.push(
      page
        .waitForSelector(workflow.postSubmitSelector, {
          state: "visible",
          timeout: workflow.submitWaitMs
        })
        .then(() => ({ matched: true, via: "selector" }))
    );
  }

  if (workflow.postSubmitUrlIncludes) {
    checks.push(
      page
        .waitForURL(
          (url) => url.toString().includes(workflow.postSubmitUrlIncludes),
          { timeout: workflow.submitWaitMs }
        )
        .then(() => ({ matched: true, via: "url" }))
    );
  }

  if (checks.length === 0) {
    await page.waitForTimeout(workflow.submitWaitMs);
    return { matched: true, via: "delay" };
  }

  const settled = await Promise.allSettled(checks);
  const success = settled.find((entry) => entry.status === "fulfilled");

  if (success?.status === "fulfilled") {
    return success.value;
  }

  const error = new Error(
    `No success signal detected after submit. Configure "postSubmitSelector" or "postSubmitUrlIncludes" for this site.`
  );
  error.code = "SUBMIT_TIMEOUT";
  throw error;
}

async function runWorkflow(page, workflow, outputDir, options) {
  const artifactPrefix = sanitizeFileName(workflow.name);
  const pageLoadTimeoutMs = workflow.timeoutMs;

  page.setDefaultTimeout(pageLoadTimeoutMs);

  try {
    await page.goto(workflow.loginUrl, {
      waitUntil: workflow.waitUntil,
      timeout: pageLoadTimeoutMs
    });
  } catch (error) {
    const mapped = new Error(`Failed to open ${workflow.loginUrl}: ${error.message}`);
    mapped.code = /timeout/i.test(error.message) ? "PAGE_LOAD_TIMEOUT" : "PAGE_LOAD_ERROR";
    throw mapped;
  }

  if (workflow.beforeFillWaitForSelector) {
    await page.waitForSelector(workflow.beforeFillWaitForSelector, {
      state: "visible",
      timeout: workflow.timeoutMs
    });
  }

  const result = await page.evaluate(autoLogin, {
    username: workflow.username,
    password: workflow.password,
    usernameSelector: workflow.usernameSelector,
    passwordSelector: workflow.passwordSelector,
    submitSelector: workflow.submitSelector,
    submitDelayMs: 0
  });

  if (result.status !== LOGIN_RESULT.SUCCESS) {
    return {
      workflow: workflow.name,
      ...result
    };
  }

  const successSignal = await waitForSuccessSignal(page, workflow);

  let screenshotPath = "";
  if (options.screenshotOnSuccess) {
    screenshotPath = path.join(outputDir, `${artifactPrefix}-success.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
  }

  return {
    workflow: workflow.name,
    status: LOGIN_RESULT.SUCCESS,
    message: workflow.successMessage || `Login submitted successfully (${successSignal.via}).`,
    screenshotPath,
    finalUrl: page.url()
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = ensureConfigPath(args.configPath);
  const config = resolveConfig(configPath);
  const outputDir = ensureOutputDir(args.outputDir);
  const playwright = await loadPlaywright();
  const browserType = playwright[config.browserName];

  if (!browserType) {
    const error = new Error(`Unsupported browserName "${config.browserName}".`);
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const browser = await browserType.launch({
    headless: !args.headed
  });

  const contextOptions = {};
  if (config.storageStatePath) {
    contextOptions.storageState = config.storageStatePath;
  }

  const results = [];

  try {
    for (const workflow of config.workflows) {
      // Keep cookies and local storage from one site out of every other workflow.
      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();

      try {
        const result = await runWorkflow(page, workflow, outputDir, config);
        results.push(result);
      } catch (error) {
        const mapped = toLaunchResult(error);
        let screenshotPath = "";

        if (config.screenshotOnFailure) {
          screenshotPath = path.join(outputDir, `${sanitizeFileName(workflow.name)}-failure.png`);
          try {
            await page.screenshot({
              path: screenshotPath,
              fullPage: true
            });
          } catch {
            screenshotPath = "";
          }
        }

        results.push({
          workflow: workflow.name,
          ...mapped,
          screenshotPath,
          finalUrl: page.url()
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    configPath,
    outputDir,
    headed: args.headed,
    results
  };

  const summaryPath = path.join(outputDir, "login-results.json");
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  const hasFailure = results.some((item) => item.status !== LOGIN_RESULT.SUCCESS);
  console.log(JSON.stringify(summary, null, 2));
  if (hasFailure) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const mapped = toLaunchResult(error);
  console.error(
    JSON.stringify(
      {
        status: mapped.status,
        message: mapped.message
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
