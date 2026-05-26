export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { getCanonicaAccessContext } from '@lib/canonica/accessControl';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

export const GET = withAuth(async (_request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_STAFF_ACCESS) {
        return NextResponse.json({ error: 'Canonica staff access is not enabled.' }, { status: 403 });
    }

    const access = await getCanonicaAccessContext(session);
    if (!access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ access }, {
        headers: {
            'Cache-Control': 'private, no-store',
        },
    });
});

