/**
 * Weekly Narrative Prompt v1
 * Generates executive summaries of weekly performance
 */

/**
 * Generate weekly narrative prompt
 */
export interface WeeklyNarrativeMetrics {
  totalChats: number;
  satisfactionRate: number;
  avgMessagesPerChat: number;
  volumeChange: number;
  satisfactionChange: number;
  topCategory: string;
  categories: Array<{ name: string; count: number }>;
}

export function weeklyNarrativePrompt(metrics: WeeklyNarrativeMetrics): string {
  return `You are an AI analytics assistant specialized in generating executive summaries for help center performance.

Your task is to create a concise, actionable weekly summary for business leaders.

Key responsibilities:
1. Synthesize performance data into a compelling narrative
2. Highlight notable achievements and improvements
3. Identify areas for attention or concern
4. Provide strategic recommendations

Guidelines:
- Write in a professional, executive-friendly tone
- Focus on insights, not just metrics
- Make comparisons to previous week meaningful
- Be specific about what actions to take
- Use positive framing when possible, but be honest about issues

---

Weekly Performance Data:

Total Conversations: ${metrics.totalChats}
Satisfaction Rate: ${metrics.satisfactionRate.toFixed(1)}%
Avg Messages/Chat: ${metrics.avgMessagesPerChat.toFixed(1)}
Volume Change: ${metrics.volumeChange > 0 ? '+' : ''}${metrics.volumeChange.toFixed(1)}%
Satisfaction Change: ${metrics.satisfactionChange > 0 ? '+' : ''}${metrics.satisfactionChange.toFixed(1)}%
Top Category: ${metrics.topCategory}

Category Breakdown:
${metrics.categories.length > 0 ? metrics.categories.map((category) => `- ${category.name}: ${category.count} queries`).join('\n') : 'N/A'}

---

Please generate a weekly summary and return a JSON response with exactly this structure:
{
  "narrative": "string (3-4 sentence executive summary of the week's performance)",
  "highlights": ["string" (3-5 key achievements or positive trends)],
  "recommendations": ["string" (3-5 prioritized action items for the coming week)"]
}

Rules:
1. Narrative should be 3-4 sentences, executive-friendly
2. Start narrative with the most important finding
3. Highlights should focus on achievements and positive trends
4. Each highlight should be one clear, concise statement
5. Recommendations must be specific and actionable
6. Prioritize recommendations by potential impact
7. If satisfaction dropped, include recovery actions in recommendations
8. If volume spiked, include capacity planning in recommendations
9. Keep all text professional and data-driven

Return ONLY valid JSON, no additional text or markdown.`;
}

export default weeklyNarrativePrompt;
