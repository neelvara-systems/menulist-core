'use client';

import {
    Alert,
    Button,
    Card,
    Col,
    ColorPicker,
    Flex,
    Grid,
    Input,
    InputNumber,
    List,
    message,
    Modal,
    Popconfirm,
    Row,
    Segmented,
    Select,
    Skeleton,
    Switch,
    Tag,
    Tabs,
    Tooltip,
    Typography,
    theme,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    LuClipboard,
    LuCode,
    LuCopy,
    LuGlobe,
    LuKey,
    LuMessageCircle,
    LuMonitor,
    LuPalette,
    LuPencil,
    LuRefreshCw,
    LuSave,
    LuSettings,
    LuShield,
    LuSmartphone,
    LuTrash2,
    LuEyeOff,
} from 'react-icons/lu';
import {
    CanonicaWidgetConfig,
    DEFAULT_CANONICA_WIDGET_CONFIG,
    buildCanonicaWidgetEmbedCode,
    buildCanonicaWidgetRouteSnippet,
    normalizeWidgetBlockedRoute,
    normalizeWidgetAllowedOrigin,
    normalizeWidgetAllowedOrigins,
    normalizeWidgetConfig,
} from '@lib/canonica/widgetConfig';
import {
    CanonicaHostedHelpConfig,
    DEFAULT_CANONICA_HOSTED_HELP_CONFIG,
    normalizeHostedHelpConfig,
    normalizeHostedHelpDomains,
} from '@lib/canonica/hostedHelpConfig';
import { getCanonicaUiErrorMessage } from '@lib/canonica/uiErrors';
import { normalizeHostedHelpDomain } from '@constant/canonica/hostedHelp';
import type { CanonicaWidgetRuntimeStatus } from '@type/canonica';
import {
    CANONICA_DEFAULT_WIDGET_TAB,
    CANONICA_ROUTES,
    CANONICA_WIDGET_TABS,
    getCanonicaWidgetRoute,
    getCanonicaWidgetTabFromPathname,
    isCanonicaWidgetTab,
    normalizeCanonicaRoutePathname,
    toCanonicaDashboardRoute,
} from '@constant/canonica/navigations';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const { Title, Text, Paragraph } = Typography;

type SnippetType = 'html' | 'env' | 'sdk' | 'spa' | 'next' | 'react' | 'vue' | 'vanilla';

type CanonicaWidgetManagementProps = {
    embeddedMobile?: boolean;
    initialTab?: string;
};

type WidgetConfigResponse = {
    config?: Partial<CanonicaWidgetConfig>;
    allowedOrigins?: string[];
    keyPrefix?: string | null;
    hasWidgetKey?: boolean;
    keys?: WidgetKeySummary[];
    keyLimit?: number;
    encryptionConfigured?: boolean;
    runtimeStatus?: CanonicaWidgetRuntimeStatus | null;
};

type WidgetKeySummary = {
    id: string;
    name: string;
    keyPrefix: string;
    keySuffix?: string | null;
    displayKey: string;
    createdAt?: string | null;
    updatedAt?: string | null;
    copyable: boolean;
    legacy: boolean;
    status: 'active' | 'revoked';
    isActive: boolean;
};

type WidgetActivityItem = {
    id: string;
    query: string;
    answerPreview?: string;
    canonical?: boolean;
    confidence?: string | null;
    referenceCount?: number;
    feedback?: 'good' | 'bad' | null;
    createdAt?: string | null;
};

type HostedHelpSettingsResponse = {
    config?: Partial<CanonicaHostedHelpConfig>;
    domainStatuses?: HostedHelpDomainStatus[];
};

const CONTROL_LABEL_STYLE = { fontSize: 12 } as const;

type HostedHelpDomainStatus = {
    domain: string;
    status?: 'pending' | 'verified' | 'error';
    verified?: boolean;
    verifiedAt?: string | null;
    lastCheckedAt?: string | null;
    verification?: any;
    error?: string | null;
};

function normalizeHostedHelpDnsRecords(config: any, domain: string) {
    const records: { type: string; name: string; value: string }[] = [];

    if (Array.isArray(config?.verificationRecords)) {
        config.verificationRecords.forEach((record: any) => {
            records.push({
                type: record.type || 'TXT',
                name: record.domain || record.name || '_vercel',
                value: record.value || record.reason || '',
            });
        });
    }

    if (Array.isArray(config?.configuredBy)) {
        config.configuredBy.forEach((record: any) => {
            records.push({
                type: record.type || 'CNAME',
                name: record.name || (domain.startsWith('www.') ? 'www' : '@'),
                value: record.value || '',
            });
        });
    }

    if (records.length === 0 && domain) {
        records.push({
            type: 'CNAME',
            name: domain.startsWith('www.') ? 'www' : '@',
            value: 'cname.vercel-dns.com',
        });
    }

    return records;
}

const getHostedHelpStatusColor = (status?: HostedHelpDomainStatus | null) => {
    if (status?.verified || status?.status === 'verified') return 'success';
    if (status?.status === 'error') return 'error';
    return 'warning';
};

const getHostedHelpStatusLabel = (status?: HostedHelpDomainStatus | null) => {
    if (status?.verified || status?.status === 'verified') return 'Live';
    if (status?.status === 'error') return 'Needs review';
    return 'DNS pending';
};

const formatRuntimeDate = (value: any): string => {
    if (!value) return 'Not seen yet';
    const date = typeof value?.toDate === 'function'
        ? value.toDate()
        : typeof value?.seconds === 'number'
            ? new Date(value.seconds * 1000)
            : typeof value?._seconds === 'number'
                ? new Date(value._seconds * 1000)
            : new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not seen yet';
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatActivityDate = (value?: string | null): string => {
    if (!value) return 'Time not recorded';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Time not recorded';
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const isRuntimePathBlocked = (path: string | null | undefined, blockedRoutes: string[]) => {
    if (!path) return false;
    return blockedRoutes.some((route) => {
        if (route === '*') return true;
        if (route.endsWith('/*')) {
            const prefix = route.slice(0, -1);
            return path === route.slice(0, -2) || path.startsWith(prefix);
        }
        return path === route;
    });
};

export default function CanonicaWidgetManagement({ embeddedMobile = false, initialTab }: CanonicaWidgetManagementProps) {
    const { token } = theme.useToken();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const normalizedPathname = normalizeCanonicaRoutePathname(pathname);
    const legacyRequestedTab = searchParams.get('tab');
    const requestedTab = (
        isCanonicaWidgetTab(initialTab)
            ? initialTab
            : (isCanonicaWidgetTab(legacyRequestedTab) ? legacyRequestedTab : CANONICA_DEFAULT_WIDGET_TAB)
    );

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generatingKey, setGeneratingKey] = useState(false);
    const [config, setConfig] = useState<CanonicaWidgetConfig>(DEFAULT_CANONICA_WIDGET_CONFIG);
    const [origins, setOrigins] = useState<string[]>([]);
    const [newOrigin, setNewOrigin] = useState('');
    const [newBlockedRoute, setNewBlockedRoute] = useState('');
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({});
    const [keyPrefix, setKeyPrefix] = useState<string | null>(null);
    const [hasWidgetKey, setHasWidgetKey] = useState(false);
    const [widgetKeys, setWidgetKeys] = useState<WidgetKeySummary[]>([]);
    const [keyLimit, setKeyLimit] = useState(10);
    const [keyEncryptionConfigured, setKeyEncryptionConfigured] = useState(false);
    const [copyingKeyId, setCopyingKeyId] = useState<string | null>(null);
    const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);
    const [renameKey, setRenameKey] = useState<WidgetKeySummary | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [renamingKey, setRenamingKey] = useState(false);
    const [runtimeStatus, setRuntimeStatus] = useState<CanonicaWidgetRuntimeStatus | null>(null);
    const [activityItems, setActivityItems] = useState<WidgetActivityItem[]>([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityError, setActivityError] = useState<string | null>(null);
    const [hostedHelpConfig, setHostedHelpConfig] = useState<CanonicaHostedHelpConfig>(DEFAULT_CANONICA_HOSTED_HELP_CONFIG);
    const [hostedHelpDomainStatuses, setHostedHelpDomainStatuses] = useState<HostedHelpDomainStatus[]>([]);
    const [newHostedDomain, setNewHostedDomain] = useState('');
    const [savingHostedHelp, setSavingHostedHelp] = useState(false);
    const [checkingHostedDomains, setCheckingHostedDomains] = useState(false);
    const [snippetType, setSnippetType] = useState<SnippetType>('html');
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [scriptSrc, setScriptSrc] = useState('https://canonica.app/widget/canonica-widget.js');
    const [dirty, setDirty] = useState(false);
    const [hostedHelpDirty, setHostedHelpDirty] = useState(false);
    const [activeTab, setActiveTab] = useState<string>(requestedTab);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setScriptSrc(`${window.location.origin}/widget/canonica-widget.js`);
        }
    }, []);

    const loadSettings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/canonica/widget-config', { method: 'GET' });
            const data: WidgetConfigResponse = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error((data as any).error || 'Failed to load widget settings');
            setConfig(normalizeWidgetConfig(data.config));
            setOrigins(normalizeWidgetAllowedOrigins(data.allowedOrigins));
            setKeyPrefix(data.keyPrefix || null);
            setHasWidgetKey(Boolean(data.hasWidgetKey));
            setWidgetKeys(Array.isArray(data.keys) ? data.keys : []);
            setKeyLimit(Number(data.keyLimit || 10));
            setKeyEncryptionConfigured(Boolean(data.encryptionConfigured));
            setRuntimeStatus(data.runtimeStatus || null);

            const hostedRes = await fetch('/api/canonica/hosted-help-settings', { method: 'GET' });
            const hostedData: HostedHelpSettingsResponse = await hostedRes.json().catch(() => ({}));
            if (hostedRes.ok) {
                setHostedHelpConfig(normalizeHostedHelpConfig(hostedData.config));
                setHostedHelpDomainStatuses(hostedData.domainStatuses || []);
                setHostedHelpDirty(false);
            }

            setDirty(false);
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not load widget settings'));
        } finally {
            setLoading(false);
        }
    }, []);

    const loadWidgetActivity = useCallback(async () => {
        setActivityLoading(true);
        setActivityError(null);
        try {
            const res = await fetch('/api/canonica/widget-activity', { method: 'GET' });
            const data: { items?: WidgetActivityItem[]; error?: string } = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to load widget activity');
            setActivityItems(Array.isArray(data.items) ? data.items : []);
        } catch (error) {
            setActivityError(getCanonicaUiErrorMessage(error, 'Could not load widget activity'));
            setActivityItems([]);
        } finally {
            setActivityLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
        loadWidgetActivity();
    }, [loadSettings, loadWidgetActivity]);

    const updateConfig = useCallback(<K extends keyof CanonicaWidgetConfig>(
        key: K,
        value: CanonicaWidgetConfig[K],
    ) => {
        setConfig(prev => normalizeWidgetConfig({ ...prev, [key]: value }));
        setDirty(true);
    }, []);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/canonica/widget-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config, allowedOrigins: origins }),
            });
            const data: WidgetConfigResponse = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error((data as any).error || 'Failed to save widget settings');
            setConfig(normalizeWidgetConfig(data.config));
            setOrigins(normalizeWidgetAllowedOrigins(data.allowedOrigins));
            setKeyPrefix(data.keyPrefix || null);
            setHasWidgetKey(Boolean(data.hasWidgetKey));
            setWidgetKeys(Array.isArray(data.keys) ? data.keys : widgetKeys);
            setKeyLimit(Number(data.keyLimit || keyLimit));
            setKeyEncryptionConfigured(Boolean(data.encryptionConfigured));
            if ('runtimeStatus' in data) {
                setRuntimeStatus(data.runtimeStatus || null);
            }
            setDirty(false);
            message.success('Widget settings saved');
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not save widget settings'));
        } finally {
            setSaving(false);
        }
    }, [config, origins, keyLimit, widgetKeys]);

    const handleGenerateKey = useCallback(async () => {
        setGeneratingKey(true);
        try {
            const res = await fetch('/api/canonica/widget-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate', name: `Widget key ${widgetKeys.length + 1}` }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.apiKey) throw new Error(data.error || 'Failed to create widget key');
            setApiKey(data.apiKey);
            if (data.key?.id) {
                setRevealedKeys(prev => ({ ...prev, [data.key.id]: data.apiKey }));
            }
            setKeyPrefix(data.keyPrefix || data.key?.keyPrefix || data.apiKey.slice(0, 7));
            setHasWidgetKey(Boolean(data.hasWidgetKey ?? true));
            setWidgetKeys(Array.isArray(data.keys) ? data.keys : data.key ? [data.key, ...widgetKeys] : widgetKeys);
            setKeyLimit(Number(data.keyLimit || keyLimit));
            setKeyEncryptionConfigured(Boolean(data.encryptionConfigured));
            message.success('Widget key created');
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not create widget key'));
        } finally {
            setGeneratingKey(false);
        }
    }, [keyLimit, widgetKeys]);

    const handleCopyKey = useCallback(async (key: WidgetKeySummary) => {
        const revealedKey = revealedKeys[key.id];
        if (revealedKey) {
            copyText(revealedKey, 'Widget key copied');
            setApiKey(revealedKey);
            return;
        }

        setCopyingKeyId(key.id);
        try {
            const res = await fetch('/api/canonica/widget-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'copy', keyId: key.id }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.apiKey) throw new Error(data.error || 'Failed to copy widget key');
            setApiKey(data.apiKey);
            setRevealedKeys(prev => ({ ...prev, [key.id]: data.apiKey }));
            copyText(data.apiKey, 'Widget key copied');
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not copy this key'));
        } finally {
            setCopyingKeyId(null);
        }
    }, [revealedKeys]);

    const handleRenameKey = useCallback(async () => {
        if (!renameKey) return;
        setRenamingKey(true);
        try {
            const res = await fetch('/api/canonica/widget-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'rename', keyId: renameKey.id, name: renameValue }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to rename widget key');
            setWidgetKeys(Array.isArray(data.keys) ? data.keys : widgetKeys);
            setKeyPrefix(data.keyPrefix || keyPrefix);
            setHasWidgetKey(Boolean(data.hasWidgetKey ?? hasWidgetKey));
            setRenameKey(null);
            setRenameValue('');
            message.success('Widget key renamed');
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not rename widget key'));
        } finally {
            setRenamingKey(false);
        }
    }, [hasWidgetKey, keyPrefix, renameKey, renameValue, widgetKeys]);

    const openRenameKey = useCallback((key: WidgetKeySummary) => {
        setRenameKey(key);
        setRenameValue(key.name);
    }, []);

    const handleDeleteKey = useCallback(async (key: WidgetKeySummary) => {
        setDeletingKeyId(key.id);
        try {
            const res = await fetch('/api/canonica/widget-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', keyId: key.id }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to delete widget key');
            setWidgetKeys(Array.isArray(data.keys) ? data.keys : widgetKeys.filter(item => item.id !== key.id));
            setKeyPrefix(data.keyPrefix || null);
            setHasWidgetKey(Boolean(data.hasWidgetKey));
            setRevealedKeys(prev => {
                const next = { ...prev };
                delete next[key.id];
                return next;
            });
            if (revealedKeys[key.id] === apiKey) {
                setApiKey(null);
            }
            message.success('Widget key deleted');
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not delete widget key'));
        } finally {
            setDeletingKeyId(null);
        }
    }, [apiKey, revealedKeys, widgetKeys]);

    const addOrigin = useCallback(() => {
        const normalized = normalizeWidgetAllowedOrigin(newOrigin);
        if (!normalized) {
            message.error('Enter a valid URL');
            return;
        }
        if (origins.includes(normalized)) {
            message.info('Origin already added');
            return;
        }
        setOrigins(prev => [...prev, normalized]);
        setNewOrigin('');
        setDirty(true);
    }, [newOrigin, origins]);

    const removeOrigin = useCallback((origin: string) => {
        setOrigins(prev => prev.filter(item => item !== origin));
        setDirty(true);
    }, []);

    const addBlockedRoute = useCallback(() => {
        const normalized = normalizeWidgetBlockedRoute(newBlockedRoute);
        if (!normalized) {
            message.error('Enter a valid route, for example /help-center or /help-center/*');
            return;
        }
        if (config.blockedRoutes.includes(normalized)) {
            message.info('Route already blocked');
            return;
        }
        updateConfig('blockedRoutes', [...config.blockedRoutes, normalized]);
        setNewBlockedRoute('');
    }, [config.blockedRoutes, newBlockedRoute, updateConfig]);

    const removeBlockedRoute = useCallback((route: string) => {
        updateConfig('blockedRoutes', config.blockedRoutes.filter(item => item !== route));
    }, [config.blockedRoutes, updateConfig]);

    const updateHostedHelpConfig = useCallback(<K extends keyof CanonicaHostedHelpConfig>(
        key: K,
        value: CanonicaHostedHelpConfig[K],
    ) => {
        setHostedHelpConfig(prev => normalizeHostedHelpConfig({ ...prev, [key]: value }));
        setHostedHelpDirty(true);
    }, []);

    const addHostedDomain = useCallback(() => {
        const normalized = normalizeHostedHelpDomain(newHostedDomain);
        if (!normalized) {
            message.error('Enter a valid help domain, for example https://help.example.com');
            return;
        }
        if (hostedHelpConfig.domains.includes(normalized)) {
            message.info('Domain already added');
            return;
        }
        updateHostedHelpConfig('domains', normalizeHostedHelpDomains([...hostedHelpConfig.domains, normalized]));
        setNewHostedDomain('');
    }, [hostedHelpConfig.domains, newHostedDomain, updateHostedHelpConfig]);

    const removeHostedDomain = useCallback((domain: string) => {
        const nextDomains = hostedHelpConfig.domains.filter(item => item !== domain);
        setHostedHelpDomainStatuses(prev => prev.filter(item => item.domain !== domain));
        setHostedHelpConfig(prev => normalizeHostedHelpConfig({
            ...prev,
            domains: nextDomains,
            primaryDomain: prev.primaryDomain === domain ? nextDomains[0] || null : prev.primaryDomain,
        }));
        setHostedHelpDirty(true);
    }, [hostedHelpConfig.domains]);

    const handleSaveHostedHelp = useCallback(async () => {
        setSavingHostedHelp(true);
        try {
            const res = await fetch('/api/canonica/hosted-help-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: hostedHelpConfig }),
            });
            const data: HostedHelpSettingsResponse & { error?: string } = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to save hosted help settings');
            setHostedHelpConfig(normalizeHostedHelpConfig(data.config));
            setHostedHelpDomainStatuses(data.domainStatuses || []);
            setHostedHelpDirty(false);
            message.success('Hosted Help Center settings saved');
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not save hosted help settings'));
        } finally {
            setSavingHostedHelp(false);
        }
    }, [hostedHelpConfig]);

    const refreshHostedHelpDomains = useCallback(async () => {
        setCheckingHostedDomains(true);
        try {
            const res = await fetch('/api/canonica/hosted-help-settings?refreshDomains=1', { method: 'GET' });
            const data: HostedHelpSettingsResponse & { error?: string } = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to check hosted help DNS');
            setHostedHelpConfig(normalizeHostedHelpConfig(data.config));
            setHostedHelpDomainStatuses(data.domainStatuses || []);
            message.success('Hosted Help DNS status updated');
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not check hosted help DNS'));
        } finally {
            setCheckingHostedDomains(false);
        }
    }, []);

    const embedCode = useMemo(() => buildCanonicaWidgetEmbedCode({ apiKey, config, scriptSrc }), [apiKey, config, scriptSrc]);
    const spaSnippet = useMemo(() => buildCanonicaWidgetRouteSnippet(), []);
    const envSnippet = useMemo(() => [
        '# Next.js / Vercel',
        `NEXT_PUBLIC_CANONICA_WIDGET_KEY=${apiKey || 'cn_your_widget_key'}`,
        `NEXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC=${scriptSrc}`,
        '',
        '# Vite / React SPA',
        `VITE_CANONICA_WIDGET_KEY=${apiKey || 'cn_your_widget_key'}`,
        `VITE_CANONICA_WIDGET_SCRIPT_SRC=${scriptSrc}`,
        '',
        '# Nuxt',
        `NUXT_PUBLIC_CANONICA_WIDGET_KEY=${apiKey || 'cn_your_widget_key'}`,
        `NUXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC=${scriptSrc}`,
        '',
        '# Keep these out of browser env:',
        '# Firebase service accounts, admin credentials, private API keys, tenant IDs, store IDs, user IDs, and customer records.',
    ].join('\n'), [apiKey, scriptSrc]);
    const sdkSnippet = useMemo(() => [
        "import { createCanonicaWebClient } from '@canonica/web';",
        '',
        'const widgetKey = process.env.NEXT_PUBLIC_CANONICA_WIDGET_KEY;',
        'if (!widgetKey) throw new Error("Missing NEXT_PUBLIC_CANONICA_WIDGET_KEY");',
        '',
        'const canonica = createCanonicaWebClient({',
        '  apiKey: widgetKey,',
        '  scriptSrc: process.env.NEXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC,',
        '});',
        '',
        'await canonica.init();',
        'canonica.page({',
        "  contextKey: 'billing_invoices',",
        "  feature: 'billing',",
        "  page: 'invoices',",
        "  workflow: 'manage_subscription',",
        "  entityHints: ['invoice', 'subscription'],",
        '});',
    ].join('\n'), []);
    const nextSnippet = useMemo(() => [
        "'use client';",
        '',
        "import { useEffect } from 'react';",
        "import { usePathname } from 'next/navigation';",
        "import { createCanonicaWebClient } from '@canonica/web';",
        '',
        'export function CanonicaRouteContext() {',
        '  const pathname = usePathname();',
        '  useEffect(() => {',
        '    const widgetKey = process.env.NEXT_PUBLIC_CANONICA_WIDGET_KEY;',
        '    if (!widgetKey) return;',
        '    const canonica = createCanonicaWebClient({',
        '      apiKey: widgetKey,',
        '      scriptSrc: process.env.NEXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC,',
        '    });',
        "    const contextKey = pathname.replace(/^\\//, '').replace(/\\//g, '_') || 'home';",
        '    canonica.init({',
        '      context: {',
        '        contextKey,',
        "        feature: pathname.split('/')[1] || 'app',",
        '        page: contextKey,',
        '      },',
        '    });',
        '  }, [pathname]);',
        '  return null;',
        '}',
    ].join('\n'), []);
    const reactSnippet = useMemo(() => [
        "import { useEffect } from 'react';",
        "import { createCanonicaWebClient } from '@canonica/web';",
        '',
        'export function BillingPageHelp() {',
        '  useEffect(() => {',
        '    const widgetKey = import.meta.env.VITE_CANONICA_WIDGET_KEY;',
        '    if (!widgetKey) return;',
        '    const canonica = createCanonicaWebClient({',
        '      apiKey: widgetKey,',
        '      scriptSrc: import.meta.env.VITE_CANONICA_WIDGET_SCRIPT_SRC,',
        '    });',
        '    canonica.init();',
        '    canonica.page({',
        "      contextKey: 'billing_invoices',",
        "      feature: 'billing',",
        "      page: 'invoices',",
        "      workflow: 'manage_subscription',",
        '    });',
        '  }, []);',
        '  return null;',
        '}',
    ].join('\n'), []);
    const vueSnippet = useMemo(() => [
        '<script setup lang="ts">',
        "import { onMounted } from 'vue';",
        "import { createCanonicaWebClient } from '@canonica/web';",
        '',
        'onMounted(async () => {',
        '  const config = useRuntimeConfig();',
        '  const widgetKey = config.public.canonicaWidgetKey;',
        '  if (!widgetKey) return;',
        '  const canonica = createCanonicaWebClient({',
        '    apiKey: widgetKey,',
        '    scriptSrc: config.public.canonicaWidgetScriptSrc,',
        '  });',
        '  await canonica.init();',
        '  canonica.page({',
        "    contextKey: 'billing_invoices',",
        "    feature: 'billing',",
        "    page: 'invoices',",
        "    workflow: 'manage_subscription',",
        '  });',
        '});',
        '</script>',
    ].join('\n'), []);
    const vanillaSnippet = useMemo(() => [
        embedCode,
        '',
        '<script>',
        '  window.addEventListener("load", function () {',
        '    window.CanonicaWidget?.page({',
        "      contextKey: 'billing_invoices',",
        "      feature: 'billing',",
        "      page: 'invoices',",
        "      workflow: 'manage_subscription',",
        '    });',
        '  });',
        '</script>',
    ].join('\n'), [embedCode]);

    const snippetByType: Record<SnippetType, string> = {
        html: embedCode,
        env: envSnippet,
        sdk: sdkSnippet,
        spa: spaSnippet,
        next: nextSnippet,
        react: reactSnippet,
        vue: vueSnippet,
        vanilla: vanillaSnippet,
    };
    const activeSnippet = snippetByType[snippetType];
    const widgetKeyCount = widgetKeys.filter(key => key.status === 'active').length;
    const canCreateWidgetKey = widgetKeyCount < keyLimit;
    const primaryWidgetKey = widgetKeys.find(key => key.isActive) || widgetKeys[0] || null;
    const widgetSeen = Boolean(runtimeStatus?.lastSeenAt);
    const contextSeen = Boolean(runtimeStatus?.lastContextKey || runtimeStatus?.lastFeature || runtimeStatus?.lastPage);
    const originRestricted = origins.length > 0;
    const lastOriginAllowed = Boolean(runtimeStatus?.lastOrigin && (!originRestricted || origins.includes(runtimeStatus.lastOrigin)));
    const lastRouteBlocked = isRuntimePathBlocked(runtimeStatus?.lastPath, config.blockedRoutes);
    const verifierItems = [
        {
            label: 'Widget key',
            type: hasWidgetKey ? 'success' as const : 'warning' as const,
            message: hasWidgetKey ? 'Widget key ready' : 'Create a widget key',
            description: hasWidgetKey ? `Active key prefix: ${primaryWidgetKey?.keyPrefix || keyPrefix || 'available'}.` : 'Create the key before copying install code.',
        },
        {
            label: 'Script loaded',
            type: widgetSeen ? 'success' as const : 'warning' as const,
            message: widgetSeen ? 'Widget loaded recently' : 'Widget not seen yet',
            description: widgetSeen ? `Last seen ${formatRuntimeDate(runtimeStatus?.lastSeenAt)}.` : 'Install the script and open your product once to verify the widget loads.',
        },
        {
            label: 'Origin valid',
            type: originRestricted ? (lastOriginAllowed ? 'success' as const : 'warning' as const) : 'warning' as const,
            message: originRestricted ? (lastOriginAllowed ? 'Origin matched allowlist' : 'Waiting for allowlisted origin') : 'Add allowed origins',
            description: originRestricted ? (runtimeStatus?.lastOrigin || 'Open your app after saving origins.') : 'Until you add allowed origins, runtime config is not restricted to known domains.',
        },
        {
            label: 'Route allowed',
            type: lastRouteBlocked ? 'error' as const : widgetSeen ? 'success' as const : 'info' as const,
            message: lastRouteBlocked ? 'Last route is blocked' : 'Route can show support',
            description: runtimeStatus?.lastPath || 'Last route not seen yet.',
        },
        {
            label: 'Context arriving',
            type: contextSeen ? 'success' as const : 'info' as const,
            message: contextSeen ? 'Page context received' : 'Page context not received yet',
            description: contextSeen
                ? runtimeStatus?.lastContextKey || runtimeStatus?.lastFeature || runtimeStatus?.lastPage || 'Context marker saved.'
                : 'Add route context so Canonica can answer for the current screen.',
        },
    ];
    const hostedHelpUrl = hostedHelpConfig.primaryDomain || hostedHelpConfig.domains[0] || '';
    const hostedHelpStatusByDomain = useMemo(() => new Map(
        hostedHelpDomainStatuses.map(status => [status.domain, status]),
    ), [hostedHelpDomainStatuses]);
    const primaryHostedHelpStatus = hostedHelpUrl ? hostedHelpStatusByDomain.get(hostedHelpUrl) : null;
    const hostedHelpDnsRecords = useMemo(
        () => normalizeHostedHelpDnsRecords(primaryHostedHelpStatus?.verification, hostedHelpUrl),
        [hostedHelpUrl, primaryHostedHelpStatus?.verification],
    );

    const copyText = useCallback(async (value: string, successMessage = 'Copied') => {
        try {
            await navigator.clipboard.writeText(value);
            message.success(successMessage);
        } catch {
            message.error('Unable to copy');
        }
    }, []);

    const handleRefresh = useCallback(() => {
        loadSettings();
        loadWidgetActivity();
    }, [loadSettings, loadWidgetActivity]);

    useEffect(() => {
        const nextTab = isCanonicaWidgetTab(requestedTab) ? requestedTab : CANONICA_DEFAULT_WIDGET_TAB;
        setActiveTab(nextTab);

        const activePathTab = getCanonicaWidgetTabFromPathname(normalizedPathname);
        const shouldNormalizeRoute = (
            normalizedPathname === CANONICA_ROUTES.WIDGET ||
            Boolean(legacyRequestedTab) ||
            activePathTab !== nextTab
        );

        if (shouldNormalizeRoute) {
            router.replace(
                toCanonicaDashboardRoute(getCanonicaWidgetRoute(nextTab), currentHostname),
                { scroll: false },
            );
        }
    }, [currentHostname, legacyRequestedTab, normalizedPathname, requestedTab, router]);

    const handleTabChange = useCallback((key: string) => {
        setActiveTab(key);
        router.replace(
            toCanonicaDashboardRoute(getCanonicaWidgetRoute(key), currentHostname),
            { scroll: false },
        );
    }, [currentHostname, router]);

    if (loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <>
        <Flex
            vertical
            gap={isMobile ? 14 : 20}
            style={{
                paddingBottom: isMobile
                    ? embeddedMobile
                        ? 'calc(128px + env(safe-area-inset-bottom))'
                        : 'calc(76px + env(safe-area-inset-bottom))'
                    : 0,
            }}
        >
            <Flex align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={12} vertical={isMobile}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Widget Management</Title>
                    <Text type="secondary">Install, configure, and secure the Canonica help widget.</Text>
                </div>
                <Flex gap={8} wrap="wrap">
                    <Button icon={<LuRefreshCw size={14} />} onClick={handleRefresh}>
                        Refresh
                    </Button>
                    <Button type="primary" icon={<LuSave size={14} />} loading={saving} onClick={handleSave}>
                        Save
                    </Button>
                </Flex>
            </Flex>

            {dirty && (
                <Alert
                    type="warning"
                    showIcon
                    message="Unsaved widget changes"
                    description="Save before testing the installed widget. Existing installs pick up the latest saved dashboard settings automatically."
                />
            )}

            {hostedHelpDirty && (
                <Alert
                    type="warning"
                    showIcon
                    message="Unsaved hosted Help Center changes"
                    description="Save hosted settings before testing your public help domain."
                />
            )}

            <Tabs
                activeKey={activeTab}
                onChange={handleTabChange}
                type={isMobile ? 'line' : 'card'}
                size={isMobile ? 'small' : 'middle'}
                items={[
                    {
                        key: CANONICA_WIDGET_TABS.UI,
                        label: 'UI Configuration',
                        children: (
                            <Row gutter={[16, 16]}>
                                <Col xs={24} lg={14}>
                                    <Card title={<Flex align="center" gap={8}><LuPalette size={16} /> Appearance</Flex>}>
                                        <Row gutter={[14, 14]}>
                                            <Col xs={24} sm={12}>
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Position</Text>
                                                    <Select
                                                        value={config.position}
                                                        onChange={(value) => updateConfig('position', value)}
                                                        options={[
                                                            { value: 'bottom-right', label: 'Bottom right' },
                                                            { value: 'bottom-left', label: 'Bottom left' },
                                                            { value: 'top-right', label: 'Top right' },
                                                            { value: 'top-left', label: 'Top left' },
                                                        ]}
                                                    />
                                                </Flex>
                                            </Col>
                                            <Col xs={24} sm={12}>
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Accent Color</Text>
                                                    <ColorPicker
                                                        value={config.accentColor}
                                                        onChange={(_, hex) => updateConfig('accentColor', hex)}
                                                        showText
                                                    />
                                                </Flex>
                                            </Col>
                                            <Col xs={24} sm={12}>
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Shape</Text>
                                                    <Segmented
                                                        block
                                                        value={config.shape}
                                                        onChange={(value) => updateConfig('shape', value as CanonicaWidgetConfig['shape'])}
                                                        options={[
                                                            { value: 'rounded', label: 'Circle' },
                                                            { value: 'pill', label: 'Pill' },
                                                        ]}
                                                    />
                                                </Flex>
                                            </Col>
                                            <Col xs={24} sm={12}>
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Display</Text>
                                                    <Segmented
                                                        block
                                                        value={config.display}
                                                        onChange={(value) => updateConfig('display', value as CanonicaWidgetConfig['display'])}
                                                        options={[
                                                            { value: 'icon', label: 'Icon' },
                                                            { value: 'text', label: 'Text' },
                                                            { value: 'icon-text', label: 'Icon + Text' },
                                                        ]}
                                                    />
                                                </Flex>
                                            </Col>
                                            <Col xs={24} sm={8}>
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Label</Text>
                                                    <Input
                                                        value={config.label}
                                                        maxLength={24}
                                                        onChange={(event) => updateConfig('label', event.target.value || '?')}
                                                    />
                                                </Flex>
                                            </Col>
                                            <Col xs={24} sm={8}>
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Header Title</Text>
                                                    <Input
                                                        value={config.headerTitle}
                                                        maxLength={40}
                                                        onChange={(event) => updateConfig('headerTitle', event.target.value || DEFAULT_CANONICA_WIDGET_CONFIG.headerTitle)}
                                                    />
                                                </Flex>
                                            </Col>
                                            <Col xs={24} sm={8}>
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Powered by Badge</Text>
                                                    <Switch
                                                        checked={config.poweredByVisible}
                                                        checkedChildren="Shown"
                                                        unCheckedChildren="Hidden"
                                                        onChange={(checked) => updateConfig('poweredByVisible', checked)}
                                                    />
                                                </Flex>
                                            </Col>
                                            <Col xs={24}>
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Greeting</Text>
                                                    <Input
                                                        value={config.greeting}
                                                        maxLength={120}
                                                        onChange={(event) => updateConfig('greeting', event.target.value || DEFAULT_CANONICA_WIDGET_CONFIG.greeting)}
                                                        placeholder="How can we help?"
                                                    />
                                                </Flex>
                                            </Col>
                                            <Col xs={12} sm={8}>
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Offset X</Text>
                                                    <InputNumber value={config.offsetX} min={0} max={200} style={{ width: '100%' }} onChange={(value) => updateConfig('offsetX', Number(value ?? 20))} />
                                                </Flex>
                                            </Col>
                                            <Col xs={12} sm={8}>
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Offset Y</Text>
                                                    <InputNumber value={config.offsetY} min={0} max={200} style={{ width: '100%' }} onChange={(value) => updateConfig('offsetY', Number(value ?? 20))} />
                                                </Flex>
                                            </Col>
                                        </Row>
                                    </Card>
                                </Col>

                                <Col xs={24} lg={10}>
                                    <Card title={<Flex align="center" gap={8}><LuSettings size={16} /> Behavior</Flex>}>
                                        <Flex vertical gap={14}>
                                            <Flex vertical gap={4}>
                                                <Text strong style={CONTROL_LABEL_STYLE}>History</Text>
                                                <Segmented
                                                    block
                                                    value={config.historyMode}
                                                    onChange={(value) => updateConfig('historyMode', value as CanonicaWidgetConfig['historyMode'])}
                                                    options={[
                                                        { value: 'session', label: 'Keep on page' },
                                                        { value: 'forget', label: 'Clear on close' },
                                                    ]}
                                                />
                                            </Flex>
                                            <Flex vertical gap={4}>
                                                <Text strong style={CONTROL_LABEL_STYLE}>Launcher</Text>
                                                <Segmented
                                                    block
                                                    value={config.launcherVisibility}
                                                    onChange={(value) => updateConfig('launcherVisibility', value as CanonicaWidgetConfig['launcherVisibility'])}
                                                    options={[
                                                        { value: 'visible', label: 'Visible' },
                                                        { value: 'manual', label: 'Manual only' },
                                                    ]}
                                                />
                                            </Flex>
                                            <Flex vertical gap={4}>
                                                <Text strong style={CONTROL_LABEL_STYLE}>Mobile</Text>
                                                <Segmented
                                                    block
                                                    value={config.mobileVisibility}
                                                    onChange={(value) => updateConfig('mobileVisibility', value as CanonicaWidgetConfig['mobileVisibility'])}
                                                    options={[
                                                        { value: 'show', label: 'Show' },
                                                        { value: 'hide', label: 'Hide' },
                                                    ]}
                                                />
                                            </Flex>
                                            <Flex vertical gap={4}>
                                                <Text strong style={CONTROL_LABEL_STYLE}>Z-index</Text>
                                                <InputNumber value={config.zIndex} min={1000} max={2147483646} style={{ width: '100%' }} onChange={(value) => updateConfig('zIndex', Number(value ?? DEFAULT_CANONICA_WIDGET_CONFIG.zIndex))} />
                                            </Flex>
                                        </Flex>
                                    </Card>
                                </Col>

                                <Col xs={24}>
                                    <Card
                                        title={<Flex align="center" gap={8}>{previewMode === 'desktop' ? <LuMonitor size={16} /> : <LuSmartphone size={16} />} Preview</Flex>}
                                        extra={(
                                            <Segmented
                                                value={previewMode}
                                                onChange={(value) => setPreviewMode(value as 'desktop' | 'mobile')}
                                                options={[
                                                    { value: 'desktop', label: 'Desktop' },
                                                    { value: 'mobile', label: 'Mobile' },
                                                ]}
                                            />
                                        )}
                                    >
                                        <Flex vertical gap={12}>
                                            <WidgetPreview config={config} mode={previewMode} />
                                            <PageAwarePreview />
                                        </Flex>
                                    </Card>
                                </Col>
                            </Row>
                        ),
                    },
                    {
                        key: CANONICA_WIDGET_TABS.INSTALL,
                        label: 'Install & Embed',
                        children: (
                            <Row gutter={[16, 16]}>
                                <Col xs={24}>
                                    <Card
                                        title={<Flex align="center" gap={8}><LuCode size={16} /> Install Code</Flex>}
                                        extra={<Button size="small" icon={<LuClipboard size={14} />} onClick={() => copyText(activeSnippet, 'Install code copied')}>Copy</Button>}
                                    >
                                        <Flex vertical gap={12}>
                                            <Segmented
                                                value={snippetType}
                                                onChange={(value) => setSnippetType(value as SnippetType)}
                                                options={[
                                                    { value: 'html', label: 'HTML' },
                                                    { value: 'env', label: 'Env' },
                                                    { value: 'sdk', label: 'Typed SDK' },
                                                    { value: 'spa', label: 'Route Context' },
                                                    { value: 'next', label: 'Next.js' },
                                                    { value: 'react', label: 'React' },
                                                    { value: 'vue', label: 'Vue/Nuxt' },
                                                    { value: 'vanilla', label: 'Vanilla' },
                                                ]}
                                            />
                                            <Input.TextArea
                                                value={activeSnippet}
                                                readOnly
                                                rows={snippetType === 'html' ? 8 : snippetType === 'env' ? 13 : 15}
                                                style={{ fontFamily: 'monospace', fontSize: 12, background: token.colorFillTertiary, color: token.colorText }}
                                            />
                                            <Alert
                                                type="info"
                                                showIcon
                                                message="Recommended: keep widget values in environment variables"
                                                description="Use client-safe env names for the public cn_* widget key and optional script source. Do not put Firebase service accounts, admin credentials, private API keys, tenant IDs, store IDs, user IDs, or customer records in browser env."
                                            />
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                The script reads saved dashboard settings automatically. The typed SDK validates safe page context before calling the widget runtime.
                                            </Text>
                                        </Flex>
                                    </Card>
                                </Col>

                                <Col xs={24}>
                                    <Card title={<Flex align="center" gap={8}><LuShield size={16} /> Install Verification</Flex>}>
                                        <Flex vertical gap={12}>
                                            <Row gutter={[12, 12]}>
                                                {verifierItems.map((item) => (
                                                    <Col xs={24} md={12} xl={8} key={item.label}>
                                                        <Alert
                                                            type={item.type}
                                                            showIcon
                                                            message={item.message}
                                                            description={item.description}
                                                        />
                                                    </Col>
                                                ))}
                                            </Row>
                                            <Card size="small" title="Last runtime payload">
                                                <Flex vertical gap={6}>
                                                    <Flex justify="space-between" gap={12}>
                                                        <Text type="secondary">Last route</Text>
                                                        <Text strong style={{ wordBreak: 'break-all', textAlign: 'right' }}>{runtimeStatus?.lastPath || 'Not seen yet'}</Text>
                                                    </Flex>
                                                    <Flex justify="space-between" gap={12}>
                                                        <Text type="secondary">Last origin</Text>
                                                        <Text strong style={{ wordBreak: 'break-all', textAlign: 'right' }}>{runtimeStatus?.lastOrigin || 'Not seen yet'}</Text>
                                                    </Flex>
                                                    <Flex justify="space-between" gap={12}>
                                                        <Text type="secondary">Seen count</Text>
                                                        <Text strong>{runtimeStatus?.seenCount || 0}</Text>
                                                    </Flex>
                                                </Flex>
                                            </Card>
                                            <div style={{
                                                border: `1px solid ${token.colorBorderSecondary}`,
                                                borderRadius: 8,
                                                padding: 12,
                                                background: token.colorBgContainer,
                                            }}>
                                                <Flex align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={8} vertical={isMobile} style={{ marginBottom: 10 }}>
                                                    <Flex align="center" gap={8}>
                                                        <LuMessageCircle size={16} />
                                                        <Text strong>Recent widget questions</Text>
                                                    </Flex>
                                                    <Button
                                                        size="small"
                                                        icon={<LuRefreshCw size={14} />}
                                                        loading={activityLoading}
                                                        onClick={loadWidgetActivity}
                                                    >
                                                        Refresh
                                                    </Button>
                                                </Flex>
                                                {activityError ? (
                                                    <Alert type="warning" showIcon message={activityError} />
                                                ) : activityLoading ? (
                                                    <Skeleton active paragraph={{ rows: 3 }} />
                                                ) : activityItems.length === 0 ? (
                                                    <Alert type="info" showIcon message="No widget questions recorded yet" />
                                                ) : (
                                                    <List
                                                        size="small"
                                                        dataSource={activityItems}
                                                        renderItem={(item) => (
                                                            <List.Item>
                                                                <List.Item.Meta
                                                                    title={(
                                                                        <Flex gap={8} wrap="wrap" align="center">
                                                                            <Text strong style={{ wordBreak: 'break-word' }}>{item.query}</Text>
                                                                            {item.canonical ? <Tag color="success">Canonical</Tag> : <Tag>Fallback</Tag>}
                                                                            {item.feedback ? <Tag color={item.feedback === 'good' ? 'success' : 'warning'}>{item.feedback === 'good' ? 'Useful' : 'Needs review'}</Tag> : null}
                                                                        </Flex>
                                                                    )}
                                                                    description={(
                                                                        <Flex vertical gap={4}>
                                                                            <Text type="secondary">
                                                                                {formatActivityDate(item.createdAt)}
                                                                                {typeof item.referenceCount === 'number' ? ` - ${item.referenceCount} reference${item.referenceCount === 1 ? '' : 's'}` : ''}
                                                                                {item.confidence ? ` - ${item.confidence} confidence` : ''}
                                                                            </Text>
                                                                            {item.answerPreview ? (
                                                                                <Text type="secondary" style={{ wordBreak: 'break-word' }}>{item.answerPreview}</Text>
                                                                            ) : null}
                                                                        </Flex>
                                                                    )}
                                                                />
                                                            </List.Item>
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        </Flex>
                                    </Card>
                                </Col>

                                <Col xs={24} lg={12}>
                                    <Card title={<Flex align="center" gap={8}><LuCode size={16} /> Page Context</Flex>}>
                                        <Flex vertical gap={12}>
                                            <Paragraph style={{ margin: 0 }}>
                                                Send a stable contextKey plus page, feature, workflow, and entity hints after route changes. Do not send internal account IDs, workspace IDs, emails, or phone numbers.
                                            </Paragraph>
                                            <Input.TextArea
                                                value={spaSnippet}
                                                readOnly
                                                rows={7}
                                                style={{ fontFamily: 'monospace', fontSize: 12, background: token.colorFillTertiary, color: token.colorText }}
                                            />
                                            <Button icon={<LuCopy size={14} />} onClick={() => copyText(spaSnippet, 'Context snippet copied')} style={{ alignSelf: isMobile ? 'stretch' : 'flex-start' }}>
                                                Copy Context Snippet
                                            </Button>
                                        </Flex>
                                    </Card>
                                </Col>

                                <Col xs={24} lg={12}>
                                    <Card title={<Flex align="center" gap={8}><LuRefreshCw size={16} /> Runtime Updates</Flex>}>
                                        <Alert
                                            type="info"
                                            showIcon
                                            message="Installed widgets update automatically"
                                            description="Changes saved here are picked up by installed widgets automatically. Updates can take up to 60 seconds to appear."
                                        />
                                    </Card>
                                </Col>
                            </Row>
                        ),
                    },
                    {
                        key: CANONICA_WIDGET_TABS.HOSTED_HELP,
                        label: 'Hosted Help',
                        children: (
                            <Row gutter={[16, 16]}>
                                <Col xs={24} lg={10}>
                                    <Card title={<Flex align="center" gap={8}><LuGlobe size={16} /> Public Help Domain</Flex>}>
                                        <Flex vertical gap={14}>
                                            <Alert
                                                type="info"
                                                showIcon
                                                message="Hosted Help Center"
                                                description="Publish your docs, FAQ, and changelog on a customer-facing domain such as help.example.com. This is separate from the in-app widget."
                                            />
                                            <Flex align="center" justify="space-between" gap={12}>
                                                <Text strong>Enable hosted help</Text>
                                                <Switch
                                                    checked={hostedHelpConfig.enabled}
                                                    checkedChildren="On"
                                                    unCheckedChildren="Off"
                                                    onChange={(checked) => updateHostedHelpConfig('enabled', checked)}
                                                />
                                            </Flex>
                                            <Flex vertical gap={4}>
                                                <Text strong style={CONTROL_LABEL_STYLE}>Help domains</Text>
                                                <Flex gap={8} vertical={isMobile} align={isMobile ? 'stretch' : 'center'}>
                                                    <Input
                                                        value={newHostedDomain}
                                                        onChange={(event) => setNewHostedDomain(event.target.value)}
                                                        onPressEnter={addHostedDomain}
                                                        placeholder="https://help.example.com"
                                                    />
                                                    <Button icon={<LuGlobe size={14} />} onClick={addHostedDomain}>Add</Button>
                                                </Flex>
                                            </Flex>
                                            {hostedHelpConfig.domains.length > 0 ? (
                                                <Flex gap={8} wrap="wrap">
                                                    {hostedHelpConfig.domains.map(domain => {
                                                        const domainStatus = hostedHelpStatusByDomain.get(domain);
                                                        return (
                                                            <Tag
                                                                key={domain}
                                                                closable
                                                                color={getHostedHelpStatusColor(domainStatus)}
                                                                onClose={(event) => { event.preventDefault(); removeHostedDomain(domain); }}
                                                            >
                                                                {domain} · {getHostedHelpStatusLabel(domainStatus)}
                                                            </Tag>
                                                        );
                                                    })}
                                                </Flex>
                                            ) : (
                                                <Alert type="warning" showIcon message="Add at least one help domain before enabling hosted help." />
                                            )}
                                            <Flex vertical gap={4}>
                                                <Text strong style={CONTROL_LABEL_STYLE}>Primary domain</Text>
                                                <Select
                                                    value={hostedHelpConfig.primaryDomain || undefined}
                                                    placeholder="Select primary domain"
                                                    disabled={hostedHelpConfig.domains.length === 0}
                                                    onChange={(value) => updateHostedHelpConfig('primaryDomain', value)}
                                                    options={hostedHelpConfig.domains.map(domain => ({ value: domain, label: domain }))}
                                                />
                                            </Flex>
                                            {hostedHelpConfig.domains.length > 0 ? (
                                                <Button
                                                    icon={<LuRefreshCw size={14} />}
                                                    loading={checkingHostedDomains}
                                                    onClick={refreshHostedHelpDomains}
                                                    style={{ alignSelf: isMobile ? 'stretch' : 'flex-start' }}
                                                >
                                                    Check DNS Status
                                                </Button>
                                            ) : null}
                                        </Flex>
                                    </Card>
                                </Col>

                                <Col xs={24} lg={14}>
                                    <Card title={<Flex align="center" gap={8}><LuSettings size={16} /> Hosted Page Content</Flex>}>
                                        <Flex vertical gap={14}>
                                            <Row gutter={[12, 12]}>
                                                <Col xs={24} md={12}>
                                                    <Flex vertical gap={4}>
                                                        <Text strong style={CONTROL_LABEL_STYLE}>Page title</Text>
                                                        <Input
                                                            value={hostedHelpConfig.title}
                                                            maxLength={120}
                                                            onChange={(event) => updateHostedHelpConfig('title', event.target.value || DEFAULT_CANONICA_HOSTED_HELP_CONFIG.title)}
                                                        />
                                                    </Flex>
                                                </Col>
                                                <Col xs={24} md={12}>
                                                    <Flex vertical gap={4}>
                                                        <Text strong style={CONTROL_LABEL_STYLE}>Search indexing</Text>
                                                        <Segmented
                                                            block
                                                            value={hostedHelpConfig.noIndex ? 'noindex' : 'index'}
                                                            onChange={(value) => updateHostedHelpConfig('noIndex', value === 'noindex')}
                                                            options={[
                                                                { value: 'index', label: 'Allow indexing' },
                                                                { value: 'noindex', label: 'No index' },
                                                            ]}
                                                        />
                                                    </Flex>
                                                </Col>
                                                <Col xs={24}>
                                                    <Flex vertical gap={4}>
                                                        <Text strong style={CONTROL_LABEL_STYLE}>Description</Text>
                                                        <Input.TextArea
                                                            value={hostedHelpConfig.description}
                                                            maxLength={220}
                                                            rows={3}
                                                            onChange={(event) => updateHostedHelpConfig('description', event.target.value || DEFAULT_CANONICA_HOSTED_HELP_CONFIG.description)}
                                                        />
                                                    </Flex>
                                                </Col>
                                            </Row>
                                            <Row gutter={[12, 12]}>
                                                <Col xs={24} md={12}>
                                                    <Flex align="center" justify="space-between" gap={12}>
                                                        <div>
                                                            <Text strong>Show FAQ</Text>
                                                            <br />
                                                            <Text type="secondary" style={{ fontSize: 12 }}>Published FAQ only.</Text>
                                                        </div>
                                                        <Switch checked={hostedHelpConfig.showFaqs} onChange={(checked) => updateHostedHelpConfig('showFaqs', checked)} />
                                                    </Flex>
                                                </Col>
                                                <Col xs={24} md={12}>
                                                    <Flex align="center" justify="space-between" gap={12}>
                                                        <div>
                                                            <Text strong>Show changelog</Text>
                                                            <br />
                                                            <Text type="secondary" style={{ fontSize: 12 }}>Published release notes only.</Text>
                                                        </div>
                                                        <Switch checked={hostedHelpConfig.showChangelog} onChange={(checked) => updateHostedHelpConfig('showChangelog', checked)} />
                                                    </Flex>
                                                </Col>
                                            </Row>
                                            <Flex gap={8} wrap="wrap">
                                                <Button type="primary" icon={<LuSave size={14} />} loading={savingHostedHelp} onClick={handleSaveHostedHelp}>
                                                    Save Hosted Help
                                                </Button>
                                                <Button
                                                    icon={<LuCopy size={14} />}
                                                    disabled={!hostedHelpUrl}
                                                    onClick={() => copyText(`https://${hostedHelpUrl}`, 'Hosted help URL copied')}
                                                >
                                                    Copy URL
                                                </Button>
                                            </Flex>
                                        </Flex>
                                    </Card>
                                </Col>

                                <Col xs={24}>
                                    <Card title={<Flex align="center" gap={8}><LuShield size={16} /> DNS and Security</Flex>}>
                                        <Row gutter={[12, 12]}>
                                            <Col xs={24} md={8}>
                                                <Alert
                                                    type="info"
                                                    showIcon
                                                    message="DNS target"
                                                    description="Canonica adds the help domain to Vercel when you save. Point your DNS to the records shown here, then check DNS status."
                                                />
                                            </Col>
                                            <Col xs={24} md={8}>
                                                <Alert
                                                    type={hostedHelpConfig.enabled && primaryHostedHelpStatus?.verified ? 'success' : 'warning'}
                                                    showIcon
                                                    message={hostedHelpConfig.enabled ? 'Hosted help enabled' : 'Hosted help disabled'}
                                                    description={hostedHelpConfig.enabled
                                                        ? `Primary domain: ${hostedHelpUrl || 'not selected'} · ${getHostedHelpStatusLabel(primaryHostedHelpStatus)}`
                                                        : 'Save with a domain and enable when DNS is ready.'}
                                                />
                                            </Col>
                                            <Col xs={24} md={8}>
                                                <Alert
                                                    type="success"
                                                    showIcon
                                                    message="Cost protected"
                                                    description="Public pages use cached domain registry and published-content cache. Tickets, chat history, and feedback stay authenticated."
                                                />
                                            </Col>
                                            {hostedHelpUrl ? (
                                                <Col xs={24}>
                                                    <Flex vertical gap={8}>
                                                        <Text strong style={CONTROL_LABEL_STYLE}>DNS records for {hostedHelpUrl}</Text>
                                                        {primaryHostedHelpStatus?.error ? (
                                                            <Alert type="error" showIcon message={primaryHostedHelpStatus.error} />
                                                        ) : null}
                                                        <List
                                                            bordered
                                                            dataSource={hostedHelpDnsRecords}
                                                            renderItem={(record, index) => (
                                                                <List.Item
                                                                    actions={[
                                                                        <Button
                                                                            icon={<LuCopy size={14} />}
                                                                            key={`copy-dns-${index}`}
                                                                            onClick={() => copyText(record.value, 'DNS value copied')}
                                                                            size="small"
                                                                            type="text"
                                                                        >
                                                                            Copy
                                                                        </Button>,
                                                                    ]}
                                                                >
                                                                    <List.Item.Meta
                                                                        description={<Text code>{`${record.name} -> ${record.value}`}</Text>}
                                                                        title={<Flex align="center" gap={8}><Tag>{record.type}</Tag><Text>{record.name}</Text></Flex>}
                                                                    />
                                                                </List.Item>
                                                            )}
                                                            size="small"
                                                        />
                                                    </Flex>
                                                </Col>
                                            ) : null}
                                        </Row>
                                    </Card>
                                </Col>
                            </Row>
                        ),
                    },
                    {
                        key: CANONICA_WIDGET_TABS.ACCESS,
                        label: 'Access & Security',
                        children: (
                            <Row gutter={[16, 16]}>
                                <Col xs={24} lg={10}>
                                    <Card title={<Flex align="center" gap={8}><LuKey size={16} /> Widget Key</Flex>}>
                                        <Flex vertical gap={12}>
                                            <Flex align="center" justify="space-between" gap={12} wrap="wrap">
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {widgetKeyCount}/{keyLimit} active keys
                                                </Text>
                                                <Button
                                                    type={hasWidgetKey ? 'default' : 'primary'}
                                                    icon={<LuKey size={14} />}
                                                    loading={generatingKey}
                                                    disabled={!canCreateWidgetKey}
                                                    onClick={handleGenerateKey}
                                                >
                                                    Create API key
                                                </Button>
                                            </Flex>
                                            {widgetKeys.length > 0 ? (
                                                <List
                                                    dataSource={widgetKeys}
                                                    renderItem={(key) => (
                                                        <List.Item
                                                            actions={[
                                                                <Tooltip title="Copy API key" key="copy">
                                                                    <Button
                                                                        aria-label="Copy API key"
                                                                        icon={<LuCopy size={14} />}
                                                                        loading={copyingKeyId === key.id}
                                                                        disabled={!key.copyable && !revealedKeys[key.id]}
                                                                        size="small"
                                                                        type="text"
                                                                        onClick={() => handleCopyKey(key)}
                                                                    />
                                                                </Tooltip>,
                                                                <Tooltip title="Rename key" key="rename">
                                                                    <Button
                                                                        aria-label="Rename API key"
                                                                        icon={<LuPencil size={14} />}
                                                                        size="small"
                                                                        type="text"
                                                                        onClick={() => openRenameKey(key)}
                                                                    />
                                                                </Tooltip>,
                                                                <Popconfirm
                                                                    key="delete"
                                                                    title="Delete widget key?"
                                                                    description="Installed widgets using this key will stop working."
                                                                    okText="Delete"
                                                                    okButtonProps={{ danger: true }}
                                                                    onConfirm={() => handleDeleteKey(key)}
                                                                >
                                                                    <Tooltip title="Delete key">
                                                                        <Button
                                                                            aria-label="Delete API key"
                                                                            danger
                                                                            icon={<LuTrash2 size={14} />}
                                                                            loading={deletingKeyId === key.id}
                                                                            size="small"
                                                                            type="text"
                                                                        />
                                                                    </Tooltip>
                                                                </Popconfirm>,
                                                            ]}
                                                        >
                                                            <List.Item.Meta
                                                                title={(
                                                                    <Flex align="center" gap={8} wrap="wrap">
                                                                        <Text strong>{key.name}</Text>
                                                                        {key.isActive ? <Tag color="green">Active</Tag> : null}
                                                                        {key.legacy ? <Tag>One-time</Tag> : null}
                                                                    </Flex>
                                                                )}
                                                                description={(
                                                                    <Flex vertical gap={2}>
                                                                        <Text code>{revealedKeys[key.id] || key.displayKey}</Text>
                                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                                            Created {key.createdAt ? formatRuntimeDate(key.createdAt) : 'recently'}
                                                                        </Text>
                                                                    </Flex>
                                                                )}
                                                            />
                                                        </List.Item>
                                                    )}
                                                    size="small"
                                                />
                                            ) : (
                                                <Alert
                                                    type="warning"
                                                    showIcon
                                                    message="No widget key"
                                                    description="Create a widget key before copying install code."
                                                />
                                            )}
                                            {apiKey && (
                                                <Alert
                                                    type="success"
                                                    showIcon
                                                    message="Widget key copied into install snippets"
                                                    description="Use the install tab now; refresh will clear the visible raw key from this browser."
                                                />
                                            )}
                                            {!keyEncryptionConfigured && (
                                                <Alert
                                                    type="warning"
                                                    showIcon
                                                    message="Copy-anytime is not configured"
                                                    description="New keys still work and are shown after creation, but existing keys cannot be copied again until the server encryption secret is configured."
                                                />
                                            )}
                                            {!canCreateWidgetKey && (
                                                <Alert
                                                    type="info"
                                                    showIcon
                                                    message="Key limit reached"
                                                    description="Delete an unused key before creating another."
                                                />
                                            )}
                                        </Flex>
                                    </Card>
                                </Col>

                                <Col xs={24} lg={14}>
                                    <Card title={<Flex align="center" gap={8}><LuShield size={16} /> Allowed Origins</Flex>}>
                                        <Flex vertical gap={12}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                Add the exact app origins that may load and call the widget runtime APIs.
                                            </Text>
                                            <Flex gap={8} vertical={isMobile} align={isMobile ? 'stretch' : 'center'}>
                                                <Input
                                                    value={newOrigin}
                                                    onChange={(event) => setNewOrigin(event.target.value)}
                                                    onPressEnter={addOrigin}
                                                    placeholder="https://app.example.com"
                                                />
                                                <Button icon={<LuGlobe size={14} />} onClick={addOrigin}>Add</Button>
                                            </Flex>
                                            {origins.length > 0 ? (
                                                <Flex gap={8} wrap="wrap">
                                                    {origins.map(origin => (
                                                        <Tag key={origin} closable onClose={(event) => { event.preventDefault(); removeOrigin(origin); }}>
                                                            {origin}
                                                        </Tag>
                                                    ))}
                                                </Flex>
                                            ) : (
                                                <Alert type="warning" showIcon message="All origins are allowed until you add at least one origin." />
                                            )}
                                        </Flex>
                                    </Card>
                                </Col>

                                <Col xs={24}>
                                    <Card title={<Flex align="center" gap={8}><LuEyeOff size={16} /> Blocked Routes</Flex>}>
                                        <Flex vertical gap={12}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                Hide the widget on routes where your product already has its own help, support, or guided flow.
                                            </Text>
                                            <Flex gap={8} vertical={isMobile} align={isMobile ? 'stretch' : 'center'}>
                                                <Input
                                                    value={newBlockedRoute}
                                                    onChange={(event) => setNewBlockedRoute(event.target.value)}
                                                    onPressEnter={addBlockedRoute}
                                                    placeholder="/help-center or /help-center/*"
                                                />
                                                <Button icon={<LuEyeOff size={14} />} onClick={addBlockedRoute}>Add</Button>
                                            </Flex>
                                            {config.blockedRoutes.length > 0 ? (
                                                <Flex gap={8} wrap="wrap">
                                                    {config.blockedRoutes.map(route => (
                                                        <Tag key={route} closable onClose={(event) => { event.preventDefault(); removeBlockedRoute(route); }}>
                                                            {route}
                                                        </Tag>
                                                    ))}
                                                </Flex>
                                            ) : (
                                                <Alert type="info" showIcon message="The widget is visible on every route unless you add blocked routes." />
                                            )}
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                Use an exact route like /help-center, or include child pages with /help-center/*.
                                            </Text>
                                        </Flex>
                                    </Card>
                                </Col>
                            </Row>
                        ),
                    },
                ]}
            />

            {isMobile && (
                <div style={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: embeddedMobile ? 'calc(env(safe-area-inset-bottom) + 88px)' : 0,
                    zIndex: 20,
                    padding: '10px 12px',
                    background: token.colorBgContainer,
                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                }}>
                    <Button block type="primary" icon={<LuSave size={14} />} loading={saving} onClick={handleSave}>
                        Save Widget Settings
                    </Button>
                </div>
            )}
        </Flex>
        <Modal
            title="Rename API key"
            open={Boolean(renameKey)}
            okText="Rename"
            confirmLoading={renamingKey}
            onOk={handleRenameKey}
            onCancel={() => {
                setRenameKey(null);
                setRenameValue('');
            }}
            okButtonProps={{ disabled: !renameValue.trim() }}
        >
            <Input
                value={renameValue}
                maxLength={80}
                onChange={(event) => setRenameValue(event.target.value)}
                onPressEnter={handleRenameKey}
                placeholder="Widget key name"
            />
        </Modal>
        </>
    );
}

function WidgetPreview({ config, mode }: { config: CanonicaWidgetConfig; mode: 'desktop' | 'mobile' }) {
    const { token } = theme.useToken();
    const isPill = config.shape === 'pill';
    const isMobile = mode === 'mobile';
    const frameWidth = isMobile ? 280 : '100%';
    const frameHeight = isMobile ? 420 : 260;
    const launcherSize = config.size === 'small' ? 42 : config.size === 'large' ? 60 : 52;
    const launcherStyle = isPill
        ? {
            height: config.size === 'small' ? 34 : config.size === 'large' ? 48 : 40,
            minWidth: 86,
            padding: '0 16px',
            borderRadius: 999,
            fontSize: 13,
        }
        : {
            width: launcherSize,
            height: launcherSize,
            borderRadius: '50%',
            fontSize: config.size === 'small' ? 16 : config.size === 'large' ? 22 : 19,
        };

    return (
        <Flex justify="center">
            <div style={{
                width: frameWidth,
                maxWidth: '100%',
                height: frameHeight,
                position: 'relative',
                overflow: 'hidden',
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: isMobile ? 18 : 8,
                background: token.colorBgLayout,
            }}>
                <div style={{
                    height: 46,
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    background: token.colorBgContainer,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 14px',
                    gap: 6,
                }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: token.colorError }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: token.colorWarning }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: token.colorSuccess }} />
                </div>
                <div style={{ padding: 16 }}>
                    <div style={{ width: '48%', height: 12, borderRadius: 6, background: token.colorFillSecondary, marginBottom: 10 }} />
                    <div style={{ width: '72%', height: 10, borderRadius: 6, background: token.colorFillTertiary, marginBottom: 8 }} />
                    <div style={{ width: '62%', height: 10, borderRadius: 6, background: token.colorFillTertiary }} />
                </div>
                {config.mobileVisibility === 'hide' && isMobile ? (
                    <Tag style={{ position: 'absolute', bottom: 16, right: 16 }}>Hidden on mobile</Tag>
                ) : (
                    <div style={{
                        position: 'absolute',
                        ...(config.position.includes('bottom') || isMobile ? { bottom: 16 } : { top: 16 }),
                        ...(config.position.includes('right') || isMobile ? { right: 16 } : { left: 16 }),
                        display: config.launcherVisibility === 'manual' ? 'none' : 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: config.accentColor,
                        color: token.colorWhite,
                        fontWeight: 700,
                        boxShadow: token.boxShadowSecondary,
                        ...launcherStyle,
                    }}>
                        {config.label}
                    </div>
                )}
                {config.launcherVisibility === 'manual' && (
                    <Tag style={{ position: 'absolute', bottom: 16, left: 16 }}>Manual launcher</Tag>
                )}
            </div>
        </Flex>
    );
}

function PageAwarePreview() {
    const { token } = theme.useToken();

    return (
        <Card size="small" styles={{ body: { padding: 12 } }}>
            <Flex vertical gap={8}>
                <Flex align="center" justify="space-between" gap={8} wrap="wrap">
                    <Text strong>Page-aware response preview</Text>
                    <Tag color="blue">contextKey: billing_invoices</Tag>
                </Flex>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    When your app sends route context, Canonica boosts linked product surfaces before falling back to general help.
                </Text>
                <Flex gap={6} wrap="wrap">
                    <Tag>Billing</Tag>
                    <Tag>Invoices</Tag>
                    <Tag>Plans</Tag>
                </Flex>
                <div style={{
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: 8,
                    padding: 10,
                    background: token.colorFillTertiary,
                    fontSize: 13,
                    lineHeight: 1.5,
                }}>
                    Users on the billing page see billing articles, latest plan-change release notes, and ticket fallback only when approved answers are missing.
                </div>
            </Flex>
        </Card>
    );
}
