#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { normalizePublicFeedbackDefaults } from '../../src/lib/feedback/feedbackDefaultsBoundary';
import { DEFAULT_FEEDBACK_SETTINGS } from '../../src/types/guestFeedback';

assert.deepEqual(
    normalizePublicFeedbackDefaults(undefined),
    DEFAULT_FEEDBACK_SETTINGS,
    'missing legacy settings must use the complete canonical defaults',
);

assert.deepEqual(
    normalizePublicFeedbackDefaults({
        collectComment: false,
        collectCommentRequired: true,
        collectEmail: false,
        collectEmailRequired: true,
        collectName: true,
        collectNameRequired: true,
        collectPhone: false,
        collectPhoneRequired: true,
        ignored: true,
    }),
    {
        collectComment: false,
        collectCommentRequired: true,
        collectEmail: false,
        collectEmailRequired: true,
        collectName: true,
        collectNameRequired: true,
        collectPhone: false,
        collectPhoneRequired: true,
    },
    'valid owner settings must be projected without unrelated persisted fields',
);

assert.deepEqual(
    normalizePublicFeedbackDefaults({
        collectComment: 'false',
        collectCommentRequired: 1,
        collectEmail: null,
        collectEmailRequired: [],
        collectName: 'true',
        collectNameRequired: {},
        collectPhone: 0,
        collectPhoneRequired: 'yes',
    }),
    DEFAULT_FEEDBACK_SETTINGS,
    'malformed legacy settings must not use truthiness to change the public form',
);

process.stdout.write('Public feedback defaults boundary tests passed.\n');
