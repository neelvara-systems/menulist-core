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
    Space,
    Switch,
    Tag,
    Tabs,
    Tooltip,
    Typography,
    theme,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FEATURE_FLAGS } from '@config/features';
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
    LuExternalLink,
    LuListChecks,
} from 'react-icons/lu';
import {
    AnswerlatticeWidgetConfig,
    ANSWERLATTICE_WIDGET_CONFIG_SCHEMA_VERSION,
    DEFAULT_ANSWERLATTICE_WIDGET_CONFIG,
    buildAnswerlatticeWidgetEmbedCode,
    buildAnswerlatticeGuidedResolutionSnippet,
    buildAnswerlatticeWidgetRouteSnippet,
    normalizeWidgetBlockedRoute,
    normalizeWidgetAllowedOrigin,
    normalizeWidgetAllowedOrigins,
    normalizeWidgetConfig,
} from '@lib/answerlattice/widgetConfig';
import { getAnswerlatticeCustomerIdentity } from '@lib/answerlattice/customerIdentity';
import {
    copyAnswerlatticeSupportTextToClipboard,
    hasAnswerlatticeSupportClipboardWrite,
    hasAnswerlatticeSupportCopyFallback,
} from '@lib/answerlattice/supportClipboard';
import {
    ANSWERLATTICE_WIDGET_SCRIPT_URL,
} from '@lib/answerlattice/installContract/constants';
import { ANSWERLATTICE_FRAMEWORK_SNIPPETS } from '@lib/answerlattice/installContract/contract';
import {
    AnswerlatticeHostedHelpConfig,
    type AnswerlatticeHostedHelpDomainVerification,
    DEFAULT_ANSWERLATTICE_HOSTED_HELP_CONFIG,
    StrictHostedHelpConfigSaveSchema,
    normalizeHostedHelpConfig,
    normalizeHostedHelpDomains,
    parseHostedHelpConfigSaveInput,
} from '@lib/answerlattice/hostedHelpConfig';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import {
    isAnswerlatticeHostedHelpCandidateHostname,
    normalizeHostedHelpDomain,
} from '@constant/answerlattice/hostedHelp';
import type { AnswerlatticeWidgetRuntimeStatus } from '@type/answerlattice';
import {
    ANSWERLATTICE_DEFAULT_WIDGET_TAB,
    ANSWERLATTICE_ROUTES,
    ANSWERLATTICE_WIDGET_TABS,
    getAnswerlatticeWidgetRoute,
    getAnswerlatticeWidgetTabFromPathname,
    isAnswerlatticeWidgetTab,
    normalizeAnswerlatticeRoutePathname,
    toAnswerlatticeDashboardRoute,
} from '@constant/answerlattice/navigations';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import WidgetSecurityControls from './WidgetSecurityControls';

const { Title, Text, Paragraph } = Typography;
const ANSWERLATTICE_WIDGET_MANAGEMENT_COPY_CLIPBOARD_UNAVAILABLE = 'answerlattice_widget_management_copy_clipboard_unavailable';
const ANSWERLATTICE_WIDGET_MANAGEMENT_COPY_FALLBACK_FAILED = 'answerlattice_widget_management_copy_fallback_failed';

type SnippetType = 'html' | 'env' | 'spa' | 'guidance' | 'next' | 'react' | 'vue' | 'vanilla';
const FULL_WIDGET_KEY_PLACEHOLDER = 'al_full_widget_key_shown_once';
const ANSWERLATTICE_WIDGET_SETTINGS_LOAD_FAILED = 'Could not load widget settings';
const ANSWERLATTICE_WIDGET_SETTINGS_SAVE_FAILED = 'Could not save widget settings';
const ANSWERLATTICE_WIDGET_SETTINGS_CONFLICT = 'Widget settings changed in another session. Reload and review the latest settings before saving again.';
const ANSWERLATTICE_WIDGET_ACTIVITY_LOAD_FAILED = 'Could not load widget activity';
const ANSWERLATTICE_WIDGET_KEY_CREATE_FAILED = 'Could not create widget key';
const ANSWERLATTICE_WIDGET_KEY_RENAME_FAILED = 'Could not rename widget key';
const ANSWERLATTICE_WIDGET_KEY_REVOKE_FAILED = 'Could not revoke widget key';
const ANSWERLATTICE_HOSTED_HELP_SETTINGS_SAVE_FAILED = 'Could not save hosted help settings';
const ANSWERLATTICE_HOSTED_HELP_DNS_CHECK_FAILED = 'Could not check hosted help DNS';
const ANSWERLATTICE_WIDGET_MANAGEMENT_RESPONSE_JSON_MAX_BYTES = 256 * 1024;
const WIDGET_KEY_PATTERN = /^al_[A-Za-z0-9_-]{20,128}$/;
const ANSWERLATTICE_WIDGET_MANAGEMENT_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

type AnswerlatticeWidgetManagementProps = {
    embeddedMobile?: boolean;
    initialTab?: string;
};

type WidgetConfigResponse = {
    schemaVersion: typeof ANSWERLATTICE_WIDGET_CONFIG_SCHEMA_VERSION;
    config: Partial<AnswerlatticeWidgetConfig>;
    allowedOrigins: string[];
    keyPrefix: string | null;
    hasWidgetKey: boolean;
    keys: WidgetKeySummary[];
    keyLimit: number;
    encryptionConfigured: boolean;
    runtimeStatus?: AnswerlatticeWidgetRuntimeStatus | null;
    configVersion: number;
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
    visitorId?: string | null;
    visitorName?: string | null;
    visitorEmail?: string | null;
    visitorVerified?: boolean;
    evidenceLinks?: Array<{ url: string; label?: string | null }>;
    widgetSessionId?: string | null;
    requestOrigin?: string | null;
    requestPath?: string | null;
    contextKey?: string | null;
    surfacePage?: string | null;
    surfaceFeature?: string | null;
    createdAt?: string | null;
};

type HostedHelpSettingsResponse = {
    config: Partial<AnswerlatticeHostedHelpConfig>;
    domainStatuses: HostedHelpDomainStatus[];
};

const CONTROL_LABEL_STYLE = { fontSize: 12 } as const;

type HostedHelpDomainStatus = {
    domain: string;
    status?: 'pending' | 'verified' | 'error';
    verified?: boolean;
    verifiedAt?: string | null;
    lastCheckedAt?: string | null;
    verification?: AnswerlatticeHostedHelpDomainVerification | null;
    error?: string | null;
};

type WidgetManagementResponseKind =
    | 'widget_config_load'
    | 'hosted_help_settings_load'
    | 'widget_activity_load'
    | 'widget_config_save'
    | 'widget_key_create'
    | 'widget_key_rename'
    | 'widget_key_revoke'
    | 'hosted_help_settings_save'
    | 'hosted_help_dns_refresh';

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isBoundedString = (value: unknown, maximum: number, minimum = 0): value is string => (
    typeof value === 'string' && value.length >= minimum && value.length <= maximum
);

const isOptionalNullableBoundedString = (
    value: unknown,
    maximum: number,
): value is string | null | undefined => (
    value === undefined || value === null || isBoundedString(value, maximum)
);

const isOptionalBoundedString = (value: unknown, maximum: number): value is string | undefined => (
    value === undefined || isBoundedString(value, maximum)
);

const isCanonicalIsoTimestamp = (value: unknown): value is string => {
    if (!isBoundedString(value, 80, 1)) return false;
    const millis = Date.parse(value);
    return Number.isFinite(millis) && new Date(millis).toISOString() === value;
};

const isOptionalNullableCanonicalIsoTimestamp = (value: unknown): value is string | null | undefined => (
    value === undefined || value === null || isCanonicalIsoTimestamp(value)
);

const isSerializedFirestoreTimestamp = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    const secondsValues = [value.seconds, value._seconds].filter(candidate => candidate !== undefined);
    const nanosecondValues = [value.nanoseconds, value._nanoseconds].filter(candidate => candidate !== undefined);
    if (
        secondsValues.length === 0
        || !secondsValues.every(candidate => candidate === secondsValues[0])
        || !nanosecondValues.every(candidate => candidate === nanosecondValues[0])
    ) return false;
    const seconds = secondsValues[0];
    const nanoseconds = nanosecondValues[0] ?? 0;
    return isSafeIntegerInRange(seconds, 0, 253_402_300_799)
        && isSafeIntegerInRange(nanoseconds, 0, 999_999_999);
};

const isAnswerlatticeWidgetRuntimeStatus = (value: unknown): value is AnswerlatticeWidgetRuntimeStatus => {
    if (!isRecord(value)) return false;
    return (value.lastSeenAt === undefined
            || value.lastSeenAt === null
            || isCanonicalIsoTimestamp(value.lastSeenAt)
            || isSerializedFirestoreTimestamp(value.lastSeenAt))
        && isOptionalNullableBoundedString(value.lastOrigin, 180)
        && isOptionalNullableBoundedString(value.lastPath, 180)
        && isOptionalNullableBoundedString(value.lastContextKey, 120)
        && isOptionalNullableBoundedString(value.lastFeature, 120)
        && isOptionalNullableBoundedString(value.lastPage, 120)
        && (value.userAgentFamily === undefined
            || value.userAgentFamily === null
            || (typeof value.userAgentFamily === 'string'
                && ['edge', 'chrome', 'firefox', 'safari', 'other'].includes(value.userAgentFamily)))
        && (value.seenCount === undefined || isSafeIntegerInRange(value.seenCount, 0, 1_000_000_000));
};

const isSafeIntegerInRange = (value: unknown, minimum: number, maximum: number): value is number => (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= minimum
    && value <= maximum
);

const isStringArray = (value: unknown): value is string[] => (
    Array.isArray(value) && value.every(item => typeof item === 'string')
);

const isNullableString = (value: unknown): value is string | null => (
    value === null || typeof value === 'string'
);

const isOptionalNullableString = (value: unknown): value is string | null | undefined => (
    value === undefined || isNullableString(value)
);

const isWidgetKeySummary = (value: unknown): value is WidgetKeySummary => {
    if (!isRecord(value)) return false;
    return typeof value.id === 'string' && value.id === value.id.trim() && value.id.length >= 1 && value.id.length <= 120
        && typeof value.name === 'string' && value.name === value.name.trim() && value.name.length >= 1 && value.name.length <= 80
        && typeof value.keyPrefix === 'string' && value.keyPrefix.length >= 1 && value.keyPrefix.length <= 12
        && isOptionalNullableString(value.keySuffix)
        && (value.keySuffix === undefined || value.keySuffix === null || value.keySuffix.length <= 8)
        && typeof value.displayKey === 'string' && value.displayKey.length >= 1 && value.displayKey.length <= 24
        && isOptionalNullableString(value.createdAt)
        && isOptionalNullableString(value.updatedAt)
        && typeof value.copyable === 'boolean'
        && typeof value.legacy === 'boolean'
        && value.status === 'active'
        && typeof value.isActive === 'boolean';
};

const isWidgetKeySummaryArray = (value: unknown): value is WidgetKeySummary[] => (
    Array.isArray(value) && value.every(isWidgetKeySummary)
);

const hasValidWidgetKeyState = (value: Record<string, unknown>): boolean => {
    if (
        !isWidgetKeySummaryArray(value.keys)
        || !isNullableString(value.keyPrefix)
        || typeof value.hasWidgetKey !== 'boolean'
        || typeof value.encryptionConfigured !== 'boolean'
        || !isSafeIntegerInRange(value.keyLimit, 1, 100)
        || value.keys.length > value.keyLimit
        || new Set(value.keys.map((key) => key.id)).size !== value.keys.length
        || value.hasWidgetKey !== (value.keys.length > 0)
    ) return false;

    const activeKeys = value.keys.filter((key) => key.isActive);
    return activeKeys.length === (value.keys.length > 0 ? 1 : 0)
        && value.keyPrefix === (activeKeys[0]?.keyPrefix || null);
};

const isWidgetConfigResponse = (value: unknown): value is WidgetConfigResponse => {
    if (!isRecord(value)) return false;
    return isRecord(value.config)
        && value.schemaVersion === ANSWERLATTICE_WIDGET_CONFIG_SCHEMA_VERSION
        && isStringArray(value.allowedOrigins)
        && hasValidWidgetKeyState(value)
        && isSafeIntegerInRange(value.configVersion, 0, Number.MAX_SAFE_INTEGER)
        && (value.runtimeStatus === undefined || value.runtimeStatus === null || isAnswerlatticeWidgetRuntimeStatus(value.runtimeStatus));
};

const isHostedHelpDomainStatus = (value: unknown): value is HostedHelpDomainStatus => {
    if (!isRecord(value)) return false;
    return isBoundedString(value.domain, 253, 4)
        && (value.status === 'pending' || value.status === 'verified' || value.status === 'error')
        && typeof value.verified === 'boolean'
        && isOptionalNullableCanonicalIsoTimestamp(value.verifiedAt)
        && isOptionalNullableCanonicalIsoTimestamp(value.lastCheckedAt)
        && (
            value.verification === undefined
            || value.verification === null
            || isHostedHelpDomainVerification(value.verification)
        )
        && isOptionalNullableBoundedString(value.error, 120);
};

const isHostedHelpDnsRecord = (value: unknown) => (
    isRecord(value)
    && isBoundedString(value.type, 16, 1)
    && isOptionalBoundedString(value.domain, 253)
    && isOptionalBoundedString(value.name, 253)
    && isOptionalBoundedString(value.value, 1_024)
    && isOptionalBoundedString(value.reason, 240)
);

const isHostedHelpDomainVerification = (value: unknown): value is AnswerlatticeHostedHelpDomainVerification => (
    isRecord(value)
    && (value.misconfigured === null || typeof value.misconfigured === 'boolean')
    && Array.isArray(value.verificationRecords)
    && value.verificationRecords.length <= 20
    && value.verificationRecords.every(isHostedHelpDnsRecord)
    && Array.isArray(value.configuredBy)
    && value.configuredBy.length <= 20
    && value.configuredBy.every(isHostedHelpDnsRecord)
);

const isHostedHelpSettingsResponse = (value: unknown): value is HostedHelpSettingsResponse => {
    if (!isRecord(value) || !StrictHostedHelpConfigSaveSchema.safeParse(value.config).success) return false;
    let config: AnswerlatticeHostedHelpConfig;
    try {
        config = parseHostedHelpConfigSaveInput(value.config);
    } catch {
        return false;
    }
    return Array.isArray(value.domainStatuses)
        && value.domainStatuses.length <= 5
        && value.domainStatuses.length === config.domains.length
        && value.domainStatuses.every(isHostedHelpDomainStatus)
        && new Set(value.domainStatuses.map(status => status.domain)).size === value.domainStatuses.length
        && value.domainStatuses.every(status => config.domains.includes(status.domain));
};

const isWidgetActivityItem = (value: unknown): value is WidgetActivityItem => {
    if (!isRecord(value)) return false;
    return isBoundedString(value.id, 1_500, 1)
        && isBoundedString(value.query, 500)
        && isBoundedString(value.answerPreview, 220)
        && typeof value.canonical === 'boolean'
        && (value.confidence === null || isBoundedString(value.confidence, 40))
        && isSafeIntegerInRange(value.referenceCount, 0, 10_000)
        && (value.feedback === null || value.feedback === 'good' || value.feedback === 'bad')
        && (value.visitorId === null || isBoundedString(value.visitorId, 120))
        && (value.visitorName === null || isBoundedString(value.visitorName, 160))
        && (value.visitorEmail === null || isBoundedString(value.visitorEmail, 180))
        && typeof value.visitorVerified === 'boolean'
        && Array.isArray(value.evidenceLinks)
            && value.evidenceLinks.length <= 3
            && value.evidenceLinks.every(link => isRecord(link)
                && isBoundedString(link.url, 1_000, 9)
                && /^https:\/\//i.test(link.url)
                && isOptionalNullableBoundedString(link.label, 80))
        && (value.widgetSessionId === null || isBoundedString(value.widgetSessionId, 120))
        && (value.requestOrigin === null || isBoundedString(value.requestOrigin, 180))
        && (value.requestPath === null || isBoundedString(value.requestPath, 180))
        && (value.contextKey === null || isBoundedString(value.contextKey, 140))
        && (value.surfacePage === null || isBoundedString(value.surfacePage, 120))
        && (value.surfaceFeature === null || isBoundedString(value.surfaceFeature, 120))
        && (value.createdAt === null || isCanonicalIsoTimestamp(value.createdAt));
};

const isWidgetActivityResponse = (value: unknown): value is { items: WidgetActivityItem[] } => (
    isRecord(value)
    && Array.isArray(value.items)
    && value.items.length <= 12
    && value.items.every(isWidgetActivityItem)
    && new Set(value.items.map((item) => item.id)).size === value.items.length
);

type WidgetKeyBaseResponse = {
    keys: WidgetKeySummary[];
    keyPrefix: string | null;
    hasWidgetKey: boolean;
    encryptionConfigured: boolean;
    keyLimit: number;
};

type WidgetKeyCreateResponse = WidgetKeyBaseResponse & {
    apiKey: string;
    key: WidgetKeySummary;
    copyable: boolean;
};

type WidgetKeyMutationResponse = WidgetKeyBaseResponse & {
    success: true;
};

const isWidgetKeyBaseResponse = (value: unknown): value is WidgetKeyBaseResponse => {
    return isRecord(value) && hasValidWidgetKeyState(value);
};

const isWidgetKeyCreateResponse = (value: unknown): value is WidgetKeyCreateResponse => {
    if (!isWidgetKeyBaseResponse(value) || !isRecord(value)) return false;
    const record = value as Record<string, unknown>;
    const createdKey = record.key;
    if (
        typeof record.apiKey !== 'string'
        || !WIDGET_KEY_PATTERN.test(record.apiKey)
        || !isWidgetKeySummary(createdKey)
        || record.copyable !== false
        || createdKey.keyPrefix !== record.apiKey.slice(0, 7)
        || createdKey.keySuffix !== record.apiKey.slice(-4)
    ) return false;
    const listedKey = value.keys.find((key) => key.id === createdKey.id);
    return Boolean(listedKey)
        && listedKey?.keyPrefix === createdKey.keyPrefix
        && listedKey?.keySuffix === createdKey.keySuffix;
};

const isWidgetKeyMutationResponse = (value: unknown): value is WidgetKeyMutationResponse => {
    if (!isWidgetKeyBaseResponse(value) || !isRecord(value)) return false;
    const record = value as Record<string, unknown>;
    return record.success === true;
};

const getWidgetManagementResponseLogContext = (
    kind: WidgetManagementResponseKind,
    response: Response,
) => ({
    surface: 'answerlattice_widget_management',
    ...getBoundedRuntimeStringContext('responseKind', kind),
    responseOk: response.ok,
    responseStatus: response.status,
});

const readWidgetManagementResponse = async <T,>(
    response: Response,
    kind: WidgetManagementResponseKind,
    isValid: (value: unknown) => value is T,
    failureMessage: string,
): Promise<T> => {
    const context = getWidgetManagementResponseLogContext(kind, response);
    let payload: unknown;

    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            ANSWERLATTICE_WIDGET_MANAGEMENT_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logRuntimeFailure('answerlattice_widget_management_response_parse_failed', error, context);
        throw new Error(failureMessage);
    }

    if (!response.ok) {
        logRuntimeFailure('answerlattice_widget_management_response_rejected', undefined, context);
        throw new Error(failureMessage);
    }

    if (!isValid(payload)) {
        logRuntimeFailure('answerlattice_widget_management_response_invalid', undefined, context);
        throw new Error(failureMessage);
    }

    return payload;
};

function normalizeHostedHelpDnsRecords(config: AnswerlatticeHostedHelpDomainVerification | null | undefined, domain: string) {
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

const getWidgetActivityLocation = (item: WidgetActivityItem): string | null => {
    const parts = [
        item.requestPath || item.surfacePage || item.contextKey,
        item.requestOrigin,
    ].filter(Boolean);
    return parts.length ? parts.join(' - ') : null;
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

const GUIDED_RESOLUTION_UI_ENABLED = (
    FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS
    && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GUIDED_RESOLUTION
);

export default function AnswerlatticeWidgetManagement({ embeddedMobile = false, initialTab }: AnswerlatticeWidgetManagementProps) {
    const { token } = theme.useToken();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const compactActionStyle = isMobile ? { minWidth: 44, minHeight: 44 } : undefined;
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const normalizedPathname = normalizeAnswerlatticeRoutePathname(pathname);
    const legacyRequestedTab = searchParams.get('tab');
    const requestedTab = (
        isAnswerlatticeWidgetTab(initialTab)
            ? initialTab
            : (isAnswerlatticeWidgetTab(legacyRequestedTab) ? legacyRequestedTab : ANSWERLATTICE_DEFAULT_WIDGET_TAB)
    );

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generatingKey, setGeneratingKey] = useState(false);
    const keyGenerationInFlightRef = useRef(false);
    const [config, setConfig] = useState<AnswerlatticeWidgetConfig>(DEFAULT_ANSWERLATTICE_WIDGET_CONFIG);
    const [configVersion, setConfigVersion] = useState(0);
    const [origins, setOrigins] = useState<string[]>([]);
    const [newOrigin, setNewOrigin] = useState('');
    const [newBlockedRoute, setNewBlockedRoute] = useState('');
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({});
    const [keyPrefix, setKeyPrefix] = useState<string | null>(null);
    const [hasWidgetKey, setHasWidgetKey] = useState(false);
    const [widgetKeys, setWidgetKeys] = useState<WidgetKeySummary[]>([]);
    const [keyLimit, setKeyLimit] = useState(10);
    const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
    const [renameKey, setRenameKey] = useState<WidgetKeySummary | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [renamingKey, setRenamingKey] = useState(false);
    const [runtimeStatus, setRuntimeStatus] = useState<AnswerlatticeWidgetRuntimeStatus | null>(null);
    const [activityItems, setActivityItems] = useState<WidgetActivityItem[]>([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityError, setActivityError] = useState<string | null>(null);
    const [hostedHelpConfig, setHostedHelpConfig] = useState<AnswerlatticeHostedHelpConfig>(DEFAULT_ANSWERLATTICE_HOSTED_HELP_CONFIG);
    const [hostedHelpDomainStatuses, setHostedHelpDomainStatuses] = useState<HostedHelpDomainStatus[]>([]);
    const [newHostedDomain, setNewHostedDomain] = useState('');
    const [savingHostedHelp, setSavingHostedHelp] = useState(false);
    const [checkingHostedDomains, setCheckingHostedDomains] = useState(false);
    const [snippetType, setSnippetType] = useState<SnippetType>('html');
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [scriptSrc, setScriptSrc] = useState(ANSWERLATTICE_WIDGET_SCRIPT_URL);
    const [dirty, setDirty] = useState(false);
    const [hostedHelpDirty, setHostedHelpDirty] = useState(false);
    const [activeTab, setActiveTab] = useState<string>(requestedTab);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setScriptSrc(`${window.location.origin}/widget/v1/answerlattice-widget.js`);
        }
    }, []);

    const loadSettings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/answerlattice/widget-config', {
                ...ANSWERLATTICE_WIDGET_MANAGEMENT_REQUEST_POLICY,
                method: 'GET',
            });
            const data = await readWidgetManagementResponse(
                res,
                'widget_config_load',
                isWidgetConfigResponse,
                ANSWERLATTICE_WIDGET_SETTINGS_LOAD_FAILED,
            );
            setConfig(normalizeWidgetConfig(data.config));
            setConfigVersion(data.configVersion);
            setOrigins(normalizeWidgetAllowedOrigins(data.allowedOrigins));
            setKeyPrefix(data.keyPrefix);
            setHasWidgetKey(data.hasWidgetKey);
            setWidgetKeys(data.keys);
            setKeyLimit(data.keyLimit);
            setRuntimeStatus(data.runtimeStatus || null);

            try {
                const hostedRes = await fetch('/api/answerlattice/hosted-help-settings', {
                    ...ANSWERLATTICE_WIDGET_MANAGEMENT_REQUEST_POLICY,
                    method: 'GET',
                });
                const hostedData = await readWidgetManagementResponse(
                    hostedRes,
                    'hosted_help_settings_load',
                    isHostedHelpSettingsResponse,
                    ANSWERLATTICE_WIDGET_SETTINGS_LOAD_FAILED,
                );
                setHostedHelpConfig(normalizeHostedHelpConfig(hostedData.config));
                setHostedHelpDomainStatuses(hostedData.domainStatuses);
                setHostedHelpDirty(false);
            } catch (error) {
                logRuntimeFailure('answerlattice_widget_management_hosted_help_load_failed', error, {
                    surface: 'answerlattice_widget_management',
                });
            }

            setDirty(false);
        } catch {
            message.error(ANSWERLATTICE_WIDGET_SETTINGS_LOAD_FAILED);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadWidgetActivity = useCallback(async () => {
        setActivityLoading(true);
        setActivityError(null);
        try {
            const res = await fetch('/api/answerlattice/widget-activity', {
                ...ANSWERLATTICE_WIDGET_MANAGEMENT_REQUEST_POLICY,
                method: 'GET',
            });
            const data = await readWidgetManagementResponse(
                res,
                'widget_activity_load',
                isWidgetActivityResponse,
                ANSWERLATTICE_WIDGET_ACTIVITY_LOAD_FAILED,
            );
            setActivityItems(data.items);
        } catch {
            setActivityError(ANSWERLATTICE_WIDGET_ACTIVITY_LOAD_FAILED);
            setActivityItems([]);
        } finally {
            setActivityLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
        loadWidgetActivity();
    }, [loadSettings, loadWidgetActivity]);

    const updateConfig = useCallback(<K extends keyof AnswerlatticeWidgetConfig>(
        key: K,
        value: AnswerlatticeWidgetConfig[K],
    ) => {
        setConfig(prev => normalizeWidgetConfig({ ...prev, [key]: value }));
        setDirty(true);
    }, []);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/answerlattice/widget-config', {
                ...ANSWERLATTICE_WIDGET_MANAGEMENT_REQUEST_POLICY,
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config,
                    allowedOrigins: origins,
                    expectedConfigVersion: configVersion,
                }),
            });
            if (res.status === 409) {
                message.warning(ANSWERLATTICE_WIDGET_SETTINGS_CONFLICT);
                return;
            }
            const data = await readWidgetManagementResponse(
                res,
                'widget_config_save',
                isWidgetConfigResponse,
                ANSWERLATTICE_WIDGET_SETTINGS_SAVE_FAILED,
            );
            setConfig(normalizeWidgetConfig(data.config));
            setConfigVersion(data.configVersion);
            setOrigins(normalizeWidgetAllowedOrigins(data.allowedOrigins));
            setKeyPrefix(data.keyPrefix);
            setHasWidgetKey(data.hasWidgetKey);
            setWidgetKeys(data.keys);
            setKeyLimit(data.keyLimit);
            if ('runtimeStatus' in data) {
                setRuntimeStatus(data.runtimeStatus || null);
            }
            setDirty(false);
            message.success('Widget settings saved');
        } catch {
            message.error(ANSWERLATTICE_WIDGET_SETTINGS_SAVE_FAILED);
        } finally {
            setSaving(false);
        }
    }, [config, configVersion, origins]);

    const handleGenerateKey = useCallback(async () => {
        if (keyGenerationInFlightRef.current) return;
        keyGenerationInFlightRef.current = true;
        setGeneratingKey(true);
        try {
            const res = await fetch('/api/answerlattice/widget-key', {
                ...ANSWERLATTICE_WIDGET_MANAGEMENT_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate', name: `Widget key ${widgetKeys.length + 1}` }),
            });
            const data = await readWidgetManagementResponse(
                res,
                'widget_key_create',
                isWidgetKeyCreateResponse,
                ANSWERLATTICE_WIDGET_KEY_CREATE_FAILED,
            );
            setApiKey(data.apiKey);
            setRevealedKeys(prev => ({ ...prev, [data.key.id]: data.apiKey }));
            setKeyPrefix(data.keyPrefix);
            setHasWidgetKey(data.hasWidgetKey);
            setWidgetKeys(data.keys);
            setKeyLimit(data.keyLimit);
            message.success('Widget key created');
        } catch {
            message.error(ANSWERLATTICE_WIDGET_KEY_CREATE_FAILED);
        } finally {
            keyGenerationInFlightRef.current = false;
            setGeneratingKey(false);
        }
    }, [widgetKeys]);

    const handleCopyKey = useCallback(async (key: WidgetKeySummary) => {
        const revealedKey = revealedKeys[key.id];
        if (revealedKey) {
            copyText(revealedKey, 'Widget key copied');
            setApiKey(revealedKey);
            return;
        }

        message.warning('Widget keys are shown only once. Create a new key if the raw value was lost.');
    }, [revealedKeys]);

    const handleRenameKey = useCallback(async () => {
        if (!renameKey) return;
        setRenamingKey(true);
        try {
            const res = await fetch('/api/answerlattice/widget-key', {
                ...ANSWERLATTICE_WIDGET_MANAGEMENT_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'rename', keyId: renameKey.id, name: renameValue }),
            });
            const data = await readWidgetManagementResponse(
                res,
                'widget_key_rename',
                isWidgetKeyMutationResponse,
                ANSWERLATTICE_WIDGET_KEY_RENAME_FAILED,
            );
            setWidgetKeys(data.keys);
            setKeyPrefix(data.keyPrefix);
            setHasWidgetKey(data.hasWidgetKey);
            setRenameKey(null);
            setRenameValue('');
            message.success('Widget key renamed');
        } catch {
            message.error(ANSWERLATTICE_WIDGET_KEY_RENAME_FAILED);
        } finally {
            setRenamingKey(false);
        }
    }, [renameKey, renameValue]);

    const openRenameKey = useCallback((key: WidgetKeySummary) => {
        setRenameKey(key);
        setRenameValue(key.name);
    }, []);

    const handleRevokeKey = useCallback(async (key: WidgetKeySummary) => {
        setRevokingKeyId(key.id);
        try {
            const res = await fetch('/api/answerlattice/widget-key', {
                ...ANSWERLATTICE_WIDGET_MANAGEMENT_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'revoke', keyId: key.id }),
            });
            const data = await readWidgetManagementResponse(
                res,
                'widget_key_revoke',
                isWidgetKeyMutationResponse,
                ANSWERLATTICE_WIDGET_KEY_REVOKE_FAILED,
            );
            setWidgetKeys(data.keys);
            setKeyPrefix(data.keyPrefix);
            setHasWidgetKey(data.hasWidgetKey);
            setRevealedKeys(prev => {
                const next = { ...prev };
                delete next[key.id];
                return next;
            });
            if (revealedKeys[key.id] === apiKey) {
                setApiKey(null);
            }
            message.success('Widget key revoked');
        } catch {
            message.error(ANSWERLATTICE_WIDGET_KEY_REVOKE_FAILED);
        } finally {
            setRevokingKeyId(null);
        }
    }, [apiKey, revealedKeys]);

    const addOrigin = useCallback(() => {
        const normalized = normalizeWidgetAllowedOrigin(newOrigin);
        if (!normalized) {
            message.error('Enter an exact HTTP or HTTPS origin without a path');
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

    const updateHostedHelpConfig = useCallback(<K extends keyof AnswerlatticeHostedHelpConfig>(
        key: K,
        value: AnswerlatticeHostedHelpConfig[K],
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
        if (!isAnswerlatticeHostedHelpCandidateHostname(normalized)) {
            message.error('Use a help, docs, support, kb, knowledge, or answers domain.');
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
            const res = await fetch('/api/answerlattice/hosted-help-settings', {
                ...ANSWERLATTICE_WIDGET_MANAGEMENT_REQUEST_POLICY,
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: hostedHelpConfig }),
            });
            const data = await readWidgetManagementResponse(
                res,
                'hosted_help_settings_save',
                isHostedHelpSettingsResponse,
                ANSWERLATTICE_HOSTED_HELP_SETTINGS_SAVE_FAILED,
            );
            setHostedHelpConfig(normalizeHostedHelpConfig(data.config));
            setHostedHelpDomainStatuses(data.domainStatuses);
            setHostedHelpDirty(false);
            message.success('Hosted Help Center settings saved');
        } catch {
            message.error(ANSWERLATTICE_HOSTED_HELP_SETTINGS_SAVE_FAILED);
        } finally {
            setSavingHostedHelp(false);
        }
    }, [hostedHelpConfig]);

    const refreshHostedHelpDomains = useCallback(async () => {
        setCheckingHostedDomains(true);
        try {
            const res = await fetch('/api/answerlattice/hosted-help-settings?refreshDomains=1', {
                ...ANSWERLATTICE_WIDGET_MANAGEMENT_REQUEST_POLICY,
                method: 'GET',
            });
            const data = await readWidgetManagementResponse(
                res,
                'hosted_help_dns_refresh',
                isHostedHelpSettingsResponse,
                ANSWERLATTICE_HOSTED_HELP_DNS_CHECK_FAILED,
            );
            setHostedHelpConfig(normalizeHostedHelpConfig(data.config));
            setHostedHelpDomainStatuses(data.domainStatuses);
            message.success('Hosted Help DNS status updated');
        } catch {
            message.error(ANSWERLATTICE_HOSTED_HELP_DNS_CHECK_FAILED);
        } finally {
            setCheckingHostedDomains(false);
        }
    }, []);

    const embedCode = useMemo(() => buildAnswerlatticeWidgetEmbedCode({
        apiKey: apiKey || FULL_WIDGET_KEY_PLACEHOLDER,
        config,
        scriptSrc,
    }), [apiKey, config, scriptSrc]);
    const spaSnippet = useMemo(() => buildAnswerlatticeWidgetRouteSnippet(), []);
    const guidanceSnippet = useMemo(() => buildAnswerlatticeGuidedResolutionSnippet(), []);
    const envSnippet = useMemo(() => [
        '# Next.js / Vercel',
        `NEXT_PUBLIC_ANSWERLATTICE_WIDGET_KEY=${apiKey || FULL_WIDGET_KEY_PLACEHOLDER}`,
        `NEXT_PUBLIC_ANSWERLATTICE_WIDGET_SCRIPT_SRC=${scriptSrc}`,
        '',
        '# Vite / React SPA',
        `VITE_ANSWERLATTICE_WIDGET_KEY=${apiKey || FULL_WIDGET_KEY_PLACEHOLDER}`,
        `VITE_ANSWERLATTICE_WIDGET_SCRIPT_SRC=${scriptSrc}`,
        '',
        '# Nuxt',
        `NUXT_PUBLIC_ANSWERLATTICE_WIDGET_KEY=${apiKey || FULL_WIDGET_KEY_PLACEHOLDER}`,
        `NUXT_PUBLIC_ANSWERLATTICE_WIDGET_SCRIPT_SRC=${scriptSrc}`,
        '',
        '# Keep these out of browser env:',
        '# Firebase service accounts, admin credentials, private API keys, tenant IDs, store IDs, user IDs, and customer records.',
    ].join('\n'), [apiKey, scriptSrc]);
    const nextSnippet = useMemo(() => ANSWERLATTICE_FRAMEWORK_SNIPPETS.nextjs, []);
    const reactSnippet = useMemo(() => ANSWERLATTICE_FRAMEWORK_SNIPPETS.react, []);
    const vueSnippet = useMemo(() => ANSWERLATTICE_FRAMEWORK_SNIPPETS.vue, []);
    const vanillaSnippet = useMemo(() => [
        embedCode,
        '',
        '<script>',
        '  window.addEventListener("load", function () {',
        '    window.AnswerlatticeWidget?.page({',
        "      path: window.location.pathname,",
        "      title: document.title,",
        "      feature: 'billing',",
        "      workflow: 'manage_subscription',",
        "      role: 'member',",
        "      locale: navigator.language || 'en',",
        '    });',
        '    window.AnswerlatticeWidget?.identify?.({',
        "      id: currentUser?.supportCustomerId,",
        "      name: currentUser?.name,",
        "      email: currentUser?.email,",
        '    });',
        '  });',
        '</script>',
    ].join('\n'), [embedCode]);

    const snippetByType: Record<SnippetType, string> = {
        html: embedCode,
        env: envSnippet,
        spa: spaSnippet,
        guidance: guidanceSnippet,
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
            description: hasWidgetKey
                ? `Saved key identifier: ${primaryWidgetKey?.keyPrefix || keyPrefix || 'available'}. Use the full one-time key value in your app environment.`
                : 'Create the key before copying install code.',
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
                : 'Add route context so Answerlattice can answer for the current screen.',
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
            await copyAnswerlatticeSupportTextToClipboard(value, {
                unavailable: ANSWERLATTICE_WIDGET_MANAGEMENT_COPY_CLIPBOARD_UNAVAILABLE,
                fallbackFailed: ANSWERLATTICE_WIDGET_MANAGEMENT_COPY_FALLBACK_FAILED,
            });
            message.success(successMessage);
        } catch (error) {
            logRuntimeFailure('answerlattice_widget_management_copy_failed', error, {
                surface: 'answerlattice_widget_management',
                hasClipboardWrite: hasAnswerlatticeSupportClipboardWrite(),
                hasCopyFallback: hasAnswerlatticeSupportCopyFallback(),
                ...getBoundedRuntimeStringContext('copyValue', value),
                ...getBoundedRuntimeStringContext('successMessage', successMessage),
            });
            message.error('Unable to copy');
        }
    }, []);

    const handleRefresh = useCallback(() => {
        loadSettings();
        loadWidgetActivity();
    }, [loadSettings, loadWidgetActivity]);

    useEffect(() => {
        const nextTab = isAnswerlatticeWidgetTab(requestedTab) ? requestedTab : ANSWERLATTICE_DEFAULT_WIDGET_TAB;
        setActiveTab(nextTab);

        const activePathTab = getAnswerlatticeWidgetTabFromPathname(normalizedPathname);
        const shouldNormalizeRoute = (
            normalizedPathname === ANSWERLATTICE_ROUTES.WIDGET ||
            Boolean(legacyRequestedTab) ||
            activePathTab !== nextTab
        );

        if (shouldNormalizeRoute) {
            router.replace(
                toAnswerlatticeDashboardRoute(getAnswerlatticeWidgetRoute(nextTab), currentHostname),
                { scroll: false },
            );
        }
    }, [currentHostname, legacyRequestedTab, normalizedPathname, requestedTab, router]);

    const handleTabChange = useCallback((key: string) => {
        setActiveTab(key);
        router.replace(
            toAnswerlatticeDashboardRoute(getAnswerlatticeWidgetRoute(key), currentHostname),
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
                    <Text type="secondary">Install, configure, and secure the Answerlattice help widget.</Text>
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
                        key: ANSWERLATTICE_WIDGET_TABS.UI,
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
                                                        onChange={(value) => updateConfig('shape', value as AnswerlatticeWidgetConfig['shape'])}
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
                                                        onChange={(value) => updateConfig('display', value as AnswerlatticeWidgetConfig['display'])}
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
                                                        onChange={(event) => updateConfig('headerTitle', event.target.value || DEFAULT_ANSWERLATTICE_WIDGET_CONFIG.headerTitle)}
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
                                                        onChange={(event) => updateConfig('greeting', event.target.value || DEFAULT_ANSWERLATTICE_WIDGET_CONFIG.greeting)}
                                                        placeholder="How can we help?"
                                                    />
                                                </Flex>
                                            </Col>
                                            <Col xs={12} sm={8}>
                                            <Flex vertical gap={4}>
                                                <Text strong style={CONTROL_LABEL_STYLE}>Side spacing</Text>
                                                <InputNumber value={config.offsetX} min={0} max={200} style={{ width: '100%' }} onChange={(value) => updateConfig('offsetX', Number(value ?? 20))} />
                                            </Flex>
                                        </Col>
                                        <Col xs={12} sm={8}>
                                            <Flex vertical gap={4}>
                                                <Text strong style={CONTROL_LABEL_STYLE}>Bottom spacing</Text>
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
                                                    onChange={(value) => updateConfig('historyMode', value as AnswerlatticeWidgetConfig['historyMode'])}
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
                                                    onChange={(value) => updateConfig('launcherVisibility', value as AnswerlatticeWidgetConfig['launcherVisibility'])}
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
                                                    onChange={(value) => updateConfig('mobileVisibility', value as AnswerlatticeWidgetConfig['mobileVisibility'])}
                                                    options={[
                                                        { value: 'show', label: 'Show' },
                                                        { value: 'hide', label: 'Hide' },
                                                    ]}
                                                />
                                            </Flex>
                                            {GUIDED_RESOLUTION_UI_ENABLED && (
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Guided resolution</Text>
                                                    <Switch
                                                        checked={config.guidedResolutionEnabled}
                                                        checkedChildren="Enabled"
                                                        unCheckedChildren="Disabled"
                                                        onChange={(checked) => updateConfig('guidedResolutionEnabled', checked)}
                                                    />
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        <LuListChecks size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
                                                        Highlight semantic targets for approved procedures. The widget never clicks or changes product data.
                                                    </Text>
                                                </Flex>
                                            )}
                                            <Flex vertical gap={4}>
                                                <Text strong style={CONTROL_LABEL_STYLE}>Layer priority</Text>
                                                <InputNumber value={config.zIndex} min={1000} max={2147483646} style={{ width: '100%' }} onChange={(value) => updateConfig('zIndex', Number(value ?? DEFAULT_ANSWERLATTICE_WIDGET_CONFIG.zIndex))} />
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
                        key: ANSWERLATTICE_WIDGET_TABS.INSTALL,
                        label: 'Install & Embed',
                        children: (
                            <Row gutter={[16, 16]}>
                                <Col xs={24}>
                                    <Alert
                                        type="info"
                                        showIcon
                                        message="Use Install Center for agent packets and verification"
                                        description="The dedicated dashboard route keeps the AI install packet, agent files, framework guides, current setup, and runtime verification in one place."
                                        action={(
                                            <Button
                                                type="primary"
                                                icon={<LuCode size={14} />}
                                                onClick={() => router.push(toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.INSTALL_CENTER, currentHostname))}
                                            >
                                                Open Install Center
                                            </Button>
                                        )}
                                    />
                                </Col>

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
                                                    { value: 'spa', label: 'Route Context' },
                                                    ...(GUIDED_RESOLUTION_UI_ENABLED
                                                        ? [{ value: 'guidance', label: 'Guided Steps' }]
                                                        : []),
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
                                            {!apiKey && (
                                                <Alert
                                                    type="warning"
                                                    showIcon
                                                    message="Snippet uses a placeholder key"
                                                    description="Widget keys are shown only once after creation. Create a key, store the full al_* value in your app environment, then replace the placeholder before install."
                                                />
                                            )}
                                            <Alert
                                                type="info"
                                                showIcon
                                                message="Recommended: keep widget values in environment variables"
                                                description="Use client-safe env names for the public al_* widget key and optional script source. Do not put Firebase service accounts, admin credentials, private API keys, tenant IDs, store IDs, user IDs, or customer records in browser env."
                                            />
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                The script reads saved dashboard settings automatically. New installs should use the v1 script URL and the window.AnswerlatticeWidget browser contract directly.
                                            </Text>
                                            {snippetType === 'guidance' && (
                                                <Alert
                                                    type="warning"
                                                    showIcon
                                                    message="Guidance cannot operate your product"
                                                    description="Semantic targets only highlight controls. Workflow events should be emitted after your own product verifies a state change. Never expose form values, tokens, private state, tenant IDs, or customer records."
                                                />
                                            )}
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
                                                        renderItem={(item) => {
                                                            const requester = getAnswerlatticeCustomerIdentity(item as any);
                                                            const location = getWidgetActivityLocation(item);
                                                            return (
                                                                <List.Item>
                                                                    <List.Item.Meta
                                                                        title={(
                                                                            <Flex gap={8} wrap="wrap" align="center">
                                                                                <Text strong style={{ wordBreak: 'break-word' }}>{item.query}</Text>
                                                                                {item.canonical ? <Tag color="success">Canonical</Tag> : <Tag>Fallback</Tag>}
                                                                                {item.visitorVerified ? <Tag color="processing">Verified user</Tag> : null}
                                                                                {item.feedback ? <Tag color={item.feedback === 'good' ? 'success' : 'warning'}>{item.feedback === 'good' ? 'Useful' : 'Needs review'}</Tag> : null}
                                                                            </Flex>
                                                                        )}
                                                                        description={(
                                                                            <Flex vertical gap={4}>
                                                                                <Text type="secondary">
                                                                                    {requester.displayName}
                                                                                    {requester.email ? ` - ${requester.email}` : ''}
                                                                                    {requester.sessionId ? ` - session ${requester.sessionId}` : ''}
                                                                                </Text>
                                                                                <Text type="secondary">
                                                                                    {formatActivityDate(item.createdAt)}
                                                                                    {typeof item.referenceCount === 'number' ? ` - ${item.referenceCount} reference${item.referenceCount === 1 ? '' : 's'}` : ''}
                                                                                    {item.confidence ? ` - ${item.confidence} confidence` : ''}
                                                                                </Text>
                                                                                {location ? (
                                                                                    <Text type="secondary" style={{ wordBreak: 'break-all' }}>{location}</Text>
                                                                                ) : null}
                                                                                {item.answerPreview ? (
                                                                                    <Text type="secondary" style={{ wordBreak: 'break-word' }}>{item.answerPreview}</Text>
                                                                                ) : null}
                                                                                {item.evidenceLinks && item.evidenceLinks.length > 0 ? (
                                                                                    <Space size={[6, 6]} wrap>
                                                                                        {item.evidenceLinks.map(link => (
                                                                                            <Button
                                                                                                key={link.url}
                                                                                                href={link.url}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                icon={<LuExternalLink size={12} />}
                                                                                                size="small"
                                                                                            >
                                                                                                {link.label || 'Debug evidence'}
                                                                                            </Button>
                                                                                        ))}
                                                                                    </Space>
                                                                                ) : null}
                                                                            </Flex>
                                                                        )}
                                                                    />
                                                                </List.Item>
                                                            );
                                                        }}
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
                                                Send a stable contextKey plus page, feature, workflow, and entity hints after route changes. Do not send internal account IDs, workspace IDs, emails, or phone numbers through page context. Use identify only for the signed-in customer contact shown to support owners.
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
                        key: ANSWERLATTICE_WIDGET_TABS.HOSTED_HELP,
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
                                                            onChange={(event) => updateHostedHelpConfig('title', event.target.value || DEFAULT_ANSWERLATTICE_HOSTED_HELP_CONFIG.title)}
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
                                                            onChange={(event) => updateHostedHelpConfig('description', event.target.value || DEFAULT_ANSWERLATTICE_HOSTED_HELP_CONFIG.description)}
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
                                                    description="Answerlattice adds the help domain to Vercel when you save. Point your DNS to the records shown here, then check DNS status."
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
                        key: ANSWERLATTICE_WIDGET_TABS.ACCESS,
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
                                                    size={isMobile ? 'large' : 'middle'}
                                                >
                                                    Create widget key
                                                </Button>
                                            </Flex>
                                            {widgetKeys.length > 0 ? (
                                                <List
                                                    dataSource={widgetKeys}
                                                    renderItem={(key) => (
                                                        <List.Item
                                                            actions={[
                                                                <Tooltip title={revealedKeys[key.id] ? 'Copy widget key' : 'Only shown once when created'} key="copy">
                                                                    <Button
                                                                        aria-label="Copy widget key"
                                                                        icon={<LuCopy size={14} />}
                                                                        disabled={!revealedKeys[key.id]}
                                                                        size={isMobile ? 'middle' : 'small'}
                                                                        style={compactActionStyle}
                                                                        type="text"
                                                                        onClick={() => handleCopyKey(key)}
                                                                    />
                                                                </Tooltip>,
                                                                <Tooltip title="Rename key" key="rename">
                                                                    <Button
                                                                        aria-label="Rename API key"
                                                                        icon={<LuPencil size={14} />}
                                                                        size={isMobile ? 'middle' : 'small'}
                                                                        style={compactActionStyle}
                                                                        type="text"
                                                                        onClick={() => openRenameKey(key)}
                                                                    />
                                                                </Tooltip>,
                                                                <Popconfirm
                                                                    key="revoke"
                                                                    title="Revoke widget key?"
                                                                    description="Installed widgets using this key will stop working."
                                                                    okText="Revoke"
                                                                    okButtonProps={{ danger: true }}
                                                                    onConfirm={() => handleRevokeKey(key)}
                                                                >
                                                                    <Tooltip title="Revoke key">
                                                                        <Button
                                                                            aria-label="Revoke API key"
                                                                            danger
                                                                            icon={<LuTrash2 size={14} />}
                                                                            loading={revokingKeyId === key.id}
                                                                            size={isMobile ? 'middle' : 'small'}
                                                                            style={compactActionStyle}
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
                                            <Alert
                                                type="info"
                                                showIcon
                                                message="Widget keys are shown once"
                                                description="Copy the key after creating it. If the raw value is lost, create a new key and replace it in the installed widget."
                                            />
                                            {!canCreateWidgetKey && (
                                                <Alert
                                                    type="info"
                                                    showIcon
                                                    message="Key limit reached"
                                                    description="Revoke an unused key before creating another."
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
                                                <Button icon={<LuGlobe size={14} />} onClick={addOrigin} size={isMobile ? 'large' : 'middle'}>Add</Button>
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
                                    <WidgetSecurityControls isMobile={isMobile} />
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
                                                <Button icon={<LuEyeOff size={14} />} onClick={addBlockedRoute} size={isMobile ? 'large' : 'middle'}>Add</Button>
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

function WidgetPreview({ config, mode }: { config: AnswerlatticeWidgetConfig; mode: 'desktop' | 'mobile' }) {
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
                    When your app sends route context, Answerlattice boosts linked product surfaces before falling back to general help.
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
