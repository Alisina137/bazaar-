import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { win32 as pathWin32 } from "node:path";
import process from "node:process";

/**
 * Resolve a single executable for both the version probe and the tunnel.
 * A pnpm-launched Windows shell can have old ngrok v2 commands ahead of
 * the authenticated WindowsApps v3 alias. "where.exe ngrok" gives the
 * actual paths that Windows knows about, even when existsSync() cannot
 * stat a protected WindowsApps app-execution alias.
 */
export function resolveNgrokExecutable({
  platform = process.platform,
  localAppData = process.env.LOCALAPPDATA,
  explicitBinary = process.env.BAZAARLINK_NGROK_BIN,
  exists = existsSync,
  lookup = () => {
    const result = spawnSync("where.exe", ["ngrok"], {
      encoding: "utf8",
      timeout: 5_000,
      windowsHide: true
    });
    return result.status === 0 ? result.stdout : "";
  }
} = {}) {
  const override = typeof explicitBinary === "string" ? explicitBinary.trim() : "";
  if (override) return override;

  if (platform === "win32") {
    const candidates = String(lookup() ?? "").split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /ngrok(?:\.exe)?$/i.test(line));

    if (localAppData) {
      const windowsApps = pathWin32.join(localAppData, "Microsoft", "WindowsApps", "ngrok.exe");
      const matched = candidates.find((path) => path.toLowerCase() === windowsApps.toLowerCase());
      if (matched) return matched;
      if (exists(windowsApps)) return windowsApps;
    }

    const binary = candidates.find((path) => /\.exe$/i.test(path));
    if (binary) return binary;
  }

  return "ngrok";
}

/** Keep native executable launches out of cmd.exe to avoid PATH re-resolution. */
export function getSpawnSpec(name, args, platform = process.platform) {
  const shell = platform === "win32" && name === "pnpm";
  return shell
    ? { command: "cmd.exe", args: ["/d", "/s", "/c", [name, ...args].join(" ")] }
    : { command: name, args };
}

export function parseNgrokMajorVersion(value) {
  const match = /^ngrok version\s+(\d+)\./i.exec(value);
  return match ? Number(match[1]) : null;
}
