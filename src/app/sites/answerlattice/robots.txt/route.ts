import { renderAnswerlatticeRobotsTxt } from '@lib/seo/answerlatticeRobotsPolicy';
import { ANSWERLATTICE_SITE_URL } from '../siteConfig';

export const dynamic = 'force-static';

export function GET() {
    return new Response(renderAnswerlatticeRobotsTxt(ANSWERLATTICE_SITE_URL), {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    });
}
