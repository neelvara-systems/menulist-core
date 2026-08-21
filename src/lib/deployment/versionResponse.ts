import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

export const DEPLOYMENT_VERSION_RESPONSE_JSON_MAX_BYTES = 8 * 1024;

export const DEPLOYMENT_VERSION_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

export type DeploymentVersionResponseSurface =
    | 'deployment_build_badge'
    | 'error_report'
    | 'owner_update_prompt';

export type DeploymentVersionResponse = {
    buildCreatedAt?: string;
    buildId?: string;
    buildProvenance?: 'missing' | 'verified';
    deploymentUrl?: string;
    env?: string;
    shortBuildId?: string;
};

type DeploymentVersionResponseLogContext = Record<string, boolean | number | string | undefined>;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isOptionalString = (value: unknown): boolean => (
    value === undefined || typeof value === 'string'
);

const isOptionalBuildProvenance = (value: unknown): boolean => (
    value === undefined || value === 'missing' || value === 'verified'
);

export const isDeploymentVersionResponse = (value: unknown): value is DeploymentVersionResponse => (
    isRecord(value)
    && isOptionalString(value.buildCreatedAt)
    && isOptionalString(value.buildId)
    && isOptionalBuildProvenance(value.buildProvenance)
    && isOptionalString(value.deploymentUrl)
    && isOptionalString(value.env)
    && isOptionalString(value.shortBuildId)
);

const getDeploymentVersionResponseLogContext = (
    response: Response,
    surface: DeploymentVersionResponseSurface,
): DeploymentVersionResponseLogContext => ({
    maxBytes: DEPLOYMENT_VERSION_RESPONSE_JSON_MAX_BYTES,
    responseOk: response.ok,
    responseStatus: response.status,
    surface,
});

export async function readDeploymentVersionResponse(
    response: Response,
    surface: DeploymentVersionResponseSurface,
): Promise<DeploymentVersionResponse | null> {
    let payload: unknown = null;

    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            DEPLOYMENT_VERSION_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logRuntimeFailure(
            'deployment_version_response_parse_failed',
            error,
            getDeploymentVersionResponseLogContext(response, surface),
        );
        return null;
    }

    if (!isDeploymentVersionResponse(payload)) {
        logRuntimeFailure(
            'deployment_version_response_invalid',
            new Error('DEPLOYMENT_VERSION_RESPONSE_INVALID'),
            {
                ...getDeploymentVersionResponseLogContext(response, surface),
                ...getBoundedRuntimeStringContext('surface', surface),
            },
        );
        return null;
    }

    return payload;
}
