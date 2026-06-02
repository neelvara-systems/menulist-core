import JSZip from 'jszip';
import type { MenuCardExportSettings, MenuCardSafeOverrides } from '../models/exportTypes';
import type { MenuCardPrintShopPacket } from '../models/printShopTypes';
import type { MenuCardPrintSource } from '../models/printModel';
import { getMenuCardTemplate } from '../templates/registry';
import { renderPdf } from '../render/renderPdf';
import { buildArtifactFilename } from '../render/artifactMetadata';
import { buildPrintInstructions } from './buildPrintInstructions';
import { buildQrTestChecklist } from './buildQrTestChecklist';

export async function buildPrintShopPacket(
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    overrides: MenuCardSafeOverrides = {},
): Promise<MenuCardPrintShopPacket> {
    const zip = new JSZip();
    const generatedAt = new Date();
    const packetSettings = { ...settings, preset: 'print_shop_packet' as const };
    const template = getMenuCardTemplate(packetSettings.styleId);
    const pdf = await renderPdf(source, packetSettings, overrides, generatedAt);

    zip.file('menu-print.pdf', await pdf.blob.arrayBuffer());
    zip.file('PRINT_INSTRUCTIONS.txt', buildPrintInstructions(source, packetSettings, {
        generatedAt,
        pageCount: pdf.pageCount,
        sourceHash: pdf.sourceHash,
    }));
    zip.file('QR_TEST_CHECKLIST.txt', buildQrTestChecklist(source));

    const blob = await zip.generateAsync({ type: 'blob' });
    const filename = buildArtifactFilename({
        source,
        settings: packetSettings,
        template,
        sourceHash: pdf.sourceHash,
        extension: 'zip',
        generatedAt,
    });

    return {
        blob,
        filename,
        fileCount: 3,
        pageCount: pdf.pageCount,
        sourceHash: pdf.sourceHash,
    };
}
