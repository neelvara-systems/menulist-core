/**
 * Platform Context Resolver
 * 
 * SECURITY: CCT signing MUST happen server-side only.
 * Client secretKey MUST never be exposed to browser.
 * 
 * @see __docs__/canonica/doctrine/07-multi-product-tenancy.md
 */

import { CanonicaClientTokenPayload, CanonicaPlatformContext } from '@type/multiProduct';

export async function resolvePlatformContext(
    tokenPayload: CanonicaClientTokenPayload,
    clientLookup: { tId: number; sId: number }
): Promise<CanonicaPlatformContext> {
    return {
        traceId: tokenPayload.traceId,
        requestId: tokenPayload.requestId,
        client: {
            clientId: tokenPayload.clientId,
            tId: clientLookup.tId,
            sId: clientLookup.sId,
        },
        source: {
            pId: tokenPayload.pId,
            tId: tokenPayload.tId,
            sId: tokenPayload.sId,
            uId: tokenPayload.uId,
            name: tokenPayload.name,
            email: tokenPayload.email,
            phone: tokenPayload.phone,
        },
        issuedAt: tokenPayload.iat,
    };
}
