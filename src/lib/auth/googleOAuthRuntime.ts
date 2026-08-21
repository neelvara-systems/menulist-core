import { resolveKnownProductIdByHostname } from '@constant/deploymentTargets';

export type GoogleOAuthCredentialProduct = 'answerlattice' | 'menulist';

export interface GoogleOAuthRuntimeEnv {
    [key: string]: string | undefined;
    ANSWERLATTICE_GOOGLE_CLIENT_ID?: string;
    ANSWERLATTICE_GOOGLE_CLIENT_SECRET?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
}

export interface GoogleOAuthRuntimeConfig {
    clientId: string;
    clientSecret: string;
    configured: boolean;
    product: GoogleOAuthCredentialProduct;
}

const normalizeCredential = (value?: string): string => value?.trim() || '';

export function resolveGoogleOAuthCredentialProduct(
    hostname?: string | null,
): GoogleOAuthCredentialProduct {
    return resolveKnownProductIdByHostname(hostname) === 'answerlattice'
        ? 'answerlattice'
        : 'menulist';
}

export function resolveGoogleOAuthRuntimeConfig(
    hostname?: string | null,
    env: GoogleOAuthRuntimeEnv = process.env,
): GoogleOAuthRuntimeConfig {
    const product = resolveGoogleOAuthCredentialProduct(hostname);
    const clientId = normalizeCredential(
        product === 'answerlattice'
            ? env.ANSWERLATTICE_GOOGLE_CLIENT_ID
            : env.GOOGLE_CLIENT_ID,
    );
    const clientSecret = normalizeCredential(
        product === 'answerlattice'
            ? env.ANSWERLATTICE_GOOGLE_CLIENT_SECRET
            : env.GOOGLE_CLIENT_SECRET,
    );

    return {
        clientId,
        clientSecret,
        configured: Boolean(clientId && clientSecret),
        product,
    };
}
