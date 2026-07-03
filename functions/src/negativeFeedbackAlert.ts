// @ts-nocheck
// Dormant legacy trigger. Keep excluded from function exports until upgraded to the current Functions API.
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { DB_COLLECTIONS } from './constants/database';
import { validateNetworkTargetUrl } from './utils/networkTarget';

const logger = functions.logger;
const NEGATIVE_FEEDBACK_SLACK_TARGET_REJECTED = 'NEGATIVE_FEEDBACK_SLACK_TARGET_REJECTED';

const getStringContext = (label: string, value: unknown) => {
    const normalized = value === undefined || value === null ? '' : String(value);
    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

const getErrorContext = (error: unknown) => (
    error && typeof error === 'object'
        ? {
            sourceErrorName: (error as Error).name || 'Error',
            sourceErrorCode: 'code' in error ? String((error as any).code).slice(0, 64) : undefined,
        }
        : { sourceErrorName: typeof error }
);

const getSlackTargetContext = (result: { addressCount?: number; error?: string; errorName?: string }) => ({
    addressCount: result.addressCount || 0,
    targetError: typeof result.error === 'string' ? result.error.slice(0, 80) : undefined,
    targetErrorName: typeof result.errorName === 'string' ? result.errorName.slice(0, 80) : undefined,
});

/**
 * REAL-TIME ALERT: Negative Feedback Trigger
 * ════════════════════════════════════════════
 * 
 * Fires when a user gives negative feedback on a chat message.
 * Sends immediate notification to owner/support team.
 * 
 * Cost: Minimal - only triggers on feedback changes (not every message)
 * 
 * This file is not exported from functions/src/index.ts.
 */

export const onNegativeFeedback = functions.firestore
    .document(`${DB_COLLECTIONS.CHAT_SESSIONS}/{sessionId}`)
    .onUpdate(async (change: any, context: any) => {
        const before = change.before.data();
        const after = change.after.data();
        const sessionId = context.params.sessionId;

        // Check if new negative feedback was added
        const beforeMessages = before.messages || [];
        const afterMessages = after.messages || [];

        // Find new negative feedback
        for (let i = 0; i < afterMessages.length; i++) {
            const afterMsg = afterMessages[i];
            const beforeMsg = beforeMessages[i];

            // New negative feedback detected
            if (
                afterMsg.feedback?.isGood === false &&
                (!beforeMsg?.feedback || beforeMsg.feedback.isGood !== false)
            ) {
                // Get user message (usually one before the AI response)
                const userMessage = i > 0 ? afterMessages[i - 1] : null;
                const userQuestion = userMessage?.content || 'N/A';

                // Prepare alert data
                const alertData = {
                    sessionId,
                    userId: after.uId || 'Unknown',
                    tenantId: after.tId,
                    timestamp: new Date().toISOString(),
                    userQuestion,
                    aiAnswer: afterMsg.craftedAnswer || 'N/A',
                    feedbackComments: afterMsg.feedback.comments || 'No comment provided',
                    reasonsToImprove: afterMsg.feedback.reasonsToImprove || [],
                    conversationPath: `/platform/chat-management?session=${encodeURIComponent(sessionId)}`
                };

                await Promise.all([
                    sendSlackAlert(alertData),
                    logToFirestore(alertData) // Keep record of all alerts
                ]);

                logger.info('Negative feedback alert processed', {
                    ...getStringContext('sessionId', sessionId),
                    userIdPresent: Boolean(after.uId),
                    tenantIdPresent: Boolean(after.tId),
                    reasonCount: Array.isArray(alertData.reasonsToImprove) ? alertData.reasonsToImprove.length : 0,
                });
	            }
	        }

        return null;
    });

/**
 * Send alert to Slack
 */
async function sendSlackAlert(data: any) {
    const webhookUrl = functions.config().slack?.webhook_url;
    
    if (!webhookUrl) {
        logger.warn('Negative feedback Slack webhook missing');
        return;
    }

    try {
        const targetValidation = await validateNetworkTargetUrl(String(webhookUrl));
        if (!targetValidation.valid || !targetValidation.normalizedUrl) {
            logger.warn('Negative feedback Slack webhook target rejected', {
                failureCode: NEGATIVE_FEEDBACK_SLACK_TARGET_REJECTED,
                ...getStringContext('sessionId', data.sessionId),
                ...getSlackTargetContext(targetValidation),
            });
            return;
        }

        const fetch = (await import('node-fetch')).default;
        
        const message = {
            text: '⚠️ Negative Feedback Received',
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: '👎 Negative Feedback Alert'
                    }
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: `*User:*\n${data.userId}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Time:*\n${new Date(data.timestamp).toLocaleString()}`
                        }
                    ]
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*User Question:*\n${data.userQuestion}`
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*AI Answer:*\n${data.aiAnswer.substring(0, 200)}${data.aiAnswer.length > 200 ? '...' : ''}`
                    }
                },
	                {
	                    type: 'section',
	                    text: {
	                        type: 'mrkdwn',
	                        text: `*Feedback:*\n"${data.feedbackComments}"`
	                    }
	                }
            ]
        };

        await fetch(targetValidation.normalizedUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        });

        logger.info('Negative feedback Slack alert sent', {
            ...getStringContext('sessionId', data.sessionId),
        });
	    } catch (error) {
	        logger.error('Negative feedback Slack alert failed', {
	            ...getStringContext('sessionId', data.sessionId),
	            ...getErrorContext(error),
	        });
	    }
	}

/**
 * Log alert to Firestore for record-keeping
 */
async function logToFirestore(data: any) {
    try {
        await admin.firestore()
            .collection(DB_COLLECTIONS.NEGATIVE_FEEDBACK_ALERTS)
            .add({
                ...data,
                createdOn: admin.firestore.FieldValue.serverTimestamp(),
                resolved: false // Can be updated later by support team
            });
	    } catch (error) {
	        logger.error('Negative feedback alert Firestore write failed', {
	            ...getStringContext('sessionId', data.sessionId),
	            ...getErrorContext(error),
	        });
	    }
	}
