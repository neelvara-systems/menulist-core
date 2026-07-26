export const dynamic = 'force-dynamic';
/**
 * CSP Violation Report Endpoint
 * ═══════════════════════════════════════════════════════════════
 * 
 * Receives Content-Security-Policy violation reports
 * Helps identify what needs fixing before enforcing strict CSP
 * 
 * OWASP A03: Injection Prevention - Monitor CSP violations
 */

import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { readBoundedTextBody } from '@lib/security/boundedRequestBody';
import {
    CSPViolationDetails,
    determineCspViolationSeverity,
    normalizeCspViolationReport,
} from '@lib/security/cspReport';
import { getBoundedSecurityStringContext, logSecurityDiagnostic, logSecurityFailure } from '@lib/security/securityDiagnostics';
import { NextRequest } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';

const isDev = process.env.NODE_ENV === 'development';
const CSP_REPORT_MAX_BYTES = 32 * 1024;
const CSP_REPORT_FIELD_MAX_LENGTH = 500;
const MAX_CSP_REPORT_JSON_PARSE_DIAGNOSTICS = 25;

const reportedCspReportJsonParseFailures = new Set<string>();

type CSPViolationLogDetails = CSPViolationDetails & {
    userAgent?: string;
    reportUrl?: string;
};

const getClientIp = (request: NextRequest): string => {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) return forwardedFor.split(',')[0].trim();
    return request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || 'unknown';
};

const safeRequestField = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return normalized ? normalized.slice(0, CSP_REPORT_FIELD_MAX_LENGTH) : undefined;
};

const getDirectiveCategory = (directive: unknown): string => {
    const normalized = String(directive || '').toLowerCase();
    if (!normalized) return 'unknown';
    if (normalized.includes('script-src')) return 'script-src';
    if (normalized.includes('style-src')) return 'style-src';
    if (normalized.includes('font-src')) return 'font-src';
    if (normalized.includes('img-src')) return 'img-src';
    if (normalized.includes('connect-src')) return 'connect-src';
    if (normalized.includes('frame-src') || normalized.includes('child-src')) return 'frame-src';
    if (normalized.includes('default-src')) return 'default-src';
    return 'other';
};

const getBlockedUriKind = (blockedUri: unknown): string => {
    const normalized = String(blockedUri || '').trim().toLowerCase();
    if (!normalized) return 'empty';
    if (normalized === 'eval' || normalized === 'inline' || normalized === 'self') return normalized;
    if (normalized.startsWith('https://')) return 'https';
    if (normalized.startsWith('http://')) return 'http';
    if (normalized.startsWith('data:')) return 'data';
    if (normalized.startsWith('blob:')) return 'blob';
    if (normalized.startsWith('/')) return 'path';
    return 'other';
};

const getCspViolationLogContext = (violation: CSPViolationLogDetails) => ({
    blockedUriKind: getBlockedUriKind(violation.blockedUri),
    columnNumber: violation.columnNumber,
    directiveCategory: getDirectiveCategory(violation.violatedDirective),
    lineNumber: violation.lineNumber,
    ...getBoundedSecurityStringContext('blockedUri', violation.blockedUri),
    ...getBoundedSecurityStringContext('violatedDirective', violation.violatedDirective),
    ...getBoundedSecurityStringContext('sourceFile', violation.sourceFile),
    ...getBoundedSecurityStringContext('userAgent', violation.userAgent),
    ...getBoundedSecurityStringContext('reportUrl', violation.reportUrl),
});

const getBodyShapeKind = (trimmedBody: string): string => {
    if (!trimmedBody) return 'empty';
    if (trimmedBody.startsWith('{')) return 'object_like';
    if (trimmedBody.startsWith('[')) return 'array_like';
    if (/^[a-z]/i.test(trimmedBody)) return 'word_like';
    return 'other';
};

const shouldLogCspReportJsonParseFailure = (body: string, request: NextRequest): boolean => {
    const trimmedBody = body.trim();
    const contentType = request.headers.get('content-type') || '';
    const shapeKey = [
        `kind:${getBodyShapeKind(trimmedBody)}`,
        `bodyLength:${body.length}`,
        `trimmedBodyLength:${trimmedBody.length}`,
        `contentTypeLength:${contentType.length}`,
    ].join('|');

    if (reportedCspReportJsonParseFailures.has(shapeKey)) return false;
    if (reportedCspReportJsonParseFailures.size >= MAX_CSP_REPORT_JSON_PARSE_DIAGNOSTICS) return false;
    reportedCspReportJsonParseFailures.add(shapeKey);
    return true;
};

const getCspReportJsonParseFailureContext = (
    body: string,
    parseError: unknown,
    request: NextRequest,
) => {
    const trimmedBody = body.trim();

    return {
        endpoint: '/api/csp-report',
        method: request.method,
        bodyLength: body.length,
        bodyShapeKind: getBodyShapeKind(trimmedBody),
        cappedShapeGuard: MAX_CSP_REPORT_JSON_PARSE_DIAGNOSTICS,
        fallbackPolicy: 'ignore_malformed_report',
        sourceErrorName: parseError instanceof Error ? parseError.name || 'Error' : typeof parseError,
        trimmedBodyLength: trimmedBody.length,
        ...getBoundedSecurityStringContext('contentType', request.headers.get('content-type')),
        ...getBoundedSecurityStringContext('reportUrl', request.headers.get('referer')),
        ...getBoundedSecurityStringContext('requestIpHash', hashPublicRateLimitValue(getClientIp(request))),
        ...getBoundedSecurityStringContext('userAgent', request.headers.get('user-agent')),
    };
};

export async function POST(request: NextRequest) {
    try {
        const config = getRateLimitForFeature('CSP_REPORT');
        const ipHash = hashPublicRateLimitValue(getClientIp(request));
        const limit = await checkRateLimit({
            key: `csp-report:${ipHash}`,
            ...config,
        });
        if (!limit.allowed) {
            return new Response(null, { status: 204 });
        }

        const bodyResult = await readBoundedTextBody(request, CSP_REPORT_MAX_BYTES, {
            invalidRequestMessage: 'Invalid report format',
            tooLargeMessage: 'Report body too large',
        });
        if (bodyResult.ok === false) {
            return new Response(null, { status: 204 });
        }
        const body = bodyResult.body;

        let report: unknown;
        try {
            report = JSON.parse(body);
        } catch (parseError) {
            if (shouldLogCspReportJsonParseFailure(body, request)) {
                logSecurityDiagnostic(
                    'csp_report_json_parse_failed',
                    getCspReportJsonParseFailureContext(body, parseError, request),
                );
            }
            return new Response(null, { status: 204 });
        }
        const normalizedReport = normalizeCspViolationReport(report);
        if (!normalizedReport) {
            return new Response('Invalid report format', { status: 400 });
        }

        // Extract violation details
        const violation = {
            ...normalizedReport,
            userAgent: safeRequestField(request.headers.get('user-agent')),
            // Add URL context
            reportUrl: safeRequestField(request.headers.get('referer')) || 'unknown',
        };

        // 🚨 SECURITY LOGGING
        if (isDev) {
            // In development: Skip logging (we handle it client-side for better visibility)
            // See: src/app/layout.tsx for client-side CSP violation monitoring
        } else {
            // In production: Log to Sentry
            const severity = determineCspViolationSeverity(violation);
            logger.security('CSP Violation Detected', getCspViolationLogContext(violation), severity);
        }

        // Return 204 No Content (standard for CSP reports)
        return new Response(null, { status: 204 });
    } catch (error) {
        logSecurityFailure('csp_report_processing_failed', error, {
            endpoint: '/api/csp-report',
            method: request.method,
            ...getBoundedSecurityStringContext('requestUrl', request.url),
            ...getBoundedSecurityStringContext('requestIpHash', hashPublicRateLimitValue(getClientIp(request))),
        });
        return new Response('Internal Server Error', { status: 500 });
    }
}
