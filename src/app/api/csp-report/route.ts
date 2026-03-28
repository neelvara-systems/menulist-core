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

const isDev = process.env.NODE_ENV === 'development';

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

export async function POST(request: Request) {
    try {
        const report: CSPReport = await request.json();
        const cspReport = report['csp-report'];

        if (!cspReport) {
            return new Response('Invalid report format', { status: 400 });
        }

        // Extract violation details
        const violation = {
            blockedUri: cspReport['blocked-uri'],
            violatedDirective: cspReport['violated-directive'],
            sourceFile: cspReport['source-file'],
            lineNumber: cspReport['line-number'],
            columnNumber: cspReport['column-number'],
            timestamp: new Date().toISOString(),
            userAgent: request.headers.get('user-agent'),
            // Add URL context
            reportUrl: request.headers.get('referer') || 'unknown',
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
