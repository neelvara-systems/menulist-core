// @ts-nocheck
// TODO: Update to Firebase Functions v2 API before using this file
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * REAL-TIME ALERT: Negative Feedback Trigger
 * ════════════════════════════════════════════
 * 
 * Fires when a user gives negative feedback on a chat message.
 * Sends immediate notification to owner/support team.
 * 
 * Cost: Minimal - only triggers on feedback changes (not every message)
 * 
 * Setup:
 * 1. Configure Slack webhook URL in Firebase Config:
 *    firebase functions:config:set slack.webhook_url="YOUR_WEBHOOK_URL"
 * 
 * 2. Or use email via SendGrid/Firebase Extensions
 * 
 * 3. Deploy: firebase deploy --only functions:onNegativeFeedback
 */

export const onNegativeFeedback = functions.firestore
    .document('chatSessions/{sessionId}')
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
                    conversationUrl: `https://your-domain.com/platform/chat-management?session=${sessionId}`
                };

                // Send alerts (you can enable multiple channels)
                await Promise.all([
                    sendSlackAlert(alertData),
                    // sendEmailAlert(alertData), // Uncomment if using email
                    logToFirestore(alertData) // Keep record of all alerts
                ]);

                console.log('Negative feedback alert sent:', alertData);
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
        console.warn('Slack webhook URL not configured. Skipping Slack alert.');
        return;
    }

    try {
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
                },
                {
                    type: 'actions',
                    elements: [
                        {
                            type: 'button',
                            text: {
                                type: 'plain_text',
                                text: 'View Full Conversation'
                            },
                            url: data.conversationUrl,
                            style: 'primary'
                        }
                    ]
                }
            ]
        };

        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        });

        console.log('Slack alert sent successfully');
    } catch (error) {
        console.error('Failed to send Slack alert:', error);
    }
}

/**
 * Send email alert (optional - requires SendGrid or similar)
 */
async function sendEmailAlert(data: any) {
    // Example using SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(functions.config().sendgrid.api_key);
    // 
    // const msg = {
    //     to: 'support@your-domain.com',
    //     from: 'alerts@your-domain.com',
    //     subject: `Negative Feedback Alert - User ${data.userId}`,
    //     html: `
    //         <h2>Negative Feedback Received</h2>
    //         <p><strong>User:</strong> ${data.userId}</p>
    //         <p><strong>Question:</strong> ${data.userQuestion}</p>
    //         <p><strong>Feedback:</strong> "${data.feedbackComments}"</p>
    //         <a href="${data.conversationUrl}">View Full Conversation</a>
    //     `
    // };
    // 
    // await sgMail.send(msg);
    
    console.log('Email alert would be sent here (not configured)');
}

/**
 * Log alert to Firestore for record-keeping
 */
async function logToFirestore(data: any) {
    try {
        await admin.firestore()
            .collection('negativeFeedbackAlerts')
            .add({
                ...data,
                createdOn: admin.firestore.FieldValue.serverTimestamp(),
                resolved: false // Can be updated later by support team
            });
    } catch (error) {
        console.error('Failed to log alert to Firestore:', error);
    }
}
