const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
];

const optionalEnvVars = [
  'PORT',
  'NODE_ENV',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'APP_BASE_URL',
];

export function validateEnv(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters for security');
  }

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.APP_BASE_URL) {
      missing.push('APP_BASE_URL');
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      missing.push('STRIPE_SECRET_KEY');
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      missing.push('STRIPE_WEBHOOK_SECRET');
    }
    if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
      warnings.push('STRIPE_SECRET_KEY is a test key (sk_test_) in production');
    }
  }

  if (missing.length > 0) {
    console.error('[Env Validation] Missing required environment variables:');
    missing.forEach(varName => console.error(`  - ${varName}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('[Env Validation] Warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  console.log('[Env Validation] All required environment variables present');
}
