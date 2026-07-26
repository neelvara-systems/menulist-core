export const CSP_REPORT_FIELD_MAX_LENGTH = 500;

export type CSPViolationDetails = Readonly<{
    blockedUri?: string;
    violatedDirective?: string;
    sourceFile?: string;
    lineNumber?: number;
    columnNumber?: number;
}>;

export type CSPViolationSeverity = 'low' | 'medium' | 'high' | 'critical';

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
);

const normalizeReportField = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return normalized ? normalized.slice(0, CSP_REPORT_FIELD_MAX_LENGTH) : undefined;
};

const normalizeReportNumber = (value: unknown): number | undefined => {
    const numberValue = Number(value);
    return Number.isSafeInteger(numberValue) && numberValue >= 0 && numberValue <= 1_000_000
        ? numberValue
        : undefined;
};

export const normalizeCspViolationReport = (value: unknown): CSPViolationDetails | null => {
    if (!isRecord(value)) return null;

    const report = value['csp-report'];
    if (!isRecord(report)) return null;

    return {
        blockedUri: normalizeReportField(report['blocked-uri']),
        violatedDirective: normalizeReportField(report['violated-directive']),
        sourceFile: normalizeReportField(report['source-file']),
        lineNumber: normalizeReportNumber(report['line-number']),
        columnNumber: normalizeReportNumber(report['column-number']),
    };
};

export const determineCspViolationSeverity = (
    violation: CSPViolationDetails,
): CSPViolationSeverity => {
    const directive = violation.violatedDirective?.toLowerCase() || '';
    const blockedUri = violation.blockedUri?.toLowerCase() || '';

    if (
        directive.includes('script-src')
        && (blockedUri === 'eval' || blockedUri === 'inline')
    ) {
        return 'high';
    }

    if (directive.includes('script-src') && /^https?:\/\//.test(blockedUri)) {
        return 'high';
    }

    if (directive.includes('style-src')) {
        return 'low';
    }

    if (directive.includes('font-src') || directive.includes('img-src')) {
        return 'low';
    }

    return 'medium';
};
