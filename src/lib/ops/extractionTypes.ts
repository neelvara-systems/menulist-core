/**
 * Extraction Monitoring Types
 * 
 * Types for the internal extraction monitoring dashboard at /ops/extraction.
 * Read-only: all data comes from existing menuImageProcessingJobs collection.
 * 
 * @see __docs__/ai-extraction-monitoring/
 */

// ═══════════════════════════════════════════════════════════════
// JOB SUMMARY (for job feed table)
// ═══════════════════════════════════════════════════════════════

export interface ExtractionJobSummary {
    id: string;
    projectId: string;
    status: string;
    filesCount: number;
    itemsExtracted: number;
    categoriesExtracted: number;
    qualityScore: number | null;
    processingTime: number | null;
    createdAt: any;
    completedAt: any;
    isFirstExtraction: boolean | null;
    hasError: boolean;
    errorMessage: string | null;
}

// ═══════════════════════════════════════════════════════════════
// JOB DETAILS (for inspector drawer)
// ═══════════════════════════════════════════════════════════════

export interface ExtractionJobDetails extends ExtractionJobSummary {
    tId: string;
    sId: string;
    uId: string;
    files: Array<{ uid: string; name: string; type: string; size: number }>;
    targetLanguages: Array<{ code: string; name: string }>;
    result: {
        combinedData: any;
        qualityScore: number;
        qualityDetails: {
            categoryQuality: number;
            itemQuality: number;
            priceQuality: number;
            descriptionQuality: number;
        };
        processingTime: number;
        confidenceSummary?: {
            highConfidenceCount: number;
            mediumConfidenceCount: number;
            lowConfidenceCount: number;
            averageConfidenceScore: number;
        };
        batchResults?: Array<{ batchIndex: number; success: boolean; filesProcessed: number }>;
        rawBatchResponses?: Array<{ batchIndex: number; rawText: string; truncated: boolean }>;
        promptVersion?: string;
        model?: string;
    } | null;
    error: { code: string; message: string; retryable: boolean } | null;
    fileResults: Record<string, { categoriesCount: number; itemsCount: number }> | null;
    transaction: { transactionId: string; totalCredits: number; totalCharge: number } | null;
}

// ═══════════════════════════════════════════════════════════════
// HEALTH METRICS (top-level dashboard stats)
// ═══════════════════════════════════════════════════════════════

export type ExtractionHealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface ExtractionHealthMetrics {
    activeJobs: number;
    failedJobs24h: number;
    completedJobs24h: number;
    totalJobs24h: number;
    failureRate: number;
    avgProcessingTime: number;
    avgQualityScore: number;
    healthStatus: ExtractionHealthStatus;
}

// ═══════════════════════════════════════════════════════════════
// COST METRICS
// ═══════════════════════════════════════════════════════════════

export interface ExtractionCostMetrics {
    callsToday: number;
    avgCostPerExtraction: number;
    dailySpend: number;
    mostExpensiveJobCost: number;
}

// ═══════════════════════════════════════════════════════════════
// QUALITY METRICS
// ═══════════════════════════════════════════════════════════════

export interface ExtractionQualityMetrics {
    avgScore: number;
    confidenceDistribution: { high: number; medium: number; low: number };
    lowQualityRate: number;
    totalJobsAnalyzed: number;
}

// ═══════════════════════════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════════════════════════

export interface ExtractionJobFilter {
    status?: string;
    days?: number;
    minQuality?: number;
    maxQuality?: number;
    pageSize?: number;
}
