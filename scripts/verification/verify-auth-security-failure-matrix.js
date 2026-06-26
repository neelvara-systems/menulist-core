#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const assert = (condition, message) => {
    if (!condition) failures.push(message);
};

const assertIncludes = (content, needle, message) => {
    assert(content.includes(needle), message);
};

const publicApi = read('src/middleware/publicApi.ts');
const contactRoute = read('src/app/api/answerlattice/public/contact/route.ts');
const feedbackRoute = read('src/app/api/public/feedback/submit/route.ts');
const contactForm = read('src/app/sites/answerlattice/contact/ContactForm.tsx');
const feedbackForm = read('src/components/atoms/GuestFeedbackForm/index.tsx');
const turnstileWidget = read('src/components/security/TurnstileWidget.tsx');
const authIndex = read('src/lib/auth/index.ts');
const authSecurity = read('src/lib/auth/security.ts');
const forgotPassword = read('src/components/templates/forgotPassword/index.tsx');
const claimAccount = read('src/app/api/auth/claim-account/route.ts');
const stagingEnv = read('.env.staging.example');
const productionEnv = read('.env.production.example');

assertIncludes(
    publicApi,
    'const PUBLIC_FORM_TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;',
    'Turnstile middleware must read TURNSTILE_SECRET_KEY.',
);
assertIncludes(
    publicApi,
    "reason: 'missing_token'",
    'Turnstile middleware must reject missing tokens when the secret is configured.',
);
assertIncludes(contactRoute, 'verifyTurnstileToken(body.captchaToken, request)', 'Answerlattice contact route must verify captchaToken.');
assertIncludes(feedbackRoute, 'verifyTurnstileToken(data.captchaToken, req)', 'Guest feedback route must verify captchaToken.');
assertIncludes(contactForm, 'captchaToken: captchaToken || undefined', 'Answerlattice contact form must submit captchaToken.');
assertIncludes(feedbackForm, 'captchaToken: captchaToken || undefined', 'Guest feedback form must submit captchaToken.');
assertIncludes(turnstileWidget, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'Client Turnstile widget must use the public site key env.');
assertIncludes(stagingEnv, 'TURNSTILE_SECRET_KEY=', 'Staging env template must expose server Turnstile secret placeholder.');
assertIncludes(stagingEnv, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY=', 'Staging env template must expose client Turnstile site key placeholder.');
assertIncludes(productionEnv, 'TURNSTILE_SECRET_KEY=', 'Production env template must expose server Turnstile secret placeholder.');
assertIncludes(productionEnv, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY=', 'Production env template must expose client Turnstile site key placeholder.');

assert(
    /const MAX_FAILED_ATTEMPTS\s*=\s*5/.test(authSecurity),
    'Wrong-password matrix must lock after 5 failed attempts.',
);
assertIncludes(
    authSecurity,
    'currentFailedCount + 1 >= MAX_FAILED_ATTEMPTS',
    'Wrong-password matrix must include the current failed attempt when locking.',
);
assertIncludes(
    authIndex,
    "await logFailedLogin(email, 'invalid_password', 'credentials');",
    'Wrong-password matrix must log invalid_password failures.',
);
assert(
    (authIndex.match(/Invalid email\/phone or password/g) || []).length >= 2,
    'Credential failures must use a generic auth error.',
);

assertIncludes(
    forgotPassword,
    'If this email is connected to MenuList, a reset link has been sent.',
    'Password reset for existing/non-existing emails must use generic success wording.',
);
assert(
    !/(user not found|email not found|no user record)/i.test(forgotPassword),
    'Password reset UI must not contain user-enumerating copy.',
);

assertIncludes(
    claimAccount,
    'claimToken: null',
    'One-time claim/verification token must be cleared after successful use.',
);
assertIncludes(
    claimAccount,
    'Claim Token Not Found',
    'Duplicate one-time claim/verification link clicks must hit the generic not-found path.',
);
assertIncludes(
    claimAccount,
    'claimFailure("Unable to complete account claim.", 404)',
    'Duplicate one-time claim/verification link clicks must return a generic failure.',
);
assertIncludes(
    claimAccount,
    'auth/email-already-exists',
    'Duplicate signup matrix must handle Firebase duplicate-email failures.',
);
assertIncludes(
    claimAccount,
    'claimFailure("Unable to complete account claim.", 409)',
    'Duplicate signup matrix must return a generic conflict failure.',
);

if (failures.length > 0) {
    console.error('Auth/security failure matrix verification failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log('Auth/security failure matrix verification passed.');
