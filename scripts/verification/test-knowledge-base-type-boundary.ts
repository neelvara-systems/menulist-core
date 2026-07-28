import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    FILE_TYPE,
    getIngestionJobStatusData,
    type SourceFileType,
} from '../../src/types/knowledgeBase';

const ROOT = path.resolve(__dirname, '..', '..');

const pdfType: SourceFileType = FILE_TYPE.PDF;
assert.equal(pdfType, 'pdf');
assert.deepEqual(Object.values(FILE_TYPE), [
    'pdf',
    'image',
    'video',
    'audio',
    'document',
    'website',
    'youtube',
    'google_drive',
    'copied_text',
]);

const statusDataWithoutTheme = getIngestionJobStatusData();
for (const status of Object.values(statusDataWithoutTheme)) {
    assert(!status.gradient.includes('undefined'));
}

const appTypes = fs.readFileSync(path.join(ROOT, 'src/types/knowledgeBase.ts'), 'utf8');
const functionConstants = fs.readFileSync(
    path.join(ROOT, 'functions-answerlattice/src/types/constants.ts'),
    'utf8',
);
const functionTypes = fs.readFileSync(
    path.join(ROOT, 'functions-answerlattice/src/types/knowledgeBase.types.ts'),
    'utf8',
);
const uploadModal = fs.readFileSync(
    path.join(ROOT, 'src/components/templates/platform/KBGeneration/UploadModal.tsx'),
    'utf8',
);

for (const [label, source] of [
    ['app', appTypes],
    ['Functions', functionConstants],
] as const) {
    assert(
        source.includes('export const FILE_TYPE = {') && source.includes('} as const;'),
        `${label} semantic source types must remain literal unions`,
    );
    assert(
        !source.includes('export const FILE_TYPE: Record<string, string>'),
        `${label} semantic source types must not widen to arbitrary strings`,
    );
}

assert(
    functionTypes.includes('type: string;')
        && functionTypes.includes('semantic article provenance uses KnowledgeBaseArticleSource.type'),
    'Functions ingestion upload type must remain an explicit MIME string',
);
assert(
    !uploadModal.includes('sourceFiles: uploadedFiles as any'),
    'uploaded knowledge source metadata must satisfy the persisted contract without an any cast',
);

process.stdout.write('Knowledge Base app/Functions type boundary tests passed.\n');
