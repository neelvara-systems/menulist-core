import { CANONICA_SITE_URL } from '../siteConfig';

export const dynamic = 'force-static';

export function GET() {
    return new Response(`User-agent: *
Allow: /
Disallow: /canonica/
Disallow: /api/
Disallow: /signin
Disallow: /unauthorized

Sitemap: ${CANONICA_SITE_URL}/sitemap.xml
Host: ${CANONICA_SITE_URL}
`, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    });
}
