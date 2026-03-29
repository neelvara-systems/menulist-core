// TEMPORARY: Sentry instrumentation disabled — webpack plugin emits client-formatted
// bundles into .next/server/ causing 'self is not defined' in npm start.
// Re-enable once @sentry/nextjs fixes server instrumentation bundling.
// import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // await import('../sentry.server.config');

    // Validate environment variables on server startup
    const { runEnvValidation } = await import('@lib/env/validateEnv');
    runEnvValidation();
  }

  // if (process.env.NEXT_RUNTIME === 'edge') {
  //   await import('../sentry.edge.config');
  // }
}

// export const onRequestError = Sentry.captureRequestError;
