import assert from 'node:assert/strict';
import { DISCOVERY_CRAWLERS } from '../../src/lib/seo/discoveryPolicy';
import {
    ANSWERLATTICE_DISCOVERY_DISALLOWED_PATHS,
    renderAnswerlatticeRobotsTxt,
} from '../../src/app/sites/answerlattice/robots.txt/route';

const robots = renderAnswerlatticeRobotsTxt();
const groups = robots.match(/User-agent: [^\n]+\n[\s\S]*?(?=\n\nUser-agent:|\n\nSitemap:)/g) || [];

assert.equal(groups.length, DISCOVERY_CRAWLERS.length + 1);

for (const userAgent of [...DISCOVERY_CRAWLERS, '*']) {
    const group = groups.find((candidate) => candidate.startsWith(`User-agent: ${userAgent}\n`));
    assert.ok(group, `missing robots group for ${userAgent}`);
    assert.match(group, /\nAllow: \/\n/);
    for (const path of ANSWERLATTICE_DISCOVERY_DISALLOWED_PATHS) {
        assert.match(group, new RegExp(`\\nDisallow: ${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\n|$)`));
    }
}

console.log('Answerlattice robots policy passed.');
