import JSZip from 'jszip';
import type { MenuCardExportSettings, MenuCardSafeOverrides } from '../models/exportTypes';
import type { MenuCardPrintShopPacket } from '../models/printShopTypes';
import type { MenuCardPrintSource } from '../models/printModel';
import { renderPdf } from '../render/renderPdf';
import { buildPrintInstructions } from './buildPrintInstructions';
import { buildQrTestChecklist } from './buildQrTestChecklist';

function safeFilename(value: string): string {
    return (value || 'menu')
        .replace(/[^a-zA-Z0-9\s_-]/g, '')
        .trim()
        .replace(/\s+/g, '_') || 'menu';
}

export async function buildPrintShopPacket(
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    overrides: MenuCardSafeOverrides = {},
): Promise<MenuCardPrintShopPacket> {
    const zip = new JSZip();
    const pdf = await renderPdf(source, { ...settings, preset: 'print_shop_packet' }, overrides);

    zip.file('menu-print.pdf', await pdf.blob.arrayBuffer());
    zip.file('PRINT_INSTRUCTIONS.txt', buildPrintInstructions(source, settings));
    zip.file('QR_TEST_CHECKLIST.txt', buildQrTestChecklist(source));

    const blob = await zip.generateAsync({ type: 'blob' });
    const filename = `${safeFilename(`${source.business.name}_${source.menu.title}`)}_PrintShopPacket.zip`;

    return {
        blob,
        filename,
        fileCount: 3,
        pageCount: pdf.pageCount,
        sourceHash: pdf.sourceHash,
    };
}
