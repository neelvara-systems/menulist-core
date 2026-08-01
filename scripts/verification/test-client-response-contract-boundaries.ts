#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import type { MenuIntakeAnalysisResult } from '../../src/data/shared/menuIntakeIdentity';
import { normalizeAnswerlatticeTenantSummaryPositiveId } from '../../src/lib/answerlattice/tenantSummaryClient';
import { isMenuIntakeIdentityPayload } from '../../src/lib/menu-intake-identity/client';
import { isMapsPlaceCheckClientResult } from '../../src/lib/public-truth-tools/mapsPlaceCheckClient';

assert.equal(normalizeAnswerlatticeTenantSummaryPositiveId(41), 41);
assert.equal(normalizeAnswerlatticeTenantSummaryPositiveId('41'), 41);
assert.equal(normalizeAnswerlatticeTenantSummaryPositiveId('041'), null);
assert.equal(normalizeAnswerlatticeTenantSummaryPositiveId('1e2'), null);
assert.equal(normalizeAnswerlatticeTenantSummaryPositiveId(' 41 '), null);
assert.equal(normalizeAnswerlatticeTenantSummaryPositiveId(Number.MAX_SAFE_INTEGER + 1), null);

const structure: MenuIntakeAnalysisResult['structure'] = {
  assessment: 'same_menu',
  confidence: 'high',
  summary: 'Same menu.',
};
const truthRisk: MenuIntakeAnalysisResult['truthRisk'] = { level: 'low', reasons: [] };
const validMenuIntake: MenuIntakeAnalysisResult & { analyzedFileCount: number } = {
  identity: {
    businessName: 'Boundary Cafe',
    phoneNumber: null,
    address: null,
    businessType: 'Restaurant',
    businessCategory: 'food',
    currencyHint: 'INR',
    languages: ['en'],
    confidence: 'high',
  },
  validation: {
    validMenuFileIndexes: [1],
    invalidFileIndexes: [],
    nonMenuReasons: [],
    qualityIssues: [],
    menuCompleteness: 'complete',
    emptyExtractionRisk: false,
    confidence: 'high',
    summary: 'Upload checked.',
  },
  intentAssessment: { intent: 'new_menu', confidence: 'high', reasons: [] },
  truthRisk,
  structure,
  suggestions: [],
  decision: {
    severity: 'none',
    intent: 'new_menu',
    title: 'Menu checked',
    message: 'No action needed.',
    primaryAction: 'continue',
    reasons: [],
    mismatchScore: 0,
    structure,
    suggestions: [],
    truthRisk,
  },
  analyzedFileCount: 1,
};

assert.equal(isMenuIntakeIdentityPayload(validMenuIntake, 1), true);
assert.equal(isMenuIntakeIdentityPayload({ skipped: true, reason: 'feature_disabled' }, 1), true);
assert.equal(
  isMenuIntakeIdentityPayload({
    ...validMenuIntake,
    validation: { ...validMenuIntake.validation, validMenuFileIndexes: [2] },
  }, 1),
  false,
  'Server-selected file indexes must remain inside the submitted file set',
);
assert.equal(
  isMenuIntakeIdentityPayload({
    ...validMenuIntake,
    decision: { ...validMenuIntake.decision, severity: 'none', message: { owner: 'continue' } },
  }, 1),
  false,
  'Menu upload decisions must validate every owner-facing and control-flow field',
);
assert.equal(
  isMenuIntakeIdentityPayload({
    ...validMenuIntake,
    identity: [],
  }, 1),
  false,
);

const validMapsResult = {
  status: 'needs_owner_confirmation',
  attributionRequired: true,
  checkedAt: '2026-07-29T07:00:00.000Z',
  model: 'gemini-model',
  candidate: {
    title: 'Boundary Cafe',
    proposedFacts: { address: 'Main Road', amenities: ['Outdoor seating'] },
    sources: [{
      title: 'Boundary Cafe',
      uri: 'https://www.google.com/maps/place/Boundary+Cafe',
      placeId: 'ChIJBoundary',
    }],
  },
} as const;

assert.equal(isMapsPlaceCheckClientResult(validMapsResult), true);
assert.equal(
  isMapsPlaceCheckClientResult({ ...validMapsResult, attributionRequired: false }),
  false,
  'A confirmation candidate must retain its provider-attribution requirement',
);
assert.equal(
  isMapsPlaceCheckClientResult({
    ...validMapsResult,
    candidate: {
      ...validMapsResult.candidate,
      sources: [{ title: 'Boundary Cafe', uri: 'https://attacker.example/place' }],
    },
  }),
  false,
  'Grounding sources must be valid governed Google Maps links',
);
assert.equal(
  isMapsPlaceCheckClientResult({
    status: 'no_grounded_result',
    attributionRequired: true,
    checkedAt: validMapsResult.checkedAt,
    model: validMapsResult.model,
    candidate: null,
  }),
  false,
);

console.log('Client response contract boundary verification passed.');
