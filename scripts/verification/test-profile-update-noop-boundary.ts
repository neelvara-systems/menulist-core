import assert from 'node:assert/strict';
import { retainChangedProfileFields } from '../../src/lib/userProfile/profileUpdate';

const existing = {
  countryCode: 'IN',
  dialCode: '+91',
  name: 'MenuList Local QA Owner',
  phone: '',
  phoneNumber: '',
  phoneUsername: '',
};

assert.deepEqual(
  retainChangedProfileFields(existing, { ...existing }),
  {},
  'a no-change profile submission must not retain any Firestore write fields',
);

assert.deepEqual(
  retainChangedProfileFields({
    countryCode: '',
    dialCode: '',
    name: 'Owner',
    phoneNumber: '',
  }, {
    countryCode: '',
    dialCode: '',
    name: 'Owner',
    phoneNumber: '',
  }),
  {},
  'a blank-phone profile draft must not create a country-code-only change',
);

assert.deepEqual(
  retainChangedProfileFields({}, {
    countryCode: '',
    dialCode: '',
    phone: '',
    phoneNumber: '',
    phoneUsername: '',
  }),
  {},
  'absent optional phone fields and normalized empty strings must be treated as equivalent',
);

assert.deepEqual(
  retainChangedProfileFields(existing, {
    ...existing,
    name: 'Updated owner',
  }),
  { name: 'Updated owner' },
  'a real profile change must retain only the changed field',
);

assert.deepEqual(
  retainChangedProfileFields(existing, {
    ...existing,
    phone: '+12025550147',
    phoneNumber: '2025550147',
    phoneUsername: '12025550147',
  }),
  {
    phone: '+12025550147',
    phoneNumber: '2025550147',
    phoneUsername: '12025550147',
  },
  'a real normalized phone change must preserve every changed storage projection',
);

console.log('Profile update no-op boundary tests passed');
