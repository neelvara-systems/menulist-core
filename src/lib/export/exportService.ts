/**
 * Export Service
 * Handles exporting analytics data to various formats
 */

import type { DashboardData } from '@lib/analytics/dal';
import {
  copyExportTextToClipboard,
  getBoundedExportStringContext,
  hasExportClipboardWrite,
  hasExportCopyFallback,
  logExportFailure,
} from '@lib/export/exportDiagnostics';
import { logger } from '@lib/monitoring/logger';
import { escapeCSVValue } from '@util/exportUtils';

// ================================================================
// TYPES
// ================================================================

export type ExportFormat = 'csv' | 'json' | 'markdown';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeCharts?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// ================================================================
// MAIN EXPORT FUNCTION
// ================================================================

/**
 * Export dashboard data in specified format
 */
export async function exportDashboardData(
  data: DashboardData,
  options: ExportOptions
): Promise<void> {
  const { format, filename } = options;
  const defaultFilename = `analytics-export-${new Date().toISOString().split('T')[0]}`;

  let content: string;
  let mimeType: string;
  let extension: string;

  switch (format) {
    case 'csv':
      content = generateCSV(data);
      mimeType = 'text/csv';
      extension = 'csv';
      break;

    case 'json':
      content = generateJSON(data);
      mimeType = 'application/json';
      extension = 'json';
      break;

    case 'markdown':
      content = generateMarkdown(data);
      mimeType = 'text/markdown';
      extension = 'md';
      break;

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  // Security Audit: Log analytics data export
  logger.security('Analytics Data Exported', {
    action: 'EXPORT_ANALYTICS',
    format,
    filename: `${filename || defaultFilename}.${extension}`,
    totalChats: data.summary?.totalChats,
  }, 'low');

  // Trigger download
  downloadFile(
    content,
    `${filename || defaultFilename}.${extension}`,
    mimeType
  );
}

// ================================================================
// FORMAT GENERATORS
// ================================================================

/**
 * Generate CSV format
 */
function generateCSV(data: DashboardData): string {
  const lines: string[] = [];
  const csvRow = (values: unknown[]): string => values.map(escapeCSVValue).join(',');

  // Header
  lines.push('# Analytics Summary Report');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('');

  // Summary Metrics
  lines.push('## Summary Metrics');
  lines.push(csvRow(['Metric', 'Value']));
  lines.push(csvRow(['Total Chats', data.summary.totalChats]));
  lines.push(csvRow(['Satisfaction Rate', `${data.summary.satisfactionRate}%`]));
  lines.push(csvRow(['Avg Messages per Chat', data.summary.avgMessagesPerChat]));
  lines.push(csvRow(['Knowledge Gaps', data.summary.knowledgeGaps]));
  lines.push('');

  // Top Questions
  if (data.topQuestions && data.topQuestions.length > 0) {
    lines.push('## Top Questions');
    lines.push(csvRow(['Question', 'Count', 'Category']));
    data.topQuestions.forEach(q => {
      lines.push(csvRow([q.question, q.count, q.category || 'N/A']));
    });
    lines.push('');
  }

  // Knowledge Gaps
  if (data.knowledgeGaps && data.knowledgeGaps.length > 0) {
    lines.push('## Knowledge Gaps');
    lines.push(csvRow(['Question', 'Count', 'Severity', 'Examples']));
    data.knowledgeGaps.forEach(gap => {
      const examples = gap.examples.join('; ');
      lines.push(csvRow([gap.question, gap.count, gap.severity || 'N/A', examples]));
    });
    lines.push('');
  }

  // Feedback
  lines.push('## Feedback Summary');
  lines.push(csvRow(['Type', 'Count']));
  lines.push(csvRow(['Positive', data.feedback.positive]));
  lines.push(csvRow(['Negative', data.feedback.negative]));
  lines.push(csvRow(['Total', data.feedback.total]));

  return lines.join('\n');
}

/**
 * Generate JSON format
 */
function generateJSON(data: DashboardData): string {
  const exportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    data: {
      summary: data.summary,
      topQuestions: data.topQuestions,
      knowledgeGaps: data.knowledgeGaps,
      feedback: data.feedback,
      health: data.health,
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Generate Markdown format
 */
function generateMarkdown(data: DashboardData): string {
  const lines: string[] = [];

  // Title
  lines.push('# Analytics Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toLocaleString()}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Summary
  lines.push('## 📊 Summary Metrics');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Conversations | ${data.summary.totalChats.toLocaleString()} |`);
  lines.push(`| Satisfaction Rate | ${data.summary.satisfactionRate.toFixed(1)}% |`);
  lines.push(`| Avg Messages/Chat | ${data.summary.avgMessagesPerChat.toFixed(1)} |`);
  lines.push(`| Knowledge Gaps | ${data.summary.knowledgeGaps} |`);
  lines.push('');

  // Trends
  if (data.summary.trends) {
    lines.push('### Trends');
    lines.push('');
    lines.push(`- **Chats:** ${data.summary.trends.chatsChange >= 0 ? '+' : ''}${data.summary.trends.chatsChange.toFixed(1)}%`);
    lines.push(`- **Satisfaction:** ${data.summary.trends.satisfactionChange >= 0 ? '+' : ''}${data.summary.trends.satisfactionChange.toFixed(1)}%`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Top Questions
  if (data.topQuestions && data.topQuestions.length > 0) {
    lines.push('## 💬 Top Questions');
    lines.push('');
    data.topQuestions.slice(0, 10).forEach((q, index) => {
      lines.push(`${index + 1}. **${q.question}** (${q.count} times)`);
      if (q.category) {
        lines.push(`   - Category: ${q.category}`);
      }
    });
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Knowledge Gaps
  if (data.knowledgeGaps && data.knowledgeGaps.length > 0) {
    lines.push('## ⚠️ Knowledge Gaps');
    lines.push('');
    data.knowledgeGaps.forEach((gap, index) => {
      lines.push(`### ${index + 1}. ${gap.question}`);
      lines.push('');
      lines.push(`- **Count:** ${gap.count}`);
      if (gap.severity) {
        lines.push(`- **Severity:** ${gap.severity}`);
      }
      if (gap.examples && gap.examples.length > 0) {
        lines.push(`- **Examples:**`);
        gap.examples.forEach(ex => {
          lines.push(`  - "${ex}"`);
        });
      }
      lines.push('');
    });
    lines.push('---');
    lines.push('');
  }

  // Feedback
  lines.push('## 👍👎 Feedback Summary');
  lines.push('');
  lines.push('| Type | Count | Percentage |');
  lines.push('|------|-------|------------|');
  const posPercent = data.feedback.total > 0
    ? ((data.feedback.positive / data.feedback.total) * 100).toFixed(1)
    : '0';
  const negPercent = data.feedback.total > 0
    ? ((data.feedback.negative / data.feedback.total) * 100).toFixed(1)
    : '0';
  lines.push(`| Positive | ${data.feedback.positive} | ${posPercent}% |`);
  lines.push(`| Negative | ${data.feedback.negative} | ${negPercent}% |`);
  lines.push(`| **Total** | **${data.feedback.total}** | **100%** |`);
  lines.push('');

  // Recent Feedback
  if (data.feedback.recent && data.feedback.recent.length > 0) {
    lines.push('### Recent Feedback');
    lines.push('');
    data.feedback.recent.slice(0, 5).forEach((fb, index) => {
      const icon = fb.isPositive ? '👍' : '👎';
      lines.push(`${index + 1}. ${icon} "${fb.message}" (${fb.count} times)`);
    });
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('*End of Report*');

  return lines.join('\n');
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy content to clipboard
 */
export async function copyToClipboard(content: string): Promise<void> {
  try {
    await copyExportTextToClipboard(content);
  } catch (error) {
    logExportFailure('menu_export_clipboard_copy_failed', error, {
      contentLength: content.length,
      hasClipboardWrite: hasExportClipboardWrite(),
      hasCopyFallback: hasExportCopyFallback(),
    });
    throw error;
  }
}

/**
 * Share via Web Share API (if available)
 */
export async function shareContent(
  title: string,
  text: string,
  url?: string
): Promise<void> {
  if (!navigator.share) {
    throw new Error('Web Share API not supported');
  }

  try {
    await navigator.share({
      title,
      text,
      url,
    });
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      logExportFailure('menu_export_web_share_failed', error, {
        ...getBoundedExportStringContext('title', title),
        ...getBoundedExportStringContext('text', text),
        ...getBoundedExportStringContext('url', url),
      });
      throw error;
    }
  }
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  exportDashboardData,
  copyToClipboard,
  shareContent,
};
