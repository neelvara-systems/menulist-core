import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';

const MAX_PUBLIC_TRUTH_URL_PARSE_DIAGNOSTICS = 25;

const reportedPublicTruthUrlParseFailures = new Set<string>();

function hasExplicitProtocol(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

function getPublicTruthUrlValueKind(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function logPublicTruthUrlParseFailure(
  error: unknown,
  value: unknown,
  candidate: string,
  diagnosticSource: string,
): void {
  if (diagnosticSource === 'unknown') return;

  const valueKind = getPublicTruthUrlValueKind(value);
  const valueLength = typeof value === 'string' ? value.trim().length : 0;
  const failureKey = [
    diagnosticSource,
    valueKind,
    valueLength,
    candidate.length,
    hasExplicitProtocol(candidate) ? 'explicit-protocol' : 'implicit-protocol',
  ].join(':');

  if (reportedPublicTruthUrlParseFailures.has(failureKey)) return;
  if (reportedPublicTruthUrlParseFailures.size >= MAX_PUBLIC_TRUTH_URL_PARSE_DIAGNOSTICS) return;
  reportedPublicTruthUrlParseFailures.add(failureKey);

  logRuntimeFailure('public_truth_tool_url_parse_failed', error, {
    diagnosticSource,
    valueKind,
    valueStringLength: valueLength,
    candidateLength: candidate.length,
    candidateHasExplicitProtocol: hasExplicitProtocol(candidate),
    fallbackPolicy: 'treat_as_missing_public_url',
  });
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
  const normalized = hostname.toLowerCase().replace(/\.+$/, '');
  if (!normalized) return false;
  if (normalized.includes(':') || normalized.includes('[') || normalized.includes(']')) return false;
  if (normalized.split('.').some((label) => !label)) return false;
  if (normalized === 'localhost' || normalized.endsWith('.localhost') || normalized.endsWith('.local')) return false;
  if (isPrivateIpv4(normalized)) return false;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) return false;
  return normalized.includes('.');
}

export function parsePublicHttpsUrl(value: string, diagnosticSource = 'unknown'): URL | null {
  if (!value) return null;
  const candidate = getUrlWithPublicHttpsProtocol(value);

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    if (!isPublicHttpsHostname(url.hostname)) return null;
    return url;
  } catch (error) {
    logPublicTruthUrlParseFailure(error, value, candidate, diagnosticSource);
    return null;
  }
}

export function isPublicHttpsUrl(value: string, diagnosticSource = 'unknown'): boolean {
  return Boolean(parsePublicHttpsUrl(value, diagnosticSource));
}
