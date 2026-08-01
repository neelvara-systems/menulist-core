const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const retiredContracts = [
  'src/types/aiFeedback.ts',
  'src/types/apiService.d.ts',
  'src/types/baseDocument.ts',
  'src/types/razorpayWebhookEventTypes.ts',
];

for (const relativePath of retiredContracts) {
  assert.equal(
    fs.existsSync(path.join(root, relativePath)),
    false,
    `${relativePath} must remain retired; use the active validated boundary for that flow`,
  );
}

const activeContracts = [
  'src/app/api/razorpay/webhook/route.ts',
  'src/types/razorpay.ts',
  'src/types/feedback.ts',
];

for (const relativePath of activeContracts) {
  assert.equal(
    fs.existsSync(path.join(root, relativePath)),
    true,
    `${relativePath} must remain the active contract`,
  );
}

const useMenuListTypes = fs.readFileSync(
  path.join(root, 'src/components/templates/main-app/useMenuList/types.ts'),
  'utf8',
);
assert.match(
  useMenuListTypes,
  /menuModifiedOn:\s*unknown;/,
  'Output Center must keep the persisted publication timestamp unknown until normalization',
);
assert.doesNotMatch(
  useMenuListTypes,
  /menuModifiedOn:\s*any;/,
  'Output Center must not erase the persisted publication timestamp type',
);

console.log('Retired type-contract verifier passed.');
