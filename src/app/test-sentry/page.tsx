import { redirect } from 'next/navigation';

/**
 * Redirect old test-sentry route to platform location
 * 
 * Old: /test-sentry
 * New: /platform/test-sentry (requires authentication)
 */
export default function Page() {
  redirect('/platform/test-sentry');
}
