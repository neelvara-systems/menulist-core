const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WIDTH = 1440;
const HEIGHT = 1200;
const PUBLIC_OUT_DIR = path.join(process.cwd(), 'public', 'answerlattice-website-assets', 'dummy');
const SOURCE_OUT_DIR = path.join(
    process.cwd(),
    'packages',
    'asset-factory',
    'answerlattice-website-assets',
    'dummy-sources'
);

const ASSETS = [
    ['answerlattice-home-hero-workspace', 'Homepage hero workspace', 'Billing support', 'Approved answer + safe context + review queue'],
    ['answerlattice-widget-runtime', 'Widget runtime', 'Billing invoices', 'Allowed origin + safe context + widget answer'],
    ['answerlattice-product-preview-activation', 'Product preview', 'Activation command center', 'Launch readiness, imports, surfaces, widget verification'],
    ['answerlattice-product-preview-surfaces', 'Product preview', 'Product surfaces', 'Billing, onboarding, team settings, releases, errors'],
    ['answerlattice-product-preview-widget', 'Product preview', 'Widget install', 'Origins, blocked routes, context, runtime checks'],
    ['answerlattice-product-preview-feedback', 'Product preview', 'Feedback review', 'Private ratings, feature requests, Support Board handoff'],
    ['answerlattice-product-preview-governance', 'Product preview', 'Answer review', 'Canonical coverage, drift pressure, mutation proposals'],
    ['answerlattice-product-area-launch-setup', 'Product area', 'Set up support', 'Workspace, team, starter sources, mapped pages'],
    ['answerlattice-product-area-widget', 'Product area', 'In-app help widget', 'Safe page hints, screenshot boundary, allowed domains'],
    ['answerlattice-product-area-support-control', 'Product area', 'Help center and tickets', 'Hosted help, FAQ, fallback tickets, support gaps'],
    ['answerlattice-product-area-governance', 'Product area', 'Review approved answers', 'Drafts, repeated misses, stale answers, owner approval'],
    ['answerlattice-feature-team-access', 'Product feature', 'Team Access', 'Members, roles, passcodes, owner reset, force sign-out'],
    ['answerlattice-feature-knowledge-intake', 'Product feature', 'Knowledge Intake', 'Links, files, screenshots, recordings, review drafts'],
    ['answerlattice-feature-knowledge-base', 'Product feature', 'Knowledge Base', 'Articles, source links, hosted help, widget suggestions'],
    ['answerlattice-feature-faq-management', 'Product feature', 'FAQ Management', 'Owner Q&A, article-backed FAQs, context assignment'],
    ['answerlattice-feature-changelog', 'Product feature', 'Changelog', 'Release notes, affected answers, drift review'],
    ['answerlattice-feature-tickets', 'Product feature', 'Tickets', 'Fallback capture, safe debug context, knowledge signals'],
    ['answerlattice-feature-support-board', 'Product feature', 'Support Board', 'Private cards, internal notes, answer-proposal handoff'],
    ['answerlattice-feature-feedback-review', 'Product feature', 'Feedback Review', 'Ratings, suggestions, product-area support signals'],
    ['answerlattice-feature-workflow-notifications', 'Product feature', 'Workflow Notifications', 'Slack/email events, filters, test delivery, health'],
    ['answerlattice-feature-proactive-help', 'Product feature', 'Proactive Help', 'Active triggers, approved summaries, configured prompts'],
    ['answerlattice-demo-surface-billing', 'Page-aware demo', 'Billing page', 'Invoice question gets billing-specific approved answer'],
    ['answerlattice-demo-surface-onboarding', 'Page-aware demo', 'Onboarding page', 'Setup question gets starter-source guidance'],
    ['answerlattice-demo-surface-settings', 'Page-aware demo', 'Team settings page', 'Permission question becomes scoped support review'],
    ['answerlattice-demo-surface-release', 'Page-aware demo', 'Release page', 'Usage-limit release triggers stale-answer review'],
];

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function slugSeed(slug) {
    return slug.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function colorFor(slug) {
    const colors = ['#0f766e', '#0891b2', '#2563eb', '#7c3aed', '#0d9488', '#0284c7'];
    return colors[slugSeed(slug) % colors.length];
}

function panel(x, y, width, height, title, body, accent) {
    return `
        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="28" fill="#101028" stroke="rgba(255,255,255,0.10)" stroke-width="2"/>
        <rect x="${x + 28}" y="${y + 28}" width="84" height="10" rx="5" fill="${accent}" opacity="0.78"/>
        <text x="${x + 28}" y="${y + 76}" fill="#f8fafc" font-size="30" font-weight="700">${escapeXml(title)}</text>
        <text x="${x + 28}" y="${y + 118}" fill="#a0a0c0" font-size="22">${escapeXml(body)}</text>
        <rect x="${x + 28}" y="${y + height - 82}" width="${Math.max(120, width - 56)}" height="18" rx="9" fill="rgba(255,255,255,0.08)"/>
        <rect x="${x + 28}" y="${y + height - 46}" width="${Math.max(92, Math.floor((width - 56) * 0.64))}" height="18" rx="9" fill="rgba(255,255,255,0.055)"/>
    `;
}

function svgFor([slug, group, title, detail]) {
    const accent = colorFor(slug);
    const secondary = slug.includes('feedback') || slug.includes('support-board') ? '#38bdf8' : '#5eead4';
    const safeTitle = escapeXml(title);
    const safeGroup = escapeXml(group);
    const safeDetail = escapeXml(detail);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#070714"/>
            <stop offset="0.48" stop-color="#0d0d22"/>
            <stop offset="1" stop-color="#101028"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="10%" r="72%">
            <stop offset="0" stop-color="${accent}" stop-opacity="0.32"/>
            <stop offset="0.45" stop-color="${secondary}" stop-opacity="0.12"/>
            <stop offset="1" stop-color="${secondary}" stop-opacity="0"/>
        </radialGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="28" stdDeviation="34" flood-color="#000000" flood-opacity="0.36"/>
        </filter>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
    <rect x="72" y="64" width="1296" height="1072" rx="52" fill="#09091a" stroke="rgba(255,255,255,0.10)" stroke-width="2" filter="url(#softShadow)"/>
    <rect x="92" y="88" width="1256" height="96" rx="32" fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
    <circle cx="142" cy="136" r="12" fill="#ff6b6b"/>
    <circle cx="182" cy="136" r="12" fill="#ffd166"/>
    <circle cx="222" cy="136" r="12" fill="#06d6a0"/>
    <rect x="1038" y="114" width="258" height="44" rx="22" fill="rgba(255,255,255,0.055)" stroke="rgba(255,255,255,0.10)" stroke-width="1"/>
    <text x="1064" y="143" fill="#d6d6ef" font-size="20" font-weight="700">Sample workspace</text>

    <rect x="112" y="218" width="256" height="858" rx="34" fill="#080818" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
    <rect x="150" y="258" width="72" height="72" rx="22" fill="${accent}"/>
    <text x="174" y="305" fill="#ffffff" font-size="34" font-weight="800">A</text>
    <text x="242" y="286" fill="#ffffff" font-size="24" font-weight="700">AnswerLattice</text>
    <text x="242" y="318" fill="#8f8faa" font-size="18">Workspace</text>
    ${['Activation', 'Surfaces', 'Widget', 'Feedback', 'Governance'].map((item, index) => {
        const y = 392 + index * 76;
        const active = title.toLowerCase().includes(item.toLowerCase().split(' ')[0]) || index === (slugSeed(slug) % 5);
        return `<rect x="144" y="${y}" width="180" height="46" rx="16" fill="${active ? 'rgba(94,234,212,0.13)' : 'rgba(255,255,255,0.035)'}" stroke="${active ? 'rgba(94,234,212,0.22)' : 'rgba(255,255,255,0.06)'}" stroke-width="1"/>
            <text x="164" y="${y + 30}" fill="${active ? '#ccfbf1' : '#8f8faa'}" font-size="18" font-weight="700">${item}</text>`;
    }).join('')}

    <text x="420" y="282" fill="#5eead4" font-size="22" font-weight="800" letter-spacing="4">${safeGroup.toUpperCase()}</text>
    <text x="420" y="340" fill="#ffffff" font-size="54" font-weight="800">${safeTitle}</text>
    <text x="420" y="386" fill="#a0a0c0" font-size="25">${safeDetail}</text>

    ${panel(420, 450, 452, 246, 'Support context', 'Route, workflow, role, and page hints', accent)}
    ${panel(904, 450, 344, 246, 'Widget result', 'Approved answer before fallback', secondary)}
    ${panel(420, 732, 384, 246, 'Review queue', 'Drafts stay owner-reviewed', '#f59e0b')}
    ${panel(836, 732, 412, 246, 'Runtime checks', 'Allowed origins and blocked routes', accent)}

    <rect x="420" y="1016" width="828" height="38" rx="19" fill="rgba(255,255,255,0.055)"/>
    <rect x="420" y="1016" width="${520 + (slugSeed(slug) % 220)}" height="38" rx="19" fill="${accent}" opacity="0.72"/>
    <text x="112" y="1120" fill="#6b6b8a" font-size="20">Dummy production asset slot - ${WIDTH} x ${HEIGHT}px - replace this PNG with approved capture</text>
</svg>`;
}

function generate() {
    ensureDir(PUBLIC_OUT_DIR);
    ensureDir(SOURCE_OUT_DIR);
    const manifest = ASSETS.map((asset) => {
        const [slug, group, title, detail] = asset;
        const svgPath = path.join(SOURCE_OUT_DIR, `${slug}.svg`);
        const pngPath = path.join(PUBLIC_OUT_DIR, `${slug}.png`);

        fs.writeFileSync(svgPath, svgFor(asset), 'utf8');
        execFileSync('sips', ['-s', 'format', 'png', svgPath, '--out', pngPath], { stdio: 'ignore' });

        return {
            file: `${slug}.png`,
            source: `${slug}.svg`,
            width: WIDTH,
            height: HEIGHT,
            group,
            title,
            detail,
        };
    });

    fs.writeFileSync(
        path.join(SOURCE_OUT_DIR, 'manifest.json'),
        `${JSON.stringify({ width: WIDTH, height: HEIGHT, assets: manifest }, null, 2)}\n`,
        'utf8'
    );

    console.log(`Generated ${manifest.length} AnswerLattice dummy website PNG assets in ${PUBLIC_OUT_DIR}`);
    console.log(`Wrote source SVGs and manifest in ${SOURCE_OUT_DIR}`);
}

generate();
