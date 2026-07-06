import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { secureError } from '@lib/security/secureLogger';

const VERCEL_API_BASE = 'https://api.vercel.com';
const VERCEL_DOMAIN_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
const VERCEL_DOMAIN_PROVIDER_TIMEOUT_MS = 10_000;
const VERCEL_DOMAIN_PROVIDER_RESPONSE_PARSE_FAILED = 'vercel_domain_provider_response_parse_failed';

const getVercelToken = () => process.env.VERCEL_TOKEN;
const getVercelProjectId = () => process.env.VERCEL_PROJECT_ID;
const getVercelTeamId = () => process.env.VERCEL_TEAM_ID;

export type VercelDomainApiResult<T = any> = {
    ok: boolean;
    status: number;
    data: T;
};

export function isVercelDomainManagementConfigured(): boolean {
    return Boolean(getVercelToken() && getVercelProjectId());
}

export function getVercelDomainProjectId(): string {
    const projectId = getVercelProjectId();
    if (!projectId) {
        throw new Error('Vercel project is not configured. Set VERCEL_PROJECT_ID.');
    }
    return projectId;
}

function encodeVercelPathSegment(value: string): string {
    const normalized = value.trim();
    if (!normalized) {
        throw new Error('Vercel API path segment is required.');
    }
    return encodeURIComponent(normalized);
}

const getVercelProviderPathContext = (
    path: string,
    options: RequestInit,
    response: Response,
) => ({
    maxBytes: VERCEL_DOMAIN_RESPONSE_JSON_MAX_BYTES,
    method: String(options.method || 'GET').slice(0, 16),
    pathHasQuery: path.includes('?'),
    pathLength: path.length,
    pathPresent: path.trim().length > 0,
    responseOk: response.ok,
    responseStatus: response.status,
});

async function readVercelDomainResponseData<T>(
    response: Response,
    path: string,
    options: RequestInit,
): Promise<T> {
    try {
        return await readJsonResponseWithLimit<T>(response, VERCEL_DOMAIN_RESPONSE_JSON_MAX_BYTES);
    } catch (error) {
        secureError(
            '[Vercel Domain] Provider response parse failed',
            new Error(VERCEL_DOMAIN_PROVIDER_RESPONSE_PARSE_FAILED),
            {
                ...getVercelProviderPathContext(path, options, response),
                sourceErrorName: error instanceof Error ? error.name : typeof error,
            },
        );
        return {} as T;
    }
}

export async function vercelDomainFetch<T = any>(
    path: string,
    options: RequestInit = {},
): Promise<VercelDomainApiResult<T>> {
    const token = getVercelToken();
    const projectId = getVercelProjectId();
    if (!token || !projectId) {
        throw new Error('Vercel API is not configured. Set VERCEL_TOKEN and VERCEL_PROJECT_ID.');
    }

    const teamId = getVercelTeamId();
    const teamParam = teamId ? `teamId=${encodeURIComponent(teamId)}` : '';
    const separator = path.includes('?') ? '&' : '?';
    const url = `${VERCEL_API_BASE}${path}${teamParam ? `${separator}${teamParam}` : ''}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VERCEL_DOMAIN_PROVIDER_TIMEOUT_MS);

    let response: Response;
    try {
        response = await fetch(url, {
            ...options,
            redirect: 'manual',
            signal: controller.signal,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
    } finally {
        clearTimeout(timeout);
    }

    const data = await readVercelDomainResponseData<T>(response, path, options);
    return { ok: response.ok, status: response.status, data };
}

export async function addDomainToVercelProject(domain: string): Promise<VercelDomainApiResult> {
    return vercelDomainFetch(`/v10/projects/${encodeVercelPathSegment(getVercelDomainProjectId())}/domains`, {
        method: 'POST',
        body: JSON.stringify({ name: domain }),
    });
}

export async function getVercelDomainConfig(domain: string): Promise<VercelDomainApiResult> {
    return vercelDomainFetch(`/v6/domains/${encodeVercelPathSegment(domain)}/config`);
}

export async function removeDomainFromVercelProject(domain: string): Promise<VercelDomainApiResult> {
    return vercelDomainFetch(`/v9/projects/${encodeVercelPathSegment(getVercelDomainProjectId())}/domains/${encodeVercelPathSegment(domain)}`, {
        method: 'DELETE',
    });
}

export function isVercelDomainConfigured(config: any): boolean {
    return config?.misconfigured === false;
}
