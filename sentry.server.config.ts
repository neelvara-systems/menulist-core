// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { FEATURE_FLAGS } from "@config/features";
import * as Sentry from "@sentry/nextjs";
// Use different Sentry projects for dev and production
// Development DSN - errors go to dev project
const DEV_DSN = process.env.SENTRY_DEV_DSN || "https://6d8940082c1030ff67af7e2345684dc9@o4510276442062848.ingest.us.sentry.io/4510276910710784";

// Production DSN - errors go to production project
const PROD_DSN = process.env.SENTRY_DSN || "https://74bb29116e9ac34f9e0b97a8121b95c7@o4510276442062848.ingest.us.sentry.io/4510276442259456";

Sentry.init({
  // Automatically use correct DSN based on environment
  dsn: process.env.NODE_ENV === 'production' ? PROD_DSN : DEV_DSN,

  // Environment configuration
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  enabled: FEATURE_FLAGS.ENABLE_SENTRY, // Controlled by feature flag

  // Release tracking - know which deployment caused errors
  release: process.env.VERCEL_GIT_COMMIT_SHA
    ? `menulist-ai@${process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7)}`
    : 'menulist-ai@dev',

  // Reduce sampling in production (10% of transactions)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Disable PII (Personally Identifiable Information) for privacy
  sendDefaultPii: false,
  // Always send events - they'll go to the correct project based on DSN
  beforeSend(event, hint) {
    return event;
  },
});
