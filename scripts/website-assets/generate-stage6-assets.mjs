import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const publicDir = path.join(repoRoot, 'public/images/website');
const notesDir = path.join(repoRoot, '__docs__/main-website/asset-production/stage-06-1');

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
  blue: '#2563eb',
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
  url: 'thedailyplate.menulist.online',
  menuUrl: 'thedailyplate.menulist.online/menu',
  updated: 'Updated today',
  source: 'Owner-approved source',
  items: [
    { name: 'Paneer Tikka Bowl', desc: 'Charred paneer, rice, mint chutney', price: 'Rs. 220', color: '#f97316' },
    { name: 'Masala Oats Bowl', desc: 'Warm oats, vegetables, house spices', price: 'Rs. 160', color: '#22c55e' },
    { name: 'Cold Coffee', desc: 'Classic iced coffee with milk', price: 'Rs. 120', color: '#0ea5e9' },
    { name: 'Veg Club Sandwich', desc: 'Three-layer sandwich, fries', price: 'Rs. 180', color: '#eab308' },
  ],
  categories: ['Popular', 'Bowls', 'Snacks', 'Drinks'],
  actions: ['Call', 'WhatsApp', 'Directions'],
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

function drawMenuContent(ctx, box, compact = false) {
  const { x, y, w } = box;
  const narrow = w < 290;
  text(ctx, demo.business, x + 18, y + 10, { size: narrow ? 17 : compact ? 20 : 24, weight: 800 });
  text(ctx, `${demo.subline} - ${demo.city}`, x + 18, y + (narrow ? 36 : 40), { size: narrow ? 10 : 12, color: C.muted });
  pill(ctx, demo.updated, x + 18, y + 66, {
    fill: C.greenSoft,
    stroke: '#bbf7d0',
    color: '#166534',
    size: narrow ? 10 : 12,
    padX: narrow ? 8 : 10,
    padY: narrow ? 5 : 6,
  });

  rounded(ctx, x + 18, y + 108, w - 36, 46, 14, '#f8fafc', C.border);
  text(ctx, narrow ? 'Search menu' : 'Search bowls, snacks, drinks', x + 38, y + 122, { size: narrow ? 12 : 14, color: C.muted });
  dot(ctx, x + w - 46, y + 131, C.blue, 5);

  let cx = x + 18;
  const categories = demo.categories.slice(0, narrow ? 2 : demo.categories.length);
  for (let i = 0; i < categories.length; i += 1) {
    const cat = categories[i];
    const active = i === 0;
    const res = pill(ctx, cat, cx, y + 172, {
      fill: active ? C.blue : C.white,
      stroke: active ? C.blue : C.border,
      color: active ? C.white : C.muted,
      size: narrow ? 10 : 12,
      padX: narrow ? 9 : 12,
      padY: narrow ? 6 : 7,
    });
    cx += res.width + 8;
  }

  let itemY = y + 222;
  const itemHeight = narrow ? 84 : compact ? 112 : 126;
  for (const item of demo.items.slice(0, narrow ? 3 : compact ? 3 : 4)) {
    rounded(ctx, x + 18, itemY, w - 36, itemHeight, 18, C.white, C.border);
    const imageSize = narrow ? 46 : 76;
    const imageX = x + 32;
    const copyX = imageX + imageSize + (narrow ? 12 : 16);
    imageTile(ctx, imageX, itemY + 16, imageSize, imageSize, item.color);
    text(ctx, item.name, copyX, itemY + 17, { size: narrow ? 11 : 15, weight: 800, maxWidth: w - (copyX - x) - 28, lineHeight: narrow ? 13 : 19 });
    if (!narrow) {
      text(ctx, item.desc, copyX, itemY + 43, { size: 11, color: C.muted, maxWidth: w - (copyX - x) - 32, lineHeight: 15 });
    }
    text(ctx, item.price, copyX, itemY + itemHeight - (narrow ? 24 : 32), { size: narrow ? 11 : 14, weight: 800, color: C.blue });
    itemY += itemHeight + 14;
  }
}

function drawPublicMenuPhone(ctx, x, y, w, h, compact = false) {
  const content = drawPhoneShell(ctx, x, y, w, h);
  drawMenuContent(ctx, content, compact);
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
  const { x, y, w } = box;
  rounded(ctx, x, y, w, 170, 22, '#eff6ff', C.border);
  logoMark(ctx, x + 28, y + 28, 58);
  if (w >= 620) {
    pill(ctx, 'Official Business Page', x + w - 228, y + 34, {
      fill: C.white,
      stroke: '#bfdbfe',
      color: C.blueDark,
      size: 13,
    });
  }
  text(ctx, demo.business, x + 110, y + 36, { size: 32, weight: 800, color: C.ink });
  text(ctx, `${demo.subline} - ${demo.city}`, x + 112, y + 78, { size: 16, color: C.muted });
  text(ctx, 'Menu, hours, photos and actions are published from one source.', x + 112, y + 108, {
    size: 15,
    color: C.muted,
    maxWidth: w - 150,
    lineHeight: 20,
  });

  const buttonY = y + 204;
  const buttonW = (w - 36) / 3;
  for (let i = 0; i < demo.actions.length; i += 1) {
    rounded(ctx, x + i * (buttonW + 18), buttonY, buttonW, 52, 16, C.white, C.border);
    text(ctx, demo.actions[i], x + i * (buttonW + 18) + buttonW / 2, buttonY + 17, {
      size: 15,
      weight: 800,
      color: C.ink,
      align: 'center',
    });
  }

  rounded(ctx, x, buttonY + 82, w, 76, 18, C.blue);
  text(ctx, 'View current menu', x + 28, buttonY + 105, { size: 20, weight: 800, color: C.white });
  text(ctx, 'Fresh from the owner-approved source', x + w - 28, buttonY + 109, {
    size: 14,
    color: '#dbeafe',
    align: 'right',
  });

  const cardY = buttonY + 188;
  const cardW = (w - 36) / 3;
  const cards = [
    ['Hours', 'Open today, 9 AM to 10 PM'],
    ['Languages', 'English, Hindi'],
    ['Freshness', 'Menu state is stable'],
  ];
  for (let i = 0; i < cards.length; i += 1) {
    const cx = x + i * (cardW + 18);
    rounded(ctx, cx, cardY, cardW, 96, 18, C.white, C.border);
    text(ctx, cards[i][0], cx + 18, cardY + 18, { size: 13, weight: 800, color: C.muted });
    text(ctx, cards[i][1], cx + 18, cardY + 44, {
      size: 16,
      weight: 800,
      color: C.ink,
      maxWidth: cardW - 36,
      lineHeight: 19,
    });
  }
}

function drawObpBrowser(ctx, x, y, w, h) {
  const box = drawBrowserFrame(ctx, x, y, w, h, demo.url);
  drawObpContent(ctx, box);
}

function drawSourceCard(ctx, x, y, w, h, title = demo.source) {
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
  const rows = [
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
  const surfaces = ['Official page', 'QR menu', 'Customer app', 'Digital screen', 'PDF', 'Public link'];
  let cx = x;
  for (const surface of surfaces) {
    const res = pill(ctx, surface, cx, y, { fill: C.white, stroke: C.border, color: C.ink, size: 13 });
    cx += res.width + 10;
  }
}

function drawHeroComposite() {
  const { canvas, ctx } = makeCanvas(1600, 1000, '#f8fbff');
  text(ctx, 'One owner-approved source', 92, 88, { size: 48, weight: 800, maxWidth: 460, lineHeight: 54 });
  text(ctx, 'Public menu, Official Business Page, QR assets and customer surfaces stay aligned.', 94, 275, {
    size: 22,
    color: C.muted,
    maxWidth: 420,
    lineHeight: 31,
  });
  drawSourceCard(ctx, 94, 385, 370, 260);
  drawObpBrowser(ctx, 585, 118, 700, 570);
  drawPublicMenuPhone(ctx, 1220, 245, 270, 560, true);
  drawSurfacePills(ctx, 585, 750);
  text(ctx, 'MenuList', 94, 880, { size: 24, weight: 800, color: C.blueDark });
  text(ctx, 'The official source for what customers see', 94, 913, { size: 18, color: C.muted });
  return canvas;
}

function drawOgImage() {
  const { canvas, ctx } = makeCanvas(1200, 630, '#f8fbff');
  logoMark(ctx, 70, 62, 48);
  text(ctx, 'MenuList', 132, 68, { size: 24, weight: 800, color: C.ink });
  text(ctx, 'The official source for what customers see.', 70, 155, {
    size: 54,
    weight: 800,
    maxWidth: 480,
    lineHeight: 60,
  });
  text(ctx, 'One menu and business source for public pages, QR assets, customer app, screens and share links.', 72, 355, {
    size: 21,
    color: C.muted,
    maxWidth: 450,
    lineHeight: 30,
  });
  drawObpBrowser(ctx, 565, 78, 470, 345);
  drawPublicMenuPhone(ctx, 955, 170, 185, 350, true);
  drawSurfacePills(ctx, 70, 520);
  return canvas;
}

function drawPublicMenuAsset() {
  const { canvas, ctx } = makeCanvas(900, 1400, '#f8fbff');
  text(ctx, 'Mobile public menu proof', 90, 70, { size: 34, weight: 800 });
  text(ctx, 'Customers search, browse sections, see prices and trust freshness from the current source.', 92, 118, {
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
  text(ctx, 'Official Business Page proof', 90, 65, { size: 40, weight: 800 });
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
    rounded(ctx, x + 28, yy, w - 56, 42, 12, '#f8fafc', C.border);
    text(ctx, rows[i][0], x + 44, yy + 12, { size: 14, weight: 700 });
    text(ctx, rows[i][1], x + w - 180, yy + 12, { size: 14, weight: 700, color: C.blue });
    text(ctx, rows[i][2], x + w - 92, yy + 12, { size: 12, weight: 700, color: i === 2 ? '#92400e' : '#166534' });
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
  text(ctx, 'Setup work is prepared before launch', 88, 72, { size: 46, weight: 800 });
  text(ctx, 'Use synthetic demo content here until founder-approved product data is ready.', 92, 133, {
    size: 20,
    color: C.muted,
    maxWidth: 780,
    lineHeight: 28,
  });
  drawUploadCard(ctx, 90, 245, 430, 445);
  drawReviewCard(ctx, 585, 245, 430, 445);
  drawPublishCard(ctx, 1080, 245, 430, 445);
  text(ctx, 'No real customer data. No third-party menu data. No automatic external-platform sync claims.', 92, 780, {
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
  } else {
    text(ctx, 'Visible from the same owner-approved source.', x + 22, y + 82, { size: 14, color: C.muted, maxWidth: w - 44, lineHeight: 20 });
    pill(ctx, 'Current', x + 22, y + 142, { fill: C.greenSoft, stroke: '#bbf7d0', color: '#166534', size: 12 });
  }
}

function drawTinyPhone(ctx, x, y, w, h) {
  rounded(ctx, x, y, w, h, 22, '#0b1220');
  rounded(ctx, x + 6, y + 8, w - 12, h - 16, 17, C.white);
  rounded(ctx, x + w / 2 - 15, y + 14, 30, 5, 3, '#0b1220');
  text(ctx, demo.business, x + 16, y + 33, { size: 8, weight: 800 });
  rounded(ctx, x + 16, y + 56, w - 32, 18, 8, '#f8fafc', C.border);
  rounded(ctx, x + 16, y + 84, 26, 10, 5, C.blue);
  for (let i = 0; i < 2; i += 1) {
    const yy = y + 103 + i * 28;
    imageTile(ctx, x + 16, yy, 18, 18, demo.items[i].color);
    rounded(ctx, x + 40, yy + 3, 30, 4, 2, C.slate);
    rounded(ctx, x + 40, yy + 12, 22, 4, 2, C.blueSoft);
  }
}

function drawSurfaceMatrix() {
  const { canvas, ctx } = makeCanvas(1600, 1000, '#f8fbff');
  text(ctx, 'One source for the places customers check', 92, 70, { size: 46, weight: 800 });
  text(ctx, 'This asset shows MenuList-controlled surfaces only. It does not claim automatic posting to outside platforms.', 94, 132, {
    size: 20,
    color: C.muted,
    maxWidth: 850,
    lineHeight: 29,
  });
  drawSourceCard(ctx, 620, 382, 360, 250);
  const items = [
    [92, 240, 'Official Business Page', 'obp'],
    [92, 520, 'QR and share link', 'qr'],
    [1098, 240, 'Mobile public menu', 'phone'],
    [1098, 520, 'Digital screen', 'screen'],
    [595, 690, 'Printable PDF', 'pdf'],
    [595, 180, 'Customer app link', 'app'],
  ];
  ctx.strokeStyle = '#bfdbfe';
  ctx.lineWidth = 2;
  for (const [x, y] of items) {
    ctx.beginPath();
    ctx.moveTo(800, 507);
    ctx.lineTo(x + 180, y + 110);
    ctx.stroke();
  }
  for (const [x, y, title, kind] of items) {
    drawMiniSurface(ctx, x, y, 360, 220, title, kind);
  }
  return canvas;
}

function drawDashboardProof() {
  const { canvas, ctx } = makeCanvas(1500, 900, '#f8fbff');
  text(ctx, 'Post-publish owner confidence', 88, 70, { size: 44, weight: 800 });
  text(ctx, 'Synthetic demo metrics show the intended dashboard shape without exposing real customer activity.', 90, 128, {
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
    ['Customer app opens', '39', 'stable'],
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
  text(ctx, 'No action needed. Customers are opening the current public source.', 622, 581, {
    size: 16,
    color: C.blueDark,
    maxWidth: 370,
    lineHeight: 24,
  });
  drawPublicMenuPhone(ctx, 1145, 255, 250, 500, true);
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
  drawPublicMenuPhone(ctx, 738, 440, 236, 480, true);
  pill(ctx, 'No real data used', 88, 910, { fill: C.white, stroke: C.border, color: C.muted, size: 14 });
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
    '# Stage 6.1 Synthetic Demo Asset Pack',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'These assets use synthetic MenuList demo content only. They intentionally avoid real customer names, real extracted third-party menu data, private phone numbers, private addresses, customer metrics, and external-platform auto-sync claims.',
    '',
    '## Generated Files',
    '',
    ...outputs.map((item) => `- public/images/website/${item.filename} (${Math.round(item.bytes / 1024)} KB)`),
    '- public/og-image.png (copy of public/images/website/menulist-og-official-source.png for backward compatibility)',
    '',
    '## Demo Identity',
    '',
    '- Business: The Daily Plate',
    '- Location: Indiranagar, Bengaluru',
    '- Currency: Rs.',
    '- Data policy: synthetic data only',
    '',
    '## Remaining Approval Gate',
    '',
    'Replace these with founder-approved real product screenshots when a clean demo tenant is ready. These are safe launch placeholders and social assets, not customer proof.',
    '',
  ].join('\n');

  await fs.writeFile(path.join(notesDir, 'stage-06-1-synthetic-asset-pack.md'), note);
  console.log(JSON.stringify({ outputs, note: path.relative(repoRoot, path.join(notesDir, 'stage-06-1-synthetic-asset-pack.md')) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
