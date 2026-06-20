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
import { NextRequest } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';
const CSP_REPORT_MAX_BYTES = 32 * 1024;
const CSP_REPORT_FIELD_MAX_LENGTH = 500;

interface CSPReport {
    'csp-report': {
        'blocked-uri'?: string;
        'violated-directive'?: string;
        'original-policy'?: string;
        'source-file'?: string;
        'line-number'?: number;
        'column-number'?: number;
    };
}

const getClientIp = (request: NextRequest): string => {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) return forwardedFor.split(',')[0].trim();
    return request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || 'unknown';
};

const safeReportField = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.replace(/[\r\n\t]/g, ' ').trim();
    return normalized ? normalized.slice(0, CSP_REPORT_FIELD_MAX_LENGTH) : undefined;
};

export async function POST(request: NextRequest) {
    try {
        const config = getRateLimitForFeature('CSP_REPORT');
        const limit = await checkRateLimit({
            key: `csp-report:${getClientIp(request)}`,
            ...config,
        });
        if (!limit.allowed) {
            return new Response(null, { status: 204 });
        }

        const contentLength = Number(request.headers.get('content-length') || 0);
        if (contentLength > CSP_REPORT_MAX_BYTES) {
            return new Response(null, { status: 204 });
        }

        const body = await request.text();
        if (body.length > CSP_REPORT_MAX_BYTES) {
            return new Response(null, { status: 204 });
        }

        const report: CSPReport = JSON.parse(body);
        const cspReport = report['csp-report'];

        if (!cspReport) {
            return new Response('Invalid report format', { status: 400 });
        }

        // Extract violation details
        const violation = {
            blockedUri: safeReportField(cspReport['blocked-uri']),
            violatedDirective: safeReportField(cspReport['violated-directive']),
            sourceFile: safeReportField(cspReport['source-file']),
            lineNumber: cspReport['line-number'],
            columnNumber: cspReport['column-number'],
            timestamp: new Date().toISOString(),
            userAgent: safeReportField(request.headers.get('user-agent')),
            // Add URL context
            reportUrl: safeReportField(request.headers.get('referer')) || 'unknown',
        };

        // 🚨 SECURITY LOGGING
        if (isDev) {
            // In development: Skip logging (we handle it client-side for better visibility)
            // See: src/app/layout.tsx for client-side CSP violation monitoring
        } else {
            // In production: Log to Sentry
            const severity = determineCSPSeverity(violation);
            logger.security('CSP Violation Detected', violation, severity);
        }

        // Return 204 No Content (standard for CSP reports)
        return new Response(null, { status: 204 });
    } catch (error) {
        logger.error('Failed to process CSP report', error, {
            url: request.url,
            method: request.method,
        });
        return new Response('Internal Server Error', { status: 500 });
    }
}

/**
 * Determine severity of CSP violation based on type
 */
function determineCSPSeverity(violation: any): 'low' | 'medium' | 'high' | 'critical' {
    const directive = violation.violatedDirective || '';
    const blockedUri = violation.blockedUri || '';

    // Critical: eval() or inline scripts trying to execute
    if (directive.includes('script-src') && (blockedUri === 'eval' || blockedUri === 'inline')) {
        return 'high';
    }

    // High: Unknown external scripts
    if (directive.includes('script-src') && blockedUri.startsWith('http') && !blockedUri.includes('google')) {
        return 'high';
    }

    // Medium: Style violations (less dangerous)
    if (directive.includes('style-src')) {
        return 'low';
    }

    // Medium: Known safe violations (fonts, images)
    if (directive.includes('font-src') || directive.includes('img-src')) {
        return 'low';
    }

    // Default
    return 'medium';
}
