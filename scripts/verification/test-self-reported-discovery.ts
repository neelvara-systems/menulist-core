#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    SELF_REPORTED_DISCOVERY_CHANNELS,
    buildSelfReportedDiscoveryAttribution,
} from '../../src/data/shared/selfReportedDiscovery';

const expectedCategories = {
    chatgpt: 'ai_assistant',
    claude: 'ai_assistant',
    gemini: 'ai_assistant',
    microsoft_copilot: 'ai_assistant',
    perplexity: 'ai_assistant',
    search_engine: 'search',
    social_or_community: 'social_community',
    friend_or_colleague: 'referral',
    other: 'other',
} as const;

assert.deepEqual(SELF_REPORTED_DISCOVERY_CHANNELS, Object.keys(expectedCategories));

for (const channel of SELF_REPORTED_DISCOVERY_CHANNELS) {
    assert.deepEqual(buildSelfReportedDiscoveryAttribution(channel), {
        category: expectedCategories[channel],
        channel,
        method: 'self_reported',
    });
}

for (const invalidValue of [undefined, null, '', 'ChatGPT', 'reddit', 1, {}, []]) {
    assert.equal(
        buildSelfReportedDiscoveryAttribution(invalidValue),
        null,
        'unknown, empty, or non-string discovery values must fail closed',
    );
}

process.stdout.write('Self-reported discovery contract tests passed.\n');
