import { Metadata } from 'next';
import TestSentryPage from 'src/components/pages/TestSentryPage';

/**
 * Sentry Testing Page
 * 
 * Route: /platform/test-sentry
 * Access: Requires authentication (platform routes)
 * 
 * Purpose:
 * - Test Sentry error tracking integration
 * - Verify dev/prod log separation
 * - Validate tenant/store context tracking
 * 
 * Usage:
 * 1. Login to your account first
 * 2. Visit /platform/test-sentry
 * 3. Click test buttons to trigger errors
 * 4. Check Sentry dashboard for errors with full context
 */

export const metadata: Metadata = {
    title: 'Sentry Testing | MenuList.ai',
    description: 'Test Sentry error tracking integration',
    robots: {
        index: false, // Don't index test pages
        follow: false,
    },
};

export default function Page() {
    return <TestSentryPage />;
}
