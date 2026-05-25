/**
 * Deployment target matrix for the shared MenuList + Canonica Vercel app.
 *
 * Domain routing and Firebase project selection must stay aligned:
 * - local development keeps MenuList at / and Canonica under /__canonica
 * - Vercel preview/QA uses staging domains and QA Firebase projects
 * - Vercel production uses production domains and production Firebase projects
 */

export type DeploymentStage = 'local' | 'preview' | 'production';
export type DeploymentProductId = 'menulist' | 'canonica';

export interface ProductDeploymentTarget {
    productId: DeploymentProductId;
    url: string;
    domains: readonly string[];
    devPathPrefix: string;
    firebaseProjectId: string;
}

export interface DeploymentStageEnv {
    VERCEL?: string;
    VERCEL_ENV?: string;
    NEXT_PUBLIC_ENV?: string;
    NODE_ENV?: string;
}

export const DEPLOYMENT_TARGETS: Record<DeploymentStage, Record<DeploymentProductId, ProductDeploymentTarget>> = {
    local: {
        menulist: {
            productId: 'menulist',
            url: 'http://localhost:3000/',
            domains: ['localhost', '127.0.0.1'],
            devPathPrefix: '',
            firebaseProjectId: 'ecomsai',
        },
        canonica: {
            productId: 'canonica',
            url: 'http://localhost:3000/__canonica/',
            domains: [],
            devPathPrefix: '/__canonica',
            firebaseProjectId: 'canonica-qa',
        },
    },
    preview: {
        menulist: {
            productId: 'menulist',
            url: 'https://menulist.online',
            domains: ['menulist.online', 'www.menulist.online'],
            devPathPrefix: '',
            firebaseProjectId: 'ecomsai',
        },
        canonica: {
            productId: 'canonica',
            url: 'https://ecomsai.com',
            domains: ['ecomsai.com', 'www.ecomsai.com'],
            devPathPrefix: '',
            firebaseProjectId: 'canonica-qa',
        },
    },
    production: {
        menulist: {
            productId: 'menulist',
            url: 'https://menulist.ai',
            domains: ['menulist.ai', 'www.menulist.ai'],
            devPathPrefix: '',
            firebaseProjectId: 'menulist',
        },
        canonica: {
            productId: 'canonica',
            url: 'https://canonica.app',
            domains: ['canonica.app', 'www.canonica.app'],
            devPathPrefix: '',
            firebaseProjectId: 'canonica',
        },
    },
};

const normalizeStageValue = (value?: string | null): string =>
    value?.trim().toLowerCase() || '';

export function getDeploymentStage(
    env: DeploymentStageEnv = process.env as DeploymentStageEnv,
): DeploymentStage {
    const vercelEnv = normalizeStageValue(env.VERCEL_ENV);
    const publicEnv = normalizeStageValue(env.NEXT_PUBLIC_ENV);
    const nodeEnv = normalizeStageValue(env.NODE_ENV);

    if (vercelEnv === 'production' || publicEnv === 'production') return 'production';
    if (vercelEnv === 'preview' || publicEnv === 'preview') return 'preview';
    if (env.VERCEL === '1') return 'preview';
    if (nodeEnv === 'production' && publicEnv === 'production') return 'production';

    return 'local';
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

export function getKnownProductDomains(productId: DeploymentProductId): string[] {
    return Array.from(new Set(
        Object.values(DEPLOYMENT_TARGETS).flatMap((targets) => targets[productId].domains),
    ));
}

export function resolveKnownProductIdByHostname(hostname: string | null | undefined): DeploymentProductId | null {
    if (!hostname) return null;
    const normalizedHost = hostname.split(':')[0].toLowerCase();

    for (const productId of ['menulist', 'canonica'] as DeploymentProductId[]) {
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
    if (!hostname) return false;
    const normalizedHost = hostname.split(':')[0].toLowerCase();
    return getActiveProductDomains(productId, stage).includes(normalizedHost);
}
