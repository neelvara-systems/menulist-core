'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createTimestampedRuntimeId } from '@lib/runtime/randomId';
import {
    normalizeAnswerlatticePublicCitation,
    normalizeAnswerlatticePublicCitations,
    normalizeAnswerlatticePublicCitationUrl,
    normalizeAnswerlatticePublicFallbackReason,
    normalizeAnswerlatticeScopeClarification,
    type AnswerlatticePublicFallbackReason,
} from '@lib/answerlattice/publicAnswerContracts';
import type { AnswerlatticePublicCitation, AnswerlatticeScopeClarification } from '@type/answerlattice';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { normalizeAnswerlatticePredictiveSuggestion } from '@lib/answerlattice/predictiveSupportContracts';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import {
    LuAlertTriangle,
    LuBookOpen,
    LuExternalLink,
    LuHelpCircle,
    LuCheckCircle,
    LuImage,
    LuInfo,
    LuListChecks,
    LuMessageCircle,
    LuRefreshCcw,
    LuSend,
    LuThumbsDown,
    LuThumbsUp,
    LuX,
} from 'react-icons/lu';
import {
    ANSWERLATTICE_CHAT_IMAGE_ACCEPT,
    ANSWERLATTICE_CHAT_IMAGE_ALLOWED_LABEL,
    ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES,
    isAllowedAnswerlatticeChatImageMimeType,
    normalizeAnswerlatticeChatImageMimeType,
    stripDataUrlPrefix,
} from '@lib/answerlattice/chatImagePolicy';

const MAX_SESSION_MESSAGES = 5;
const MAX_CONTEXT_PAYLOAD_BYTES = 2048;
const MAX_VISITOR_PAYLOAD_BYTES = 1024;
const WIDGET_SEARCH_RESPONSE_JSON_MAX_BYTES = 256 * 1024;
const WIDGET_ERROR_RESPONSE_JSON_MAX_BYTES = 8 * 1024;
const WIDGET_RUNTIME_TOKEN_HEADER = 'X-Answerlattice-Widget-Runtime';
const WIDGET_ANSWER_FAILED_MESSAGE = 'Could not answer that right now. Try again.';
const WIDGET_FEEDBACK_FAILED_MESSAGE = 'Could not save feedback. Try again.';
const WIDGET_ESCALATION_FAILED_MESSAGE = 'Could not send this to support. Try again.';
const WIDGET_ESCALATION_EMAIL_MESSAGE = 'Enter a valid email so support can reply.';
const WIDGET_LINK_OPEN_FAILED_MESSAGE = 'Could not open link. Try again.';
const GUIDANCE_CONTRACT_VERSION = 'answerlattice.guidance.v1';
const GUIDANCE_OUTCOME_MAX_ATTEMPTS = 2;
const GUIDANCE_SEMANTIC_ID_PATTERN = /^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/;
// Presentation vocabulary only. Host execution is deliberately unsupported.
const GUIDANCE_ACTIONS = new Set([
    'open', 'navigate', 'click', 'select', 'enter', 'toggle', 'submit', 'confirm',
    'download', 'upload', 'copy', 'paste', 'scroll', 'expand', 'collapse',
]);
const GUIDANCE_WARNING_SEVERITIES = new Set(['info', 'warning', 'destructive']);
const GUIDANCE_PREREQUISITE_TYPES = new Set(['role', 'plan', 'state', 'general']);
const WIDGET_SEARCH_PUBLIC_ERROR_MESSAGES = new Set([
    WIDGET_ANSWER_FAILED_MESSAGE,
    'Help needs to reconnect. Reload this page and try again.',
    'Too many questions at once. Wait a moment and try again.',
    'Support is temporarily unavailable for this workspace.',
    'Support is temporarily unavailable. Try again shortly.',
]);
const SENSITIVE_WIDGET_RESPONSE_KEYS = new Set([
    'apikey',
    'embedding',
    'pid',
    'secret',
    'sid',
    'sourceid',
    'storeid',
    'tenantid',
    'tid',
    'token',
]);

type WidgetHistoryMode = 'session' | 'forget';

interface WidgetProcedureStep {
    stepOrder: number;
    action?: string;
    instruction: string;
    target?: string;
    expectedEvent?: string;
    expectedResult?: string;
    troubleshootingHint?: string;
}

interface WidgetProcedure {
    procedureSlug?: string;
    steps: WidgetProcedureStep[];
    warnings?: { message: string; severity?: string }[];
    prerequisites?: { description: string; type?: string; value?: string }[];
}

type WidgetGuidanceOutcome = 'completed' | 'abandoned' | 'escalated' | 'target_missing';
type WidgetGuidanceTargetStatus = 'locating' | 'found' | 'missing' | 'waiting';

interface ActiveWidgetGuidance {
    messageId: string;
    procedure: WidgetProcedure;
    procedureSessionId: string;
    searchHistoryId: string;
    stepIndex: number;
}

interface WidgetMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    canonical?: boolean;
    confidence?: string;
    answerSource?: string;
    references?: { id: string; title: string; url?: string }[];
    citations?: AnswerlatticePublicCitation[];
    relatedContent?: {
        key?: string;
        label?: string;
        articles?: Array<{ id: string; title: string; url?: string }>;
        faqs?: Array<{ id: string; question: string; answer?: string; articleId?: string | null }>;
        changelogs?: Array<{ id: string; pageId?: string; title: string; version?: string | null }>;
    };
    suggestedQuestions?: string[];
    searchHistoryId?: string;
    feedback?: 'resolved' | 'not_resolved' | null;
    imageBase64?: string;
    imageMimeType?: string;
    procedure?: WidgetProcedure;
    fallbackReason?: AnswerlatticePublicFallbackReason;
    fallbackSuggested?: boolean;
    imageProcessingFailed?: boolean;
    escalationTicketDisplayId?: string;
    clarification?: AnswerlatticeScopeClarification;
    knownIssue?: {
        severity: 'info' | 'degraded' | 'outage';
        statusPageUrl?: string;
    };
}

interface WidgetClientProps {
    apiKey: string;
}

type WidgetSearchResponse = {
    answer: string;
    canonical?: boolean;
    confidence?: string;
    answerSource?: string;
    references?: WidgetMessage['references'];
    citations?: WidgetMessage['citations'];
    relatedContent?: WidgetMessage['relatedContent'];
    suggestedQuestions?: unknown[];
    searchHistoryId?: string;
    procedure?: WidgetProcedure;
    fallbackReason?: AnswerlatticePublicFallbackReason | null;
    fallbackSuggested?: boolean;
    imageProcessed?: boolean;
    clarification?: AnswerlatticeScopeClarification | null;
    graphExpansion?: {
        relatedSuggestions?: unknown[];
    };
};

type WidgetFeedbackResponse = {
    success: true;
    resolutionOutcome: 'resolved' | 'not_resolved';
    isGood: boolean;
    created: boolean;
};

type WidgetEscalationResponse = {
    success: true;
    ticketId: string;
    displayId: string;
    created: boolean;
};

type WidgetEscalationDraft = {
    messageId: string;
    email: string;
    name: string;
    details: string;
};

type WidgetResponseLogContext = Record<string, boolean | number | string | null | undefined>;

const SENSITIVE_CONTEXT_PATTERN = /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?\d[\d\s().-]{7,}\d)/i;

const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isBoundedString = (value: unknown, maxLength: number, allowEmpty = false): value is string => (
    typeof value === 'string'
    && value.length <= maxLength
    && (allowEmpty || value.trim().length > 0)
);

const isOptionalBoundedString = (value: unknown, maxLength: number): value is string | undefined => (
    value === undefined || isBoundedString(value, maxLength, true)
);

const isOptionalNullableBoundedString = (value: unknown, maxLength: number): value is string | null | undefined => (
    value === undefined || value === null || isBoundedString(value, maxLength, true)
);

const isSafeWidgetLink = (value: unknown): value is string | undefined => {
    if (value === undefined) return true;
    return normalizeAnswerlatticePublicCitationUrl(value) !== null;
};

const hasSensitiveOrExcessiveResponseShape = (value: unknown): boolean => {
    const pending: unknown[] = [value];
    let visited = 0;
    while (pending.length > 0) {
        const current = pending.pop();
        visited += 1;
        if (visited > 1000) return true;
        if (Array.isArray(current)) {
            pending.push(...current);
            continue;
        }
        if (!isPlainRecord(current)) continue;
        for (const [key, nestedValue] of Object.entries(current)) {
            if (SENSITIVE_WIDGET_RESPONSE_KEYS.has(key.toLowerCase())) return true;
            if (nestedValue && typeof nestedValue === 'object') pending.push(nestedValue);
        }
    }
    return false;
};

const isWidgetReference = (value: unknown): value is NonNullable<WidgetMessage['references']>[number] => (
    isPlainRecord(value)
    && isBoundedString(value.id, 180)
    && isBoundedString(value.title, 300)
    && isSafeWidgetLink(value.url)
);

const isWidgetCitation = (value: unknown): value is AnswerlatticePublicCitation => (
    isPlainRecord(value)
    && Object.keys(value).every(key => ['id', 'title', 'url'].includes(key))
    && normalizeAnswerlatticePublicCitation(value) !== null
);

const isWidgetProcedureStep = (value: unknown): value is WidgetProcedureStep => (
    isPlainRecord(value)
    && typeof value.stepOrder === 'number'
    && Number.isInteger(value.stepOrder)
    && value.stepOrder >= 1
    && value.stepOrder <= 12
    && isBoundedString(value.instruction, 80)
    && typeof value.action === 'string'
    && GUIDANCE_ACTIONS.has(value.action)
    && isOptionalBoundedString(value.target, 120)
    && (value.target === undefined || GUIDANCE_SEMANTIC_ID_PATTERN.test(value.target))
    && isOptionalBoundedString(value.expectedEvent, 120)
    && (value.expectedEvent === undefined || GUIDANCE_SEMANTIC_ID_PATTERN.test(value.expectedEvent))
    && isOptionalBoundedString(value.expectedResult, 120)
    && isOptionalBoundedString(value.troubleshootingHint, 200)
);

const isWidgetProcedure = (value: unknown): value is WidgetProcedure => {
    if (!isPlainRecord(value)) return false;
    if (
        !Array.isArray(value.steps)
        || value.steps.length < 1
        || value.steps.length > 12
        || !value.steps.every(isWidgetProcedureStep)
    ) return false;
    const orderedSteps = [...value.steps].sort((left, right) => left.stepOrder - right.stepOrder);
    if (!orderedSteps.every((step, index) => step.stepOrder === index + 1)) return false;
    if (
        value.procedureSlug !== undefined
        && (
            !isBoundedString(value.procedureSlug, 60)
            || !/^[a-z0-9_]+$/.test(value.procedureSlug)
        )
    ) return false;
    if (value.warnings !== undefined && (!Array.isArray(value.warnings) || value.warnings.length > 5 || !value.warnings.every((item) => (
        isPlainRecord(item)
        && isBoundedString(item.message, 200)
        && typeof item.severity === 'string'
        && GUIDANCE_WARNING_SEVERITIES.has(item.severity)
    )))) return false;
    if (value.prerequisites !== undefined && (!Array.isArray(value.prerequisites) || value.prerequisites.length > 5 || !value.prerequisites.every((item) => (
        isPlainRecord(item)
        && isBoundedString(item.description, 200)
        && typeof item.type === 'string'
        && GUIDANCE_PREREQUISITE_TYPES.has(item.type)
        && isOptionalBoundedString(item.value, 120)
    )))) return false;
    return true;
};

const isWidgetRelatedContent = (value: unknown): value is WidgetMessage['relatedContent'] => {
    if (!isPlainRecord(value)) return false;
    if (!isOptionalBoundedString(value.key, 180) || !isOptionalBoundedString(value.label, 240)) return false;
    if (value.articles !== undefined && (!Array.isArray(value.articles) || value.articles.length > 10 || !value.articles.every((item) => (
        isPlainRecord(item)
        && isBoundedString(item.id, 180)
        && isBoundedString(item.title, 300)
        && isSafeWidgetLink(item.url)
    )))) return false;
    if (value.faqs !== undefined && (!Array.isArray(value.faqs) || value.faqs.length > 10 || !value.faqs.every((item) => (
        isPlainRecord(item)
        && isBoundedString(item.id, 180)
        && isBoundedString(item.question, 500)
        && isOptionalBoundedString(item.answer, 3000)
        && isOptionalNullableBoundedString(item.articleId, 180)
    )))) return false;
    if (value.changelogs !== undefined && (!Array.isArray(value.changelogs) || value.changelogs.length > 10 || !value.changelogs.every((item) => (
        isPlainRecord(item)
        && isBoundedString(item.id, 180)
        && isBoundedString(item.title, 300)
        && isOptionalNullableBoundedString(item.pageId, 180)
        && isOptionalNullableBoundedString(item.version, 80)
    )))) return false;
    return true;
};

const isWidgetSearchResponse = (value: unknown): value is WidgetSearchResponse => {
    if (!isPlainRecord(value) || hasSensitiveOrExcessiveResponseShape(value) || !isBoundedString(value.answer, 20_000)) return false;
    if (value.canonical !== undefined && typeof value.canonical !== 'boolean') return false;
    if (value.imageProcessed !== undefined && typeof value.imageProcessed !== 'boolean') return false;
    if (value.fallbackSuggested !== undefined && typeof value.fallbackSuggested !== 'boolean') return false;
    if (!isOptionalBoundedString(value.confidence, 40) || !isOptionalBoundedString(value.answerSource, 80) || !isOptionalBoundedString(value.searchHistoryId, 180)) return false;
    if (value.references !== undefined && (!Array.isArray(value.references) || value.references.length > 12 || !value.references.every(isWidgetReference))) return false;
    if (value.citations !== undefined && (!Array.isArray(value.citations) || value.citations.length > 8 || !value.citations.every(isWidgetCitation))) return false;
    if (value.fallbackReason !== undefined && value.fallbackReason !== null && !normalizeAnswerlatticePublicFallbackReason(value.fallbackReason)) return false;
    if (value.clarification !== undefined && value.clarification !== null && !normalizeAnswerlatticeScopeClarification(value.clarification)) return false;
    if (value.relatedContent !== undefined && !isWidgetRelatedContent(value.relatedContent)) return false;
    if (value.suggestedQuestions !== undefined && (
        !Array.isArray(value.suggestedQuestions)
        || value.suggestedQuestions.length > 8
        || !value.suggestedQuestions.every((item) => (
            typeof item === 'string'
                ? isBoundedString(item, 300)
                : isPlainRecord(item)
                    && isOptionalBoundedString(item.entityName, 300)
                    && isOptionalBoundedString(item.title, 300)
                    && isOptionalBoundedString(item.question, 300)
        ))
    )) return false;
    if (value.procedure !== undefined && !isWidgetProcedure(value.procedure)) return false;
    if (value.graphExpansion !== undefined) {
        if (!isPlainRecord(value.graphExpansion)) return false;
        if (value.graphExpansion.relatedSuggestions !== undefined && (
            !Array.isArray(value.graphExpansion.relatedSuggestions)
            || value.graphExpansion.relatedSuggestions.length > 8
        )) return false;
    }
    return true;
};

const isWidgetFeedbackResponse = (value: unknown): value is WidgetFeedbackResponse => (
    isPlainRecord(value)
    && value.success === true
    && (value.resolutionOutcome === 'resolved' || value.resolutionOutcome === 'not_resolved')
    && typeof value.isGood === 'boolean'
    && value.isGood === (value.resolutionOutcome === 'resolved')
    && typeof value.created === 'boolean'
);

const isWidgetEscalationResponse = (value: unknown): value is WidgetEscalationResponse => (
    isPlainRecord(value)
    && value.success === true
    && isBoundedString(value.ticketId, 180)
    && isBoundedString(value.displayId, 32)
    && typeof value.created === 'boolean'
);

const readWidgetSearchResponse = async (
    response: Response,
    context: WidgetResponseLogContext,
): Promise<WidgetSearchResponse | null> => {
    let payload: unknown;
    try {
        payload = await readJsonResponseWithLimit<unknown>(response, WIDGET_SEARCH_RESPONSE_JSON_MAX_BYTES);
    } catch (error) {
        logRuntimeFailure('answerlattice_widget_client_search_response_parse_failed', error, {
            ...context,
            responseOk: response.ok,
            responseStatus: response.status,
            maxBytes: WIDGET_SEARCH_RESPONSE_JSON_MAX_BYTES,
        });
        return null;
    }

    if (!isWidgetSearchResponse(payload)) {
        logRuntimeFailure('answerlattice_widget_client_search_response_invalid', new Error('answerlattice_widget_client_search_response_invalid'), {
            ...context,
            responseStatus: response.status,
        });
        return null;
    }

    return payload;
};

const readWidgetFeedbackResponse = async (response: Response): Promise<WidgetFeedbackResponse | null> => {
    try {
        const payload = await readJsonResponseWithLimit<unknown>(response, WIDGET_ERROR_RESPONSE_JSON_MAX_BYTES);
        return isWidgetFeedbackResponse(payload) ? payload : null;
    } catch {
        return null;
    }
};

const readWidgetEscalationResponse = async (response: Response): Promise<WidgetEscalationResponse | null> => {
    try {
        const payload = await readJsonResponseWithLimit<unknown>(response, WIDGET_ERROR_RESPONSE_JSON_MAX_BYTES);
        return isWidgetEscalationResponse(payload) ? payload : null;
    } catch {
        return null;
    }
};

const readWidgetSearchErrorMessage = async (response: Response): Promise<string> => {
    try {
        await readJsonResponseWithLimit<unknown>(response, WIDGET_ERROR_RESPONSE_JSON_MAX_BYTES);
    } catch {
        // The public UI uses status-based copy and never renders an untrusted error payload.
    }

    if (response.status === 403) return 'Help needs to reconnect. Reload this page and try again.';
    if (response.status === 429) return 'Too many questions at once. Wait a moment and try again.';
    if (response.status === 402) return 'Support is temporarily unavailable for this workspace.';
    if (response.status === 503) return 'Support is temporarily unavailable. Try again shortly.';
    return WIDGET_ANSWER_FAILED_MESSAGE;
};

const sanitizeContextString = (value: unknown, maxLength = 100): string | null => {
    if (typeof value !== 'string') return null;
    if (SENSITIVE_CONTEXT_PATTERN.test(value)) return null;
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '').slice(0, maxLength);
    return normalized || null;
};

const sanitizeContextTitle = (value: unknown, maxLength = 120): string | null => {
    if (typeof value !== 'string') return null;
    if (SENSITIVE_CONTEXT_PATTERN.test(value)) return null;
    const normalized = value.trim().replace(/[<>{}]/g, '').replace(/\s+/g, ' ').slice(0, maxLength);
    return normalized || null;
};

const normalizeContextPath = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    if (SENSITIVE_CONTEXT_PATTERN.test(value)) return null;
    let route = value.trim();
    if (!route) return null;
    try {
        if (/^https?:\/\//i.test(route)) {
            route = new URL(route).pathname || '/';
        }
    } catch {
        return null;
    }
    route = route.split(/[?#]/)[0]?.trim() || '';
    if (!route) return null;
    if (!route.startsWith('/')) route = `/${route}`;
    route = route.replace(/\/{2,}/g, '/');
    if (route.length > 1 && route.endsWith('/')) route = route.slice(0, -1);
    if (route.includes('*')) return null;
    return route.slice(0, 180);
};

const sanitizeContextVersion = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().replace(/^v/i, '');
    if (!/^\d{1,6}(?:\.\d{1,3}){0,2}$/.test(normalized)) return null;
    const [major, minor = '0', patch = '0'] = normalized.split('.');
    if (Number(major) <= 0 || Number(minor) > 999 || Number(patch) > 999) return null;
    return normalized;
};

const sanitizeContextPayload = (value: unknown): Record<string, any> | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const input = value as Record<string, unknown>;
    const output: Record<string, any> = {};
    ['contextKey', 'feature', 'page', 'workflow', 'userRole', 'plan', 'state'].forEach((key) => {
        const current = sanitizeContextString(input[key]);
        if (current) output[key] = current;
    });
    const path = normalizeContextPath(input.path);
    if (path) {
        output.path = path;
    }
    const title = sanitizeContextTitle(input.title);
    if (title) output.title = title;
    const role = sanitizeContextString(input.role, 80);
    if (role) {
        output.role = role;
        if (!output.userRole) output.userRole = role;
    }
    const locale = sanitizeContextString(input.locale, 24);
    if (locale) output.locale = locale;
    const version = sanitizeContextVersion(input.version);
    if (version) output.version = version;
    if (
        typeof input.contextVersion === 'number'
        && Number.isInteger(input.contextVersion)
        && input.contextVersion >= 1
        && input.contextVersion <= 10
    ) {
        output.contextVersion = input.contextVersion;
    }
    if (Array.isArray(input.entityHints)) {
        output.entityHints = input.entityHints
            .slice(0, 5)
            .map((hint) => sanitizeContextString(hint, 64))
            .filter((hint): hint is string => Boolean(hint));
    }
    const hasMeaningfulContext = ['contextKey', 'feature', 'page', 'workflow', 'userRole', 'plan', 'state', 'version', 'path', 'title', 'role', 'locale'].some((key) => Boolean(output[key]))
        || (Array.isArray(output.entityHints) && output.entityHints.length > 0);
    if (!hasMeaningfulContext) return null;

    const payloadBytes = new TextEncoder().encode(JSON.stringify(output)).length;
    return payloadBytes <= MAX_CONTEXT_PAYLOAD_BYTES ? output : null;
};

const sanitizeVisitorText = (value: unknown, maxLength = 160): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().replace(/[<>{}]/g, '').replace(/\s+/g, ' ').slice(0, maxLength);
    return normalized || null;
};

const sanitizeVisitorId = (value: unknown): string | null => {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const normalized = String(value).trim().replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 120);
    return normalized || null;
};

const sanitizeVisitorEmail = (value: unknown): string | null => {
    const email = sanitizeVisitorText(value, 180)?.toLowerCase() || null;
    if (!email) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

const sanitizeVisitorPayload = (value: unknown): Record<string, any> | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const input = value as Record<string, unknown>;
    const output: Record<string, any> = {};
    const id = sanitizeVisitorId(input.id || input.customerId);
    const name = sanitizeVisitorText(input.name || input.displayName, 160);
    const email = sanitizeVisitorEmail(input.email);
    if (id) output.id = id;
    if (name) output.name = name;
    if (email) output.email = email;
    if (!output.id && !output.name && !output.email) return null;
    const payloadBytes = new TextEncoder().encode(JSON.stringify(output)).length;
    return payloadBytes <= MAX_VISITOR_PAYLOAD_BYTES ? output : null;
};

const normalizeSuggestion = (value: unknown): string | null => {
    if (typeof value === 'string') {
        const text = value.trim();
        return text ? text.slice(0, 180) : null;
    }

    if (value && typeof value === 'object') {
        const suggestion = value as Record<string, unknown>;
        const label = suggestion.entityName || suggestion.title || suggestion.question;
        if (typeof label === 'string') {
            const text = label.trim();
            return text ? text.slice(0, 180) : null;
        }
    }

    return null;
};

const normalizeSuggestions = (values: unknown[]): string[] => {
    const seen = new Set<string>();
    const normalized: string[] = [];

    for (const value of values) {
        const suggestion = normalizeSuggestion(value);
        if (!suggestion) continue;
        const key = suggestion.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        normalized.push(suggestion);
        if (normalized.length >= 3) break;
    }

    return normalized;
};

const normalizeHexColor = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const color = value.trim();
    return /^#[0-9a-fA-F]{6}$/.test(color) ? color : null;
};

const formatContextLabel = (context: Record<string, any> | null): string | null => {
    const rawValue = typeof context?.contextKey === 'string'
        ? context.contextKey
        : typeof context?.page === 'string'
        ? context.page
        : typeof context?.title === 'string'
        ? context.title
        : typeof context?.feature === 'string'
            ? context.feature
            : '';
    if (!rawValue) return null;

    const ignored = new Set(['app', 'home', 'page']);
    const words = rawValue
        .split(/[_-]+/)
        .filter((part) => part && !ignored.has(part))
        .slice(0, 4);
    if (words.length === 0) return null;

    return words
        .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
        .join(' ');
};

export default function WidgetClient({ apiKey }: WidgetClientProps) {
    const [messages, setMessages] = useState<WidgetMessage[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
    const [productContext, setProductContext] = useState<Record<string, any> | null>(null);
    const [visitorContext, setVisitorContext] = useState<Record<string, any> | null>(null);
    const [verifiedContextToken, setVerifiedContextToken] = useState<string | null>(null);
    const [runtimeAuthorizationToken, setRuntimeAuthorizationToken] = useState<string | null>(null);
    const [evidenceLinks, setEvidenceLinks] = useState<Array<{ url: string; label?: string }>>([]);
    const [historyMode, setHistoryMode] = useState<WidgetHistoryMode>('session');
    const [greeting, setGreeting] = useState('How can we help?');
    const [headerTitle, setHeaderTitle] = useState('Help');
    const [accentColor, setAccentColor] = useState('#6366f1');
    const [poweredByVisible, setPoweredByVisible] = useState(true);
    const [guidedResolutionEnabled, setGuidedResolutionEnabled] = useState(false);
    const [escalationDraft, setEscalationDraft] = useState<WidgetEscalationDraft | null>(null);
    const [escalationSubmitting, setEscalationSubmitting] = useState(false);
    const [escalationError, setEscalationError] = useState<string | null>(null);
    const [activeGuidance, setActiveGuidance] = useState<ActiveWidgetGuidance | null>(null);
    const [guidanceTargetStatus, setGuidanceTargetStatus] = useState<WidgetGuidanceTargetStatus>('locating');
    const [guidanceCompletedMessageId, setGuidanceCompletedMessageId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const activeRequestRef = useRef(0);
    const activeSearchControllerRef = useRef<AbortController | null>(null);
    const widgetSessionIdRef = useRef(createTimestampedRuntimeId('w', 8));
    const activeGuidanceRef = useRef<ActiveWidgetGuidance | null>(null);
    const guidanceOutcomeSentRef = useRef<Set<string>>(new Set());

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
    useEffect(() => () => {
        activeRequestRef.current += 1;
        activeSearchControllerRef.current?.abort();
        activeSearchControllerRef.current = null;
    }, []);

    const setCurrentGuidance = useCallback((guidance: ActiveWidgetGuidance | null) => {
        activeGuidanceRef.current = guidance;
        setActiveGuidance(guidance);
    }, []);

    const clearGuidanceWithoutOutcome = useCallback(() => {
        setCurrentGuidance(null);
        setGuidanceTargetStatus('locating');
        window.parent?.postMessage({ type: 'answerlattice-guidance-clear' }, '*');
    }, [setCurrentGuidance]);

    const sendGuidanceStepToHost = useCallback((guidance: ActiveWidgetGuidance) => {
        const step = guidance.procedure.steps[guidance.stepIndex];
        if (!step) return;
        setGuidanceTargetStatus(step.target ? 'locating' : step.expectedEvent ? 'waiting' : 'found');
        window.parent?.postMessage({
            type: 'answerlattice-guidance-step',
            sessionId: guidance.procedureSessionId,
            step: {
                stepOrder: step.stepOrder,
                target: step.target,
                expectedEvent: step.expectedEvent,
            },
        }, '*');
    }, []);

    const submitGuidanceOutcome = useCallback(async (
        guidance: ActiveWidgetGuidance,
        outcome: WidgetGuidanceOutcome,
        completedSteps: number,
    ) => {
        const outcomeKey = `${guidance.searchHistoryId}:${guidance.procedureSessionId}`;
        if (guidanceOutcomeSentRef.current.has(outcomeKey)) return;
        guidanceOutcomeSentRef.current.add(outcomeKey);

        const activeStep = guidance.procedure.steps[guidance.stepIndex];
        const requestBody = JSON.stringify({
            contractVersion: GUIDANCE_CONTRACT_VERSION,
            requestId: createTimestampedRuntimeId('guidance', 12),
            procedureSessionId: guidance.procedureSessionId,
            searchHistoryId: guidance.searchHistoryId,
            procedureSlug: guidance.procedure.procedureSlug,
            outcome,
            totalSteps: guidance.procedure.steps.length,
            completedSteps,
            ...(outcome !== 'completed' ? { blockedStepOrder: activeStep?.stepOrder } : {}),
            targetId: activeStep?.target,
            expectedEvent: activeStep?.expectedEvent,
            widgetSessionId: widgetSessionIdRef.current,
            contextKey: typeof productContext?.contextKey === 'string'
                ? productContext.contextKey
                : undefined,
        });
        try {
            let lastError: Error | null = null;
            for (let attempt = 1; attempt <= GUIDANCE_OUTCOME_MAX_ATTEMPTS; attempt += 1) {
                let response: Response;
                try {
                    response = await fetch('/api/widget/guidance-outcome', {
                        method: 'POST',
                        cache: 'no-store',
                        credentials: 'same-origin',
                        redirect: 'manual',
                        referrerPolicy: 'no-referrer',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': apiKey,
                            ...(runtimeAuthorizationToken
                                ? { [WIDGET_RUNTIME_TOKEN_HEADER]: runtimeAuthorizationToken }
                                : {}),
                        },
                        body: requestBody,
                    });
                } catch (requestError) {
                    lastError = requestError instanceof Error
                        ? requestError
                        : new Error('answerlattice_guidance_outcome_network_failed');
                    if (attempt === GUIDANCE_OUTCOME_MAX_ATTEMPTS) throw lastError;
                    continue;
                }
                if (response.ok) return;
                lastError = new Error(`answerlattice_guidance_outcome_${response.status}`);
                if (response.status < 500 || attempt === GUIDANCE_OUTCOME_MAX_ATTEMPTS) {
                    throw lastError;
                }
            }
            throw lastError || new Error('answerlattice_guidance_outcome_failed');
        } catch (outcomeError) {
            guidanceOutcomeSentRef.current.delete(outcomeKey);
            logRuntimeFailure('answerlattice_widget_guidance_outcome_submit_failed', outcomeError, {
                surface: 'widget_client',
                outcome,
                completedSteps,
                totalSteps: guidance.procedure.steps.length,
            });
        }
    }, [apiKey, productContext, runtimeAuthorizationToken]);

    const beginGuidance = useCallback((message: WidgetMessage) => {
        if (!guidedResolutionEnabled || !message.procedure || !message.searchHistoryId) return;
        clearGuidanceWithoutOutcome();
        const guidance: ActiveWidgetGuidance = {
            messageId: message.id,
            procedure: {
                ...message.procedure,
                steps: [...message.procedure.steps].sort((left, right) => left.stepOrder - right.stepOrder),
            },
            procedureSessionId: createTimestampedRuntimeId('guide', 12),
            searchHistoryId: message.searchHistoryId,
            stepIndex: 0,
        };
        setGuidanceCompletedMessageId(null);
        setCurrentGuidance(guidance);
        sendGuidanceStepToHost(guidance);
    }, [clearGuidanceWithoutOutcome, guidedResolutionEnabled, sendGuidanceStepToHost, setCurrentGuidance]);

    const advanceGuidance = useCallback((sessionId: string, stepOrder: number) => {
        const guidance = activeGuidanceRef.current;
        const activeStep = guidance?.procedure.steps[guidance.stepIndex];
        if (
            !guidance
            || guidance.procedureSessionId !== sessionId
            || !activeStep
            || activeStep.stepOrder !== stepOrder
        ) return;

        const completedSteps = guidance.stepIndex + 1;
        if (completedSteps >= guidance.procedure.steps.length) {
            void submitGuidanceOutcome(guidance, 'completed', guidance.procedure.steps.length);
            setGuidanceCompletedMessageId(guidance.messageId);
            clearGuidanceWithoutOutcome();
            return;
        }

        const nextGuidance = { ...guidance, stepIndex: guidance.stepIndex + 1 };
        setCurrentGuidance(nextGuidance);
        sendGuidanceStepToHost(nextGuidance);
    }, [clearGuidanceWithoutOutcome, sendGuidanceStepToHost, setCurrentGuidance, submitGuidanceOutcome]);

    const endGuidance = useCallback((outcome: Exclude<WidgetGuidanceOutcome, 'completed'>) => {
        const guidance = activeGuidanceRef.current;
        if (!guidance) return;
        void submitGuidanceOutcome(guidance, outcome, guidance.stepIndex);
        clearGuidanceWithoutOutcome();
    }, [clearGuidanceWithoutOutcome, submitGuidanceOutcome]);

    const clearConversation = useCallback(() => {
        activeRequestRef.current += 1;
        activeSearchControllerRef.current?.abort();
        activeSearchControllerRef.current = null;
        clearGuidanceWithoutOutcome();
        setMessages([]);
        setQuery('');
        setLoading(false);
        setError(null);
        setSelectedImage(null);
        setEscalationDraft(null);
        setEscalationSubmitting(false);
        setEscalationError(null);
        setGuidanceCompletedMessageId(null);
    }, [clearGuidanceWithoutOutcome]);

    const closeWidget = useCallback(() => {
        window.parent?.postMessage({ type: 'answerlattice-widget-close' }, '*');
    }, []);

    const openWidgetLink = useCallback((
        url: string | undefined,
        context: {
            linkId?: string;
            linkTitle?: string;
            linkSource: string;
        },
    ) => {
        if (!url) return;

        try {
            const opened = window.open(url, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('answerlattice_widget_link_open_blocked');
            }
        } catch (error) {
            logRuntimeFailure('answerlattice_widget_link_open_failed', error, {
                surface: 'widget_client',
                ...getBoundedRuntimeStringContext('linkUrl', url),
                ...getBoundedRuntimeStringContext('linkId', context.linkId),
                ...getBoundedRuntimeStringContext('linkTitle', context.linkTitle),
                ...getBoundedRuntimeStringContext('linkSource', context.linkSource),
            });
            setError(WIDGET_LINK_OPEN_FAILED_MESSAGE);
        }
    }, []);

    // Listen for context updates from embed script via postMessage
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.source !== window.parent) return;
            if (e.data?.type === 'answerlattice-context-update') {
                const nextContext = sanitizeContextPayload(e.data.context);
                setProductContext(nextContext);
            }
            if (e.data?.type === 'answerlattice-visitor-update') {
                setVisitorContext(sanitizeVisitorPayload(e.data.visitor));
            }
            if (e.data?.type === 'answerlattice-security-context-update') {
                const token = typeof e.data.verifiedContextToken === 'string'
                    && e.data.verifiedContextToken.length >= 40
                    && e.data.verifiedContextToken.length <= 4096
                    ? e.data.verifiedContextToken
                    : null;
                const links = Array.isArray(e.data.evidenceLinks)
                    ? e.data.evidenceLinks.slice(0, 3).flatMap((link: any) => {
                        try {
                            const parsed = new URL(String(link?.url || ''));
                            if (parsed.protocol !== 'https:') return [];
                            return [{
                                url: parsed.toString().slice(0, 1000),
                                ...(typeof link?.label === 'string' ? { label: link.label.replace(/[<>]/g, '').trim().slice(0, 80) } : {}),
                            }];
                        } catch {
                            return [];
                        }
                    })
                    : [];
                const runtimeToken = typeof e.data.runtimeAuthorizationToken === 'string'
                    && e.data.runtimeAuthorizationToken.length >= 40
                    && e.data.runtimeAuthorizationToken.length <= 2048
                    ? e.data.runtimeAuthorizationToken
                    : null;
                setVerifiedContextToken(token);
                setRuntimeAuthorizationToken(runtimeToken);
                setEvidenceLinks(links);
            }
            if (e.data?.type === 'answerlattice-widget-visibility') {
                const nextHistoryMode: WidgetHistoryMode = e.data.historyMode === 'forget' ? 'forget' : 'session';
                setHistoryMode(nextHistoryMode);
                if (e.data.state === 'closed') {
                    clearGuidanceWithoutOutcome();
                }
                if (e.data.state === 'closed' && e.data.clearHistory) {
                    clearConversation();
                }
            }
            if (e.data?.type === 'answerlattice-widget-config') {
                const nextAccentColor = normalizeHexColor(e.data.config?.accentColor);
                if (nextAccentColor) setAccentColor(nextAccentColor);

                const nextHeaderTitle = typeof e.data.config?.headerTitle === 'string'
                    ? e.data.config.headerTitle.trim().slice(0, 40)
                    : '';
                if (nextHeaderTitle) setHeaderTitle(nextHeaderTitle);

                const nextGreeting = typeof e.data.config?.greeting === 'string'
                    ? e.data.config.greeting.trim().slice(0, 120)
                    : '';
                if (nextGreeting) setGreeting(nextGreeting);

                if (typeof e.data.config?.poweredByVisible === 'boolean') {
                    setPoweredByVisible(e.data.config.poweredByVisible);
                }

                if (typeof e.data.config?.guidedResolutionEnabled === 'boolean') {
                    setGuidedResolutionEnabled(e.data.config.guidedResolutionEnabled);
                    if (!e.data.config.guidedResolutionEnabled) {
                        clearGuidanceWithoutOutcome();
                    }
                }
            }
            if (e.data?.type === 'answerlattice-widget-clear-history') {
                clearConversation();
            }
            if (e.data?.type === 'answerlattice-predictive-suggestion') {
                if (!e.data.suggestion) {
                    setMessages(prev => prev.filter(message => !message.id.startsWith('p-')));
                    return;
                }
                const suggestion = normalizeAnswerlatticePredictiveSuggestion(e.data.suggestion);
                if (!suggestion) return;
                const content = [suggestion.title, suggestion.summary].filter(Boolean).join('\n\n');

                setMessages(prev => {
                    const id = `p-${suggestion.triggerId}`;
                    if (prev.some(m => m.id === id)) return prev;
                    return [...prev, {
                        id,
                        role: 'assistant',
                        content,
                        suggestedQuestions: Array.isArray(suggestion.articles)
                            ? suggestion.articles
                                .map((article: any) => typeof article?.title === 'string' ? article.title.slice(0, 160) : '')
                                .filter(Boolean)
                                .slice(0, 3)
                            : [],
                        procedure: suggestion.procedure,
                        ...(suggestion.knownIssue ? { knownIssue: suggestion.knownIssue } : {}),
                    }];
                });
            }
            if (e.data?.type === 'answerlattice-guidance-step-result') {
                const guidance = activeGuidanceRef.current;
                const activeStep = guidance?.procedure.steps[guidance.stepIndex];
                if (
                    !guidance
                    || !activeStep
                    || e.data.sessionId !== guidance.procedureSessionId
                    || e.data.stepOrder !== activeStep.stepOrder
                ) return;

                if (activeStep.target && e.data.targetFound !== true) {
                    setGuidanceTargetStatus('missing');
                } else if (activeStep.expectedEvent) {
                    setGuidanceTargetStatus('waiting');
                } else {
                    setGuidanceTargetStatus('found');
                }
            }
            if (e.data?.type === 'answerlattice-guidance-host-reset') {
                clearGuidanceWithoutOutcome();
            }
            if (e.data?.type === 'answerlattice-guidance-event') {
                const guidance = activeGuidanceRef.current;
                const activeStep = guidance?.procedure.steps[guidance.stepIndex];
                if (
                    !guidance
                    || !activeStep
                    || e.data.sessionId !== guidance.procedureSessionId
                    || e.data.stepOrder !== activeStep.stepOrder
                    || e.data.eventName !== activeStep.expectedEvent
                ) return;
                advanceGuidance(guidance.procedureSessionId, activeStep.stepOrder);
            }
        };
        window.addEventListener('message', handler);
        window.parent?.postMessage({ type: 'answerlattice-widget-ready' }, '*');
        return () => window.removeEventListener('message', handler);
    }, [advanceGuidance, clearConversation, clearGuidanceWithoutOutcome]);

    // Build conversation history for context (last 5 messages)
    const getConversationHistory = () => {
        if (messages.length < 2) return undefined;
        return messages.slice(-MAX_SESSION_MESSAGES).map(m => ({
            role: m.role,
            content: m.role === 'user' ? m.content : m.content,
        }));
    };

    const handleSearch = async (
        searchQuery?: string,
        options?: { appendUserMessage?: boolean },
    ) => {
        const q = (searchQuery || query).trim();
        if (!q || loading || activeSearchControllerRef.current) return;
        const searchController = new AbortController();
        activeSearchControllerRef.current = searchController;
        const shouldAppendUserMessage = options?.appendUserMessage !== false;
        const requestId = activeRequestRef.current + 1;
        activeRequestRef.current = requestId;

        const userMsg: WidgetMessage = {
            id: `u-${Date.now()}`,
            role: 'user',
            content: q,
            imageBase64: selectedImage?.base64,
            imageMimeType: selectedImage?.mimeType,
        };

        if (shouldAppendUserMessage) {
            setMessages(prev => [...prev, userMsg]);
        }
        setQuery('');
        const currentImage = selectedImage;
        setSelectedImage(null);
        setLoading(true);
        setError(null);

        try {
            const body: Record<string, any> = {
                requestId: createTimestampedRuntimeId('widget_search', 12),
                query: q,
            };

            // Session memory: include conversation history after first exchange
            const history = getConversationHistory();
            if (history && history.length > 0) {
                body.conversationHistory = history;
            }

            // Context-aware support: include product context if available
            if (productContext) {
                body.context = productContext;
            }

            if (visitorContext) {
                body.visitor = visitorContext;
            }
            if (verifiedContextToken) {
                body.verifiedContextToken = verifiedContextToken;
            }
            if (evidenceLinks.length > 0) {
                body.evidenceLinks = evidenceLinks;
            }
            body.sessionId = widgetSessionIdRef.current;

            // Image support: send base64 inline
            if (currentImage) {
                body.imageBase64 = currentImage.base64;
                body.imageMimeType = currentImage.mimeType;
            }
            const responseLogContext = {
                surface: 'widget_client',
                queryLength: q.length,
                hasImage: Boolean(currentImage),
                hasProductContext: Boolean(productContext),
                hasVisitorContext: Boolean(visitorContext),
                hasVerifiedContext: Boolean(verifiedContextToken),
                evidenceLinkCount: evidenceLinks.length,
                historyCount: history?.length || 0,
                widgetSessionIdLength: widgetSessionIdRef.current.length,
            };

            const res = await fetch('/api/widget/search', {
                method: 'POST',
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                referrerPolicy: 'no-referrer',
                signal: searchController.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                    ...(runtimeAuthorizationToken
                        ? { [WIDGET_RUNTIME_TOKEN_HEADER]: runtimeAuthorizationToken }
                        : {}),
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                throw new Error(await readWidgetSearchErrorMessage(res));
            }

            const data = await readWidgetSearchResponse(res, responseLogContext);
            if (!data) {
                throw new Error(WIDGET_ANSWER_FAILED_MESSAGE);
            }
            if (activeRequestRef.current !== requestId) return;

            const relatedSuggestions = Array.isArray(data.graphExpansion?.relatedSuggestions)
                ? data.graphExpansion.relatedSuggestions
                : [];

            const aiMsg: WidgetMessage = {
                id: `a-${Date.now()}`,
                role: 'assistant',
                content: data.answer || 'No answer found.',
                canonical: data.canonical,
                confidence: data.confidence,
                answerSource: data.answerSource,
                references: data.references,
                citations: normalizeAnswerlatticePublicCitations(data.citations),
                fallbackReason: normalizeAnswerlatticePublicFallbackReason(data.fallbackReason) || undefined,
                fallbackSuggested: data.fallbackSuggested === true,
                imageProcessingFailed: Boolean(currentImage) && data.imageProcessed !== true,
                clarification: normalizeAnswerlatticeScopeClarification(data.clarification) || undefined,
                suggestedQuestions: normalizeSuggestions([
                    ...(Array.isArray(data.suggestedQuestions) ? data.suggestedQuestions : []),
                    ...relatedSuggestions,
                ]),
                searchHistoryId: data.searchHistoryId,
                feedback: null,
                procedure: data.procedure,
                relatedContent: data.relatedContent,
            };

            setMessages(prev => [...prev, aiMsg]);
        } catch (searchError) {
            if (activeRequestRef.current !== requestId) return;
            const publicMessage = searchError instanceof Error
                && WIDGET_SEARCH_PUBLIC_ERROR_MESSAGES.has(searchError.message)
                ? searchError.message
                : WIDGET_ANSWER_FAILED_MESSAGE;
            setError(publicMessage);
        } finally {
            if (activeRequestRef.current === requestId) {
                if (activeSearchControllerRef.current === searchController) {
                    activeSearchControllerRef.current = null;
                }
                setLoading(false);
                inputRef.current?.focus();
            }
        }
    };

    const contextLabel = formatContextLabel(productContext);
    const starterQuestions = productContext
        ? ['What can I do here?', 'Why is this not working?', 'How do I finish this?']
        : ['How do I get started?', 'Where can I find help?', 'Why is this not working?'];

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    };

    // Image upload handler
    const handleImageSelect = (file: File) => {
        const normalizedMimeType = normalizeAnswerlatticeChatImageMimeType(file.type);
        const maxImageSizeMb = Math.floor(ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES / (1024 * 1024));

        if (file.size > ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES) {
            setError(`Image must be less than ${maxImageSizeMb}MB`);
            return;
        }

        if (!isAllowedAnswerlatticeChatImageMimeType(normalizedMimeType)) {
            setError(`Only ${ANSWERLATTICE_CHAT_IMAGE_ALLOWED_LABEL} images are allowed`);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
            const base64 = stripDataUrlPrefix(rawDataUrl);
            if (!base64) {
                setError('Could not read image. Try a different file.');
                return;
            }

            setError(null);
            setSelectedImage({ base64, mimeType: normalizedMimeType, name: file.name });
        };
        reader.onerror = () => setError('Could not read image. Try a different file.');
        reader.readAsDataURL(file);
    };

    // Clipboard paste support for images
    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (isAllowedAnswerlatticeChatImageMimeType(items[i].type)) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) handleImageSelect(file);
                break;
            }
        }
    };

    const openEscalationForm = (msg: WidgetMessage) => {
        if (!msg.searchHistoryId || msg.escalationTicketDisplayId) return;
        setEscalationError(null);
        setEscalationDraft({
            messageId: msg.id,
            email: sanitizeVisitorEmail(visitorContext?.email) || '',
            name: sanitizeVisitorText(visitorContext?.name || visitorContext?.displayName, 160) || '',
            details: '',
        });
    };

    // Feedback handler
    const handleFeedback = async (msgId: string, resolutionOutcome: 'resolved' | 'not_resolved') => {
        const msg = messages.find(m => m.id === msgId);
        if (!msg?.searchHistoryId || msg.feedback) return;
        const isGood = resolutionOutcome === 'resolved';

        setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, feedback: resolutionOutcome } : m
        ));

        try {
            const response = await fetch('/api/widget/feedback', {
                method: 'POST',
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                referrerPolicy: 'no-referrer',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                    ...(runtimeAuthorizationToken
                        ? { [WIDGET_RUNTIME_TOKEN_HEADER]: runtimeAuthorizationToken }
                        : {}),
                },
                body: JSON.stringify({ searchHistoryId: msg.searchHistoryId, isGood, resolutionOutcome }),
            });
            if (!response.ok) {
                throw new Error(WIDGET_FEEDBACK_FAILED_MESSAGE);
            }
            const feedbackResponse = await readWidgetFeedbackResponse(response);
            if (!feedbackResponse) throw new Error(WIDGET_FEEDBACK_FAILED_MESSAGE);
            setMessages(prev => prev.map(m => (
                m.id === msgId ? { ...m, feedback: feedbackResponse.resolutionOutcome } : m
            )));
            if (feedbackResponse.resolutionOutcome === 'not_resolved') {
                openEscalationForm(msg);
            }
        } catch {
            setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, feedback: null } : m
            ));
            setError(WIDGET_FEEDBACK_FAILED_MESSAGE);
        }
    };

    const handleEscalationSubmit = async () => {
        if (!escalationDraft || escalationSubmitting) return;
        const msg = messages.find(item => item.id === escalationDraft.messageId);
        if (!msg?.searchHistoryId || msg.escalationTicketDisplayId) return;
        const email = sanitizeVisitorEmail(escalationDraft.email);
        if (!email) {
            setEscalationError(WIDGET_ESCALATION_EMAIL_MESSAGE);
            return;
        }

        setEscalationSubmitting(true);
        setEscalationError(null);
        try {
            const response = await fetch('/api/widget/escalation', {
                method: 'POST',
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                referrerPolicy: 'no-referrer',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                    ...(runtimeAuthorizationToken
                        ? { [WIDGET_RUNTIME_TOKEN_HEADER]: runtimeAuthorizationToken }
                        : {}),
                },
                body: JSON.stringify({
                    searchHistoryId: msg.searchHistoryId,
                    email,
                    ...(sanitizeVisitorText(escalationDraft.name, 160) ? {
                        name: sanitizeVisitorText(escalationDraft.name, 160),
                    } : {}),
                    ...(escalationDraft.details.trim() ? {
                        details: escalationDraft.details.trim().slice(0, 1000),
                    } : {}),
                }),
            });
            if (!response.ok) throw new Error(WIDGET_ESCALATION_FAILED_MESSAGE);
            const escalationResponse = await readWidgetEscalationResponse(response);
            if (!escalationResponse) throw new Error(WIDGET_ESCALATION_FAILED_MESSAGE);
            setMessages(prev => prev.map(item => (
                item.id === msg.id
                    ? {
                        ...item,
                        feedback: 'not_resolved',
                        escalationTicketDisplayId: escalationResponse.displayId,
                    }
                    : item
            )));
            setEscalationDraft(null);
            if (activeGuidanceRef.current?.messageId === msg.id) {
                endGuidance('escalated');
            }
        } catch {
            setEscalationError(WIDGET_ESCALATION_FAILED_MESSAGE);
        } finally {
            setEscalationSubmitting(false);
        }
    };

    return (
        <div style={styles.container}>
            <style>{`
                @keyframes widgetDotPulse {
                    0%, 80%, 100% { opacity: 0.3; }
                    40% { opacity: 1; }
                }
            `}</style>

            {/* Header */}
            <div style={{ ...styles.header, background: accentColor }}>
                <div style={styles.headerMain}>
                    <div style={styles.headerIcon}>
                        <LuMessageCircle size={16} aria-hidden />
                    </div>
                    <div style={styles.headerText}>
                        <span style={styles.headerTitle}>{headerTitle}</span>
                        {historyMode === 'session' && messages.length > 0 && (
                            <span style={styles.headerSubtitle}>This chat stays on this page until reload.</span>
                        )}
                    </div>
                </div>
                <div style={styles.headerActions}>
                    {messages.length > 0 && (
                        <button
                            style={{ ...styles.headerButton, opacity: loading ? 0.5 : 1 }}
                            onClick={clearConversation}
                            disabled={loading}
                            aria-label="Start new chat"
                            title="Start new chat"
                        >
                            <LuRefreshCcw size={15} aria-hidden />
                        </button>
                    )}
                    <button style={styles.headerButton} onClick={closeWidget} aria-label="Close widget" title="Close">
                        <LuX size={16} aria-hidden />
                    </button>
                </div>
            </div>

            {/* Messages area */}
            <div style={styles.messagesArea}>
                {messages.length === 0 && !loading && (
                    <div style={styles.welcomeContainer}>
                        <div style={{ ...styles.welcomeIcon, color: accentColor }}>
                            <LuMessageCircle size={32} aria-hidden />
                        </div>
                        <p style={styles.welcomeTitle}>{greeting}</p>
                        {contextLabel && (
                            <div style={styles.contextChip}>Help for {contextLabel}</div>
                        )}
                        <p style={styles.welcomeSubtext}>
                            Ask a question and we will find the best answer from our knowledge base.
                        </p>
                        <div style={styles.starterGrid}>
                            {starterQuestions.map((starter) => (
                                <button key={starter} style={styles.starterBtn} onClick={() => handleSearch(starter)}>
                                    {starter}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} style={msg.role === 'user' ? styles.userMsgRow : styles.aiMsgRow}>
                        <div style={msg.role === 'user'
                            ? { ...styles.userBubble, background: accentColor }
                            : msg.knownIssue
                                ? styles.knownIssueBubble
                                : styles.aiBubble}>
                            {msg.imageBase64 && (
                                <img
                                    src={`data:${msg.imageMimeType || 'image/png'};base64,${msg.imageBase64}`}
                                    alt="Uploaded"
                                    style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 8, marginBottom: 6 }}
                                />
                            )}
                            {msg.knownIssue && (
                                <div style={styles.knownIssueLabel}>
                                    <LuAlertTriangle size={13} aria-hidden />
                                    {msg.knownIssue.severity === 'outage' ? 'Service issue' : msg.knownIssue.severity === 'degraded' ? 'Known issue' : 'Service notice'}
                                </div>
                            )}
                            <p style={styles.msgText}>{msg.content}</p>
                            {msg.imageProcessingFailed && (
                                <div style={styles.imageProcessingNotice} role="status">
                                    <LuInfo size={13} aria-hidden />
                                    The screenshot could not be used. This answer is based on your text only.
                                </div>
                            )}
                            {msg.knownIssue?.statusPageUrl && (
                                <button
                                    type="button"
                                    style={styles.knownIssueLink}
                                    onClick={() => openWidgetLink(msg.knownIssue?.statusPageUrl, {
                                        linkId: msg.id,
                                        linkTitle: 'Status page',
                                        linkSource: 'known_issue',
                                    })}
                                >
                                    View status page
                                </button>
                            )}

                            {msg.canonical && (
                                <div style={styles.canonicalBadge}>
                                    <LuCheckCircle size={12} aria-hidden />
                                    Verified answer
                                </div>
                            )}
                            {msg.answerSource === 'faq' && !msg.canonical && (
                                <div style={styles.ownerAnswerBadge}>
                                    <LuCheckCircle size={12} aria-hidden />
                                    Owner answer
                                </div>
                            )}

                            {msg.role === 'assistant' && msg.procedure && (
                                <div style={styles.procedureContainer}>
                                    <div style={styles.procedureHeader}>
                                        <LuListChecks size={14} aria-hidden />
                                        Guided steps
                                    </div>

                                    {msg.procedure.prerequisites && msg.procedure.prerequisites.length > 0 && (
                                        <div style={styles.procedureMetaBox}>
                                            <LuInfo size={13} aria-hidden />
                                            <div>
                                                {msg.procedure.prerequisites.map((item, i) => (
                                                    <p key={i} style={styles.procedureMetaText}>{item.description}</p>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {msg.procedure.warnings && msg.procedure.warnings.length > 0 && (
                                        <div style={styles.procedureWarningBox}>
                                            <LuAlertTriangle size={13} aria-hidden />
                                            <div>
                                                {msg.procedure.warnings.map((warning, i) => (
                                                    <p key={i} style={styles.procedureWarningText}>{warning.message}</p>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div style={styles.procedureSteps}>
                                        {[...(msg.procedure.steps || [])]
                                            .sort((a, b) => a.stepOrder - b.stepOrder)
                                            .map((step, i) => {
                                                const isCurrentStep = activeGuidance?.messageId === msg.id
                                                    && activeGuidance.stepIndex === i;
                                                const isCompletedStep = activeGuidance?.messageId === msg.id
                                                    && activeGuidance.stepIndex > i;
                                                return (
                                                <div
                                                    key={`${step.stepOrder}-${i}`}
                                                    style={{
                                                        ...styles.procedureStep,
                                                        ...(isCurrentStep ? styles.procedureStepActive : {}),
                                                    }}
                                                >
                                                    <span style={{
                                                        ...styles.procedureStepNumber,
                                                        background: isCompletedStep ? '#15803d' : accentColor,
                                                    }}>
                                                        {isCompletedStep ? <LuCheckCircle size={12} aria-hidden /> : step.stepOrder || i + 1}
                                                    </span>
                                                    <div style={styles.procedureStepBody}>
                                                        <p style={styles.procedureStepText}>{step.instruction}</p>
                                                        {step.target && (
                                                            <p style={styles.procedureStepTarget}>On this screen: {step.target.replace(/[._:-]+/g, ' ')}</p>
                                                        )}
                                                        {step.expectedResult && (
                                                            <p style={styles.procedureStepHint}>{step.expectedResult}</p>
                                                        )}
                                                        {step.troubleshootingHint && (
                                                            <p style={styles.procedureTroubleshoot}>{step.troubleshootingHint}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                );
                                            })}
                                    </div>

                                    {guidedResolutionEnabled && msg.searchHistoryId && (
                                        <div style={styles.guidanceControls}>
                                            {guidanceCompletedMessageId === msg.id && activeGuidance?.messageId !== msg.id ? (
                                                <div style={styles.guidanceComplete} role="status">
                                                    <LuCheckCircle size={14} aria-hidden />
                                                    Guided steps completed
                                                </div>
                                            ) : activeGuidance?.messageId === msg.id ? (
                                                <>
                                                    <div style={styles.guidanceStatus} role="status">
                                                        {guidanceTargetStatus === 'missing'
                                                            ? 'The marked control is not available on this screen. Use the written step, report the missing target, or contact support.'
                                                            : guidanceTargetStatus === 'waiting'
                                                                ? 'Waiting for the product to confirm this step.'
                                                                : guidanceTargetStatus === 'locating'
                                                                    ? 'Locating this step on the current screen...'
                                                                    : 'The current step is marked on the product screen.'}
                                                    </div>
                                                    <div style={styles.guidanceActionRow}>
                                                        {!activeGuidance.procedure.steps[activeGuidance.stepIndex]?.expectedEvent && (
                                                            <button
                                                                type="button"
                                                                style={{ ...styles.guidancePrimaryBtn, background: accentColor }}
                                                                onClick={() => {
                                                                    const step = activeGuidance.procedure.steps[activeGuidance.stepIndex];
                                                                    if (step) advanceGuidance(activeGuidance.procedureSessionId, step.stepOrder);
                                                                }}
                                                            >
                                                                {activeGuidance.stepIndex === activeGuidance.procedure.steps.length - 1
                                                                    ? 'Finish guide'
                                                                    : 'Next step'}
                                                            </button>
                                                        )}
                                                        {guidanceTargetStatus === 'missing' && (
                                                            <button
                                                                type="button"
                                                                style={styles.guidanceSecondaryBtn}
                                                                onClick={() => endGuidance('target_missing')}
                                                            >
                                                                Target missing
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            style={styles.guidanceSecondaryBtn}
                                                            onClick={() => openEscalationForm(msg)}
                                                        >
                                                            Still stuck
                                                        </button>
                                                        <button
                                                            type="button"
                                                            style={styles.guidanceTextBtn}
                                                            onClick={() => endGuidance('abandoned')}
                                                        >
                                                            Stop
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <button
                                                    type="button"
                                                    style={{ ...styles.guidancePrimaryBtn, background: accentColor }}
                                                    onClick={() => beginGuidance(msg)}
                                                >
                                                    <LuListChecks size={14} aria-hidden />
                                                    Guide me through this
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {msg.references && msg.references.length > 0 && (
                                <div style={styles.refsContainer}>
                                    {msg.references.map((ref, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            style={{
                                                ...styles.refTag,
                                                ...(ref.url ? styles.refTagButton : {}),
                                            }}
                                            onClick={() => openWidgetLink(ref.url, {
                                                linkId: ref.id,
                                                linkTitle: ref.title,
                                                linkSource: 'message_reference',
                                            })}
                                            disabled={!ref.url}
                                            title={ref.title}
                                        >
                                            <LuBookOpen size={12} aria-hidden />
                                            {ref.title}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {msg.citations && msg.citations.length > 0 && (
                                <div style={styles.refsContainer}>
                                    {msg.citations.map(citation => (
                                        <button
                                            key={citation.id}
                                            type="button"
                                            style={{ ...styles.refTag, ...styles.refTagButton }}
                                            onClick={() => openWidgetLink(citation.url, {
                                                linkId: citation.id,
                                                linkTitle: citation.title,
                                                linkSource: 'canonical_citation',
                                            })}
                                            title={citation.title}
                                        >
                                            <LuExternalLink size={12} aria-hidden />
                                            {citation.title}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {msg.clarification && (
                                <div style={styles.refsContainer}>
                                    <span style={styles.refTag}>
                                        Needs context: {msg.clarification.requiredContext.join(', ')}
                                    </span>
                                </div>
                            )}

                            {msg.relatedContent && (
                                <div style={styles.relatedContainer}>
                                    <div style={styles.relatedHeader}>
                                        Related to {msg.relatedContent.label || msg.relatedContent.key || 'this page'}
                                    </div>
                                    <div style={styles.relatedList}>
                                        {(msg.relatedContent.articles || []).slice(0, 3).map((article) => (
                                            <button
                                                key={`article-${article.id}`}
                                                type="button"
                                                style={styles.relatedBtn}
                                                onClick={() => handleSearch(article.title)}
                                                title={article.title}
                                            >
                                                <LuBookOpen size={12} aria-hidden />
                                                <span style={styles.relatedBtnText}>{article.title}</span>
                                            </button>
                                        ))}
                                        {(msg.relatedContent.faqs || []).slice(0, 3).map((faq) => (
                                            <button
                                                key={`faq-${faq.id}`}
                                                type="button"
                                                style={styles.relatedBtn}
                                                onClick={() => handleSearch(faq.question)}
                                                title={faq.question}
                                            >
                                                <LuHelpCircle size={12} aria-hidden />
                                                <span style={styles.relatedBtnText}>{faq.question}</span>
                                            </button>
                                        ))}
                                        {(msg.relatedContent.changelogs || []).slice(0, 2).map((entry) => (
                                            <button
                                                key={`changelog-${entry.pageId || 'page'}-${entry.id}`}
                                                type="button"
                                                style={styles.relatedBtn}
                                                onClick={() => handleSearch(entry.title)}
                                                title={entry.title}
                                            >
                                                <LuInfo size={12} aria-hidden />
                                                <span style={styles.relatedBtnText}>{entry.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Feedback buttons for AI messages */}
                            {msg.role === 'assistant' && msg.searchHistoryId && (
                                <div style={styles.feedbackRow}>
                                    {msg.feedback ? (
                                        <span style={styles.feedbackDone}>
                                            {msg.feedback === 'resolved' ? <LuThumbsUp size={13} aria-hidden /> : <LuThumbsDown size={13} aria-hidden />}
                                            {msg.feedback === 'resolved' ? 'Marked solved' : 'Marked unresolved'}
                                        </span>
                                    ) : (
                                        <>
                                            <span style={styles.feedbackQuestion}>Did this solve your issue?</span>
                                            <button style={styles.feedbackBtn} onClick={() => handleFeedback(msg.id, 'resolved')} title="Solved" aria-label="Solved">
                                                <LuThumbsUp size={15} aria-hidden />
                                                <span>Solved</span>
                                            </button>
                                            <button style={styles.feedbackBtn} onClick={() => handleFeedback(msg.id, 'not_resolved')} title="Still need help" aria-label="Still need help">
                                                <LuThumbsDown size={15} aria-hidden />
                                                <span>Still need help</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {msg.role === 'assistant'
                                && msg.searchHistoryId
                                && msg.feedback !== 'resolved'
                                && (
                                    msg.fallbackSuggested
                                    || msg.feedback === 'not_resolved'
                                    || msg.escalationTicketDisplayId
                                    || escalationDraft?.messageId === msg.id
                                )
                                && (
                                    <div style={styles.escalationSection}>
                                        {msg.escalationTicketDisplayId ? (
                                            <div style={styles.escalationSuccess} role="status">
                                                <LuCheckCircle size={14} aria-hidden />
                                                Support request #{msg.escalationTicketDisplayId} was created.
                                            </div>
                                        ) : escalationDraft?.messageId === msg.id ? (
                                            <form
                                                style={styles.escalationForm}
                                                onSubmit={(event) => {
                                                    event.preventDefault();
                                                    void handleEscalationSubmit();
                                                }}
                                            >
                                                <div style={styles.escalationHeading}>Send this question to support</div>
                                                <input
                                                    type="email"
                                                    value={escalationDraft.email}
                                                    onChange={(event) => setEscalationDraft(current => current
                                                        ? { ...current, email: event.target.value.slice(0, 254) }
                                                        : current)}
                                                    placeholder="Reply email"
                                                    aria-label="Reply email"
                                                    autoComplete="email"
                                                    required
                                                    style={styles.escalationInput}
                                                />
                                                <input
                                                    type="text"
                                                    value={escalationDraft.name}
                                                    onChange={(event) => setEscalationDraft(current => current
                                                        ? { ...current, name: event.target.value.slice(0, 160) }
                                                        : current)}
                                                    placeholder="Name (optional)"
                                                    aria-label="Name"
                                                    autoComplete="name"
                                                    style={styles.escalationInput}
                                                />
                                                <textarea
                                                    value={escalationDraft.details}
                                                    onChange={(event) => setEscalationDraft(current => current
                                                        ? { ...current, details: event.target.value.slice(0, 1000) }
                                                        : current)}
                                                    placeholder="Add what happened or what you already tried (optional)"
                                                    aria-label="Additional support details"
                                                    rows={3}
                                                    style={styles.escalationTextarea}
                                                />
                                                {escalationError && (
                                                    <div style={styles.escalationError} role="alert">{escalationError}</div>
                                                )}
                                                <div style={styles.escalationActions}>
                                                    <button
                                                        type="submit"
                                                        style={{ ...styles.escalationPrimaryBtn, background: accentColor }}
                                                        disabled={escalationSubmitting}
                                                    >
                                                        <LuSend size={14} aria-hidden />
                                                        {escalationSubmitting ? 'Sending...' : 'Send to support'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        style={styles.escalationSecondaryBtn}
                                                        onClick={() => {
                                                            setEscalationDraft(null);
                                                            setEscalationError(null);
                                                        }}
                                                        disabled={escalationSubmitting}
                                                    >
                                                        Not now
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <button
                                                type="button"
                                                style={styles.escalationOpenBtn}
                                                onClick={() => openEscalationForm(msg)}
                                            >
                                                <LuMessageCircle size={14} aria-hidden />
                                                Contact support
                                            </button>
                                        )}
                                    </div>
                                )}

                            {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                                <div style={styles.suggestionsContainer}>
                                    {msg.suggestedQuestions.map((sq, i) => (
                                        <button key={i} style={styles.suggestionBtn} onClick={() => handleSearch(sq)}>
                                            {sq}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div style={styles.aiMsgRow}>
                        <div style={styles.aiBubble}>
                            <div style={styles.loadingDots}>
                                <span style={{ ...styles.dot, animation: 'widgetDotPulse 1.4s infinite ease-in-out both' }}>●</span>
                                <span style={{ ...styles.dot, animation: 'widgetDotPulse 1.4s infinite ease-in-out both 0.2s' }}>●</span>
                                <span style={{ ...styles.dot, animation: 'widgetDotPulse 1.4s infinite ease-in-out both 0.4s' }}>●</span>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div style={styles.errorContainer}>
                        <p style={styles.errorText}>{error}</p>
                        <button
                            style={styles.retryBtn}
                            onClick={() => {
                                setError(null);
                                const lastUser = [...messages].reverse().find(m => m.role === 'user');
                                if (lastUser) handleSearch(lastUser.content, { appendUserMessage: false });
                            }}
                        >
                            Try again
                        </button>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Image preview */}
            {selectedImage && (
                <div style={styles.imagePreview}>
                    <img src={`data:${selectedImage.mimeType};base64,${selectedImage.base64}`} alt="Preview" style={{ height: 40, borderRadius: 6 }} />
                    <span style={{ fontSize: 11, color: '#6b7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedImage.name}</span>
                    <button style={styles.imageRemoveBtn} onClick={() => setSelectedImage(null)} aria-label="Remove image">
                        <LuX size={14} aria-hidden />
                    </button>
                </div>
            )}

            {/* Input area */}
            <div style={styles.inputArea}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={ANSWERLATTICE_CHAT_IMAGE_ACCEPT}
                    style={{ display: 'none' }}
                    onChange={(e) => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0]); e.target.value = ''; }}
                />
                <button
                    style={styles.imageBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    title={`Attach screenshot (${ANSWERLATTICE_CHAT_IMAGE_ALLOWED_LABEL}, up to 5MB)`}
                    aria-label="Attach screenshot"
                >
                    <LuImage size={18} aria-hidden />
                </button>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={selectedImage ? 'Describe what you need help with...' : 'Ask a question...'}
                    disabled={loading}
                    style={styles.input}
                    autoFocus
                />
                <button
                    onClick={() => handleSearch()}
                    disabled={loading || !query.trim()}
                    style={{ ...styles.sendBtn, background: accentColor, opacity: loading || !query.trim() ? 0.5 : 1 }}
                    aria-label="Send question"
                >
                    <LuSend size={16} aria-hidden />
                </button>
            </div>

            {/* Footer */}
            {poweredByVisible && (
                <div style={styles.footer}>
                    <span style={styles.footerText}>
                        Powered by{' '}
                        <a href="https://answerlattice.com" target="_blank" rel="noopener noreferrer" style={{ ...styles.footerLink, color: accentColor }}>
                            Answerlattice
                        </a>
                    </span>
                </div>
            )}
        </div>
    );
}

const styles: Record<string, CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', width: '100%', height: '100dvh', minHeight: 0, overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#ffffff', color: '#1a1a2e', fontSize: 14 },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 14px', background: '#6366f1', color: '#ffffff', flexShrink: 0 },
    headerMain: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
    headerIcon: { width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 },
    headerText: { minWidth: 0, display: 'flex', flexDirection: 'column' },
    headerTitle: { fontSize: 15, fontWeight: 600 },
    headerSubtitle: { maxWidth: 210, fontSize: 10, lineHeight: 1.25, color: 'rgba(255,255,255,0.78)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    headerActions: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
    headerButton: { width: 40, height: 40, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.18)', color: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    messagesArea: { flex: 1, overflowY: 'auto', padding: 16 },
    welcomeContainer: { width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '28px 12px', boxSizing: 'border-box' },
    welcomeIcon: { color: '#6366f1', marginBottom: 12 },
    welcomeTitle: { maxWidth: '100%', fontSize: 16, fontWeight: 600, margin: '0 0 8px 0', color: '#1a1a2e', overflowWrap: 'break-word' },
    contextChip: { maxWidth: '100%', margin: '0 0 10px 0', padding: '5px 9px', borderRadius: 999, background: '#eef2ff', color: '#4338ca', fontSize: 11, fontWeight: 700, overflowWrap: 'break-word' },
    welcomeSubtext: { maxWidth: 300, fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.5, overflowWrap: 'break-word' },
    starterGrid: { width: '100%', maxWidth: 300, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 },
    starterBtn: { minHeight: 44, padding: '8px 11px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#ffffff', color: '#4338ca', fontSize: 12, fontWeight: 600, lineHeight: 1.3, cursor: 'pointer', textAlign: 'left' as const },
    userMsgRow: { display: 'flex', justifyContent: 'flex-end', marginBottom: 12 },
    aiMsgRow: { display: 'flex', justifyContent: 'flex-start', marginBottom: 12 },
    userBubble: { maxWidth: '80%', padding: '10px 14px', borderRadius: '16px 16px 4px 16px', background: '#6366f1', color: '#ffffff' },
    aiBubble: { maxWidth: '85%', padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: '#f3f4f6', color: '#1a1a2e' },
    knownIssueBubble: { maxWidth: '88%', padding: '11px 14px', borderRadius: '12px 12px 12px 4px', background: '#fff7ed', color: '#7c2d12', border: '1px solid #fed7aa' },
    knownIssueLabel: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: '#c2410c', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const },
    knownIssueLink: { minHeight: 36, marginTop: 8, padding: '6px 10px', borderRadius: 8, border: '1px solid #fdba74', background: '#ffffff', color: '#9a3412', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
    msgText: { margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 13 },
    imageProcessingNotice: { marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 6, color: '#92400e', fontSize: 11, lineHeight: 1.4 },
    canonicalBadge: { marginTop: 8, padding: '4px 8px', borderRadius: 6, background: '#ecfdf5', color: '#059669', fontSize: 11, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 },
    ownerAnswerBadge: { marginTop: 8, padding: '4px 8px', borderRadius: 6, background: '#eef2ff', color: '#4338ca', fontSize: 11, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 },
    procedureContainer: { marginTop: 10, padding: 10, borderRadius: 10, background: '#ffffff', border: '1px solid #e5e7eb' },
    procedureHeader: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#374151', fontSize: 12, fontWeight: 700 },
    procedureMetaBox: { display: 'flex', gap: 8, padding: 8, borderRadius: 8, background: '#eff6ff', color: '#1d4ed8', marginBottom: 8 },
    procedureMetaText: { margin: '0 0 3px 0', fontSize: 11, lineHeight: 1.4 },
    procedureWarningBox: { display: 'flex', gap: 8, padding: 8, borderRadius: 8, background: '#fff7ed', color: '#c2410c', marginBottom: 8 },
    procedureWarningText: { margin: '0 0 3px 0', fontSize: 11, lineHeight: 1.4 },
    procedureSteps: { display: 'flex', flexDirection: 'column', gap: 8 },
    procedureStep: { display: 'flex', gap: 8, alignItems: 'flex-start', padding: 6, borderRadius: 8, border: '1px solid transparent' },
    procedureStepActive: { background: '#f8fafc', borderColor: '#cbd5e1' },
    procedureStepNumber: { width: 22, height: 22, borderRadius: '50%', background: '#6366f1', color: '#ffffff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    procedureStepBody: { minWidth: 0, flex: 1 },
    procedureStepText: { margin: 0, color: '#111827', fontSize: 12, lineHeight: 1.45, overflowWrap: 'break-word' },
    procedureStepTarget: { margin: '3px 0 0 0', color: '#475569', fontSize: 10, lineHeight: 1.4, textTransform: 'capitalize' },
    procedureStepHint: { margin: '3px 0 0 0', color: '#4b5563', fontSize: 11, lineHeight: 1.4, overflowWrap: 'break-word' },
    procedureTroubleshoot: { margin: '3px 0 0 0', color: '#6b7280', fontSize: 11, lineHeight: 1.4, fontStyle: 'italic', overflowWrap: 'break-word' },
    guidanceControls: { marginTop: 10, paddingTop: 10, borderTop: '1px solid #e5e7eb' },
    guidanceStatus: { marginBottom: 8, color: '#475569', fontSize: 11, lineHeight: 1.45 },
    guidanceActionRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
    guidancePrimaryBtn: { minHeight: 44, border: 'none', borderRadius: 8, padding: '0 12px', color: '#ffffff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
    guidanceSecondaryBtn: { minHeight: 44, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', background: '#ffffff', color: '#334155', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
    guidanceTextBtn: { minHeight: 44, border: 'none', borderRadius: 8, padding: '0 8px', background: 'transparent', color: '#64748b', fontSize: 11, cursor: 'pointer' },
    guidanceComplete: { minHeight: 36, display: 'flex', alignItems: 'center', gap: 6, color: '#15803d', fontSize: 11, fontWeight: 700 },
    refsContainer: { marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 },
    refTag: { padding: '3px 8px', borderRadius: 4, border: 0, background: '#e5e7eb', fontSize: 11, color: '#4b5563', display: 'inline-flex', alignItems: 'center', gap: 4 },
    refTagButton: { cursor: 'pointer', textAlign: 'left' as const },
    relatedContainer: { marginTop: 10, padding: 8, borderRadius: 10, background: '#ffffff', border: '1px solid #e5e7eb' },
    relatedHeader: { marginBottom: 6, color: '#374151', fontSize: 11, fontWeight: 700 },
    relatedList: { display: 'flex', flexDirection: 'column', gap: 5 },
    relatedBtn: { minHeight: 44, width: '100%', padding: '7px 8px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left' as const },
    relatedBtnText: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    feedbackRow: { marginTop: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    feedbackQuestion: { width: '100%', fontSize: 11, color: '#6b7280' },
    feedbackBtn: { minHeight: 44, borderRadius: 8, border: '1px solid #e5e7eb', padding: '0 10px', background: '#ffffff', color: '#4b5563', fontSize: 11, cursor: 'pointer', lineHeight: 1.2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 },
    feedbackDone: { fontSize: 11, color: '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: 4 },
    escalationSection: { marginTop: 10, paddingTop: 10, borderTop: '1px solid #e5e7eb' },
    escalationForm: { display: 'flex', flexDirection: 'column', gap: 8 },
    escalationHeading: { color: '#374151', fontSize: 12, fontWeight: 700 },
    escalationInput: { width: '100%', minHeight: 44, boxSizing: 'border-box' as const, border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 10px', background: '#ffffff', color: '#111827', fontSize: 12, outline: 'none' },
    escalationTextarea: { width: '100%', minHeight: 78, boxSizing: 'border-box' as const, resize: 'vertical' as const, border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 10px', background: '#ffffff', color: '#111827', fontSize: 12, lineHeight: 1.4, outline: 'none' },
    escalationError: { color: '#b91c1c', fontSize: 11, lineHeight: 1.4 },
    escalationActions: { display: 'flex', flexWrap: 'wrap', gap: 6 },
    escalationPrimaryBtn: { minHeight: 44, border: 'none', borderRadius: 8, padding: '0 12px', color: '#ffffff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
    escalationSecondaryBtn: { minHeight: 44, border: '1px solid #d1d5db', borderRadius: 8, padding: '0 12px', background: '#ffffff', color: '#4b5563', fontSize: 11, cursor: 'pointer' },
    escalationOpenBtn: { minHeight: 44, border: '1px solid #d1d5db', borderRadius: 8, padding: '0 12px', background: '#ffffff', color: '#374151', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
    escalationSuccess: { minHeight: 44, display: 'flex', alignItems: 'center', gap: 6, color: '#15803d', fontSize: 11, fontWeight: 700 },
    suggestionsContainer: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 },
    suggestionBtn: { padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#ffffff', color: '#6366f1', fontSize: 12, cursor: 'pointer', textAlign: 'left' as const },
    loadingDots: { display: 'flex', gap: 4, padding: '4px 0' },
    dot: { fontSize: 10, color: '#9ca3af' },
    errorContainer: { padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', marginBottom: 12 },
    errorText: { margin: '0 0 8px 0', fontSize: 13, color: '#dc2626' },
    retryBtn: { minHeight: 36, padding: '4px 12px', borderRadius: 6, border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', fontSize: 12, cursor: 'pointer' },
    imagePreview: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderTop: '1px solid #f3f4f6', background: '#f9fafb', minWidth: 0 },
    imageRemoveBtn: { width: 44, height: 44, borderRadius: '50%', border: 'none', background: '#e5e7eb', color: '#6b7280', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    inputArea: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', borderTop: '1px solid #e5e7eb', background: '#ffffff', flexShrink: 0 },
    imageBtn: { width: 44, height: 44, borderRadius: '50%', border: '1px solid #d1d5db', background: '#ffffff', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    input: { flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: 22, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', background: '#f9fafb' },
    sendBtn: { width: 44, height: 44, borderRadius: '50%', border: 'none', background: '#6366f1', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    footer: { padding: '8px 16px', textAlign: 'center' as const, borderTop: '1px solid #f3f4f6', flexShrink: 0 },
    footerText: { fontSize: 11, color: '#9ca3af' },
    footerLink: { color: '#6366f1', textDecoration: 'none', fontWeight: 500 },
};
