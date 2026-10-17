import { spawn, spawnSync } from "node:child_process";
import console from "node:console";
import { readFile, writeFile } from "node:fs/promises";
import { get } from "node:http";
import { connect } from "node:net";
import { join } from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";

import { findNgrokHttpsUrl, setMobileApiUrl } from "./lib/dev-api-tunnel.mjs";
import { resolveNgrokExecutable, getSpawnSpec, parseNgrokMajorVersion } from "./lib/ngrok-executable.mjs";

const PORT = 4000;
const API_READY_URL = "http://127.0.0.1:" + PORT + "/ready";
const INSPECTOR_PORTS = [4040, 4041, 4042, 4043];
const children = new Set();
let stopping = false;

function log(message) {
  console.log("[api:dev] " + message);
}

function terminate(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32" && child.pid) {
    // cmd.exe -> pnpm.cmd -> tsx watch must all exit when Ctrl+C is pressed.
    const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true
    });
    killer.on("error", () => { /* Process may have already ended. */ });
  } else if (child.pid) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      try { child.kill("SIGTERM"); } catch { /* Already stopped. */ }
    }
  }
}

function shutdown(exitCode) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) terminate(child);
}

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

function start(name, args, env = {}) {
  const isWindows = process.platform === "win32";
  // pnpm.cmd needs the Windows shell; ngrok must not pass through it.
  // Otherwise "ngrok version" can probe v3 while "ngrok http" launches v2.
  const { command, args: commandArgs } = getSpawnSpec(name, args, process.platform);
  log("Starting: " + [name, ...args].join(" "));
  const child = spawn(command, commandArgs, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, ...env },
    detached: !isWindows
  });
  children.add(child);
  child.on("error", (error) => {
    console.error("[api:dev] " + name + " failed to start:", error.message);
    shutdown(1);
  });
  child.once("exit", (code, signal) => {
    children.delete(child);
    if (!stopping) {
      console.error("[api:dev] " + name + " stopped (" + (signal ?? code ?? "unknown") + ").");
      shutdown(1);
    }
  });
  return child;
}

function probeNgrokVersion(executable) {
  try {
    const result = spawnSync(executable, ["version"], {
      encoding: "utf8",
      timeout: 6_000,
      windowsHide: true
    });
    if (result.status === 0) return (result.stdout || "").trim();
  } catch {
    // Let the ngrok process itself report a missing or unusable executable.
  }
  return null;
}

function readHttp(url) {
  return new Promise((resolve) => {
    let settled = false;
    function finish(value) {
      if (settled) return;
      settled = true;
      resolve(value);
    }
    const request = get(url, (response) => {
      let data = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        data += chunk;
        if (data.length > 100_000) {
          request.destroy();
          finish(null);
        }
      });
      response.on("end", () => {
        try {
          finish({ status: response.statusCode, data: JSON.parse(data) });
        } catch {
          finish(null);
        }
      });
      response.on("error", () => finish(null));
    });
    request.setTimeout(1000, () => request.destroy());
    request.on("error", () => finish(null));
  });
}

function isPortOccupied(port) {
  return new Promise((resolve) => {
    const socket = connect({ host: "127.0.0.1", port });
    socket.setTimeout(800);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => { socket.destroy(); resolve(false); });
    socket.once("timeout", () => { socket.destroy(); resolve(false); });
  });
}

async function waitForApi(timeoutMs = 90_000) {
  const end = Date.now() + timeoutMs;
  while (!stopping && Date.now() < end) {
    const response = await readHttp(API_READY_URL);
    if (response?.status === 200 && response.data?.status === "ready") return true;
    await sleep(500);
  }
  return false;
}

async function waitForTunnel(timeoutMs = 30_000) {
  const end = Date.now() + timeoutMs;
  while (!stopping && Date.now() < end) {
    for (const port of INSPECTOR_PORTS) {
      const response = await readHttp("http://127.0.0.1:" + port + "/api/tunnels");
      if (response?.status === 200) {
        const url = findNgrokHttpsUrl(response.data, PORT);
        if (url) return url;
      }
    }
    await sleep(500);
  }
  return null;
}

async function updateMobileEnv(url) {
  const target = join(process.cwd(), "apps", "mobile", ".env.local");
  let current = "";
  try {
    current = await readFile(target, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const next = setMobileApiUrl(current, url);
  if (next !== current) {
    await writeFile(target, next, { encoding: "utf8", mode: 0o600 });
    log("Updated apps/mobile/.env.local — EXPO_PUBLIC_API_URL=" + url);
    log("If Expo was already running, restart it to use the new tunnel URL.");
  } else {
    log("Mobile API URL already matches this tunnel.");
  }
}

async function main() {
  if (await isPortOccupied(PORT)) {
    console.error("[api:dev] Port 4000 is already in use. Stop the existing API before starting this command.");
    process.exitCode = 1;
    return;
  }

  const ngrokExecutable = resolveNgrokExecutable();
  const ngrokVersion = probeNgrokVersion(ngrokExecutable);
  log("ngrok executable: " + ngrokExecutable +
    (ngrokVersion ? " (" + ngrokVersion + ")" : ""));
  if (parseNgrokMajorVersion(ngrokVersion ?? "") !== 3) {
    console.error("[api:dev] Cannot verify ngrok v3 at the selected executable.");
    console.error("[api:dev] Use ngrok 3, or set $env:BAZAARLINK_NGROK_BIN = (Get-Command ngrok).Source in PowerShell.");
    console.error("[api:dev] Then run pnpm dev:api again.");
    process.exitCode = 1;
    return;
  }

  // Pin 4000 even if API_PORT in the developer's .env differs.
  start("pnpm", ["--filter", "@bazaarlink/api", "dev"], {
    API_PORT: String(PORT),
    NODE_ENV: "development"
  });

  log("Waiting for API /ready on port 4000 (including PostgreSQL connectivity)...");
  if (!(await waitForApi())) {
    if (!stopping) {
      console.error("[api:dev] API did not become ready. Check DATABASE_URL, migrations and the API logs above.");
      shutdown(1);
    }
    return;
  }

  log("API ready at http://127.0.0.1:4000. Starting ngrok http 4000...");
  start(ngrokExecutable, ["http", String(PORT)]);
  const url = await waitForTunnel();
  if (!url) {
    if (!stopping) {
      console.error("[api:dev] No HTTPS ngrok tunnel found for port 4000.");
      console.error("[api:dev] Confirm ngrok is installed, authenticated, and can use its local inspector.");
      shutdown(1);
    }
    return;
  }

  log("Public API: " + url + " -> http://127.0.0.1:4000");
  log("Port 4040 (or nearby) is only the ngrok inspector, not the API target.");
  try {
    await updateMobileEnv(url);
  } catch (error) {
    console.error("[api:dev] Tunnel is running, but could not update mobile env: " + error.message);
    console.error("[api:dev] Set EXPO_PUBLIC_API_URL=" + url + " manually in apps/mobile/.env.local.");
  }
  log("API + ngrok are running together. Press Ctrl+C to stop both.");
}

main().catch((error) => {
  console.error("[api:dev] Unexpected startup error:", error.message);
  shutdown(1);
});
