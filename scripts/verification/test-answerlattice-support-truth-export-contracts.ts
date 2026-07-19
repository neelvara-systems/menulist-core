import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { PRODUCT_IDS } from '../../src/constants/product';
import {
    ANSWERLATTICE_SUPPORT_TRUTH_EXPORT_LIMITS,
    AnswerlatticeSupportTruthExportTooLargeError,
    buildAnswerlatticeSupportTruthExport,
    recordAnswerlatticeSupportTruthExportAudit,
} from '../../src/lib/answerlattice/supportTruthExport';

type FakeRow = {
    data: Record<string, unknown>;
    id: string;
};

type FakeFilter = {
    field: string;
    value: unknown;
};

const readPath = (value: Record<string, unknown>, path: string): unknown => (
    path.split('.').reduce<unknown>((current, segment) => (
        current && typeof current === 'object'
            ? (current as Record<string, unknown>)[segment]
            : undefined
    ), value)
);

const writePath = (target: Record<string, unknown>, path: string, value: unknown) => {
    const segments = path.split('.');
    let current = target;
    segments.forEach((segment, index) => {
        if (index === segments.length - 1) {
            current[segment] = value;
            return;
        }
        const nested = current[segment];
        if (!nested || typeof nested !== 'object' || Array.isArray(nested)) {
            current[segment] = {};
        }
        current = current[segment] as Record<string, unknown>;
    });
};

class FakeQuery {
    private filters: FakeFilter[] = [];
    private limitValue = Number.POSITIVE_INFINITY;
    private order: { direction: 'asc' | 'desc'; field: string } | null = null;
    private projection: string[] | null = null;

    constructor(
        private readonly database: FakeFirestore,
        private readonly collectionName: string,
    ) {}

    where(field: string, operator: string, value: unknown) {
        assert.equal(operator, '==', 'export queries must use exact equality filters');
        this.filters.push({ field, value });
        return this;
    }

    select(...fields: string[]) {
        this.projection = fields;
        return this;
    }

    limit(value: number) {
        this.limitValue = value;
        return this;
    }

    orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
        this.order = { direction, field };
        return this;
    }

    doc() {
        return {
            create: async (value: Record<string, unknown>) => {
                this.database.auditWrites.push(value);
            },
        };
    }

    async get() {
        let rows = [...(this.database.rows[this.collectionName] || [])]
            .filter(row => this.filters.every(filter => (
                readPath(row.data, filter.field) === filter.value
            )));
        if (this.order) {
            const { direction, field } = this.order;
            rows.sort((left, right) => {
                const leftValue = String(readPath(left.data, field) ?? '');
                const rightValue = String(readPath(right.data, field) ?? '');
                return direction === 'desc'
                    ? rightValue.localeCompare(leftValue)
                    : leftValue.localeCompare(rightValue);
            });
        }
        rows = rows.slice(0, this.limitValue);

        return {
            docs: rows.map(row => ({
                id: row.id,
                data: () => {
                    if (!this.projection) return row.data;
                    const projected: Record<string, unknown> = {};
                    this.projection.forEach((field) => {
                        const value = readPath(row.data, field);
                        if (value !== undefined) writePath(projected, field, value);
                    });
                    return projected;
                },
            })),
        };
    }
}

class FakeFirestore {
    readonly auditWrites: Record<string, unknown>[] = [];

    constructor(readonly rows: Record<string, FakeRow[]>) {}

    collection(name: string) {
        return new FakeQuery(this, name);
    }
}

const main = async () => {
const scope = { tId: 11, sId: 22 };
const scoped = <T extends Record<string, unknown>>(value: T) => ({
    ...value,
    pId: PRODUCT_IDS.ANSWERLATTICE,
    ...scope,
});
const changelogPath = `${DB_COLLECTIONS.CHANGELOG}/${scope.tId}/${scope.sId}`;

const database = new FakeFirestore({
    [DB_COLLECTIONS.ANSWERLATTICE_ENTITIES]: [
        { id: 'entity_b', data: scoped({ type: 'feature', name: 'Billing', slug: 'billing', status: 'active' }) },
        { id: 'entity_a', data: scoped({ type: 'feature', name: 'Accounts', slug: 'accounts', status: 'beta' }) },
        { id: 'entity_hidden', data: scoped({ type: 'feature', name: 'Hidden', slug: 'hidden', status: 'draft' }) },
        {
            id: 'entity_other_product',
            data: { ...scoped({ type: 'feature', name: 'Other', slug: 'other', status: 'active' }), pId: PRODUCT_IDS.MENULIST },
        },
    ],
    [DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS]: [
        {
            id: 'answer_approved',
            data: scoped({
                title: 'Approved billing answer',
                slug: 'approved-billing-answer',
                status: 'active',
                answerType: 'direct',
                scope: { entityIds: ['entity_b'], planIds: ['pro'] },
                productBinding: {
                    introducedInVersion: 1,
                    lastValidatedInVersion: 2,
                    applicableVersions: { from: 1, to: null },
                },
                content: {
                    answer: 'Use the Billing page.',
                    embedding: [0.1, 0.2],
                    nested: { tId: scope.tId, safe: 'retained' },
                },
                evidence: {
                    sourceIds: ['source_2', 'source_1'],
                    citations: [{
                        id: 'billing-guide',
                        label: 'Billing guide',
                        title: 'Billing guide',
                        sourceId: 'source_1',
                        sourceContext: 'private source context',
                        tId: scope.tId,
                        url: 'https://docs.example.com/billing',
                    }],
                },
                validation: {
                    confidenceScore: 0.98,
                    validationSource: 'owner_review',
                    lastValidatedOn: '2026-07-19T00:00:00.000Z',
                },
                governance: { reviewRequired: false },
            }),
        },
        {
            id: 'answer_review_required',
            data: scoped({
                title: 'Needs review',
                slug: 'needs-review',
                status: 'active',
                content: { answer: 'Do not export.' },
                governance: { reviewRequired: true },
            }),
        },
    ],
    [DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES]: [{
        id: 'surface_1',
        data: scoped({
            active: true,
            key: 'settings.billing',
            label: 'Billing settings',
            routePatterns: ['/settings/billing'],
            entityIds: ['entity_b'],
            visibility: { helpWidget: true, helpCenter: true, changelog: false },
            priority: 1,
        }),
    }],
    [DB_COLLECTIONS.KB_ARTICLES]: [{
        id: 'article_1',
        data: scoped({
            active: true,
            categoryId: 'category_1',
            categoryTitle: 'Billing',
            content: { body: 'Approved article', createdBy: 'private-user' },
            index: 1,
            status: 'published',
            title: 'Billing guide',
            translations: {
                'es-ES': {
                    locale: 'es-ES',
                    title: 'Guia de facturacion',
                    content: { body: 'Traduccion revisada' },
                    status: 'approved',
                    sourceLocale: 'en-US',
                    sourceHash: 'a'.repeat(64),
                    translatedBy: 'ai',
                    translatedAt: '2026-07-18T00:00:00.000Z',
                    reviewedAt: '2026-07-19T00:00:00.000Z',
                    reviewedBy: 'private-reviewer',
                },
                'fr-FR': {
                    locale: 'fr-FR',
                    title: 'Brouillon',
                    content: { body: 'Unreviewed AI draft' },
                    status: 'draft',
                    sourceLocale: 'en-US',
                    sourceHash: 'b'.repeat(64),
                    translatedBy: 'ai',
                    translatedAt: '2026-07-18T00:00:00.000Z',
                },
            },
        }),
    }],
    [DB_COLLECTIONS.ANSWERLATTICE_FAQS]: [{
        id: 'faq_1',
        data: scoped({
            active: true,
            answer: 'Open Billing.',
            canonicalAnswerId: 'answer_approved',
            question: 'Where is billing?',
            sortOrder: 1,
            status: 'published',
        }),
    }],
    [DB_COLLECTIONS.ANSWERLATTICE_RELEASES]: [{
        id: 'release_1',
        data: scoped({
            entityChanges: ['entity_b'],
            releasedAt: '2026-07-18T00:00:00.000Z',
            status: 'active',
            versionLabel: '2.0',
            versionNormalized: 2,
        }),
    }],
    [changelogPath]: [{
        id: 'page_1',
        data: {
            pageNumber: 1,
            entries: [
                {
                    id: 'entry_1',
                    title: 'Billing update',
                    description: { body: 'Published change' },
                    published: true,
                    releasedOn: '2026-07-18T00:00:00.000Z',
                    entityChanges: ['entity_b'],
                    releaseId: 'release_1',
                },
                {
                    id: 'entry_draft',
                    title: 'Draft change',
                    published: false,
                },
            ],
        },
    }],
});

const built = await buildAnswerlatticeSupportTruthExport({
    db: database as unknown as FirebaseFirestore.Firestore,
    productName: 'Example SaaS',
    ...scope,
});

assert.equal(built.payload.complete, true, 'exports must be explicitly complete');
assert.equal(built.payload.exportType, 'governed_support_truth');
assert.deepEqual(built.payload.counts, {
    entities: 2,
    canonicalAnswers: 1,
    productSurfaces: 1,
    articles: 1,
    faqs: 1,
    changelogEntries: 1,
    releases: 1,
});
assert.deepEqual(
    built.payload.entities.map(entity => entity.id),
    ['entity_a', 'entity_b'],
    'portable entity output must be deterministic',
);
assert.deepEqual(
    built.payload.canonicalAnswers[0].evidence.sourceIds,
    ['source_2', 'source_1'],
    'approved canonical evidence IDs must survive the projected Firestore read',
);
assert.equal(
    (built.payload.canonicalAnswers[0].evidence.citations as Array<Record<string, unknown>>)[0].id,
    'billing-guide',
    'approved citations must remain portable',
);
assert.equal(
    'sourceContext' in (built.payload.canonicalAnswers[0].evidence.citations as Array<Record<string, unknown>>)[0],
    false,
    'private source context must not enter the export',
);
assert.equal(
    (built.payload.canonicalAnswers[0].evidence.citations as Array<Record<string, unknown>>)[0].sourceId,
    'source_1',
    'private exports may retain the bounded source pointer needed for evidence mapping',
);
assert.equal(
    'embedding' in (built.payload.canonicalAnswers[0].content as Record<string, unknown>),
    false,
    'embeddings must not enter the export',
);
assert.equal(
    'tId' in ((built.payload.canonicalAnswers[0].content as Record<string, unknown>).nested as Record<string, unknown>),
    false,
    'nested tenant identity must not enter the export',
);
assert.deepEqual(
    Object.keys(built.payload.articles[0].translations),
    ['es-ES'],
    'translation drafts must not enter the approved support truth export',
);
assert.equal(
    'reviewedBy' in (built.payload.articles[0].translations['es-ES'] as Record<string, unknown>),
    false,
    'translation reviewer identity must not enter the export',
);
assert.deepEqual(built.payload.changelogEntries[0].entityChanges, ['entity_b']);
assert.equal(built.payload.changelogEntries[0].releaseId, 'release_1');

await recordAnswerlatticeSupportTruthExportAudit({
    actorId: 'founder_user',
    db: database as unknown as FirebaseFirestore.Firestore,
    json: built.json,
    payload: built.payload,
    ...scope,
});
assert.equal(database.auditWrites.length, 1, 'one successful export must append one audit event');
assert.equal(database.auditWrites[0].pId, PRODUCT_IDS.ANSWERLATTICE);
assert.equal(database.auditWrites[0].action, 'support_truth_export_generated');
assert.equal(database.auditWrites[0].performedBy, 'founder_user');
assert.equal(
    (database.auditWrites[0].newState as Record<string, unknown>).byteSize,
    Buffer.byteLength(built.json, 'utf8'),
);
assert.equal(
    JSON.stringify(database.auditWrites[0]).includes('Use the Billing page.'),
    false,
    'audit metadata must never duplicate exported knowledge',
);

const atCapDatabase = new FakeFirestore({
    [DB_COLLECTIONS.ANSWERLATTICE_ENTITIES]: Array.from(
        { length: ANSWERLATTICE_SUPPORT_TRUTH_EXPORT_LIMITS.entities },
        (_, index) => ({
            id: `entity_${String(index).padStart(3, '0')}`,
            data: scoped({
                name: `Entity ${index}`,
                slug: `entity-${index}`,
                status: 'active',
                type: 'feature',
            }),
        }),
    ),
});
const atCap = await buildAnswerlatticeSupportTruthExport({
    db: atCapDatabase as unknown as FirebaseFirestore.Firestore,
    productName: 'At-cap SaaS',
    ...scope,
});
assert.equal(
    atCap.payload.counts.entities,
    ANSWERLATTICE_SUPPORT_TRUTH_EXPORT_LIMITS.entities,
    'exactly-at-cap data must remain exportable',
);

const overCapDatabase = new FakeFirestore({
    [DB_COLLECTIONS.ANSWERLATTICE_ENTITIES]: Array.from(
        { length: ANSWERLATTICE_SUPPORT_TRUTH_EXPORT_LIMITS.entities + 1 },
        (_, index) => ({
            id: `entity_${index}`,
            data: scoped({ name: `Entity ${index}`, slug: `entity-${index}`, status: 'active', type: 'feature' }),
        }),
    ),
});
await assert.rejects(
    () => buildAnswerlatticeSupportTruthExport({
        db: overCapDatabase as unknown as FirebaseFirestore.Firestore,
        productName: 'Over-cap SaaS',
        ...scope,
    }),
    (error: unknown) => (
        error instanceof AnswerlatticeSupportTruthExportTooLargeError
        && error.section === 'entities'
    ),
    'cap-plus-one collection input must fail instead of truncating',
);

const largeArticleContent = 'x'.repeat(200_000);
const oversizedResponseDatabase = new FakeFirestore({
    [DB_COLLECTIONS.KB_ARTICLES]: Array.from({ length: 42 }, (_, index) => ({
        id: `article_${index}`,
        data: scoped({
            active: true,
            categoryId: 'category_1',
            categoryTitle: 'Large',
            content: { body: largeArticleContent },
            index,
            status: 'published',
            title: `Article ${index}`,
        }),
    })),
});
await assert.rejects(
    () => buildAnswerlatticeSupportTruthExport({
        db: oversizedResponseDatabase as unknown as FirebaseFirestore.Firestore,
        productName: 'Oversized SaaS',
        ...scope,
    }),
    (error: unknown) => (
        error instanceof AnswerlatticeSupportTruthExportTooLargeError
        && error.section === 'response'
    ),
    'an oversized serialized package must fail instead of returning a partial file',
);

console.log('Answerlattice Support Truth Export contract tests passed');
};

void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
