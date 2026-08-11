#!/usr/bin/env node

import { createHmac } from 'node:crypto';
import { existsSync } from 'node:fs';
import process from 'node:process';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';

const envFile = process.env.RAZORPAY_SANDBOX_ENV_FILE || '.env';
const providerTimeoutMs = Number(process.env.RAZORPAY_SANDBOX_TIMEOUT_MS || 15000);
const TEST_KEY_ID_PATTERN = /^rzp_test_[A-Za-z0-9]+$/;
const LIVE_KEY_ID_PATTERN = /^rzp_live_/;
const PLACEHOLDER_PATTERN = /<|>|placeholder|change[_-]?me|your[_-]/i;

if (existsSync(envFile)) dotenv.config({ path: envFile, override: true });

function requireSecret(name) {
  const value = String(process.env[name] || '').trim();
  if (!value || PLACEHOLDER_PATTERN.test(value)) throw new Error(`${name.toLowerCase()}_missing_or_placeholder`);
  return value;
}

function requireTestKeyId(name) {
  const value = requireSecret(name);
  if (LIVE_KEY_ID_PATTERN.test(value)) throw new Error(`${name.toLowerCase()}_live_key_refused`);
  if (!TEST_KEY_ID_PATTERN.test(value)) throw new Error(`${name.toLowerCase()}_test_key_required`);
  return value;
}

function withTimeout(promise, operation) {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${operation}_timeout`)), providerTimeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

function normalizeProviderFailure(operation, error) {
  const status = Number(error?.statusCode || error?.status || error?.response?.status);
  const rawCode = error?.error?.code || error?.code;
  const code = typeof rawCode === 'string' && /^[A-Za-z0-9_.-]{1,80}$/.test(rawCode)
    ? rawCode
    : 'provider_error';
  return new Error(`${operation}_failed:${Number.isInteger(status) ? status : 'unknown'}:${code}`);
}

async function readCollection(operation, request) {
  try {
    const response = await withTimeout(request(), operation);
    if (!response || response.entity !== 'collection' || !Array.isArray(response.items)) {
      throw new Error(`${operation}_response_invalid`);
    }
    return {
      entity: response.entity,
      operation,
      requestedCount: 1,
      returnedCount: response.items.length,
      result: 'passed',
    };
  } catch (error) {
    if (error instanceof Error && (
      error.message === `${operation}_timeout`
      || error.message === `${operation}_response_invalid`
    )) throw error;
    throw normalizeProviderFailure(operation, error);
  }
}

async function main() {
  if (!Number.isInteger(providerTimeoutMs) || providerTimeoutMs < 1000 || providerTimeoutMs > 60000) {
    throw new Error('razorpay_sandbox_timeout_invalid');
  }

  const keyId = requireTestKeyId('NEXT_PUBLIC_MENULIST_RAZORPAY_KEY_ID');
  const keySecret = requireSecret('MENULIST_RAZORPAY_KEY_SECRET');
  const webhookSecret = requireSecret('MENULIST_RAZORPAY_WEBHOOK_SECRET');

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const operations = [];
  operations.push(await readCollection('payments.all', () => razorpay.payments.all({ count: 1 })));
  operations.push(await readCollection('orders.all', () => razorpay.orders.all({ count: 1 })));
  operations.push(await readCollection('plans.all', () => razorpay.plans.all({ count: 1 })));
  operations.push(await readCollection('subscriptions.all', () => razorpay.subscriptions.all({ count: 1 })));

  const syntheticBody = JSON.stringify({ event: 'payment.authorized', payload: { payment: { entity: { id: 'pay_synthetic' } } } });
  const syntheticSignature = createHmac('sha256', webhookSecret).update(syntheticBody).digest('hex');
  const validSignatureAccepted = Razorpay.validateWebhookSignature(
    syntheticBody,
    syntheticSignature,
    webhookSecret,
  );
  const tamperedBodyRejected = !Razorpay.validateWebhookSignature(
    `${syntheticBody} `,
    syntheticSignature,
    webhookSecret,
  );
  if (!validSignatureAccepted || !tamperedBodyRejected) {
    throw new Error('razorpay_webhook_signature_self_test_failed');
  }

  console.log(JSON.stringify({
    boundary: 'read_only_provider_inventory_and_synthetic_signature_only',
    gate: 'razorpay-sandbox-readiness',
    keyMode: 'test',
    mutationAllowed: false,
    operations,
    result: 'passed',
    webhookSignatureSelfTest: {
      rawBodyRequired: true,
      tamperedBodyRejected,
      validSignatureAccepted,
    },
  }, null, 2));
}

main().catch((error) => {
  const reason = error instanceof Error ? error.message : 'unknown_error';
  console.error(JSON.stringify({
    gate: 'razorpay-sandbox-readiness',
    mutationAllowed: false,
    reason: reason.slice(0, 180),
    result: 'failed',
  }));
  process.exitCode = 1;
});
