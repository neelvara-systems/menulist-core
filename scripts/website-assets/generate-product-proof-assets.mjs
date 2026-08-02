import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const outputDir = path.join(repoRoot, 'public/images/website/product-proof');
const printReadyOutputDir = path.join(repoRoot, 'public/images/website/print-ready-kit');
const notesDir = path.join(repoRoot, '__docs__/main-website/asset-production/stage-08-product-proof');
const generationDate = new Date().toISOString().slice(0, 10);

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
  page: '#f8fbff',
  white: '#ffffff',
  blue: '#0051d1',
  blueDark: '#1d4ed8',
  blueSoft: '#dbeafe',
  green: '#16a34a',
  greenDark: '#166534',
  greenSoft: '#dcfce7',
  amber: '#f59e0b',
  amberDark: '#92400e',
  amberSoft: '#fef3c7',
  redSoft: '#fee2e2',
  navy: '#10233f',
  slate: '#e2e8f0',
};

const demo = {
  business: 'The Daily Plate',
  subline: 'Cafe and lunch kitchen',
  city: 'Indiranagar, Bengaluru',
  owner: 'Owner message',
  menu: 'Main Menu',
  item: 'Masala Tea',
  oldPrice: 'Rs. 15',
  newPrice: 'Rs. 20',
  url: 'thedailyplate.menulist.online',
  updated: 'Updated today',
  activity: [
    ['Menu activity', 'Available', 'Current'],
    ['Official page', 'Visible', 'Ready'],
    ['QR and link activity', 'Available', 'Ready'],
  ],
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
    size = 14,
    padX = 12,
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
    return;
  }

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

function businessLogo(ctx, x, y, size = 52) {
  rounded(ctx, x, y, size, size, Math.max(12, size * 0.2), '#fff7ed', '#fed7aa');
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size * 0.31, 0, Math.PI * 2);
  ctx.fillStyle = '#fdba74';
  ctx.fill();
  text(ctx, 'DP', x + size / 2, y + size / 2 - size * 0.14, {
    size: Math.max(12, Math.round(size * 0.24)),
    weight: 800,
    color: '#7c2d12',
    align: 'center',
  });
}

function browserFrame(ctx, x, y, w, h, title) {
  shadow(ctx, 36, 'rgba(15, 23, 42, 0.16)', 0, 20);
  rounded(ctx, x, y, w, h, 28, C.white, C.border);
  clearShadow(ctx);
  rounded(ctx, x, y, w, 58, 28, '#f8fafc', C.border);
  rounded(ctx, x, y + 34, w, 24, 0, '#f8fafc');
  dot(ctx, x + 28, y + 27, '#ef4444', 5);
  dot(ctx, x + 48, y + 27, '#f59e0b', 5);
  dot(ctx, x + 68, y + 27, '#22c55e', 5);
  rounded(ctx, x + 104, y + 14, w - 134, 30, 15, C.white, C.border);
  text(ctx, title, x + 124, y + 22, { size: 12, color: C.muted, weight: 700 });
  return { x: x + 28, y: y + 84, w: w - 56, h: h - 112 };
}

function drawPhoneShell(ctx, x, y, w, h) {
  shadow(ctx, 36, 'rgba(15, 23, 42, 0.2)', 0, 20);
  rounded(ctx, x, y, w, h, 34, '#0b1220');
  clearShadow(ctx);
  rounded(ctx, x + 9, y + 9, w - 18, h - 18, 28, C.white);
  rounded(ctx, x + w / 2 - 34, y + 18, 68, 8, 4, '#0b1220');
  return { x: x + 19, y: y + 36, w: w - 38, h: h - 56 };
}

function drawMiniItem(ctx, x, y, w, title, price, color) {
  rounded(ctx, x, y, w, 74, 15, C.white, C.border);
  const gradient = ctx.createLinearGradient(x + 16, y + 16, x + 56, y + 56);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, '#ffffff');
  rounded(ctx, x + 16, y + 16, 42, 42, 12, gradient, '#ffffff');
  text(ctx, title, x + 72, y + 15, { size: 12, weight: 800, maxWidth: w - 92, lineHeight: 15 });
  text(ctx, price, x + 72, y + 47, { size: 11, weight: 800, color: C.blue });
}

function drawCustomerPhone(ctx, x, y, w, h) {
  const box = drawPhoneShell(ctx, x, y, w, h);
  businessLogo(ctx, box.x + 18, box.y + 14, 34);
  text(ctx, demo.business, box.x + 62, box.y + 15, { size: 14, weight: 800 });
  text(ctx, 'Main Menu', box.x + 62, box.y + 37, { size: 10, color: C.muted, weight: 700 });
  rounded(ctx, box.x + 18, box.y + 76, box.w - 36, 38, 13, '#f8fafc', C.border);
  text(ctx, 'Search menu...', box.x + 36, box.y + 88, { size: 12, color: C.muted });
  pill(ctx, 'Popular', box.x + 18, box.y + 132, { fill: C.blue, stroke: C.blue, color: C.white, size: 11, padX: 10, padY: 6 });
  pill(ctx, 'Drinks', box.x + 102, box.y + 132, { fill: C.white, stroke: C.border, color: C.muted, size: 11, padX: 10, padY: 6 });
  drawMiniItem(ctx, box.x + 18, box.y + 178, box.w - 36, 'Masala Tea', 'Rs. 20', '#f59e0b');
  drawMiniItem(ctx, box.x + 18, box.y + 264, box.w - 36, 'Paneer Tikka Bowl', 'Rs. 220', '#f97316');
  drawMiniItem(ctx, box.x + 18, box.y + 350, box.w - 36, 'Cold Coffee', 'Rs. 120', '#0ea5e9');
}

function drawNav(ctx, x, y, h, active = 1) {
  rounded(ctx, x, y, 186, h, 22, '#f8fafc', C.border);
  logoMark(ctx, x + 24, y + 24, 38);
  text(ctx, 'MenuList', x + 76, y + 31, { size: 15, weight: 800 });
  const items = ['Today', 'Menu', 'Share', 'Health', 'Settings'];
  for (let i = 0; i < items.length; i += 1) {
    const yy = y + 104 + i * 54;
    const isActive = i === active;
    rounded(ctx, x + 18, yy, 150, 38, 12, isActive ? C.blueSoft : 'transparent', isActive ? '#bfdbfe' : null);
    dot(ctx, x + 38, yy + 19, isActive ? C.blue : C.soft, 5);
    text(ctx, items[i], x + 55, yy + 10, {
      size: 13,
      weight: isActive ? 800 : 700,
      color: isActive ? C.blueDark : C.muted,
    });
  }
}

function drawAiApprovalAsset() {
  const { canvas, ctx } = makeCanvas(1280, 900, C.page);
  text(ctx, 'Approval-based menu updates', 72, 58, { size: 42, weight: 800 });
  text(ctx, 'The owner sends a message. MenuList prepares the card. Important changes wait for approval.', 74, 116, {
    size: 20,
    color: C.muted,
    maxWidth: 780,
    lineHeight: 29,
  });

  const app = browserFrame(ctx, 72, 190, 850, 610, 'app.menulist.ai / ai-menu-manager');
  drawNav(ctx, app.x, app.y, app.h, 1);

  const chatX = app.x + 220;
  text(ctx, demo.business, chatX, app.y + 8, { size: 24, weight: 800 });
  pill(ctx, demo.menu, chatX + 252, app.y + 8, { fill: C.white, stroke: C.border, color: C.muted, size: 12 });
  rounded(ctx, chatX + 260, app.y + 70, 430, 74, 20, C.blueSoft, '#bfdbfe');
  text(ctx, demo.owner, chatX + 286, app.y + 88, { size: 11, color: C.blueDark, weight: 800 });
  text(ctx, 'Tea 20 and publish after this', chatX + 286, app.y + 112, { size: 18, color: C.ink, weight: 800 });

  rounded(ctx, chatX, app.y + 172, 690, 300, 24, C.white, C.border);
  pill(ctx, 'Prepared card', chatX + 28, app.y + 198, { fill: C.blueSoft, stroke: '#bfdbfe', color: C.blueDark, size: 12 });
  text(ctx, 'Masala Tea price change', chatX + 28, app.y + 246, { size: 28, weight: 800 });
  text(ctx, 'Selected project: Main Menu. Scope: current store. Publishing will be prepared after approval.', chatX + 30, app.y + 292, {
    size: 16,
    color: C.muted,
    maxWidth: 600,
    lineHeight: 23,
  });
  rounded(ctx, chatX + 30, app.y + 358, 300, 74, 18, '#f8fafc', C.border);
  text(ctx, demo.oldPrice, chatX + 54, app.y + 378, { size: 21, weight: 800, color: C.muted });
  text(ctx, 'Before', chatX + 54, app.y + 407, { size: 12, color: C.muted, weight: 800 });
  rounded(ctx, chatX + 360, app.y + 358, 300, 74, 18, C.greenSoft, '#bbf7d0');
  text(ctx, demo.newPrice, chatX + 384, app.y + 378, { size: 21, weight: 800, color: C.greenDark });
  text(ctx, 'After approval', chatX + 384, app.y + 407, { size: 12, color: C.greenDark, weight: 800 });
  rounded(ctx, chatX + 30, app.y + 454, 302, 50, 16, C.blue, C.blue);
  text(ctx, 'Approve prepared update', chatX + 181, app.y + 469, { size: 15, weight: 800, color: C.white, align: 'center' });
  rounded(ctx, chatX + 356, app.y + 454, 150, 50, 16, C.white, C.border);
  text(ctx, 'Change', chatX + 431, app.y + 469, { size: 15, weight: 800, color: C.ink, align: 'center' });
  rounded(ctx, chatX + 530, app.y + 454, 130, 50, 16, C.white, C.border);
  text(ctx, 'Reject', chatX + 595, app.y + 469, { size: 15, weight: 800, color: C.ink, align: 'center' });

  drawCustomerPhone(ctx, 980, 230, 236, 500);
  pill(ctx, 'No automatic public change', 940, 760, { fill: C.white, stroke: C.border, color: C.ink, size: 14 });
  pill(ctx, 'Receipt after update', 940, 808, { fill: C.greenSoft, stroke: '#bbf7d0', color: C.greenDark, size: 14 });
  return canvas;
}

function drawHealthChecks(ctx, x, y, w) {
  const checks = [
    ['Customer link', 'Current', C.greenSoft, C.greenDark],
    ['Official page', 'Visible', C.greenSoft, C.greenDark],
    ['Menu freshness', 'Updated today', C.greenSoft, C.greenDark],
    ['Location state', '1 outlet stable', C.blueSoft, C.blueDark],
  ];
  for (let i = 0; i < checks.length; i += 1) {
    const yy = y + i * 68;
    rounded(ctx, x, yy, w, 54, 15, C.white, C.border);
    text(ctx, checks[i][0], x + 18, yy + 16, { size: 14, weight: 800 });
    const statusWidth = i === 2 ? 138 : 116;
    rounded(ctx, x + w - statusWidth - 18, yy + 12, statusWidth, 30, 15, checks[i][2], null);
    text(ctx, checks[i][1], x + w - statusWidth / 2 - 18, yy + 20, {
      size: 11,
      weight: 800,
      color: checks[i][3],
      align: 'center',
    });
  }
}

function drawBusinessHealthAsset() {
  const { canvas, ctx } = makeCanvas(1280, 900, C.page);
  text(ctx, 'Business Health stable state', 72, 58, { size: 42, weight: 800 });
  text(ctx, 'A calm owner view for freshness, public status, locations and safe handoff when action is needed.', 74, 116, {
    size: 20,
    color: C.muted,
    maxWidth: 800,
    lineHeight: 29,
  });

  const app = browserFrame(ctx, 72, 190, 850, 610, 'app.menulist.ai / business-health');
  drawNav(ctx, app.x, app.y, app.h, 3);

  const panelX = app.x + 220;
  text(ctx, 'Latest MenuList check', panelX, app.y + 8, { size: 15, color: C.muted, weight: 800 });
  text(ctx, 'Menu state is stable', panelX, app.y + 36, { size: 30, weight: 800 });
  rounded(ctx, panelX + 390, app.y + 22, 174, 36, 18, C.greenSoft, '#bbf7d0');
  text(ctx, 'No action needed', panelX + 477, app.y + 32, { size: 13, weight: 800, color: C.greenDark, align: 'center' });

  for (let i = 0; i < demo.activity.length; i += 1) {
    const x = panelX + i * 218;
    rounded(ctx, x, app.y + 96, 196, 116, 20, '#f8fafc', C.border);
    text(ctx, demo.activity[i][0], x + 18, app.y + 118, { size: 13, color: C.muted, weight: 800 });
    text(ctx, demo.activity[i][1], x + 18, app.y + 151, { size: 22, weight: 800 });
    text(ctx, demo.activity[i][2], x + 18, app.y + 184, { size: 11, color: C.green, weight: 800 });
  }

  rounded(ctx, panelX, app.y + 246, 326, 284, 22, '#f8fafc', C.border);
  text(ctx, 'Priority checks', panelX + 24, app.y + 272, { size: 22, weight: 800 });
  drawHealthChecks(ctx, panelX + 24, app.y + 318, 278);

  rounded(ctx, panelX + 352, app.y + 246, 316, 284, 22, C.blueSoft, '#bfdbfe');
  text(ctx, 'Owner question', panelX + 380, app.y + 276, { size: 13, weight: 800, color: C.blueDark });
  text(ctx, 'What should I check today?', panelX + 380, app.y + 308, { size: 22, weight: 800, maxWidth: 250, lineHeight: 27 });
  text(ctx, 'Business Health uses the latest MenuList check. Everything important is stable right now.', panelX + 380, app.y + 378, {
    size: 16,
    color: C.blueDark,
    maxWidth: 250,
    lineHeight: 24,
  });
  pill(ctx, 'Fixes hand off safely', panelX + 380, app.y + 470, { fill: C.white, stroke: '#bfdbfe', color: C.blueDark, size: 12 });

  drawCustomerPhone(ctx, 982, 238, 238, 492);
  pill(ctx, 'Owner phone view', 940, 762, { fill: C.white, stroke: C.border, color: C.ink, size: 14 });
  pill(ctx, 'Latest check first', 940, 810, { fill: C.greenSoft, stroke: '#bbf7d0', color: C.greenDark, size: 14 });
  return canvas;
}

function drawOwnerPhoneDashboardAsset() {
  const { canvas, ctx } = makeCanvas(900, 1400, C.page);
  text(ctx, 'Owner phone dashboard', 86, 62, { size: 38, weight: 800 });
  text(ctx, 'The owner can see menu status, share, health and customer links without opening a desktop dashboard.', 88, 116, {
    size: 19,
    color: C.muted,
    maxWidth: 660,
    lineHeight: 27,
  });

  const box = drawPhoneShell(ctx, 260, 220, 380, 900);
  businessLogo(ctx, box.x + 26, box.y + 28, 46);
  text(ctx, demo.business, box.x + 86, box.y + 30, { size: 18, weight: 800 });
  text(ctx, demo.updated, box.x + 86, box.y + 58, { size: 12, color: C.muted, weight: 700 });

  rounded(ctx, box.x + 26, box.y + 108, box.w - 52, 90, 20, C.greenSoft, '#bbf7d0');
  text(ctx, 'No action needed', box.x + 50, box.y + 128, { size: 22, weight: 800, color: C.greenDark });
  text(ctx, 'Menu state is stable', box.x + 50, box.y + 164, { size: 13, weight: 800, color: C.greenDark });

  const cardW = (box.w - 68) / 2;
  const publicStates = [
    ['Menu', 'Current'],
    ['Official page', 'Visible'],
    ['QR and link', 'Ready'],
    ['Reports', 'None'],
  ];
  for (let i = 0; i < publicStates.length; i += 1) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = box.x + 26 + col * (cardW + 16);
    const y = box.y + 226 + row * 116;
    rounded(ctx, x, y, cardW, 96, 18, C.white, C.border);
    text(ctx, publicStates[i][0], x + 18, y + 18, { size: 12, color: C.muted, weight: 800 });
    text(ctx, publicStates[i][1], x + 18, y + 50, { size: 18, weight: 800 });
  }

  rounded(ctx, box.x + 26, box.y + 484, box.w - 52, 120, 20, C.white, C.border);
  text(ctx, 'Share link', box.x + 50, box.y + 510, { size: 17, weight: 800 });
  text(ctx, demo.url, box.x + 50, box.y + 542, { size: 12, color: C.muted, maxWidth: box.w - 100, lineHeight: 16 });
  rounded(ctx, box.x + 50, box.y + 570, 126, 34, 12, C.blue, C.blue);
  text(ctx, 'Copy link', box.x + 113, box.y + 580, { size: 12, color: C.white, weight: 800, align: 'center' });

  rounded(ctx, box.x + 26, box.y + 632, box.w - 52, 156, 20, '#f8fafc', C.border);
  text(ctx, 'Public links', box.x + 50, box.y + 658, { size: 17, weight: 800 });
  const actions = ['Public menu', 'Directions', 'WhatsApp'];
  for (let i = 0; i < actions.length; i += 1) {
    text(ctx, actions[i], box.x + 50, box.y + 698 + i * 30, { size: 13, color: C.muted, weight: 700 });
    pill(ctx, 'Ready', box.x + 212, box.y + 689 + i * 30, {
      fill: i === 0 ? C.blueSoft : C.white,
      stroke: i === 0 ? '#bfdbfe' : C.border,
      color: i === 0 ? C.blueDark : C.muted,
      size: 10,
      padX: 8,
      padY: 4,
    });
  }

  const navY = box.y + box.h - 72;
  rounded(ctx, box.x + 26, navY, box.w - 52, 52, 18, C.white, C.border);
  ['Today', 'Menu', 'Share', 'More'].forEach((label, i) => {
    text(ctx, label, box.x + 68 + i * 72, navY + 18, {
      size: 11,
      weight: 800,
      color: i === 0 ? C.blue : C.muted,
      align: 'center',
    });
  });

  pill(ctx, 'Fictional demo data', 120, 1190, { fill: C.white, stroke: C.border, color: C.muted, size: 14 });
  pill(ctx, 'Aligned with owner mobile outputs', 310, 1190, { fill: C.greenSoft, stroke: '#bbf7d0', color: C.greenDark, size: 14 });
  return canvas;
}

function drawPrintReadyEditorAsset() {
  const { canvas, ctx } = makeCanvas(1600, 900, '#111827');

  rounded(ctx, 0, 0, 1600, 72, 0, '#0b1220');
  text(ctx, 'MenuList', 30, 22, { size: 22, weight: 800, color: C.white });
  text(ctx, 'Print-ready editor', 162, 24, { size: 18, weight: 800, color: '#dbeafe' });
  pill(ctx, 'Fictional demo data', 338, 18, { fill: '#172033', stroke: '#334155', color: '#cbd5e1', size: 12 });
  pill(ctx, 'Download image', 1270, 17, { fill: '#172033', stroke: '#475569', color: C.white, size: 13 });
  pill(ctx, 'Print PDF', 1430, 17, { fill: C.blue, stroke: C.blue, color: C.white, size: 13 });

  rounded(ctx, 18, 90, 220, 790, 18, '#0f172a', '#263449');
  text(ctx, 'EDIT TOOLS', 42, 116, { size: 12, weight: 800, color: C.soft });
  const tools = [
    ['Template', 'Choose a print layout'],
    ['Background', 'Colour or image'],
    ['Business text', 'Name and message'],
    ['QR code', 'Current menu link'],
    ['Logo', 'Business identity'],
    ['Styles', 'Spacing and border'],
  ];
  tools.forEach(([label, detail], index) => {
    const y = 154 + index * 92;
    rounded(ctx, 34, y, 188, 72, 14, index === 3 ? '#173b75' : '#172033', index === 3 ? '#3b82f6' : '#263449');
    text(ctx, label, 52, y + 14, { size: 15, weight: 800, color: C.white });
    text(ctx, detail, 52, y + 40, { size: 11, color: '#94a3b8' });
  });

  rounded(ctx, 262, 90, 1000, 790, 18, '#1f2937', '#334155');
  text(ctx, 'A6 portrait · 1240 x 1748', 292, 116, { size: 13, color: '#cbd5e1', weight: 700 });
  shadow(ctx, 34, 'rgba(0, 0, 0, 0.35)', 0, 18);
  rounded(ctx, 510, 150, 500, 680, 8, '#fffaf0', '#e7d8b6', 2);
  clearShadow(ctx);
  rounded(ctx, 536, 176, 448, 628, 4, null, '#c6a85b', 3);
  pill(ctx, 'CURRENT MENU', 672, 204, { fill: '#f4ecd4', stroke: '#d8c28b', color: '#725c20', size: 11 });
  text(ctx, demo.business, 760, 270, { size: 31, weight: 800, align: 'center' });
  text(ctx, 'Scan to view our current menu', 760, 322, { size: 17, weight: 700, color: '#5b6472', align: 'center' });

  rounded(ctx, 624, 380, 272, 272, 18, C.white, '#d8c28b', 2);
  for (let row = 0; row < 13; row += 1) {
    for (let col = 0; col < 13; col += 1) {
      const finder = (row < 4 && col < 4) || (row < 4 && col > 8) || (row > 8 && col < 4);
      const patterned = ((row * 7 + col * 11 + row * col) % 5) < 2;
      if (!finder && !patterned) continue;
      ctx.fillStyle = C.ink;
      ctx.fillRect(644 + col * 18, 400 + row * 18, 13, 13);
    }
  }
  text(ctx, `${demo.url}/menu`, 760, 674, { size: 15, weight: 700, color: '#475569', align: 'center' });
  pill(ctx, 'Owner-approved public link', 657, 722, { fill: C.greenSoft, stroke: '#bbf7d0', color: C.greenDark, size: 12 });

  rounded(ctx, 1284, 90, 298, 790, 18, '#0f172a', '#263449');
  text(ctx, 'QR CODE', 1310, 116, { size: 12, weight: 800, color: C.soft });
  text(ctx, 'Current destination', 1310, 164, { size: 14, weight: 800, color: C.white });
  rounded(ctx, 1310, 198, 246, 72, 12, '#172033', '#334155');
  text(ctx, demo.url, 1326, 214, { size: 12, weight: 700, color: '#dbeafe', maxWidth: 214, lineHeight: 18 });
  text(ctx, '/menu', 1326, 240, { size: 12, color: '#93c5fd' });
  text(ctx, 'Print size', 1310, 308, { size: 14, weight: 800, color: C.white });
  pill(ctx, 'A6 portrait', 1310, 342, { fill: '#172033', stroke: '#334155', color: '#dbeafe', size: 13 });
  text(ctx, 'Link state', 1310, 416, { size: 14, weight: 800, color: C.white });
  pill(ctx, 'Current', 1310, 450, { fill: '#123d2b', stroke: '#166534', color: '#bbf7d0', size: 13 });
  rounded(ctx, 1310, 524, 246, 126, 14, '#172033', '#334155');
  text(ctx, 'Safe export', 1328, 544, { size: 15, weight: 800, color: C.white });
  text(ctx, 'The generated file uses the current owner-approved menu link.', 1328, 578, {
    size: 12,
    color: '#94a3b8',
    maxWidth: 208,
    lineHeight: 18,
  });
  return canvas;
}

async function save(canvas, filename) {
  const buffer = canvas.toBuffer('image/webp');
  const out = path.join(outputDir, filename);
  await fs.writeFile(out, buffer);
  return { filename, bytes: buffer.length, publicPath: `public/images/website/product-proof/${filename}` };
}

async function savePrintReadyJpeg(canvas, filename) {
  const buffer = canvas.toBuffer('image/jpeg', 88);
  const out = path.join(printReadyOutputDir, filename);
  await fs.writeFile(out, buffer);
  return { filename, bytes: buffer.length, publicPath: `public/images/website/print-ready-kit/${filename}` };
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(printReadyOutputDir, { recursive: true });
  await fs.mkdir(notesDir, { recursive: true });
  menuListLogoImage = await loadImage(path.join(repoRoot, 'public/icons/android-chrome-512x512.png')).catch(() => null);

  const outputs = [];
  outputs.push(await save(drawAiApprovalAsset(), 'ai-menu-manager-approval-card.webp'));
  outputs.push(await save(drawBusinessHealthAsset(), 'business-health-stable-check.webp'));
  outputs.push(await save(drawOwnerPhoneDashboardAsset(), 'owner-phone-dashboard.webp'));
  outputs.push(await savePrintReadyJpeg(drawPrintReadyEditorAsset(), 'print-assets-editor.jpg'));

  const note = [
    '# Stage 8 Product Proof Demo Asset Pack',
    '',
    `Generated: ${generationDate}`,
    '',
    'This pack adds market-first product proof images for the current MenuList website pass. The assets use fictional demo data for The Daily Plate and are not real customer screenshots, testimonials, customer proof, or live usage evidence.',
    '',
    '## Generated Files',
    '',
    ...outputs.map((item) => `- ${item.publicPath} (${Math.round(item.bytes / 1024)} KB)`),
    '',
    '## Alignment Notes',
    '',
    '- AI Menu Manager visual mirrors the owner message -> prepared card -> approval -> receipt contract.',
    '- Business Health visual mirrors the stable latest-check state, No action needed language, public-status availability, and safe handoff posture.',
    '- Owner phone dashboard visual mirrors the mobile owner output pattern: health state, share link, public-link readiness, and tab navigation.',
    '- Print-ready editor visual is deterministic fictional proof of the current menu-link, layout, and safe export controls.',
    '- Business details, menu items, prices, and URLs are fictional demo values. No invented activity counts or performance percentages are shown.',
    '',
    '## Public Usage Rule',
    '',
    'Use these as demo product visuals only. Replace them with browser-routed demo tenant screenshots when a clean demo tenant is approved.',
    '',
  ].join('\n');

  const notePath = path.join(notesDir, 'stage-08-product-proof-demo-assets.md');
  await fs.writeFile(notePath, note);

  console.log(JSON.stringify({ outputs, note: path.relative(repoRoot, notePath) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
