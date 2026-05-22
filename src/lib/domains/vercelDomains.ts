const VERCEL_API_BASE = 'https://api.vercel.com';

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

    const response = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    const data = await response.json().catch(() => ({} as T));
    return { ok: response.ok, status: response.status, data };
}

export async function addDomainToVercelProject(domain: string): Promise<VercelDomainApiResult> {
    return vercelDomainFetch(`/v10/projects/${getVercelDomainProjectId()}/domains`, {
        method: 'POST',
        body: JSON.stringify({ name: domain }),
    });
}

export async function getVercelDomainConfig(domain: string): Promise<VercelDomainApiResult> {
    return vercelDomainFetch(`/v6/domains/${domain}/config`);
}

export async function removeDomainFromVercelProject(domain: string): Promise<VercelDomainApiResult> {
    return vercelDomainFetch(`/v9/projects/${getVercelDomainProjectId()}/domains/${domain}`, {
        method: 'DELETE',
    });
}

export function isVercelDomainConfigured(config: any): boolean {
    return config?.misconfigured === false;
}
