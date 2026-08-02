/**
 * Deployment target matrix for the shared MenuList + Neelvara +
 * Answerlattice + CampaignCue Vercel app.
 *
 * Domain routing and Firebase project selection must stay aligned:
 * - local development keeps MenuList at / and product sites under /__{product}
 * - Vercel preview/QA uses staging domains and QA Firebase projects
 * - Vercel production uses production domains and production Firebase projects
 */

import { normalizeRequestAuthority } from '@lib/routing/hostAuthority';

export type DeploymentStage = 'local' | 'preview' | 'production';
export type DeploymentProductId = 'menulist' | 'neelvara' | 'answerlattice' | 'campaigncue' | 'mycodex' | 'signaldesk';

export interface ProductDeploymentTarget {
    productId: DeploymentProductId;
    url: string;
    domains: readonly string[];
    ownerAppDomain?: string;
    tenantDomains?: readonly string[];
    redirectDomains?: readonly string[];
    devPathPrefix: string;
    firebaseProjectId: string;
}

export interface DeploymentStageEnv {
    VERCEL?: string;
    VERCEL_ENV?: string;
    NEXT_PUBLIC_ENV?: string;
    NEXT_PUBLIC_VERCEL_ENV?: string;
    NODE_ENV?: string;
}

export type DeploymentStageConfigurationErrorCode =
    | 'INVALID_PUBLIC_DEPLOYMENT_STAGE'
    | 'INVALID_PUBLIC_VERCEL_STAGE'
    | 'INVALID_SERVER_VERCEL_STAGE'
    | 'MISSING_SERVER_VERCEL_STAGE'
    | 'PUBLIC_DEPLOYMENT_STAGE_CONFLICT'
    | 'SERVER_PUBLIC_DEPLOYMENT_STAGE_CONFLICT';

export interface DeploymentStageResolution {
    errorCode: DeploymentStageConfigurationErrorCode | null;
    stage: DeploymentStage;
    valid: boolean;
}

export class DeploymentStageConfigurationError extends Error {
    readonly code: DeploymentStageConfigurationErrorCode;

    constructor(code: DeploymentStageConfigurationErrorCode) {
        super(code);
        this.name = 'DeploymentStageConfigurationError';
        this.code = code;
    }
}

export const DEPLOYMENT_TARGETS: Record<DeploymentStage, Record<DeploymentProductId, ProductDeploymentTarget>> = {
    local: {
        menulist: {
            productId: 'menulist',
            url: 'http://localhost:3000/',
            domains: ['localhost', '127.0.0.1'],
            devPathPrefix: '',
            firebaseProjectId: 'menulist-qa',
        },
        neelvara: {
            productId: 'neelvara',
            url: 'http://localhost:3000/__neelvara/',
            domains: [],
            devPathPrefix: '/__neelvara',
            firebaseProjectId: '',
        },
        answerlattice: {
            productId: 'answerlattice',
            url: 'http://localhost:3000/__answerlattice/',
            domains: [],
            devPathPrefix: '/__answerlattice',
            firebaseProjectId: 'answerlattice-qa',
        },
        campaigncue: {
            productId: 'campaigncue',
            url: 'http://localhost:3000/__campaigncue/',
            domains: [],
            devPathPrefix: '/__campaigncue',
            firebaseProjectId: 'campaigncue-qa',
        },
        signaldesk: {
            productId: 'signaldesk',
            url: 'http://localhost:3000/signaldesk',
            domains: [],
            devPathPrefix: '',
            firebaseProjectId: 'menulist-signaldesk-qa',
        },
        mycodex: {
            productId: 'mycodex',
            url: 'http://localhost:3000/__mycodex/',
            domains: [],
            devPathPrefix: '/__mycodex',
            firebaseProjectId: '',
        },
    },
    preview: {
        menulist: {
            productId: 'menulist',
            url: 'https://menulist.digital',
            domains: ['menulist.digital', 'www.menulist.digital', 'app.menulist.digital'],
            ownerAppDomain: 'app.menulist.digital',
            tenantDomains: ['menulist.digital'],
            devPathPrefix: '',
            firebaseProjectId: 'menulist-qa',
        },
        neelvara: {
            productId: 'neelvara',
            url: 'https://neelvara.menulist.online',
            domains: ['neelvara.menulist.online'],
            devPathPrefix: '',
            firebaseProjectId: '',
        },
        answerlattice: {
            productId: 'answerlattice',
            url: 'https://answerlattice.menulist.online',
            domains: ['answerlattice.menulist.online'],
            devPathPrefix: '',
            firebaseProjectId: 'answerlattice-qa',
        },
        campaigncue: {
            productId: 'campaigncue',
            url: 'https://campaigncue.menulist.online',
            domains: ['campaigncue.menulist.online'],
            devPathPrefix: '',
            firebaseProjectId: 'campaigncue-qa',
        },
        signaldesk: {
            productId: 'signaldesk',
            url: 'https://signaldesk.menulist.online',
            domains: ['signaldesk.menulist.online'],
            devPathPrefix: '',
            firebaseProjectId: 'menulist-signaldesk-qa',
        },
        mycodex: {
            productId: 'mycodex',
            url: 'https://mycodex.invalid',
            domains: [],
            devPathPrefix: '',
            firebaseProjectId: '',
        },
    },
    production: {
        menulist: {
            productId: 'menulist',
            url: 'https://menulist.ai',
            domains: ['menulist.ai', 'www.menulist.ai', 'app.menulist.ai'],
            ownerAppDomain: 'app.menulist.ai',
            tenantDomains: ['menulist.online'],
            redirectDomains: ['menulist.online', 'www.menulist.online'],
            devPathPrefix: '',
            firebaseProjectId: 'menulist',
        },
        neelvara: {
            productId: 'neelvara',
            url: 'https://neelvara.com',
            domains: ['neelvara.com', 'www.neelvara.com'],
            devPathPrefix: '',
            firebaseProjectId: '',
        },
        answerlattice: {
            productId: 'answerlattice',
            url: 'https://answerlattice.com',
            domains: ['answerlattice.com', 'www.answerlattice.com'],
            devPathPrefix: '',
            firebaseProjectId: 'answerlattice',
        },
        campaigncue: {
            productId: 'campaigncue',
            url: 'https://campaigncue.ai',
            domains: ['campaigncue.ai', 'www.campaigncue.ai'],
            devPathPrefix: '',
            firebaseProjectId: 'campaigncue',
        },
        signaldesk: {
            productId: 'signaldesk',
            url: 'https://signaldesk.menulist.online',
            domains: ['signaldesk.menulist.online'],
            devPathPrefix: '',
            firebaseProjectId: 'menulist-signaldesk',
        },
        mycodex: {
            productId: 'mycodex',
            url: 'https://mycodex.invalid',
            domains: [],
            devPathPrefix: '',
            firebaseProjectId: '',
        },
    },
};

const normalizeStageValue = (value?: string | null): string =>
    value?.trim().toLowerCase() || '';

const parseDeploymentStageValue = (
    value?: string | null,
): DeploymentStage | null => {
    const normalized = normalizeStageValue(value);
    if (!normalized) return null;
    if (normalized === 'production') return 'production';
    if (normalized === 'preview') return 'preview';
    if (normalized === 'development' || normalized === 'local') return 'local';
    return null;
};

const hasStageValue = (value?: string | null): boolean => Boolean(normalizeStageValue(value));

/**
 * Capture public deployment markers through direct process.env property reads.
 * Next.js only inlines statically referenced NEXT_PUBLIC_* variables into the
 * browser bundle; passing process.env through an alias loses those values.
 */
export const getDeploymentStageEnvSnapshot = (): DeploymentStageEnv => ({
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
});

export function resolveDeploymentStage(
    env: DeploymentStageEnv = getDeploymentStageEnvSnapshot(),
): DeploymentStageResolution {
    const serverVercelStage = parseDeploymentStageValue(env.VERCEL_ENV);
    const publicVercelStage = parseDeploymentStageValue(env.NEXT_PUBLIC_VERCEL_ENV);
    const publicStage = parseDeploymentStageValue(env.NEXT_PUBLIC_ENV);
    const isVercel = env.VERCEL === '1' || hasStageValue(env.VERCEL_ENV);

    const fallbackStage = serverVercelStage || publicVercelStage || publicStage || 'local';
    const invalid = (errorCode: DeploymentStageConfigurationErrorCode): DeploymentStageResolution => ({
        errorCode,
        stage: fallbackStage,
        valid: false,
    });

    if (hasStageValue(env.VERCEL_ENV) && !serverVercelStage) {
        return invalid('INVALID_SERVER_VERCEL_STAGE');
    }
    if (hasStageValue(env.NEXT_PUBLIC_VERCEL_ENV) && !publicVercelStage) {
        return invalid('INVALID_PUBLIC_VERCEL_STAGE');
    }
    if (hasStageValue(env.NEXT_PUBLIC_ENV) && !publicStage) {
        return invalid('INVALID_PUBLIC_DEPLOYMENT_STAGE');
    }
    if (env.VERCEL === '1' && !serverVercelStage) {
        return invalid('MISSING_SERVER_VERCEL_STAGE');
    }
    if (
        publicVercelStage
        && publicStage
        && publicVercelStage !== publicStage
    ) {
        return invalid('PUBLIC_DEPLOYMENT_STAGE_CONFLICT');
    }
    if (
        serverVercelStage
        && (
            (publicVercelStage && publicVercelStage !== serverVercelStage)
            || (publicStage && publicStage !== serverVercelStage)
        )
    ) {
        return invalid('SERVER_PUBLIC_DEPLOYMENT_STAGE_CONFLICT');
    }

    return {
        errorCode: null,
        stage: isVercel && serverVercelStage
            ? serverVercelStage
            : publicVercelStage || publicStage || serverVercelStage || 'local',
        valid: true,
    };
}

export function getDeploymentStage(
    env: DeploymentStageEnv = getDeploymentStageEnvSnapshot(),
): DeploymentStage {
    const resolution = resolveDeploymentStage(env);
    if (!resolution.valid || resolution.errorCode) {
        throw new DeploymentStageConfigurationError(
            resolution.errorCode || 'INVALID_PUBLIC_DEPLOYMENT_STAGE',
        );
    }
    return resolution.stage;
}

export function getProductDeploymentTarget(
    productId: DeploymentProductId,
    stage: DeploymentStage = getDeploymentStage(),
): ProductDeploymentTarget {
    return DEPLOYMENT_TARGETS[stage][productId];
}

export function getActiveProductDomains(
    productId: DeploymentProductId,
    stage: DeploymentStage = getDeploymentStage(),
): string[] {
    return [...getProductDeploymentTarget(productId, stage).domains];
}

export function getActiveTenantDomains(
    productId: DeploymentProductId,
    stage: DeploymentStage = getDeploymentStage(),
): string[] {
    return [...(getProductDeploymentTarget(productId, stage).tenantDomains || [])];
}

export function getActiveRedirectDomains(
    productId: DeploymentProductId,
    stage: DeploymentStage = getDeploymentStage(),
): string[] {
    return [...(getProductDeploymentTarget(productId, stage).redirectDomains || [])];
}

export function getKnownProductDomains(productId: DeploymentProductId): string[] {
    return Array.from(new Set(
        Object.values(DEPLOYMENT_TARGETS).flatMap((targets) => {
            const target = targets[productId];
            return [
                ...target.domains,
                ...(target.tenantDomains || []),
                ...(target.redirectDomains || []),
            ];
        }),
    ));
}

export function resolveKnownProductIdByHostname(hostname: string | null | undefined): DeploymentProductId | null {
    const normalizedHost = normalizeRequestAuthority(hostname)?.hostname;
    if (!normalizedHost) return null;

    for (const productId of ['menulist', 'neelvara', 'answerlattice', 'campaigncue', 'mycodex', 'signaldesk'] as DeploymentProductId[]) {
        if (getKnownProductDomains(productId).includes(normalizedHost)) {
            return productId;
        }
    }

    return null;
}

export function getExpectedFirebaseProjectId(
    productId: DeploymentProductId,
    stage: DeploymentStage = getDeploymentStage(),
): string {
    return getProductDeploymentTarget(productId, stage).firebaseProjectId;
}

export function isActiveProductDomain(
    productId: DeploymentProductId,
    hostname: string | null | undefined,
    stage: DeploymentStage = getDeploymentStage(),
): boolean {
    const normalizedHost = normalizeRequestAuthority(hostname)?.hostname;
    if (!normalizedHost) return false;
    return getActiveProductDomains(productId, stage).includes(normalizedHost);
}
