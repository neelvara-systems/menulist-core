export {
    CANONICA_AGENT_PACKET_CONTRACT_VERSION,
    CANONICA_CONTEXT_METHODS,
    CANONICA_CONTEXT_CONTRACT_VERSION,
    CANONICA_INSTALL_CONTRACT_VERSION,
    CANONICA_MARKDOWN_DOCS_CONTRACT_VERSION,
    CANONICA_SITE_URL,
    CANONICA_VERIFICATION_CONTRACT_VERSION,
    CANONICA_WIDGET_COMPATIBILITY_URLS,
    CANONICA_WIDGET_CONTRACT_VERSION,
    CANONICA_WIDGET_GLOBAL_NAME,
    CANONICA_WIDGET_SCRIPT_CACHE_CONTROL,
    CANONICA_WIDGET_LATEST_SCRIPT_URL,
    CANONICA_WIDGET_LEGACY_SCRIPT_URL,
    CANONICA_WIDGET_SCRIPT_URL,
    CANONICA_WIDGET_SCRIPT_VERSION,
} from './constants';

import {
    CANONICA_CONTEXT_CONTRACT_VERSION,
    CANONICA_CONTEXT_METHODS,
    CANONICA_INSTALL_CONTRACT_VERSION,
    CANONICA_SITE_URL,
    CANONICA_VERIFICATION_CONTRACT_VERSION,
    CANONICA_WIDGET_COMPATIBILITY_URLS,
    CANONICA_WIDGET_GLOBAL_NAME,
    CANONICA_WIDGET_SCRIPT_CACHE_CONTROL,
    CANONICA_WIDGET_LEGACY_SCRIPT_URL,
    CANONICA_WIDGET_SCRIPT_URL,
} from './constants';

export type CanonicaInstallDocKey =
    | 'overview'
    | 'ai-agent'
    | 'manual'
    | 'nextjs'
    | 'react'
    | 'vue'
    | 'plain-html'
    | 'shopify'
    | 'webflow'
    | 'verify'
    | 'security'
    | 'contracts'
    | 'changelog';

export type CanonicaAgentPacketInput = {
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

export type CanonicaInstallDocSection = {
    heading: string;
    body?: string;
    bullets?: string[];
    code?: string;
};

export type CanonicaInstallDoc = {
    key: CanonicaInstallDocKey;
    path: string;
    markdownPath: string;
    title: string;
    navTitle: string;
    description: string;
    sections: CanonicaInstallDocSection[];
};

export const CANONICA_ALLOWED_CONTEXT_FIELDS = [
    'path',
    'title',
    'feature',
    'workflow',
    'role',
    'locale',
] as const;

export const CANONICA_SAFE_CONTEXT_FIELDS = CANONICA_ALLOWED_CONTEXT_FIELDS;

export const CANONICA_COMPAT_CONTEXT_FIELDS = [
    'contextKey',
    'page',
    'userRole',
    'plan',
    'entityHints',
] as const;

export const CANONICA_LEGACY_CONTEXT_FIELD_MAP = {
    contextKey: 'workflow or internal routing hint',
    page: 'title or path',
    userRole: 'role',
    plan: 'public plan label only',
    entityHints: 'public slugs, tags, or hints only',
} as const;

export const CANONICA_FORBIDDEN_CONTEXT_FIELDS = [
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

export const CANONICA_DEFAULT_BLOCKED_ROUTES = [
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

export const CANONICA_ENV_VAR_NAMES = [
    'CANONICA_WIDGET_KEY',
    'NEXT_PUBLIC_CANONICA_WIDGET_KEY',
    'VITE_CANONICA_WIDGET_KEY',
    'NUXT_PUBLIC_CANONICA_WIDGET_KEY',
] as const;

export const CANONICA_AGENT_FILE_TARGETS = [
    'AGENTS.md',
    'CLAUDE.md',
    '.cursor/rules/canonica/RULE.md',
    '.cursor/rules/canonica.mdc',
    '.windsurf/rules/canonica.md',
    '.windsurf/workflows/install-canonica.md',
    'skills/canonica-install/SKILL.md',
] as const;

const formatList = (values: readonly string[], fallback: readonly string[] = []) => {
    const items = values.length > 0 ? values : fallback;
    return items.map((item) => `- ${item}`).join('\n');
};

const normalizeLines = (value: string) => value.trim().replace(/\n{3,}/g, '\n\n');

export function getCanonicaWidgetKeyForPacket(input: CanonicaAgentPacketInput = {}) {
    if (input.includeRawWidgetKey && input.widgetKey?.trim()) return input.widgetKey.trim();
    if (input.widgetKeyPrefix?.trim()) return `${input.widgetKeyPrefix.trim()}...`;
    if (input.widgetKey?.trim()) {
        const value = input.widgetKey.trim();
        return `${value.slice(0, Math.min(value.length, 10))}...`;
    }
    return '{{CANONICA_WIDGET_KEY}}';
}

export function renderCanonicaLegacyContextCompatibilityNotes() {
    return normalizeLines(`
Legacy compatibility fields are accepted by the runtime for existing integrations but are not the canonical v1 contract:
- contextKey -> normalized to workflow or an internal routing hint.
- page -> normalized to title or path.
- userRole -> normalized to role.
- plan -> accepted only as a public plan label, never a subscription ID, billing ID, entitlement object, or pricing metadata.
- entityHints -> accepted only as public slugs, tags, or hints, never tenant IDs, store IDs, internal entity IDs, user IDs, emails, or customer records.
`);
}

export function getCanonicaAllowedOriginsForPacket(input: CanonicaAgentPacketInput = {}) {
    const configured = Array.isArray(input.allowedOrigins) ? input.allowedOrigins.filter(Boolean) : [];
    const fallback = [
        input.productionOrigin || '{{PRODUCTION_ORIGIN}}',
        input.stagingOrigin || '{{STAGING_ORIGIN}}',
    ].filter(Boolean) as string[];
    return configured.length > 0 ? configured : fallback;
}

export function getCanonicaBlockedRoutesForPacket(input: CanonicaAgentPacketInput = {}) {
    const configured = Array.isArray(input.blockedRoutes) ? input.blockedRoutes.filter(Boolean) : [];
    return configured.length > 0 ? configured : [...CANONICA_DEFAULT_BLOCKED_ROUTES];
}

export function buildCanonicaWidgetEmbedSnippet(widgetKey = '{{CANONICA_WIDGET_KEY}}') {
    return [
        '<script',
        `  src="${CANONICA_WIDGET_SCRIPT_URL}"`,
        `  data-canonica-key="${widgetKey}"`,
        '  async',
        '></script>',
    ].join('\n');
}

export function buildCanonicaSafeContextSnippet() {
    return [
        'window.CanonicaWidget?.page({',
        "  path: window.location.pathname,",
        "  title: document.title,",
        "  feature: 'billing',",
        "  workflow: 'manage_subscription',",
        "  role: 'owner',",
        "  locale: 'en',",
        '});',
    ].join('\n');
}

export function renderCanonicaAgentPrompt(input: CanonicaAgentPacketInput = {}) {
    const widgetKey = getCanonicaWidgetKeyForPacket(input);
    const allowedOrigins = getCanonicaAllowedOriginsForPacket(input);
    const blockedRoutes = getCanonicaBlockedRoutesForPacket(input);
    const framework = input.framework || '{{FRAMEWORK}}';
    const router = input.router || '{{ROUTER}}';
    const entryPoints = input.supportEntryPoints?.length ? input.supportEntryPoints : ['global widget', 'help button', 'sidebar', 'settings page'];

    return normalizeLines(`
You are integrating Canonica into this product.

Goal:
Install the Canonica v1 support widget, pass safe page context, block sensitive routes, and prove the installation works.

Use these Canonica values:
- Widget key: ${widgetKey}
- Allowed origins:
${formatList(allowedOrigins)}
- Framework: ${framework}
- Router: ${router}
- Support entry points:
${formatList(entryPoints)}

Canonical install contract:
- Contract version: ${CANONICA_INSTALL_CONTRACT_VERSION}
- Script URL: ${CANONICA_WIDGET_SCRIPT_URL}
- Browser global: ${CANONICA_WIDGET_GLOBAL_NAME}
- Context methods:
${CANONICA_CONTEXT_METHODS.map((method) => `  - ${CANONICA_WIDGET_GLOBAL_NAME}.${method}(context)`).join('\n')}

Implementation rules:
1. Find the app root, global layout, document shell, or main client entry point.
2. Install the Canonica script exactly once.
3. Prefer an environment variable for the widget key when the framework supports it.
4. Do not install the widget separately on each page.
5. Do not expose tenantId, storeId, internal user IDs, emails, billing data, tokens, cookies, secrets, or private account metadata.
6. Pass only safe page context: path, title, feature, workflow, role, and locale.
7. Treat legacy context fields as compatibility-only. Prefer canonical v1 fields for new code.
8. If legacy fields already exist, only pass sanitized public labels:
   - contextKey: routing hint only
   - page: public page label or path hint only
   - userRole: public role label only
   - plan: public plan label only, never subscription or billing metadata
   - entityHints: public slugs/tags/hints only, never internal IDs or customer records
9. Update Canonica context after client-side route changes.
10. Do not show or initialize Canonica on blocked routes:
${formatList(blockedRoutes)}
11. Also block routes containing token, invite, reset-password, payment, secret, api-key, or webhook setup screens.
12. Add a short code comment explaining that this is the Canonica v1 widget contract.
13. Run lint, typecheck, and build commands available in the repository.
14. Report changed files, where the script was installed, how route context updates, test commands run, and assumptions.

Acceptance criteria:
- The app builds.
- The Canonica script is loaded once.
- The widget key is not hardcoded when env vars are available.
- The widget is absent on blocked routes.
- Safe page context updates on route changes.
- No forbidden identifiers or secrets are sent to Canonica.
- The browser console has no Canonica integration errors.
`);
}

export function renderCanonicaAgentsMd() {
    return normalizeLines(`
# Canonica Integration Instructions

Use this file when installing Canonica into this repository.

## Goal

Install the Canonica Widget Contract v1.

## Contract

- Script URL: ${CANONICA_WIDGET_SCRIPT_URL}
- Widget key env var: ${CANONICA_ENV_VAR_NAMES.join(', ')}
- Browser global: ${CANONICA_WIDGET_GLOBAL_NAME}
- Context methods:
${CANONICA_CONTEXT_METHODS.map((method) => `  - ${CANONICA_WIDGET_GLOBAL_NAME}.${method}(context)`).join('\n')}

## Safe context only

Allowed context fields:
${formatList(CANONICA_ALLOWED_CONTEXT_FIELDS)}

## Legacy compatibility only

${renderCanonicaLegacyContextCompatibilityNotes()}

Never send:
${formatList(CANONICA_FORBIDDEN_CONTEXT_FIELDS)}

## Installation rules

1. Install the script once in the root layout, document shell, app shell, or main client entry.
2. Do not install per page.
3. Use env vars where supported.
4. Update context after client-side route changes.
5. Block Canonica on sensitive routes.
6. Run lint, typecheck, and build.
7. Report files changed and verification result.

## Blocked route defaults

${formatList(CANONICA_DEFAULT_BLOCKED_ROUTES)}

Also block any route containing token, invite, reset-password, payment, secret, api-key, or webhook setup screens.

## Acceptance criteria

- Build passes.
- Script loads once.
- Widget is absent on blocked routes.
- Context updates after navigation.
- No forbidden context fields are sent.
`);
}

export function renderCanonicaClaudeMd() {
    return normalizeLines(`
# Canonica Integration Memory

When asked to install Canonica, follow the Canonica Widget Contract v1. Treat this as project integration context, not as an enforcement layer.

## Install Canonica

Use:
${CANONICA_WIDGET_SCRIPT_URL}

Use a widget key from:
${formatList(CANONICA_ENV_VAR_NAMES)}

Do not hardcode the key if this codebase supports environment variables.

## Context

Call:

\`\`\`js
window.CanonicaWidget?.setContext({
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
window.CanonicaWidget?.page({
  path,
  title,
  feature,
  workflow,
  role,
  locale
});
\`\`\`

Never send tenant IDs, store IDs, internal user IDs, emails, tokens, cookies, billing data, payment data, or private metadata.

## Verification

After implementation:
- run lint
- run typecheck
- run build
- inspect that only one Canonica script is mounted
- confirm blocked routes do not initialize Canonica
`);
}

export function renderCanonicaCursorRule() {
    return normalizeLines(`
---
description: Install and maintain the Canonica support widget
globs:
  - "**/*.{ts,tsx,js,jsx,vue,html}"
alwaysApply: false
---

When installing Canonica, use the Canonica Widget Contract v1.

Script:
${CANONICA_WIDGET_SCRIPT_URL}

Install once at the app shell/root layout level.
Use env vars for the widget key.
Pass only canonical v1 safe context for new installs: path, title, feature, workflow, role, locale.
Treat contextKey, page, userRole, plan, and entityHints as compatibility-only. Do not add them to new installs unless the app already uses them as public labels.
Never send tenantId, storeId, userId, email, phone, token, secret, cookie, billing or payment data.
Block login, signup, checkout, billing, security, token, invite, reset-password, api-key, and webhook setup routes.
Run lint/typecheck/build after changes.
`);
}

export function renderCanonicaCursorRuleMd() {
    return normalizeLines(`
# Canonica Cursor Rule

Use this persistent project rule when the task mentions Canonica, support widget, help widget, AI support, or page-aware support.

## Contract

- Script: ${CANONICA_WIDGET_SCRIPT_URL}
- Browser global: ${CANONICA_WIDGET_GLOBAL_NAME}
- Methods: ${CANONICA_CONTEXT_METHODS.join(', ')}

## Rules

- Install once at the app shell/root layout level.
- Use env vars for the cn_* widget key.
- Pass canonical v1 context for new installs: path, title, feature, workflow, role, locale.
- Treat contextKey, page, userRole, plan, and entityHints as compatibility-only public labels.
- Never send tenantId, storeId, userId, email, phone, token, secret, cookie, billing data, payment data, customer records, or private metadata.
- Block login, signup, checkout, billing, security, token, invite, reset-password, api-key, and webhook setup routes.
- Run lint/typecheck/build after changes.
`);
}

export function renderCanonicaWindsurfRule() {
    return normalizeLines(`
---
description: Canonica Widget Contract v1
activation: model_decision
---

Use this rule when the task mentions Canonica, support widget, help widget, AI support, or page-aware support.

Install:
${CANONICA_WIDGET_SCRIPT_URL}

Use:
window.CanonicaWidget?.setContext(context)
window.CanonicaWidget?.page(context)

Allowed context:
path, title, feature, workflow, role, locale

Legacy compatibility only:
contextKey, page, userRole, plan, entityHints may be accepted after sanitization, but new installs should use canonical fields.

Forbidden:
tenantId, storeId, userId, email, phone, token, secret, cookie, JWT, billing data, payment data, private metadata

Acceptance:
script loads once, blocked routes excluded, route context updates, build passes.
`);
}

export function renderCanonicaSkill() {
    return normalizeLines(`
---
name: canonica-install
description: Install the Canonica v1 support widget into a client product with safe page context, blocked routes, and verification checks.
---

# Canonica Install Skill

Follow the Canonica Widget Contract v1.

1. Locate the app shell, root layout, document, or main client entry.
2. Install ${CANONICA_WIDGET_SCRIPT_URL} once.
3. Use an env var for the cn_* widget key.
4. Pass only safe page context.
5. Block sensitive routes.
6. Verify that only one script loads and context updates after navigation.
7. Report changed files and commands run.

Use the packet in \`canonica-install-packet.md\` when present.
`);
}

export const CANONICA_FRAMEWORK_SNIPPETS: Record<'nextjs' | 'react' | 'vue' | 'plain-html' | 'shopify' | 'webflow', string> = {
    nextjs: normalizeLines(`
'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const blockedRoutes = ['/login', '/signup', '/checkout', '/billing', '/admin/security'];

function isBlocked(pathname: string) {
  return blockedRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

export function CanonicaInstall() {
  const pathname = usePathname() || '/';
  const widgetKey = process.env.NEXT_PUBLIC_CANONICA_WIDGET_KEY;

  useEffect(() => {
    if (!widgetKey || isBlocked(pathname)) return;
    window.CanonicaWidget?.page({
      path: pathname,
      title: document.title,
      feature: pathname.split('/').filter(Boolean)[0] || 'app',
      role: 'member',
      locale: navigator.language || 'en',
    });
  }, [pathname, widgetKey]);

  if (!widgetKey || isBlocked(pathname)) return null;

  return (
    <Script
      id="canonica-widget"
      src="${CANONICA_WIDGET_SCRIPT_URL}"
      data-canonica-key={widgetKey}
      strategy="afterInteractive"
    />
  );
}
`),
    react: normalizeLines(`
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const blockedRoutes = ['/login', '/signup', '/checkout', '/billing', '/admin/security'];

function loadCanonica(widgetKey) {
  if (document.querySelector('script[data-canonica-widget="v1"]')) return;
  const script = document.createElement('script');
  script.src = '${CANONICA_WIDGET_SCRIPT_URL}';
  script.async = true;
  script.setAttribute('data-canonica-widget', 'v1');
  script.setAttribute('data-canonica-key', widgetKey);
  document.head.appendChild(script);
}

export function CanonicaInstall() {
  const location = useLocation();
  const widgetKey = import.meta.env.VITE_CANONICA_WIDGET_KEY;
  const blocked = blockedRoutes.some((route) => location.pathname === route || location.pathname.startsWith(route + '/'));

  useEffect(() => {
    if (!widgetKey || blocked) return;
    loadCanonica(widgetKey);
    window.CanonicaWidget?.page({
      path: location.pathname,
      title: document.title,
      feature: location.pathname.split('/').filter(Boolean)[0] || 'app',
      role: 'member',
      locale: navigator.language || 'en',
    });
  }, [blocked, location.pathname, widgetKey]);

  return null;
}
`),
    vue: normalizeLines(`
import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';

const blockedRoutes = ['/login', '/signup', '/checkout', '/billing', '/admin/security'];

export function useCanonicaInstall(widgetKey: string) {
  const route = useRoute();
  const isBlocked = () => blockedRoutes.some((item) => route.path === item || route.path.startsWith(item + '/'));

  const updateContext = () => {
    if (!widgetKey || isBlocked()) return;
    window.CanonicaWidget?.page({
      path: route.path,
      title: document.title,
      feature: route.path.split('/').filter(Boolean)[0] || 'app',
      role: 'member',
      locale: navigator.language || 'en',
    });
  };

  onMounted(() => {
    if (!document.querySelector('script[data-canonica-widget="v1"]')) {
      const script = document.createElement('script');
      script.src = '${CANONICA_WIDGET_SCRIPT_URL}';
      script.async = true;
      script.setAttribute('data-canonica-widget', 'v1');
      script.setAttribute('data-canonica-key', widgetKey);
      document.head.appendChild(script);
    }
    updateContext();
  });

  watch(() => route.path, updateContext);
}
`),
    'plain-html': normalizeLines(`
${buildCanonicaWidgetEmbedSnippet()}
<script>
  window.addEventListener('load', function () {
    window.CanonicaWidget?.page({
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
${buildCanonicaWidgetEmbedSnippet()}
<script>
  window.CanonicaWidget?.page({
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
${buildCanonicaWidgetEmbedSnippet()}
<script>
  window.addEventListener('load', function () {
    window.CanonicaWidget?.page({
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

export const CANONICA_INSTALL_DOCS: CanonicaInstallDoc[] = [
    {
        key: 'overview',
        path: '/install',
        markdownPath: '/install.md',
        title: 'Install Canonica with your AI coding agent',
        navTitle: 'Install overview',
        description: 'Copy the Canonica agent packet, install the v1 widget once, pass safe page context, block sensitive routes, and verify the integration.',
        sections: [
            {
                heading: 'Start with the agent packet',
                body: 'The product owner does not need to hand-write an integration. Copy the packet into Codex, Claude Code, Cursor, Windsurf, or another coding agent and let it make the repository-specific changes.',
                bullets: [
                    'Copy the AI install packet.',
                    'Give the agent the cn_* widget key and allowed origins.',
                    'Review the files changed and verification output.',
                    'Use the Canonica dashboard to confirm runtime status.',
                ],
            },
            {
                heading: 'Stable contract',
                body: 'Canonica freezes the public v1 script URL, browser global, context methods, safe context fields, blocked-route behavior, Markdown docs URLs, and install verification semantics for at least 36 months from general availability.',
                code: buildCanonicaWidgetEmbedSnippet(),
            },
            {
                heading: 'Agent downloads',
                bullets: [
                    `${CANONICA_SITE_URL}/agents/canonica/AGENTS.md`,
                    `${CANONICA_SITE_URL}/agents/canonica/CLAUDE.md`,
                    `${CANONICA_SITE_URL}/agents/canonica/cursor/RULE.md`,
                    `${CANONICA_SITE_URL}/agents/canonica/cursor.mdc`,
                    `${CANONICA_SITE_URL}/agents/canonica/windsurf.md`,
                    `${CANONICA_SITE_URL}/agents/canonica/skill/SKILL.md`,
                    `${CANONICA_SITE_URL}/agents/canonica/canonica-agent-kit.zip`,
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
        description: 'Copyable prompt and acceptance criteria for coding agents installing Canonica.',
        sections: [
            {
                heading: 'Fill these values first',
                code: [
                    'CANONICA_WIDGET_KEY=cn_xxxxxxxxx',
                    'PRODUCTION_ORIGIN=https://app.customer.com',
                    'STAGING_ORIGIN=https://staging.customer.com',
                    'FRAMEWORK=Next.js / React / Vue / Plain HTML / Shopify / Webflow',
                    'ROUTER=App Router / Pages Router / React Router / Vue Router / other',
                    'SUPPORT_ENTRY_POINTS=global widget, help button, sidebar, settings page',
                    `BLOCKED_ROUTES=${CANONICA_DEFAULT_BLOCKED_ROUTES.join(', ')}`,
                ].join('\n'),
            },
            {
                heading: 'Copy this prompt',
                code: renderCanonicaAgentPrompt(),
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
                code: buildCanonicaWidgetEmbedSnippet('cn_your_widget_key'),
            },
            {
                heading: 'Send safe page context',
                body: 'Call page() after load and after client-side route changes. Keep context high-level and safe.',
                code: buildCanonicaSafeContextSnippet(),
            },
            {
                heading: 'Verify',
                bullets: [
                    'Open the product on an allowed origin.',
                    'Confirm one Canonica script tag exists.',
                    'Navigate between routes and confirm context changes.',
                    'Visit blocked routes and confirm the widget is absent.',
                    'Return to the Canonica dashboard and check runtime status.',
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
                    'Use NEXT_PUBLIC_CANONICA_WIDGET_KEY for the public cn_* key.',
                    'Block auth, checkout, billing, security, token, invite, reset-password, api-key, and webhook setup routes.',
                ],
                code: CANONICA_FRAMEWORK_SNIPPETS.nextjs,
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
        sections: [{ heading: 'Agent-ready snippet', code: CANONICA_FRAMEWORK_SNIPPETS.react }],
    },
    {
        key: 'vue',
        path: '/install/frameworks/vue',
        markdownPath: '/install/frameworks/vue.md',
        title: 'Vue install',
        navTitle: 'Vue',
        description: 'Vue and Nuxt guidance for installing the v1 widget and updating context on route changes.',
        sections: [{ heading: 'Agent-ready snippet', code: CANONICA_FRAMEWORK_SNIPPETS.vue }],
    },
    {
        key: 'plain-html',
        path: '/install/frameworks/plain-html',
        markdownPath: '/install/frameworks/plain-html.md',
        title: 'Plain HTML install',
        navTitle: 'Plain HTML',
        description: 'Script-tag install for static or server-rendered products.',
        sections: [{ heading: 'Agent-ready snippet', code: CANONICA_FRAMEWORK_SNIPPETS['plain-html'] }],
    },
    {
        key: 'shopify',
        path: '/install/frameworks/shopify',
        markdownPath: '/install/frameworks/shopify.md',
        title: 'Shopify-style install',
        navTitle: 'Shopify',
        description: 'Theme-level script injection guidance for Shopify-style storefronts.',
        sections: [{ heading: 'Agent-ready snippet', code: CANONICA_FRAMEWORK_SNIPPETS.shopify }],
    },
    {
        key: 'webflow',
        path: '/install/frameworks/webflow',
        markdownPath: '/install/frameworks/webflow.md',
        title: 'Webflow install',
        navTitle: 'Webflow',
        description: 'Custom-code footer install guidance for Webflow and similar hosted sites.',
        sections: [{ heading: 'Agent-ready snippet', code: CANONICA_FRAMEWORK_SNIPPETS.webflow }],
    },
    {
        key: 'verify',
        path: '/install/verify',
        markdownPath: '/install/verify.md',
        title: 'Verify installation',
        navTitle: 'Verify',
        description: 'Runtime checks for script load, one-script-only, allowed origins, blocked routes, context updates, and dashboard status.',
        sections: [
            {
                heading: 'Browser checks',
                bullets: [
                    `Confirm ${CANONICA_WIDGET_SCRIPT_URL} returns 200 and loads once.`,
                    'Confirm no raw widget key is printed in logs or committed source.',
                    'Navigate between app routes and confirm page context updates.',
                    'Visit blocked routes and confirm Canonica is absent.',
                    'Open the browser console and confirm no Canonica integration errors.',
                ],
            },
            {
                heading: 'Dashboard checks',
                bullets: [
                    'Widget key ready.',
                    'Script loaded recently.',
                    'Origin matched allowlist.',
                    'Last route is allowed.',
                    'Context marker was received.',
                    'Recent widget questions are visible after users ask for help.',
                ],
            },
        ],
    },
    {
        key: 'security',
        path: '/install/security',
        markdownPath: '/install/security.md',
        title: 'Security rules',
        navTitle: 'Security',
        description: 'Forbidden context fields, allowed origins, blocked routes, and server-side tenant resolution rules for Canonica installs.',
        sections: [
            {
                heading: 'Canonical v1 context',
                bullets: [...CANONICA_ALLOWED_CONTEXT_FIELDS],
            },
            {
                heading: 'Legacy compatibility fields',
                body: renderCanonicaLegacyContextCompatibilityNotes(),
            },
            {
                heading: 'Forbidden context',
                bullets: [...CANONICA_FORBIDDEN_CONTEXT_FIELDS],
            },
            {
                heading: 'Server authority',
                bullets: [
                    'Widget key authentication resolves Canonica tenant and workspace server-side.',
                    'Browser context is advisory. It is never used for authorization.',
                    'Allowed origins are enforced by Canonica runtime APIs.',
                    'The full widget key is shown only when created or copied from the authenticated dashboard.',
                    'Public API v1 remains account-gated and secondary to the widget install path.',
                ],
            },
        ],
    },
    {
        key: 'contracts',
        path: '/install/contracts',
        markdownPath: '/install/contracts.md',
        title: 'Canonica Widget Contract v1',
        navTitle: 'Contracts',
        description: 'Stable script URL, browser API, context schema, verification semantics, and compatibility policy.',
        sections: [
            {
                heading: 'Stability policy',
                body: 'Canonica will keep the Widget Contract v1 backward-compatible for at least 36 months from general availability.',
                bullets: [
                    `${CANONICA_WIDGET_SCRIPT_URL}`,
                    ...CANONICA_WIDGET_COMPATIBILITY_URLS,
                    'cn_* widget key format',
                    `${CANONICA_WIDGET_GLOBAL_NAME} global`,
                    ...CANONICA_CONTEXT_METHODS.map((method) => `${method}(context)`),
                    'safe context field names',
                    'blocked route behavior',
                    'install verification semantics',
                    'Markdown docs URLs',
                    '/llms.txt URL',
                ],
            },
            {
                heading: 'Widget script caching',
                body: 'The v1 script URL is stable and backward-compatible, but not immutable. Canonica can ship compatible bug fixes without requiring clients to change install code.',
                bullets: [
                    `Recommended header: Cache-Control: ${CANONICA_WIDGET_SCRIPT_CACHE_CONTROL}`,
                    'Do not use long immutable caching on /widget/v1/canonica-widget.js.',
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
                heading: 'Will not be accepted from browser context',
                bullets: [...CANONICA_FORBIDDEN_CONTEXT_FIELDS],
            },
        ],
    },
    {
        key: 'changelog',
        path: '/install/changelog',
        markdownPath: '/install/changelog.md',
        title: 'Install changelog',
        navTitle: 'Changelog',
        description: 'Public changelog for the Canonica agent install layer and widget contract.',
        sections: [
            {
                heading: 'v1.0.0',
                bullets: [
                    'Frozen v1 widget script URL introduced.',
                    'AI agent install packet added.',
                    'Markdown install docs and llms context added.',
                    'Tool-specific AGENTS.md, CLAUDE.md, Cursor, Windsurf, and skill files generated from the same contract.',
                    'Dashboard packet and agent kit downloads added.',
                ],
            },
        ],
    },
];

export const CANONICA_PUBLIC_DOC_ROUTES = CANONICA_INSTALL_DOCS.flatMap((doc) => [doc.path, doc.markdownPath]) as string[];

const DOC_BY_KEY = new Map(CANONICA_INSTALL_DOCS.map((doc) => [doc.key, doc]));

export function getCanonicaInstallDoc(key: CanonicaInstallDocKey) {
    return DOC_BY_KEY.get(key);
}

export function getCanonicaInstallDocsForNavigation() {
    return CANONICA_INSTALL_DOCS.filter((doc) => doc.key !== 'overview');
}

export function renderCanonicaMarkdownDoc(key: CanonicaInstallDocKey, input?: CanonicaAgentPacketInput) {
    if (key === 'ai-agent' && input) {
        const doc = getCanonicaInstallDoc(key);
        if (!doc) return '';
        return normalizeLines(`
# ${doc.title}

> ${doc.description}

## Fill these values first

\`\`\`txt
CANONICA_WIDGET_KEY=${getCanonicaWidgetKeyForPacket(input)}
ALLOWED_ORIGINS=${getCanonicaAllowedOriginsForPacket(input).join(', ')}
FRAMEWORK=${input.framework || '{{FRAMEWORK}}'}
ROUTER=${input.router || '{{ROUTER}}'}
BLOCKED_ROUTES=${getCanonicaBlockedRoutesForPacket(input).join(', ')}
\`\`\`

## Copy this prompt

\`\`\`md
${renderCanonicaAgentPrompt(input)}
\`\`\`
`);
    }

    const doc = getCanonicaInstallDoc(key);
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
            ...getCanonicaInstallDocsForNavigation().map((item) => `- [${item.title}](${CANONICA_SITE_URL}${item.markdownPath}): ${item.description}`),
            '',
        ].join('\n')
        : '';

    return normalizeLines(`
# ${doc.title}

> ${doc.description}

${links}${sections}

## Public API note

The public API may be account-gated. For most clients, install the Canonica widget first.
`);
}

export function renderCanonicaLlmsTxt() {
    return normalizeLines(`
# Canonica

> Canonica is a support knowledge control plane for SaaS products. These docs help coding agents install the Canonica widget, pass safe page context, block sensitive routes, and verify the integration.

## Start here

- [Install Canonica with an AI coding agent](${CANONICA_SITE_URL}/install/ai-agent.md): Copyable install packet for Codex, Claude Code, Cursor, Windsurf, and other coding agents.
- [Canonica Widget Contract v1](${CANONICA_SITE_URL}/install/contracts.md): Stable script URL, browser API, safe context schema, and compatibility policy.
- [Manual install](${CANONICA_SITE_URL}/install/manual.md): Human-readable script install.
- [Next.js install](${CANONICA_SITE_URL}/install/frameworks/nextjs.md): App Router and Pages Router instructions.
- [React install](${CANONICA_SITE_URL}/install/frameworks/react.md): React SPA install and route-change context updates.
- [Vue install](${CANONICA_SITE_URL}/install/frameworks/vue.md): Vue Router install and context updates.
- [Plain HTML install](${CANONICA_SITE_URL}/install/frameworks/plain-html.md): Script-tag install.
- [Verify installation](${CANONICA_SITE_URL}/install/verify.md): Runtime checks and dashboard verification.
- [Security rules](${CANONICA_SITE_URL}/install/security.md): Forbidden context fields and blocked route guidance.
- [Agent kit](${CANONICA_SITE_URL}/agents/canonica/canonica-agent-kit.zip): Downloadable generated instructions for coding agents.

## Stable contract

Use:
${CANONICA_WIDGET_SCRIPT_URL}

Do not send:
tenantId, storeId, userId, email, phone, tokens, cookies, secrets, billing data, payment data, or private account metadata.

## Public API note

The public API may be account-gated. For most clients, install the Canonica widget first.
`);
}

export function renderCanonicaLlmsFullTxt() {
    return normalizeLines(`
# Canonica - Full Agent Context

> Canonica is the Support Knowledge Control Plane for SaaS products. This file expands Canonica public product boundaries and the agent install layer for coding agents.

## Product boundary

- Canonica keeps support knowledge, page-aware answers, hosted help, tickets, Support Board follow-up, releases, and support-gap review under owner-approved control.
- Canonica is not a helpdesk replacement, chatbot autopilot, documentation CMS, compliance platform, autonomous publisher, or client-product code owner.
- Public agents may read these docs, route users to official Canonica pages, and install the widget from the v1 contract.
- Public agents must not mutate customer workspaces, canonical answers, tickets, widget settings, billing, private knowledge, or account data.
- Public API and MCP surfaces may be account-gated. Use the widget install path first unless Canonica explicitly enables API access for the account.

## Primary public routes

- ${CANONICA_SITE_URL}/
- ${CANONICA_SITE_URL}/product
- ${CANONICA_SITE_URL}/product/page-aware-widget
- ${CANONICA_SITE_URL}/product/support-control
- ${CANONICA_SITE_URL}/product/knowledge-governance
- ${CANONICA_SITE_URL}/demo
- ${CANONICA_SITE_URL}/install
- ${CANONICA_SITE_URL}/install/ai-agent
- ${CANONICA_SITE_URL}/install/contracts
- ${CANONICA_SITE_URL}/pricing
- ${CANONICA_SITE_URL}/resources
- ${CANONICA_SITE_URL}/security
- ${CANONICA_SITE_URL}/faq

## Agent install layer

${CANONICA_INSTALL_DOCS.map((doc) => renderCanonicaMarkdownDoc(doc.key)).join('\n\n---\n\n')}

---

# AGENTS.md

${renderCanonicaAgentsMd()}

---

# CLAUDE.md

${renderCanonicaClaudeMd()}
`);
}

export function buildCanonicaAgentPacketJson(input: CanonicaAgentPacketInput = {}) {
    return {
        contractVersion: CANONICA_INSTALL_CONTRACT_VERSION,
        contextContractVersion: CANONICA_CONTEXT_CONTRACT_VERSION,
        verificationContractVersion: CANONICA_VERIFICATION_CONTRACT_VERSION,
        widgetKey: getCanonicaWidgetKeyForPacket(input),
        rawWidgetKeyIncluded: Boolean(input.includeRawWidgetKey && input.widgetKey),
        widgetKeyEnvPlaceholder: 'CANONICA_WIDGET_KEY',
        widgetKeyPrefix: input.widgetKeyPrefix || null,
        scriptUrl: CANONICA_WIDGET_SCRIPT_URL,
        legacyScriptUrl: CANONICA_WIDGET_LEGACY_SCRIPT_URL,
        compatibilityScriptUrls: [...CANONICA_WIDGET_COMPATIBILITY_URLS],
        allowedOrigins: getCanonicaAllowedOriginsForPacket(input),
        blockedRoutes: getCanonicaBlockedRoutesForPacket(input),
        contextSchema: {
            path: 'string',
            title: 'string optional',
            feature: 'string optional',
            workflow: 'string optional',
            role: 'string optional',
            locale: 'string optional',
        },
        legacyContextFieldMap: CANONICA_LEGACY_CONTEXT_FIELD_MAP,
        forbiddenContextFields: [...CANONICA_FORBIDDEN_CONTEXT_FIELDS],
    };
}

export function buildCanonicaAgentKitFiles(input: CanonicaAgentPacketInput = {}) {
    return {
        'README.md': renderCanonicaMarkdownDoc('overview'),
        'canonica-install-packet.md': renderCanonicaMarkdownDoc('ai-agent', input),
        'canonica-widget-contract-v1.md': renderCanonicaMarkdownDoc('contracts'),
        'canonica-context-contract-v1.md': renderCanonicaMarkdownDoc('security'),
        'canonica-verification-contract-v1.md': renderCanonicaMarkdownDoc('verify'),
        'AGENTS.md': renderCanonicaAgentsMd(),
        'CLAUDE.md': renderCanonicaClaudeMd(),
        '.cursor/rules/canonica/RULE.md': renderCanonicaCursorRuleMd(),
        '.cursor/rules/canonica.mdc': renderCanonicaCursorRule(),
        '.windsurf/rules/canonica.md': renderCanonicaWindsurfRule(),
        '.windsurf/workflows/install-canonica.md': renderCanonicaAgentPrompt(input),
        'skills/canonica-install/SKILL.md': renderCanonicaSkill(),
        'tests/canonica-widget-smoke.spec.ts': normalizeLines(`
import { test, expect } from '@playwright/test';

test('Canonica widget loads once and stays off blocked routes', async ({ page }) => {
  await page.goto(process.env.CANONICA_TEST_URL || 'http://localhost:3000/');
  await expect(page.locator('script[src*="/widget/v1/canonica-widget.js"]')).toHaveCount(1);
  await page.goto((process.env.CANONICA_TEST_URL || 'http://localhost:3000') + '/billing');
  await expect(page.locator('script[src*="/widget/v1/canonica-widget.js"]')).toHaveCount(0);
});
`),
        'examples/nextjs-app-router.md': CANONICA_FRAMEWORK_SNIPPETS.nextjs,
        'examples/react-spa.md': CANONICA_FRAMEWORK_SNIPPETS.react,
        'examples/vue.md': CANONICA_FRAMEWORK_SNIPPETS.vue,
        'examples/plain-html.md': CANONICA_FRAMEWORK_SNIPPETS['plain-html'],
        'examples/shopify.md': CANONICA_FRAMEWORK_SNIPPETS.shopify,
        'examples/webflow.md': CANONICA_FRAMEWORK_SNIPPETS.webflow,
        'packet.json': JSON.stringify(buildCanonicaAgentPacketJson(input), null, 2),
    };
}
