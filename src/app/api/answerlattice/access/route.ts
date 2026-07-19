export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    getAnswerlatticeAccessContext,
} from '@lib/answerlattice/accessControl';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

export const GET = withAuth(async (_request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_STAFF_ACCESS) {
        return NextResponse.json(
            { error: 'Answerlattice staff access is not enabled.' },
            { headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS, status: 403 },
        );
    }

    const scope = resolveAnswerlatticeSessionScope(session);
    const access = await getAnswerlatticeAccessContext(session);
    if (!access) {
        return NextResponse.json(
            scope
                ? { error: 'Answerlattice access could not be prepared.', code: 'ANSWERLATTICE_ACCESS_UNAVAILABLE' }
                : { error: 'Answerlattice workspace required.', code: 'ANSWERLATTICE_ACCOUNT_REQUIRED' },
            { headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS, status: 403 },
        );
    }

    return NextResponse.json({ access }, {
        headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    });
});
