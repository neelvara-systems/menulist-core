/**
 * MENU PDF GENERATOR
 * ═══════════════════════════════════════════════════════════════
 * v2.2 — Professional bistro-style layout with Michelin typography
 *
 * Design decisions:
 * - Full-width charcoal header band (#2d2d2d) with white store name + letter spacing
 * - Left accent bar on category headers (3mm filled rect, charcoal)
 * - Standard density: clean alignment (no leaders) — Michelin style
 * - Compact/High-density: dashed leader lines (drawn, not text)
 * - Price: normal weight, fixed 22mm right column
 * - Description: indented, italic, lighter gray, clamped at 400 chars
 * - Footer: separator + menu version | page | "Menu Updated:" + print instruction
 * - Content-based CRC32 versioning for menu traceability
 *
 * @see __docs__/pdf-surface/pdf-surface_impl.md
 */

import { FEATURE_FLAGS } from "@/config/features";
import { jsPDF } from "jspdf";

interface MenuItem {
    id: string;
    name: Record<string, string>;
    description?: Record<string, string>;
    price?: string;
    category?: string;
    active?: boolean;
    available?: boolean;
    attributes?: Array<{
        id: string;
        name: Record<string, string>;
        price?: string;
        active?: boolean;
    }>;
}

interface Category {
    id: string;
    name: Record<string, string>;
    active?: boolean;
}

export interface MenuPdfOptions {
    projectName: string;
    storeName: string;
    language: string;
    menuUrl?: string;
    currency?: string;
    showDescriptions?: boolean;
    showQrCode?: boolean;
    headerColor?: string;
    address?: string;
    contactLine?: string;
    items: MenuItem[];
    categories: Category[];
    showUpdatedOn?: boolean;
}

export interface GeneratedPdf {
    blob: Blob;
    filename: string;
    snapshotHash: string;
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const ACCENT = { r: 45, g: 45, b: 45 };       // charcoal #2d2d2d
const ACCENT_LIGHT = { r: 80, g: 80, b: 80 }; // for rules/subtext
const MARGIN = 18;
const FOOTER_RESERVE = 20;
const PRICE_COL_WIDTH = 22;                    // mm — fixed right column for price alignment
const MAX_DESC_LENGTH = 400;                   // chars — prevent layout overflow
const MAX_ATTRS_PER_ITEM = 6;                  // max visible attributes per item
const MAX_PAGES_BEFORE_DENSITY_FALLBACK = 6;   // auto-switch to high-density above this
const MICRO_SPACING_INTERVAL = 6;              // insert breathing space every N items in a category
const CATEGORY_TOP_SPACING = 6;                // mm — breathing room before each category
const PAGE_TOP_CATEGORY_PAD = 6;               // mm — extra padding when category starts at page top

// ── Density ───────────────────────────────────────────────────────────────────
type DensityMode = "standard" | "compact" | "high-density";
interface DC { item: number; desc: number; itemGap: number; descLH: number; catH: number; }

const DENSITY: Record<DensityMode, DC> = {
    "standard": { item: 11, desc: 9, itemGap: 6, descLH: 4.2, catH: 13 },
    "compact": { item: 10, desc: 8, itemGap: 4.5, descLH: 3.8, catH: 12 },
    "high-density": { item: 9, desc: 7.5, itemGap: 3.5, descLH: 3.2, catH: 11 },
};

function detectDensity(n: number): DensityMode {
    if (n <= 40) return "standard";
    if (n <= 80) return "compact";
    return "high-density";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format price with currency symbol and space: "₹ 180.00" */
function fmtPrice(price: string | undefined, currency: string): string {
    if (!price) return "";
    const n = parseFloat(price);
    if (isNaN(n)) return price;
    return currency ? `${currency} ${n.toFixed(2)}` : n.toFixed(2);
}

function fmtDate(): string {
    return new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Strip emoji and unsupported Unicode glyphs that Helvetica cannot render.
 *  Uses codepoint iteration instead of regex 'u' flag (ES5 target compat). */
function stripUnsupported(text: string): string {
    let result = "";
    for (let i = 0; i < text.length; i++) {
        const code = text.codePointAt(i);
        if (code === undefined) continue;
        // Skip surrogate pairs (emoji in supplementary planes > U+FFFF)
        if (code > 0xFFFF) { i++; continue; }
        // Skip common symbol/dingbat/variation ranges
        if (code >= 0x2600 && code <= 0x26FF) continue; // misc symbols
        if (code >= 0x2700 && code <= 0x27BF) continue; // dingbats
        if (code >= 0xFE00 && code <= 0xFE0F) continue; // variation selectors
        if (code === 0x200D) continue;                   // zero-width joiner
        result += text[i];
    }
    return result.trim();
}

/** Clamp text to maxLength, adding ellipsis if truncated */
function clampText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 1) + "…";
}

// ── CRC32 content hash ──────────────────────────────────────────────────────
const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[i] = c;
    }
    return table;
})();

function crc32(str: string): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < str.length; i++) {
        crc = CRC32_TABLE[(crc ^ str.charCodeAt(i)) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

/** Content-based menu version: deterministic hash of renderable menu state */
function createMenuVersion(snapshot: string): string {
    const hash = crc32(snapshot).toString(36);
    return `m-${hash}`;
}

// ── Snapshot builder ────────────────────────────────────────────────────────
interface PdfSnapshot {
    storeName: string;
    currency: string;
    language: string;
    categories: Array<{
        name: string;
        items: Array<{
            name: string;
            price: string;
            description: string;
            attributes: Array<{ name: string; price: string }>;
        }>;
    }>;
}

/** Build canonical snapshot: strip internal data, resolve language, normalize */
function buildPdfSnapshot(
    items: MenuItem[],
    categories: Category[],
    language: string,
    storeName: string,
    currency: string,
): PdfSnapshot {
    const catMap = new Map<string, Category>();
    categories.forEach(c => { if (c.active !== false) catMap.set(c.id, c); });

    const byCategory = new Map<string, MenuItem[]>();
    const uncategorized: MenuItem[] = [];
    const activeItems = items.filter(it => it.active !== false && it.available !== false);

    activeItems.forEach(item => {
        const cid = item.category;
        if (cid && catMap.has(cid)) {
            if (!byCategory.has(cid)) byCategory.set(cid, []);
            byCategory.get(cid)!.push(item);
        } else {
            uncategorized.push(item);
        }
    });

    const snapshotCategories: PdfSnapshot["categories"] = [];

    categories.forEach(cat => {
        if (cat.active === false) return;
        const catItems = byCategory.get(cat.id);
        if (!catItems || catItems.length === 0) return;
        snapshotCategories.push({
            name: stripUnsupported(cat.name?.[language] || cat.name?.["en"] || "Other"),
            items: catItems.map(item => ({
                name: stripUnsupported(item.name?.[language] || item.name?.["en"] || "Untitled"),
                price: fmtPrice(item.price, currency),
                description: clampText(
                    stripUnsupported(item.description?.[language] || item.description?.["en"] || ""),
                    MAX_DESC_LENGTH
                ),
                attributes: (item.attributes || [])
                    .filter(a => a.active !== false)
                    .slice(0, MAX_ATTRS_PER_ITEM)
                    .map(a => ({
                        name: stripUnsupported(a.name?.[language] || a.name?.["en"] || ""),
                        price: fmtPrice(a.price, currency),
                    }))
                    .filter(a => a.name),
            })),
        });
    });

    if (uncategorized.length > 0) {
        snapshotCategories.push({
            name: "Other Items",
            items: uncategorized.map(item => ({
                name: stripUnsupported(item.name?.[language] || item.name?.["en"] || "Untitled"),
                price: fmtPrice(item.price, currency),
                description: clampText(
                    stripUnsupported(item.description?.[language] || item.description?.["en"] || ""),
                    MAX_DESC_LENGTH
                ),
                attributes: (item.attributes || [])
                    .filter(a => a.active !== false)
                    .slice(0, MAX_ATTRS_PER_ITEM)
                    .map(a => ({
                        name: stripUnsupported(a.name?.[language] || a.name?.["en"] || ""),
                        price: fmtPrice(a.price, currency),
                    }))
                    .filter(a => a.name),
            })),
        });
    }

    return { storeName, currency, language, categories: snapshotCategories };
}

// ── Block height estimator ─────────────────────────────────────────────────────
const CAT_HEADER_H = 20;

interface SnapshotItem {
    name: string;
    price: string;
    description: string;
    attributes: Array<{ name: string; price: string }>;
}

function itemBlockHeight(item: SnapshotItem, cw: number, d: DC, doc: jsPDF, showDesc: boolean): number {
    const desc = showDesc ? item.description : "";
    const descLines = desc ? (doc.splitTextToSize(desc, cw - 6) as string[]).length : 0;
    const attrs = item.attributes.length;
    return d.itemGap + descLines * d.descLH + attrs * d.descLH + 2;
}

function catBlockHeight(items: SnapshotItem[], cw: number, d: DC, doc: jsPDF, showDesc: boolean): number {
    return items.reduce((h, it) => h + itemBlockHeight(it, cw, d, doc, showDesc), CAT_HEADER_H + CATEGORY_TOP_SPACING);
}

// ── Main generator ─────────────────────────────────────────────────────────────
export async function generateMenuPdf(options: MenuPdfOptions): Promise<GeneratedPdf> {
    const {
        storeName, language, menuUrl, currency = "",
        showDescriptions = true, showUpdatedOn = true,
        items, categories, address, contactLine,
    } = options;

    const enhanced = FEATURE_FLAGS.ENABLE_PDF_SURFACE;

    // Build canonical snapshot (resolved, sanitized, language-resolved)
    const snapshot = buildPdfSnapshot(items, categories, language, storeName, currency);
    const snapshotJson = JSON.stringify(snapshot);
    const menuVersion = enhanced ? createMenuVersion(snapshotJson) : "";
    const totalItems = snapshot.categories.reduce((sum, c) => sum + c.items.length, 0);

    // Density detection with page-count guard (re-run if too many pages)
    let density = enhanced ? detectDensity(totalItems) : "standard" as DensityMode;
    let d = DENSITY[density];

    const generateWithDensity = (forcedD: DC): { doc: jsPDF; blob: Blob } => {
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const PW = doc.internal.pageSize.getWidth();
        const PH = doc.internal.pageSize.getHeight();
        const CW = PW - MARGIN * 2;
        const usable = PH - MARGIN - FOOTER_RESERVE;
        const priceX = PW - MARGIN; // right-aligned within fixed column
        const nameMaxW = CW - PRICE_COL_WIDTH - 2; // available width for item name
        let y = 0;

        const ensureSpace = (need: number) => {
            if (y + need > usable) { doc.addPage(); y = MARGIN + PAGE_TOP_CATEGORY_PAD; }
        };

        // ── HEADER BAND ──────────────────────────────────────────────────────
        if (enhanced) {
            const hasSubtext = !!(address || contactLine);
            const bandH = hasSubtext ? 28 : 22;
            doc.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
            doc.rect(0, 0, PW, bandH, "F");

            // Store name — white, centered, with letter spacing
            doc.setFontSize(20);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            doc.setCharSpace(0.5);
            doc.text(storeName.toUpperCase(), PW / 2, 13, { align: "center" });
            doc.setCharSpace(0);

            let subY = 19;
            if (address) {
                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(190, 190, 190);
                doc.text(stripUnsupported(address), PW / 2, subY, { align: "center" });
                subY += 4.5;
            }
            if (contactLine) {
                doc.setFontSize(8);
                doc.setTextColor(190, 190, 190);
                doc.text(stripUnsupported(contactLine), PW / 2, subY, { align: "center" });
            }

            // Extra breathing room after header band before first category
            y = bandH + 10;
        } else {
            // Legacy plain header
            y = MARGIN;
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.text(storeName, PW / 2, y + 8, { align: "center" });
            y += 14;
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(120, 120, 120);
            doc.text("MENU", PW / 2, y, { align: "center" });
            y += 8;
            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.4);
            doc.line(MARGIN, y, PW - MARGIN, y);
            y += 8;
        }

        // ── RENDER CATEGORIES ────────────────────────────────────────────────
        snapshot.categories.forEach(cat => {
            // Block pagination: category header + min(2, items.length) items must fit
            const minItems = Math.min(2, cat.items.length);
            const minBlockH = CAT_HEADER_H + CATEGORY_TOP_SPACING +
                cat.items.slice(0, minItems).reduce((h, it) => h + itemBlockHeight(it, CW, forcedD, doc, showDescriptions), 0);
            const fullBlockH = catBlockHeight(cat.items, CW, forcedD, doc, showDescriptions);
            const pageUsable = usable - MARGIN;

            // If entire block fits on a page but not on current page, move to next
            if (fullBlockH <= pageUsable && fullBlockH > (usable - y)) {
                doc.addPage(); y = MARGIN + PAGE_TOP_CATEGORY_PAD;
            } else if (minBlockH > (usable - y)) {
                doc.addPage(); y = MARGIN + PAGE_TOP_CATEGORY_PAD;
            }

            // Category top breathing room
            y += CATEGORY_TOP_SPACING;
            ensureSpace(CAT_HEADER_H);

            if (enhanced) {
                // Left accent bar
                doc.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
                doc.rect(MARGIN, y - 4, 3, 8, "F");

                // Category name (with text wrapping for long names)
                doc.setFontSize(forcedD.catH);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(ACCENT.r, ACCENT.g, ACCENT.b);
                const catLines = doc.splitTextToSize(cat.name.toUpperCase(), CW - 8) as string[];
                catLines.forEach((line: string, idx: number) => {
                    doc.text(line, MARGIN + 6, y + 2 + (idx * (forcedD.catH * 0.4)));
                });
                y += 5 + Math.max(0, (catLines.length - 1) * (forcedD.catH * 0.4));

                // Full-width thin rule
                doc.setDrawColor(ACCENT_LIGHT.r, ACCENT_LIGHT.g, ACCENT_LIGHT.b);
                doc.setLineWidth(0.3);
                doc.line(MARGIN, y, PW - MARGIN, y);
                y += 7;
            } else {
                doc.setFontSize(forcedD.catH);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(50, 50, 50);
                doc.text(cat.name.toUpperCase(), MARGIN, y);
                y += 2;
                doc.setDrawColor(100, 100, 100);
                doc.line(MARGIN, y, MARGIN + 40, y);
                y += 7;
            }

            cat.items.forEach((item, itemIdx) => {
                ensureSpace(itemBlockHeight(item, CW, forcedD, doc, showDescriptions));

                // Micro-spacing: breathing break every N items in long categories
                if (itemIdx > 0 && itemIdx % MICRO_SPACING_INTERVAL === 0) {
                    y += 1.5;
                }

                const { name, price, description } = item;

                if (enhanced) {
                    doc.setFontSize(forcedD.item);

                    // Truncate long names so price stays on first line
                    const nameForWidth = doc.getTextWidth(name) > nameMaxW
                        ? (() => {
                            let truncated = name;
                            while (doc.getTextWidth(truncated + "…") > nameMaxW && truncated.length > 10) {
                                truncated = truncated.slice(0, -1);
                            }
                            return truncated + "…";
                        })()
                        : name;

                    // Item name — bold
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(20, 20, 20);
                    doc.text(nameForWidth, MARGIN, y);

                    // Price — normal weight, right-aligned in fixed column
                    if (price) {
                        doc.setFont("helvetica", "normal");
                        doc.setTextColor(20, 20, 20);
                        doc.text(price, priceX, y, { align: "right" });

                        // Dashed leader line (compact/high-density only)
                        if (density !== "standard") {
                            const nameEndX = MARGIN + doc.getTextWidth(nameForWidth) + 2;
                            const priceStartX = priceX - doc.getTextWidth(price) - 2;
                            if (priceStartX - nameEndX > 8) {
                                doc.setDrawColor(180, 180, 180);
                                doc.setLineWidth(0.2);
                                doc.setLineDashPattern([1, 1.5], 0);
                                doc.line(nameEndX, y - 0.5, priceStartX, y - 0.5);
                                doc.setLineDashPattern([], 0);
                            }
                        }
                    }
                } else {
                    // Legacy: simple name + right-aligned price
                    doc.setFontSize(forcedD.item);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(0, 0, 0);
                    doc.text(name, MARGIN, y);
                    if (price) {
                        doc.setFont("helvetica", "normal");
                        doc.text(price, PW - MARGIN, y, { align: "right" });
                    }
                }
                y += forcedD.itemGap;

                // Description
                if (showDescriptions && description) {
                    doc.setFontSize(forcedD.desc);
                    doc.setFont("helvetica", "italic");
                    doc.setTextColor(110, 110, 110);
                    const lines = doc.splitTextToSize(description, CW - 6) as string[];
                    lines.forEach((line: string) => {
                        doc.text(line, MARGIN + 4, y);
                        y += forcedD.descLH;
                    });
                }

                // Attributes
                if (item.attributes.length > 0) {
                    item.attributes.forEach(attr => {
                        doc.setFontSize(forcedD.desc);
                        doc.setFont("helvetica", "normal");
                        doc.setTextColor(130, 130, 130);
                        doc.text(`  · ${attr.name}${attr.price ? `  ${attr.price}` : ""}`, MARGIN + 4, y);
                        y += forcedD.descLH;
                    });
                }

                y += 2; // item bottom padding
            });

            y += 4; // category bottom spacing
        });

        // ── FOOTER (all pages) ───────────────────────────────────────────────
        const footerY = PH - 10;
        const dateStr = fmtDate();
        const total = doc.getNumberOfPages();

        for (let i = 1; i <= total; i++) {
            doc.setPage(i);

            // Light separator line
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.line(MARGIN, footerY - 5, PW - MARGIN, footerY - 5);

            doc.setFontSize(7);
            doc.setTextColor(160, 160, 160);

            if (enhanced) {
                if (menuVersion) doc.text(menuVersion, MARGIN, footerY, { align: "left" });
                doc.text(`Page ${i} of ${total}`, PW / 2, footerY, { align: "center" });
                if (showUpdatedOn !== false) {
                    doc.text(`Menu Updated: ${dateStr}`, PW - MARGIN, footerY, { align: "right" });
                }
                if (i === 1) {
                    doc.setFontSize(6.5);
                    if (menuUrl) {
                        doc.text(`View online: ${menuUrl}`, PW / 2, footerY + 4, { align: "center" });
                    }
                    // Print instruction for printer reliability
                    doc.setFontSize(5.5);
                    doc.setTextColor(180, 180, 180);
                    doc.text("Print at 100% scale for best results", PW - MARGIN, footerY + 4, { align: "right" });
                }
            } else {
                doc.text(`Page ${i} of ${total}`, PW / 2, footerY, { align: "center" });
                if (i === 1 && menuUrl) doc.text(`View online: ${menuUrl}`, PW / 2, footerY + 4, { align: "center" });
                if (showUpdatedOn !== false) doc.text(`Updated on: ${dateStr}`, PW - MARGIN, footerY + 4, { align: "right" });
            }
        }

        return { doc, blob: doc.output("blob") };
    };

    // Generate with initial density, then check page count guard
    let result = generateWithDensity(d);
    if (enhanced && density !== "high-density" && result.doc.getNumberOfPages() > MAX_PAGES_BEFORE_DENSITY_FALLBACK) {
        // Re-generate with high-density mode
        density = "high-density";
        d = DENSITY["high-density"];
        result = generateWithDensity(d);
    }

    const filename = `${storeName.replace(/[^a-zA-Z0-9]/g, "-")}-menu.pdf`;
    return { blob: result.blob, filename, snapshotHash: menuVersion };
}

export function downloadPdf(pdfResult: GeneratedPdf): void {
    const url = URL.createObjectURL(pdfResult.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pdfResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export async function generateAndDownloadMenuPdf(options: MenuPdfOptions): Promise<void> {
    downloadPdf(await generateMenuPdf(options));
}
