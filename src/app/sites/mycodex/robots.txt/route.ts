const MYCODEX_ROBOTS_TXT = [
    'User-agent: *',
    'Disallow: /',
    '',
].join('\n');

export function GET() {
    return new Response(MYCODEX_ROBOTS_TXT, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'private, no-store',
            'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate',
        },
    });
}
