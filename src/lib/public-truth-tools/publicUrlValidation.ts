function hasExplicitProtocol(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

export function getUrlWithPublicHttpsProtocol(value: string): string {
  if (hasExplicitProtocol(value)) return value;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#].*)?$/i.test(value)) {
    return `https://${value}`;
  }
  return value;
}

function isPrivateIpv4(hostname: string): boolean {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;

  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true;

  const [first, second] = octets;
  return (
    first === 0
    || first === 10
    || first === 127
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
  );
}

export function isPublicHttpsHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (!normalized) return false;
  if (normalized === 'localhost' || normalized.endsWith('.localhost') || normalized.endsWith('.local')) return false;
  if (normalized === '[::1]' || normalized === '::1') return false;
  if (isPrivateIpv4(normalized)) return false;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) return false;
  return normalized.includes('.');
}

export function parsePublicHttpsUrl(value: string): URL | null {
  if (!value) return null;

  try {
    const url = new URL(getUrlWithPublicHttpsProtocol(value));
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    if (!isPublicHttpsHostname(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

export function isPublicHttpsUrl(value: string): boolean {
  return Boolean(parsePublicHttpsUrl(value));
}
