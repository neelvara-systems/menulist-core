import assert from 'node:assert/strict';
import { getFeedbackUrl } from '@lib/utils/feedbackQrCode';

assert.equal(
    getFeedbackUrl('project_123', 'feedback_qr', 'https://cafe.example/menu/summer?old=true#section'),
    'https://cafe.example/feedback/project_123?source=feedback_qr',
);
assert.equal(
    getFeedbackUrl('project-123', 'direct_link', 'cafe.example'),
    'https://cafe.example/feedback/project-123?source=direct_link',
);
assert.doesNotMatch(
    getFeedbackUrl('project-123', undefined, 'https://owner:secret@cafe.example/menu'),
    /owner|secret|@/,
    'credential-bearing overrides must never enter a QR destination',
);

for (const projectId of [
    '',
    ' project-123',
    'project/123',
    'project?source=forged',
    'project#fragment',
    'x'.repeat(101),
]) {
    assert.throws(
        () => getFeedbackUrl(projectId, 'feedback_qr', 'https://cafe.example'),
        /Invalid feedback project ID/,
    );
}

console.log('Feedback QR URL boundary tests passed.');
