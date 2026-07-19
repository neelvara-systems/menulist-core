import { ANSWERLATTICE_PUBLIC_PAGES, buildAnswerlatticeUrl } from '../siteConfig';

export const dynamic = 'force-static';

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export function GET() {
    const urls = ANSWERLATTICE_PUBLIC_PAGES.map((page) => `  <url>
    <loc>${escapeXml(buildAnswerlatticeUrl(page.path))}</loc>
    <changefreq>${page.changeFrequency}</changefreq>
    <priority>${page.priority.toFixed(2)}</priority>
  </url>`).join('\n');

    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    });
}
