import { NextResponse } from 'next/server';
import { CAMPAIGNCUE_PUBLIC_PAGES, buildCampaignCueUrl } from '@constant/campaigncue/website';

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
    const urls = CAMPAIGNCUE_PUBLIC_PAGES.map((page) => [
        '  <url>',
        `    <loc>${escapeXml(buildCampaignCueUrl(page.path))}</loc>`,
        `    <changefreq>${page.changeFrequency}</changefreq>`,
        `    <priority>${page.priority.toFixed(1)}</priority>`,
        '  </url>',
    ].join('\n')).join('\n');

    const body = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        urls,
        '</urlset>',
        '',
    ].join('\n');

    return new NextResponse(body, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}
