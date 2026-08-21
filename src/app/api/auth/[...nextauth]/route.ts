export const dynamic = 'force-dynamic';
import { getAuthOptionsForHostname } from "@lib/auth"
import { normalizeRequestAuthority } from '@lib/routing/hostAuthority'
import type { NextRequest } from 'next/server'
import NextAuth from "next-auth"

type NextAuthRouteContext = {
    params: Promise<{ nextauth: string[] }>;
};

const handler = (request: NextRequest, context: NextAuthRouteContext) => {
    const forwardedAuthority = normalizeRequestAuthority(request.headers.get('x-forwarded-host'));
    const hostAuthority = forwardedAuthority || normalizeRequestAuthority(request.headers.get('host'));

    return NextAuth(request, context, getAuthOptionsForHostname(hostAuthority?.hostname));
};

export { handler as GET, handler as POST }
