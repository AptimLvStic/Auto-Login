import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const npxCommand = isWindows ? "npx.cmd" : "npx";

function createSpawnOptions(extraEnv = {}) {
  return {
    stdio: "inherit",
    shell: isWindows,
    env: {
      ...process.env,
      ...extraEnv
    }
  };
}

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error("Timed out waiting for Vite dev server."));
        return;
      }

      try {
        const response = await fetch(url);
        if (response.ok) {
          clearInterval(timer);
          resolve();
        }
      } catch {
        // Retry until the dev server is available.
      }
    }, 500);
  });
}

const vite = spawn(
  npmCommand,
  ["run", "vite", "--", "--host", "127.0.0.1"],
  createSpawnOptions()
);

vite.on("exit", (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }
});

await waitForServer("http://127.0.0.1:5173");

const electron = spawn(
  npxCommand,
  ["electron", "."],
  createSpawnOptions({
    VITE_DEV_SERVER_URL: "http://127.0.0.1:5173"
  })
);

const shutdown = () => {
  vite.kill();
  electron.kill();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

electron.on("exit", (code) => {
  shutdown();
  process.exit(code ?? 0);
});
