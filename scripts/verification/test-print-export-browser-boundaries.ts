import assert from 'node:assert/strict';
import { shareBrowserFile } from '../../src/lib/export/browserFileShare';
import {
    readLocalPdfDownloadAt,
    recordLocalPdfDownload,
    resolveLocalExportStorageScope,
} from '../../src/lib/export/localExportHistory';
import { buildQrCodeFilename } from '../../src/lib/utils/qrCode';
import { getQrCodeFilename } from '../../src/lib/utils/feedbackQrCode';
import {
    listLocalMenuCardExports,
    projectMenuCardLocalHistoryRecord,
    saveLocalMenuCardExport,
} from '../../src/lib/menu-card-export/repository/menuCardExportRepository';

type NavigatorShareMock = {
    canShare?: (data?: ShareData) => boolean;
    share?: (data?: ShareData) => Promise<void>;
};

class LocalStorageMock {
    private readonly values = new Map<string, string>();
    public rejectWrites = false;

    clear(): void {
        this.values.clear();
    }

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    removeItem(key: string): void {
        this.values.delete(key);
    }

    setItem(key: string, value: string): void {
        if (this.rejectWrites) throw new Error('quota_exceeded');
        this.values.set(key, value);
    }
}

function setNavigator(value: NavigatorShareMock): void {
    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value,
    });
}

async function testBrowserFileShareBoundary(): Promise<void> {
    const blob = new Blob(['menu'], { type: 'application/pdf' });

    setNavigator({});
    assert.equal(
        await shareBrowserFile({ blob, filename: 'menu.pdf', title: 'Menu' }),
        'unsupported',
    );

    setNavigator({ canShare: () => false, share: async () => undefined });
    assert.equal(
        await shareBrowserFile({ blob, filename: 'menu.pdf', title: 'Menu' }),
        'unsupported',
    );

    const originalFile = globalThis.File;
    Object.defineProperty(globalThis, 'File', { configurable: true, value: undefined });
    setNavigator({ canShare: () => true, share: async () => undefined });
    assert.equal(
        await shareBrowserFile({ blob, filename: 'menu.pdf', title: 'Menu' }),
        'unsupported',
    );
    Object.defineProperty(globalThis, 'File', { configurable: true, value: originalFile });

    let shareCalls = 0;
    setNavigator({
        canShare: () => true,
        share: async () => {
            shareCalls += 1;
        },
    });
    assert.equal(
        await shareBrowserFile({ blob, filename: 'menu.pdf', title: 'Menu' }),
        'shared',
    );
    assert.equal(shareCalls, 1);

    setNavigator({
        canShare: () => true,
        share: async () => {
            throw new DOMException('cancelled', 'AbortError');
        },
    });
    assert.equal(
        await shareBrowserFile({ blob, filename: 'menu.pdf', title: 'Menu' }),
        'cancelled',
    );

    setNavigator({
        canShare: () => true,
        share: async () => {
            throw new Error('share_failed');
        },
    });
    await assert.rejects(
        shareBrowserFile({ blob, filename: 'menu.pdf', title: 'Menu' }),
        /share_failed/,
    );
}

function testScopedBestEffortHistory(): void {
    const storage = new LocalStorageMock();
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: {},
    });
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: storage,
    });

    const artifact = {
        blob: new Blob(['menu'], { type: 'application/pdf' }),
        filename: 'menu.pdf',
        pageCount: 1,
        sourceHash: 'hash-1',
    } as any;
    const common = {
        artifact,
        preset: 'home_print' as const,
        projectId: 'same-project-id',
        projectName: 'Menu',
        storeName: 'Store A',
        styleId: 'classic',
    };

    saveLocalMenuCardExport({ ...common, storageScope: '1:10' });
    assert.equal(listLocalMenuCardExports('same-project-id', '1:10').length, 1);
    assert.equal(listLocalMenuCardExports('same-project-id', '2:20').length, 0);

    storage.rejectWrites = true;
    const bestEffortHistory = saveLocalMenuCardExport({
        ...common,
        artifact: { ...artifact, filename: 'menu-updated.pdf', sourceHash: 'hash-2' },
        storageScope: '2:20',
    });
    assert.equal(bestEffortHistory.length, 1);
    assert.equal(bestEffortHistory[0]?.sourceHash, 'hash-2');
    assert.equal(listLocalMenuCardExports('same-project-id', '2:20').length, 0);

    storage.rejectWrites = false;
    const storeAScope = resolveLocalExportStorageScope({ tId: 1, sId: 10 });
    const storeBScope = resolveLocalExportStorageScope({ tenantId: 2, storeId: 20 });
    assert.equal(storeAScope, '1:10');
    assert.equal(storeBScope, '2:20');
    assert.equal(resolveLocalExportStorageScope({
        tenantId: 1,
        tId: '1',
        storeId: 10,
        sId: '10',
    }), '1:10');
    assert.equal(resolveLocalExportStorageScope({ tenantId: 1, tId: 2, storeId: 10 }), '');
    assert.equal(resolveLocalExportStorageScope({ tenantId: 1, storeId: 10, sId: 20 }), '');
    assert.equal(resolveLocalExportStorageScope({ tenantId: 1, tId: 'invalid', storeId: 10 }), '');
    assert.equal(resolveLocalExportStorageScope({ tId: ' 1', sId: 10 }), '');
    recordLocalPdfDownload(storeAScope, 'same-project-id', 'pdf-hash-1');
    assert.ok(readLocalPdfDownloadAt(storeAScope, 'same-project-id'));
    assert.equal(readLocalPdfDownloadAt(storeBScope, 'same-project-id'), null);
    storage.setItem('menulist_last_pdf_download_1%3A10_same-project-id', '1e3');
    assert.equal(readLocalPdfDownloadAt(storeAScope, 'same-project-id'), null);
    storage.setItem('menulist_last_pdf_download_1%3A10_same-project-id', String(Date.now() + 60_000));
    assert.equal(readLocalPdfDownloadAt(storeAScope, 'same-project-id'), null);

    const validHistoryRecord = listLocalMenuCardExports('same-project-id', '1:10')[0];
    assert.ok(validHistoryRecord);
    assert.equal(projectMenuCardLocalHistoryRecord({ ...validHistoryRecord, pageCount: 1.5 }), null);
    assert.equal(projectMenuCardLocalHistoryRecord({ ...validHistoryRecord, preset: 'unknown' }), null);
    assert.equal(projectMenuCardLocalHistoryRecord({ ...validHistoryRecord, generatedAt: 'tomorrow' }), null);
    storage.setItem(
        'menulist_menu_card_exports_1%3A10_same-project-id',
        JSON.stringify([{ ...validHistoryRecord, pageCount: -1 }]),
    );
    assert.deepEqual(listLocalMenuCardExports('same-project-id', '1:10'), []);
    assert.equal(storage.getItem('menulist_menu_card_exports_1%3A10_same-project-id'), null);
    storage.setItem('menulist_menu_card_exports_1%3A10_same-project-id', '{');
    assert.deepEqual(listLocalMenuCardExports('same-project-id', '1:10'), []);
    assert.equal(storage.getItem('menulist_menu_card_exports_1%3A10_same-project-id'), null);

    storage.rejectWrites = true;
    assert.doesNotThrow(() => recordLocalPdfDownload(storeBScope, 'same-project-id', 'pdf-hash-2'));
}

function testQrFilenameFallbacks(): void {
    assert.equal(buildQrCodeFilename('Store Name'), 'store-name-qr');
    assert.equal(buildQrCodeFilename('नमस्ते'), 'menu-qr');
    assert.equal(getQrCodeFilename('Store Name'), 'store-name-feedback-qr');
    assert.equal(getQrCodeFilename('नमस्ते'), 'menu-feedback-qr');
}

async function main(): Promise<void> {
    await testBrowserFileShareBoundary();
    testScopedBestEffortHistory();
    testQrFilenameFallbacks();
    process.stdout.write('Print/export browser boundary tests passed.\n');
}

void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
});
