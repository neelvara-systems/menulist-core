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
                description: 'Use stable, high-level values that describe the current product surface.',
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
];

export function getAnswerlatticeDeveloperDoc(path: string) {
    return ANSWERLATTICE_DEVELOPER_DOCS.find((item) => item.path === path);
}

