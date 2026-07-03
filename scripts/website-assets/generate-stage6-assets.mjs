import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const publicDir = path.join(repoRoot, 'public/images/website');
const notesDir = path.join(repoRoot, '__docs__/main-website/asset-production/stage-06-3');

let menuListLogoImage = null;

GlobalFonts.registerFromPath(
  path.join(repoRoot, 'node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf'),
  'Inter',
);
GlobalFonts.registerFromPath(
  path.join(repoRoot, 'node_modules/pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf'),
  'Inter',
);

const C = {
  ink: '#0f172a',
  muted: '#64748b',
  soft: '#94a3b8',
  border: '#dbe4f0',
  borderStrong: '#cbd5e1',
  page: '#f8fafc',
  white: '#ffffff',
  blue: '#0051d1',
  blueDark: '#1d4ed8',
  blueSoft: '#dbeafe',
  green: '#16a34a',
  greenSoft: '#dcfce7',
  amber: '#f59e0b',
  amberSoft: '#fef3c7',
  redSoft: '#fee2e2',
  navy: '#10233f',
  slate: '#e2e8f0',
};

const demo = {
  business: 'The Daily Plate',
  subline: 'Cafe and lunch kitchen',
  city: 'Indiranagar, Bengaluru',
  cityShort: 'Bengaluru',
  url: 'thedailyplate.menulist.online',
  menuUrl: 'thedailyplate.menulist.online/menu',
  updated: 'Updated today',
  source: 'Owner-approved source',
  language: 'English / Hindi',
  items: [
    { name: 'Paneer Tikka Bowl', desc: 'Charred paneer, rice, mint chutney', price: 'Rs. 220', color: '#f97316' },
    { name: 'Masala Oats Bowl', desc: 'Warm oats, vegetables, house spices', price: 'Rs. 160', color: '#22c55e' },
    { name: 'Cold Coffee', desc: 'Classic iced coffee with milk', price: 'Rs. 120', color: '#0ea5e9' },
    { name: 'Veg Club Sandwich', desc: 'Three-layer sandwich, fries', price: 'Rs. 180', color: '#eab308' },
  ],
  categories: ['Popular', 'Bowls', 'Snacks', 'Drinks'],
  actions: ['Call', 'WhatsApp', 'Directions'],
  issueTypes: ['Wrong price', 'Missing item', 'Outdated hours'],
};

function makeCanvas(width, height, bg = C.page) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = 'top';
  return { canvas, ctx };
}

function font(size, weight = 400) {
  return `${weight} ${size}px Inter, Arial, sans-serif`;
}

function rounded(ctx, x, y, w, h, r, fill, stroke = null, lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
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

function shadow(ctx, blur = 28, color = 'rgba(15, 23, 42, 0.14)', x = 0, y = 16) {
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
    lineHeight = Math.round(size * 1.3),
    align = 'left',
  } = opts;
  ctx.font = font(size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  if (!maxWidth) {
    ctx.fillText(value, x, y);
    return lineHeight;
  }
  const paragraphs = String(value).split('\n');
  let cursor = y;
  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, cursor);
        cursor += lineHeight;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, x, cursor);
      cursor += lineHeight;
    }
  }
  return cursor - y;
}

function pill(ctx, label, x, y, opts = {}) {
  const {
    fill = C.white,
    stroke = C.border,
    color = C.ink,
    size = 15,
    padX = 14,
    padY = 8,
    weight = 700,
  } = opts;
  ctx.font = font(size, weight);
  const width = Math.ceil(ctx.measureText(label).width + padX * 2);
  const height = size + padY * 2;
  rounded(ctx, x, y, width, height, height / 2, fill, stroke);
  text(ctx, label, x + padX, y + padY - 1, { size, weight, color });
  return { width, height };
}

function dot(ctx, x, y, color, r = 5) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function logoMark(ctx, x, y, size = 44) {
  if (menuListLogoImage) {
    rounded(ctx, x, y, size, size, Math.max(10, size * 0.22), C.white, C.border);
    const inset = Math.max(3, Math.round(size * 0.06));
    ctx.drawImage(menuListLogoImage, x + inset, y + inset, size - inset * 2, size - inset * 2);
  } else {
    rounded(ctx, x, y, size, size, 12, C.blue);
    ctx.strokeStyle = C.white;
    ctx.lineWidth = Math.max(2, size / 14);
    const pad = size * 0.24;
    for (let i = 0; i < 3; i += 1) {
      const yy = y + pad + i * size * 0.18;
      ctx.beginPath();
      ctx.moveTo(x + pad, yy);
      ctx.lineTo(x + size - pad, yy);
      ctx.stroke();
    }
  }
}

function businessLogo(ctx, x, y, size = 56) {
  rounded(ctx, x, y, size, size, Math.max(12, size * 0.2), '#fff7ed', '#fed7aa');
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size * 0.31, 0, Math.PI * 2);
  ctx.fillStyle = '#fdba74';
  ctx.fill();
  text(ctx, 'DP', x + size / 2, y + size / 2 - size * 0.14, {
    size: Math.max(13, Math.round(size * 0.24)),
    weight: 800,
    color: '#7c2d12',
    align: 'center',
  });
}

function imageTile(ctx, x, y, w, h, color, label = '') {
  const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, '#ffffff');
  rounded(ctx, x, y, w, h, 14, gradient, '#ffffff');
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.arc(x + w * 0.68, y + h * 0.28, Math.min(w, h) * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (label) {
    text(ctx, label, x + 12, y + h - 27, { size: 11, weight: 700, color: 'rgba(15,23,42,0.72)' });
  }
}

function drawPhoneShell(ctx, x, y, w, h) {
  shadow(ctx, 38, 'rgba(15, 23, 42, 0.18)', 0, 22);
  rounded(ctx, x, y, w, h, 34, '#0b1220');
  clearShadow(ctx);
  rounded(ctx, x + 9, y + 9, w - 18, h - 18, 28, C.white);
  rounded(ctx, x + w / 2 - 34, y + 18, 68, 8, 4, '#0b1220');
  return { x: x + 18, y: y + 34, w: w - 36, h: h - 52 };
}

function drawMenuContent(ctx, box, compact = false, options = {}) {
  const { x, y, w } = box;
  const narrow = w < 290;
  const pad = narrow ? 14 : 18;
  const logoSize = narrow ? 30 : 42;
  businessLogo(ctx, x + pad, y + 8, logoSize);
  text(ctx, demo.business, x + pad + logoSize + 10, y + 10, {
    size: narrow ? 13 : 18,
    weight: 800,
    maxWidth: w - pad * 2 - logoSize - 12,
    lineHeight: narrow ? 16 : 22,
  });
  text(ctx, 'Main Menu', x + pad + logoSize + 10, y + (narrow ? 30 : 35), {
    size: narrow ? 10 : 12,
    color: C.muted,
  });

  rounded(ctx, x + pad, y + (narrow ? 62 : 72), w - pad * 2, narrow ? 34 : 44, 13, '#f8fafc', C.border);
  text(ctx, 'Search menu...', x + pad + 18, y + (narrow ? 72 : 86), {
    size: narrow ? 11 : 14,
    color: C.muted,
  });

  let cx = x + pad;
  const categories = demo.categories.slice(0, narrow ? 2 : 4);
  const chipsY = y + (narrow ? 112 : 136);
  for (let i = 0; i < categories.length; i += 1) {
    const active = i === 0;
    const res = pill(ctx, categories[i], cx, chipsY, {
      fill: active ? C.blue : C.white,
      stroke: active ? C.blue : C.border,
      color: active ? C.white : C.muted,
      size: narrow ? 10 : 12,
      padX: narrow ? 9 : 12,
      padY: narrow ? 6 : 7,
    });
    cx += res.width + (narrow ? 6 : 8);
  }

  let itemY;
  if (!narrow) {
    text(ctx, 'Featured', x + pad, y + 188, { size: 13, weight: 800, color: C.ink });
    rounded(ctx, x + pad, y + 218, w - pad * 2, 96, 16, C.white, C.border);
    imageTile(ctx, x + pad + 14, y + 232, 128, 68, demo.items[0].color);
    text(ctx, 'Quick choice', x + pad + 158, y + 235, { size: 12, weight: 800, color: C.blue });
    text(ctx, demo.items[0].name, x + pad + 158, y + 257, {
      size: 15,
      weight: 800,
      maxWidth: w - pad * 2 - 174,
      lineHeight: 18,
    });
    text(ctx, demo.items[0].price, x + pad + 158, y + 286, { size: 13, weight: 800, color: C.blue });
    rounded(ctx, x + pad, y + 334, w - pad * 2, 50, 14, '#f8fafc', C.border);
    rounded(ctx, x + pad + 14, y + 347, 24, 24, 8, C.blueSoft, '#bfdbfe');
    text(ctx, 'Bowls', x + pad + 50, y + 348, { size: 16, weight: 800 });
    itemY = y + 402;
  } else {
    rounded(ctx, x + pad, y + 154, w - pad * 2, 36, 12, '#f8fafc', C.border);
    text(ctx, 'Bowls', x + pad + 14, y + 164, { size: 12, weight: 800 });
    itemY = y + 204;
  }

  const itemHeight = narrow ? 74 : compact ? 90 : 96;
  const maxItems = options.maxItems ?? (narrow ? 3 : compact ? 3 : 4);
  for (const item of demo.items.slice(0, maxItems)) {
    rounded(ctx, x + pad, itemY, w - pad * 2, itemHeight, 16, C.white, C.border);
    const imageSize = narrow ? 38 : 58;
    const imageX = x + pad + 14;
    const copyX = imageX + imageSize + (narrow ? 12 : 16);
    imageTile(ctx, imageX, itemY + (narrow ? 16 : 18), imageSize, imageSize, item.color);
    text(ctx, item.name, copyX, itemY + (narrow ? 13 : 16), {
      size: narrow ? 10 : 14,
      weight: 800,
      maxWidth: w - (copyX - x) - pad - 14,
      lineHeight: narrow ? 12 : 17,
    });
    if (!narrow) {
      text(ctx, item.desc, copyX, itemY + 41, {
        size: 10,
        color: C.muted,
        maxWidth: w - (copyX - x) - pad - 16,
        lineHeight: 14,
      });
    }
    text(ctx, item.price, copyX, itemY + itemHeight - (narrow ? 21 : 27), {
      size: narrow ? 10 : 13,
      weight: 800,
      color: C.blue,
    });
    itemY += itemHeight + (narrow ? 10 : 12);
  }
}

function drawPublicMenuPhone(ctx, x, y, w, h, compact = false, options = {}) {
  const content = drawPhoneShell(ctx, x, y, w, h);
  drawMenuContent(ctx, content, compact, options);
}

function drawServiceListPhone(ctx, x, y, w, h) {
  const box = drawPhoneShell(ctx, x, y, w, h);
  const pad = 22;
  rounded(ctx, box.x + pad, box.y + 10, 34, 34, 13, '#fdf2f8', '#fbcfe8');
  text(ctx, 'GR', box.x + pad + 17, box.y + 18, { size: 12, weight: 800, color: '#9d174d', align: 'center' });
  text(ctx, 'Glow Room', box.x + pad + 46, box.y + 9, { size: 15, weight: 800, maxWidth: box.w - 88, lineHeight: 18 });
  text(ctx, 'Services and packages', box.x + pad + 46, box.y + 32, { size: 10, color: C.muted });

  rounded(ctx, box.x + pad, box.y + 74, box.w - pad * 2, 38, 13, '#f8fafc', C.border);
  text(ctx, 'Search services...', box.x + pad + 16, box.y + 85, { size: 12, color: C.muted });

  let cx = box.x + pad;
  ['Popular', 'Hair', 'Nails'].forEach((label, index) => {
    const active = index === 0;
    const res = pill(ctx, label, cx, box.y + 128, {
      fill: active ? C.blue : C.white,
      stroke: active ? C.blue : C.border,
      color: active ? C.white : C.muted,
      size: 11,
      padX: 10,
      padY: 7,
    });
    cx += res.width + 7;
  });

  rounded(ctx, box.x + pad, box.y + 176, box.w - pad * 2, 38, 12, '#f8fafc', C.border);
  text(ctx, 'Top services', box.x + pad + 14, box.y + 187, { size: 12, weight: 800 });

  const services = [
    { name: 'Haircut + style', price: 'Rs. 900', color: '#ec4899' },
    { name: 'Gel manicure', price: 'Rs. 750', color: '#8b5cf6' },
    { name: 'Skin cleanup', price: 'Rs. 1,200', color: '#06b6d4' },
  ];

  let itemY = box.y + 232;
  for (const item of services) {
    rounded(ctx, box.x + pad, itemY, box.w - pad * 2, 74, 16, C.white, C.border);
    imageTile(ctx, box.x + pad + 14, itemY + 16, 38, 38, item.color);
    text(ctx, item.name, box.x + pad + 66, itemY + 14, { size: 11, weight: 800, maxWidth: box.w - pad * 2 - 90, lineHeight: 13 });
    text(ctx, item.price, box.x + pad + 66, itemY + 45, { size: 10, weight: 800, color: C.blue });
    itemY += 84;
  }
}

function drawBrowserFrame(ctx, x, y, w, h, url) {
  shadow(ctx, 34, 'rgba(15, 23, 42, 0.14)', 0, 18);
  rounded(ctx, x, y, w, h, 24, C.white, C.border);
  clearShadow(ctx);
  rounded(ctx, x, y, w, 54, 24, '#f8fafc', C.border);
  rounded(ctx, x, y + 32, w, 22, 0, '#f8fafc');
  dot(ctx, x + 26, y + 24, '#ef4444', 5);
  dot(ctx, x + 44, y + 24, '#f59e0b', 5);
  dot(ctx, x + 62, y + 24, '#22c55e', 5);
  rounded(ctx, x + 96, y + 13, w - 126, 28, 14, C.white, C.border);
  text(ctx, url, x + 114, y + 20, { size: 12, color: C.muted });
  return { x: x + 22, y: y + 76, w: w - 44, h: h - 98 };
}

function drawObpContent(ctx, box) {
  const { x, y, w, h } = box;
  const compact = w < 720;
  rounded(ctx, x, y, w, h, 22, '#fbfaf7', C.border);

  const languages = compact ? ['English', 'Hindi'] : ['English', 'Hindi', 'Gujarati'];
  let languageX = x + w - (compact ? 185 : 290);
  languages.forEach((language, index) => {
    const res = pill(ctx, language, languageX, y + 16, {
      fill: index === 0 ? C.ink : C.white,
      stroke: index === 0 ? C.ink : C.border,
      color: index === 0 ? C.white : C.muted,
      size: compact ? 10 : 12,
      padX: compact ? 9 : 11,
      padY: compact ? 6 : 7,
    });
    languageX += res.width + 8;
  });

  const identityY = y + (compact ? 60 : 58);
  const logoSize = compact ? 56 : 72;
  businessLogo(ctx, x + 26, identityY, logoSize);
  text(ctx, demo.business, x + 26 + logoSize + 18, identityY - 2, {
    size: compact ? 28 : 40,
    weight: 800,
    maxWidth: compact ? w - logoSize - 68 : w - 390,
    lineHeight: compact ? 32 : 46,
  });
  text(ctx, 'Breakfast, coffee and fresh bowls', x + 26 + logoSize + 20, identityY + (compact ? 36 : 52), {
    size: compact ? 14 : 18,
    color: C.muted,
  });

  let pillX = x + 26 + logoSize + 20;
  ['Dine-in', 'Takeaway', 'Delivery'].forEach((label) => {
    const res = pill(ctx, label, pillX, identityY + (compact ? 68 : 88), {
      fill: '#f1f5f9',
      stroke: 'transparent',
      color: C.ink,
      size: compact ? 11 : 13,
      padX: compact ? 10 : 12,
      padY: compact ? 6 : 7,
    });
    pillX += res.width + 8;
  });

  const statusY = identityY + (compact ? 112 : 136);
  pill(ctx, 'Open · closes 10:00 PM', x + 26, statusY, {
    fill: C.greenSoft,
    stroke: '#bbf7d0',
    color: '#166534',
    size: compact ? 11 : 13,
    padX: 12,
    padY: 7,
  });
  pill(ctx, 'Official Page', x + (compact ? 192 : 222), statusY, {
    fill: C.greenSoft,
    stroke: '#bbf7d0',
    color: '#166534',
    size: compact ? 11 : 13,
    padX: 12,
    padY: 7,
  });
  if (!compact) {
    text(ctx, 'Google rating: 4.3 (demo)', x + 380, statusY + 8, { size: 13, color: C.muted, weight: 700 });
  }

  if (!compact) {
    rounded(ctx, x + w - 330, y + 70, 300, 138, 20, C.white, C.border);
    const actionButtons = [
      ['Call', x + w - 304, y + 88, 122],
      ['Directions', x + w - 166, y + 88, 122],
      ['WhatsApp', x + w - 304, y + 150, 260],
    ];
    actionButtons.forEach(([label, ax, ay, aw]) => {
      rounded(ctx, ax, ay, aw, 46, 14, '#f8fafc', C.border);
      dot(ctx, ax + 22, ay + 23, label === 'WhatsApp' ? '#22c55e' : label === 'Directions' ? '#ef4444' : C.amber, 10);
      text(ctx, label, ax + 42, ay + 14, { size: 14, weight: 700 });
    });
  }

  const menuY = y + (compact ? 240 : 230);
  const cardGap = 16;
  const cardW = (w - 52 - cardGap) / 2;
  const cardH = compact ? 120 : 130;
  [
    ['View Main Menu', demo.items[0].color],
    ['View Breakfast Menu', demo.items[3].color],
  ].forEach(([label, color], index) => {
    const cx = x + 26 + index * (cardW + cardGap);
    rounded(ctx, cx, menuY, cardW, cardH, 16, C.white, C.border);
    imageTile(ctx, cx, menuY, cardW, cardH, color);
    const overlay = ctx.createLinearGradient(cx, menuY + cardH * 0.46, cx, menuY + cardH);
    overlay.addColorStop(0, 'rgba(15, 23, 42, 0)');
    overlay.addColorStop(1, 'rgba(15, 23, 42, 0.68)');
    rounded(ctx, cx, menuY, cardW, cardH, 16, overlay);
    text(ctx, label, cx + cardW / 2, menuY + cardH - 38, {
      size: compact ? 16 : 18,
      weight: 800,
      color: C.white,
      align: 'center',
    });
  });

  if (!compact) {
    const infoY = menuY + cardH + 16;
    const infoW = (w - 52 - 32) / 3;
    [
      ['Business Hours', 'Open today, 9 AM - 10 PM'],
      ['Service Options', 'Dine-in · Takeaway · Delivery'],
      ['Payment Options', 'Cash · Cards · UPI'],
    ].forEach(([title, detail], index) => {
      const ix = x + 26 + index * (infoW + 16);
      rounded(ctx, ix, infoY, infoW, 70, 16, C.white, C.border);
      text(ctx, title, ix + 16, infoY + 13, { size: 12, weight: 800, color: C.muted });
      text(ctx, detail, ix + 16, infoY + 36, { size: 13, weight: 700, maxWidth: infoW - 32, lineHeight: 16 });
    });
  } else {
    let actionX = x + 26;
    demo.actions.forEach((action) => {
      const res = pill(ctx, action, actionX, menuY + cardH + 22, {
        fill: C.white,
        stroke: C.border,
        color: C.ink,
        size: 11,
        padX: 10,
        padY: 6,
      });
      actionX += res.width + 8;
    });
  }
}

function drawObpBrowser(ctx, x, y, w, h) {
  const box = drawBrowserFrame(ctx, x, y, w, h, demo.url);
  drawObpContent(ctx, box);
}

function drawSourceCard(ctx, x, y, w, h, title = demo.source, options = {}) {
  shadow(ctx, 24, 'rgba(37, 99, 235, 0.14)', 0, 12);
  rounded(ctx, x, y, w, h, 22, C.white, '#bfdbfe');
  clearShadow(ctx);
  pill(ctx, 'MenuList source', x + 22, y + 22, {
    fill: C.blueSoft,
    stroke: '#bfdbfe',
    color: C.blueDark,
    size: 12,
  });
  text(ctx, title, x + 22, y + 68, { size: 24, weight: 800, maxWidth: w - 44, lineHeight: 29 });
  const rows = options.rows ?? [
    ['Menu', 'Current'],
    ['Business details', 'Approved'],
    ['Public status', 'Visible'],
  ];
  for (let i = 0; i < rows.length; i += 1) {
    const yy = y + 126 + i * 42;
    text(ctx, rows[i][0], x + 22, yy, { size: 14, color: C.muted });
    pill(ctx, rows[i][1], x + w - 112, yy - 4, {
      fill: i === 0 ? C.greenSoft : C.white,
      stroke: i === 0 ? '#bbf7d0' : C.border,
      color: i === 0 ? '#166534' : C.ink,
      size: 12,
      padX: 10,
      padY: 6,
    });
  }
}

function drawSurfacePills(ctx, x, y) {
  const surfaces = ['Official page', 'QR menu', 'Saved shortcut', 'Issue reports', 'PDF', 'Public link'];
  let cx = x;
  for (const surface of surfaces) {
    const res = pill(ctx, surface, cx, y, { fill: C.white, stroke: C.border, color: C.ink, size: 13 });
    cx += res.width + 10;
  }
}

function drawHeroComposite() {
  const { canvas, ctx } = makeCanvas(1600, 1000, '#f8fbff');
  text(ctx, 'One owner-approved source', 92, 88, { size: 48, weight: 800, maxWidth: 460, lineHeight: 54 });
  text(ctx, 'Public menu, Official Business Page, QR assets and customer actions stay aligned.', 94, 275, {
    size: 22,
    color: C.muted,
    maxWidth: 420,
    lineHeight: 31,
  });
  drawSourceCard(ctx, 94, 385, 370, 260);
  drawObpBrowser(ctx, 575, 118, 640, 570);
  drawPublicMenuPhone(ctx, 1252, 245, 250, 560, true);
  drawSurfacePills(ctx, 575, 750);
  text(ctx, 'MenuList', 94, 880, { size: 24, weight: 800, color: C.blueDark });
  text(ctx, 'The official source for what customers see', 94, 913, { size: 18, color: C.muted });
  return canvas;
}

function drawOgImage() {
  const { canvas, ctx } = makeCanvas(1200, 630, '#f8fbff');
  logoMark(ctx, 70, 62, 48);
  text(ctx, 'MenuList', 132, 70, { size: 25, weight: 800, color: C.ink });
  text(ctx, 'One official customer link for menus and services.', 70, 150, {
    size: 48,
    weight: 800,
    maxWidth: 510,
    lineHeight: 56,
  });
  text(ctx, 'Start from a menu, service list, price list, or catalogue. Review before publishing. Use one current link for QR, WhatsApp, Instagram and print.', 72, 350, {
    size: 20,
    color: C.muted,
    maxWidth: 505,
    lineHeight: 29,
  });
  drawSourceCard(ctx, 640, 88, 245, 260, 'Owner-approved public list', {
    rows: [
      ['Public list', 'Current'],
      ['Business details', 'Approved'],
      ['Customer link', 'Live'],
    ],
  });
  drawServiceListPhone(ctx, 922, 64, 220, 540);
  pill(ctx, 'Review before publishing', 70, 520, { fill: C.white, stroke: C.border, color: C.ink, size: 14 });
  pill(ctx, 'QR and customer link included', 285, 520, { fill: C.white, stroke: C.border, color: C.ink, size: 14 });
  pill(ctx, 'No desktop required', 530, 520, { fill: C.white, stroke: C.border, color: C.ink, size: 14 });
  return canvas;
}

function drawPublicMenuAsset() {
  const { canvas, ctx } = makeCanvas(900, 1400, '#f8fbff');
  text(ctx, 'What customers see on their phone', 90, 70, { size: 34, weight: 800 });
  text(ctx, 'Search, sections, prices, language and freshness stay readable from the current source.', 92, 118, {
    size: 19,
    color: C.muted,
    maxWidth: 700,
    lineHeight: 27,
  });
  drawPublicMenuPhone(ctx, 260, 210, 380, 880);
  pill(ctx, 'Current menu', 126, 1160, { fill: C.greenSoft, stroke: '#bbf7d0', color: '#166534' });
  pill(ctx, 'Language ready', 310, 1160, { fill: C.white, stroke: C.border, color: C.ink });
  pill(ctx, 'Customer-readable', 515, 1160, { fill: C.white, stroke: C.border, color: C.ink });
  return canvas;
}

function drawObpAsset() {
  const { canvas, ctx } = makeCanvas(1400, 900, '#f8fbff');
  text(ctx, 'One official business page', 90, 65, { size: 40, weight: 800 });
  text(ctx, 'Business details, actions and the current menu live behind one official public link.', 92, 121, {
    size: 20,
    color: C.muted,
    maxWidth: 760,
    lineHeight: 28,
  });
  drawObpBrowser(ctx, 95, 195, 960, 580);
  drawSourceCard(ctx, 1090, 380, 250, 250, 'Same source as the public menu');
  return canvas;
}

function drawUploadCard(ctx, x, y, w, h) {
  rounded(ctx, x, y, w, h, 24, C.white, C.border);
  text(ctx, 'Upload current menu', x + 28, y + 26, { size: 24, weight: 800 });
  text(ctx, 'Start from a photo, PDF or existing file.', x + 28, y + 64, { size: 15, color: C.muted });
  rounded(ctx, x + 28, y + 118, w - 56, 126, 18, '#f8fafc', C.border);
  text(ctx, 'menu-photo.jpg', x + 58, y + 153, { size: 17, weight: 800 });
  text(ctx, 'Ready for review', x + 58, y + 184, { size: 14, color: C.green });
  pill(ctx, 'Owner keeps control', x + 28, y + h - 62, { fill: C.blueSoft, stroke: '#bfdbfe', color: C.blueDark });
}

function drawReviewCard(ctx, x, y, w, h) {
  rounded(ctx, x, y, w, h, 24, C.white, C.border);
  text(ctx, 'Review prepared source', x + 28, y + 26, { size: 24, weight: 800 });
  text(ctx, 'MenuList prepares structure before anything goes public.', x + 28, y + 64, {
    size: 15,
    color: C.muted,
    maxWidth: w - 56,
    lineHeight: 21,
  });
  const rows = [
    ['Paneer Tikka Bowl', 'Rs. 220', 'Approved'],
    ['Cold Coffee', 'Rs. 120', 'Approved'],
    ['Veg Club Sandwich', 'Rs. 180', 'Needs photo'],
  ];
  for (let i = 0; i < rows.length; i += 1) {
    const yy = y + 132 + i * 56;
    const rowX = x + 28;
    const rowW = w - 56;
    const compact = rowW < 300;
    rounded(ctx, rowX, yy, rowW, compact ? 48 : 42, 12, '#f8fafc', C.border);
    text(ctx, rows[i][0], rowX + 16, yy + 10, {
      size: compact ? 13 : 14,
      weight: 700,
      maxWidth: compact ? rowW - 112 : rowW - 205,
      lineHeight: 16,
    });
    text(ctx, rows[i][1], rowX + (compact ? 16 : rowW - 152), yy + (compact ? 29 : 12), {
      size: compact ? 11 : 14,
      weight: 700,
      color: C.blue,
    });
    text(ctx, rows[i][2], rowX + rowW - (compact ? 76 : 86), yy + (compact ? 17 : 12), {
      size: compact ? 11 : 12,
      weight: 700,
      color: i === 2 ? '#92400e' : '#166534',
    });
  }
}

function drawPublishCard(ctx, x, y, w, h) {
  rounded(ctx, x, y, w, h, 24, C.white, C.border);
  text(ctx, 'Publish public source', x + 28, y + 26, { size: 24, weight: 800 });
  text(ctx, 'The same approved source appears across MenuList-controlled surfaces.', x + 28, y + 64, {
    size: 15,
    color: C.muted,
    maxWidth: w - 56,
    lineHeight: 21,
  });
  const rows = [
    ['Official page', 'Visible'],
    ['Public menu', 'Current'],
    ['QR and share links', 'Ready'],
  ];
  for (let i = 0; i < rows.length; i += 1) {
    const yy = y + 132 + i * 58;
    text(ctx, rows[i][0], x + 34, yy, { size: 16, weight: 800 });
    pill(ctx, rows[i][1], x + w - 132, yy - 5, {
      fill: C.greenSoft,
      stroke: '#bbf7d0',
      color: '#166534',
      size: 12,
      padX: 10,
      padY: 6,
    });
  }
}

function drawSetupWorkflow() {
  const { canvas, ctx } = makeCanvas(1600, 900, '#f8fbff');
  text(ctx, 'Upload. Review. Publish.', 88, 72, { size: 46, weight: 800 });
  text(ctx, 'MenuList prepares the public source before anything goes live.', 92, 133, {
    size: 20,
    color: C.muted,
    maxWidth: 780,
    lineHeight: 28,
  });
  drawUploadCard(ctx, 90, 245, 430, 445);
  drawReviewCard(ctx, 585, 245, 430, 445);
  drawPublishCard(ctx, 1080, 245, 430, 445);
  text(ctx, 'Owner approval stays before publishing. External placements remain owner-controlled.', 92, 780, {
    size: 16,
    color: C.muted,
  });
  return canvas;
}

function qr(ctx, x, y, size) {
  rounded(ctx, x, y, size, size, 18, C.white, C.border);
  const grid = [
    '111101001111',
    '100101101001',
    '101101001101',
    '111100111111',
    '000101010000',
    '110011101011',
    '101010011010',
    '001111010100',
    '111001111101',
    '100101000101',
    '101101110101',
    '111101001111',
  ];
  const cell = (size - 42) / grid.length;
  for (let r = 0; r < grid.length; r += 1) {
    for (let c = 0; c < grid[r].length; c += 1) {
      if (grid[r][c] === '1') {
        rounded(ctx, x + 21 + c * cell, y + 21 + r * cell, cell * 0.82, cell * 0.82, 2, C.ink);
      }
    }
  }
}

function drawMiniSurface(ctx, x, y, w, h, title, kind) {
  rounded(ctx, x, y, w, h, 22, C.white, C.border);
  text(ctx, title, x + 22, y + 20, { size: 18, weight: 800 });
  if (kind === 'qr') {
    qr(ctx, x + w - 138, y + 70, 92);
    text(ctx, demo.menuUrl, x + 22, y + 84, { size: 14, color: C.muted, maxWidth: w - 190, lineHeight: 19 });
  } else if (kind === 'obp') {
    text(ctx, 'Menu, hours, photos and actions', x + 22, y + 82, {
      size: 14,
      color: C.muted,
      maxWidth: w - 44,
      lineHeight: 20,
    });
    pill(ctx, 'Current', x + 22, y + 142, { fill: C.greenSoft, stroke: '#bbf7d0', color: '#166534', size: 12 });
  } else if (kind === 'screen') {
    rounded(ctx, x + 22, y + 68, w - 44, 84, 14, C.navy);
    text(ctx, 'Today specials', x + 44, y + 90, { size: 17, weight: 800, color: C.white });
    text(ctx, 'Current from MenuList', x + 44, y + 120, { size: 13, color: '#bfdbfe' });
  } else if (kind === 'pdf') {
    rounded(ctx, x + 22, y + 62, 92, 114, 12, '#f8fafc', C.border);
    for (let i = 0; i < 4; i += 1) {
      rounded(ctx, x + 42, y + 86 + i * 18, 52, 5, 3, i === 0 ? C.blue : C.borderStrong);
    }
    text(ctx, 'Exportable menu asset', x + 132, y + 90, { size: 14, color: C.muted, maxWidth: w - 160, lineHeight: 20 });
  } else if (kind === 'phone') {
    drawTinyPhone(ctx, x + w - 126, y + 58, 92, 150);
    text(ctx, 'Search, sections and prices', x + 22, y + 90, { size: 14, color: C.muted, maxWidth: w - 160, lineHeight: 20 });
  } else if (kind === 'actions') {
    const actions = ['Call', 'WhatsApp', 'Directions'];
    let cy = y + 76;
    actions.forEach((action) => {
      pill(ctx, action, x + 22, cy, { fill: C.white, stroke: C.border, color: C.ink, size: 12, padX: 10, padY: 6 });
      cy += 38;
    });
  } else if (kind === 'search') {
    rounded(ctx, x + 22, y + 72, w - 44, 42, 14, '#f8fafc', C.border);
    text(ctx, 'Readable public page data', x + 42, y + 84, { size: 13, color: C.muted });
    text(ctx, 'No ranking promises', x + 22, y + 142, { size: 14, color: C.muted, maxWidth: w - 44, lineHeight: 20 });
  } else if (kind === 'activity') {
    text(ctx, 'Views', x + 22, y + 80, { size: 13, color: C.muted, weight: 800 });
    text(ctx, '186', x + 22, y + 105, { size: 34, color: C.ink, weight: 800 });
    pill(ctx, 'Freshness visible', x + 118, y + 112, { fill: C.greenSoft, stroke: '#bbf7d0', color: '#166534', size: 12 });
  } else if (kind === 'issues') {
    let cy = y + 72;
    demo.issueTypes.forEach((issue) => {
      pill(ctx, issue, x + 22, cy, { fill: issue === 'Wrong price' ? C.amberSoft : C.white, stroke: issue === 'Wrong price' ? '#fde68a' : C.border, color: issue === 'Wrong price' ? '#92400e' : C.ink, size: 12, padX: 10, padY: 6 });
      cy += 38;
    });
    text(ctx, 'Owner reviews before correcting source', x + 22, y + 184, { size: 12, color: C.muted, maxWidth: w - 44, lineHeight: 16 });
  } else if (kind === 'shortcut') {
    drawTinyPhone(ctx, x + w - 126, y + 58, 92, 150);
    text(ctx, 'Saved menu shortcut', x + 22, y + 90, { size: 14, color: C.muted, maxWidth: w - 160, lineHeight: 20 });
  } else {
    text(ctx, 'Visible from the same owner-approved source.', x + 22, y + 82, { size: 14, color: C.muted, maxWidth: w - 44, lineHeight: 20 });
    pill(ctx, 'Current', x + 22, y + 142, { fill: C.greenSoft, stroke: '#bbf7d0', color: '#166534', size: 12 });
  }
}

function drawTinyPhone(ctx, x, y, w, h) {
  rounded(ctx, x, y, w, h, 22, '#0b1220');
  rounded(ctx, x + 6, y + 8, w - 12, h - 16, 17, C.white);
  rounded(ctx, x + w / 2 - 15, y + 14, 30, 5, 3, '#0b1220');
  rounded(ctx, x + 14, y + 31, 14, 14, 5, '#fff7ed', '#fed7aa');
  text(ctx, 'DP', x + 21, y + 34, { size: 5, weight: 800, color: '#7c2d12', align: 'center' });
  text(ctx, demo.business, x + 32, y + 31, { size: 7, weight: 800, maxWidth: w - 48, lineHeight: 9 });
  text(ctx, 'Main Menu', x + 32, y + 42, { size: 5, color: C.muted });
  rounded(ctx, x + 14, y + 58, w - 28, 16, 7, '#f8fafc', C.border);
  rounded(ctx, x + 14, y + 82, 27, 10, 5, C.blue);
  rounded(ctx, x + 45, y + 82, 22, 10, 5, C.white, C.border);
  rounded(ctx, x + 14, y + 101, w - 28, 15, 6, '#f8fafc', C.border);
  const yy = y + 122;
  rounded(ctx, x + 14, yy, w - 28, 18, 7, C.white, C.border);
  imageTile(ctx, x + 19, yy + 4, 10, 10, demo.items[0].color);
  rounded(ctx, x + 34, yy + 5, 31, 3, 2, C.slate);
  rounded(ctx, x + 34, yy + 12, 18, 3, 2, C.blueSoft);
}

function drawSurfaceMatrix() {
  const { canvas, ctx } = makeCanvas(1600, 1000, '#f8fbff');
  text(ctx, 'One source for every customer-facing place', 92, 70, { size: 46, weight: 800 });
  text(ctx, 'The public page, QR menu, share link, customer actions, activity signals and issue reports point back to the same approved menu.', 94, 132, {
    size: 20,
    color: C.muted,
    maxWidth: 980,
    lineHeight: 29,
  });
  const items = [
    [92, 230, 'Official Business Page', 'obp'],
    [92, 470, 'QR and share link', 'qr'],
    [92, 710, 'Saved shortcut', 'shortcut'],
    [1098, 230, 'Mobile public menu', 'phone'],
    [1098, 470, 'Customer actions', 'actions'],
    [1098, 710, 'Customer-reported issues', 'issues'],
    [620, 176, 'Clear public source', 'search'],
    [620, 710, 'Simple activity signals', 'activity'],
  ];
  ctx.strokeStyle = '#bfdbfe';
  ctx.lineWidth = 2;
  for (const [x, y] of items) {
    ctx.beginPath();
    ctx.moveTo(800, 520);
    ctx.lineTo(x + 180, y + 110);
    ctx.stroke();
  }
  drawSourceCard(ctx, 620, 395, 360, 250);
  for (const [x, y, title, kind] of items) {
    drawMiniSurface(ctx, x, y, 360, 210, title, kind);
  }
  return canvas;
}

function drawDashboardProof() {
  const { canvas, ctx } = makeCanvas(1500, 900, '#f8fbff');
  text(ctx, 'Simple activity signals', 88, 70, { size: 44, weight: 800 });
  text(ctx, 'Owners can see usage and freshness without managing another dashboard.', 90, 128, {
    size: 20,
    color: C.muted,
    maxWidth: 820,
    lineHeight: 28,
  });
  rounded(ctx, 90, 220, 1020, 560, 28, C.white, C.border);
  text(ctx, 'Today', 132, 260, { size: 30, weight: 800 });
  const metricCards = [
    ['Menu opens', '186', '+14%'],
    ['Official page views', '74', '+8%'],
    ['QR/link activity', '39', 'stable'],
  ];
  for (let i = 0; i < metricCards.length; i += 1) {
    const x = 132 + i * 300;
    rounded(ctx, x, 325, 260, 128, 20, '#f8fafc', C.border);
    text(ctx, metricCards[i][0], x + 22, 349, { size: 15, color: C.muted, weight: 700 });
    text(ctx, metricCards[i][1], x + 22, 382, { size: 36, weight: 800, color: C.ink });
    text(ctx, metricCards[i][2], x + 170, 395, { size: 14, color: C.green, weight: 800 });
  }
  rounded(ctx, 132, 500, 420, 204, 20, '#f8fafc', C.border);
  text(ctx, 'Top customer actions', 160, 530, { size: 19, weight: 800 });
  ['Viewed menu', 'Tapped directions', 'Opened WhatsApp'].forEach((label, i) => {
    text(ctx, label, 160, 575 + i * 36, { size: 15, color: C.muted });
    rounded(ctx, 330, 578 + i * 36, 150 - i * 28, 10, 5, i === 0 ? C.blue : '#bfdbfe');
  });
  rounded(ctx, 590, 500, 450, 204, 20, C.blueSoft, '#bfdbfe');
  text(ctx, 'Menu state is stable', 620, 535, { size: 24, weight: 800, color: C.blueDark });
  text(ctx, 'No action needed. Customers are reaching the current public source.', 622, 581, {
    size: 16,
    color: C.blueDark,
    maxWidth: 370,
    lineHeight: 24,
  });
  drawPublicMenuPhone(ctx, 1145, 255, 250, 500, true, { maxItems: 2 });
  return canvas;
}

function drawLaunchSquare() {
  const { canvas, ctx } = makeCanvas(1080, 1080, '#f8fbff');
  logoMark(ctx, 88, 80, 56);
  text(ctx, 'MenuList', 158, 92, { size: 26, weight: 800 });
  text(ctx, 'Start with your current menu.', 88, 190, { size: 58, weight: 800, maxWidth: 720, lineHeight: 64 });
  text(ctx, 'Publish one official source customers can trust.', 92, 350, {
    size: 28,
    color: C.muted,
    maxWidth: 620,
    lineHeight: 38,
  });
  drawUploadCard(ctx, 88, 480, 280, 340);
  drawReviewCard(ctx, 400, 480, 300, 340);
  drawPublicMenuPhone(ctx, 738, 440, 236, 480, true, { maxItems: 2 });
  pill(ctx, 'Review before publishing', 88, 910, { fill: C.white, stroke: C.border, color: C.muted, size: 14 });
  return canvas;
}

async function save(canvas, filename, type) {
  const mime = type === 'webp' ? 'image/webp' : 'image/png';
  const buffer = canvas.toBuffer(mime);
  const out = path.join(publicDir, filename);
  await fs.writeFile(out, buffer);
  return { filename, bytes: buffer.length };
}

async function main() {
  await fs.mkdir(publicDir, { recursive: true });
  await fs.mkdir(notesDir, { recursive: true });
  menuListLogoImage = await loadImage(path.join(repoRoot, 'public/icons/android-chrome-512x512.png')).catch(() => null);

  const outputs = [];
  outputs.push(await save(drawHeroComposite(), 'menulist-hero-official-source.webp', 'webp'));
  outputs.push(await save(drawOgImage(), 'menulist-og-official-source.png', 'png'));
  outputs.push(await save(drawPublicMenuAsset(), 'menulist-public-menu-mobile.webp', 'webp'));
  outputs.push(await save(drawObpAsset(), 'menulist-obp-browser.webp', 'webp'));
  outputs.push(await save(drawSetupWorkflow(), 'menulist-setup-relief-workflow.webp', 'webp'));
  outputs.push(await save(drawSurfaceMatrix(), 'menulist-public-surfaces-matrix.webp', 'webp'));
  outputs.push(await save(drawDashboardProof(), 'menulist-analytics-proof.webp', 'webp'));
  outputs.push(await save(drawLaunchSquare(), 'menulist-launch-square.png', 'png'));
  outputs.push(await save(drawOgImage(), 'menulist-linkedin-launch.png', 'png'));

  await fs.copyFile(
    path.join(publicDir, 'menulist-og-official-source.png'),
    path.join(repoRoot, 'public/og-image.png'),
  );

  const note = [
    '# Stage 6.3 P0 Fictional Demo Asset Pack',
    '',
    'Generated: 2026-05-21',
    '',
    'These public website assets use a fictional founder-approved MenuList demo business. They intentionally avoid real customer names, unapproved extracted third-party menu data, private phone numbers, private addresses, real customer metrics, and external-platform auto-sync claims.',
    '',
    'The pack is product-derived and deterministic: the visuals are generated from MenuList surface concepts, current homepage strategy, and the official `public/icons/android-chrome-512x512.png` logo asset. They are not testimonials or real customer proof.',
    '',
    '## Reference Alignment',
    '',
    '- Checked the current public OBP/menu rendering shape against the MenuList public runtime and the Habibis reference captures in `__docs__/main-website/asset-production/stage-06-4-reference/`.',
    '- Kept the marketing asset theme light because customer public pages can use business-specific themes.',
    '- Aligned the demo OBP with real MenuList anatomy: language pills, business identity, service modes, open/official badges, action buttons, menu cards, and utility tiles.',
    '- Aligned the demo menu with real MenuList anatomy: business header, menu title, search, category chips, featured/category rhythm, image-backed item cards, descriptions, and prices.',
    '',
    '## Generated Files',
    '',
    ...outputs.map((item) => `- public/images/website/${item.filename} (${Math.round(item.bytes / 1024)} KB)`),
    '- public/og-image.png (copy of public/images/website/menulist-og-official-source.png for backward compatibility)',
    '',
    '## Demo Identity',
    '',
    '- Business: The Daily Plate',
    '- Type: Cafe and lunch kitchen',
    '- Location: Indiranagar, Bengaluru',
    '- Currency: Rs.',
    '- Menu data: fictional owner-approved demo data',
    '- Demo business logo: generated `DP` mark for the fictional business',
    '- MenuList brand/source logo: official MenuList icon from `public/icons/android-chrome-512x512.png`',
    '',
    '## Public Usage Rule',
    '',
    'These can be used as launch-safe demo visuals, but they should be described as demo product visuals, not screenshots from a real customer account.',
    '',
    '## Next Upgrade Gate',
    '',
    'When a clean demo tenant exists in staging/production, recapture the same surfaces from real routed pages and replace this generated pack with browser screenshots.',
    '',
  ].join('\n');

  const notePath = path.join(notesDir, 'stage-06-3-p0-fictional-demo-asset-pack.md');
  await fs.writeFile(notePath, note);
  console.log(JSON.stringify({ outputs, note: path.relative(repoRoot, notePath) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
