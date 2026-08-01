#!/usr/bin/env ts-node

import assert = require('node:assert/strict');
import { createHmac } from 'node:crypto';
import {
    detectWebhookProvider,
    validateGitHubWebhook,
    validateRazorpayWebhook,
    validateShopifyWebhook,
    validateWebhookIP,
    WEBHOOK_IP_ALLOWLISTS,
} from '@lib/security/webhookValidation';

const body = '{"event":"test"}';
const secret = 'test-secret';
const sha256Hex = createHmac('sha256', secret).update(body).digest('hex');
const sha256Base64 = createHmac('sha256', secret).update(body).digest('base64');

assert.equal(validateRazorpayWebhook(body, sha256Hex, secret), true);
assert.equal(validateRazorpayWebhook(`${body} `, sha256Hex, secret), false);
assert.equal(validateGitHubWebhook(body, `sha256=${sha256Hex}`, secret), true);
assert.equal(validateGitHubWebhook(body, sha256Hex, secret), false);
assert.equal(validateShopifyWebhook(body, sha256Base64, secret), true);
assert.equal(validateRazorpayWebhook(body, sha256Hex.slice(1), secret), false);
assert.equal(validateRazorpayWebhook(body, sha256Hex, ''), false);

assert.equal(validateWebhookIP('13.234.176.64', [...WEBHOOK_IP_ALLOWLISTS.razorpay], 'razorpay'), true);
assert.equal(validateWebhookIP('13.234.176.95', [...WEBHOOK_IP_ALLOWLISTS.razorpay], 'razorpay'), true);
assert.equal(validateWebhookIP('13.234.176.96', [...WEBHOOK_IP_ALLOWLISTS.razorpay], 'razorpay'), true);
assert.equal(validateWebhookIP('13.234.176.127', [...WEBHOOK_IP_ALLOWLISTS.razorpay], 'razorpay'), true);
assert.equal(validateWebhookIP('13.234.176.128', [...WEBHOOK_IP_ALLOWLISTS.razorpay], 'razorpay'), false);
assert.equal(validateWebhookIP('13.234.176.64, 127.0.0.1', [...WEBHOOK_IP_ALLOWLISTS.razorpay], 'razorpay'), false);
assert.equal(validateWebhookIP('013.234.176.64', [...WEBHOOK_IP_ALLOWLISTS.razorpay], 'razorpay'), false);
assert.equal(validateWebhookIP('2001:db8::1', ['2001:db8::1'], 'custom'), true);
assert.equal(validateWebhookIP(null, ['127.0.0.1'], 'custom'), false);

assert.equal(detectWebhookProvider(new Headers({ 'x-razorpay-signature': sha256Hex })), 'razorpay');
assert.equal(detectWebhookProvider(new Headers()), 'unknown');

process.stdout.write('Webhook validation boundary tests passed.\n');
