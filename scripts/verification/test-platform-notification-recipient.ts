import fs from 'node:fs';
import path from 'node:path';
import { normalizePlatformNotificationEmail } from '@data/shared/platformNotificationRecipient';
import { classifyPlatformAlert } from '@lib/ops/platformNotificationClassifier';
import { normalizePlatformNotificationEmail as normalizeFunctionsEmail } from '../../functions/src/sharedData/platformNotificationRecipient';

const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

const valid = [
  ['owner@example.com', 'owner@example.com'],
  ['  founder+alerts@menulist.ai  ', 'founder+alerts@menulist.ai'],
] as const;

for (const [input, expected] of valid) {
  assert(normalizePlatformNotificationEmail(input) === expected, `App normalizer rejected ${input}`);
  assert(normalizeFunctionsEmail(input) === expected, `Functions normalizer rejected ${input}`);
}

const invalid: unknown[] = [
  '',
  'owner@example.com,other@example.com',
  'owner@example.com;other@example.com',
  'Owner <owner@example.com>',
  'owner@example.com\r\nBcc: other@example.com',
  'owner@example',
  `owner@${'a'.repeat(250)}.com`,
  123,
  null,
];

let conversionHookCalled = false;
invalid.push({
  toString: () => {
    conversionHookCalled = true;
    return 'owner@example.com';
  },
});

for (const input of invalid) {
  assert(normalizePlatformNotificationEmail(input) === null, 'App normalizer admitted an invalid recipient');
  assert(normalizeFunctionsEmail(input) === null, 'Functions normalizer admitted an invalid recipient');
}
assert(!conversionHookCalled, 'Recipient normalization executed an unknown conversion hook');

const appSource = fs.readFileSync(
  path.join(process.cwd(), 'src/data/shared/platformNotificationRecipient.ts'),
  'utf8',
);
const functionsSource = fs.readFileSync(
  path.join(process.cwd(), 'functions/src/sharedData/platformNotificationRecipient.ts'),
  'utf8',
);
assert(appSource === functionsSource, 'App and Functions recipient contracts must remain byte-identical');

const malformedCriticalAlert = classifyPlatformAlert({
  title: 'Public menu unavailable',
  severity: 'not-a-severity',
  metadata: {
    productId: 'OTHER',
    category: 'not-a-category',
  },
});
assert(malformedCriticalAlert.triggerType === 'PUBLIC_MENU_FAILURE', 'Critical public-menu trigger must classify');
assert(malformedCriticalAlert.productId === 'ML', 'Malformed product override must fall back to registry truth');
assert(malformedCriticalAlert.category === 'public_output', 'Malformed category override must fall back to registry truth');
assert(malformedCriticalAlert.severity === 'critical', 'Malformed severity must not downgrade a critical registry alert');

const validOverrides = classifyPlatformAlert({
  title: 'Public menu unavailable',
  severity: 'info',
  metadata: {
    productId: 'AL',
    category: 'answerlattice',
  },
});
assert(validOverrides.productId === 'AL', 'Valid product override must remain supported');
assert(validOverrides.category === 'answerlattice', 'Valid category override must remain supported');
assert(validOverrides.severity === 'info', 'Valid severity override must remain supported');

console.log('Platform notification recipient boundary tests passed.');
