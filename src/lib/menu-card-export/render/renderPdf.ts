import { jsPDF } from 'jspdf';
import type { MenuCardGeneratedArtifact, MenuCardExportSettings, MenuCardSafeOverrides } from '../models/exportTypes';
import type { MenuCardPrintSource, PrintCategory, PrintItem } from '../models/printModel';
import { getMenuCardTemplate } from '../templates/registry';
import { buildPrintSourceHash } from '../source/buildPrintSourceHash';
import { resolveMenuCardBusinessPrintProfile, type MenuCardBusinessPrintTone } from '../templates/businessPrintProfiles';
import { applySafeLayoutOverrides } from '../overrides/applySafeLayoutOverrides';
import { getPrintBox } from './renderPrintBoxes';
import { renderQr } from './renderQr';
import { buildArtifactFilename, buildPdfDocumentProperties, formatArtifactDate } from './artifactMetadata';
import {
    createMenuListLogoMarkDataUrl,
    getMenuListLogoMarkWidth,
    MENU_LIST_MENU_ATTRIBUTION_TEXT,
} from '../../menu-kit/platformAttribution';
import { resolveMenuListAttributionPolicy } from '../../platform/menuListBranding';

const logoDataUrlCache = new Map<string, string | null>();

type RgbColor = [number, number, number];

type MenuCardVisualStyle = {
    paperColor: RgbColor;
    borderColor: RgbColor;
    accentColor: RgbColor;
    mutedColor: RgbColor;
    headerMode: 'plaque' | 'editorial' | 'compact-card';
    categoryMode: 'ribbon' | 'editorial' | 'boxed';
    pageBorder: 'single' | 'double';
    usePriceLeaders: boolean;
    itemTone: 'menu' | 'service' | 'product';
};

function hexToRgb(hex: string): [number, number, number] {
    const clean = (hex || '#2d2d2d').replace('#', '').trim();
    const expanded = /^[0-9a-fA-F]{3}$/.test(clean)
        ? clean.split('').map((char) => `${char}${char}`).join('')
        : clean;
    const value = /^[0-9a-fA-F]{6}$/.test(expanded) ? expanded : '2d2d2d';
    return [
        parseInt(value.slice(0, 2), 16),
        parseInt(value.slice(2, 4), 16),
        parseInt(value.slice(4, 6), 16),
    ];
}

function brightness([r, g, b]: RgbColor): number {
    return (r * 299 + g * 587 + b * 114) / 1000;
}

function textColorForFill(color: RgbColor): RgbColor {
    return brightness(color) > 150 ? [30, 30, 30] : [255, 255, 255];
}

function readableAccentColor(color: RgbColor): RgbColor {
    if (brightness(color) <= 205) return color;
    return [
        Math.round(color[0] * 0.55),
        Math.round(color[1] * 0.55),
        Math.round(color[2] * 0.55),
    ];
}

function blendRgb(color: RgbColor, background: RgbColor, ratio: number): RgbColor {
    return [
        Math.round(color[0] * ratio + background[0] * (1 - ratio)),
        Math.round(color[1] * ratio + background[1] * (1 - ratio)),
        Math.round(color[2] * ratio + background[2] * (1 - ratio)),
    ];
}

function setFillRgb(doc: jsPDF, color: RgbColor) {
    doc.setFillColor(color[0], color[1], color[2]);
}

function setDrawRgb(doc: jsPDF, color: RgbColor) {
    doc.setDrawColor(color[0], color[1], color[2]);
}

function setTextRgb(doc: jsPDF, color: RgbColor) {
    doc.setTextColor(color[0], color[1], color[2]);
}

function getVisualStyle(templateFamily: string, accentRgb: RgbColor, businessTone: MenuCardBusinessPrintTone): MenuCardVisualStyle {
    const readableAccent = readableAccentColor(accentRgb);

    if (businessTone === 'product-catalog') {
        return {
            paperColor: templateFamily === 'compact' ? [246, 239, 218] : [249, 248, 242],
            borderColor: blendRgb(readableAccent, [78, 82, 72], 0.3),
            accentColor: readableAccent,
            mutedColor: [84, 86, 78],
            headerMode: 'compact-card',
            categoryMode: 'boxed',
            pageBorder: 'single',
            usePriceLeaders: true,
            itemTone: 'product',
        };
    }

    if (businessTone === 'service-list' || businessTone === 'wellness-list' || businessTone === 'professional-guide') {
        const isProfessional = businessTone === 'professional-guide';
        const isWellness = businessTone === 'wellness-list';
        return {
            paperColor: isWellness ? [246, 250, 246] : [249, 248, 244],
            borderColor: blendRgb(readableAccent, isProfessional ? [70, 72, 78] : [74, 86, 78], 0.28),
            accentColor: readableAccent,
            mutedColor: isProfessional ? [78, 80, 86] : [76, 86, 80],
            headerMode: templateFamily === 'compact' ? 'compact-card' : 'editorial',
            categoryMode: templateFamily === 'compact' ? 'boxed' : 'editorial',
            pageBorder: 'single',
            usePriceLeaders: templateFamily === 'compact',
            itemTone: 'service',
        };
    }

    if (templateFamily === 'premium') {
        return {
            paperColor: [250, 244, 232],
            borderColor: blendRgb(readableAccent, [70, 58, 46], 0.35),
            accentColor: readableAccent,
            mutedColor: [92, 82, 72],
            headerMode: 'editorial',
            categoryMode: 'editorial',
            pageBorder: 'single',
            usePriceLeaders: false,
            itemTone: 'menu',
        };
    }

    if (templateFamily === 'compact') {
        return {
            paperColor: [248, 225, 158],
            borderColor: blendRgb(readableAccent, [98, 76, 34], 0.32),
            accentColor: readableAccent,
            mutedColor: [88, 72, 42],
            headerMode: 'compact-card',
            categoryMode: 'boxed',
            pageBorder: 'single',
            usePriceLeaders: true,
            itemTone: 'menu',
        };
    }

    return {
        paperColor: [252, 246, 224],
        borderColor: blendRgb(readableAccent, [58, 52, 44], 0.4),
        accentColor: readableAccent,
        mutedColor: [86, 78, 66],
        headerMode: 'plaque',
        categoryMode: 'ribbon',
        pageBorder: 'double',
        usePriceLeaders: true,
        itemTone: 'menu',
    };
}

async function imageUrlToPngDataUrl(url?: string): Promise<string | null> {
    if (!url || typeof window === 'undefined' || typeof Image === 'undefined' || typeof document === 'undefined') {
        return null;
    }
    if (logoDataUrlCache.has(url)) {
        return logoDataUrlCache.get(url) || null;
    }

    return new Promise((resolve) => {
        const finish = (dataUrl: string | null) => {
            logoDataUrlCache.set(url, dataUrl);
            resolve(dataUrl);
        };
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const width = image.naturalWidth || image.width;
                const height = image.naturalHeight || image.height;
                if (!width || !height) {
                    finish(null);
                    return;
                }
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext('2d');
                if (!context) {
                    finish(null);
                    return;
                }
                context.drawImage(image, 0, 0, width, height);
                finish(canvas.toDataURL('image/png'));
            } catch {
                finish(null);
            }
        };
        image.onerror = () => finish(null);
        image.src = url;
    });
}

function getContainedImageSize(
    sourceWidth: number,
    sourceHeight: number,
    maxWidth: number,
    maxHeight: number,
): { width: number; height: number } {
    if (!sourceWidth || !sourceHeight) return { width: maxWidth, height: maxHeight };
    const ratio = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
    return {
        width: sourceWidth * ratio,
        height: sourceHeight * ratio,
    };
}

function isAscii(value: string): boolean {
    return /^[\x20-\x7E]+$/.test(value);
}

function readableCurrencyPrefix(currency: string, currencyCode?: string): string {
    const token = String(currency || '').trim();
    const code = String(currencyCode || '').trim().toUpperCase();
    const pdfSafeToken = (() => {
        if (token === '₹' || code === 'INR') return 'Rs';
        if (token === '€') return 'EUR';
        if (token === '£') return 'GBP';
        if (token === '¥') return 'JPY';
        if (token === '₩') return 'KRW';
        if (token === '₺') return 'TRY';
        if (token === '₽') return 'RUB';
        if (token === '₫') return 'VND';
        if (token && isAscii(token)) return token;
        return code;
    })();

    if (!pdfSafeToken) return '';
    return /^[A-Z]{3}$/.test(pdfSafeToken) || pdfSafeToken === 'Rs'
        ? `${pdfSafeToken} `
        : pdfSafeToken;
}

function formatPrice(price: string | undefined, currency: string, currencyCode?: string): string {
    if (!price) return '';
    const rawPrice = String(price).trim();
    if (!rawPrice) return '';

    const rawCurrencyToken = String(currency || '').trim();
    const rawCurrencyCode = String(currencyCode || '').trim();
    const currencyPrefix = readableCurrencyPrefix(rawCurrencyToken, rawCurrencyCode);
    const currencyMarkers = [rawCurrencyToken, rawCurrencyCode, currencyPrefix.trim()]
        .filter(Boolean)
        .map((marker) => marker.toLowerCase());
    const hasCurrency = currencyMarkers.some((marker) => rawPrice.toLowerCase().includes(marker));
    const numericCandidate = rawPrice
        .replace(/,/g, '')
        .replace(rawCurrencyToken, '')
        .replace(rawCurrencyCode, '')
        .replace(currencyPrefix.trim(), '')
        .trim();

    if (/^-?\d+(\.\d+)?$/.test(numericCandidate)) {
        const numericPrice = Number(numericCandidate);
        const formattedNumber = Number.isInteger(numericPrice)
            ? numericPrice.toFixed(0)
            : numericPrice.toFixed(2);
        return currencyPrefix ? `${currencyPrefix}${formattedNumber}` : formattedNumber;
    }

    if (hasCurrency || !currencyPrefix) return rawPrice;
    if (!/\d/.test(rawPrice)) return rawPrice;
    return `${currencyPrefix}${rawPrice}`;
}

function getFormat(settings: MenuCardExportSettings): 'a4' | 'a5' | 'letter' {
    return settings.paperSize === 'letter' ? 'letter' : settings.paperSize;
}

function getColumnCount(settings: MenuCardExportSettings): number {
    if (settings.preset === 'whatsapp' || settings.styleId === 'premium') return 1;
    if (settings.styleId === 'compact' && settings.paperSize === 'a4') return 3;
    return 2;
}

function getHeaderSubtitle(source: MenuCardPrintSource): string {
    const profile = resolveMenuCardBusinessPrintProfile({
        businessCategory: source.business.businessCategory,
        catalogKind: source.business.catalogKind,
        offeringKind: source.business.offeringKind,
    });
    const title = source.menu.title || profile.fallbackTitle;
    return title.trim().toLowerCase() === 'menu' && profile.documentLabel !== 'Menu'
        ? profile.documentLabel
        : title;
}

function getFontSizes(settings: MenuCardExportSettings) {
    if (settings.density === 'compact') {
        return { item: 8.5, description: 7, category: 10, gap: 3.6 };
    }
    if (settings.density === 'comfortable') {
        return { item: 11, description: 8.5, category: 13, gap: 5.2 };
    }
    return { item: 9.8, description: 7.8, category: 11.5, gap: 4.4 };
}

function drawPageBase(doc: jsPDF, style: MenuCardVisualStyle, pageWidth: number, pageHeight: number) {
    setFillRgb(doc, style.paperColor);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    setDrawRgb(doc, style.borderColor);
    doc.setLineWidth(0.45);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'S');

    if (style.pageBorder === 'double') {
        doc.setLineWidth(0.18);
        doc.rect(10.5, 10.5, pageWidth - 21, pageHeight - 21, 'S');
    }

    const corner = 12;
    doc.setLineWidth(0.24);
    doc.line(8, 18, 8 + corner, 18);
    doc.line(18, 8, 18, 8 + corner);
    doc.line(pageWidth - 8, 18, pageWidth - 8 - corner, 18);
    doc.line(pageWidth - 18, 8, pageWidth - 18, 8 + corner);
    doc.line(8, pageHeight - 18, 8 + corner, pageHeight - 18);
    doc.line(18, pageHeight - 8, 18, pageHeight - 8 - corner);
    doc.line(pageWidth - 8, pageHeight - 18, pageWidth - 8 - corner, pageHeight - 18);
    doc.line(pageWidth - 18, pageHeight - 8, pageWidth - 18, pageHeight - 8 - corner);
}

function getItemLayout(doc: jsPDF, item: PrintItem, width: number, source: MenuCardPrintSource, settings: MenuCardExportSettings) {
    const sizes = getFontSizes(settings);
    const price = formatPrice(item.price, source.menu.currency, source.menu.currencyCode);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sizes.item);
    const priceWidth = price
        ? Math.min(width * 0.45, Math.max(18, doc.getTextWidth(price) + 3))
        : 0;
    const nameWidth = Math.max(width - priceWidth - 2, width * 0.5);
    const maxNameLines = settings.density === 'compact' ? 2 : 3;
    const nameLines = (doc.splitTextToSize(item.name, nameWidth) as string[]).slice(0, maxNameLines);
    return { nameLines, nameWidth, price, priceWidth };
}

function itemHeight(doc: jsPDF, item: PrintItem, width: number, source: MenuCardPrintSource, settings: MenuCardExportSettings): number {
    const sizes = getFontSizes(settings);
    const layout = getItemLayout(doc, item, width, source, settings);
    const nameLineHeight = settings.density === 'compact' ? 3.7 : settings.density === 'comfortable' ? 4.8 : 4.2;
    const desc = settings.includeDescriptions ? item.description || '' : '';
    const descLines = desc ? (doc.splitTextToSize(desc, width - 4) as string[]).length : 0;
    return Math.max(1, layout.nameLines.length) * nameLineHeight + sizes.gap + descLines * 3.3 + item.attributes.length * 3.4 + 1.8;
}

function drawLogoMark(
    doc: jsPDF,
    source: MenuCardPrintSource,
    logoDataUrl: string | null,
    x: number,
    y: number,
    boxSize: number,
    style: MenuCardVisualStyle,
) {
    setFillRgb(doc, [255, 255, 255]);
    setDrawRgb(doc, style.borderColor);
    doc.setLineWidth(0.22);
    doc.roundedRect(x, y, boxSize, boxSize, 2, 2, 'FD');

    if (logoDataUrl) {
        try {
            const imageProperties = doc.getImageProperties(logoDataUrl);
            const size = getContainedImageSize(imageProperties.width, imageProperties.height, boxSize - 4, boxSize - 4);
            doc.addImage(
                logoDataUrl,
                'PNG',
                x + (boxSize - size.width) / 2,
                y + (boxSize - size.height) / 2,
                size.width,
                size.height,
            );
            return;
        } catch {
            // Fall through to the initial mark.
        }
    }

    setTextRgb(doc, style.accentColor);
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text(source.business.name.charAt(0).toUpperCase(), x + boxSize / 2, y + boxSize / 2 + 3.2, { align: 'center' });
}

function drawPdfMenuListAttribution(
    doc: jsPDF,
    pageWidth: number,
    y: number,
    color: RgbColor,
    activePlanType?: string | null,
) {
    if (!resolveMenuListAttributionPolicy({ activePlanType }).showAttribution) {
        return;
    }

    const text = MENU_LIST_MENU_ATTRIBUTION_TEXT;
    const logoHeight = 3;
    const logoWidth = getMenuListLogoMarkWidth(logoHeight);
    const gap = 1.4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const textWidth = doc.getTextWidth(text);
    const startX = pageWidth / 2 - (logoWidth + gap + textWidth) / 2;

    try {
        const logo = createMenuListLogoMarkDataUrl();
        doc.addImage(logo.dataUrl, 'PNG', startX, y - logoHeight + 0.6, logoWidth, logoHeight);
        setTextRgb(doc, color);
        doc.text(text, startX + logoWidth + gap, y);
    } catch {
        setTextRgb(doc, color);
        doc.text(text, pageWidth / 2, y, { align: 'center' });
    }
}

function drawHeader(
    doc: jsPDF,
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    pageWidth: number,
    logoDataUrl: string | null,
    style: MenuCardVisualStyle,
): number {
    const [textR, textG, textB] = textColorForFill(style.accentColor);
    const hasContact = settings.includeContactBlock && !!(source.business.address || source.business.phone);
    const hasLogo = !!logoDataUrl;
    const headerHeight = style.headerMode === 'editorial'
        ? (hasContact ? 48 : 42)
        : style.headerMode === 'compact-card'
            ? (hasContact ? 44 : 32)
            : (hasContact ? 48 : 42);

    if (style.headerMode === 'editorial') {
        if (hasLogo) {
            drawLogoMark(doc, source, logoDataUrl, pageWidth / 2 - 8, 14, 16, style);
        }
        const titleY = hasLogo ? 34 : 24;
        setTextRgb(doc, style.accentColor);
        doc.setFont('times', 'bold');
        doc.setFontSize(settings.preset === 'whatsapp' ? 18 : 22);
        doc.text(source.business.name, pageWidth / 2, titleY, { align: 'center', maxWidth: pageWidth - 44 });
        doc.setFont('times', 'italic');
        doc.setFontSize(10);
        setTextRgb(doc, style.mutedColor);
        doc.text(getHeaderSubtitle(source), pageWidth / 2, titleY + 7, { align: 'center' });
        setDrawRgb(doc, style.accentColor);
        doc.setLineWidth(0.28);
        doc.line(22, titleY + 11, pageWidth - 22, titleY + 11);
    } else if (style.headerMode === 'compact-card') {
        const cardX = 16;
        const cardY = 15;
        const cardH = hasContact ? 28 : 18;
        setFillRgb(doc, blendRgb(style.accentColor, style.paperColor, 0.12));
        setDrawRgb(doc, style.borderColor);
        doc.roundedRect(cardX, cardY, pageWidth - cardX * 2, cardH, 2.5, 2.5, 'FD');
        if (hasLogo) drawLogoMark(doc, source, logoDataUrl, cardX + 4, cardY + 3, 13, style);
        setTextRgb(doc, style.accentColor);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(source.business.name.toUpperCase(), pageWidth / 2, cardY + 8.6, { align: 'center', maxWidth: pageWidth - 56 });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        setTextRgb(doc, style.mutedColor);
        doc.text(getHeaderSubtitle(source), pageWidth / 2, cardY + 15, { align: 'center' });
    } else {
        if (hasLogo) drawLogoMark(doc, source, logoDataUrl, 18, 17, 17, style);
        doc.setFont('times', 'bold');
        doc.setFontSize(settings.preset === 'whatsapp' ? 16 : 18);
        const plaqueWidth = Math.min(pageWidth - 72, Math.max(72, doc.getTextWidth(source.business.name.toUpperCase()) + 28));
        const plaqueX = (pageWidth - plaqueWidth) / 2;
        setFillRgb(doc, style.accentColor);
        setDrawRgb(doc, style.borderColor);
        doc.roundedRect(plaqueX, 16, plaqueWidth, 13, 2, 2, 'FD');
        doc.setTextColor(textR, textG, textB);
        doc.text(source.business.name.toUpperCase(), pageWidth / 2, 24.7, { align: 'center', maxWidth: plaqueWidth - 10 });

        setTextRgb(doc, style.mutedColor);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(getHeaderSubtitle(source).toUpperCase(), pageWidth / 2, 34, { align: 'center' });
        setDrawRgb(doc, style.borderColor);
        doc.setLineWidth(0.22);
        doc.line(24, 34, pageWidth / 2 - 22, 34);
        doc.line(pageWidth / 2 + 22, 34, pageWidth - 24, 34);
    }

    if (hasContact) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        setTextRgb(doc, style.mutedColor);
        const contact = [source.business.address, source.business.phone].filter(Boolean).join('  |  ');
        doc.text(contact, pageWidth / 2, headerHeight - 7, { align: 'center', maxWidth: pageWidth - 28 });
    }

    return headerHeight + 4;
}

function drawFooter(
    doc: jsPDF,
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    qrDataUrl: string | null,
    generatedAt: Date,
) {
    const total = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerY = pageHeight - 12;

    for (let page = 1; page <= total; page += 1) {
        doc.setPage(page);
        setDrawRgb(doc, blendRgb(hexToRgb(source.business.brandTokens.accentColor), [210, 210, 210], 0.22));
        doc.setLineWidth(0.25);
        doc.line(12, footerY - 8, pageWidth - 12, footerY - 8);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(7);
        drawPdfMenuListAttribution(doc, pageWidth, footerY - 4.1, [120, 120, 120], source.business.activePlanType);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(7);
        doc.text(`Generated: ${formatArtifactDate(generatedAt)}`, 12, footerY, { align: 'left' });
        doc.text(`Page ${page} of ${total}`, pageWidth / 2, footerY, { align: 'center' });

        if (settings.includeUpdatedDate) {
            const updated = source.menu.updatedAt ? new Date(source.menu.updatedAt).toLocaleDateString() : new Date().toLocaleDateString();
            doc.text(`Menu Updated: ${updated}`, pageWidth - 12, footerY, { align: 'right' });
        }

        if (page === 1 && settings.includeQr && qrDataUrl) {
            const qrSize = settings.preset === 'whatsapp' ? 22 : 20;
            doc.addImage(qrDataUrl, 'PNG', 12, pageHeight - 42, qrSize, qrSize);
            doc.setFontSize(7);
            doc.setTextColor(80, 80, 80);
            doc.text(source.qr.label, 36, pageHeight - 32);
            doc.setTextColor(120, 120, 120);
            doc.text(source.qr.shortUrl || source.business.publicMenuUrl, 36, pageHeight - 27, { maxWidth: pageWidth - 50 });
        }
    }
}

function drawCategoryTitle(
    doc: jsPDF,
    category: PrintCategory,
    x: number,
    y: number,
    width: number,
    settings: MenuCardExportSettings,
    style: MenuCardVisualStyle,
) {
    const sizes = getFontSizes(settings);
    const label = category.name.toUpperCase();

    if (style.categoryMode === 'editorial') {
        doc.setFont('times', 'italic');
        doc.setFontSize(Math.max(15, sizes.category + 5));
        setTextRgb(doc, style.accentColor);
        const lines = doc.splitTextToSize(category.name, width) as string[];
        lines.slice(0, 2).forEach((line, index) => {
            doc.text(line, x, y + 6 + index * 6);
        });
        setDrawRgb(doc, style.borderColor);
        doc.setLineWidth(0.22);
        doc.line(x, y + 9 + Math.max(0, lines.length - 1) * 6, x + width, y + 9 + Math.max(0, lines.length - 1) * 6);
        return y + 14 + Math.max(0, lines.length - 1) * 6;
    }

    if (style.categoryMode === 'boxed') {
        const labelLines = (doc.splitTextToSize(label, width - 6) as string[]).slice(0, 2);
        const categoryFontSize = labelLines.length > 1 ? Math.max(8.5, sizes.category - 1.2) : sizes.category;
        const lineHeight = labelLines.length > 1 ? 4.3 : 4.8;
        const boxHeight = Math.max(8, labelLines.length * lineHeight + 3.4);
        const firstBaseline = y + (boxHeight - labelLines.length * lineHeight) / 2 + 3.7;

        setFillRgb(doc, blendRgb(style.accentColor, style.paperColor, 0.18));
        setDrawRgb(doc, style.borderColor);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, y, width, boxHeight, 1.4, 1.4, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(categoryFontSize);
        setTextRgb(doc, style.accentColor);
        labelLines.forEach((line, index) => {
            doc.text(line, x + width / 2, firstBaseline + index * lineHeight, { align: 'center' });
        });
        return y + boxHeight + 6;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sizes.category);
    const labelWidth = Math.min(width, Math.max(34, doc.getTextWidth(label) + 10));
    const labelX = x + (width - labelWidth) / 2;
    setFillRgb(doc, style.accentColor);
    setDrawRgb(doc, style.borderColor);
    doc.roundedRect(labelX, y, labelWidth, 8, 1.5, 1.5, 'FD');
    const [textR, textG, textB] = textColorForFill(style.accentColor);
    doc.setTextColor(textR, textG, textB);
    doc.text(label, x + width / 2, y + 5.4, { align: 'center', maxWidth: labelWidth - 6 });
    setDrawRgb(doc, style.borderColor);
    doc.setLineWidth(0.18);
    doc.line(x, y + 9.5, x + width, y + 9.5);
    return y + 13;
}

function drawDottedLeader(doc: jsPDF, startX: number, endX: number, y: number, color: RgbColor) {
    if (endX - startX < 5) return;
    const dashedDoc = doc as jsPDF & {
        setLineDashPattern?: (pattern: number[], phase: number) => void;
    };
    setDrawRgb(doc, color);
    doc.setLineWidth(0.18);
    if (typeof dashedDoc.setLineDashPattern === 'function') {
        dashedDoc.setLineDashPattern([0.45, 1.25], 0);
        doc.line(startX, y, endX, y);
        dashedDoc.setLineDashPattern([], 0);
        return;
    }
    doc.line(startX, y, endX, y);
}

function drawItem(doc: jsPDF, item: PrintItem, x: number, y: number, width: number, source: MenuCardPrintSource, settings: MenuCardExportSettings, style: MenuCardVisualStyle): number {
    const sizes = getFontSizes(settings);
    const nameLineHeight = settings.density === 'compact' ? 3.7 : settings.density === 'comfortable' ? 4.8 : 4.2;
    const layout = getItemLayout(doc, item, width, source, settings);
    const { nameLines, nameWidth, price, priceWidth } = layout;

    doc.setFont(style.categoryMode === 'editorial' && style.itemTone !== 'product' ? 'times' : 'helvetica', 'bold');
    doc.setFontSize(sizes.item);
    doc.setTextColor(30, 30, 30);
    nameLines.forEach((line, index) => {
        doc.text(line, x, y + index * nameLineHeight, { maxWidth: nameWidth });
    });

    if (price) {
        doc.setFont('helvetica', 'normal');
        setTextRgb(doc, style.accentColor);
        doc.text(price, x + width, y, { align: 'right' });
        if (style.usePriceLeaders) {
            const firstLineWidth = doc.getTextWidth(nameLines[0] || item.name);
            drawDottedLeader(
                doc,
                x + Math.min(firstLineWidth + 2.2, nameWidth - 1),
                x + width - priceWidth - 1,
                y - 1.1,
                blendRgb(style.borderColor, style.paperColor, 0.62),
            );
        }
    }

    const postNameGap = settings.density === 'compact' ? 1.8 : settings.density === 'comfortable' ? 3 : 2.4;
    let nextY = y + Math.max(1, nameLines.length) * nameLineHeight + postNameGap;

    if (settings.includeDescriptions && item.description) {
        doc.setFont(style.categoryMode === 'editorial' && style.itemTone !== 'product' ? 'times' : 'helvetica', style.itemTone === 'service' ? 'normal' : 'italic');
        doc.setFontSize(sizes.description);
        setTextRgb(doc, style.mutedColor);
        const descLines = doc.splitTextToSize(item.description, width - 4) as string[];
        descLines.slice(0, settings.density === 'compact' ? 2 : 4).forEach((line) => {
            doc.text(line, x + 3, nextY);
            nextY += 3.3;
        });
    }

    if (item.attributes.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(sizes.description);
        setTextRgb(doc, style.mutedColor);
        item.attributes.slice(0, 6).forEach((attribute) => {
            const attrPrice = formatPrice(attribute.price, source.menu.currency, source.menu.currencyCode);
            doc.text(`- ${attribute.name}${attrPrice ? `  ${attrPrice}` : ''}`, x + 3, nextY);
            nextY += 3.4;
        });
    }

    return nextY + 2;
}

export async function renderPdf(
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    overrides: MenuCardSafeOverrides = {},
    generatedAt: Date = new Date(),
): Promise<MenuCardGeneratedArtifact> {
    const template = getMenuCardTemplate(settings.styleId);
    const sourceHash = buildPrintSourceHash(source, settings, overrides);
    const categories = applySafeLayoutOverrides(source.menu.categories, overrides);
    const doc = new jsPDF({ orientation: settings.orientation, unit: 'mm', format: getFormat(settings) });
    doc.setCreationDate(generatedAt);
    doc.setProperties(buildPdfDocumentProperties({ source, settings, template, sourceHash }));
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const businessProfile = resolveMenuCardBusinessPrintProfile({
        businessCategory: source.business.businessCategory,
        catalogKind: source.business.catalogKind,
        offeringKind: source.business.offeringKind,
    });
    const style = getVisualStyle(template.family, hexToRgb(source.business.brandTokens.accentColor), businessProfile.tone);
    const printBox = getPrintBox(settings);
    const margin = printBox.safeMargin;
    const footerReserve = printBox.footerReserve;
    const contentBottom = pageHeight - footerReserve - 14;
    const columns = Math.max(1, Math.min(template.columns, getColumnCount(settings)));
    const gutter = columns > 1 ? 8 : 0;
    const columnWidth = (pageWidth - margin * 2 - gutter * (columns - 1)) / columns;
    const logoDataUrl = settings.includeLogo ? await imageUrlToPngDataUrl(source.business.logoUrl) : null;
    const qrDataUrl = settings.includeQr ? await renderQr(source.qr.destinationUrl, source.qr.errorCorrection) : null;

    drawPageBase(doc, style, pageWidth, pageHeight);
    const firstPageContentTop = drawHeader(doc, source, settings, pageWidth, logoDataUrl, style);
    let y = firstPageContentTop;
    let columnIndex = 0;
    let pageIndex = 1;

    const getColumnTop = () => (
        pageIndex === 1
            ? Math.max(firstPageContentTop, margin + 4)
            : margin + 4
    );

    const nextColumnOrPage = () => {
        if (columnIndex < columns - 1) {
            columnIndex += 1;
            y = getColumnTop();
        } else {
            doc.addPage();
            drawPageBase(doc, style, pageWidth, pageHeight);
            pageIndex += 1;
            columnIndex = 0;
            y = getColumnTop();
        }
    };

    const columnX = () => margin + columnIndex * (columnWidth + gutter);

    categories.forEach((category) => {
        const estimatedCategoryHeight = 10 + category.items.reduce((sum, item) => sum + itemHeight(doc, item, columnWidth, source, settings), 0);
        if (estimatedCategoryHeight < (contentBottom - margin) && y + Math.min(estimatedCategoryHeight, 40) > contentBottom) {
            nextColumnOrPage();
        }

        y = drawCategoryTitle(doc, category, columnX(), y, columnWidth, settings, style);

        category.items.forEach((item) => {
            const height = itemHeight(doc, item, columnWidth, source, settings);
            if (y + height > contentBottom) {
                nextColumnOrPage();
            }
            y = drawItem(doc, item, columnX(), y, columnWidth, source, settings, style);
        });

        y += 4;
    });

    drawFooter(doc, source, settings, qrDataUrl, generatedAt);

    const blob = doc.output('blob');

    return {
        blob,
        filename: buildArtifactFilename({ source, settings, template, sourceHash, extension: 'pdf', generatedAt }),
        mimeType: 'application/pdf',
        pageCount: doc.getNumberOfPages(),
        sourceHash,
    };
}
