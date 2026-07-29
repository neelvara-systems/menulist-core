const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..', '..');
const WIDTH = 1440;
const HEIGHT = 1200;
const PUBLIC_OUT_DIR = path.join(ROOT, 'public', 'answerlattice-website-assets', 'dummy');
const SOURCE_OUT_DIR = path.join(
    ROOT,
    'packages',
    'asset-factory',
    'answerlattice-website-assets',
    'dummy-sources'
);

const COLORS = {
    bg0: '#050612',
    bg1: '#09091a',
    panel: '#101028',
    panel2: '#15152f',
    line: 'rgba(255,255,255,0.10)',
    lineSoft: 'rgba(255,255,255,0.065)',
    text: '#f8fafc',
    muted: '#a0a0c0',
    faint: '#6b6b8a',
    teal: '#5eead4',
    tealDark: '#0f766e',
    cyan: '#38bdf8',
    blue: '#60a5fa',
    amber: '#f59e0b',
    violet: '#8b5cf6',
    red: '#fb7185',
    green: '#34d399',
};

const ASSETS = [
    {
        slug: 'answerlattice-home-hero-workspace',
        group: 'Homepage hero workspace',
        title: 'Billing support workspace',
        subtitle: 'Approved answer, safe page context, and review queue in one governed support layer.',
        scene: 'workspace',
        accent: COLORS.teal,
        chips: ['Widget ready', 'Billing mapped', 'Review queue'],
        primary: 'Approved billing answer',
        secondary: 'Invoice page context',
        queueTitle: 'Owner review',
        flow: ['Source imported', 'Page mapped', 'Answer served', 'Fallback tracked'],
    },
    {
        slug: 'answerlattice-widget-runtime',
        group: 'Widget runtime',
        title: 'Billing page widget',
        subtitle: 'The widget uses safe page hints to serve reviewed support without exposing private data.',
        scene: 'widget',
        accent: COLORS.cyan,
        productArea: 'Billing / invoices',
        question: 'Why was I charged today?',
        answer: 'Use the approved billing answer and link the invoice help article.',
        chips: ['Allowed origin', 'Blocked private routes', 'Fallback ready'],
    },
    {
        slug: 'answerlattice-product-preview-activation',
        group: 'Product preview',
        title: 'Activation command center',
        subtitle: 'First setup connects sources, product pages, widget readiness, and review coverage.',
        scene: 'checklist',
        accent: COLORS.teal,
        chips: ['Sources selected', 'Pages mapped', 'Widget verified'],
        checklist: ['Workspace profile reviewed', 'Starter knowledge imported', 'Billing and onboarding mapped', 'Widget contract verified', 'Owner review lane ready'],
    },
    {
        slug: 'answerlattice-product-preview-surfaces',
        group: 'Product preview',
        title: 'Product surfaces',
        subtitle: 'Support coverage follows the pages where users actually ask for help.',
        scene: 'surfaces',
        accent: COLORS.blue,
        chips: ['Billing', 'Onboarding', 'Settings'],
        surfaces: ['Billing invoices', 'Onboarding import', 'Team roles', 'Usage limits', 'Slack integration', 'Import timeout'],
    },
    {
        slug: 'answerlattice-product-preview-widget',
        group: 'Product preview',
        title: 'Widget install',
        subtitle: 'One script, allowed origins, blocked routes, safe context, and runtime checks.',
        scene: 'install',
        accent: COLORS.cyan,
        chips: ['Script ready', 'Origin locked', 'Runtime pass'],
    },
    {
        slug: 'answerlattice-product-preview-feedback',
        group: 'Product preview',
        title: 'Feedback review',
        subtitle: 'Ratings, suggestions, and feature requests stay private until the owner turns them into support work.',
        scene: 'board',
        accent: COLORS.blue,
        chips: ['Private feedback', 'Board handoff', 'No auto-publish'],
        columns: ['Needs answer', 'Needs product note', 'Ready for review'],
    },
    {
        slug: 'answerlattice-product-preview-governance',
        group: 'Product preview',
        title: 'Answer review',
        subtitle: 'Drafts and repeated misses become governed review work before answers become official.',
        scene: 'governance',
        accent: COLORS.violet,
        chips: ['Approved first', 'Stale visible', 'Owner control'],
    },
    {
        slug: 'answerlattice-product-area-launch-setup',
        group: 'Product area',
        title: 'Set up support',
        subtitle: 'From starter sources to mapped product pages and widget readiness.',
        scene: 'checklist',
        accent: COLORS.teal,
        chips: ['Starter sources', 'Mapped pages', 'Launch-ready'],
        checklist: ['Create support workspace', 'Import product docs and FAQs', 'Map billing and onboarding screens', 'Review first approved answers', 'Verify widget before launch'],
    },
    {
        slug: 'answerlattice-product-area-widget',
        group: 'Product area',
        title: 'In-app help widget',
        subtitle: 'Safe context, approved answers, and fallback from the exact product page.',
        scene: 'widget',
        accent: COLORS.cyan,
        productArea: 'Onboarding / import',
        question: 'Why did import fail?',
        answer: 'Use reviewed import guidance. Open fallback when coverage is missing.',
        chips: ['Page aware', 'Safe hints', 'Fallback path'],
    },
    {
        slug: 'answerlattice-product-area-support-control',
        group: 'Product area',
        title: 'Help center and tickets',
        subtitle: 'Hosted help, FAQ, changelog, fallback tickets, and feedback share one support layer.',
        scene: 'help',
        accent: COLORS.teal,
        chips: ['Hosted help', 'FAQ', 'Ticket fallback'],
    },
    {
        slug: 'answerlattice-product-area-governance',
        group: 'Product area',
        title: 'Review approved answers',
        subtitle: 'Drafts, repeated misses, stale answers, and owner approval in one review lane.',
        scene: 'governance',
        accent: COLORS.violet,
        chips: ['Draft review', 'Source linked', 'Approved output'],
    },
    {
        slug: 'answerlattice-feature-team-access',
        group: 'Product feature',
        title: 'Team Access',
        subtitle: 'Workspace roles, passcodes, reset controls, and force sign-out.',
        scene: 'table',
        accent: COLORS.blue,
        chips: ['Owner', 'Manager', 'Support staff'],
        rows: ['Owner - full workspace control', 'Manager - widget and help setup', 'Support staff - tickets and review', 'Custom role - scoped permissions'],
    },
    {
        slug: 'answerlattice-feature-knowledge-intake',
        group: 'Product feature',
        title: 'Knowledge Intake',
        subtitle: 'Selected links, files, screenshots, recordings, and repeated replies become review drafts.',
        scene: 'intake',
        accent: COLORS.teal,
        chips: ['Selected sources', 'Media extracted', 'Drafts ready'],
    },
    {
        slug: 'answerlattice-feature-knowledge-base',
        group: 'Product feature',
        title: 'Knowledge Base',
        subtitle: 'Reviewed articles power hosted help, widget suggestions, FAQs, and approved answers.',
        scene: 'help',
        accent: COLORS.teal,
        chips: ['Articles', 'Source links', 'Hosted help'],
    },
    {
        slug: 'answerlattice-feature-faq-management',
        group: 'Product feature',
        title: 'FAQ Management',
        subtitle: 'Owner Q&A, article-backed FAQs, context assignment, and review state.',
        scene: 'faq',
        accent: COLORS.cyan,
        chips: ['Owner Q&A', 'Article-backed', 'Context mapped'],
    },
    {
        slug: 'answerlattice-feature-changelog',
        group: 'Product feature',
        title: 'Changelog',
        subtitle: 'Release notes connect to affected support answers and drift review.',
        scene: 'timeline',
        accent: COLORS.amber,
        chips: ['Release note', 'Affected answer', 'Drift review'],
    },
    {
        slug: 'answerlattice-feature-tickets',
        group: 'Product feature',
        title: 'Tickets',
        subtitle: 'Fallback capture keeps safe context and turns missing coverage into knowledge signals.',
        scene: 'tickets',
        accent: COLORS.blue,
        chips: ['Safe context', 'Fallback', 'Knowledge signal'],
    },
    {
        slug: 'answerlattice-feature-support-board',
        group: 'Product feature',
        title: 'Support Board',
        subtitle: 'Private owner/staff cards, internal notes, selected follow-up, and answer-proposal handoff.',
        scene: 'board',
        accent: COLORS.violet,
        chips: ['Private cards', 'Internal notes', 'Answer handoff'],
        columns: ['Open gap', 'Investigating', 'Ready for answer'],
    },
    {
        slug: 'answerlattice-feature-feedback-review',
        group: 'Product feature',
        title: 'Feedback Review',
        subtitle: 'Ratings, suggestions, and feature requests become private support review signals.',
        scene: 'board',
        accent: COLORS.blue,
        chips: ['Ratings', 'Suggestions', 'Board handoff'],
        columns: ['Rating', 'Suggestion', 'Feature request'],
    },
    {
        slug: 'answerlattice-feature-workflow-notifications',
        group: 'Product feature',
        title: 'Workflow Notifications',
        subtitle: 'Slack and email governance alerts with filters, test delivery, and compact health.',
        scene: 'notifications',
        accent: COLORS.green,
        chips: ['Slack', 'Email', 'Digest-first'],
    },
    {
        slug: 'answerlattice-feature-proactive-help',
        group: 'Product feature',
        title: 'Proactive Help',
        subtitle: 'Configured prompts tied to active triggers and approved support summaries.',
        scene: 'proactive',
        accent: COLORS.cyan,
        chips: ['Configured prompt', 'Active trigger', 'Approved summary'],
    },
    {
        slug: 'answerlattice-demo-surface-billing',
        group: 'Page-aware demo',
        title: 'Billing page',
        subtitle: 'Invoice question gets billing-specific approved guidance.',
        scene: 'demo',
        accent: COLORS.teal,
        productArea: 'Billing / invoices',
        question: 'Why was I charged today?',
        answer: 'The approved billing answer explains renewal timing and links invoice help.',
        chips: ['Billing context', 'Approved answer', 'Fallback hidden'],
    },
    {
        slug: 'answerlattice-demo-surface-onboarding',
        group: 'Page-aware demo',
        title: 'Onboarding page',
        subtitle: 'Setup question gets starter-source guidance.',
        scene: 'demo',
        accent: COLORS.cyan,
        productArea: 'Onboarding / import',
        question: 'What is the next setup step?',
        answer: 'The onboarding answer points to source import and widget verification.',
        chips: ['Setup context', 'Guide linked', 'Owner reviewed'],
    },
    {
        slug: 'answerlattice-demo-surface-settings',
        group: 'Page-aware demo',
        title: 'Team settings page',
        subtitle: 'Permission question becomes scoped support review.',
        scene: 'demo',
        accent: COLORS.blue,
        productArea: 'Team settings / roles',
        question: 'Can support users edit billing?',
        answer: 'The role answer separates support controls from billing authority.',
        chips: ['Role context', 'Scoped answer', 'Safe fallback'],
    },
    {
        slug: 'answerlattice-demo-surface-release',
        group: 'Page-aware demo',
        title: 'Release page',
        subtitle: 'Usage-limit release triggers stale-answer review.',
        scene: 'demo',
        accent: COLORS.amber,
        productArea: 'Releases / usage limits',
        question: 'What changed in this plan limit?',
        answer: 'The release note links to the affected approved answer and drift review.',
        chips: ['Release context', 'Affected answer', 'Drift visible'],
    },
    {
        slug: 'answerlattice-owner-decision-system',
        group: 'Owner decision system',
        title: 'What deserves review today',
        subtitle: 'A bounded brief sends the owner to the exact answer, release, or map context that needs a decision.',
        scene: 'owner-decision',
        accent: COLORS.teal,
        chips: ['Read-only brief', 'Qualified evidence', 'Owner decides'],
        format: 'webp',
        publicRoot: true,
    },
    {
        slug: 'answerlattice-knowledge-map',
        group: 'Knowledge Map',
        title: 'Product truth, organized for review',
        subtitle: 'A curated product hierarchy shows answer coverage, drift, and review state without exposing the raw graph.',
        scene: 'knowledge-map',
        accent: COLORS.violet,
        chips: ['Curated hierarchy', 'Coverage visible', 'Drift review'],
        format: 'webp',
        publicRoot: true,
    },
    {
        slug: 'answerlattice-release-assurance',
        group: 'Release assurance',
        title: 'Check support before activation',
        subtitle: 'Release impact and Answer Tests expose affected approved answers, stale guidance, and safe abstention paths.',
        scene: 'release-assurance',
        accent: COLORS.amber,
        chips: ['Linked answers', 'Answer Tests', 'Owner confirmation'],
        format: 'webp',
        publicRoot: true,
    },
    {
        slug: 'answerlattice-article-topic-map',
        group: 'Hosted help',
        title: 'Understand a guide at a glance',
        subtitle: 'Published article headings become an accessible topic path with approved summaries and related guides.',
        scene: 'topic-map',
        accent: COLORS.cyan,
        chips: ['Published headings', 'Mobile drill-down', 'Public only'],
        format: 'webp',
        publicRoot: true,
    },
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

function text(x, y, value, size = 22, fill = COLORS.text, weight = 600, extra = '') {
    return `<text x="${x}" y="${y}" fill="${fill}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" font-size="${size}" font-weight="${weight}" ${extra}>${escapeXml(value)}</text>`;
}

function monoText(x, y, value, size = 20, fill = COLORS.text, weight = 650, extra = '') {
    return `<text x="${x}" y="${y}" fill="${fill}" font-family="SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="${size}" font-weight="${weight}" ${extra}>${escapeXml(value)}</text>`;
}

function alpha(hex, opacity) {
    const value = hex.replace('#', '');
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${opacity})`;
}

function wrapText(value, maxChars, maxLines = 3) {
    const words = String(value).split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (next.length > maxChars && line) {
            lines.push(line);
            line = word;
        } else {
            line = next;
        }
    }
    if (line) lines.push(line);
    return lines.slice(0, maxLines);
}

function paragraph(x, y, value, maxChars, size = 22, fill = COLORS.muted, maxLines = 3, lineHeight = 32) {
    return wrapText(value, maxChars, maxLines)
        .map((line, index) => text(x, y + index * lineHeight, line, size, fill, 500))
        .join('');
}

function rect(x, y, width, height, rx, fill, stroke = COLORS.lineSoft, extra = '') {
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" ${extra}/>`;
}

function chip(x, y, label, accent = COLORS.teal) {
    return `${rect(x, y, Math.max(116, label.length * 10 + 34), 38, 19, alpha(accent, 0.12), alpha(accent, 0.34))}
        ${text(x + 17, y + 25, label, 16, '#dffdf8', 700)}`;
}

function progress(x, y, width, value, accent) {
    return `${rect(x, y, width, 14, 7, 'rgba(255,255,255,0.075)', 'transparent')}
        <rect x="${x}" y="${y}" width="${Math.round(width * value)}" height="14" rx="7" fill="${accent}" opacity="0.9"/>`;
}

function statusDot(x, y, fill) {
    return `<circle cx="${x}" cy="${y}" r="7" fill="${fill}"/>`;
}

function browserShell(asset, body) {
    let chipX = 420;
    const chipRow = (asset.chips || []).map((item) => {
        const currentX = chipX;
        chipX += Math.max(116, item.length * 10 + 34) + 12;
        return chip(currentX, 430, item, asset.accent);
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs>
        <linearGradient id="pageBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#07111d"/>
            <stop offset="0.45" stop-color="#070714"/>
            <stop offset="1" stop-color="#141031"/>
        </linearGradient>
        <radialGradient id="assetGlow" cx="54%" cy="8%" r="76%">
            <stop offset="0" stop-color="${asset.accent}" stop-opacity="0.30"/>
            <stop offset="0.44" stop-color="${asset.accent}" stop-opacity="0.08"/>
            <stop offset="1" stop-color="${asset.accent}" stop-opacity="0"/>
        </radialGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="30" stdDeviation="38" flood-color="#000000" flood-opacity="0.42"/>
        </filter>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#pageBg)"/>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#assetGlow)"/>
    <rect x="72" y="62" width="1296" height="1076" rx="52" fill="${COLORS.bg1}" stroke="rgba(255,255,255,0.12)" stroke-width="2" filter="url(#softShadow)"/>
    ${topBar(asset)}
    ${sidebar(asset)}
    ${text(420, 286, asset.group.toUpperCase(), 18, asset.accent, 800, 'letter-spacing="4"')}
    ${text(420, 344, asset.title, 50, COLORS.text, 800)}
    ${paragraph(420, 386, asset.subtitle, 76, 22, COLORS.muted, 2, 32)}
    ${chipRow}
    ${body}
</svg>`;
}

function topBar() {
    return `${rect(92, 88, 1256, 96, 30, 'rgba(255,255,255,0.035)', COLORS.lineSoft)}
        <circle cx="142" cy="136" r="12" fill="#ff6b6b"/>
        <circle cx="182" cy="136" r="12" fill="#ffd166"/>
        <circle cx="222" cy="136" r="12" fill="#06d6a0"/>
        ${rect(1014, 112, 286, 48, 24, 'rgba(255,255,255,0.055)', COLORS.line)}
        ${text(1044, 143, 'Sample SaaS workspace', 18, '#d6d6ef', 700)}`;
}

function sidebar(asset) {
    const nav = ['Setup', 'Sources', 'Surfaces', 'Widget', 'Review', 'Help'];
    const activeIndex = Math.abs(asset.slug.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % nav.length;
    return `${rect(112, 218, 256, 858, 34, '#080818', COLORS.lineSoft)}
        <rect x="150" y="258" width="72" height="72" rx="22" fill="${asset.accent}"/>
        ${text(174, 306, 'A', 34, '#ffffff', 800)}
        ${text(242, 286, 'AnswerLattice', 22, COLORS.text, 800)}
        ${text(242, 318, 'Support truth', 17, COLORS.muted, 600)}
        ${nav.map((item, index) => {
            const y = 390 + index * 72;
            const active = index === activeIndex;
            return `${rect(144, y, 180, 46, 16, active ? alpha(asset.accent, 0.14) : 'rgba(255,255,255,0.035)', active ? alpha(asset.accent, 0.4) : COLORS.lineSoft)}
                ${text(164, y + 30, item, 17, active ? '#dffdf8' : COLORS.muted, 750)}`;
        }).join('')}`;
}

function card(x, y, width, height, title, body, accent, footer) {
    return `${rect(x, y, width, height, 28, COLORS.panel, COLORS.line)}
        <rect x="${x + 28}" y="${y + 28}" width="82" height="10" rx="5" fill="${accent}" opacity="0.9"/>
        ${text(x + 28, y + 76, title, 28, COLORS.text, 800)}
        ${paragraph(x + 28, y + 116, body, Math.floor(width / 14), 20, COLORS.muted, 2, 28)}
        ${footer || `${progress(x + 28, y + height - 70, width - 56, 0.72, accent)}${progress(x + 28, y + height - 40, Math.floor((width - 56) * 0.72), 0.64, 'rgba(255,255,255,0.18)')}`}`;
}

function renderWorkspace(asset) {
    const flow = asset.flow || ['Source', 'Context', 'Answer', 'Review'];
    return browserShell(asset, `
        ${card(420, 470, 418, 244, asset.secondary || 'Product context', 'Route, workflow, role, and product-page hints stay bounded.', asset.accent)}
        ${card(870, 470, 378, 244, asset.primary || 'Approved answer', 'Reviewed guidance appears before ticket fallback.', COLORS.teal)}
        ${card(420, 748, 378, 244, asset.queueTitle || 'Review queue', 'Misses, low ratings, and stale guidance become owner review work.', COLORS.amber)}
        ${card(830, 748, 418, 244, 'Runtime boundary', 'Allowed origins, blocked routes, and safe context keep support controlled.', COLORS.cyan)}
        <g>
            ${flow.map((item, index) => {
                const x = 420 + index * 206;
                return `${rect(x, 1024, 168, 46, 18, index === 2 ? alpha(asset.accent, 0.15) : 'rgba(255,255,255,0.045)', index === 2 ? alpha(asset.accent, 0.47) : COLORS.lineSoft)}
                    ${text(x + 18, 1054, item, 16, index === 2 ? '#dffdf8' : COLORS.muted, 750)}
                    ${index < flow.length - 1 ? `<path d="M${x + 176} 1047 H${x + 198}" stroke="${asset.accent}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>` : ''}`;
            }).join('')}
        </g>`);
}

function renderWidget(asset) {
    return browserShell(asset, `
        ${rect(420, 468, 500, 510, 30, COLORS.panel, COLORS.line)}
        ${text(452, 520, asset.productArea || 'Product page', 24, COLORS.text, 800)}
        ${paragraph(452, 558, 'Sample product page with only safe route and workflow hints passed to the support layer.', 42, 18, COLORS.muted, 2, 26)}
        ${['Invoice history', 'Plan renewal', 'Payment method', 'Team access'].map((row, index) => {
            const y = 630 + index * 62;
            return `${rect(452, y, 408, 42, 14, 'rgba(255,255,255,0.035)', COLORS.lineSoft)}
                ${text(476, y + 27, row, 17, index === 1 ? '#dffdf8' : COLORS.muted, 700)}
                ${statusDot(832, y + 21, index === 1 ? asset.accent : 'rgba(255,255,255,0.2)')}`;
        }).join('')}
        ${rect(944, 468, 304, 510, 30, '#0f1027', COLORS.line)}
        ${text(976, 520, 'AnswerLattice', 24, COLORS.text, 800)}
        ${text(976, 552, 'Page-aware help', 17, COLORS.muted, 650)}
        ${rect(976, 610, 206, 58, 20, 'rgba(255,255,255,0.06)', COLORS.lineSoft)}
        ${paragraph(998, 635, asset.question || 'Question from user', 22, 16, COLORS.text, 2, 22)}
        ${rect(976, 704, 238, 142, 22, alpha(asset.accent, 0.1), alpha(asset.accent, 0.4))}
        ${text(998, 740, 'Approved answer', 18, '#dffdf8', 800)}
        ${paragraph(998, 772, asset.answer || 'Reviewed support answer appears here.', 28, 15, '#c9fff6', 3, 22)}
        ${rect(976, 884, 206, 42, 16, 'rgba(255,255,255,0.055)', COLORS.lineSoft)}
        ${text(998, 912, 'Open fallback if missing', 15, COLORS.muted, 700)}`);
}

function renderChecklist(asset) {
    const list = asset.checklist || ['Sources selected', 'Pages mapped', 'Answers reviewed', 'Widget verified'];
    return browserShell(asset, `
        ${rect(420, 470, 828, 512, 32, COLORS.panel, COLORS.line)}
        ${text(458, 530, 'Launch readiness path', 30, COLORS.text, 800)}
        ${paragraph(458, 570, 'A compact setup surface shows what is ready before the widget touches users.', 66, 20, COLORS.muted, 2, 28)}
        ${list.map((item, index) => {
            const y = 646 + index * 66;
            return `${rect(458, y, 714, 48, 18, index < 3 ? alpha(asset.accent, 0.07) : 'rgba(255,255,255,0.04)', index < 3 ? alpha(asset.accent, 0.34) : COLORS.lineSoft)}
                <circle cx="486" cy="${y + 24}" r="12" fill="${index < 3 ? asset.accent : 'rgba(255,255,255,0.16)'}"/>
                ${index < 3 ? `<path d="M480 ${y + 24} l5 5 l10 -13" stroke="#06201d" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
                ${text(516, y + 31, item, 18, index < 3 ? '#e8fffb' : COLORS.muted, 720)}
                ${text(1088, y + 31, index < 3 ? 'Ready' : 'Review', 15, index < 3 ? COLORS.teal : COLORS.amber, 800)}`;
        }).join('')}
        ${progress(458, 928, 714, 0.68, asset.accent)}`);
}

function renderSurfaces(asset) {
    const surfaces = asset.surfaces || ['Billing', 'Onboarding', 'Settings', 'Releases', 'Integrations', 'Errors'];
    return browserShell(asset, `
        <g>
            ${surfaces.map((item, index) => {
                const col = index % 3;
                const row = Math.floor(index / 3);
                const x = 420 + col * 276;
                const y = 474 + row * 250;
                return `${card(x, y, 244, 206, item, 'Coverage, approved answer, and fallback status are visible.', index % 2 ? COLORS.cyan : asset.accent, `${progress(x + 28, y + 150, 188, index < 4 ? 0.86 : 0.54, index < 4 ? asset.accent : COLORS.amber)}${text(x + 28, y + 184, index < 4 ? 'Covered' : 'Needs review', 15, index < 4 ? COLORS.teal : COLORS.amber, 800)}`)}`;
            }).join('')}
        </g>
        ${rect(420, 1006, 796, 48, 18, 'rgba(255,255,255,0.04)', COLORS.lineSoft)}
        ${text(448, 1037, 'Surface coverage keeps support tied to product pages instead of generic docs.', 18, COLORS.muted, 650)}`);
}

function renderInstall(asset) {
    return browserShell(asset, `
        ${rect(420, 468, 500, 512, 30, '#070816', COLORS.line)}
        ${text(452, 520, 'Install packet', 26, COLORS.text, 800)}
        ${['<script src=\"/widget.js\">', 'workspace: sample-saas', 'origin: app.example.com', 'blocked: /settings/billing/card', 'context: page + workflow'].map((line, index) => monoText(452, 590 + index * 52, line, 20, index === 0 ? COLORS.teal : '#cbd5e1')).join('')}
        ${rect(954, 468, 294, 512, 30, COLORS.panel, COLORS.line)}
        ${text(986, 520, 'Verification', 26, COLORS.text, 800)}
        ${['Script loaded', 'Origin allowed', 'Route blocked', 'Context safe', 'Fallback ready'].map((item, index) => {
            const y = 594 + index * 70;
            return `${statusDot(1000, y, index < 4 ? asset.accent : COLORS.amber)}
                ${text(1024, y + 6, item, 18, COLORS.text, 720)}
                ${text(1024, y + 31, index < 4 ? 'Passed' : 'Ready when needed', 14, COLORS.muted, 650)}`;
        }).join('')}`);
}

function renderBoard(asset) {
    const columns = asset.columns || ['New', 'Reviewing', 'Ready'];
    return browserShell(asset, `
        ${columns.map((column, index) => {
            const x = 420 + index * 278;
            return `${rect(x, 470, 246, 510, 28, COLORS.panel, COLORS.line)}
                ${text(x + 24, 522, column, 23, COLORS.text, 800)}
                ${[0, 1, 2].map((_, cardIndex) => {
                    const y = 560 + cardIndex * 124;
                    return `${rect(x + 24, y, 198, 94, 20, 'rgba(255,255,255,0.045)', COLORS.lineSoft)}
                        ${text(x + 44, y + 34, cardIndex === 0 ? 'Support gap' : cardIndex === 1 ? 'Owner note' : 'Answer draft', 16, COLORS.text, 760)}
                        ${progress(x + 44, y + 58, 134, 0.45 + cardIndex * 0.16, cardIndex === 2 ? asset.accent : 'rgba(255,255,255,0.24)')}`;
                }).join('')}`;
        }).join('')}
        ${rect(420, 1016, 802, 42, 18, alpha(asset.accent, 0.1), alpha(asset.accent, 0.34))}
        ${text(448, 1044, 'Signals stay private until the owner decides what becomes official support.', 17, '#dffdf8', 700)}`);
}

function renderGovernance(asset) {
    return browserShell(asset, `
        ${rect(420, 468, 532, 512, 30, COLORS.panel, COLORS.line)}
        ${text(452, 524, 'Canonical answer draft', 27, COLORS.text, 800)}
        ${paragraph(452, 566, 'Users asking about billing roles should receive this reviewed answer before fallback.', 48, 19, COLORS.muted, 2, 27)}
        ${rect(452, 648, 444, 168, 24, 'rgba(255,255,255,0.045)', COLORS.lineSoft)}
        ${text(482, 696, 'Source links', 18, COLORS.teal, 800)}
        ${text(482, 734, 'Billing roles article', 18, COLORS.text, 700)}
        ${text(482, 768, 'Team permissions FAQ', 18, COLORS.text, 700)}
        ${rect(452, 854, 168, 52, 20, alpha(asset.accent, 0.15), alpha(asset.accent, 0.4))}
        ${text(486, 888, 'Approve', 18, '#dffdf8', 800)}
        ${rect(644, 854, 168, 52, 20, 'rgba(255,255,255,0.05)', COLORS.lineSoft)}
        ${text(685, 888, 'Edit draft', 18, COLORS.muted, 800)}
        ${rect(984, 468, 264, 512, 30, COLORS.panel, COLORS.line)}
        ${text(1016, 524, 'Review lane', 25, COLORS.text, 800)}
        ${['Version mismatch', 'Repeated miss', 'Low-rated answer', 'Ready to approve'].map((item, index) => {
            const y = 596 + index * 82;
            return `${statusDot(1018, y, index === 3 ? asset.accent : COLORS.amber)}
                ${text(1042, y + 6, item, 17, COLORS.text, 700)}
                ${text(1042, y + 30, index === 3 ? 'Owner action' : 'Needs review', 14, COLORS.muted, 650)}`;
        }).join('')}`);
}

function renderHelp(asset) {
    return browserShell(asset, `
        ${rect(420, 468, 512, 512, 30, COLORS.panel, COLORS.line)}
        ${text(452, 524, 'Hosted help', 28, COLORS.text, 800)}
        ${['Getting started', 'Billing and plans', 'Team settings', 'Release notes'].map((item, index) => {
            const y = 586 + index * 78;
            return `${rect(452, y, 420, 54, 18, 'rgba(255,255,255,0.045)', COLORS.lineSoft)}
                ${text(478, y + 34, item, 18, COLORS.text, 720)}
                ${text(800, y + 34, index === 1 ? 'FAQ' : 'Article', 14, asset.accent, 800)}`;
        }).join('')}
        ${rect(964, 468, 284, 512, 30, COLORS.panel, COLORS.line)}
        ${text(996, 524, 'Fallback tickets', 25, COLORS.text, 800)}
        ${paragraph(996, 566, 'Missing answers create a path without becoming the center of the product.', 28, 17, COLORS.muted, 3, 25)}
        ${['New gap', 'Safe context', 'Owner review'].map((item, index) => {
            const y = 690 + index * 82;
            return `${statusDot(1012, y, index === 2 ? asset.accent : COLORS.amber)}${text(1038, y + 6, item, 17, COLORS.text, 720)}`;
        }).join('')}`);
}

function renderIntake(asset) {
    return browserShell(asset, `
        ${card(420, 470, 250, 210, 'Links', 'Selected product and docs URLs.', asset.accent)}
        ${card(700, 470, 250, 210, 'Files', 'Markdown, docs, PDFs, and CSVs.', COLORS.cyan)}
        ${card(980, 470, 250, 210, 'Media', 'Screenshots and short recordings.', COLORS.violet)}
        ${rect(420, 730, 810, 250, 30, COLORS.panel, COLORS.line)}
        ${text(458, 786, 'Review drafts', 28, COLORS.text, 800)}
        ${['FAQ proposal: billing roles', 'Article draft: import troubleshooting', 'Surface map: onboarding checklist'].map((item, index) => {
            const y = 842 + index * 52;
            return `${statusDot(462, y, index === 0 ? asset.accent : COLORS.amber)}${text(486, y + 6, item, 18, COLORS.text, 700)}`;
        }).join('')}`);
}

function renderFaq(asset) {
    return browserShell(asset, `
        ${['Can support users edit billing?', 'Why did import fail?', 'Where do invoices live?', 'What changed in usage limits?'].map((question, index) => {
            const x = 420 + (index % 2) * 414;
            const y = 470 + Math.floor(index / 2) * 246;
            return `${card(x, y, 382, 204, question, 'Answer is source-linked, context-assigned, and owner-reviewed.', index % 2 ? COLORS.cyan : asset.accent)}`;
        }).join('')}
        ${rect(420, 1006, 796, 46, 18, alpha(asset.accent, 0.1), alpha(asset.accent, 0.34))}
        ${text(448, 1036, 'FAQ answers can publish to hosted help and appear before fallback.', 18, '#dffdf8', 700)}`);
}

function renderTimeline(asset) {
    return browserShell(asset, `
        ${rect(420, 470, 828, 510, 30, COLORS.panel, COLORS.line)}
        ${[0, 1, 2, 3].map((_, index) => {
            const y = 560 + index * 92;
            const labels = ['Usage limit changed', 'Billing role updated', 'Import timeout fixed', 'Widget copy refreshed'];
            return `<path d="M486 ${y} V${y + 70}" stroke="${index < 3 ? COLORS.line : 'transparent'}" stroke-width="2"/>
                ${statusDot(486, y, index === 0 ? asset.accent : COLORS.amber)}
                ${text(520, y + 7, labels[index], 20, COLORS.text, 760)}
                ${text(520, y + 36, index === 0 ? 'Affected answer review open' : 'Support note linked', 16, COLORS.muted, 650)}`;
        }).join('')}`);
}

function renderTickets(asset) {
    return browserShell(asset, `
        ${rect(420, 470, 484, 512, 30, COLORS.panel, COLORS.line)}
        ${text(452, 524, 'Fallback ticket', 28, COLORS.text, 800)}
        ${paragraph(452, 566, 'A missing answer captures the user question, safe page context, and support gap without pretending the answer is known.', 48, 19, COLORS.muted, 3, 27)}
        ${['Question', 'Safe route context', 'Debug note', 'Review status'].map((item, index) => {
            const y = 690 + index * 66;
            return `${rect(452, y, 380, 44, 16, 'rgba(255,255,255,0.045)', COLORS.lineSoft)}${text(476, y + 29, item, 17, COLORS.text, 720)}`;
        }).join('')}
        ${rect(936, 470, 312, 512, 30, COLORS.panel, COLORS.line)}
        ${text(968, 524, 'Knowledge signal', 25, COLORS.text, 800)}
        ${progress(968, 594, 224, 0.62, asset.accent)}
        ${paragraph(968, 650, 'Repeated tickets can become an answer proposal for owner review.', 28, 17, COLORS.muted, 3, 25)}`);
}

function renderNotifications(asset) {
    return browserShell(asset, `
        ${['Slack digest', 'Email alert', 'Send test', 'Delivery health'].map((item, index) => {
            const x = 420 + (index % 2) * 414;
            const y = 470 + Math.floor(index / 2) * 246;
            return `${card(x, y, 382, 204, item, index === 0 ? 'Grouped support review instead of noisy pings.' : 'Bounded workflow notification with filters.', index % 2 ? COLORS.green : asset.accent)}`;
        }).join('')}`);
}

function renderProactive(asset) {
    return browserShell(asset, `
        ${rect(420, 470, 500, 512, 30, COLORS.panel, COLORS.line)}
        ${text(452, 524, 'Configured trigger', 28, COLORS.text, 800)}
        ${['Onboarding checklist open', 'Import failed twice', 'Billing page viewed', 'Release note affected'].map((item, index) => {
            const y = 596 + index * 72;
            return `${statusDot(462, y, index === 1 ? asset.accent : 'rgba(255,255,255,0.22)')}${text(486, y + 6, item, 18, COLORS.text, 720)}`;
        }).join('')}
        ${rect(954, 470, 294, 512, 30, COLORS.panel, COLORS.line)}
        ${text(986, 524, 'Prompt shown', 25, COLORS.text, 800)}
        ${paragraph(986, 572, 'Need help finishing your import? Here is the reviewed setup answer.', 28, 18, '#dffdf8', 4, 27)}`);
}

function renderOwnerDecision(asset) {
    const decisions = [
        ['Review billing role answer', 'Open answer review', COLORS.amber],
        ['Check release impact', 'Open linked answers + tests', COLORS.red],
        ['Approve import guidance', 'Open owner decision', COLORS.teal],
        ['No other qualified work', 'Quiet state', COLORS.green],
    ];
    return browserShell(asset, `
        ${rect(420, 470, 494, 512, 30, COLORS.panel, COLORS.line)}
        ${text(454, 522, 'Daily Brief', 27, COLORS.text, 800)}
        ${text(454, 554, 'Up to four qualified decisions', 16, COLORS.muted, 650)}
        ${decisions.map(([title, route, color], index) => {
            const y = 594 + index * 88;
            return `${rect(452, y, 430, 68, 18, index === 0 ? alpha(color, 0.08) : 'rgba(255,255,255,0.035)', index === 0 ? alpha(color, 0.36) : COLORS.lineSoft)}
                ${statusDot(474, y + 24, color)}
                ${text(496, y + 29, title, 17, COLORS.text, 760)}
                ${text(496, y + 52, route, 14, COLORS.muted, 650)}`;
        }).join('')}
        ${rect(944, 470, 304, 512, 30, COLORS.panel, COLORS.line)}
        ${text(976, 522, 'Decision context', 25, COLORS.text, 800)}
        ${text(976, 565, 'Billing', 18, asset.accent, 800)}
        ${text(976, 598, 'Roles and permissions', 19, COLORS.text, 760)}
        ${paragraph(976, 638, 'The selected brief item keeps its product area, answer, evidence, and next route attached.', 28, 17, COLORS.muted, 4, 25)}
        ${rect(976, 768, 238, 58, 18, alpha(asset.accent, 0.11), alpha(asset.accent, 0.38))}
        ${text(998, 804, 'Open answer review', 17, '#dffdf8', 800)}
        ${rect(976, 848, 238, 58, 18, 'rgba(255,255,255,0.045)', COLORS.lineSoft)}
        ${text(998, 884, 'View in Knowledge Map', 16, COLORS.muted, 760)}
        ${text(420, 1030, 'Brief item', 16, COLORS.muted, 700)}
        <path d="M510 1024 H738" stroke="${asset.accent}" stroke-width="2" stroke-linecap="round"/>
        ${text(766, 1030, 'Evidence', 16, COLORS.muted, 700)}
        <path d="M842 1024 H1018" stroke="${asset.accent}" stroke-width="2" stroke-linecap="round"/>
        ${text(1044, 1030, 'Owner decision', 16, '#dffdf8', 800)}`);
}

function renderKnowledgeMap(asset) {
    const nodes = [
        { x: 446, y: 570, width: 140, label: 'Sample SaaS', color: asset.accent, active: true },
        { x: 642, y: 506, width: 150, label: 'Billing', color: COLORS.amber, active: true },
        { x: 642, y: 582, width: 150, label: 'Onboarding', color: COLORS.green },
        { x: 642, y: 658, width: 150, label: 'Team', color: COLORS.cyan },
        { x: 642, y: 734, width: 150, label: 'Integrations', color: COLORS.blue },
        { x: 838, y: 488, width: 176, label: 'Payment roles', color: COLORS.amber, active: true },
        { x: 838, y: 564, width: 176, label: 'Plan changes', color: COLORS.green },
        { x: 838, y: 640, width: 176, label: 'Invoices', color: COLORS.teal },
    ];
    return browserShell(asset, `
        ${rect(420, 470, 622, 512, 30, COLORS.panel, COLORS.line)}
        <path d="M586 598 C618 598 610 534 642 534 M586 598 C618 598 610 610 642 610 M586 598 C618 598 610 686 642 686 M586 598 C618 598 610 762 642 762" stroke="${alpha(asset.accent, 0.55)}" stroke-width="2" fill="none"/>
        <path d="M792 534 C816 534 814 516 838 516 M792 534 C816 534 814 592 838 592 M792 534 C816 534 814 668 838 668" stroke="${alpha(COLORS.amber, 0.55)}" stroke-width="2" fill="none"/>
        ${nodes.map((node) => `${rect(node.x, node.y, node.width, 56, 17, node.active ? alpha(node.color, 0.14) : 'rgba(255,255,255,0.04)', node.active ? alpha(node.color, 0.48) : COLORS.lineSoft)}
            ${text(node.x + 18, node.y + 35, node.label, 16, node.active ? '#f5fffd' : COLORS.muted, node.active ? 800 : 700)}`).join('')}
        ${rect(444, 862, 574, 88, 20, 'rgba(255,255,255,0.035)', COLORS.lineSoft)}
        ${statusDot(470, 892, COLORS.green)}${text(490, 898, 'Covered', 15, COLORS.muted, 700)}
        ${statusDot(604, 892, COLORS.amber)}${text(624, 898, 'Needs review', 15, COLORS.muted, 700)}
        ${statusDot(790, 892, COLORS.red)}${text(810, 898, 'Drift', 15, COLORS.muted, 700)}
        ${text(470, 928, 'Primary hierarchy only. Related context appears after selection.', 15, COLORS.faint, 650)}
        ${rect(1072, 470, 176, 512, 30, COLORS.panel, COLORS.line)}
        ${text(1098, 522, 'Selected', 16, COLORS.muted, 750)}
        ${paragraph(1098, 566, 'Payment roles', 15, 21, COLORS.text, 2, 27)}
        ${text(1098, 646, 'Coverage', 14, COLORS.faint, 750)}
        ${text(1098, 674, 'Approved', 16, COLORS.green, 800)}
        ${text(1098, 726, 'Freshness', 14, COLORS.faint, 750)}
        ${text(1098, 754, 'Review due', 16, COLORS.amber, 800)}
        ${text(1098, 806, 'Opened from', 14, COLORS.faint, 750)}
        ${paragraph(1098, 834, 'Friction evidence', 15, 15, COLORS.muted, 2, 22)}
        ${text(420, 1032, 'Structure', 16, COLORS.muted, 700)}
        ${text(612, 1032, 'Coverage', 16, COLORS.muted, 700)}
        ${text(802, 1032, 'Freshness', 16, COLORS.muted, 700)}
        ${text(1010, 1032, 'Owner review', 16, '#dffdf8', 800)}`);
}

function renderReleaseAssurance(asset) {
    const testRows = [
        ['Billing role source', 'Passed', COLORS.green],
        ['API key location', 'Needs review', COLORS.amber],
        ['Unsupported claim', 'Safe abstention', COLORS.cyan],
    ];
    return browserShell(asset, `
        ${rect(420, 470, 394, 512, 30, COLORS.panel, COLORS.line)}
        ${text(452, 522, 'Release impact', 26, COLORS.text, 800)}
        ${text(452, 562, 'API keys moved', 20, asset.accent, 800)}
        ${text(452, 592, 'to Developer Settings', 20, COLORS.text, 760)}
        ${paragraph(452, 638, 'Directly linked approved answers and tests are inspected before activation.', 34, 17, COLORS.muted, 3, 25)}
        ${['API key location answer', 'Setup article guidance', 'Developer settings FAQ'].map((item, index) => {
            const y = 752 + index * 62;
            const stale = index === 0;
            return `${rect(450, y, 334, 46, 15, stale ? alpha(COLORS.amber, 0.08) : 'rgba(255,255,255,0.035)', stale ? alpha(COLORS.amber, 0.4) : COLORS.lineSoft)}
                ${statusDot(470, y + 23, stale ? COLORS.amber : COLORS.green)}
                ${text(490, y + 29, item, 15, COLORS.text, 700)}`;
        }).join('')}
        ${rect(844, 470, 404, 512, 30, COLORS.panel, COLORS.line)}
        ${text(876, 522, 'Answer Tests', 26, COLORS.text, 800)}
        ${testRows.map(([label, result, color], index) => {
            const y = 584 + index * 100;
            return `${rect(874, y, 344, 78, 18, 'rgba(255,255,255,0.035)', COLORS.lineSoft)}
                ${text(898, y + 31, label, 16, COLORS.text, 740)}
                ${statusDot(900, y + 55, color)}
                ${text(920, y + 61, result, 15, color, 800)}`;
        }).join('')}
        ${rect(874, 898, 344, 54, 18, alpha(asset.accent, 0.11), alpha(asset.accent, 0.4))}
        ${text(902, 932, 'Owner confirms activation', 17, '#fff7df', 800)}
        ${text(420, 1030, 'Release change', 16, COLORS.muted, 700)}
        <path d="M548 1024 H714" stroke="${asset.accent}" stroke-width="2" stroke-linecap="round"/>
        ${text(738, 1030, 'Affected truth', 16, COLORS.muted, 700)}
        <path d="M860 1024 H1010" stroke="${asset.accent}" stroke-width="2" stroke-linecap="round"/>
        ${text(1036, 1030, 'Test + review', 16, '#fff7df', 800)}`);
}

function renderTopicMap(asset) {
    const topics = [
        { x: 652, y: 500, width: 188, label: 'Requirements', color: COLORS.teal },
        { x: 652, y: 580, width: 188, label: 'Connect Slack', color: COLORS.cyan, active: true },
        { x: 652, y: 660, width: 188, label: 'Authorize access', color: COLORS.blue },
        { x: 652, y: 740, width: 188, label: 'Troubleshoot', color: COLORS.amber },
    ];
    return browserShell(asset, `
        ${rect(420, 470, 450, 512, 30, COLORS.panel, COLORS.line)}
        ${rect(448, 496, 168, 42, 16, 'rgba(255,255,255,0.045)', COLORS.lineSoft)}
        ${text(476, 523, 'Article', 16, COLORS.muted, 750)}
        ${rect(624, 496, 188, 42, 16, alpha(asset.accent, 0.12), alpha(asset.accent, 0.4))}
        ${text(652, 523, 'Topic map', 16, '#dff8ff', 800)}
        ${rect(462, 616, 152, 58, 18, alpha(asset.accent, 0.12), alpha(asset.accent, 0.42))}
        ${text(484, 652, 'Connect Slack', 17, '#e9fbff', 800)}
        <path d="M614 645 C636 645 630 528 652 528 M614 645 C636 645 630 608 652 608 M614 645 C636 645 630 688 652 688 M614 645 C636 645 630 768 652 768" stroke="${alpha(asset.accent, 0.55)}" stroke-width="2" fill="none"/>
        ${topics.map((topic) => `${rect(topic.x, topic.y, topic.width, 56, 17, topic.active ? alpha(topic.color, 0.14) : 'rgba(255,255,255,0.04)', topic.active ? alpha(topic.color, 0.48) : COLORS.lineSoft)}
            ${text(topic.x + 18, topic.y + 35, topic.label, 16, topic.active ? '#f5fffd' : COLORS.muted, topic.active ? 800 : 700)}`).join('')}
        ${text(462, 902, 'Built from published headings only', 15, COLORS.faint, 700)}
        ${rect(900, 470, 348, 512, 30, COLORS.panel, COLORS.line)}
        ${text(932, 522, 'Connect Slack', 24, COLORS.text, 800)}
        ${paragraph(932, 566, 'Open integrations, choose Slack, and authorize the workspace with an eligible admin role.', 34, 17, COLORS.muted, 4, 25)}
        ${text(932, 704, 'Related published guides', 16, COLORS.faint, 750)}
        ${['Slack permissions', 'Connection errors', 'Disconnect Slack'].map((item, index) => {
            const y = 746 + index * 62;
            return `${rect(930, y, 288, 46, 15, 'rgba(255,255,255,0.035)', COLORS.lineSoft)}
                ${text(952, y + 29, item, 16, COLORS.text, 700)}`;
        }).join('')}
        ${text(420, 1030, 'Desktop map', 16, COLORS.muted, 700)}
        <path d="M528 1024 H780" stroke="${asset.accent}" stroke-width="2" stroke-linecap="round"/>
        ${text(804, 1030, 'Mobile drill-down', 16, COLORS.muted, 700)}
        <path d="M936 1024 H1060" stroke="${asset.accent}" stroke-width="2" stroke-linecap="round"/>
        ${text(1084, 1030, 'Open guide', 16, '#dff8ff', 800)}`);
}

function renderDemo(asset) {
    return renderWidget(asset);
}

function svgFor(asset) {
    const renderers = {
        workspace: renderWorkspace,
        widget: renderWidget,
        checklist: renderChecklist,
        surfaces: renderSurfaces,
        install: renderInstall,
        board: renderBoard,
        governance: renderGovernance,
        help: renderHelp,
        intake: renderIntake,
        faq: renderFaq,
        timeline: renderTimeline,
        tickets: renderTickets,
        notifications: renderNotifications,
        proactive: renderProactive,
        demo: renderDemo,
        table: renderTable,
        'owner-decision': renderOwnerDecision,
        'knowledge-map': renderKnowledgeMap,
        'release-assurance': renderReleaseAssurance,
        'topic-map': renderTopicMap,
    };
    return (renderers[asset.scene] || renderWorkspace)(asset);
}

function normalizeSvg(svg) {
    return `${svg
        .split('\n')
        .map((line) => line.replace(/\s+$/u, ''))
        .join('\n')
        .trim()}\n`;
}

function renderTable(asset) {
    const rows = asset.rows || ['Owner - workspace control', 'Manager - widget setup', 'Support staff - tickets'];
    return browserShell(asset, `
        ${rect(420, 470, 828, 512, 30, COLORS.panel, COLORS.line)}
        ${text(458, 528, 'Workspace members', 28, COLORS.text, 800)}
        ${['Member', 'Access', 'Status'].map((head, index) => text(458 + index * 260, 594, head, 16, COLORS.faint, 800, 'letter-spacing="2"')).join('')}
        ${rows.map((row, index) => {
            const y = 632 + index * 78;
            const [name, access] = row.split(' - ');
            return `${rect(452, y, 724, 56, 18, index === 0 ? alpha(asset.accent, 0.07) : 'rgba(255,255,255,0.04)', index === 0 ? alpha(asset.accent, 0.34) : COLORS.lineSoft)}
                ${text(478, y + 36, name, 18, COLORS.text, 740)}
                ${text(718, y + 36, access || 'Scoped permissions', 17, COLORS.muted, 650)}
                ${text(1010, y + 36, 'Active', 16, asset.accent, 800)}`;
        }).join('')}`);
}

async function generate() {
    ensureDir(PUBLIC_OUT_DIR);
    ensureDir(SOURCE_OUT_DIR);
    const proofAssetsOnly = process.argv.includes('--proof-assets-only');
    const manifest = [];

    for (const asset of ASSETS) {
        const format = asset.format || 'png';
        const svgPath = path.join(SOURCE_OUT_DIR, `${asset.slug}.svg`);
        const outputDir = asset.publicRoot ? path.join(ROOT, 'public') : PUBLIC_OUT_DIR;
        const outputPath = path.join(outputDir, `${asset.slug}.${format}`);

        ensureDir(outputDir);
        if (!proofAssetsOnly || asset.publicRoot) {
            fs.writeFileSync(svgPath, normalizeSvg(svgFor(asset)), 'utf8');
            if (format === 'webp') {
                await sharp(Buffer.from(fs.readFileSync(svgPath, 'utf8')))
                    .webp({ quality: 82, effort: 6 })
                    .toFile(outputPath);
            } else {
                execFileSync('sips', ['-s', 'format', format, svgPath, '--out', outputPath], { stdio: 'ignore' });
            }
        }

        manifest.push({
            file: asset.publicRoot
                ? `public/${asset.slug}.${format}`
                : `public/answerlattice-website-assets/dummy/${asset.slug}.${format}`,
            source: `${asset.slug}.svg`,
            width: WIDTH,
            height: HEIGHT,
            group: asset.group,
            title: asset.title,
            detail: asset.subtitle,
            scene: asset.scene,
        });
    }

    fs.writeFileSync(
        path.join(SOURCE_OUT_DIR, 'manifest.json'),
        `${JSON.stringify({ width: WIDTH, height: HEIGHT, assets: manifest }, null, 2)}\n`,
        'utf8'
    );

    const renderedCount = proofAssetsOnly ? ASSETS.filter((asset) => asset.publicRoot).length : ASSETS.length;
    console.log(`Generated ${renderedCount} AnswerLattice website assets.`);
    console.log(`Wrote source SVGs and manifest in ${SOURCE_OUT_DIR}`);
}

generate().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
