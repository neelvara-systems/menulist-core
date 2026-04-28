/**
 * Gemini Service - Owner Dashboard Summary Generation
 * 
 * Uses Gemini 2.0 Flash to generate summaries for SMB owners.
 * Focused on Decision Intelligence metrics - simple, actionable, no jargon.
 * 
 * Target: Indian SMB owners (restaurants, salons, spas)
 * Tone: Calm, factual, non-judgmental, practical
 * 
 * Summary Types:
 * - Daily: 2 bullets, descriptive only, no conclusions (every night)
 * - Weekly: 5 bullets, confident, actionable (Mondays)
 * - Monthly: 3 bullets, calm, reassuring (1st of month)
 * 
 * Called from: aggregateCustomerAnalytics.ts
 */

import { AI_MODEL } from '../../constants/ai';
import { genAIClient } from '../../genAiClient';

// ================================================================
// TYPES
// ================================================================

// Weekly metrics (existing)
export interface OwnerDashboardMetrics {
    period: 'last_7_days';
    weekStart: string;
    weekEnd: string;
    menuVisits: number;
    menuVisitsChange: number; // % change from previous week
    itemClicks: number;
    searches: number;
    zeroResultSearches: number;
    unavailableItemTaps: number;
    menuActionClicks: number;
    topSearchTerm?: { term: string; count: number };
    topUnavailableItem?: { itemId: string; taps: number };
    topMenuAction?: { action: string; count: number };
    smartPicksRendered: number;
    smartPicksClicks: number;
    topItems: Array<{ itemId: string; clicks: number }>;
    blockPerformance: {
        popular: { rendered: number; clicks: number };
        quickPick: { rendered: number; clicks: number };
        bestValue: { rendered: number; clicks: number };
    };
}

// Daily metrics (new)
export interface DailyDashboardMetrics {
    period: 'yesterday';
    date: string;
    menuVisits: number;
    itemClicks: number;
    searches: number;
    zeroResultSearches: number;
    unavailableItemTaps: number;
    menuActionClicks: number;
    topSearchTerm?: { term: string; count: number };
    topUnavailableItem?: { itemId: string; taps: number };
    topMenuAction?: { action: string; count: number };
    smartPicksRendered: number;
    smartPicksClicks: number;
    topItems: Array<{ itemId: string; clicks: number }>;
    blockPerformance: {
        popular: { rendered: number; clicks: number };
        quickPick: { rendered: number; clicks: number };
        bestValue: { rendered: number; clicks: number };
    };
}

// Monthly metrics (new)
export interface MonthlyDashboardMetrics {
    period: 'last_month';
    monthStart: string;
    monthEnd: string;
    daysWithData: number;
    menuVisits: number;
    itemClicks: number;
    searches: number;
    zeroResultSearches: number;
    unavailableItemTaps: number;
    menuActionClicks: number;
    topSearchTerm?: { term: string; count: number };
    topUnavailableItem?: { itemId: string; taps: number };
    topMenuAction?: { action: string; count: number };
    smartPicksRendered: number;
    smartPicksClicks: number;
    topItems: Array<{ itemId: string; clicks: number }>;
    blockPerformance: {
        popular: { rendered: number; clicks: number };
        quickPick: { rendered: number; clicks: number };
        bestValue: { rendered: number; clicks: number };
    };
}

export interface OwnerDashboardSummaryResult {
    markdown: string;
    bulletPoints: string[];
}

// ================================================================
// PROMPT (Production-Safe, Indian SMB Psychology)
// ================================================================

const SYSTEM_PROMPT = `You are a calm, factual operations assistant for small business owners in India.

Your job is to summarize weekly menu performance clearly and neutrally.
You do NOT motivate, predict revenue, give generic advice, or use business jargon.

You only describe what happened and point out clear opportunities based strictly on the data provided.

Tone rules:
- Simple
- Neutral
- Non-judgmental
- Practical
- No hype
- No AI mentions

Language rules:
- Use plain words an Indian restaurant/salon owner would understand
- Avoid startup or marketing terms
- Never blame the owner
- Never use words like: optimize, strategy, conversion, funnel, impression, CTR, AI, machine learning

Formatting rules:
- Output must be valid JSON
- Use simple bullet points
- Maximum 5 bullet points
- Each bullet must be directly supported by the data
- Use emojis sparingly (only for key items)`;

function buildUserPrompt(metrics: OwnerDashboardMetrics): string {
    // Calculate derived metrics
    const smartPicksVisibilityPct = metrics.menuVisits > 0
        ? Math.round((metrics.smartPicksRendered / metrics.menuVisits) * 100)
        : 0;

    const smartPicksEngagementPct = metrics.smartPicksRendered > 0
        ? Math.round((metrics.smartPicksClicks / metrics.smartPicksRendered) * 100)
        : 0;

    const clickRate = metrics.menuVisits > 0
        ? Math.round((metrics.itemClicks / metrics.menuVisits) * 100)
        : 0;

    // Find best performing block
    const blocks = metrics.blockPerformance;
    let bestBlock = 'none';
    let bestBlockEngagement = 0;

    for (const [blockName, data] of Object.entries(blocks)) {
        if (data.rendered > 0) {
            const engagement = (data.clicks / data.rendered) * 100;
            if (engagement > bestBlockEngagement) {
                bestBlock = blockName;
                bestBlockEngagement = engagement;
            }
        }
    }

    return `Generate a short weekly summary for the business owner based ONLY on the data below.

Rules:
- Do NOT add assumptions
- Do NOT suggest tools or features
- Do NOT repeat raw numbers unnecessarily
- Focus on what worked and what was missed
- Search demand and customer actions are important if the data shows them
- If something is neutral, omit it
- If there is nothing meaningful, say nothing about it
- Mention increases or decreases only if meaningful (>5%)

Data:
- Period: ${metrics.weekStart} to ${metrics.weekEnd}
- Menu scans this week: ${metrics.menuVisits}
- Change from last week: ${metrics.menuVisitsChange > 0 ? '+' : ''}${metrics.menuVisitsChange}%
- Items clicked: ${metrics.itemClicks}
- Click rate: ${clickRate}%
- Smart Picks shown: ${smartPicksVisibilityPct}% of visitors saw recommendations
- Smart Picks used: ${smartPicksEngagementPct}% clicked on recommendations
- Searches: ${metrics.searches}
- No-result searches: ${metrics.zeroResultSearches}
- Unavailable item taps: ${metrics.unavailableItemTaps}
- Final customer actions: ${metrics.menuActionClicks}
- Top search term: ${metrics.topSearchTerm?.term || 'none'} (${metrics.topSearchTerm?.count || 0})
- Top unavailable item: ${metrics.topUnavailableItem?.itemId || 'none'} (${metrics.topUnavailableItem?.taps || 0} taps)
- Top customer action: ${metrics.topMenuAction?.action || 'none'} (${metrics.topMenuAction?.count || 0})
- Best performing recommendation type: ${bestBlock} (${Math.round(bestBlockEngagement)}% engagement)
- Top clicked item: ${metrics.topItems[0]?.itemId || 'none'} (${metrics.topItems[0]?.clicks || 0} clicks)

Output format (JSON):
{
  "bulletPoints": [
    "Bullet point 1",
    "Bullet point 2",
    "..."
  ]
}

Maximum 5 bullet points. Each should be a complete, simple sentence.`;
}

// ================================================================
// MAIN FUNCTION
// ================================================================

/**
 * Generate owner dashboard summary using Gemini
 */
export async function generateOwnerDashboardSummary(
    metrics: OwnerDashboardMetrics
): Promise<OwnerDashboardSummaryResult> {
    try {
        console.log(`[Gemini] Generating owner dashboard summary for ${metrics.weekStart} to ${metrics.weekEnd}`);

        // Skip if no meaningful data
        if (metrics.menuVisits === 0) {
            return {
                markdown: '### This week at a glance\n\n• No menu activity recorded this week.',
                bulletPoints: ['No menu activity recorded this week.'],
            };
        }

        // Build prompt
        const prompt = buildUserPrompt(metrics);

        // Call Gemini (using shared genAIClient — SDK standardization P0)
        const geminiResult = await genAIClient.models.generateContent({
            model: AI_MODEL,
            contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + prompt }] }],
            config: {
                temperature: 0.3,
                maxOutputTokens: 500,
            },
        });
        const text = geminiResult.text;
        if (!text) throw new Error('Empty response from Gemini');

        console.log('[Gemini] Raw response:', text.substring(0, 200) + '...');

        // Parse JSON response
        const parsed = parseGeminiResponse(text);

        // Build markdown from bullet points
        const markdown = `### This week at a glance\n\n${parsed.bulletPoints.map(bp => `• ${bp}`).join('\n')}`;

        const finalResult: OwnerDashboardSummaryResult = {
            markdown,
            bulletPoints: parsed.bulletPoints,
        };

        console.log(`[Gemini] Owner dashboard summary generated successfully`);

        return finalResult;

    } catch (error) {
        console.error('[Gemini] Error generating owner dashboard summary:', error);

        // Fallback response if Gemini fails
        return generateFallbackSummary(metrics);
    }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Parse Gemini's JSON response with error handling
 * @param text - Raw text from Gemini
 * @param maxBullets - Maximum number of bullet points (default: 5)
 */
function parseGeminiResponse(text: string, maxBullets: number = 5): { bulletPoints: string[] } {
    try {
        // Remove markdown code blocks if present
        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/```json\n?/, '').replace(/```\n?$/, '');
        } else if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/```\n?/, '').replace(/```\n?$/, '');
        }

        const parsed = JSON.parse(cleanText);

        // Validate structure
        if (!parsed.bulletPoints || !Array.isArray(parsed.bulletPoints)) {
            throw new Error('Invalid response: missing bulletPoints array');
        }

        // Limit to maxBullets
        return {
            bulletPoints: parsed.bulletPoints.slice(0, maxBullets),
        };

    } catch (error) {
        console.error('[Gemini] Failed to parse response:', error);
        console.error('[Gemini] Raw text:', text);

        throw new Error(`Failed to parse Gemini response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Generate fallback summary if Gemini fails
 */
function generateFallbackSummary(metrics: OwnerDashboardMetrics): OwnerDashboardSummaryResult {
    const bulletPoints: string[] = [];

    // Menu visits
    if (metrics.menuVisits > 0) {
        if (Math.abs(metrics.menuVisitsChange) > 5) {
            const direction = metrics.menuVisitsChange > 0 ? 'more' : 'fewer';
            bulletPoints.push(
                `${metrics.menuVisits} customers scanned your menu this week (${metrics.menuVisitsChange > 0 ? '+' : ''}${metrics.menuVisitsChange}% ${direction} than last week)`
            );
        } else {
            bulletPoints.push(`${metrics.menuVisits} customers scanned your menu this week`);
        }
    }

    // Smart Picks engagement
    const engagementPct = metrics.smartPicksRendered > 0
        ? Math.round((metrics.smartPicksClicks / metrics.smartPicksRendered) * 100)
        : 0;

    if (engagementPct > 0) {
        bulletPoints.push(
            `${engagementPct}% of customers used Smart Picks to choose items faster`
        );
    }

    if (metrics.searches > 0 && metrics.topSearchTerm?.term) {
        bulletPoints.push(
            `Search demand was active, with "${metrics.topSearchTerm.term}" showing up most often`
        );
    }

    if (metrics.menuActionClicks > 0 && metrics.topMenuAction?.action) {
        bulletPoints.push(
            `Customers most often used the ${metrics.topMenuAction.action} action from the menu`
        );
    }

    if (metrics.unavailableItemTaps > 0 && metrics.topUnavailableItem?.itemId) {
        bulletPoints.push(
            `Some customer demand landed on unavailable items, led by ${metrics.topUnavailableItem.itemId}`
        );
    }

    // Top item
    if (metrics.topItems.length > 0 && metrics.topItems[0].clicks > 0) {
        bulletPoints.push(
            `⭐ Your most clicked item had ${metrics.topItems[0].clicks} clicks this week`
        );
    }

    // If no data, return a neutral message
    if (bulletPoints.length === 0) {
        bulletPoints.push('Not enough data this week. Check back next week for insights.');
    }

    const markdown = `### This week at a glance\n\n${bulletPoints.map(bp => `• ${bp}`).join('\n')}`;

    return {
        markdown,
        bulletPoints,
    };
}

// ================================================================
// DAILY SUMMARY (2 bullets, descriptive only, no conclusions)
// ================================================================

const DAILY_SYSTEM_PROMPT = `You are a calm, factual operations assistant for small business owners in India.

Your job is to describe yesterday's menu activity briefly and neutrally.
You do NOT make conclusions, give advice, or predict anything.
You ONLY describe what happened.

Tone rules:
- Descriptive only
- Neutral
- No conclusions
- No advice
- No comparisons to other days

Language rules:
- Use plain words an Indian restaurant/salon owner would understand
- Never use words like: optimize, strategy, conversion, improve, should, could, might

Formatting rules:
- Output must be valid JSON
- Maximum 2 bullet points
- Each bullet must describe ONE fact`;

function buildDailyPrompt(metrics: DailyDashboardMetrics): string {
    const smartPicksVisibilityPct = metrics.menuVisits > 0
        ? Math.round((metrics.smartPicksRendered / metrics.menuVisits) * 100)
        : 0;

    const smartPicksEngagementPct = metrics.smartPicksRendered > 0
        ? Math.round((metrics.smartPicksClicks / metrics.smartPicksRendered) * 100)
        : 0;

    return `Describe yesterday's menu activity in 2 short bullet points.

Rules:
- Do NOT give advice
- Do NOT make conclusions
- Only describe what happened

Data:
- Date: ${metrics.date}
- Menu scans: ${metrics.menuVisits}
- Searches: ${metrics.searches}
- No-result searches: ${metrics.zeroResultSearches}
- Unavailable item taps: ${metrics.unavailableItemTaps}
- Final customer actions: ${metrics.menuActionClicks}
- Top search term: ${metrics.topSearchTerm?.term || 'none'} (${metrics.topSearchTerm?.count || 0})
- Top unavailable item: ${metrics.topUnavailableItem?.itemId || 'none'} (${metrics.topUnavailableItem?.taps || 0} taps)
- Top customer action: ${metrics.topMenuAction?.action || 'none'} (${metrics.topMenuAction?.count || 0})
- Smart Picks shown to: ${smartPicksVisibilityPct}% of visitors
- Smart Picks used by: ${smartPicksEngagementPct}% of those who saw them
- Top clicked item: ${metrics.topItems[0]?.itemId || 'none'} (${metrics.topItems[0]?.clicks || 0} clicks)

Output format (JSON):
{
  "bulletPoints": [
    "Descriptive bullet 1",
    "Descriptive bullet 2"
  ]
}

Maximum 2 bullet points. Each should describe ONE fact.`;
}

/**
 * Generate daily summary - descriptive only, no conclusions
 */
export async function generateDailyAISummary(
    metrics: DailyDashboardMetrics
): Promise<OwnerDashboardSummaryResult> {
    try {
        console.log(`[Gemini] Generating daily summary for ${metrics.date}`);

        // Skip if no meaningful data
        if (metrics.menuVisits === 0) {
            return {
                markdown: '### Yesterday\n\n• No menu activity recorded yesterday.',
                bulletPoints: ['No menu activity recorded yesterday.'],
            };
        }

        const prompt = buildDailyPrompt(metrics);

        // Call Gemini (using shared genAIClient — SDK standardization P0)
        const geminiResult = await genAIClient.models.generateContent({
            model: AI_MODEL,
            contents: [{ role: 'user', parts: [{ text: DAILY_SYSTEM_PROMPT + '\n\n' + prompt }] }],
            config: {
                temperature: 0.2,
                maxOutputTokens: 200,
            },
        });
        const text = geminiResult.text;
        if (!text) throw new Error('Empty response from Gemini');

        const parsed = parseGeminiResponse(text, 2); // Max 2 bullets

        const markdown = `### Yesterday\n\n${parsed.bulletPoints.map(bp => `• ${bp}`).join('\n')}`;

        return {
            markdown,
            bulletPoints: parsed.bulletPoints,
        };

    } catch (error) {
        console.error('[Gemini] Error generating daily summary:', error);
        return generateDailyFallback(metrics);
    }
}

function generateDailyFallback(metrics: DailyDashboardMetrics): OwnerDashboardSummaryResult {
    const bulletPoints: string[] = [];

    if (metrics.menuVisits > 0) {
        bulletPoints.push(`${metrics.menuVisits} customers scanned your menu yesterday`);
    }

    const engagementPct = metrics.smartPicksRendered > 0
        ? Math.round((metrics.smartPicksClicks / metrics.smartPicksRendered) * 100)
        : 0;

    if (engagementPct > 0) {
        bulletPoints.push(`Smart Picks were used by ${engagementPct}% of customers who saw them`);
    }

    if (metrics.searches > 0 && metrics.topSearchTerm?.term) {
        bulletPoints.push(`"${metrics.topSearchTerm.term}" was the most common search yesterday`);
    }

    if (metrics.menuActionClicks > 0 && metrics.topMenuAction?.action) {
        bulletPoints.push(`The ${metrics.topMenuAction.action} action was used most often yesterday`);
    }

    if (bulletPoints.length === 0) {
        bulletPoints.push('No menu activity recorded yesterday.');
    }

    return {
        markdown: `### Yesterday\n\n${bulletPoints.map(bp => `• ${bp}`).join('\n')}`,
        bulletPoints: bulletPoints.slice(0, 2),
    };
}

// ================================================================
// MONTHLY SUMMARY (3 bullets, calm, reassuring)
// ================================================================

const MONTHLY_SYSTEM_PROMPT = `You are a calm, reassuring operations assistant for small business owners in India.

Your job is to summarize monthly menu performance in a calm, positive tone.
You focus on what happened, not what could be improved.
You help owners feel confident about their subscription.

Tone rules:
- Calm
- Reassuring
- Positive (but not fake)
- No pressure
- No urgency

Language rules:
- Use plain words an Indian restaurant/salon owner would understand
- Avoid words like: should, must, need to, improve, optimize
- Use words like: used, worked, helped, active

Formatting rules:
- Output must be valid JSON
- Maximum 3 bullet points
- Each bullet should be reassuring`;

function buildMonthlyPrompt(metrics: MonthlyDashboardMetrics): string {
    const smartPicksVisibilityPct = metrics.menuVisits > 0
        ? Math.round((metrics.smartPicksRendered / metrics.menuVisits) * 100)
        : 0;

    const smartPicksEngagementPct = metrics.smartPicksRendered > 0
        ? Math.round((metrics.smartPicksClicks / metrics.smartPicksRendered) * 100)
        : 0;

    return `Summarize this month's menu performance in 3 calm, reassuring bullet points.

Rules:
- Focus on what worked
- Keep tone reassuring
- No advice or pressure

Data:
- Period: ${metrics.monthStart} to ${metrics.monthEnd}
- Days with activity: ${metrics.daysWithData}
- Total menu scans: ${metrics.menuVisits}
- Searches: ${metrics.searches}
- No-result searches: ${metrics.zeroResultSearches}
- Unavailable item taps: ${metrics.unavailableItemTaps}
- Final customer actions: ${metrics.menuActionClicks}
- Top search term: ${metrics.topSearchTerm?.term || 'none'} (${metrics.topSearchTerm?.count || 0})
- Top unavailable item: ${metrics.topUnavailableItem?.itemId || 'none'} (${metrics.topUnavailableItem?.taps || 0} taps)
- Top customer action: ${metrics.topMenuAction?.action || 'none'} (${metrics.topMenuAction?.count || 0})
- Smart Picks shown to: ${smartPicksVisibilityPct}% of visitors
- Smart Picks used by: ${smartPicksEngagementPct}% of those who saw them
- Top clicked item: ${metrics.topItems[0]?.itemId || 'none'} (${metrics.topItems[0]?.clicks || 0} clicks)

Output format (JSON):
{
  "bulletPoints": [
    "Reassuring bullet 1",
    "Reassuring bullet 2",
    "Reassuring bullet 3"
  ]
}

Maximum 3 bullet points. Calm, positive tone.`;
}

/**
 * Generate monthly summary - calm, reassuring tone
 */
export async function generateMonthlyAISummary(
    metrics: MonthlyDashboardMetrics
): Promise<OwnerDashboardSummaryResult> {
    try {
        console.log(`[Gemini] Generating monthly summary for ${metrics.monthStart} to ${metrics.monthEnd}`);

        // Skip if no meaningful data
        if (metrics.menuVisits === 0) {
            return {
                markdown: '### This month in summary\n\n• No menu activity recorded this month.',
                bulletPoints: ['No menu activity recorded this month.'],
            };
        }

        const prompt = buildMonthlyPrompt(metrics);

        // Call Gemini (using shared genAIClient — SDK standardization P0)
        const geminiResult = await genAIClient.models.generateContent({
            model: AI_MODEL,
            contents: [{ role: 'user', parts: [{ text: MONTHLY_SYSTEM_PROMPT + '\n\n' + prompt }] }],
            config: {
                temperature: 0.3,
                maxOutputTokens: 300,
            },
        });
        const text = geminiResult.text;
        if (!text) throw new Error('Empty response from Gemini');

        const parsed = parseGeminiResponse(text, 3); // Max 3 bullets

        const markdown = `### This month in summary\n\n${parsed.bulletPoints.map(bp => `• ${bp}`).join('\n')}`;

        return {
            markdown,
            bulletPoints: parsed.bulletPoints,
        };

    } catch (error) {
        console.error('[Gemini] Error generating monthly summary:', error);
        return generateMonthlyFallback(metrics);
    }
}

function generateMonthlyFallback(metrics: MonthlyDashboardMetrics): OwnerDashboardSummaryResult {
    const bulletPoints: string[] = [];

    if (metrics.menuVisits > 0) {
        bulletPoints.push(`${metrics.menuVisits} customers scanned your menu this month`);
    }

    const engagementPct = metrics.smartPicksRendered > 0
        ? Math.round((metrics.smartPicksClicks / metrics.smartPicksRendered) * 100)
        : 0;

    if (engagementPct > 0) {
        bulletPoints.push(`Customers regularly used Smart Picks to choose items`);
    }

    if (metrics.topItems.length > 0 && metrics.topItems[0].clicks > 0) {
        bulletPoints.push(`Your menu features were actively used throughout the month`);
    }

    if (metrics.searches > 0 && metrics.topSearchTerm?.term) {
        bulletPoints.push(`Customers kept checking for "${metrics.topSearchTerm.term}" during the month`);
    }

    if (metrics.menuActionClicks > 0 && metrics.topMenuAction?.action) {
        bulletPoints.push(`The ${metrics.topMenuAction.action} action kept getting used from the menu`);
    }

    if (bulletPoints.length === 0) {
        bulletPoints.push('No menu activity recorded this month.');
    }

    return {
        markdown: `### This month in summary\n\n${bulletPoints.map(bp => `• ${bp}`).join('\n')}`,
        bulletPoints: bulletPoints.slice(0, 3),
    };
}

// ================================================================
// EXPORTS
// ================================================================

export default {
    generateOwnerDashboardSummary,
    generateDailyAISummary,
    generateMonthlyAISummary,
};
