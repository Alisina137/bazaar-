import { existsSync } from "node:fs";
import { win32 as pathWin32 } from "node:path";
import process from "node:process";

/**
 * pnpm scripts can put an older ngrok 2.x binary ahead of the authenticated
 * ngrok 3 CLI in PATH. On Windows, prefer the official MSIX/WindowsApps CLI
 * (the same one PowerShell resolves in "where.exe ngrok").
 * Never read or move ngrok credentials: the selected CLI owns its config.
 */
export function resolveNgrokExecutable({
  platform = process.platform,
  localAppData = process.env.LOCALAPPDATA,
  explicitBinary = process.env.BAZAARLINK_NGROK_BIN,
  exists = existsSync
} = {}) {
  const override = typeof explicitBinary === "string" ? explicitBinary.trim() : "";
  if (override) return override;

  if (platform === "win32" && localAppData) {
    const windowsApps = pathWin32.join(
      localAppData, "Microsoft", "WindowsApps", "ngrok.exe"
    );
    if (exists(windowsApps)) return windowsApps;
  }

  return "ngrok";
}

export function parseNgrokMajorVersion(value) {
  const match = /^ngrok version\s+(\d+)\./i.exec(value);
  return match ? Number(match[1]) : null;
}
