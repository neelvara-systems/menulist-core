#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    projectAiOperationClientResponseSummary,
    summarizeClientResponseForOperation,
} from '../../src/lib/ai/operationLog';

const validSummaries: Array<Record<string, unknown>> = [
    { responseSummaryKind: 'answerlattice_answer_test', answerSource: 'rag', providerOperationCount: 2 },
    { responseSummaryKind: 'answerlattice_product_starter_pack', createdCount: 3, sourceCount: 4 },
    { responseSummaryKind: 'ai_menu_manager_planner', hasActionType: true, outcome: 'prepare_action', targetCount: 2 },
    { responseSummaryKind: 'batch_image_generation', generatedImageCount: 3 },
    {
        responseSummaryKind: 'business_copy_generation',
        descriptorLength: 1,
        keywordCount: 2,
        knownForLength: 3,
        metaDescriptionLength: 4,
        metaTitleLength: 5,
        objectKeyCount: 6,
        pwaShortNameLength: 7,
        responseShape: 'object',
        specialNoteLength: 8,
        taglineLength: 9,
    },
    {
        responseSummaryKind: 'campaign_caption',
        callToActionLength: 1,
        captionLength: 2,
        hasCallToAction: true,
        hasCaption: true,
        hasShortCaption: false,
        hashtagCount: 3,
        objectKeyCount: 4,
        responseShape: 'object',
        shortCaptionLength: 5,
    },
    {
        responseSummaryKind: 'description_generation',
        descriptionSummary: { descriptionCount: 3, itemCount: 2 },
        languageBucketCount: 1,
        objectKeyCount: 2,
        responseShape: 'object',
    },
    {
        responseSummaryKind: 'menu_card_design_advisor',
        density: 'comfortable',
        includeContactBlock: true,
        includeDescriptions: false,
        includeQr: true,
        objectKeyCount: 8,
        ownerNoteLength: 9,
        preset: 'balanced',
        reasonLength: 10,
        responseShape: 'object',
        styleId: 'classic',
        warningCount: 1,
    },
    {
        responseSummaryKind: 'new_item_metadata',
        attributeCount: 1,
        descriptionLanguageCount: 2,
        descriptionTotalLength: 3,
        hasAttributes: true,
        hasDescription: true,
        hasName: true,
        nameLanguageCount: 2,
        nameTotalLength: 4,
        objectKeyCount: 5,
        responseShape: 'object',
    },
    {
        responseSummaryKind: 'review_reply_suggestion',
        hasReply: true,
        rating: 5,
        replyLength: 20,
        responseShape: 'object',
        source: 'ai',
    },
    {
        responseSummaryKind: 'seo_generation',
        keywordCount: 2,
        metaDescriptionLength: 3,
        metaTitleLength: 4,
        objectKeyCount: 5,
        responseShape: 'object',
        taglineLength: 6,
    },
    {
        responseSummaryKind: 'translation_generation',
        fallbackKeyCount: 1,
        hasPartialCoverage: true,
        objectKeyCount: 2,
        responseShape: 'object',
        targetLanguageCount: 3,
        translatedKeyCount: 4,
        translationsCount: 4,
    },
];

for (const summary of validSummaries) {
    assert.deepEqual(
        projectAiOperationClientResponseSummary(summary),
        summary,
        `${String(summary.responseSummaryKind)} must retain only its exact compact contract`,
    );
}

for (const malformed of [
    { ...validSummaries[0], rawAnswer: 'private generated answer' },
    { ...validSummaries[1], createdCount: '3' },
    { ...validSummaries[2], hasActionType: 1 },
    { ...validSummaries[3], generatedImageCount: -1 },
    { ...validSummaries[6], descriptionSummary: { descriptionCount: 3, itemCount: 2, raw: 'private' } },
    { ...validSummaries[9], rating: 6 },
    { ...validSummaries[9], source: 'provider' },
    { ...validSummaries[0], answerSource: 'x'.repeat(121) },
    { responseSummaryKind: 'unregistered_summary', rawPayload: { secret: true } },
]) {
    assert.equal(projectAiOperationClientResponseSummary(malformed), null);
    const compacted = summarizeClientResponseForOperation(malformed) as Record<string, unknown>;
    assert.equal('responseSummaryKind' in compacted, false);
    assert.equal('rawAnswer' in compacted, false);
    assert.equal('rawPayload' in compacted, false);
    assert.equal('descriptionSummary' in compacted, false);
}

console.log('AI operation response-summary boundary tests passed.');
