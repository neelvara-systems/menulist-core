import { z } from 'zod';
import { ANSWERLATTICE_WIDGET_SCRIPT_URL } from './installContract/constants';

export const ANSWERLATTICE_WIDGET_CONFIG_SCHEMA_VERSION = 'answerlattice.widget.v1';
export const ANSWERLATTICE_WIDGET_REMOTE_CONFIG_TTL_SECONDS = 60;

export const ANSWERLATTICE_WIDGET_SCOPES = [
    'widget:config',
    'widget:content',
    'widget:search',
    'widget:feedback',
    'widget:predictive',
] as const;

export type AnswerlatticeWidgetScope = typeof ANSWERLATTICE_WIDGET_SCOPES[number];

const MAX_WIDGET_BLOCKED_ROUTES = 50;
const MAX_WIDGET_BLOCKED_ROUTE_LENGTH = 180;

export function normalizeWidgetBlockedRoute(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    let route = trimmed;
    try {
        if (/^https?:\/\//i.test(trimmed)) {
            const parsed = new URL(trimmed);
            route = parsed.pathname || '/';
        }
    } catch {
        return null;
    }

    route = route.split(/[?#]/)[0]?.trim() || '';
    if (!route) return null;
    if (route === '*' || route === '/*') return '*';
    if (!route.startsWith('/')) route = `/${route}`;
    route = route.replace(/\/{2,}/g, '/');
    if (route.length > 1 && route.endsWith('/') && !route.endsWith('/*')) {
        route = route.slice(0, -1);
    }
    if (route.length > MAX_WIDGET_BLOCKED_ROUTE_LENGTH) return null;
    if (route.includes('*') && !route.endsWith('*')) return null;
    return route;
}

export function normalizeWidgetBlockedRoutes(values: unknown): string[] {
    const rawValues = typeof values === 'string'
        ? values.split(/[\n,]/)
        : Array.isArray(values) ? values : [];

    return Array.from(new Set(
        rawValues
            .filter((value): value is string => typeof value === 'string')
            .map(normalizeWidgetBlockedRoute)
            .filter((value): value is string => Boolean(value))
    )).slice(0, MAX_WIDGET_BLOCKED_ROUTES);
}

export const AnswerlatticeWidgetConfigSchema = z.object({
    position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']).default('bottom-right'),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
    shape: z.enum(['rounded', 'pill']).default('rounded'),
    display: z.enum(['icon', 'text', 'icon-text']).default('icon'),
    label: z.string().trim().min(1).max(24).default('?'),
    headerTitle: z.string().trim().min(1).max(40).default('Help'),
    greeting: z.string().trim().min(1).max(120).default('How can we help?'),
    size: z.enum(['small', 'medium', 'large']).default('medium'),
    offsetX: z.coerce.number().int().min(0).max(200).default(20),
    offsetY: z.coerce.number().int().min(0).max(200).default(20),
    zIndex: z.coerce.number().int().min(1000).max(2147483646).default(2147483646),
    historyMode: z.enum(['session', 'forget']).default('session'),
    launcherVisibility: z.enum(['visible', 'manual']).default('visible'),
    mobileVisibility: z.enum(['show', 'hide']).default('show'),
    poweredByVisible: z.boolean().default(true),
    blockedRoutes: z.preprocess(
        normalizeWidgetBlockedRoutes,
        z.array(z.string().min(1).max(MAX_WIDGET_BLOCKED_ROUTE_LENGTH)).max(MAX_WIDGET_BLOCKED_ROUTES).default([])
    ),
});

export const PartialAnswerlatticeWidgetConfigSchema = AnswerlatticeWidgetConfigSchema.partial();

export type AnswerlatticeWidgetConfig = z.infer<typeof AnswerlatticeWidgetConfigSchema>;

export const DEFAULT_ANSWERLATTICE_WIDGET_CONFIG: AnswerlatticeWidgetConfig = AnswerlatticeWidgetConfigSchema.parse({});

export const AnswerlatticeWidgetConfigSaveSchema = z.object({
    config: PartialAnswerlatticeWidgetConfigSchema.strict().default({}),
    allowedOrigins: z.array(z.string().trim().min(1).max(300)).max(25).default([]),
}).strict();

export type AnswerlatticeWidgetConfigSaveInput = z.infer<typeof AnswerlatticeWidgetConfigSaveSchema>;

export function normalizeWidgetConfig(value: unknown): AnswerlatticeWidgetConfig {
    const parsed = PartialAnswerlatticeWidgetConfigSchema.safeParse(value || {});
    return AnswerlatticeWidgetConfigSchema.parse(parsed.success ? parsed.data : {});
}

export function normalizeWidgetAllowedOrigin(value: string): string | null {
    try {
        const parsed = new URL(value.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.origin;
    } catch {
        return null;
    }
}

export function normalizeWidgetAllowedOrigins(values: unknown): string[] {
    if (!Array.isArray(values)) return [];

    return Array.from(new Set(
        values
            .filter((value): value is string => typeof value === 'string')
            .map(normalizeWidgetAllowedOrigin)
            .filter((value): value is string => Boolean(value))
    )).slice(0, 25);
}

export function parseWidgetConfigSaveInput(value: unknown): {
    config: AnswerlatticeWidgetConfig;
    allowedOrigins: string[];
} {
    const parsed = AnswerlatticeWidgetConfigSaveSchema.parse(value);
    return {
        config: normalizeWidgetConfig(parsed.config),
        allowedOrigins: normalizeWidgetAllowedOrigins(parsed.allowedOrigins),
    };
}

function escapeHtmlAttribute(value: string | number): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export function buildAnswerlatticeWidgetEmbedCode(params: {
    apiKey: string | null;
    config?: Partial<AnswerlatticeWidgetConfig> | null;
    scriptSrc?: string;
}): string {
    const config = normalizeWidgetConfig(params.config);
    const attrs: string[] = [
        `  src="${escapeHtmlAttribute(params.scriptSrc || ANSWERLATTICE_WIDGET_SCRIPT_URL)}"`,
        `  data-answerlattice-key="${escapeHtmlAttribute(params.apiKey || 'YOUR_WIDGET_KEY')}"`,
    ];

    if (config.position !== DEFAULT_ANSWERLATTICE_WIDGET_CONFIG.position) attrs.push(`  data-position="${escapeHtmlAttribute(config.position)}"`);
    if (config.accentColor !== DEFAULT_ANSWERLATTICE_WIDGET_CONFIG.accentColor) attrs.push(`  data-accent-color="${escapeHtmlAttribute(config.accentColor)}"`);
    if (config.shape !== DEFAULT_ANSWERLATTICE_WIDGET_CONFIG.shape) attrs.push(`  data-shape="${escapeHtmlAttribute(config.shape)}"`);
    if (config.display !== DEFAULT_ANSWERLATTICE_WIDGET_CONFIG.display) attrs.push(`  data-display="${escapeHtmlAttribute(config.display)}"`);
    if (config.label !== DEFAULT_ANSWERLATTICE_WIDGET_CONFIG.label) attrs.push(`  data-label="${escapeHtmlAttribute(config.label)}"`);
    if (config.headerTitle !== DEFAULT_ANSWERLATTICE_WIDGET_CONFIG.headerTitle) attrs.push(`  data-header-title="${escapeHtmlAttribute(config.headerTitle)}"`);
    if (config.greeting !== DEFAULT_ANSWERLATTICE_WIDGET_CONFIG.greeting) attrs.push(`  data-greeting="${escapeHtmlAttribute(config.greeting)}"`);
    if (config.size !== DEFAULT_ANSWERLATTICE_WIDGET_CONFIG.size) attrs.push(`  data-size="${escapeHtmlAttribute(config.size)}"`);
    if (config.offsetX !== DEFAULT_ANSWERLATTICE_WIDGET_CONFIG.offsetX) attrs.push(`  data-offset-x="${escapeHtmlAttribute(config.offsetX)}"`);
    if (config.offsetY !== DEFAULT_ANSWERLATTICE_WIDGET_CONFIG.offsetY) attrs.push(`  data-offset-y="${escapeHtmlAttribute(config.offsetY)}"`);
    if (config.zIndex !== DEFAULT_ANSWERLATTICE_WIDGET_CONFIG.zIndex) attrs.push(`  data-z-index="${escapeHtmlAttribute(config.zIndex)}"`);
    if (config.historyMode !== DEFAULT_ANSWERLATTICE_WIDGET_CONFIG.historyMode) attrs.push(`  data-history="${escapeHtmlAttribute(config.historyMode)}"`);
    if (config.launcherVisibility !== DEFAULT_ANSWERLATTICE_WIDGET_CONFIG.launcherVisibility) attrs.push(`  data-launcher-visibility="${escapeHtmlAttribute(config.launcherVisibility)}"`);
    if (config.mobileVisibility !== DEFAULT_ANSWERLATTICE_WIDGET_CONFIG.mobileVisibility) attrs.push(`  data-mobile-visibility="${escapeHtmlAttribute(config.mobileVisibility)}"`);
    if (config.poweredByVisible !== DEFAULT_ANSWERLATTICE_WIDGET_CONFIG.poweredByVisible) attrs.push(`  data-powered-by="${escapeHtmlAttribute(config.poweredByVisible ? 'true' : 'false')}"`);
    if (config.blockedRoutes.length > 0) attrs.push(`  data-blocked-routes="${escapeHtmlAttribute(config.blockedRoutes.join(','))}"`);

    return `<script\n${attrs.join('\n')}\n></script>`;
}

export function buildAnswerlatticeWidgetRouteSnippet(): string {
    return [
        'window.AnswerlatticeWidget?.page({',
        "  contextVersion: 1,",
        "  path: window.location.pathname,",
        "  title: document.title,",
        "  feature: 'billing',",
        "  workflow: 'manage_subscription',",
        "  role: 'owner',",
        "  locale: navigator.language || 'en',",
        '});',
        '',
        'window.AnswerlatticeWidget?.identify?.({',
        "  id: currentUser?.supportCustomerId,",
        "  name: currentUser?.name,",
        "  email: currentUser?.email,",
        '});',
    ].join('\n');
}
