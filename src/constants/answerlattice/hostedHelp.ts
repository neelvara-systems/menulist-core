/**
 * Answerlattice hosted Help Center routing constants.
 *
 * Hosted help domains are customer-owned domains such as help.example.com.
 * Middleware cannot query Firestore at the edge, so it only routes common
 * support-domain prefixes into the hosted-help resolver. The resolver then
 * validates the hostname against Answerlattice's cached domain registry.
 */

export const ANSWERLATTICE_HOSTED_HELP_INTERNAL_BASE_PATH = '/answerlattice-hosted-help';
export const ANSWERLATTICE_HOSTED_HELP_DEV_PREFIX = '/__answerlattice-help';

export const ANSWERLATTICE_HOSTED_HELP_DOMAIN_PREFIXES = [
    'help',
    'docs',
    'support',
    'kb',
    'knowledge',
    'answers',
] as const;

const DOMAIN_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function normalizeHostedHelpDomain(value?: string | null): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    let host = trimmed;
    try {
        if (/^https?:\/\//i.test(trimmed)) {
            host = new URL(trimmed).host;
        }
    } catch {
        return null;
    }

    host = host
        .split('/')[0]
        .split('?')[0]
        .split('#')[0]
        .split(':')[0]
        .toLowerCase()
        .replace(/\.$/, '');

    if (!host || host.length > 253) return null;
    const labels = host.split('.');
    if (labels.length < 2) return null;
    if (!labels.every(label => DOMAIN_LABEL_PATTERN.test(label))) return null;
    return host;
}

export function isAnswerlatticeHostedHelpCandidateHostname(value?: string | null): boolean {
    const host = normalizeHostedHelpDomain(value);
    if (!host) return false;

    const labels = host.split('.');
    const firstLabel = labels[0] === 'www' ? labels[1] : labels[0];
    return (ANSWERLATTICE_HOSTED_HELP_DOMAIN_PREFIXES as readonly string[]).includes(firstLabel);
}

export function getAnswerlatticeHostedHelpRewritePath(pathname: string): string {
    return `${ANSWERLATTICE_HOSTED_HELP_INTERNAL_BASE_PATH}${pathname === '/' ? '' : pathname}`;
}
