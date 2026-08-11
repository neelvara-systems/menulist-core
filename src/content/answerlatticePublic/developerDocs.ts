import type { AnswerlatticeDeveloperDoc } from './types';

export const ANSWERLATTICE_DEVELOPER_DOCS: AnswerlatticeDeveloperDoc[] = [
    {
        slug: 'safe-page-context',
        path: '/developers/safe-page-context',
        title: 'Safe Page Context | AnswerLattice Developers',
        metaDescription: 'Safe page context rules for AnswerLattice widget installs: allowed fields, forbidden identifiers, screenshots, and route updates.',
        eyebrow: 'Developer Doc',
        heroTitle: 'Pass enough context to help. Do not pass private data.',
        heroDescription:
            'The AnswerLattice widget uses safe page hints so approved answers match the screen. It does not need tenant IDs, user IDs, account records, tokens, or payment data.',
        proof: [
            { label: 'Allowed', value: 'path, title, feature, workflow, role, locale' },
            { label: 'Forbidden', value: 'IDs, emails, phone numbers, tokens, secrets, billing data' },
            { label: 'Screenshots', value: 'User-uploaded or pasted only' },
        ],
        sections: [
            {
                title: 'Allowed context',
                description: 'Use stable, high-level values that describe the current product page or workflow.',
                bullets: [
                    'Send path and title for the current page.',
                    'Use product-safe feature, workflow, role, and locale values when available.',
                    'Update context after client-side route changes.',
                ],
            },
            {
                title: 'Do not send sensitive data',
                description: 'AnswerLattice should not receive private account, billing, auth, or customer-record payloads from the browser.',
                bullets: [
                    'Do not send tenantId, storeId, tId, sId, userId, email, phone, or full name.',
                    'Do not send access tokens, cookies, JWTs, service keys, secrets, or payment data.',
                    'Do not pass raw customer records or private account metadata into widget context.',
                ],
            },
            {
                title: 'Screenshot boundary',
                description: 'Visual context is explicit user input, not automatic runtime capture.',
                bullets: [
                    'Use upload or paste when the user chooses to attach a screenshot.',
                    'Do not scrape DOM, automatically capture the app screen, or attach restricted pages.',
                    'Keep blocked routes configured in the AnswerLattice dashboard.',
                ],
            },
        ],
    },
    {
        slug: 'widget-verification',
        path: '/developers/widget-verification',
        title: 'Widget Verification | AnswerLattice Developers',
        metaDescription: 'AnswerLattice widget verification checklist for script loading, allowed origins, blocked routes, route context, and dashboard status.',
        eyebrow: 'Developer Doc',
        heroTitle: 'Verify the widget before you call support live.',
        heroDescription:
            'The install is not finished when the script tag exists. Verify script loading, dashboard-owned route rules, safe context, and blocked surfaces.',
        proof: [
            { label: 'Script', value: 'Loaded once from the v1 URL' },
            { label: 'Origin', value: 'Allowed in the dashboard' },
            { label: 'Routes', value: 'Blocked routes stay blocked' },
        ],
        sections: [
            {
                title: 'Script checks',
                description: 'Install the widget once in the app shell.',
                bullets: [
                    'Use the stable v1 script URL.',
                    'Keep the widget key in a public client-safe environment variable where possible.',
                    'Avoid per-page duplicate script tags.',
                ],
            },
            {
                title: 'Runtime checks',
                description: 'Confirm runtime state from the product and the AnswerLattice dashboard.',
                bullets: [
                    'Open the product on an allowed origin.',
                    'Navigate between app pages and confirm context updates.',
                    'Open blocked routes and confirm the widget is absent or hidden.',
                    'Return to AnswerLattice and check the latest runtime status.',
                ],
            },
            {
                title: 'Failure checks',
                description: 'The widget should fail closed when install values are missing or blocked.',
                bullets: [
                    'Missing widget key should not expose private data.',
                    'Blocked routes should not mount support UI.',
                    'Forbidden context fields should not be sent.',
                ],
            },
        ],
    },
    {
        slug: 'verified-visitor-context',
        path: '/developers/verified-visitor-context',
        title: 'Verified Visitor Context | AnswerLattice Developers',
        metaDescription: 'Sign short-lived AnswerLattice visitor context on your server and attach bounded allowlisted diagnostic links without trusting browser identity or recording sessions.',
        eyebrow: 'Developer Doc',
        heroTitle: 'Verify sensitive context on your server. Keep normal support available.',
        heroDescription:
            'Use optional signed context when an answer depends on a trusted plan, role, locale, or requester. Use external evidence links only for support-safe diagnostics you already control.',
        proof: [
            { label: 'Signing', value: 'Ed25519 private key stays server-side' },
            { label: 'Token life', value: '10 minutes maximum' },
            { label: 'Evidence', value: '3 links on exact allowed HTTPS hosts' },
        ],
        sections: [
            {
                title: 'Create and protect the signing key',
                description: 'Create the key in Widget > Access & Security. AnswerLattice stores the public verification record and shows the private PKCS8 key once.',
                bullets: [
                    'Store the private key in your server secret manager or protected server environment.',
                    'Never include the private key in browser JavaScript, public environment variables, logs, or repository files.',
                    'Rotate the key when exposure is suspected; tokens signed by the prior key stop verifying.',
                ],
            },
            {
                title: 'Sign a short-lived visitor token',
                description: 'Use EdDSA with the current key ID, the `answerlattice-widget` audience, and a lifetime no longer than 600 seconds.',
                bullets: [
                    'Use `sub` for a support-safe requester identifier and optionally include name, email, plan, role, or locale.',
                    'Do not put tenant IDs, workspace IDs, secrets, payment data, or private account records in the token.',
                    'Issue the token only after your own server authenticates the current app user, and return it with no-store headers.',
                    'Pass the finished token with `window.AnswerlatticeWidget?.identifySigned(token)` and clear it on sign-out with `clearIdentity()`.',
                ],
                code: `import { createPrivateKey, sign } from 'node:crypto';

const encode = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

export function createAnswerlatticeVisitorToken({
  privateKeyPkcs8,
  keyId,
  visitor,
}: {
  privateKeyPkcs8: string;
  keyId: string;
  visitor: { id: string; name?: string; email?: string; plan?: string; role?: string; locale?: string };
}) {
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'EdDSA', typ: 'JWT', kid: keyId });
  const payload = encode({
    aud: 'answerlattice-widget',
    iat: now,
    exp: now + 300,
    sub: visitor.id,
    name: visitor.name,
    email: visitor.email,
    plan: visitor.plan,
    role: visitor.role,
    locale: visitor.locale,
  });
  const input = \`\${header}.\${payload}\`;
  const key = createPrivateKey({
    key: Buffer.from(privateKeyPkcs8, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });
  const signature = sign(null, Buffer.from(input), key).toString('base64url');
  return \`\${input}.\${signature}\`;
}`,
            },
            {
                title: 'Attach bounded diagnostic evidence',
                description: 'Configure exact evidence hosts in Access & Security, then pass links only when they are useful for the current support question.',
                bullets: [
                    'Call `setEvidenceLinks([{ label, url }])` with at most three HTTPS links.',
                    'Links with credentials, ports, unapproved hosts, or malformed URLs are discarded.',
                    'AnswerLattice stores validated links with private widget-search activity and never fetches or embeds their content.',
                ],
            },
            {
                title: 'Failure behavior',
                description: 'Signed identity is optional and must never become a support availability dependency.',
                bullets: [
                    'Invalid or expired tokens discard signed-only identity and plan/role claims.',
                    'Safe page, feature, and workflow context can still serve generic page-aware support.',
                    'Workspace scope always comes from the authenticated widget key, never from the token or browser context.',
                ],
                code: `const { token } = await fetch('/api/my-answerlattice-token', {
  credentials: 'same-origin',
  cache: 'no-store',
}).then((response) => response.json());

window.AnswerlatticeWidget?.identifySigned?.(token);
window.AnswerlatticeWidget?.setEvidenceLinks?.([
  { label: 'Error details', url: 'https://errors.example.com/event/abc123' },
]);

// Run when the host user signs out or changes account.
window.AnswerlatticeWidget?.clearIdentity?.();`,
            },
        ],
    },
];

export function getAnswerlatticeDeveloperDoc(path: string) {
    return ANSWERLATTICE_DEVELOPER_DOCS.find((item) => item.path === path);
}
