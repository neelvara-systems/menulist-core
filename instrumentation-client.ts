// This file configures the initialization of Sentry on the client (browser).
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
// Replaces sentry.client.config.ts (Next.js 14+ convention)

import { FEATURE_FLAGS } from "@config/features";
import * as Sentry from "@sentry/nextjs";
// Use different Sentry projects for dev and production

// Development DSN - errors go to dev project
const DEV_DSN = process.env.NEXT_PUBLIC_SENTRY_DEV_DSN || "https://6d8940082c1030ff67af7e2345684dc9@o4510276442062848.ingest.us.sentry.io/4510276910710784";

// Production DSN - errors go to production project
const PROD_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || "https://74bb29116e9ac34f9e0b97a8121b95c7@o4510276442062848.ingest.us.sentry.io/4510276442259456";

Sentry.init({
  // Automatically use correct DSN based on environment
  dsn: process.env.NODE_ENV === 'production' ? PROD_DSN : DEV_DSN,

  // Environment configuration
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  enabled: FEATURE_FLAGS.ENABLE_SENTRY, // Controlled by feature flag

  // Release tracking - know which deployment caused errors
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
    ? `menulist-ai@${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.substring(0, 7)}`
    : 'menulist-ai@dev',

  // Adjust this value in production (0.1 = 10% of transactions)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay for error analysis (5% of sessions, 100% of error sessions)
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  // Integrations
  integrations: [
    // Browser tracing for performance monitoring
    Sentry.browserTracingIntegration({
      // Track page loads and API calls
      enableInp: true, // Track Interaction to Next Paint
    }),
    // Session replay for error analysis
    Sentry.replayIntegration({
      maskAllText: true, // Mask sensitive text
      blockAllMedia: true, // Don't record media
    }),
  ],

  // Filter events by environment (dev errors go to dev project, prod to prod project)
  beforeSend(event, hint) {
    // Always send events - they'll go to the correct project based on DSN
    return event;
  },

  // Ignore common browser errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
    'ChunkLoadError',
    'Loading chunk',
    'Network Error',
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
