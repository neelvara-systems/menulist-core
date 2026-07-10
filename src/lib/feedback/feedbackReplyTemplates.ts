/**
 * Guest Feedback Reply Templates
 *
 * Deterministic, browser-local reply drafts for private guest feedback.
 * No provider send, no AI call, no Firestore read/write.
 *
 * @see __docs__/projects/internal-feedback-system/README.md
 */

export interface FeedbackReplyTemplateInput {
    customerName?: string;
    rating?: number;
    storeName?: string;
}

export interface FeedbackReplyTemplate {
    id: 'thank_and_handle' | 'ask_for_details' | 'handled_follow_up';
    title: string;
    description: string;
    message: string;
}

export function buildFeedbackReplyTemplates(input: FeedbackReplyTemplateInput): FeedbackReplyTemplate[] {
    const greeting = buildFeedbackReplyGreeting(input.customerName);
    const signoff = buildFeedbackReplySignoff(input.storeName);
    const needsAttention = Number.isFinite(Number(input.rating)) && Number(input.rating) <= 3;

    const primaryLine = needsAttention
        ? 'We have noted this and will handle it with the team.'
        : 'Thank you for taking the time to tell us.';

    return [
        {
            id: 'thank_and_handle',
            title: 'Thank and handle',
            description: 'For a guest report that needs attention',
            message: buildFeedbackReplyMessage([
                `${greeting}, thank you for telling us.`,
                primaryLine,
                signoff,
            ]),
        },
        {
            id: 'ask_for_details',
            title: 'Ask one detail',
            description: 'When the team needs one more detail',
            message: buildFeedbackReplyMessage([
                `${greeting}, thank you for telling us.`,
                'Please share one more detail so we can handle this properly.',
                signoff,
            ]),
        },
        {
            id: 'handled_follow_up',
            title: 'Handled',
            description: 'After the issue has been handled',
            message: buildFeedbackReplyMessage([
                `${greeting}, thank you for your patience.`,
                'This has been handled by our team.',
                signoff,
            ]),
        },
    ];
}

function buildFeedbackReplyGreeting(customerName?: string): string {
    const trimmedCustomerName = customerName?.trim();
    return trimmedCustomerName ? `Hi ${trimmedCustomerName}` : 'Hi';
}

function buildFeedbackReplySignoff(storeName?: string): string | null {
    const trimmedStoreName = storeName?.trim();
    return trimmedStoreName ? `- ${trimmedStoreName}` : null;
}

function buildFeedbackReplyMessage(lines: Array<string | null>): string {
    return lines.filter((line): line is string => Boolean(line)).join('\n');
}
