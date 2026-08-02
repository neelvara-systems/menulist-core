'use client';

import { jsPDF } from 'jspdf';
import { generateQrCodeDataUrl } from '@lib/utils/qrCode';
import type { PrintShareToolReport } from './printShareToolTypes';

export interface PrintShareToolRenderedAsset {
  dataUrl: string;
  svg: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function clampText(value: string, fallback: string, maxLength: number): string {
  const cleaned = (value || fallback).replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, maxLength);
}

function wrapWords(value: string, maxChars: number, maxLines: number): string[] {
  const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  return lines.length ? lines : [''];
}

function textBlock(params: {
  color: string;
  fontSize: number;
  fontWeight?: number;
  lineHeight: number;
  lines: string[];
  textAnchor?: 'start' | 'middle';
  x: number;
  y: number;
}): string {
  return [
    `<text x="${params.x}" y="${params.y}" fill="${params.color}" font-family="Inter, Arial, sans-serif" font-size="${params.fontSize}" font-weight="${params.fontWeight || 700}" text-anchor="${params.textAnchor || 'start'}">`,
    ...params.lines.map((line, index) => (
      `<tspan x="${params.x}" dy="${index === 0 ? 0 : params.lineHeight}">${escapeXml(line)}</tspan>`
    )),
    '</text>',
  ].join('');
}

function getContrastingInk(accentColor: string): string {
  const hex = accentColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#16231f' : '#ffffff';
}

function buildSvg(report: PrintShareToolReport, qrDataUrl: string): string {
  const { width, height, layout } = report.asset;
  const accent = report.accentColor;
  const accentInk = getContrastingInk(accent);
  const surface = '#fffdfa';
  const text = '#16231f';
  const muted = '#5a6862';
  const business = clampText(report.businessName, 'Your business', 90);
  const city = clampText(report.cityOrArea, 'Customer-facing link', 90);
  const headline = clampText(report.input.headline, 'One current customer link', 90);
  const bodySource = report.input.hoursText || report.input.body;
  const body = clampText(bodySource, 'Scan for current details before you visit, order, book, or ask.', 260);
  const secondary = clampText(report.input.secondaryText, report.asset.primaryActionLabel, 130);
  const displayLink = clampText(report.asset.displayLink, 'menulist.ai', 90);

  const isStory = layout === 'story';
  const isCard = layout === 'card';
  const margin = Math.round(width * (isCard ? 0.06 : 0.075));
  const qrSize = Math.round(Math.min(width, height) * (isCard ? 0.34 : isStory ? 0.39 : 0.34));
  const qrX = isCard ? width - margin - qrSize : Math.round((width - qrSize) / 2);
  const qrY = isCard ? Math.round(height * 0.2) : Math.round(height * (isStory ? 0.48 : 0.52));
  const headlineLines = wrapWords(headline, isCard ? 18 : 20, isCard ? 2 : 3);
  const bodyLines = wrapWords(body, isCard ? 30 : 34, isCard ? 3 : 4);
  const secondaryLines = wrapWords(secondary, isCard ? 28 : 36, 2);

  if (isCard) {
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(report.asset.primaryActionLabel)}">`,
      `<rect width="${width}" height="${height}" rx="42" fill="${surface}"/>`,
      `<rect x="0" y="0" width="${Math.round(width * 0.34)}" height="${height}" rx="42" fill="${accent}"/>`,
      `<rect x="${Math.round(width * 0.34) - 42}" y="0" width="84" height="${height}" fill="${accent}"/>`,
      textBlock({ color: accentInk, fontSize: 42, fontWeight: 800, lineHeight: 52, lines: wrapWords(business, 15, 2), x: margin, y: Math.round(height * 0.22) }),
      textBlock({ color: accentInk, fontSize: 24, fontWeight: 700, lineHeight: 34, lines: wrapWords(city, 18, 2), x: margin, y: Math.round(height * 0.43) }),
      textBlock({ color: text, fontSize: 64, fontWeight: 900, lineHeight: 72, lines: headlineLines, x: Math.round(width * 0.4), y: Math.round(height * 0.22) }),
      textBlock({ color: muted, fontSize: 26, fontWeight: 600, lineHeight: 36, lines: bodyLines, x: Math.round(width * 0.4), y: Math.round(height * 0.48) }),
      `<rect x="${qrX - 28}" y="${qrY - 28}" width="${qrSize + 56}" height="${qrSize + 56}" rx="32" fill="#ffffff" stroke="#dbe5df" stroke-width="4"/>`,
      `<image href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}"/>`,
      textBlock({ color: text, fontSize: 24, fontWeight: 800, lineHeight: 30, lines: [report.asset.primaryActionLabel], textAnchor: 'middle', x: qrX + qrSize / 2, y: qrY + qrSize + 58 }),
      textBlock({ color: muted, fontSize: 20, fontWeight: 600, lineHeight: 28, lines: [displayLink], textAnchor: 'middle', x: qrX + qrSize / 2, y: qrY + qrSize + 92 }),
      '</svg>',
    ].join('');
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(report.asset.primaryActionLabel)}">`,
    `<rect width="${width}" height="${height}" fill="${surface}"/>`,
    `<rect x="0" y="0" width="${width}" height="${Math.round(height * (isStory ? 0.38 : 0.34))}" fill="${accent}"/>`,
    `<circle cx="${Math.round(width * 0.88)}" cy="${Math.round(height * 0.08)}" r="${Math.round(width * 0.18)}" fill="#ffffff" opacity="0.16"/>`,
    `<circle cx="${Math.round(width * 0.08)}" cy="${Math.round(height * 0.32)}" r="${Math.round(width * 0.13)}" fill="#ffffff" opacity="0.12"/>`,
    textBlock({ color: accentInk, fontSize: Math.round(width * 0.048), fontWeight: 800, lineHeight: Math.round(width * 0.058), lines: wrapWords(business, 24, 2), x: margin, y: Math.round(height * 0.105) }),
    textBlock({ color: accentInk, fontSize: Math.round(width * 0.028), fontWeight: 700, lineHeight: Math.round(width * 0.04), lines: wrapWords(city, 30, 2), x: margin, y: Math.round(height * 0.205) }),
    textBlock({ color: text, fontSize: Math.round(width * (isStory ? 0.085 : 0.076)), fontWeight: 900, lineHeight: Math.round(width * (isStory ? 0.096 : 0.088)), lines: headlineLines, x: margin, y: Math.round(height * (isStory ? 0.31 : 0.30)) }),
    textBlock({ color: muted, fontSize: Math.round(width * 0.035), fontWeight: 650, lineHeight: Math.round(width * 0.049), lines: bodyLines, x: margin, y: Math.round(height * (isStory ? 0.42 : 0.43)) }),
    `<rect x="${qrX - Math.round(qrSize * 0.08)}" y="${qrY - Math.round(qrSize * 0.08)}" width="${Math.round(qrSize * 1.16)}" height="${Math.round(qrSize * 1.16)}" rx="${Math.round(qrSize * 0.07)}" fill="#ffffff" stroke="#dbe5df" stroke-width="${Math.max(4, Math.round(width * 0.006))}"/>`,
    `<image href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}"/>`,
    textBlock({ color: text, fontSize: Math.round(width * 0.038), fontWeight: 900, lineHeight: Math.round(width * 0.048), lines: [report.asset.primaryActionLabel], textAnchor: 'middle', x: width / 2, y: qrY + qrSize + Math.round(height * 0.07) }),
    textBlock({ color: muted, fontSize: Math.round(width * 0.026), fontWeight: 700, lineHeight: Math.round(width * 0.036), lines: [displayLink], textAnchor: 'middle', x: width / 2, y: qrY + qrSize + Math.round(height * 0.105) }),
    textBlock({ color: muted, fontSize: Math.round(width * 0.025), fontWeight: 650, lineHeight: Math.round(width * 0.036), lines: secondaryLines, textAnchor: 'middle', x: width / 2, y: height - Math.round(height * 0.09) }),
    `<text x="${width / 2}" y="${height - Math.round(height * 0.035)}" fill="${muted}" font-family="Inter, Arial, sans-serif" font-size="${Math.round(width * 0.02)}" font-weight="700" text-anchor="middle">Made with MenuList</text>`,
    '</svg>',
  ].join('');
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('print_share_tool_blob_read_failed'));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('print_share_tool_canvas_export_failed'))),
      'image/png',
      0.96,
    );
  });
}

export async function renderPrintShareToolAsset(report: PrintShareToolReport): Promise<PrintShareToolRenderedAsset> {
  const qrValue = report.customerLink || 'https://app.menulist.ai/create-menu';
  const qrDataUrl = await generateQrCodeDataUrl(qrValue, {
    darkColor: '#16231f',
    lightColor: '#ffffff',
    margin: 4,
    width: 1024,
  });
  const svg = buildSvg(report, qrDataUrl);

  return {
    dataUrl: svgToDataUrl(svg),
    svg,
  };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  try {
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }
}

export async function svgToPngBlob(svg: string, width: number, height: number): Promise<Blob> {
  const image = new Image();
  image.decoding = 'async';
  image.src = svgToDataUrl(svg);
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('print_share_tool_canvas_unavailable');
  context.drawImage(image, 0, 0, width, height);

  return canvasToBlob(canvas);
}

export async function svgToPdfBlob(svg: string, width: number, height: number): Promise<Blob> {
  const pngBlob = await svgToPngBlob(svg, width, height);
  const pngDataUrl = await blobToDataUrl(pngBlob);
  const orientation = width >= height ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    format: [width, height],
    orientation,
    unit: 'px',
  });
  doc.addImage(pngDataUrl, 'PNG', 0, 0, width, height);
  return doc.output('blob');
}

export function printSvgAsset(svg: string, title: string): void {
  const printFrame = document.createElement('iframe');
  printFrame.title = title;
  printFrame.referrerPolicy = 'no-referrer';
  printFrame.setAttribute('aria-hidden', 'true');
  printFrame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(printFrame);

  const printWindow = printFrame.contentWindow;
  const printDocument = printFrame.contentDocument;
  if (!printWindow || !printDocument) {
    document.body.removeChild(printFrame);
    throw new Error('print_share_tool_print_frame_unavailable');
  }

  let cleanupTimer: number | undefined;
  const cleanup = () => {
    if (cleanupTimer) window.clearTimeout(cleanupTimer);
    if (printFrame.parentNode) document.body.removeChild(printFrame);
  };
  const startPrint = () => {
    printWindow.focus();
    printWindow.print();
    cleanupTimer = window.setTimeout(cleanup, 30000);
  };

  printWindow.onafterprint = cleanup;
  printDocument.open();
  printDocument.write([
    '<!doctype html>',
    '<html><head><meta charset="utf-8">',
    `<title>${escapeXml(title)}</title>`,
    '<style>body{margin:0;background:#f8faf9;display:grid;place-items:center;min-height:100vh}img{max-width:100%;height:auto}@media print{body{background:#fff}img{width:100%;max-width:none}}</style>',
    '</head><body>',
    `<img alt="${escapeXml(title)}" src="${svgToDataUrl(svg)}">`,
    '</body></html>',
  ].join(''));
  printDocument.close();

  const image = printDocument.querySelector('img');
  if (!image || image.complete) {
    window.setTimeout(startPrint, 120);
    return;
  }

  image.addEventListener('load', () => window.setTimeout(startPrint, 120), { once: true });
  image.addEventListener('error', () => window.setTimeout(startPrint, 120), { once: true });
}
