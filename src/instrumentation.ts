export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validate environment variables on server startup
    const { runEnvValidation } = await import('@lib/env/validateEnv');
    runEnvValidation();
  }
}
