import { NextResponse } from 'next/server';
import {
    NEELVARA_LEGAL_EMAIL,
    buildNeelvaraUrl,
} from '@constant/neelvara/website';

export const dynamic = 'force-static';

const SECURITY_TXT = [
    `Contact: mailto:${NEELVARA_LEGAL_EMAIL}`,
    `Policy: ${buildNeelvaraUrl('/legal')}`,
    `Canonical: ${buildNeelvaraUrl('/.well-known/security.txt')}`,
    'Preferred-Languages: en',
    'Expires: 2027-06-26T00:00:00.000Z',
    '',
].join('\n');

export function GET() {
    return new NextResponse(SECURITY_TXT, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}
