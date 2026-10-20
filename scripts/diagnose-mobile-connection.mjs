import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export function mobileApiUrl(envText) {
  const matches = [...envText.matchAll(/^\s*EXPO_PUBLIC_API_URL\s*=\s*([^\r\n#]+)\s*$/gm)];
  if (matches.length === 0) return null;
  return matches.at(-1)[1].trim().replace(/^['"]|['"]$/g, "");
}

export function apiTunnelMismatch(mobileUrl, publicUrl) {
  return Boolean(mobileUrl && publicUrl && mobileUrl.replace(/\/$/, "") !== publicUrl.replace(/\/$/, ""));
}

export function explainConnectivity({
  apiLocalReady, mobileApiReady, metroReady, urlMismatch
}) {
  const issues = [];
  if (!apiLocalReady) issues.push("API on localhost:4000 is not ready. Run pnpm dev:api and inspect database errors.");
  if (urlMismatch) issues.push("Expo's EXPO_PUBLIC_API_URL differs from the current ngrok URL. Restart pnpm dev:mobile after pnpm dev:api updates .env.local.");
  if (apiLocalReady && !mobileApiReady) issues.push("The Android app cannot reach its configured public API. Check ngrok, firewall/network and .env.local, then restart Expo.");
  if (!metroReady) issues.push("Expo Metro/CLI on localhost:8081 is not responding. Restart pnpm dev:mobile and reopen the new Expo Go tunnel QR code.");
  if (!issues.length) issues.push("Local API, configured public API and Metro respond here. If the phone still disconnects, reopen Expo Go over the new tunnel; check the phone's internet and battery settings.");
  return issues;
}

async function probe(url, opts = {}) {
  const controller = new globalThis.AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 3500);
  try {
    const res = await globalThis.fetch(url, {
      headers: { "ngrok-skip-browser-warning": "1" },
      redirect: "error", signal: controller.signal
    });
    const body = await res.text();
    if (opts.jsonReady) {
      let data;
      try { data = JSON.parse(body); } catch { return false; }
      return res.status === 200 && data.status === "ready";
    }
    return res.status === 200 && body.includes("packager-status:running");
  } catch {
    return false;
  } finally { globalThis.clearTimeout(timer); }
}

async function inspectorPublicUrl() {
  for (const port of [4040, 4041, 4042, 4043]) {
    const controller = new globalThis.AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(), 1500);
    try {
      const res = await globalThis.fetch("http://127.0.0.1:" + port + "/api/tunnels", { signal: controller.signal });
      if (!res.ok) continue;
      const data = await res.json();
      const tunnel = data.tunnels?.find(item =>
        item.public_url?.startsWith("https://") &&
        /(?:^|:)4000$/.test(String(item.config?.addr ?? "").split("/").at(-1))
      );
      if (tunnel) return tunnel.public_url;
    } catch {
      // ngrok inspector may not be running.
    } finally { globalThis.clearTimeout(timer); }
  }
  return null;
}

async function main() {
  let envText = "";
  try {
    envText = await readFile(resolve("apps/mobile/.env.local"), "utf8");
  } catch {
    // A new project may not yet have an API tunnel.
  }
  const configuredUrl = mobileApiUrl(envText);
  const validPublicUrl = configuredUrl?.startsWith("https://") && !configuredUrl.includes("localhost");
  const [apiLocalReady, metroReady, publicUrl] = await Promise.all([
    probe("http://127.0.0.1:4000/ready", { jsonReady: true }),
    probe("http://127.0.0.1:8081/status"),
    inspectorPublicUrl()
  ]);
  const mobileApiReady = validPublicUrl
    ? await probe(configuredUrl.replace(/\/$/, "") + "/ready", { jsonReady: true })
    : false;
  const flags = {apiLocalReady, metroReady, mobileApiReady, urlMismatch: apiTunnelMismatch(configuredUrl, publicUrl)};

  globalThis.console.log("[dev:diagnose] API localhost:4000 /ready:", apiLocalReady ? "ready" : "unavailable");
  globalThis.console.log("[dev:diagnose] Active ngrok tunnel:", publicUrl ? "detected" : "not detected");
  globalThis.console.log("[dev:diagnose] apps/mobile/.env.local API:", configuredUrl ? "configured" : "not configured");
  globalThis.console.log("[dev:diagnose] API through phone-facing tunnel:", mobileApiReady ? "ready" : "unavailable");
  globalThis.console.log("[dev:diagnose] Metro/Expo CLI localhost:8081:", metroReady ? "responding" : "not responding");
  for (const issue of explainConnectivity(flags)) globalThis.console.log("[dev:diagnose] " + issue);
  if (!configuredUrl) globalThis.console.log("[dev:diagnose] Start pnpm dev:api before pnpm dev:mobile so ngrok fills EXPO_PUBLIC_API_URL.");
  if (!validPublicUrl) globalThis.console.log("[dev:diagnose] Expo Go needs an HTTPS public API URL; localhost:4000 refers to the phone.");
  // Deliberately return success: this is a diagnostic, not a blocking build gate.
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(error => {
    globalThis.console.error("[dev:diagnose] Could not complete diagnostics:", error.message);
    process.exitCode = 1;
  });
}
