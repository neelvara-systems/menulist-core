import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const outputDir = path.join(repoRoot, 'public/campaigncue-website-assets/dummy');

GlobalFonts.registerFromPath(
    path.join(repoRoot, 'node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf'),
    'CampaignCueSans',
);
GlobalFonts.registerFromPath(
    path.join(repoRoot, 'node_modules/pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf'),
    'CampaignCueSans',
);

const C = {
    bg: '#fbf7fa',
    bgSoft: '#fff7fb',
    surface: '#ffffff',
    surfacePink: '#f9eaf2',
    border: '#eadde7',
    ink: '#011b6d',
    inkSoft: '#303a79',
    deep: '#020c4f',
    navySoft: '#152567',
    muted: '#746f95',
    pink: '#d96e9b',
    pinkDark: '#c95f90',
    pinkSoft: '#f4d2e2',
    ok: '#166534',
    okSoft: '#dcfce7',
    warn: '#a16207',
    warnSoft: '#fef3c7',
    block: '#991b1b',
    blockSoft: '#fee2e2',
};

const demo = {
    business: 'Maya Street Kitchen',
    location: 'Bengaluru local lunch counter',
    cue: 'Promote lunch combo before 2 PM',
    offer: 'Paneer tikka bowl + masala tea',
    price: 'Rs 249',
    window: 'Today 12-3 PM',
    link: 'mayastreet.menu.link/lunch',
    source: 'Menu price + owner photo + pickup link',
    channels: ['WhatsApp', 'Google local', 'Story creative', 'Counter poster', 'Staff note', 'Reel brief'],
};

function makeCanvas(width = 1440, height = 980) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(0.48, C.bg);
    bg.addColorStop(1, '#f6e8f1');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = 'top';
    return { canvas, ctx };
}

function font(size, weight = 400) {
    return `${weight} ${size}px CampaignCueSans, Arial, sans-serif`;
}

function rounded(ctx, x, y, w, h, r, fill, stroke = null, lineWidth = 1) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }
}

function shadow(ctx, blur = 28, color = 'rgba(1, 27, 109, 0.14)', x = 0, y = 16) {
    ctx.shadowBlur = blur;
    ctx.shadowColor = color;
    ctx.shadowOffsetX = x;
    ctx.shadowOffsetY = y;
}

function clearShadow(ctx) {
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function text(ctx, value, x, y, opts = {}) {
    const {
        size = 18,
        weight = 400,
        color = C.ink,
        maxWidth = undefined,
        lineHeight = Math.round(size * 1.28),
        align = 'left',
    } = opts;

    ctx.font = font(size, weight);
    ctx.fillStyle = color;
    ctx.textAlign = align;

    if (!maxWidth) {
        ctx.fillText(String(value), x, y);
        return lineHeight;
    }

    const words = String(value).split(/\s+/);
    let line = '';
    let cursor = y;

    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > maxWidth && line) {
            ctx.fillText(line, x, cursor);
            cursor += lineHeight;
            line = word;
        } else {
            line = next;
        }
    }

    if (line) {
        ctx.fillText(line, x, cursor);
        cursor += lineHeight;
    }

    return cursor - y;
}

function pill(ctx, label, x, y, opts = {}) {
    const {
        fill = C.surface,
        stroke = C.border,
        color = C.inkSoft,
        size = 14,
        padX = 13,
        padY = 7,
        weight = 800,
    } = opts;
    ctx.font = font(size, weight);
    const width = Math.ceil(ctx.measureText(label).width + padX * 2);
    const height = size + padY * 2;
    rounded(ctx, x, y, width, height, height / 2, fill, stroke);
    text(ctx, label, x + padX, y + padY - 1, { size, weight, color });
    return { width, height };
}

function panel(ctx, x, y, w, h, opts = {}) {
    const { fill = C.surface, stroke = 'rgba(1,27,109,0.10)', radius = 18, heavy = false } = opts;
    shadow(ctx, heavy ? 44 : 24, heavy ? 'rgba(1, 27, 109, 0.18)' : 'rgba(1, 27, 109, 0.08)', 0, heavy ? 24 : 14);
    rounded(ctx, x, y, w, h, radius, fill, stroke);
    clearShadow(ctx);
}

function logo(ctx, x, y, size = 52) {
    rounded(ctx, x, y, size, size, 14, C.surface, 'rgba(1,27,109,0.12)');
    const mark = ctx.createLinearGradient(x, y, x + size, y + size);
    mark.addColorStop(0, C.pink);
    mark.addColorStop(1, C.ink);
    rounded(ctx, x + 10, y + 11, size - 20, size - 22, 9, mark);
    text(ctx, 'C', x + size / 2, y + 16, {
        size: Math.round(size * 0.34),
        weight: 800,
        color: C.surface,
        align: 'center',
    });
}

function browser(ctx, x, y, w, h, title, opts = {}) {
    panel(ctx, x, y, w, h, { heavy: true, radius: opts.radius || 22 });
    rounded(ctx, x, y, w, 58, opts.radius || 22, '#ffffff', 'rgba(1,27,109,0.10)');
    rounded(ctx, x, y + 32, w, 26, 0, '#ffffff');
    rounded(ctx, x + 24, y + 22, 10, 10, 5, '#eadde7');
    rounded(ctx, x + 44, y + 22, 10, 10, 5, C.pinkSoft);
    rounded(ctx, x + 64, y + 22, 10, 10, 5, C.pink);
    text(ctx, title, x + w - 28, y + 20, { size: 13, weight: 800, color: C.muted, align: 'right' });
    return { x: x + 24, y: y + 80, w: w - 48, h: h - 104 };
}

function sampleBadge(ctx, width, height) {
    pill(ctx, 'Sample data', width - 196, height - 64, {
        fill: '#ffffff',
        stroke: 'rgba(1,27,109,0.12)',
        color: C.muted,
        size: 14,
    });
}

function header(ctx, eyebrow, title, subtitle, width) {
    logo(ctx, 72, 60, 50);
    text(ctx, 'CampaignCue', 136, 70, { size: 18, weight: 800 });
    text(ctx, eyebrow, 136, 96, { size: 12, weight: 800, color: C.muted });
    text(ctx, title, 72, 150, { size: 44, weight: 800, maxWidth: 720, lineHeight: 50 });
    text(ctx, subtitle, 74, 256, { size: 20, color: C.inkSoft, maxWidth: Math.min(820, width - 148), lineHeight: 29 });
}

function drawSourceCard(ctx, x, y, w) {
    panel(ctx, x, y, w, 254, { fill: C.surface });
    pill(ctx, 'Source facts', x + 22, y + 20, { fill: C.surfacePink, stroke: C.border, color: C.ink });
    text(ctx, demo.offer, x + 22, y + 70, { size: 25, weight: 800, maxWidth: w - 44, lineHeight: 31 });
    const rows = [
        ['Price', demo.price],
        ['Window', demo.window],
        ['Link', demo.link],
    ];
    rows.forEach(([label, value], index) => {
        const rowY = y + 144 + index * 30;
        text(ctx, label, x + 22, rowY, { size: 13, weight: 800, color: C.muted });
        text(ctx, value, x + w - 22, rowY, { size: 13, weight: 800, color: C.ink, align: 'right' });
    });
}

function drawPackRows(ctx, x, y, w, rows = demo.channels) {
    rows.forEach((row, index) => {
        const rowY = y + index * 58;
        rounded(ctx, x, rowY, w, 46, 12, index % 2 === 0 ? C.surfacePink : C.surface, 'rgba(1,27,109,0.08)');
        rounded(ctx, x + 12, rowY + 13, 20, 20, 7, index < 3 ? C.pink : C.ink);
        text(ctx, row, x + 44, rowY + 13, { size: 15, weight: 800 });
        text(ctx, index < 3 ? 'Ready' : 'Review', x + w - 18, rowY + 15, {
            size: 12,
            weight: 800,
            color: index < 3 ? C.ink : C.warn,
            align: 'right',
        });
    });
}

function drawTrustRows(ctx, x, y, w) {
    const rows = [
        ['Lunch combo today', 'Menu price', 'Clear', 'Export'],
        ['Best in town', 'No source', 'Blocked', 'Rewrite'],
        ['Spend Rs 500', 'No approval', 'Disabled', 'Manual'],
        ['First-person review', 'No consent', 'Review', 'Brief'],
    ];
    rows.forEach((row, index) => {
        const rowY = y + index * 54;
        rounded(ctx, x, rowY, w, 44, 11, C.surface, 'rgba(1,27,109,0.08)');
        text(ctx, row[0], x + 14, rowY + 13, { size: 12, weight: 800, maxWidth: w * 0.3 });
        text(ctx, row[1], x + w * 0.37, rowY + 13, { size: 12, weight: 800, color: C.muted });
        const tone = row[2] === 'Clear' ? C.ok : row[2] === 'Blocked' || row[2] === 'Disabled' ? C.block : C.warn;
        text(ctx, row[2], x + w * 0.64, rowY + 13, { size: 12, weight: 800, color: tone });
        text(ctx, row[3], x + w - 14, rowY + 13, { size: 12, weight: 800, color: C.ink, align: 'right' });
    });
}

function drawDailyDeskScene() {
    const { canvas, ctx } = makeCanvas(1440, 980);
    header(ctx, 'Daily campaign desk', 'One cue becomes a checked campaign pack.', 'Dummy owner data shows the active CampaignCue path: fact-backed cue, campaign pack, visible review, and manual export.', 1440);

    const app = browser(ctx, 72, 340, 1296, 550, 'campaigncue.ai / daily-desk');
    rounded(ctx, app.x, app.y, 152, app.h, 16, '#fff7fb', C.border);
    ['Today', 'Facts', 'Pack', 'Trust', 'Memory'].forEach((item, index) => {
        const active = index === 0;
        rounded(ctx, app.x + 16, app.y + 22 + index * 58, 120, 38, 10, active ? C.pink : 'transparent', active ? C.pink : null);
        text(ctx, item, app.x + 32, app.y + 33 + index * 58, {
            size: 14,
            weight: 800,
            color: active ? C.surface : C.muted,
        });
    });

    const mainX = app.x + 180;
    const mainW = 542;
    const grad = ctx.createLinearGradient(mainX, app.y + 22, mainX + mainW, app.y + 330);
    grad.addColorStop(0, C.ink);
    grad.addColorStop(1, C.deep);
    rounded(ctx, mainX, app.y + 22, mainW, 310, 18, grad);
    pill(ctx, 'Ready after fact check', mainX + 24, app.y + 46, {
        fill: 'rgba(255,255,255,0.12)',
        stroke: 'rgba(255,255,255,0.18)',
        color: C.pinkSoft,
    });
    text(ctx, demo.cue, mainX + 24, app.y + 104, { size: 39, weight: 800, color: C.surface, maxWidth: 448, lineHeight: 43 });
    text(ctx, `${demo.offer}. ${demo.price}. ${demo.window}.`, mainX + 24, app.y + 210, {
        size: 18,
        color: C.pinkSoft,
        maxWidth: 440,
        lineHeight: 25,
    });
    pill(ctx, 'Copy WhatsApp', mainX + 24, app.y + 274, { fill: C.surface, stroke: C.surface, color: C.ink });
    pill(ctx, 'Download poster', mainX + 170, app.y + 274, { fill: C.surface, stroke: C.surface, color: C.ink });

    drawSourceCard(ctx, mainX, app.y + 356, 310);
    panel(ctx, mainX + 334, app.y + 356, 208, 254, { fill: C.surfacePink });
    text(ctx, 'Result memory', mainX + 356, app.y + 380, { size: 17, weight: 800 });
    ['Used', 'Skipped', 'Sold', 'Follow-up'].forEach((item, index) => {
        pill(ctx, item, mainX + 356, app.y + 426 + index * 38, {
            fill: index === 0 ? C.ink : C.surface,
            stroke: index === 0 ? C.ink : C.border,
            color: index === 0 ? C.surface : C.ink,
            size: 12,
        });
    });

    panel(ctx, app.x + 752, app.y + 22, 278, 446, { fill: C.surface });
    text(ctx, 'Campaign pack', app.x + 774, app.y + 48, { size: 23, weight: 800 });
    text(ctx, 'Six owner-ready handoffs', app.x + 774, app.y + 82, { size: 14, weight: 800, color: C.muted });
    drawPackRows(ctx, app.x + 774, app.y + 126, 234);

    panel(ctx, app.x + 1050, app.y + 22, 198, 446, { fill: C.surfacePink });
    text(ctx, 'Story asset', app.x + 1072, app.y + 48, { size: 20, weight: 800 });
    const poster = ctx.createLinearGradient(app.x + 1072, app.y + 92, app.x + 1226, app.y + 294);
    poster.addColorStop(0, C.pink);
    poster.addColorStop(1, C.ink);
    rounded(ctx, app.x + 1072, app.y + 92, 154, 248, 18, poster);
    text(ctx, 'Lunch combo', app.x + 1092, app.y + 232, { size: 22, weight: 800, color: C.surface, maxWidth: 114, lineHeight: 25 });
    text(ctx, demo.price, app.x + 1092, app.y + 292, { size: 17, weight: 800, color: C.pinkSoft });
    pill(ctx, 'Export first', app.x + 1072, app.y + 370, { fill: C.surface, stroke: C.border, color: C.ink, size: 12 });

    sampleBadge(ctx, 1440, 980);
    return canvas;
}

function drawPackRoomScene() {
    const { canvas, ctx } = makeCanvas(1440, 1020);
    header(ctx, 'Campaign Pack Room', 'Pack, proof, and manual handoff stay together.', 'This sample mirrors the public site promise without claiming direct posting, spend automation, or guaranteed campaign results.', 1440);

    const app = browser(ctx, 96, 326, 1248, 590, 'campaigncue.ai / pack-room');
    const grad = ctx.createLinearGradient(app.x, app.y, app.x + app.w, app.y + 90);
    grad.addColorStop(0, C.ink);
    grad.addColorStop(1, C.deep);
    rounded(ctx, app.x, app.y, app.w, 92, 18, grad);
    text(ctx, 'Lunch combo pack', app.x + 28, app.y + 22, { size: 15, weight: 800, color: C.pinkSoft });
    text(ctx, 'Ready after fact check', app.x + 28, app.y + 48, { size: 28, weight: 800, color: C.surface });
    pill(ctx, 'Export first', app.x + app.w - 142, app.y + 32, { fill: C.pink, stroke: C.pink, color: C.surface });

    const colW = (app.w - 48) / 3;
    const columns = [
        ['Owner-ready pieces', ['WhatsApp status', 'Google local draft', 'Story creative', 'Counter poster']],
        ['Proof beside work', ['Source trace', 'Brand note', 'Claim review', 'Rights note']],
        ['Manual controls', ['Download ZIP', 'Copy text', 'Assign task', 'Mark result']],
    ];
    columns.forEach(([title, rows], index) => {
        const x = app.x + index * colW + index * 12;
        panel(ctx, x, app.y + 122, colW - 8, 390, { fill: index === 1 ? C.surfacePink : C.surface });
        text(ctx, title, x + 24, app.y + 148, { size: 23, weight: 800, maxWidth: colW - 56, lineHeight: 28 });
        text(ctx, index === 0 ? 'Files and copy stay grouped.' : index === 1 ? 'Review context travels with the pack.' : 'Nothing silently leaves the workspace.', x + 24, app.y + 204, {
            size: 15,
            color: C.muted,
            maxWidth: colW - 58,
            lineHeight: 22,
        });
        rows.forEach((row, rowIndex) => {
            const y = app.y + 286 + rowIndex * 54;
            rounded(ctx, x + 24, y, colW - 56, 40, 10, C.surface, 'rgba(1,27,109,0.08)');
            text(ctx, row, x + 40, y + 12, { size: 14, weight: 800 });
            text(ctx, rowIndex < 2 ? 'Ready' : 'Review', x + colW - 50, y + 13, {
                size: 12,
                weight: 800,
                color: rowIndex < 2 ? C.ink : C.warn,
                align: 'right',
            });
        });
    });

    sampleBadge(ctx, 1440, 1020);
    return canvas;
}

function drawCreativeSystemScene() {
    const { canvas, ctx } = makeCanvas(1440, 1040);
    header(ctx, 'Creative output system', 'Campaign assets that look like work, not a text ledger.', 'Dummy examples show the output breadth CampaignCue can explain publicly: copy, local updates, story assets, print notes, proof, and result memory.', 1440);

    const tiles = [
        ['WhatsApp pack', 'Status text + reply line', C.pink],
        ['Google local', 'Manual publish draft', C.ink],
        ['Story creative', '1080 x 1920 export', C.pinkDark],
        ['Counter poster', 'Print-ready handoff', C.pinkSoft],
        ['Reel brief', 'Hook + shot list', C.navySoft],
        ['Proof deck', 'Source trace + review', C.deep],
        ['Staff note', 'Counter script', C.surfacePink],
        ['Result memory', 'Used, skipped, follow-up', C.okSoft],
    ];
    const startY = 332;
    const gridX = 96;
    const gap = 18;
    const tileW = 300;
    const tileH = 230;
    tiles.forEach(([title, subtitle, fill], index) => {
        const col = index % 4;
        const row = Math.floor(index / 4);
        const x = gridX + col * (tileW + gap);
        const y = startY + row * (tileH + gap);
        const isLightTile = fill === C.surfacePink || fill === C.pinkSoft || fill === C.okSoft;
        panel(ctx, x, y, tileW, tileH, { fill: isLightTile ? C.surface : fill, heavy: index < 4 });
        if (!isLightTile) {
            const wash = ctx.createLinearGradient(x, y, x + tileW, y + tileH);
            wash.addColorStop(0, 'rgba(255,255,255,0.20)');
            wash.addColorStop(1, 'rgba(255,255,255,0.00)');
            rounded(ctx, x, y, tileW, tileH, 18, wash);
        } else {
            rounded(ctx, x + 18, y + 18, tileW - 36, 84, 14, fill, 'rgba(1,27,109,0.08)');
        }
        const light = !isLightTile;
        text(ctx, title, x + 24, y + 134, { size: 25, weight: 800, color: light ? C.surface : C.ink, maxWidth: 230, lineHeight: 28 });
        text(ctx, subtitle, x + 24, y + 176, { size: 15, weight: 800, color: light ? C.pinkSoft : C.muted, maxWidth: 230, lineHeight: 21 });
        pill(ctx, index < 6 ? 'Manual handoff' : 'Memory', x + 24, y + 24, {
            fill: light ? 'rgba(255,255,255,0.14)' : C.surface,
            stroke: light ? 'rgba(255,255,255,0.20)' : C.border,
            color: light ? C.surface : C.ink,
            size: 12,
        });
    });

    sampleBadge(ctx, 1440, 1040);
    return canvas;
}

function drawTrustCenterScene() {
    const { canvas, ctx } = makeCanvas(1440, 980);
    header(ctx, 'Creative Trust Center', 'Risky campaign claims stay visible before use.', 'This sample demonstrates the claim, source, risk, and action posture without legal-platform certification or predictive scoring claims.', 1440);

    const app = browser(ctx, 96, 326, 1248, 546, 'campaigncue.ai / trust-center');
    text(ctx, 'Checks before handoff', app.x, app.y, { size: 31, weight: 800 });
    pill(ctx, 'Owner review required', app.x + 402, app.y + 2, { fill: C.warnSoft, stroke: '#fde68a', color: C.warn });
    const heads = ['Claim', 'Source', 'Risk', 'Action'];
    heads.forEach((head, index) => {
        text(ctx, head, app.x + 28 + index * 286, app.y + 82, { size: 13, weight: 800, color: C.muted });
    });
    drawTrustRows(ctx, app.x, app.y + 122, app.w);
    panel(ctx, app.x, app.y + 376, app.w, 92, { fill: C.surfacePink });
    text(ctx, 'Delivery boundary', app.x + 28, app.y + 404, { size: 20, weight: 800 });
    text(ctx, 'Download, copy, assign, and record the result. No silent account posting or ad spend mutation.', app.x + 260, app.y + 404, {
        size: 18,
        weight: 800,
        color: C.inkSoft,
        maxWidth: 760,
        lineHeight: 25,
    });
    sampleBadge(ctx, 1440, 980);
    return canvas;
}

function drawCreativeStudioScene() {
    const { canvas, ctx } = makeCanvas(1440, 980);
    header(ctx, 'Creative Studio', 'Finish a campaign asset with source context beside it.', 'The public image uses dummy content and mirrors the CampaignCue adapter boundary: protected business text, owner review, and export-first files.', 1440);

    const app = browser(ctx, 96, 326, 1248, 546, 'campaigncue.ai / creative-studio');
    rounded(ctx, app.x, app.y, 150, app.h, 16, '#fff7fb', C.border);
    ['Text', 'Image', 'Brand', 'Export'].forEach((item, index) => {
        rounded(ctx, app.x + 18, app.y + 22 + index * 58, 112, 38, 10, index === 0 ? C.pink : 'transparent', index === 0 ? C.pink : null);
        text(ctx, item, app.x + 34, app.y + 33 + index * 58, {
            size: 14,
            weight: 800,
            color: index === 0 ? C.surface : C.muted,
        });
    });

    const canvasX = app.x + 182;
    const poster = ctx.createLinearGradient(canvasX, app.y + 24, canvasX + 518, app.y + 404);
    poster.addColorStop(0, C.pink);
    poster.addColorStop(1, C.ink);
    rounded(ctx, canvasX, app.y + 24, 548, 420, 18, poster);
    pill(ctx, 'Source locked', canvasX + 28, app.y + 52, {
        fill: 'rgba(255,255,255,0.18)',
        stroke: 'rgba(255,255,255,0.22)',
        color: C.surface,
    });
    text(ctx, 'Paneer tikka lunch bowl', canvasX + 34, app.y + 250, { size: 45, weight: 800, color: C.surface, maxWidth: 414, lineHeight: 48 });
    text(ctx, `${demo.price} - ${demo.window}`, canvasX + 34, app.y + 358, { size: 24, weight: 800, color: C.pinkSoft });

    panel(ctx, app.x + 760, app.y + 24, 430, 420, { fill: C.surface });
    text(ctx, 'Review panel', app.x + 786, app.y + 50, { size: 25, weight: 800 });
    drawPackRows(ctx, app.x + 786, app.y + 104, 378, ['Protected text', 'Brand note', 'Resize preset', 'Export PNG', 'Proof note']);
    sampleBadge(ctx, 1440, 980);
    return canvas;
}

function drawCueLayersScene() {
    const { canvas, ctx } = makeCanvas(1440, 980);
    header(ctx, 'CueLayers', 'Preserve the source. Add only the edits you need.', 'The sample mirrors the active flat-safe flow: one locked uploaded image, separate owner-added elements, saved revision, and manual download.', 1440);

    const app = browser(ctx, 96, 326, 1248, 546, 'campaigncue.ai / cuelayers');
    panel(ctx, app.x, app.y + 20, 356, 390, { fill: C.surfacePink });
    text(ctx, 'Original flat image', app.x + 28, app.y + 48, { size: 25, weight: 800 });
    const original = ctx.createLinearGradient(app.x + 54, app.y + 112, app.x + 302, app.y + 320);
    original.addColorStop(0, C.pink);
    original.addColorStop(1, C.ink);
    rounded(ctx, app.x + 54, app.y + 112, 248, 248, 20, original);
    text(ctx, 'Lunch combo', app.x + 84, app.y + 256, { size: 30, weight: 800, color: C.surface });
    pill(ctx, 'Preserved', app.x + 54, app.y + 350, { fill: C.surface, stroke: C.border, color: C.ink });

    text(ctx, 'plus', app.x + 392, app.y + 202, { size: 28, weight: 800, color: C.muted });

    panel(ctx, app.x + 484, app.y + 20, 352, 390, { fill: C.surface });
    text(ctx, 'Flat-safe editor', app.x + 512, app.y + 48, { size: 25, weight: 800 });
    ['Verified business text', 'Shape or drawing', 'QR details', 'Resize canvas', 'Original stays locked'].forEach((item, index) => {
        rounded(ctx, app.x + 512, app.y + 108 + index * 54, 292, 40, 10, index === 4 ? C.okSoft : C.surfacePink, 'rgba(1,27,109,0.08)');
        text(ctx, item, app.x + 530, app.y + 120 + index * 54, { size: 15, weight: 800, color: index === 4 ? C.ok : C.ink });
    });

    panel(ctx, app.x + 874, app.y + 20, 298, 390, { fill: C.deep });
    text(ctx, 'Safe export', app.x + 902, app.y + 54, { size: 25, weight: 800, color: C.surface });
    text(ctx, 'Saved revision only. Browser canvas is not trusted until the workspace saves the edit.', app.x + 902, app.y + 104, {
        size: 18,
        color: C.pinkSoft,
        maxWidth: 230,
        lineHeight: 26,
    });
    pill(ctx, 'Download after save', app.x + 902, app.y + 292, {
        fill: C.pink,
        stroke: C.pink,
        color: C.surface,
    });
    sampleBadge(ctx, 1440, 980);
    return canvas;
}

function drawProofDeckScene() {
    const { canvas, ctx } = makeCanvas(1440, 980);
    header(ctx, 'Brand and proof deck', 'Review-ready handoff instead of unsupported proof.', 'The sample uses dummy pack data and keeps proof deck language as review material, not final legal approval, rendered ads, or performance evidence.', 1440);

    const app = browser(ctx, 96, 326, 1248, 546, 'campaigncue.ai / proof-deck');
    const hero = ctx.createLinearGradient(app.x, app.y + 20, app.x + app.w, app.y + 220);
    hero.addColorStop(0, C.ink);
    hero.addColorStop(1, C.deep);
    rounded(ctx, app.x, app.y + 20, app.w, 196, 18, hero);
    pill(ctx, 'Review brief', app.x + 32, app.y + 48, { fill: C.pink, stroke: C.pink, color: C.surface });
    text(ctx, 'Lunch combo campaign', app.x + 32, app.y + 104, { size: 38, weight: 800, color: C.surface });
    text(ctx, 'Brand direction, source trace, UGC notes, trust checks, and manual export boundary.', app.x + 32, app.y + 156, {
        size: 18,
        color: C.pinkSoft,
        maxWidth: 680,
        lineHeight: 25,
    });
    const items = [
        ['Brand Playbook', 'Tone, avoid-list, visual guidance'],
        ['Source trace', demo.source],
        ['UGC consent', 'Disclosure and shot notes'],
        ['Manual export', 'No account posting promise'],
    ];
    items.forEach(([title, body], index) => {
        const x = app.x + (index % 2) * 606;
        const y = app.y + 252 + Math.floor(index / 2) * 116;
        panel(ctx, x, y, 574, 92, { fill: index === 1 ? C.surfacePink : C.surface });
        text(ctx, title, x + 24, y + 20, { size: 20, weight: 800 });
        text(ctx, body, x + 24, y + 52, { size: 15, color: C.muted, maxWidth: 500, lineHeight: 21 });
    });
    sampleBadge(ctx, 1440, 980);
    return canvas;
}

function drawTemplatesScene() {
    const { canvas, ctx } = makeCanvas(1440, 980);
    header(ctx, 'Reusable pack templates', 'Repeat useful campaign work after facts refresh.', 'This dummy visual shows the active loop: save a pack, refresh local facts, review risk again, and export manually.', 1440);

    const app = browser(ctx, 96, 326, 1248, 546, 'campaigncue.ai / reusable-packs');
    const steps = [
        ['Save', 'Save useful pack', 'Lunch, slot-fill, event, or approval pack'],
        ['Refresh', 'Update facts', 'Price, date, photo, location, and CTA'],
        ['Review', 'Check source and risk', 'Claims, consent, spend gates, and rights'],
        ['Export', 'Export again', 'Checked files and copy for manual use'],
    ];
    steps.forEach(([label, title, body], index) => {
        const x = app.x + index * 292;
        panel(ctx, x, app.y + 56, 258, 344, { fill: index % 2 === 0 ? C.surface : C.surfacePink });
        pill(ctx, label, x + 24, app.y + 84, { fill: index === 3 ? C.pink : C.surface, stroke: index === 3 ? C.pink : C.border, color: index === 3 ? C.surface : C.ink });
        text(ctx, title, x + 24, app.y + 154, { size: 26, weight: 800, maxWidth: 200, lineHeight: 31 });
        text(ctx, body, x + 24, app.y + 240, { size: 16, color: C.muted, maxWidth: 198, lineHeight: 24 });
        if (index < steps.length - 1) {
            text(ctx, '>', x + 272, app.y + 196, { size: 34, weight: 800, color: C.pink });
        }
    });
    sampleBadge(ctx, 1440, 980);
    return canvas;
}

function drawUseCaseScene() {
    const { canvas, ctx } = makeCanvas(1440, 1020);
    header(ctx, 'Small-business journey', 'From local facts to a usable checked pack.', 'Dummy data shows how a restaurant, salon, retail shop, or service business can understand CampaignCue without a generic design-tool claim.', 1440);

    drawSourceCard(ctx, 96, 348, 350);
    text(ctx, '>', 486, 446, { size: 40, weight: 800, color: C.pink });
    panel(ctx, 548, 348, 370, 254, { fill: C.deep });
    text(ctx, 'Daily cue', 578, 378, { size: 17, weight: 800, color: C.pinkSoft });
    text(ctx, demo.cue, 578, 426, { size: 34, weight: 800, color: C.surface, maxWidth: 280, lineHeight: 38 });
    pill(ctx, 'No blank prompt', 578, 536, { fill: C.pink, stroke: C.pink, color: C.surface });
    text(ctx, '>', 956, 446, { size: 40, weight: 800, color: C.pink });
    panel(ctx, 1024, 348, 320, 254, { fill: C.surface });
    text(ctx, 'Pack output', 1052, 378, { size: 24, weight: 800 });
    drawPackRows(ctx, 1052, 426, 264, ['WhatsApp', 'Google', 'Story', 'Print']);

    panel(ctx, 96, 654, 600, 236, { fill: C.surfacePink });
    text(ctx, 'Creative reuse', 124, 686, { size: 26, weight: 800 });
    text(ctx, 'Old posters, owner photos, and generated images can become safe editable candidates when the review state is clear.', 124, 738, {
        size: 18,
        color: C.inkSoft,
        maxWidth: 488,
        lineHeight: 27,
    });
    ['Uploaded assets', 'Layer candidates', 'Flat fallback'].forEach((item, index) => {
        pill(ctx, item, 124 + index * 158, 832, { fill: C.surface, stroke: C.border, color: C.ink, size: 12 });
    });

    panel(ctx, 744, 654, 600, 236, { fill: C.surface });
    text(ctx, 'Manual export and memory', 772, 686, { size: 26, weight: 800 });
    text(ctx, 'The owner copies, downloads, posts outside CampaignCue, then marks used, skipped, booked, sold, or follow-up.', 772, 738, {
        size: 18,
        color: C.inkSoft,
        maxWidth: 488,
        lineHeight: 27,
    });
    ['Copy', 'Download', 'Mark result'].forEach((item, index) => {
        pill(ctx, item, 772 + index * 132, 832, { fill: index === 0 ? C.pink : C.surfacePink, stroke: index === 0 ? C.pink : C.border, color: index === 0 ? C.surface : C.ink, size: 12 });
    });

    sampleBadge(ctx, 1440, 1020);
    return canvas;
}

const assets = [
    ['campaigncue-home-hero-daily-desk.webp', drawDailyDeskScene],
    ['campaigncue-pack-room-export-pack.webp', drawPackRoomScene],
    ['campaigncue-creative-output-system.webp', drawCreativeSystemScene],
    ['campaigncue-feature-daily-desk.webp', drawDailyDeskScene],
    ['campaigncue-feature-pack-studio.webp', drawPackRoomScene],
    ['campaigncue-feature-creative-studio.webp', drawCreativeStudioScene],
    ['campaigncue-feature-cuelayers.webp', drawCueLayersScene],
    ['campaigncue-feature-trust-center.webp', drawTrustCenterScene],
    ['campaigncue-feature-proof-deck.webp', drawProofDeckScene],
    ['campaigncue-feature-reusable-templates.webp', drawTemplatesScene],
    ['campaigncue-use-case-small-business-pack.webp', drawUseCaseScene],
];

async function save(canvas, filename) {
    const buffer = canvas.toBuffer('image/webp');
    const out = path.join(outputDir, filename);
    await fs.writeFile(out, buffer);
    return { filename, bytes: buffer.length };
}

async function main() {
    await fs.mkdir(outputDir, { recursive: true });
    const outputs = [];
    for (const [filename, draw] of assets) {
        outputs.push(await save(draw(), filename));
    }
    console.log(JSON.stringify({
        outputDir: path.relative(repoRoot, outputDir),
        outputs: outputs.map((item) => ({
            file: item.filename,
            kb: Math.round(item.bytes / 1024),
        })),
    }, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
