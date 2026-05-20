import { z } from 'zod';

export const CANONICA_WIDGET_CONFIG_SCHEMA_VERSION = 'canonica.widget.v1';
export const CANONICA_WIDGET_REMOTE_CONFIG_TTL_SECONDS = 60;

export const CANONICA_WIDGET_SCOPES = [
    'widget:config',
    'widget:search',
    'widget:feedback',
    'widget:predictive',
] as const;

export type CanonicaWidgetScope = typeof CANONICA_WIDGET_SCOPES[number];

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

export const CanonicaWidgetConfigSchema = z.object({
    position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']).default('bottom-right'),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
    shape: z.enum(['rounded', 'pill']).default('rounded'),
    display: z.enum(['icon', 'text', 'icon-text']).default('icon'),
    label: z.string().trim().min(1).max(24).default('?'),
    size: z.enum(['small', 'medium', 'large']).default('medium'),
    offsetX: z.coerce.number().int().min(0).max(200).default(20),
    offsetY: z.coerce.number().int().min(0).max(200).default(20),
    zIndex: z.coerce.number().int().min(1000).max(2147483646).default(2147483646),
    historyMode: z.enum(['session', 'forget']).default('session'),
    launcherVisibility: z.enum(['visible', 'manual']).default('visible'),
    mobileVisibility: z.enum(['show', 'hide']).default('show'),
    blockedRoutes: z.preprocess(
        normalizeWidgetBlockedRoutes,
        z.array(z.string().min(1).max(MAX_WIDGET_BLOCKED_ROUTE_LENGTH)).max(MAX_WIDGET_BLOCKED_ROUTES).default([])
    ),
});

export const PartialCanonicaWidgetConfigSchema = CanonicaWidgetConfigSchema.partial();

export type CanonicaWidgetConfig = z.infer<typeof CanonicaWidgetConfigSchema>;

export const DEFAULT_CANONICA_WIDGET_CONFIG: CanonicaWidgetConfig = CanonicaWidgetConfigSchema.parse({});

export const CanonicaWidgetConfigSaveSchema = z.object({
    config: PartialCanonicaWidgetConfigSchema.default({}),
    allowedOrigins: z.array(z.string().trim().min(1).max(300)).max(25).default([]),
});

export type CanonicaWidgetConfigSaveInput = z.infer<typeof CanonicaWidgetConfigSaveSchema>;

export function normalizeWidgetConfig(value: unknown): CanonicaWidgetConfig {
    const parsed = PartialCanonicaWidgetConfigSchema.safeParse(value || {});
    return CanonicaWidgetConfigSchema.parse(parsed.success ? parsed.data : {});
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
    config: CanonicaWidgetConfig;
    allowedOrigins: string[];
} {
    const parsed = CanonicaWidgetConfigSaveSchema.parse(value);
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

export function buildCanonicaWidgetEmbedCode(params: {
    apiKey: string | null;
    config?: Partial<CanonicaWidgetConfig> | null;
    scriptSrc?: string;
}): string {
    const config = normalizeWidgetConfig(params.config);
    const attrs: string[] = [
        `  src="${escapeHtmlAttribute(params.scriptSrc || 'https://canonica.app/widget/canonica-widget.js')}"`,
        `  data-api-key="${escapeHtmlAttribute(params.apiKey || 'YOUR_WIDGET_KEY')}"`,
    ];

    if (config.position !== DEFAULT_CANONICA_WIDGET_CONFIG.position) attrs.push(`  data-position="${escapeHtmlAttribute(config.position)}"`);
    if (config.accentColor !== DEFAULT_CANONICA_WIDGET_CONFIG.accentColor) attrs.push(`  data-accent-color="${escapeHtmlAttribute(config.accentColor)}"`);
    if (config.shape !== DEFAULT_CANONICA_WIDGET_CONFIG.shape) attrs.push(`  data-shape="${escapeHtmlAttribute(config.shape)}"`);
    if (config.display !== DEFAULT_CANONICA_WIDGET_CONFIG.display) attrs.push(`  data-display="${escapeHtmlAttribute(config.display)}"`);
    if (config.label !== DEFAULT_CANONICA_WIDGET_CONFIG.label) attrs.push(`  data-label="${escapeHtmlAttribute(config.label)}"`);
    if (config.size !== DEFAULT_CANONICA_WIDGET_CONFIG.size) attrs.push(`  data-size="${escapeHtmlAttribute(config.size)}"`);
    if (config.offsetX !== DEFAULT_CANONICA_WIDGET_CONFIG.offsetX) attrs.push(`  data-offset-x="${escapeHtmlAttribute(config.offsetX)}"`);
    if (config.offsetY !== DEFAULT_CANONICA_WIDGET_CONFIG.offsetY) attrs.push(`  data-offset-y="${escapeHtmlAttribute(config.offsetY)}"`);
    if (config.zIndex !== DEFAULT_CANONICA_WIDGET_CONFIG.zIndex) attrs.push(`  data-z-index="${escapeHtmlAttribute(config.zIndex)}"`);
    if (config.historyMode !== DEFAULT_CANONICA_WIDGET_CONFIG.historyMode) attrs.push(`  data-history="${escapeHtmlAttribute(config.historyMode)}"`);
    if (config.launcherVisibility !== DEFAULT_CANONICA_WIDGET_CONFIG.launcherVisibility) attrs.push(`  data-launcher-visibility="${escapeHtmlAttribute(config.launcherVisibility)}"`);
    if (config.mobileVisibility !== DEFAULT_CANONICA_WIDGET_CONFIG.mobileVisibility) attrs.push(`  data-mobile-visibility="${escapeHtmlAttribute(config.mobileVisibility)}"`);
    if (config.blockedRoutes.length > 0) attrs.push(`  data-blocked-routes="${escapeHtmlAttribute(config.blockedRoutes.join(','))}"`);

    return `<script\n${attrs.join('\n')}\n></script>`;
}

export function buildCanonicaWidgetRouteSnippet(): string {
    return [
        'window.CanonicaWidget?.page({',
        "  contextVersion: 1,",
        "  feature: 'billing',",
        "  page: 'invoices',",
        "  workflow: 'manage_subscription',",
        "  entityHints: ['invoice', 'subscription'],",
        '});',
    ].join('\n');
}
