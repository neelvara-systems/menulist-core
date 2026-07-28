import assert from 'node:assert/strict';
import {
    normalizeAnswerlatticeKnowledgeIntakePublicUrl,
    resolveAnswerlatticeKnowledgeIntakeDiscoveredUrl,
    serializeAnswerlatticeKnowledgeIntakeValue,
} from '../../src/lib/answerlattice/knowledgeIntakeDiscoveryContracts';

assert.equal(
    normalizeAnswerlatticeKnowledgeIntakePublicUrl('https://docs.example.com/guide?utm_source=test&b=2&a=1#top'),
    'https://docs.example.com/guide?a=1&b=2',
);
assert.equal(
    resolveAnswerlatticeKnowledgeIntakeDiscoveredUrl(
        'setup?utm_source=page',
        'https://docs.example.com/guides/start/',
        'https://docs.example.com',
    ),
    'https://docs.example.com/guides/start/setup',
    'relative discovery links must resolve against the fetched page, not the site root',
);
assert.equal(
    resolveAnswerlatticeKnowledgeIntakeDiscoveredUrl(
        '/help',
        'https://docs.example.com/guides/start/',
        'https://other.example.com',
    ),
    null,
    'discovery must retain its explicit original-origin boundary',
);
assert.equal(
    resolveAnswerlatticeKnowledgeIntakeDiscoveredUrl(
        'https://evil.example.net/help',
        'https://docs.example.com/guides/start/',
        'https://docs.example.com',
    ),
    null,
);

const timestamp = {
    toDate: () => new Date('2026-07-26T00:00:00.000Z'),
    toMillis: () => Date.parse('2026-07-26T00:00:00.000Z'),
};
assert.deepEqual(
    serializeAnswerlatticeKnowledgeIntakeValue({
        createdOn: timestamp,
        nested: ['safe', 2, false],
    }),
    {
        createdOn: '2026-07-26T00:00:00.000Z',
        nested: ['safe', 2, false],
    },
);
assert.equal(serializeAnswerlatticeKnowledgeIntakeValue({
    get toDate() {
        throw new Error('hostile timestamp getter');
    },
    toMillis: () => Date.now(),
}), null);
assert.equal(serializeAnswerlatticeKnowledgeIntakeValue({
    toDate() {
        throw new Error('invalid legacy timestamp');
    },
}), null);
const circular: Record<string, unknown> = {};
circular.self = circular;
assert.deepEqual(serializeAnswerlatticeKnowledgeIntakeValue(circular), { self: null });

console.log('Answerlattice Knowledge Intake discovery contract tests passed');
