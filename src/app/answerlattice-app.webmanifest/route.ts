import { resolveKnownProductIdByHostname } from '@constant/deploymentTargets';
import { normalizeRequestAuthority } from '@lib/routing/hostAuthority';
import { NextResponse } from 'next/server';

const ICONS = [
    { src: '/answerlattice-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/answerlattice-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/answerlattice-icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: '/answerlattice-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
] as const;

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
    const hostname = normalizeRequestAuthority(request.headers.get('host'))?.hostname;
    const isAnswerlatticeHost = resolveKnownProductIdByHostname(hostname) === 'answerlattice';
    const basePath = isAnswerlatticeHost ? '' : '/answerlattice';
    const route = (pathname: string) => `${basePath}${pathname}`;

    return NextResponse.json({
        name: 'AnswerLattice',
        short_name: 'AnswerLattice',
        description: 'Reviewed answers, in-app help, and visible support gaps for SaaS teams.',
        id: '/answerlattice-dashboard',
        start_url: route('/activation'),
        scope: isAnswerlatticeHost ? '/' : '/answerlattice/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui', 'browser'],
        background_color: '#0A0A1A',
        theme_color: '#0A0A1A',
        dir: 'auto',
        lang: 'en-US',
        categories: ['business', 'productivity', 'support'],
        icons: ICONS,
        shortcuts: [
            {
                name: 'Activation',
                short_name: 'Get Live',
                description: 'Continue the guided AnswerLattice launch path.',
                url: route('/activation'),
            },
            {
                name: 'Daily Brief',
                short_name: 'Daily Brief',
                description: 'Review the AnswerLattice work that needs attention.',
                url: route('/dashboard'),
            },
            {
                name: 'Support Board',
                short_name: 'Support',
                description: 'Open conversations and support tickets.',
                url: route('/support-board'),
            },
        ],
    }, {
        headers: {
            'Cache-Control': 'private, no-store, max-age=0',
            'Content-Type': 'application/manifest+json; charset=utf-8',
            Vary: 'Host',
        },
    });
}
