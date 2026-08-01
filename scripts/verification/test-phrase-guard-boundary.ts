import assert from 'node:assert/strict';
import { logger } from '@lib/monitoring/logger';
import { containsForbiddenPhrase, sanitizeAIOutput } from '@lib/trust/phraseGuard';

const originalSecurity = logger.security;
let capturedDetails: Record<string, unknown> | undefined;
logger.security = ((_event, details) => {
    capturedDetails = details as Record<string, unknown>;
}) as typeof logger.security;

try {
    const sensitiveOutput = 'Analytics says Priya phone 9999999999 will increase sales';
    assert.equal(
        sanitizeAIOutput(sensitiveOutput, 'Fresh from our menu', 'campaign_caption:private-owner'),
        'Fresh from our menu',
    );
    assert.deepEqual(capturedDetails?.matches, ['analytics', 'will increase']);
    assert.equal(capturedDetails?.originalLength, sensitiveOutput.length);
    assert.equal(capturedDetails?.contextPresent, true);
    assert.equal(capturedDetails?.contextLength, 'campaign_caption:private-owner'.length);
    assert.equal(JSON.stringify(capturedDetails).includes('Priya'), false);
    assert.equal(JSON.stringify(capturedDetails).includes('9999999999'), false);
    assert.equal(JSON.stringify(capturedDetails).includes('private-owner'), false);

    assert.equal(
        sanitizeAIOutput('Our algorithm picked this', 'AI recommends this', 'campaign_caption'),
        'From our kitchen to you',
        'a contaminated caller fallback must not bypass the guard',
    );
    assert.equal(containsForbiddenPhrase('Fresh from our menu').hasForbidden, false);
} finally {
    logger.security = originalSecurity;
}

console.log('Phrase guard boundary tests passed.');
