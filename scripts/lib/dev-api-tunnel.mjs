import { URL } from "node:url";

/** Only expose the HTTPS tunnel which actually forwards to the API port. */
export function findNgrokHttpsUrl(payload, port = 4000) {
  if (!payload || !Array.isArray(payload.tunnels)) return null;
  for (const tunnel of payload.tunnels) {
    const address = tunnel?.config?.addr;
    const publicUrl = tunnel?.public_url;
    if (typeof address !== "string" || typeof publicUrl !== "string") continue;
    let matchesPort = address === String(port) || address === ":" + port;
    if (!matchesPort) {
      try {
        matchesPort = new URL(address).port === String(port);
      } catch {
        matchesPort = false;
      }
    }
    if (!matchesPort) continue;
    try {
      const parsed = new URL(publicUrl);
      if (parsed.protocol === "https:" && parsed.hostname &&
          !parsed.username && !parsed.password) {
        return parsed.origin;
      }
    } catch {
      // Ignore malformed inspector data.
    }
  }
  return null;
}

/** Preserve other Expo env keys and update only the one owned by this runner. */
export function setMobileApiUrl(source, url) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.origin !== url) {
    throw new Error("Expected an HTTPS ngrok origin");
  }

  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const lines = source ? source.split(/\r?\n/) : [];
  let replaced = false;
  const result = [];
  for (const line of lines) {
    if (/^\s*EXPO_PUBLIC_API_URL\s*=/.test(line)) {
      if (!replaced) result.push("EXPO_PUBLIC_API_URL=" + url);
      replaced = true;
    } else {
      result.push(line);
    }
  }
  if (!replaced) {
    // If the file already ended in a newline, use that last empty row.
    if (result.at(-1) === "") result.pop();
    result.push("EXPO_PUBLIC_API_URL=" + url);
  }
  return result.join(newline).replace(/(?:\r?\n)*$/, "") + newline;
}
