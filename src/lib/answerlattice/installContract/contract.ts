export {
    ANSWERLATTICE_AGENT_PACKET_CONTRACT_VERSION,
    ANSWERLATTICE_CONTEXT_METHODS,
    ANSWERLATTICE_CONTEXT_CONTRACT_VERSION,
    ANSWERLATTICE_INSTALL_CONTRACT_VERSION,
    ANSWERLATTICE_MARKDOWN_DOCS_CONTRACT_VERSION,
    ANSWERLATTICE_SITE_URL,
    ANSWERLATTICE_VERIFICATION_CONTRACT_VERSION,
    ANSWERLATTICE_WIDGET_CONTRACT_VERSION,
    ANSWERLATTICE_WIDGET_GLOBAL_NAME,
    ANSWERLATTICE_WIDGET_SCRIPT_CACHE_CONTROL,
    ANSWERLATTICE_WIDGET_LATEST_SCRIPT_URL,
    ANSWERLATTICE_WIDGET_SCRIPT_URL,
    ANSWERLATTICE_WIDGET_SCRIPT_VERSION,
} from './constants';

import {
    ANSWERLATTICE_CONTEXT_CONTRACT_VERSION,
    ANSWERLATTICE_CONTEXT_METHODS,
    ANSWERLATTICE_INSTALL_CONTRACT_VERSION,
    ANSWERLATTICE_SITE_URL,
    ANSWERLATTICE_VERIFICATION_CONTRACT_VERSION,
    ANSWERLATTICE_WIDGET_GLOBAL_NAME,
    ANSWERLATTICE_WIDGET_SCRIPT_CACHE_CONTROL,
    ANSWERLATTICE_WIDGET_SCRIPT_URL,
} from './constants';
import { ANSWERLATTICE_RESOURCE_ARTICLES } from '../../../content/answerlatticePublic';

export type AnswerlatticeInstallDocKey =
    | 'overview'
    | 'ai-agent'
    | 'manual'
    | 'nextjs'
    | 'react'
    | 'vue'
    | 'plain-html'
    | 'shopify'
    | 'webflow'
    | 'contracts';

export type AnswerlatticeAgentPacketInput = {
    widgetKey?: string | null;
    widgetKeyPrefix?: string | null;
    productionOrigin?: string | null;
    stagingOrigin?: string | null;
    allowedOrigins?: string[];
    blockedRoutes?: string[];
    framework?: string | null;
    router?: string | null;
    supportEntryPoints?: string[];
    includeRawWidgetKey?: boolean;
};

export type AnswerlatticeInstallDocSection = {
    heading: string;
    body?: string;
    bullets?: string[];
    code?: string;
};

export type AnswerlatticeInstallDoc = {
    key: AnswerlatticeInstallDocKey;
    path: string;
    markdownPath: string;
    title: string;
    navTitle: string;
    description: string;
    sections: AnswerlatticeInstallDocSection[];
};

export const ANSWERLATTICE_ALLOWED_CONTEXT_FIELDS = [
    'path',
    'title',
    'feature',
    'workflow',
    'role',
    'locale',
] as const;

export const ANSWERLATTICE_SAFE_CONTEXT_FIELDS = ANSWERLATTICE_ALLOWED_CONTEXT_FIELDS;
export const ANSWERLATTICE_FULL_WIDGET_KEY_PLACEHOLDER = 'al_full_widget_key_shown_once';

export const ANSWERLATTICE_FORBIDDEN_CONTEXT_FIELDS = [
    'tenantId',
    'storeId',
    'tId',
    'sId',
    'userId',
    'uId',
    'email',
    'phone',
    'fullName',
    'billingId',
    'subscriptionId',
    'customerRecord',
    'customerRecords',
    'privateMetadata',
    'accessToken',
    'refreshToken',
    'jwt',
    'cookie',
    'session',
    'apiKey',
    'secret',
    'password',
    'payment',
] as const;

export const ANSWERLATTICE_DEFAULT_BLOCKED_ROUTES = [
    '/login',
    '/signin',
    '/signup',
    '/checkout',
    '/billing',
    '/admin/security',
    '/settings/security',
    '/reset-password',
    '/invite',
    '/api-key',
    '/webhooks',
] as const;

export const ANSWERLATTICE_ENV_VAR_NAMES = [
    'ANSWERLATTICE_WIDGET_KEY',
    'NEXT_PUBLIC_ANSWERLATTICE_WIDGET_KEY',
    'VITE_ANSWERLATTICE_WIDGET_KEY',
    'NUXT_PUBLIC_ANSWERLATTICE_WIDGET_KEY',
] as const;

export const ANSWERLATTICE_AGENT_FILE_TARGETS = [
    'AGENTS.md',
    'CLAUDE.md',
    '.cursor/rules/answerlattice/RULE.md',
    '.cursor/rules/answerlattice.mdc',
    '.windsurf/rules/answerlattice.md',
    '.windsurf/workflows/install-answerlattice.md',
    'skills/answerlattice-install/SKILL.md',
] as const;

const formatList = (values: readonly string[], fallback: readonly string[] = []) => {
    const items = values.length > 0 ? values : fallback;
    return items.map((item) => `- ${item}`).join('\n');
};

const normalizeLines = (value: string) => value.trim().replace(/\n{3,}/g, '\n\n');

const escapeHtmlAttribute = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export function getAnswerlatticeWidgetKeyForPacket(input: AnswerlatticeAgentPacketInput = {}) {
    if (input.includeRawWidgetKey && input.widgetKey?.trim()) return input.widgetKey.trim();
    if (input.widgetKeyPrefix?.trim() || input.widgetKey?.trim()) return ANSWERLATTICE_FULL_WIDGET_KEY_PLACEHOLDER;
    return '{{ANSWERLATTICE_WIDGET_KEY}}';
}

export function getAnswerlatticeAllowedOriginsForPacket(input: AnswerlatticeAgentPacketInput = {}) {
    const configured = Array.isArray(input.allowedOrigins) ? input.allowedOrigins.filter(Boolean) : [];
    const explicit = [
        input.productionOrigin,
        input.stagingOrigin,
    ].filter(Boolean) as string[];
    return configured.length > 0 ? configured : explicit;
}

export function getAnswerlatticeBlockedRoutesForPacket(input: AnswerlatticeAgentPacketInput = {}) {
    const configured = Array.isArray(input.blockedRoutes) ? input.blockedRoutes.filter(Boolean) : [];
    return configured;
}

export function buildAnswerlatticeWidgetEmbedSnippet(
    widgetKey = '{{ANSWERLATTICE_WIDGET_KEY}}',
    options: { blockedRoutes?: readonly string[] } = {},
) {
    const lines = [
        '<script',
        `  src="${escapeHtmlAttribute(ANSWERLATTICE_WIDGET_SCRIPT_URL)}"`,
        `  data-answerlattice-key="${escapeHtmlAttribute(widgetKey)}"`,
    ];
    const blockedRoutes = options.blockedRoutes?.filter(Boolean) || [];
    if (blockedRoutes.length > 0) {
        lines.push(`  data-blocked-routes="${escapeHtmlAttribute(blockedRoutes.join(','))}"`);
    }
    lines.push('  async', '></script>');
    return lines.join('\n');
}

export function buildAnswerlatticeSafeContextSnippet() {
    return [
        'window.AnswerlatticeWidget?.page({',
        "  path: window.location.pathname,",
        "  title: document.title,",
        "  feature: 'billing',",
        "  workflow: 'manage_subscription',",
        "  role: 'owner',",
        "  locale: 'en',",
        '});',
        '',
        'window.AnswerlatticeWidget?.identify?.({',
        "  id: currentUser?.supportCustomerId,",
        "  name: currentUser?.name,",
        "  email: currentUser?.email,",
        '});',
    ].join('\n');
}

export function renderAnswerlatticeAgentPrompt(input: AnswerlatticeAgentPacketInput = {}) {
    const widgetKey = getAnswerlatticeWidgetKeyForPacket(input);
    const widgetKeyPrefix = input.widgetKeyPrefix?.trim();
    const allowedOrigins = getAnswerlatticeAllowedOriginsForPacket(input);
    const blockedRoutes = getAnswerlatticeBlockedRoutesForPacket(input);
    const framework = input.framework || '{{FRAMEWORK}}';
    const router = input.router || '{{ROUTER}}';
    const entryPoints = input.supportEntryPoints?.length ? input.supportEntryPoints : ['global widget', 'help button', 'sidebar', 'settings page'];

    return normalizeLines(`
You are integrating AnswerLattice into this product.

Goal:
Install the AnswerLattice v1 support widget, pass safe page context, respect AnswerLattice dashboard route rules, and prove the installation works.

Use these AnswerLattice values:
- Widget key for install: ${widgetKey}
- Saved key identifier, for dashboard lookup only: ${widgetKeyPrefix || '(none saved yet)'}
- Dashboard-saved allowed origins, for verification only:
${formatList(allowedOrigins, ['(none saved yet)'])}
- Dashboard-saved blocked routes:
${formatList(blockedRoutes, ['(none saved yet)'])}
- Framework: ${framework}
- Router: ${router}
- Support entry points:
${formatList(entryPoints)}

Canonical install contract:
- Contract version: ${ANSWERLATTICE_INSTALL_CONTRACT_VERSION}
- Script URL: ${ANSWERLATTICE_WIDGET_SCRIPT_URL}
- Browser global: ${ANSWERLATTICE_WIDGET_GLOBAL_NAME}
- Context methods:
${ANSWERLATTICE_CONTEXT_METHODS.map((method) => `  - ${ANSWERLATTICE_WIDGET_GLOBAL_NAME}.${method}(context)`).join('\n')}
- Optional visitor method:
  - ${ANSWERLATTICE_WIDGET_GLOBAL_NAME}.identify({ id, name, email })
- Optional server-verified visitor method:
  - ${ANSWERLATTICE_WIDGET_GLOBAL_NAME}.identifySigned(token)
  - ${ANSWERLATTICE_WIDGET_GLOBAL_NAME}.clearIdentity()
- Optional support-safe evidence method:
  - ${ANSWERLATTICE_WIDGET_GLOBAL_NAME}.setEvidenceLinks([{ label, url }])

Implementation rules:
1. Find the app root, global layout, document shell, or main client entry point.
2. Install the AnswerLattice script exactly once.
3. Prefer an environment variable for the widget key when the framework supports it.
4. If the packet shows ${ANSWERLATTICE_FULL_WIDGET_KEY_PLACEHOLDER}, replace it with the full one-time al_* value saved from key creation. Do not use the saved key identifier or identifier + ellipsis as the widget key.
5. Do not install the widget separately on each page.
6. Do not expose tenantId, storeId, internal user IDs, billing data, tokens, cookies, secrets, or private account metadata.
7. Pass only safe page context: path, title, feature, workflow, role, and locale.
8. Do not put customer emails, phone numbers, internal account IDs, tenant IDs, store IDs, or private records in page context.
9. If the product has a signed-in customer and the product owner wants requester tracking, call identify with only a support-safe customer id, display name, and email after auth state is known.
10. If support behavior depends on a trusted plan or role, use the Access & Security signing key only from server code and call identifySigned with a short-lived token. Never put the private key in browser code.
11. Attach external diagnostic links only from dashboard-allowed HTTPS hosts, only when useful for the current question, and never treat them as answer truth.
12. Update AnswerLattice context after client-side route changes.
13. Do not create app settings for allowed origins or blocked routes. AnswerLattice dashboard owns those values.
14. If this repository has a central third-party-script guard, use the dashboard-saved blocked routes above to avoid mounting AnswerLattice on sensitive screens.
15. Also avoid routes containing token, invite, reset-password, payment, secret, api-key, or webhook setup screens.
16. Add a short code comment explaining that this is the AnswerLattice v1 widget contract.
17. Run lint, typecheck, and build commands available in the repository.
18. Report changed files, where the script was installed, how route context updates, visitor identity handling if added, test commands run, and assumptions.

Acceptance criteria:
- The app builds.
- The AnswerLattice script is loaded once.
- The widget key is not hardcoded when env vars are available.
- The saved key identifier is not used as the install key.
- Dashboard-owned allowed origins and blocked routes are not duplicated as product settings.
- The widget is absent on blocked routes when a local route guard is present; otherwise AnswerLattice dashboard route rules control runtime visibility.
- Safe page context updates on route changes.
- Optional visitor identity is sent only through identify, never through page context.
- No forbidden identifiers or secrets are sent to AnswerLattice.
- The browser console has no AnswerLattice integration errors.
`);
}

export function renderAnswerlatticeAgentsMd() {
    return normalizeLines(`
# AnswerLattice Integration Instructions

Use this file when installing AnswerLattice into this repository.

## Goal

Install the AnswerLattice Widget Contract v1.

## Contract

- Script URL: ${ANSWERLATTICE_WIDGET_SCRIPT_URL}
- Widget key env var: ${ANSWERLATTICE_ENV_VAR_NAMES.join(', ')}
- Browser global: ${ANSWERLATTICE_WIDGET_GLOBAL_NAME}
- Context methods:
${ANSWERLATTICE_CONTEXT_METHODS.map((method) => `  - ${ANSWERLATTICE_WIDGET_GLOBAL_NAME}.${method}(context)`).join('\n')}

## Safe context only

Allowed context fields:
${formatList(ANSWERLATTICE_ALLOWED_CONTEXT_FIELDS)}

Never send:
${formatList(ANSWERLATTICE_FORBIDDEN_CONTEXT_FIELDS)}

## Installation rules

1. Install the script once in the root layout, document shell, app shell, or main client entry.
2. Do not install per page.
3. Use env vars where supported.
4. Update context after client-side route changes.
5. Respect dashboard-owned blocked routes and avoid sensitive routes when the host app has a central script guard.
6. Run lint, typecheck, and build.
7. Report files changed and verification result.

## Sensitive route examples

${formatList(ANSWERLATTICE_DEFAULT_BLOCKED_ROUTES)}

Also block any route containing token, invite, reset-password, payment, secret, api-key, or webhook setup screens.

## Acceptance criteria

- Build passes.
- Script loads once.
- Dashboard-owned allowed origins and blocked routes are not duplicated as product settings.
- Context updates after navigation.
- No forbidden context fields are sent.
`);
}

export function renderAnswerlatticeClaudeMd() {
    return normalizeLines(`
# AnswerLattice Integration Memory

When asked to install AnswerLattice, follow the AnswerLattice Widget Contract v1. Treat this as project integration context, not as an enforcement layer.

## Install AnswerLattice

Use:
${ANSWERLATTICE_WIDGET_SCRIPT_URL}

Use a widget key from:
${formatList(ANSWERLATTICE_ENV_VAR_NAMES)}

Do not hardcode the key if this codebase supports environment variables.

## Context

Call:

\`\`\`js
window.AnswerlatticeWidget?.setContext({
  path,
  title,
  feature,
  workflow,
  role,
  locale
});
\`\`\`

or:

\`\`\`js
window.AnswerlatticeWidget?.page({
  path,
  title,
  feature,
  workflow,
  role,
  locale
});
\`\`\`

Never send tenant IDs, store IDs, internal user IDs, emails, phone numbers, tokens, cookies, billing data, payment data, or private metadata through page context.

Optional requester tracking:

\`\`\`js
window.AnswerlatticeWidget?.identify?.({
  id: currentUser?.supportCustomerId,
  name: currentUser?.name,
  email: currentUser?.email
});
\`\`\`

Use identify only after the host product has a known signed-in customer. Do not send private account records, billing identifiers, tenant IDs, or store IDs.

## Verification

After implementation:
- run lint
- run typecheck
- run build
- inspect that only one AnswerLattice script is mounted
- confirm blocked routes do not initialize AnswerLattice
`);
}

export function renderAnswerlatticeCursorRule() {
    return normalizeLines(`
---
description: Install and maintain the AnswerLattice support widget
globs:
  - "**/*.{ts,tsx,js,jsx,vue,html}"
alwaysApply: false
---

When installing AnswerLattice, use the AnswerLattice Widget Contract v1.

Script:
${ANSWERLATTICE_WIDGET_SCRIPT_URL}

Install once at the app shell/root layout level.
Use env vars for the widget key.
Pass only canonical v1 safe context for new installs: path, title, feature, workflow, role, locale.
Never send tenantId, storeId, userId, email, phone, token, secret, cookie, billing or payment data.
Do not create product settings for allowed origins or blocked routes; AnswerLattice dashboard owns those values.
Avoid login, signup, checkout, billing, security, token, invite, reset-password, api-key, and webhook setup routes when the host app has a central script guard.
Run lint/typecheck/build after changes.
`);
}

export function renderAnswerlatticeCursorRuleMd() {
    return normalizeLines(`
# AnswerLattice Cursor Rule

Use this persistent project rule when the task mentions AnswerLattice, support widget, help widget, AI support, in-app support, or safe page context.

## Contract

- Script: ${ANSWERLATTICE_WIDGET_SCRIPT_URL}
- Browser global: ${ANSWERLATTICE_WIDGET_GLOBAL_NAME}
- Methods: ${ANSWERLATTICE_CONTEXT_METHODS.join(', ')}

## Rules

- Install once at the app shell/root layout level.
- Use env vars for the al_* widget key.
- Pass the v1 context contract for new installs: path, title, feature, workflow, role, locale.
- Never send tenantId, storeId, userId, email, phone, token, secret, cookie, billing data, payment data, customer records, or private metadata.
- Do not create product settings for allowed origins or blocked routes; AnswerLattice dashboard owns those values.
- Avoid login, signup, checkout, billing, security, token, invite, reset-password, api-key, and webhook setup routes when the host app has a central script guard.
- Run lint/typecheck/build after changes.
`);
}

export function renderAnswerlatticeWindsurfRule() {
    return normalizeLines(`
---
description: AnswerLattice Widget Contract v1
activation: model_decision
---

Use this rule when the task mentions AnswerLattice, support widget, help widget, AI support, in-app support, or safe page context.

Install:
${ANSWERLATTICE_WIDGET_SCRIPT_URL}

Use:
window.AnswerlatticeWidget?.setContext(context)
window.AnswerlatticeWidget?.page(context)

Allowed context:
path, title, feature, workflow, role, locale

Forbidden:
tenantId, storeId, userId, email, phone, token, secret, cookie, JWT, billing data, payment data, private metadata

Acceptance:
script loads once, dashboard route rules are not duplicated as product settings, route context updates, build passes.
`);
}

export function renderAnswerlatticeSkill() {
    return normalizeLines(`
---
name: answerlattice-install
description: Install the AnswerLattice v1 support widget into a client product with safe page context, blocked routes, and verification checks.
---

# AnswerLattice Install Skill

Follow the AnswerLattice Widget Contract v1.

1. Locate the app shell, root layout, document, or main client entry.
2. Install ${ANSWERLATTICE_WIDGET_SCRIPT_URL} once.
3. Use an env var for the al_* widget key.
4. Pass only safe page context.
5. Respect dashboard-owned blocked routes and avoid sensitive routes when the host app has a central script guard.
6. Verify that only one script loads and context updates after navigation.
7. Report changed files and commands run.

Use the packet in \`answerlattice-install-packet.md\` when present.
`);
}

export const ANSWERLATTICE_FRAMEWORK_SNIPPETS: Record<'nextjs' | 'react' | 'vue' | 'plain-html' | 'shopify' | 'webflow', string> = {
    nextjs: normalizeLines(`
'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function AnswerlatticeInstall() {
  const pathname = usePathname() || '/';
  const widgetKey = process.env.NEXT_PUBLIC_ANSWERLATTICE_WIDGET_KEY;

  useEffect(() => {
    if (!widgetKey) return;
    window.AnswerlatticeWidget?.page({
      path: pathname,
      title: document.title,
      feature: pathname.split('/').filter(Boolean)[0] || 'app',
      role: 'member',
      locale: navigator.language || 'en',
    });
  }, [pathname, widgetKey]);

  if (!widgetKey) return null;

  return (
    <Script
      id="answerlattice-widget"
      src="${ANSWERLATTICE_WIDGET_SCRIPT_URL}"
      data-answerlattice-key={widgetKey}
      strategy="afterInteractive"
    />
  );
}
`),
    react: normalizeLines(`
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function loadAnswerlattice(widgetKey) {
  if (document.querySelector('script[data-answerlattice-widget="v1"]')) return;
  const script = document.createElement('script');
  script.src = '${ANSWERLATTICE_WIDGET_SCRIPT_URL}';
  script.async = true;
  script.setAttribute('data-answerlattice-widget', 'v1');
  script.setAttribute('data-answerlattice-key', widgetKey);
  document.head.appendChild(script);
}

export function AnswerlatticeInstall() {
  const location = useLocation();
  const widgetKey = import.meta.env.VITE_ANSWERLATTICE_WIDGET_KEY;

  useEffect(() => {
    if (!widgetKey) return;
    loadAnswerlattice(widgetKey);
    window.AnswerlatticeWidget?.page({
      path: location.pathname,
      title: document.title,
      feature: location.pathname.split('/').filter(Boolean)[0] || 'app',
      role: 'member',
      locale: navigator.language || 'en',
    });
  }, [location.pathname, widgetKey]);

  return null;
}
`),
    vue: normalizeLines(`
import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';

export function useAnswerlatticeInstall(widgetKey: string) {
  const route = useRoute();

  const updateContext = () => {
    if (!widgetKey) return;
    window.AnswerlatticeWidget?.page({
      path: route.path,
      title: document.title,
      feature: route.path.split('/').filter(Boolean)[0] || 'app',
      role: 'member',
      locale: navigator.language || 'en',
    });
  };

  onMounted(() => {
    if (!document.querySelector('script[data-answerlattice-widget="v1"]')) {
      const script = document.createElement('script');
      script.src = '${ANSWERLATTICE_WIDGET_SCRIPT_URL}';
      script.async = true;
      script.setAttribute('data-answerlattice-widget', 'v1');
      script.setAttribute('data-answerlattice-key', widgetKey);
      document.head.appendChild(script);
    }
    updateContext();
  });

  watch(() => route.path, updateContext);
}
`),
    'plain-html': normalizeLines(`
${buildAnswerlatticeWidgetEmbedSnippet()}
<script>
  window.addEventListener('load', function () {
    window.AnswerlatticeWidget?.page({
      path: window.location.pathname,
      title: document.title,
      feature: window.location.pathname.split('/').filter(Boolean)[0] || 'app',
      role: 'member',
      locale: navigator.language || 'en'
    });
  });
</script>
`),
    shopify: normalizeLines(`
<!-- Add once in the theme layout, before </body>. Replace the key with a theme setting or environment-backed value. -->
${buildAnswerlatticeWidgetEmbedSnippet()}
<script>
  window.AnswerlatticeWidget?.page({
    path: window.location.pathname,
    title: document.title,
    feature: 'storefront',
    workflow: 'customer_support',
    role: 'customer',
    locale: Shopify?.locale || navigator.language || 'en'
  });
</script>
`),
    webflow: normalizeLines(`
<!-- Add once in Project Settings > Custom Code > Footer Code. -->
${buildAnswerlatticeWidgetEmbedSnippet()}
<script>
  window.addEventListener('load', function () {
    window.AnswerlatticeWidget?.page({
      path: window.location.pathname,
      title: document.title,
      feature: 'site',
      workflow: 'customer_support',
      role: 'visitor',
      locale: navigator.language || 'en'
    });
  });
</script>
`),
};

export const ANSWERLATTICE_INSTALL_DOCS: AnswerlatticeInstallDoc[] = [
    {
        key: 'overview',
        path: '/install',
        markdownPath: '/install.md',
        title: 'Install AnswerLattice with your AI coding agent',
        navTitle: 'Install overview',
        description: 'Copy the AnswerLattice agent packet, install the v1 widget once, pass safe page context, and verify from the dashboard.',
        sections: [
            {
                heading: 'Start with the agent packet',
                body: 'The product owner does not need to hand-write an integration. Save the widget key, allowed origins, and blocked routes in the AnswerLattice dashboard, then copy the dashboard packet into Codex, Claude Code, Cursor, Windsurf, or another coding agent.',
                bullets: [
                    'Save allowed origins and blocked routes in AnswerLattice first.',
                    'Copy the AI install packet from the dashboard Install Center.',
                    'Review the files changed and verification output.',
                    'Use the AnswerLattice dashboard to confirm runtime status.',
                ],
            },
            {
                heading: 'Stable contract',
                body: 'AnswerLattice freezes the public v1 script URL, browser global, context methods, and safe context fields for the supported install path.',
                code: buildAnswerlatticeWidgetEmbedSnippet(),
            },
            {
                heading: 'Agent downloads',
                bullets: [
                    `${ANSWERLATTICE_SITE_URL}/agents/answerlattice/AGENTS.md`,
                    `${ANSWERLATTICE_SITE_URL}/agents/answerlattice/CLAUDE.md`,
                    `${ANSWERLATTICE_SITE_URL}/agents/answerlattice/cursor/RULE.md`,
                    `${ANSWERLATTICE_SITE_URL}/agents/answerlattice/cursor.mdc`,
                    `${ANSWERLATTICE_SITE_URL}/agents/answerlattice/windsurf.md`,
                    `${ANSWERLATTICE_SITE_URL}/agents/answerlattice/skill/SKILL.md`,
                    `${ANSWERLATTICE_SITE_URL}/agents/answerlattice/answerlattice-agent-kit.zip`,
                ],
            },
        ],
    },
    {
        key: 'ai-agent',
        path: '/install/ai-agent',
        markdownPath: '/install/ai-agent.md',
        title: 'AI agent install packet',
        navTitle: 'AI agent',
        description: 'Copyable prompt and acceptance criteria for coding agents installing AnswerLattice.',
        sections: [
            {
                heading: 'Configure AnswerLattice first',
                bullets: [
                    'Create the al_* widget key in the dashboard and save the full one-time value in the client app environment.',
                    'If the full key was lost, create a replacement key. Saved key identifiers are only for identifying existing keys.',
                    'Save allowed production and staging origins in the dashboard.',
                    'Save blocked routes in the dashboard.',
                    'Then copy the dashboard-generated packet so the agent receives the current setup.',
                ],
            },
            {
                heading: 'Copy this prompt',
                code: renderAnswerlatticeAgentPrompt(),
            },
        ],
    },
    {
        key: 'manual',
        path: '/install/manual',
        markdownPath: '/install/manual.md',
        title: 'Manual widget install',
        navTitle: 'Manual',
        description: 'Human-readable install steps for teams that do not use an AI coding agent.',
        sections: [
            {
                heading: 'Install once',
                body: 'Paste the v1 script in the app shell or shared document. Do not paste it into individual pages.',
                code: buildAnswerlatticeWidgetEmbedSnippet(ANSWERLATTICE_FULL_WIDGET_KEY_PLACEHOLDER),
            },
            {
                heading: 'Send safe page context',
                body: 'Call page() after load and after client-side route changes. Keep context high-level and safe.',
                code: buildAnswerlatticeSafeContextSnippet(),
            },
            {
                heading: 'Verify',
                bullets: [
                    'Open the product on an allowed origin.',
                    'Confirm one AnswerLattice script tag exists.',
                    'Navigate between routes and confirm context changes.',
                    'Visit blocked routes and confirm the widget is absent.',
                    'Return to the AnswerLattice dashboard and check runtime status.',
                ],
            },
        ],
    },
    {
        key: 'nextjs',
        path: '/install/frameworks/nextjs',
        markdownPath: '/install/frameworks/nextjs.md',
        title: 'Next.js install',
        navTitle: 'Next.js',
        description: 'App Router and Pages Router guidance for installing the v1 widget once and updating route context.',
        sections: [
            {
                heading: 'Agent instructions',
                bullets: [
                    'Use app/layout.tsx plus a small client component for App Router.',
                    'Use _app.tsx or the shared shell for Pages Router.',
                    'Use NEXT_PUBLIC_ANSWERLATTICE_WIDGET_KEY for the public al_* key.',
                    'Do not create separate allowed-origin or blocked-route settings in the product; AnswerLattice dashboard owns them.',
                ],
                code: ANSWERLATTICE_FRAMEWORK_SNIPPETS.nextjs,
            },
        ],
    },
    {
        key: 'react',
        path: '/install/frameworks/react',
        markdownPath: '/install/frameworks/react.md',
        title: 'React SPA install',
        navTitle: 'React',
        description: 'React SPA guidance for installing the v1 widget once and updating context on router changes.',
        sections: [{ heading: 'Agent-ready snippet', code: ANSWERLATTICE_FRAMEWORK_SNIPPETS.react }],
    },
    {
        key: 'vue',
        path: '/install/frameworks/vue',
        markdownPath: '/install/frameworks/vue.md',
        title: 'Vue install',
        navTitle: 'Vue',
        description: 'Vue and Nuxt guidance for installing the v1 widget and updating context on route changes.',
        sections: [{ heading: 'Agent-ready snippet', code: ANSWERLATTICE_FRAMEWORK_SNIPPETS.vue }],
    },
    {
        key: 'plain-html',
        path: '/install/frameworks/plain-html',
        markdownPath: '/install/frameworks/plain-html.md',
        title: 'Plain HTML install',
        navTitle: 'Plain HTML',
        description: 'Script-tag install for static or server-rendered products.',
        sections: [{ heading: 'Agent-ready snippet', code: ANSWERLATTICE_FRAMEWORK_SNIPPETS['plain-html'] }],
    },
    {
        key: 'shopify',
        path: '/install/frameworks/shopify',
        markdownPath: '/install/frameworks/shopify.md',
        title: 'Shopify-style install',
        navTitle: 'Shopify',
        description: 'Theme-level script injection guidance for Shopify-style storefronts.',
        sections: [{ heading: 'Agent-ready snippet', code: ANSWERLATTICE_FRAMEWORK_SNIPPETS.shopify }],
    },
    {
        key: 'webflow',
        path: '/install/frameworks/webflow',
        markdownPath: '/install/frameworks/webflow.md',
        title: 'Webflow install',
        navTitle: 'Webflow',
        description: 'Custom-code footer install guidance for Webflow and similar hosted sites.',
        sections: [{ heading: 'Agent-ready snippet', code: ANSWERLATTICE_FRAMEWORK_SNIPPETS.webflow }],
    },
    {
        key: 'contracts',
        path: '/install/contracts.md',
        markdownPath: '/install/contracts.md',
        title: 'AnswerLattice Widget Contract v1',
        navTitle: 'Contracts',
        description: 'Stable script URL, browser API, context schema, verification semantics, and compatibility policy.',
        sections: [
            {
                heading: 'Stability policy',
                body: 'AnswerLattice will keep the Widget Contract v1 backward-compatible for at least 36 months from general availability.',
                bullets: [
                    `${ANSWERLATTICE_WIDGET_SCRIPT_URL}`,
                    'al_* widget key format',
                    `${ANSWERLATTICE_WIDGET_GLOBAL_NAME} global`,
                    ...ANSWERLATTICE_CONTEXT_METHODS.map((method) => `${method}(context)`),
                    'identify(visitor)',
                    'identifySigned(token)',
                    'clearIdentity()',
                    'setEvidenceLinks(links)',
                    'safe context field names',
                    'blocked route behavior',
                    'install verification semantics',
                    'Markdown docs URLs',
                    '/llms.txt URL',
                ],
            },
            {
                heading: 'Widget script caching',
                body: 'The v1 script URL is stable and backward-compatible, but not immutable. AnswerLattice can ship compatible bug fixes without requiring clients to change install code.',
                bullets: [
                    `Recommended header: Cache-Control: ${ANSWERLATTICE_WIDGET_SCRIPT_CACHE_CONTROL}`,
                    'Do not use long immutable caching on /widget/v1/answerlattice-widget.js.',
                    'If content-addressed builds are added later, generated install docs still point to the stable v1 URL.',
                ],
            },
            {
                heading: 'May change without breaking clients',
                bullets: [
                    'internal widget implementation',
                    'UI styling',
                    'dashboard layout',
                    'agent-specific prompt wording',
                    'generated examples',
                    'performance internals',
                    'cache implementation',
                ],
            },
            {
                heading: 'Dashboard-owned settings',
                bullets: [
                    'Allowed origins are saved in the AnswerLattice dashboard and enforced by AnswerLattice runtime APIs.',
                    'Blocked routes are saved in the AnswerLattice dashboard and returned through widget runtime config.',
                    'Client products should not create duplicate owner settings for origins or blocked routes.',
                ],
            },
            {
                heading: 'Will not be accepted from browser context',
                bullets: [...ANSWERLATTICE_FORBIDDEN_CONTEXT_FIELDS],
            },
        ],
    },
];

export const ANSWERLATTICE_PUBLIC_DOC_ROUTES = ANSWERLATTICE_INSTALL_DOCS.flatMap((doc) => (
    doc.key === 'contracts' ? [doc.markdownPath] : [doc.path, doc.markdownPath]
)) as string[];

const DOC_BY_KEY = new Map(ANSWERLATTICE_INSTALL_DOCS.map((doc) => [doc.key, doc]));

export function getAnswerlatticeInstallDoc(key: AnswerlatticeInstallDocKey) {
    return DOC_BY_KEY.get(key);
}

export function getAnswerlatticeInstallDocsForNavigation() {
    return ANSWERLATTICE_INSTALL_DOCS.filter((doc) => doc.key !== 'overview' && doc.key !== 'contracts');
}

export function renderAnswerlatticeMarkdownDoc(key: AnswerlatticeInstallDocKey, input?: AnswerlatticeAgentPacketInput) {
    if (key === 'ai-agent' && input) {
        const doc = getAnswerlatticeInstallDoc(key);
        if (!doc) return '';
        return normalizeLines(`
# ${doc.title}

> ${doc.description}

## Configure AnswerLattice first

- Create the al_* widget key in the dashboard and save the full one-time value.
- Save allowed origins in the dashboard.
- Save blocked routes in the dashboard.
- Copy the dashboard-generated packet when you want current workspace values included.

## Copy this prompt

\`\`\`md
${renderAnswerlatticeAgentPrompt(input)}
\`\`\`
`);
    }

    const doc = getAnswerlatticeInstallDoc(key);
    if (!doc) return '';
    const sections = doc.sections.map((section) => {
        const lines = [`## ${section.heading}`];
        if (section.body) lines.push('', section.body);
        if (section.bullets?.length) lines.push('', formatList(section.bullets));
        if (section.code) lines.push('', '```', section.code, '```');
        return lines.join('\n');
    }).join('\n\n');

    const links = key === 'overview'
        ? [
            '## Start here',
            '',
            ...getAnswerlatticeInstallDocsForNavigation().map((item) => `- [${item.title}](${ANSWERLATTICE_SITE_URL}${item.markdownPath}): ${item.description}`),
            '',
        ].join('\n')
        : '';

    return normalizeLines(`
# ${doc.title}

> ${doc.description}

${links}${sections}

## Public API note

The public API may be account-gated. For most clients, install the AnswerLattice widget first.
`);
}

export function renderAnswerlatticeLlmsTxt() {
    return normalizeLines(`
# AnswerLattice

> AnswerLattice is governed answer infrastructure for SaaS products. These docs help coding agents install the AnswerLattice widget, pass safe page context, respect dashboard route rules, and verify the integration.

## Start here

- [Install AnswerLattice with an AI coding agent](${ANSWERLATTICE_SITE_URL}/install/ai-agent.md): Copyable install packet for Codex, Claude Code, Cursor, Windsurf, and other coding agents.
- [Pre-Onboarding Kit](${ANSWERLATTICE_SITE_URL}/pre-onboarding.md): Master prompt for preparing available product sources, multi-product repo boundaries, website links, docs, owner notes, policies, support questions, and screenshot rules before AnswerLattice onboarding.
- [Pre-Onboarding Owner Guide](${ANSWERLATTICE_SITE_URL}/pre-onboarding/owner-guide.md): End-to-end owner checklist for using the prompt and reviewing generated inputs.
- [Pre-Onboarding Agent Guide](${ANSWERLATTICE_SITE_URL}/pre-onboarding/agent-guide.md): Operating rules for AI coding agents preparing AnswerLattice input packages.
- [Founder Support Launch Kit](${ANSWERLATTICE_SITE_URL}/resources/founder-launch-kit): Seven-step path from source preparation through ten priority questions, governed tests, widget verification, and explicit resolution evidence.
- Tool-specific pre-onboarding wrappers are available for Codex, Cursor, Claude Code, Replit, and Lovable under "/pre-onboarding/{tool}.md". They embed the same master safety and owner-review contract and are not product integrations.
- [AnswerLattice Widget Contract v1](${ANSWERLATTICE_SITE_URL}/install/contracts.md): Stable script URL, browser API, safe context schema, and dashboard-owned route settings.
- [Resources](${ANSWERLATTICE_SITE_URL}/resources): Launch setup, pre-onboarding, widget verification, support control, pricing, and runtime-safety guides.
- [Developers](${ANSWERLATTICE_SITE_URL}/developers): Widget install, safe page context, optional signed visitor context, bounded evidence links, verification, framework quickstarts, and agent install packets.
- [Verified visitor context](${ANSWERLATTICE_SITE_URL}/developers/verified-visitor-context): Server-side signing, identity reset, evidence-host controls, and fail-open support availability.
- [Comparisons](${ANSWERLATTICE_SITE_URL}/comparisons): Category comparisons with scoped claims and no unsupported vendor rankings.
- [Manual install](${ANSWERLATTICE_SITE_URL}/install/manual.md): Human-readable script install.
- [Next.js install](${ANSWERLATTICE_SITE_URL}/install/frameworks/nextjs.md): App Router and Pages Router instructions.
- [React install](${ANSWERLATTICE_SITE_URL}/install/frameworks/react.md): React SPA install and route-change context updates.
- [Vue install](${ANSWERLATTICE_SITE_URL}/install/frameworks/vue.md): Vue Router install and context updates.
- [Plain HTML install](${ANSWERLATTICE_SITE_URL}/install/frameworks/plain-html.md): Script-tag install.
- [Agent kit](${ANSWERLATTICE_SITE_URL}/agents/answerlattice/answerlattice-agent-kit.zip): Downloadable generated instructions for coding agents.

## Stable contract

Use:
${ANSWERLATTICE_WIDGET_SCRIPT_URL}

Do not send:
tenantId, storeId, userId, email, phone, tokens, cookies, secrets, billing data, payment data, or private account metadata.

## Public API note

The public API may be account-gated. For most clients, install the AnswerLattice widget first.
`);
}

export function renderAnswerlatticeLlmsFullTxt() {
    return normalizeLines(`
# AnswerLattice - Full Agent Context

> AnswerLattice is the Governed Answer Infrastructure for SaaS Support. This file expands AnswerLattice public product boundaries and the agent install layer for coding agents.

## Product boundary

- AnswerLattice keeps support knowledge, in-app approved answers, hosted help, tickets, feedback review, Support Board follow-up, releases, and support-gap review under owner-approved control.
- AnswerLattice is not a helpdesk replacement, chatbot autopilot, documentation CMS, compliance platform, autonomous publisher, or client-product code owner.
- Public agents may read these docs, route users to official AnswerLattice pages, and install the widget from the v1 contract.
- Public agents must not mutate customer workspaces, approved answers, tickets, widget settings, billing, private knowledge, or account data.
- Public API and MCP surfaces may be account-gated. Use the widget install path first unless AnswerLattice explicitly enables API access for the account.

## Primary public routes

- ${ANSWERLATTICE_SITE_URL}/
- ${ANSWERLATTICE_SITE_URL}/product
- ${ANSWERLATTICE_SITE_URL}/product/page-aware-widget
- ${ANSWERLATTICE_SITE_URL}/product/support-control
- ${ANSWERLATTICE_SITE_URL}/product/knowledge-governance
- ${ANSWERLATTICE_SITE_URL}/demo
- ${ANSWERLATTICE_SITE_URL}/pre-onboarding
- ${ANSWERLATTICE_SITE_URL}/pre-onboarding.md
- ${ANSWERLATTICE_SITE_URL}/pre-onboarding/guide
- ${ANSWERLATTICE_SITE_URL}/pre-onboarding/owner-guide.md
- ${ANSWERLATTICE_SITE_URL}/pre-onboarding/agent-guide.md
- ${ANSWERLATTICE_SITE_URL}/pre-onboarding/codex.md
- ${ANSWERLATTICE_SITE_URL}/pre-onboarding/cursor.md
- ${ANSWERLATTICE_SITE_URL}/pre-onboarding/claude-code.md
- ${ANSWERLATTICE_SITE_URL}/pre-onboarding/replit.md
- ${ANSWERLATTICE_SITE_URL}/pre-onboarding/lovable.md
- ${ANSWERLATTICE_SITE_URL}/resources/founder-launch-kit
- ${ANSWERLATTICE_SITE_URL}/install
- ${ANSWERLATTICE_SITE_URL}/install/ai-agent
- ${ANSWERLATTICE_SITE_URL}/install/contracts.md
- ${ANSWERLATTICE_SITE_URL}/developers
- ${ANSWERLATTICE_SITE_URL}/developers/safe-page-context
- ${ANSWERLATTICE_SITE_URL}/developers/widget-verification
- ${ANSWERLATTICE_SITE_URL}/developers/verified-visitor-context
- ${ANSWERLATTICE_SITE_URL}/comparisons
- ${ANSWERLATTICE_SITE_URL}/comparisons/answerlattice-vs-chatbots
- ${ANSWERLATTICE_SITE_URL}/comparisons/answerlattice-vs-helpdesks
- ${ANSWERLATTICE_SITE_URL}/comparisons/answerlattice-vs-knowledge-bases
- ${ANSWERLATTICE_SITE_URL}/pricing
- ${ANSWERLATTICE_SITE_URL}/resources
${ANSWERLATTICE_RESOURCE_ARTICLES.map((article) => `- ${ANSWERLATTICE_SITE_URL}${article.path}`).join('\n')}
- ${ANSWERLATTICE_SITE_URL}/security
- ${ANSWERLATTICE_SITE_URL}/faq

## Agent install layer

${ANSWERLATTICE_INSTALL_DOCS.map((doc) => renderAnswerlatticeMarkdownDoc(doc.key)).join('\n\n---\n\n')}

---

# AGENTS.md

${renderAnswerlatticeAgentsMd()}

---

# CLAUDE.md

${renderAnswerlatticeClaudeMd()}
`);
}

export function buildAnswerlatticeAgentPacketJson(input: AnswerlatticeAgentPacketInput = {}) {
    return {
        contractVersion: ANSWERLATTICE_INSTALL_CONTRACT_VERSION,
        contextContractVersion: ANSWERLATTICE_CONTEXT_CONTRACT_VERSION,
        verificationContractVersion: ANSWERLATTICE_VERIFICATION_CONTRACT_VERSION,
        widgetKey: getAnswerlatticeWidgetKeyForPacket(input),
        rawWidgetKeyIncluded: Boolean(input.includeRawWidgetKey && input.widgetKey),
        widgetKeyEnvPlaceholder: 'ANSWERLATTICE_WIDGET_KEY',
        widgetKeyPrefix: input.widgetKeyPrefix || null,
        scriptUrl: ANSWERLATTICE_WIDGET_SCRIPT_URL,
        dashboardOwnsAllowedOrigins: true,
        dashboardOwnsBlockedRoutes: true,
        allowedOrigins: getAnswerlatticeAllowedOriginsForPacket(input),
        blockedRoutes: getAnswerlatticeBlockedRoutesForPacket(input),
        contextSchema: {
            path: 'string',
            title: 'string optional',
            feature: 'string optional',
            workflow: 'string optional',
            role: 'string optional',
            locale: 'string optional',
        },
        forbiddenContextFields: [...ANSWERLATTICE_FORBIDDEN_CONTEXT_FIELDS],
    };
}

export function buildAnswerlatticeAgentKitFiles(input: AnswerlatticeAgentPacketInput = {}) {
    return {
        'README.md': renderAnswerlatticeMarkdownDoc('overview'),
        'answerlattice-install-packet.md': renderAnswerlatticeMarkdownDoc('ai-agent', input),
        'answerlattice-widget-contract-v1.md': renderAnswerlatticeMarkdownDoc('contracts'),
        'answerlattice-context-contract-v1.md': normalizeLines(`
# AnswerLattice Context Contract v1

Allowed context fields:
${formatList(ANSWERLATTICE_ALLOWED_CONTEXT_FIELDS)}

Never send:
${formatList(ANSWERLATTICE_FORBIDDEN_CONTEXT_FIELDS)}

Allowed origins and blocked routes are dashboard-owned AnswerLattice settings. Do not create duplicate product settings for them.

Requester identity is not page context. If the host product has a signed-in customer and wants owner-visible requester tracking, call:

\`\`\`js
window.AnswerlatticeWidget?.identify?.({ id, name, email });
\`\`\`

Do not include tenant IDs, store IDs, private account records, billing IDs, tokens, or phone numbers in identify.

For trusted plan, role, locale, or requester claims, create the short-lived EdDSA token on the host server and call:

\`\`\`js
window.AnswerlatticeWidget?.identifySigned?.(token);
\`\`\`

Keep the private signing key in server-only secret storage. Call \`clearIdentity()\` when the host user signs out. Configure exact evidence hosts in AnswerLattice before calling \`setEvidenceLinks([{ label, url }])\`.
`),
        'answerlattice-verification-contract-v1.md': normalizeLines(`
# AnswerLattice Verification Contract v1

- Confirm ${ANSWERLATTICE_WIDGET_SCRIPT_URL} loads once.
- Confirm the widget key is not hardcoded when env vars are available.
- Confirm route context updates after client-side navigation.
- Confirm no forbidden context fields are sent.
- Confirm the AnswerLattice dashboard shows the latest runtime status after testing from an allowed origin.
`),
        'AGENTS.md': renderAnswerlatticeAgentsMd(),
        'CLAUDE.md': renderAnswerlatticeClaudeMd(),
        '.cursor/rules/answerlattice/RULE.md': renderAnswerlatticeCursorRuleMd(),
        '.cursor/rules/answerlattice.mdc': renderAnswerlatticeCursorRule(),
        '.windsurf/rules/answerlattice.md': renderAnswerlatticeWindsurfRule(),
        '.windsurf/workflows/install-answerlattice.md': renderAnswerlatticeAgentPrompt(input),
        'skills/answerlattice-install/SKILL.md': renderAnswerlatticeSkill(),
        'tests/answerlattice-widget-smoke.spec.ts': normalizeLines(`
import { test, expect } from '@playwright/test';

test('AnswerLattice widget loads once and exposes the browser contract', async ({ page }) => {
  await page.goto(process.env.ANSWERLATTICE_TEST_URL || 'http://localhost:3000/');
  await expect(page.locator('script[src*="/widget/v1/answerlattice-widget.js"]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => typeof window.AnswerlatticeWidget?.page)).toBe('function');
});
`),
        'examples/nextjs-app-router.md': ANSWERLATTICE_FRAMEWORK_SNIPPETS.nextjs,
        'examples/react-spa.md': ANSWERLATTICE_FRAMEWORK_SNIPPETS.react,
        'examples/vue.md': ANSWERLATTICE_FRAMEWORK_SNIPPETS.vue,
        'examples/plain-html.md': ANSWERLATTICE_FRAMEWORK_SNIPPETS['plain-html'],
        'examples/shopify.md': ANSWERLATTICE_FRAMEWORK_SNIPPETS.shopify,
        'examples/webflow.md': ANSWERLATTICE_FRAMEWORK_SNIPPETS.webflow,
        'packet.json': JSON.stringify(buildAnswerlatticeAgentPacketJson(input), null, 2),
    };
}
