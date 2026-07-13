import * as net from "net";

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost"
    || hostname.endsWith(".localhost")
    || net.isIP(hostname) !== 0 && (
      hostname === "127.0.0.1"
      || hostname === "::1"
    );
}

export function normalizeMessagingPreviewBaseUrl(
  value: unknown,
  allowLocalHttp: boolean,
): string | null {
  if (typeof value !== "string" || !value || value !== value.trim() || value.length > 2048) {
    return null;
  }

  const candidate = /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)
    ? value
    : `https://${value}`;
  try {
    const url = new URL(candidate);
    const localHttpAllowed = allowLocalHttp
      && url.protocol === "http:"
      && isLocalHostname(url.hostname);
    if (
      (url.protocol !== "https:" && !localHttpAllowed)
      || !url.hostname
      || url.username
      || url.password
      || url.search
      || url.hash
    ) {
      return null;
    }

    const path = url.pathname.replace(/\/+$/, "");
    return `${url.origin}${path === "/" ? "" : path}`;
  } catch {
    return null;
  }
}
