export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
    MYCODEX_ROBOTS_TAG,
    MYCODEX_SESSION_COOKIE,
    getExpiredMyCodexSessionCookieOptions,
} from '@lib/mycodex/auth';

const getLoginPath = (request: NextRequest) => {
    const referer = request.headers.get('referer');
    if (referer) {
        try {
            const refererPath = new URL(referer).pathname;
            if (refererPath.startsWith('/__mycodex/')) return '/__mycodex/login';
        } catch {
            // Fall back to product-domain login path.
        }
    }

    return request.nextUrl.pathname.startsWith('/__mycodex/') ? '/__mycodex/login' : '/login';
};

export async function POST(request: NextRequest) {
    const url = new URL(getLoginPath(request), request.url);
    url.searchParams.set('status', 'signed-out');

    const response = NextResponse.redirect(url, 303);
    response.cookies.set(MYCODEX_SESSION_COOKIE, '', getExpiredMyCodexSessionCookieOptions());
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', MYCODEX_ROBOTS_TAG);
    return response;
}
