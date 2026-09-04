import JSZip from 'jszip';

import { downloadBlob } from '@lib/menu-kit/menuKitGenerator';

export type PrintableAssetDeliveryFile = {
    blob: Blob;
    filename: string;
};

function normalizeArchiveName(value: string): string {
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return normalized || 'menulist-asset';
}

export async function preparePrintableAssetDelivery(
    files: readonly PrintableAssetDeliveryFile[],
    archiveName: string,
): Promise<PrintableAssetDeliveryFile> {
    if (files.length === 0) throw new Error('No printable asset files were generated.');
    if (files.length === 1) return files[0];

    const zip = new JSZip();
    for (const file of files) {
        zip.file(file.filename, await file.blob.arrayBuffer());
    }

    return {
        blob: await zip.generateAsync({
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
            type: 'blob',
        }),
        filename: `${normalizeArchiveName(archiveName)}.zip`,
    };
}

export async function downloadPrintableAssetFiles(
    files: readonly PrintableAssetDeliveryFile[],
    archiveName: string,
): Promise<PrintableAssetDeliveryFile> {
    const delivery = await preparePrintableAssetDelivery(files, archiveName);
    downloadBlob(delivery.blob, delivery.filename);
    return delivery;
}
