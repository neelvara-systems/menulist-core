'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, type CSSProperties, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FEATURE_FLAGS } from '@config/features';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import MyCodexLogoMark from './MyCodexLogoMark';
import { 
    LuMenu, 
    LuX, 
    LuSearch, 
    LuChevronRight, 
    LuChevronDown,
    LuFileText,
    LuFolder,
    LuArrowUp,
    LuHome,
    LuCompass,
    LuSun,
    LuMoon,
    LuMinus,
    LuPlus,
    LuRotateCcw,
    LuColumns,
    LuPanelLeftClose,
    LuPanelLeftOpen,
    LuCopy,
    LuLink,
    LuShare2,
    LuClipboard,
    LuCamera,
    LuSettings,
    LuLogOut,
    LuArrowLeft,
    LuArrowRight,
    LuHistory,
    LuStar,
    LuVolume2,
    LuPlay,
    LuPause,
    LuSquare
} from 'react-icons/lu';

interface DocNode {
    name: string;
    path: string;
    isDir: boolean;
    children?: DocNode[];
}

interface Heading {
    text: string;
    level: number;
    id: string;
}

interface ReaderDocEntry {
    path: string;
    title: string;
    sourcePath: string;
}

interface ReaderHistoryEntry extends ReaderDocEntry {
    visitedAt: number;
}

interface FavoriteDocEntry extends ReaderDocEntry {
    favoritedAt: number;
}

interface QueueDocEntry extends ReaderDocEntry {
    queuedAt: number;
}

type MyCodexDocumentResponse = {
    markdown: string;
    sourcePath?: string;
};

type MyCodexDocumentResponseLogContext = Record<string, boolean | number | string | null | undefined>;

interface ScrollPositionEntry {
    y: number;
    progress: number;
    updatedAt: number;
}

interface SpeechChunk {
    text: string;
    element: HTMLElement | null;
    label: string;
}

interface WakeLockSentinelLike extends EventTarget {
    readonly released: boolean;
    readonly type: 'screen';
    release: () => Promise<void>;
}

type NavigatorWithWakeLock = Navigator & {
    wakeLock?: {
        request: (type: 'screen') => Promise<WakeLockSentinelLike>;
    };
};

interface MyCodexClientContainerProps {
    docsTree: DocNode[];
    currentMarkdown: string;
    currentSlug: string[];
    headings: Heading[];
    isLocalDev: boolean;
    sourceFilePath: string | null;
    viewMode?: 'document' | 'favorites' | 'queue';
}

const createHeadingId = (text: string) => text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const getNodeText = (node: ReactNode): string => {
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }

    if (Array.isArray(node)) {
        return node.map(getNodeText).join('');
    }

    if (React.isValidElement(node)) {
        return getNodeText((node.props as { children?: ReactNode }).children);
    }

    return '';
};

const normalizeMarkdownDocPath = (value: string) => {
    const withoutHash = value.replace(/#.*$/, '');
    return withoutHash.replace(/\.md$/, '');
};

const READER_FONT_SIZE_STORAGE_KEY = 'mycodex:reader-font-size';
const READER_WIDTH_STORAGE_KEY = 'mycodex:reader-width';
const READER_NAV_STORAGE_KEY = 'mycodex:sidebar-pinned';
const READER_EXPANDED_FOLDERS_STORAGE_KEY = 'mycodex:expanded-folders';
const READER_RECENT_DOCS_STORAGE_KEY = 'mycodex:recent-docs';
const READER_FAVORITE_DOCS_STORAGE_KEY = 'mycodex:favorite-docs';
const READER_QUEUE_DOCS_STORAGE_KEY = 'mycodex:queue-docs';
const READER_SCROLL_POSITIONS_STORAGE_KEY = 'mycodex:scroll-positions';
const READER_PENDING_SCROLL_STORAGE_KEY = 'mycodex:pending-scroll-path';
const READER_AUDIO_VOICE_STORAGE_KEY = 'mycodex:audio-voice';
const READER_AUDIO_RATE_STORAGE_KEY = 'mycodex:audio-rate';
const READER_AUDIO_AUTOSCROLL_STORAGE_KEY = 'mycodex:audio-autoscroll';
const READER_AUDIO_WAKE_LOCK_STORAGE_KEY = 'mycodex:audio-wake-lock';
const FAVORITES_ROUTE_PATH = '/favorites';
const QUEUE_ROUTE_PATH = '/queue';
const DEFAULT_READER_FONT_SIZE = 16;
const MIN_READER_FONT_SIZE = 10;
const MAX_READER_FONT_SIZE = 22;
const DEFAULT_READER_AUDIO_RATE = 1;
const MIN_READER_AUDIO_RATE = 0.75;
const MAX_READER_AUDIO_RATE = 1.5;
const MYCODEX_DOCUMENT_RESPONSE_JSON_MAX_BYTES = 4 * 1024 * 1024;
const SPEECH_CHUNK_MAX_LENGTH = 900;
const INDIA_SPEECH_LANGUAGE_CODES = [
    'en-in',
    'hi-in',
    'bn-in',
    'gu-in',
    'kn-in',
    'ml-in',
    'mr-in',
    'pa-in',
    'ta-in',
    'te-in',
    'ur-in',
    'as-in',
    'or-in',
] as const;
const INDIA_SPEECH_NAME_KEYWORDS = [
    'india',
    'indian',
    'hindi',
    'bengali',
    'gujarati',
    'kannada',
    'malayalam',
    'marathi',
    'punjabi',
    'tamil',
    'telugu',
    'urdu',
    'assamese',
    'odia',
] as const;
const MAX_TREE_INDENT_DEPTH = 4;
const MAX_SCREENSHOT_HEIGHT = 14000;
const MAX_RECENT_DOCS = 8;
const MAX_FAVORITE_DOCS = 50;
const MAX_QUEUE_DOCS = 50;
const SETTINGS_DRAWER_TRANSITION_MS = 300;

type ReaderWidth = 'focus' | 'standard' | 'wide';
type AudioStatus = 'idle' | 'playing' | 'paused';

const READER_WIDTH_STEPS: ReaderWidth[] = ['focus', 'standard', 'wide'];
const READER_WIDTH_VALUES: Record<ReaderWidth, string> = {
    focus: '48rem',
    standard: '64rem',
    wide: '82rem',
};
const READER_WIDTH_LABELS: Record<ReaderWidth, string> = {
    focus: 'Focus width',
    standard: 'Standard width',
    wide: 'Wide width',
};

const DOC_TYPE_TITLE_SUFFIXES = [
    'chatgpt-ui-ux-review-progress',
    'public-draft-strategy-review',
    'doc-feedback-audit',
    'code-feedback-audit',
    'logic-verification',
    'localization-contract',
    'mobile-support',
    'testing-guide',
    'test-cases',
    'site-architecture',
    'existing-site-audit',
    'decoupling-analysis',
    'release-validation',
    'phase0-verification',
    'hardening-spec',
    'audit-decisions',
    'chatgpt-review-v4',
    'chatgpt-review-v3',
    'chatgpt-review-v2',
    'chatgpt-review',
    'chatgpt-analysis',
    'cascade-approach',
    'code-review',
    'feedback-audit',
    'final-approach',
    'web-research',
    'image-assets',
    'design-system',
    'seo-aeo',
    'ai-extraction',
    'firebase',
    'marketing',
    'website',
    'helpdoc',
    'content',
    'runbook',
    'checklist',
    'roadmap',
    'validation',
    'verification',
    'improvements',
    'audit',
    'test',
    'spec',
    'impl',
    'adr',
    'old',
] as const;

const DOC_TYPE_TITLE_LABELS: Partial<Record<(typeof DOC_TYPE_TITLE_SUFFIXES)[number], string>> = {
    adr: 'ADR',
    'ai-extraction': 'AI Extraction',
    'chatgpt-analysis': 'ChatGPT Analysis',
    'chatgpt-review': 'ChatGPT Review',
    'chatgpt-review-v2': 'ChatGPT Review V2',
    'chatgpt-review-v3': 'ChatGPT Review V3',
    'chatgpt-review-v4': 'ChatGPT Review V4',
    'chatgpt-ui-ux-review-progress': 'ChatGPT UI/UX Review Progress',
    firebase: 'Firebase',
    impl: 'Impl',
    'seo-aeo': 'SEO/AEO',
    spec: 'Spec',
};

const toTitleCase = (value: string) => value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());

const formatDocumentTitle = (name: string) => {
    const baseName = name.replace(/\.md$/, '');
    const lowerBaseName = baseName.toLowerCase();

    for (const suffix of DOC_TYPE_TITLE_SUFFIXES) {
        const normalizedSuffix = `_${suffix}`;
        if (lowerBaseName.endsWith(normalizedSuffix)) {
            const nameWithoutSuffix = baseName.slice(0, -normalizedSuffix.length);
            const label = DOC_TYPE_TITLE_LABELS[suffix] || toTitleCase(suffix);
            return `${label} - ${toTitleCase(nameWithoutSuffix)}`;
        }
    }

    return toTitleCase(baseName);
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
);

const isReaderHistoryEntry = (value: unknown): value is ReaderHistoryEntry => {
    if (!value || typeof value !== 'object') return false;
    const entry = value as Partial<ReaderHistoryEntry>;
    return typeof entry.path === 'string'
        && typeof entry.title === 'string'
        && typeof entry.sourcePath === 'string'
        && typeof entry.visitedAt === 'number';
};

const isFavoriteDocEntry = (value: unknown): value is FavoriteDocEntry => {
    if (!value || typeof value !== 'object') return false;
    const entry = value as Partial<FavoriteDocEntry>;
    return typeof entry.path === 'string'
        && typeof entry.title === 'string'
        && typeof entry.sourcePath === 'string'
        && typeof entry.favoritedAt === 'number';
};

const isQueueDocEntry = (value: unknown): value is QueueDocEntry => {
    if (!value || typeof value !== 'object') return false;
    const entry = value as Partial<QueueDocEntry>;
    return typeof entry.path === 'string'
        && typeof entry.title === 'string'
        && typeof entry.sourcePath === 'string'
        && typeof entry.queuedAt === 'number';
};

const isScrollPositionRecord = (value: unknown): value is Record<string, ScrollPositionEntry> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

    return Object.values(value).every((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
        const position = entry as Partial<ScrollPositionEntry>;
        return typeof position.y === 'number'
            && typeof position.progress === 'number'
            && typeof position.updatedAt === 'number';
    });
};

const isExpandedFoldersRecord = (value: unknown): value is Record<string, boolean> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.values(value).every((entry) => typeof entry === 'boolean');
};

const isMyCodexDocumentResponse = (value: unknown): value is MyCodexDocumentResponse => (
    isPlainRecord(value)
    && typeof value.markdown === 'string'
    && (value.sourcePath === undefined || typeof value.sourcePath === 'string')
);

const getMyCodexDocumentResponseLogContext = (
    entry: ReaderDocEntry,
    response: Response,
): MyCodexDocumentResponseLogContext => ({
    responseStatus: response.status,
    responseOk: response.ok,
    ...getBoundedRuntimeStringContext('favoritePath', entry.path),
    ...getBoundedRuntimeStringContext('favoriteTitle', entry.title),
});

const readMyCodexDocumentResponse = async (
    response: Response,
    entry: ReaderDocEntry,
): Promise<MyCodexDocumentResponse | null> => {
    const logContext = getMyCodexDocumentResponseLogContext(entry, response);
    let payload: unknown;

    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            MYCODEX_DOCUMENT_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logRuntimeFailure('mycodex_document_response_parse_failed', error, logContext);
        return null;
    }

    if (!isMyCodexDocumentResponse(payload)) {
        logRuntimeFailure(
            'mycodex_document_response_invalid',
            new Error('mycodex_document_response_invalid'),
            logContext,
        );
        return null;
    }

    return payload;
};

const clampReaderFontSize = (value: number) => Math.min(MAX_READER_FONT_SIZE, Math.max(MIN_READER_FONT_SIZE, value));
const clampSpeechRate = (value: number) => Math.min(MAX_READER_AUDIO_RATE, Math.max(MIN_READER_AUDIO_RATE, value));

const normalizeSpeechText = (value: string) => value.replace(/\s+/g, ' ').trim();

const splitSpeechText = (text: string) => {
    const normalized = normalizeSpeechText(text);
    if (!normalized) return [];

    const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [normalized];
    const chunks: string[] = [];
    let currentChunk = '';

    const pushChunk = () => {
        if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = '';
        }
    };

    sentences.forEach((sentence) => {
        const cleanedSentence = normalizeSpeechText(sentence);
        if (!cleanedSentence) return;

        if (cleanedSentence.length > SPEECH_CHUNK_MAX_LENGTH) {
            pushChunk();
            let longLine = '';
            cleanedSentence.split(/\s+/).forEach((word) => {
                const candidate = longLine ? `${longLine} ${word}` : word;
                if (candidate.length > SPEECH_CHUNK_MAX_LENGTH && longLine) {
                    chunks.push(longLine);
                    longLine = word;
                } else {
                    longLine = candidate;
                }
            });
            if (longLine) chunks.push(longLine);
            return;
        }

        const candidate = currentChunk ? `${currentChunk} ${cleanedSentence}` : cleanedSentence;
        if (candidate.length > SPEECH_CHUNK_MAX_LENGTH) {
            pushChunk();
            currentChunk = cleanedSentence;
        } else {
            currentChunk = candidate;
        }
    });

    pushChunk();
    return chunks;
};

const markdownLineToSpeechText = (line: string) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine === '---') return '';
    if (/^[-:| ]+$/.test(trimmedLine.replace(/\|/g, ''))) return '';

    return normalizeSpeechText(trimmedLine
        .replace(/^#{1,6}\s+/, '')
        .replace(/^>\s?/, '')
        .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/, '')
        .replace(/^\s*[-*+]\s+/, '')
        .replace(/^\s*\d+\.\s+/, '')
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/[|*_~]/g, ' ')
        .replace(/\s+/g, ' '));
};

const getSpeechChunksForMarkdown = (markdown: string, fallbackLabel: string): SpeechChunk[] => {
    const chunks: SpeechChunk[] = [];
    let currentLabel = fallbackLabel;
    let insideCodeFence = false;

    markdown.split('\n').forEach((line) => {
        if (line.trim().startsWith('```')) {
            insideCodeFence = !insideCodeFence;
            return;
        }

        if (insideCodeFence) return;

        const isHeading = /^#{1,4}\s+/.test(line.trim());
        const text = markdownLineToSpeechText(line);
        if (!text) return;

        if (isHeading) {
            currentLabel = text;
        }

        splitSpeechText(text).forEach((speechText) => {
            chunks.push({
                text: speechText,
                element: null,
                label: isHeading ? text : currentLabel,
            });
        });
    });

    return chunks;
};

const isIndiaRelatedSpeechVoice = (voice: SpeechSynthesisVoice) => {
    const lang = voice.lang.toLowerCase();
    const name = voice.name.toLowerCase();

    return INDIA_SPEECH_LANGUAGE_CODES.some((code) => lang === code || lang.startsWith(`${code}-`))
        || INDIA_SPEECH_NAME_KEYWORDS.some((keyword) => name.includes(keyword));
};

const getIndiaRelatedSpeechVoices = (voices: SpeechSynthesisVoice[]) => (
    voices.filter(isIndiaRelatedSpeechVoice)
);

const getDefaultIndiaSpeechVoice = (voices: SpeechSynthesisVoice[]) => (
    voices.find((voice) => voice.lang.toLowerCase() === 'en-in')
    || voices.find((voice) => voice.lang.toLowerCase().startsWith('en-in'))
    || voices.find((voice) => voice.lang.toLowerCase() === 'hi-in')
    || voices.find((voice) => voice.lang.toLowerCase().startsWith('hi-in'))
    || voices.find((voice) => voice.default)
    || voices[0]
    || null
);

const isReaderWidth = (value: string | null): value is ReaderWidth => (
    value === 'focus' || value === 'standard' || value === 'wide'
);

const IS_AUDIO_READER_ENABLED = FEATURE_FLAGS.ENABLE_MYCODEX_AUDIO_READER;

export default function MyCodexClientContainer({
    docsTree,
    currentMarkdown,
    currentSlug,
    headings,
    isLocalDev,
    sourceFilePath,
    viewMode = 'document',
}: MyCodexClientContainerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [isDark, setIsDark] = useState<boolean | null>(null);
    const [readerFontSize, setReaderFontSize] = useState(DEFAULT_READER_FONT_SIZE);
    const [readerWidth, setReaderWidth] = useState<ReaderWidth>('standard');
    const [sidebarPinned, setSidebarPinned] = useState(true);
    const [readingProgress, setReadingProgress] = useState(0);
    const [actionStatus, setActionStatus] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(null);
    const [isCopyingScreenshot, setIsCopyingScreenshot] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsMounted, setSettingsMounted] = useState(false);
    const [recentDocs, setRecentDocs] = useState<ReaderHistoryEntry[]>([]);
    const [favoriteDocs, setFavoriteDocs] = useState<FavoriteDocEntry[]>([]);
    const [queueDocs, setQueueDocs] = useState<QueueDocEntry[]>([]);
    const [scrollPositions, setScrollPositions] = useState<Record<string, ScrollPositionEntry>>({});
    const [readerSettingsHydrated, setReaderSettingsHydrated] = useState(false);
    const [isSpeechSupported, setIsSpeechSupported] = useState(false);
    const [speechVoices, setSpeechVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
    const [speechRate, setSpeechRate] = useState(DEFAULT_READER_AUDIO_RATE);
    const [speechAutoScroll, setSpeechAutoScroll] = useState(true);
    const [keepScreenAwake, setKeepScreenAwake] = useState(true);
    const [isWakeLockSupported, setIsWakeLockSupported] = useState(false);
    const [wakeLockActive, setWakeLockActive] = useState(false);
    const [wakeLockUnavailable, setWakeLockUnavailable] = useState(false);
    const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle');
    const [activeSpeechLabel, setActiveSpeechLabel] = useState('');
    const [speechProgress, setSpeechProgress] = useState({ current: 0, total: 0 });
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const readerCaptureRef = useRef<HTMLDivElement | null>(null);
    const actionStatusTimerRef = useRef<number | null>(null);
    const settingsCloseTimerRef = useRef<number | null>(null);
    const settingsOpenFrameRef = useRef<number | null>(null);
    const speechQueueRef = useRef<SpeechChunk[]>([]);
    const speechIndexRef = useRef(0);
    const speechSessionRef = useRef(0);
    const activeSpeechElementRef = useRef<HTMLElement | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
    const wakeLockMessageShownRef = useRef(false);
    const speakSpeechChunkRef = useRef<(index: number) => void>(() => undefined);
    const scrollPositionsRef = useRef<Record<string, ScrollPositionEntry>>({});
    const scrollSaveTimerRef = useRef<number | null>(null);
    const isFavoritesRoute = viewMode === 'favorites';
    const isQueueRoute = viewMode === 'queue';
    const isHomeRoute = viewMode === 'document' && currentSlug.length === 0;

    const clearSettingsAnimationHandles = useCallback(() => {
        if (settingsCloseTimerRef.current !== null) {
            window.clearTimeout(settingsCloseTimerRef.current);
            settingsCloseTimerRef.current = null;
        }

        if (settingsOpenFrameRef.current !== null) {
            window.cancelAnimationFrame(settingsOpenFrameRef.current);
            settingsOpenFrameRef.current = null;
        }
    }, []);

    const openSettingsDrawer = useCallback(() => {
        clearSettingsAnimationHandles();
        setSettingsMounted(true);
        settingsOpenFrameRef.current = window.requestAnimationFrame(() => {
            settingsOpenFrameRef.current = null;
            setSettingsOpen(true);
        });
    }, [clearSettingsAnimationHandles]);

    const closeSettingsDrawer = useCallback(() => {
        clearSettingsAnimationHandles();
        setSettingsOpen(false);
        settingsCloseTimerRef.current = window.setTimeout(() => {
            settingsCloseTimerRef.current = null;
            setSettingsMounted(false);
        }, SETTINGS_DRAWER_TRANSITION_MS);
    }, [clearSettingsAnimationHandles]);

    // Read theme from localStorage / system pref on mount
    useEffect(() => {
        const stored = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDark(stored ? stored === 'dark' : prefersDark);

        const storedFontSize = Number(localStorage.getItem(READER_FONT_SIZE_STORAGE_KEY));
        if (Number.isFinite(storedFontSize)) {
            setReaderFontSize(clampReaderFontSize(storedFontSize));
        }

        const storedWidth = localStorage.getItem(READER_WIDTH_STORAGE_KEY);
        if (isReaderWidth(storedWidth)) {
            setReaderWidth(storedWidth);
        }

        const storedSidebarPinned = localStorage.getItem(READER_NAV_STORAGE_KEY);
        if (storedSidebarPinned === 'false') {
            setSidebarPinned(false);
        }

        const storedVoiceURI = localStorage.getItem(READER_AUDIO_VOICE_STORAGE_KEY);
        if (storedVoiceURI) {
            setSelectedVoiceURI(storedVoiceURI);
        }

        const storedSpeechRate = Number(localStorage.getItem(READER_AUDIO_RATE_STORAGE_KEY));
        if (Number.isFinite(storedSpeechRate)) {
            setSpeechRate(clampSpeechRate(storedSpeechRate));
        }

        const storedAutoScroll = localStorage.getItem(READER_AUDIO_AUTOSCROLL_STORAGE_KEY);
        if (storedAutoScroll === 'false') {
            setSpeechAutoScroll(false);
        }

        const storedWakeLock = localStorage.getItem(READER_AUDIO_WAKE_LOCK_STORAGE_KEY);
        if (storedWakeLock === 'false') {
            setKeepScreenAwake(false);
        }

        try {
            const storedExpandedFolders = JSON.parse(localStorage.getItem(READER_EXPANDED_FOLDERS_STORAGE_KEY) || '{}');
            if (isExpandedFoldersRecord(storedExpandedFolders)) {
                setExpandedFolders(storedExpandedFolders);
            } else {
                localStorage.removeItem(READER_EXPANDED_FOLDERS_STORAGE_KEY);
            }
        } catch {
            localStorage.removeItem(READER_EXPANDED_FOLDERS_STORAGE_KEY);
        }

        try {
            const storedRecentDocs = JSON.parse(localStorage.getItem(READER_RECENT_DOCS_STORAGE_KEY) || '[]');
            if (Array.isArray(storedRecentDocs)) {
                setRecentDocs(storedRecentDocs.filter(isReaderHistoryEntry).slice(0, MAX_RECENT_DOCS));
            }
        } catch {
            localStorage.removeItem(READER_RECENT_DOCS_STORAGE_KEY);
        }

        try {
            const storedFavoriteDocs = JSON.parse(localStorage.getItem(READER_FAVORITE_DOCS_STORAGE_KEY) || '[]');
            if (Array.isArray(storedFavoriteDocs)) {
                setFavoriteDocs(storedFavoriteDocs.filter(isFavoriteDocEntry).slice(0, MAX_FAVORITE_DOCS));
            }
        } catch {
            localStorage.removeItem(READER_FAVORITE_DOCS_STORAGE_KEY);
        }

        try {
            const storedQueueDocs = JSON.parse(localStorage.getItem(READER_QUEUE_DOCS_STORAGE_KEY) || '[]');
            if (Array.isArray(storedQueueDocs)) {
                setQueueDocs(storedQueueDocs.filter(isQueueDocEntry).slice(0, MAX_QUEUE_DOCS));
            }
        } catch {
            localStorage.removeItem(READER_QUEUE_DOCS_STORAGE_KEY);
        }

        try {
            const storedScrollPositions = JSON.parse(localStorage.getItem(READER_SCROLL_POSITIONS_STORAGE_KEY) || '{}');
            if (isScrollPositionRecord(storedScrollPositions)) {
                scrollPositionsRef.current = storedScrollPositions;
                setScrollPositions(storedScrollPositions);
            } else {
                localStorage.removeItem(READER_SCROLL_POSITIONS_STORAGE_KEY);
            }
        } catch {
            localStorage.removeItem(READER_SCROLL_POSITIONS_STORAGE_KEY);
        }

        setReaderSettingsHydrated(true);
    }, []);

    // Apply dark class to <html> and persist
    useEffect(() => {
        if (isDark === null || !readerSettingsHydrated) return;
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark, readerSettingsHydrated]);

    const toggleTheme = () => setIsDark((prev) => !prev);

    useEffect(() => {
        if (!readerSettingsHydrated) return;
        localStorage.setItem(READER_FONT_SIZE_STORAGE_KEY, String(readerFontSize));
    }, [readerFontSize, readerSettingsHydrated]);

    useEffect(() => {
        if (!readerSettingsHydrated) return;
        localStorage.setItem(READER_WIDTH_STORAGE_KEY, readerWidth);
    }, [readerSettingsHydrated, readerWidth]);

    useEffect(() => {
        if (!readerSettingsHydrated) return;
        localStorage.setItem(READER_NAV_STORAGE_KEY, String(sidebarPinned));
    }, [readerSettingsHydrated, sidebarPinned]);

    useEffect(() => {
        if (!readerSettingsHydrated) return;
        try {
            localStorage.setItem(READER_EXPANDED_FOLDERS_STORAGE_KEY, JSON.stringify(expandedFolders));
        } catch {
            // Expanded folders are convenience state; never block reading.
        }
    }, [expandedFolders, readerSettingsHydrated]);

    useEffect(() => {
        if (!readerSettingsHydrated) return;
        try {
            localStorage.setItem(READER_FAVORITE_DOCS_STORAGE_KEY, JSON.stringify(favoriteDocs));
        } catch {
            // Favorites are convenience state; never block reading.
        }
    }, [favoriteDocs, readerSettingsHydrated]);

    useEffect(() => {
        if (!readerSettingsHydrated) return;
        try {
            localStorage.setItem(READER_QUEUE_DOCS_STORAGE_KEY, JSON.stringify(queueDocs));
        } catch {
            // Queue is convenience state; never block reading.
        }
    }, [queueDocs, readerSettingsHydrated]);

    useEffect(() => {
        if (!readerSettingsHydrated) return;
        if (!selectedVoiceURI) return;
        localStorage.setItem(READER_AUDIO_VOICE_STORAGE_KEY, selectedVoiceURI);
    }, [readerSettingsHydrated, selectedVoiceURI]);

    useEffect(() => {
        if (!readerSettingsHydrated) return;
        localStorage.setItem(READER_AUDIO_RATE_STORAGE_KEY, String(speechRate));
    }, [readerSettingsHydrated, speechRate]);

    useEffect(() => {
        if (!readerSettingsHydrated) return;
        localStorage.setItem(READER_AUDIO_AUTOSCROLL_STORAGE_KEY, String(speechAutoScroll));
    }, [readerSettingsHydrated, speechAutoScroll]);

    useEffect(() => {
        if (!readerSettingsHydrated) return;
        localStorage.setItem(READER_AUDIO_WAKE_LOCK_STORAGE_KEY, String(keepScreenAwake));
    }, [keepScreenAwake, readerSettingsHydrated]);

    useEffect(() => {
        if (!IS_AUDIO_READER_ENABLED) return;
        if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') return;

        const synthesis = window.speechSynthesis;
        setIsSpeechSupported(true);

        const loadVoices = () => {
            const voices = getIndiaRelatedSpeechVoices(synthesis.getVoices());
            setSpeechVoices(voices);
            setSelectedVoiceURI((previousVoiceURI) => {
                if (previousVoiceURI && voices.some((voice) => voice.voiceURI === previousVoiceURI)) {
                    return previousVoiceURI;
                }

                const storedVoiceURI = localStorage.getItem(READER_AUDIO_VOICE_STORAGE_KEY);
                if (storedVoiceURI && voices.some((voice) => voice.voiceURI === storedVoiceURI)) {
                    return storedVoiceURI;
                }

                if (storedVoiceURI) {
                    localStorage.removeItem(READER_AUDIO_VOICE_STORAGE_KEY);
                }

                return getDefaultIndiaSpeechVoice(voices)?.voiceURI || '';
            });
        };

        loadVoices();
        synthesis.addEventListener('voiceschanged', loadVoices);

        return () => {
            synthesis.removeEventListener('voiceschanged', loadVoices);
        };
    }, []);

    useEffect(() => {
        if (!IS_AUDIO_READER_ENABLED) return;
        setIsWakeLockSupported(Boolean((navigator as NavigatorWithWakeLock).wakeLock?.request));
    }, []);

    useEffect(() => {
        const isMobileViewport = window.matchMedia('(max-width: 767px)').matches;
        const shouldLockScroll = settingsMounted || (sidebarOpen && isMobileViewport);
        if (!shouldLockScroll) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [sidebarOpen, settingsMounted]);

    useEffect(() => {
        return () => {
            if (actionStatusTimerRef.current) {
                window.clearTimeout(actionStatusTimerRef.current);
            }

            if (scrollSaveTimerRef.current) {
                window.clearTimeout(scrollSaveTimerRef.current);
            }

            clearSettingsAnimationHandles();
        };
    }, [clearSettingsAnimationHandles]);

    const decreaseReaderFontSize = () => {
        setReaderFontSize((previous) => clampReaderFontSize(previous - 1));
    };

    const increaseReaderFontSize = () => {
        setReaderFontSize((previous) => clampReaderFontSize(previous + 1));
    };

    const resetReaderFontSize = () => {
        setReaderFontSize(DEFAULT_READER_FONT_SIZE);
    };

    const cycleReaderWidth = () => {
        setReaderWidth((previous) => {
            const currentIndex = READER_WIDTH_STEPS.indexOf(previous);
            return READER_WIDTH_STEPS[(currentIndex + 1) % READER_WIDTH_STEPS.length];
        });
    };

    // Track scroll position for progress and quick return-to-top access.
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollableDistance = document.documentElement.scrollHeight - window.innerHeight;
            const progress = scrollableDistance > 0 ? (scrollTop / scrollableDistance) * 100 : 0;
            setReadingProgress(Math.min(100, Math.max(0, progress)));
            setShowScrollTop(scrollTop > 300);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const isEditableTarget = target && (
                target.tagName === 'INPUT'
                || target.tagName === 'TEXTAREA'
                || target.isContentEditable
            );

            if (event.key === 'Escape') {
                setSidebarOpen(false);
                closeSettingsDrawer();
                return;
            }

            if (!isEditableTarget && event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
                event.preventDefault();
                setSidebarPinned(true);
                setSidebarOpen(true);
                window.setTimeout(() => searchInputRef.current?.focus(), 0);
                return;
            }

            if (isEditableTarget || (!event.metaKey && !event.ctrlKey)) {
                return;
            }

            if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                setReaderFontSize((previous) => clampReaderFontSize(previous + 1));
            } else if (event.key === '-' || event.key === '_') {
                event.preventDefault();
                setReaderFontSize((previous) => clampReaderFontSize(previous - 1));
            } else if (event.key === '0') {
                event.preventDefault();
                setReaderFontSize(DEFAULT_READER_FONT_SIZE);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [closeSettingsDrawer]);

    const currentPath = isFavoritesRoute ? FAVORITES_ROUTE_PATH : isQueueRoute ? QUEUE_ROUTE_PATH : '/' + currentSlug.join('/');

    // Auto-expand folder tree leading to the active document
    useEffect(() => {
        if (currentSlug.length > 0) {
            setExpandedFolders((previous) => {
                const nextExpanded: Record<string, boolean> = { ...previous };
                let pathAccumulator = '';
                for (let i = 0; i < currentSlug.length - 1; i++) {
                    pathAccumulator = pathAccumulator ? `${pathAccumulator}/${currentSlug[i]}` : currentSlug[i];
                    nextExpanded[pathAccumulator] = true;
                }
                return nextExpanded;
            });
        }
    }, [currentSlug]);

    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => ({
            ...prev,
            [path]: !prev[path]
        }));
    };

    // Filter documentation tree based on search query
    const filteredTree = useMemo(() => {
        if (!searchQuery.trim()) return docsTree;

        const query = searchQuery.toLowerCase();

        const filterNodes = (nodes: DocNode[]): DocNode[] => {
            return nodes
                .map(node => {
                    if (node.isDir && node.children) {
                        const matchSelf = node.name.toLowerCase().includes(query);
                        if (matchSelf) {
                            return {
                                ...node,
                                children: node.children
                            };
                        }

                        const filteredChildren = filterNodes(node.children);
                        if (filteredChildren.length > 0) {
                            return {
                                ...node,
                                children: filteredChildren
                            };
                        }
                    } else if (node.name.toLowerCase().includes(query) || node.path.toLowerCase().includes(query)) {
                        return node;
                    }
                    return null;
                })
                .filter((node): node is DocNode => node !== null);
        };

        return filterNodes(docsTree);
    }, [docsTree, searchQuery]);

    const formatTitle = formatDocumentTitle;

    // Build standard URL based on current routing prefix
    const buildUrl = useCallback((targetPath: string) => {
        const normalizedTargetPath = String(targetPath || '').trim();
        const safeTargetPath = !normalizedTargetPath || normalizedTargetPath.startsWith('//') ? '/' : normalizedTargetPath;
        const cleanPath = safeTargetPath.startsWith('/') ? safeTargetPath : '/' + safeTargetPath;
        return isLocalDev ? `/__mycodex${cleanPath === '/' ? '' : cleanPath}` : cleanPath;
    }, [isLocalDev]);

    const documentEntries = useMemo(() => {
        const entries: ReaderDocEntry[] = [{
            path: '/',
            title: 'Master Index',
            sourcePath: '__docs__/index.md',
        }];

        const visitNodes = (nodes: DocNode[]) => {
            nodes.forEach((node) => {
                if (node.isDir) {
                    visitNodes(node.children || []);
                    return;
                }

                entries.push({
                    path: `/${node.path}`,
                    title: formatTitle(node.name),
                    sourcePath: `__docs__/${node.path}.md`,
                });
            });
        };

        visitNodes(docsTree);
        return entries;
    }, [docsTree, formatTitle]);

    const openNavigationSearch = () => {
        setSidebarPinned(true);
        setSidebarOpen(true);
        closeSettingsDrawer();
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
    };

    const currentDocumentTitle = isQueueRoute
        ? 'Read Later'
        : isFavoritesRoute
        ? 'Favorites'
        : currentSlug.length > 0
            ? formatTitle(currentSlug[currentSlug.length - 1])
            : 'Master Index';

    const fallbackSourcePath = isQueueRoute
        ? READER_QUEUE_DOCS_STORAGE_KEY
        : isFavoritesRoute
        ? READER_FAVORITE_DOCS_STORAGE_KEY
        : currentSlug.length > 0
            ? `__docs__/${currentSlug.join('/')}.md`
            : '__docs__/index.md';
    const documentSourcePath = isQueueRoute ? READER_QUEUE_DOCS_STORAGE_KEY : isFavoritesRoute ? READER_FAVORITE_DOCS_STORAGE_KEY : sourceFilePath || fallbackSourcePath;
    const documentSourceLabel = isQueueRoute || isFavoritesRoute ? 'Browser storage' : sourceFilePath ? 'Source file' : 'Document route';
    const currentDocumentIndex = documentEntries.findIndex((entry) => entry.path === currentPath);
    const previousDocument = currentDocumentIndex > 0 ? documentEntries[currentDocumentIndex - 1] : null;
    const nextDocument = currentDocumentIndex >= 0 && currentDocumentIndex < documentEntries.length - 1
        ? documentEntries[currentDocumentIndex + 1]
        : null;
    const visibleRecentDocs = recentDocs.filter((entry) => entry.path !== currentPath).slice(0, 5);
    const continueReadingDoc = recentDocs.find((entry) => entry.path !== '/' && entry.path !== FAVORITES_ROUTE_PATH && entry.path !== QUEUE_ROUTE_PATH) || null;
    const isDocumentRoute = !isFavoritesRoute && !isQueueRoute && !isHomeRoute;
    const isCurrentDocumentFavorite = isDocumentRoute && favoriteDocs.some((entry) => entry.path === currentPath);
    const isCurrentDocumentQueued = isDocumentRoute && queueDocs.some((entry) => entry.path === currentPath);
    const visibleFavoriteDocs = favoriteDocs.slice(0, 8);
    const visibleQueueDocs = queueDocs.slice(0, 8);
    const currentScrollPosition = isDocumentRoute ? scrollPositions[currentPath] : undefined;
    const continueScrollPosition = continueReadingDoc ? scrollPositions[continueReadingDoc.path] : undefined;
    const goToDocument = (targetPath: string | undefined) => {
        if (!targetPath) return;
        window.location.href = buildUrl(targetPath);
    };

    useEffect(() => {
        if (isFavoritesRoute || isQueueRoute || isHomeRoute) return;

        const currentEntry: ReaderHistoryEntry = {
            path: currentPath || '/',
            title: currentDocumentTitle,
            sourcePath: documentSourcePath,
            visitedAt: Date.now(),
        };

        setRecentDocs((previous) => {
            const next = [
                currentEntry,
                ...previous.filter((entry) => entry.path !== currentEntry.path),
            ].slice(0, MAX_RECENT_DOCS);
            try {
                localStorage.setItem(READER_RECENT_DOCS_STORAGE_KEY, JSON.stringify(next));
            } catch {
                // Recent docs are a convenience only; never block reading.
            }
            return next;
        });
    }, [currentDocumentTitle, currentPath, documentSourcePath, isFavoritesRoute, isHomeRoute, isQueueRoute]);

    useEffect(() => {
        if (!readerSettingsHydrated || !isDocumentRoute) return;

        const saveScrollPosition = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollableDistance = document.documentElement.scrollHeight - window.innerHeight;
            const progress = scrollableDistance > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollableDistance) * 100)) : 0;
            if (scrollTop < 120) return;

            scrollPositionsRef.current = {
                ...scrollPositionsRef.current,
                [currentPath]: {
                    y: Math.round(scrollTop),
                    progress: Math.round(progress),
                    updatedAt: Date.now(),
                },
            };

            if (scrollSaveTimerRef.current !== null) return;

            scrollSaveTimerRef.current = window.setTimeout(() => {
                scrollSaveTimerRef.current = null;
                const nextPositions = scrollPositionsRef.current;
                setScrollPositions(nextPositions);
                try {
                    localStorage.setItem(READER_SCROLL_POSITIONS_STORAGE_KEY, JSON.stringify(nextPositions));
                } catch {
                    // Scroll resume is convenience state; never block reading.
                }
            }, 700);
        };

        saveScrollPosition();
        window.addEventListener('scroll', saveScrollPosition, { passive: true });
        window.addEventListener('pagehide', saveScrollPosition);

        return () => {
            saveScrollPosition();
            window.removeEventListener('scroll', saveScrollPosition);
            window.removeEventListener('pagehide', saveScrollPosition);
        };
    }, [currentPath, isDocumentRoute, readerSettingsHydrated]);

    useEffect(() => {
        if (!readerSettingsHydrated || !isDocumentRoute || !currentScrollPosition) return;
        const pendingScrollPath = sessionStorage.getItem(READER_PENDING_SCROLL_STORAGE_KEY);
        if (pendingScrollPath !== currentPath) return;

        sessionStorage.removeItem(READER_PENDING_SCROLL_STORAGE_KEY);
        window.setTimeout(() => {
            window.scrollTo({ top: currentScrollPosition.y, behavior: 'smooth' });
        }, 250);
    }, [currentPath, currentScrollPosition, isDocumentRoute, readerSettingsHydrated]);

    const showActionStatus = useCallback((message: string, tone: 'success' | 'error' | 'info' = 'success') => {
        setActionStatus({ message, tone });
        if (actionStatusTimerRef.current) {
            window.clearTimeout(actionStatusTimerRef.current);
        }
        actionStatusTimerRef.current = window.setTimeout(() => setActionStatus(null), 2400);
    }, []);

    const resumeCurrentDocumentPosition = useCallback(() => {
        if (!currentScrollPosition) return;
        window.scrollTo({ top: currentScrollPosition.y, behavior: 'smooth' });
        showActionStatus('Restored reading position', 'info');
    }, [currentScrollPosition, showActionStatus]);

    const openDocumentAtSavedPosition = useCallback((entry: ReaderDocEntry) => {
        const savedPosition = scrollPositionsRef.current[entry.path];
        if (savedPosition?.y && savedPosition.y > 120) {
            sessionStorage.setItem(READER_PENDING_SCROLL_STORAGE_KEY, entry.path);
        }
        window.location.href = buildUrl(entry.path);
    }, [buildUrl]);

    const toggleCurrentDocumentFavorite = () => {
        if (!isDocumentRoute) {
            return;
        }

        const favoriteEntry: FavoriteDocEntry = {
            path: currentPath || '/',
            title: currentDocumentTitle,
            sourcePath: documentSourcePath,
            favoritedAt: Date.now(),
        };

        const wasFavorite = favoriteDocs.some((entry) => entry.path === favoriteEntry.path);

        setFavoriteDocs((previous) => (
            wasFavorite
                ? previous.filter((entry) => entry.path !== favoriteEntry.path)
                : [
                    favoriteEntry,
                    ...previous.filter((entry) => entry.path !== favoriteEntry.path),
                ].slice(0, MAX_FAVORITE_DOCS)
        ));

        showActionStatus(wasFavorite ? 'Removed from favorites' : 'Added to favorites', wasFavorite ? 'info' : 'success');
    };

    const toggleCurrentDocumentQueue = () => {
        if (!isDocumentRoute) {
            return;
        }

        const queueEntry: QueueDocEntry = {
            path: currentPath || '/',
            title: currentDocumentTitle,
            sourcePath: documentSourcePath,
            queuedAt: Date.now(),
        };

        const wasQueued = queueDocs.some((entry) => entry.path === queueEntry.path);

        setQueueDocs((previous) => (
            wasQueued
                ? previous.filter((entry) => entry.path !== queueEntry.path)
                : [
                    queueEntry,
                    ...previous.filter((entry) => entry.path !== queueEntry.path),
                ].slice(0, MAX_QUEUE_DOCS)
        ));

        showActionStatus(wasQueued ? 'Removed from queue' : 'Added to queue', wasQueued ? 'info' : 'success');
    };

    const releaseWakeLock = useCallback(async () => {
        const currentWakeLock = wakeLockRef.current;
        wakeLockRef.current = null;

        if (currentWakeLock && !currentWakeLock.released) {
            try {
                await currentWakeLock.release();
            } catch {
                // The browser may already have released it during visibility changes.
            }
        }

        setWakeLockActive(false);
    }, []);

    const requestWakeLock = useCallback(async () => {
        if (!IS_AUDIO_READER_ENABLED || !keepScreenAwake) return;

        const nav = navigator as NavigatorWithWakeLock;
        if (!nav.wakeLock?.request) {
            setIsWakeLockSupported(false);
            setWakeLockUnavailable(true);
            if (!wakeLockMessageShownRef.current) {
                showActionStatus('Keep-awake is not available in this browser', 'info');
                wakeLockMessageShownRef.current = true;
            }
            return;
        }

        if (wakeLockRef.current && !wakeLockRef.current.released) {
            setWakeLockActive(true);
            setWakeLockUnavailable(false);
            return;
        }

        try {
            const wakeLock = await nav.wakeLock.request('screen');
            wakeLockRef.current = wakeLock;
            setIsWakeLockSupported(true);
            setWakeLockActive(true);
            setWakeLockUnavailable(false);
            wakeLock.addEventListener('release', () => {
                if (wakeLockRef.current === wakeLock) {
                    wakeLockRef.current = null;
                }
                setWakeLockActive(false);
            }, { once: true });
        } catch {
            wakeLockRef.current = null;
            setWakeLockActive(false);
            setWakeLockUnavailable(true);
            if (!wakeLockMessageShownRef.current) {
                showActionStatus('Keep-awake could not start on this device', 'info');
                wakeLockMessageShownRef.current = true;
            }
        }
    }, [keepScreenAwake, showActionStatus]);

    const clearSpeechHighlight = useCallback(() => {
        if (activeSpeechElementRef.current) {
            activeSpeechElementRef.current.classList.remove('mycodex-speaking-block');
            activeSpeechElementRef.current = null;
        }
    }, []);

    const endSpeechSession = useCallback((shouldCancel = true) => {
        speechSessionRef.current += 1;

        if (shouldCancel && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        utteranceRef.current = null;
        speechQueueRef.current = [];
        speechIndexRef.current = 0;
        setAudioStatus('idle');
        setActiveSpeechLabel('');
        setSpeechProgress({ current: 0, total: 0 });
        clearSpeechHighlight();
        void releaseWakeLock();
    }, [clearSpeechHighlight, releaseWakeLock]);

    const getSpeechVoice = useCallback(() => {
        if (speechVoices.length === 0) return null;
        return speechVoices.find((voice) => voice.voiceURI === selectedVoiceURI)
            || speechVoices.find((voice) => voice.default)
            || speechVoices[0]
            || null;
    }, [selectedVoiceURI, speechVoices]);

    const markActiveSpeechElement = useCallback((element: HTMLElement | null) => {
        clearSpeechHighlight();
        if (!element) return;

        element.classList.add('mycodex-speaking-block');
        activeSpeechElementRef.current = element;

        if (speechAutoScroll) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [clearSpeechHighlight, speechAutoScroll]);

    const speakSpeechChunk = useCallback((index: number) => {
        if (!IS_AUDIO_READER_ENABLED || !isSpeechSupported || !('speechSynthesis' in window)) return;

        const chunk = speechQueueRef.current[index];
        if (!chunk) {
            endSpeechSession(false);
            return;
        }

        const sessionId = speechSessionRef.current;
        const synthesis = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(chunk.text);
        const voice = getSpeechVoice();
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        }
        utterance.rate = speechRate;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => {
            setAudioStatus('playing');
            setActiveSpeechLabel(chunk.label);
            setSpeechProgress({
                current: index + 1,
                total: speechQueueRef.current.length,
            });
            markActiveSpeechElement(chunk.element);
            void requestWakeLock();
        };

        utterance.onend = () => {
            if (sessionId !== speechSessionRef.current) return;
            if (speechIndexRef.current !== index) return;
            const nextIndex = index + 1;
            if (nextIndex < speechQueueRef.current.length) {
                speechIndexRef.current = nextIndex;
                window.setTimeout(() => speakSpeechChunkRef.current(nextIndex), 0);
                return;
            }

            endSpeechSession(false);
            showActionStatus('Finished reading', 'info');
        };

        utterance.onerror = () => {
            if (sessionId !== speechSessionRef.current) return;
            endSpeechSession(true);
            showActionStatus('Could not play audio', 'error');
        };

        utteranceRef.current = utterance;
        synthesis.speak(utterance);
    }, [endSpeechSession, getSpeechVoice, isSpeechSupported, markActiveSpeechElement, requestWakeLock, showActionStatus, speechRate]);

    useEffect(() => {
        speakSpeechChunkRef.current = speakSpeechChunk;
    }, [speakSpeechChunk]);

    useEffect(() => {
        return () => {
            endSpeechSession(true);
        };
    }, [endSpeechSession]);

    useEffect(() => {
        endSpeechSession(true);
    }, [currentPath, endSpeechSession]);

    useEffect(() => {
        if (!IS_AUDIO_READER_ENABLED) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && audioStatus === 'playing') {
                void requestWakeLock();
                return;
            }

            if (document.visibilityState !== 'visible') {
                void releaseWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [audioStatus, releaseWakeLock, requestWakeLock]);

    useEffect(() => {
        if (!keepScreenAwake) {
            wakeLockMessageShownRef.current = false;
            void releaseWakeLock();
            return;
        }

        if (audioStatus === 'playing') {
            void requestWakeLock();
        }
    }, [audioStatus, keepScreenAwake, releaseWakeLock, requestWakeLock]);

    const getReadableSpeechElements = useCallback(() => {
        const proseRoot = readerCaptureRef.current?.querySelector('.prose-custom');
        if (!proseRoot) return [];

        const readableSelector = 'h1, h2, h3, h4, p, li, blockquote';

        return Array.from(proseRoot.querySelectorAll<HTMLElement>(readableSelector))
            .filter((element) => {
                if (element.closest('pre, code')) return false;
                const parentReadableElement = element.parentElement?.closest(readableSelector);
                if (parentReadableElement && proseRoot.contains(parentReadableElement)) return false;
                return normalizeSpeechText(element.innerText || '').length > 1;
            });
    }, []);

    const getSpeechChunksForElements = useCallback((elements: HTMLElement[]) => (
        elements.flatMap((element) => {
            const elementText = normalizeSpeechText(element.innerText || '');
            const elementLabel = /^H[1-4]$/.test(element.tagName)
                ? elementText
                : currentDocumentTitle;

            return splitSpeechText(elementText).map((text) => ({
                text,
                element,
                label: elementLabel,
            }));
        })
    ), [currentDocumentTitle]);

    const startSpeechQueue = useCallback((chunks: SpeechChunk[], emptyMessage: string) => {
        if (!IS_AUDIO_READER_ENABLED) return;

        if (!isSpeechSupported || !('speechSynthesis' in window)) {
            showActionStatus('Voice reading is not available in this browser', 'error');
            return;
        }

        const cleanChunks = chunks.filter((chunk) => normalizeSpeechText(chunk.text).length > 0);
        if (cleanChunks.length === 0) {
            showActionStatus(emptyMessage, 'info');
            return;
        }

        speechSessionRef.current += 1;
        window.speechSynthesis.cancel();
        speechQueueRef.current = cleanChunks;
        speechIndexRef.current = 0;
        setSpeechProgress({ current: 0, total: cleanChunks.length });
        setActiveSpeechLabel('');
        speakSpeechChunkRef.current(0);
    }, [isSpeechSupported, showActionStatus]);

    const readCurrentPage = useCallback(() => {
        startSpeechQueue(
            getSpeechChunksForElements(getReadableSpeechElements()),
            'No readable page content found'
        );
    }, [getReadableSpeechElements, getSpeechChunksForElements, startSpeechQueue]);

    const removeFavoriteDocument = useCallback((favoritePath: string) => {
        setFavoriteDocs((previous) => previous.filter((entry) => entry.path !== favoritePath));
        showActionStatus('Removed from favorites', 'info');
    }, [showActionStatus]);

    const fetchFavoriteDocumentMarkdown = useCallback(async (entry: ReaderDocEntry) => {
        const response = await fetch(buildUrl(`/api/document?path=${encodeURIComponent(entry.path)}`), {
            cache: 'no-store',
            credentials: 'same-origin',
            redirect: 'manual',
        });

        const payload = await readMyCodexDocumentResponse(response, entry);
        if (!response.ok || !payload) {
            throw new Error('Favorite document could not be loaded');
        }

        return payload.markdown;
    }, [buildUrl]);

    const getSpeechChunksForFavoriteDocument = useCallback(async (entry: ReaderDocEntry) => {
        const markdown = await fetchFavoriteDocumentMarkdown(entry);
        return getSpeechChunksForMarkdown(markdown, entry.title);
    }, [fetchFavoriteDocumentMarkdown]);

    const readFavoriteDocument = useCallback(async (entry: ReaderDocEntry) => {
        if (!IS_AUDIO_READER_ENABLED) return;

        if (!isSpeechSupported || !('speechSynthesis' in window)) {
            showActionStatus('Voice reading is not available in this browser', 'error');
            return;
        }

        try {
            showActionStatus('Preparing favorite', 'info');
            const chunks = await getSpeechChunksForFavoriteDocument(entry);
            startSpeechQueue(chunks, 'No readable content found');
        } catch {
            showActionStatus('Could not load favorite', 'error');
        }
    }, [getSpeechChunksForFavoriteDocument, isSpeechSupported, showActionStatus, startSpeechQueue]);

    const readFavoriteDocumentsQueue = useCallback(async (entries = favoriteDocs) => {
        if (!IS_AUDIO_READER_ENABLED) return;

        if (entries.length === 0) {
            showActionStatus('No favorites saved yet', 'info');
            return;
        }

        if (!isSpeechSupported || !('speechSynthesis' in window)) {
            showActionStatus('Voice reading is not available in this browser', 'error');
            return;
        }

        showActionStatus(`Preparing ${entries.length} favorite${entries.length === 1 ? '' : 's'}`, 'info');

        const allChunks: SpeechChunk[] = [];
        let failedDocuments = 0;

        for (const entry of entries) {
            try {
                const chunks = await getSpeechChunksForFavoriteDocument(entry);
                allChunks.push(...chunks);
            } catch {
                failedDocuments += 1;
            }
        }

        if (failedDocuments > 0 && allChunks.length > 0) {
            showActionStatus(`${failedDocuments} favorite${failedDocuments === 1 ? '' : 's'} skipped`, 'info');
        }

        startSpeechQueue(allChunks, failedDocuments > 0 ? 'No readable favorites loaded' : 'No readable favorites found');
    }, [favoriteDocs, getSpeechChunksForFavoriteDocument, isSpeechSupported, showActionStatus, startSpeechQueue]);

    const readQueueDocuments = useCallback(async (entries = queueDocs) => {
        if (!IS_AUDIO_READER_ENABLED) return;

        if (entries.length === 0) {
            showActionStatus('Queue is empty', 'info');
            return;
        }

        if (!isSpeechSupported || !('speechSynthesis' in window)) {
            showActionStatus('Voice reading is not available in this browser', 'error');
            return;
        }

        showActionStatus(`Preparing ${entries.length} queued doc${entries.length === 1 ? '' : 's'}`, 'info');

        const allChunks: SpeechChunk[] = [];
        let failedDocuments = 0;

        for (const entry of entries) {
            try {
                const chunks = await getSpeechChunksForFavoriteDocument(entry);
                allChunks.push(...chunks);
            } catch {
                failedDocuments += 1;
            }
        }

        if (failedDocuments > 0 && allChunks.length > 0) {
            showActionStatus(`${failedDocuments} queued doc${failedDocuments === 1 ? '' : 's'} skipped`, 'info');
        }

        startSpeechQueue(allChunks, failedDocuments > 0 ? 'No readable queued docs loaded' : 'No readable queued docs found');
    }, [getSpeechChunksForFavoriteDocument, isSpeechSupported, queueDocs, showActionStatus, startSpeechQueue]);

    const pauseSpeech = useCallback(() => {
        if (!isSpeechSupported || !('speechSynthesis' in window)) return;
        window.speechSynthesis.pause();
        setAudioStatus('paused');
        void releaseWakeLock();
    }, [isSpeechSupported, releaseWakeLock]);

    const resumeSpeech = useCallback(() => {
        if (!isSpeechSupported || !('speechSynthesis' in window)) return;
        window.speechSynthesis.resume();
        setAudioStatus('playing');
        void requestWakeLock();
    }, [isSpeechSupported, requestWakeLock]);

    const toggleSpeechPause = useCallback(() => {
        if (audioStatus === 'playing') {
            pauseSpeech();
            return;
        }

        if (audioStatus === 'paused') {
            resumeSpeech();
            return;
        }

        if (isFavoritesRoute) {
            void readFavoriteDocumentsQueue();
            return;
        }

        if (isQueueRoute) {
            void readQueueDocuments();
            return;
        }

        readCurrentPage();
    }, [audioStatus, isFavoritesRoute, isQueueRoute, pauseSpeech, readCurrentPage, readFavoriteDocumentsQueue, readQueueDocuments, resumeSpeech]);

    const stopSpeech = useCallback(() => {
        endSpeechSession(true);
        showActionStatus('Reading stopped', 'info');
    }, [endSpeechSession, showActionStatus]);

    const getCurrentShareUrl = () => window.location.href;

    const copyTextToClipboard = async (text: string) => {
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch {
                // Fall through to the legacy selection path for browsers that
                // expose clipboard APIs but reject writes in the current context.
            }
        }

        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);

        try {
            return document.execCommand('copy');
        } finally {
            textarea.remove();
        }
    };

    const copyDocumentPath = async () => {
        try {
            await copyTextToClipboard(documentSourcePath);
            showActionStatus('File path copied');
        } catch {
            showActionStatus('Could not copy file path', 'error');
        }
    };

    const copyDocumentLink = async () => {
        try {
            await copyTextToClipboard(getCurrentShareUrl());
            showActionStatus('Link copied');
        } catch {
            showActionStatus('Could not copy link', 'error');
        }
    };

    const shareDocumentLink = async () => {
        const nav = navigator as Navigator & {
            share?: (data: ShareData) => Promise<void>;
        };
        const url = getCurrentShareUrl();

        if (nav.share) {
            try {
                await nav.share({
                    title: currentDocumentTitle,
                    text: documentSourcePath,
                    url,
                });
                showActionStatus('Share sheet opened', 'info');
                return;
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') return;
            }
        }

        try {
            await copyTextToClipboard(url);
            showActionStatus('Link copied');
        } catch {
            showActionStatus('Could not share link', 'error');
        }
    };

    const copyDocumentContent = async () => {
        const content = [
            `Title: ${currentDocumentTitle}`,
            `${documentSourceLabel}: ${documentSourcePath}`,
            `Link: ${getCurrentShareUrl()}`,
            '',
            currentMarkdown.trim(),
        ].join('\n');

        try {
            await copyTextToClipboard(content);
            showActionStatus('Page content copied');
        } catch {
            showActionStatus('Could not copy page content', 'error');
        }
    };

    const createScreenshotBlob = async (sourceElement: HTMLElement) => {
        const bounds = sourceElement.getBoundingClientRect();
        const captureWidth = Math.min(Math.max(Math.ceil(bounds.width || sourceElement.clientWidth || 390), 360), 900);
        const backgroundColor = isDark ? '#09090b' : '#fafafa';
        const textColor = isDark ? '#f4f4f5' : '#18181b';
        const mutedColor = isDark ? '#a1a1aa' : '#71717a';
        const borderColor = isDark ? '#27272a' : '#e4e4e7';
        const bodyColor = isDark ? '#d4d4d8' : '#3f3f46';
        const bodyText = (sourceElement.querySelector('.prose-custom') as HTMLElement | null)?.innerText?.trim()
            || currentMarkdown.trim();
        const scale = Math.min(window.devicePixelRatio || 1, 2);
        const padding = captureWidth < 520 ? 24 : 36;
        const contentWidth = captureWidth - (padding * 2);
        const scratchCanvas = document.createElement('canvas');
        const scratchContext = scratchCanvas.getContext('2d');

        if (!scratchContext) {
            throw new Error('Screenshot canvas unavailable');
        }

        const wrapText = (text: string, maxWidth: number, context: CanvasRenderingContext2D) => {
            const outputLines: string[] = [];
            const paragraphs = text.replace(/\t/g, '    ').split('\n');

            paragraphs.forEach((paragraph) => {
                const normalized = paragraph.trim();
                if (!normalized) {
                    outputLines.push('');
                    return;
                }

                const words = normalized.split(/\s+/);
                let line = '';

                words.forEach((word) => {
                    if (!line && context.measureText(word).width > maxWidth) {
                        let chunk = '';
                        Array.from(word).forEach((character) => {
                            const candidate = `${chunk}${character}`;
                            if (context.measureText(candidate).width > maxWidth && chunk) {
                                outputLines.push(chunk);
                                chunk = character;
                            } else {
                                chunk = candidate;
                            }
                        });
                        line = chunk;
                        return;
                    }

                    const candidate = line ? `${line} ${word}` : word;
                    if (context.measureText(candidate).width > maxWidth && line) {
                        outputLines.push(line);
                        line = word;
                    } else {
                        line = candidate;
                    }
                });

                if (line) {
                    outputLines.push(line);
                }
            });

            return outputLines;
        };

        scratchContext.font = '700 26px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const titleLines = wrapText(currentDocumentTitle, contentWidth, scratchContext);
        scratchContext.font = '12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
        const pathLines = wrapText(documentSourcePath, contentWidth, scratchContext);
        const linkLines = wrapText(getCurrentShareUrl(), contentWidth, scratchContext);
        scratchContext.font = '16px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const bodyLines = wrapText(bodyText, contentWidth, scratchContext);
        const titleLineHeight = 32;
        const metaLineHeight = 18;
        const bodyLineHeight = 24;
        const fixedHeight = padding + (titleLines.length * titleLineHeight) + 18
            + (pathLines.length * metaLineHeight) + 8
            + (linkLines.length * metaLineHeight) + 28
            + 1 + 24 + padding;
        const maxBodyLines = Math.max(12, Math.floor((MAX_SCREENSHOT_HEIGHT - fixedHeight - 36) / bodyLineHeight));
        const visibleBodyLines = bodyLines.slice(0, maxBodyLines);
        const truncated = visibleBodyLines.length < bodyLines.length;
        const captureHeight = Math.min(
            MAX_SCREENSHOT_HEIGHT,
            fixedHeight + (visibleBodyLines.length * bodyLineHeight) + (truncated ? 36 : 0)
        );
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(captureWidth * scale);
        canvas.height = Math.ceil(captureHeight * scale);

        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Screenshot canvas unavailable');
        }

        context.scale(scale, scale);
        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, captureWidth, captureHeight);

        let y = padding;
        context.fillStyle = textColor;
        context.font = '700 26px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        titleLines.forEach((line) => {
            context.fillText(line, padding, y + 24);
            y += titleLineHeight;
        });

        y += 12;
        context.fillStyle = mutedColor;
        context.font = '12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
        pathLines.forEach((line) => {
            context.fillText(line, padding, y + 13);
            y += metaLineHeight;
        });

        y += 4;
        linkLines.forEach((line) => {
            context.fillText(line, padding, y + 13);
            y += metaLineHeight;
        });

        y += 18;
        context.strokeStyle = borderColor;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(padding, y);
        context.lineTo(captureWidth - padding, y);
        context.stroke();
        y += 24;

        context.fillStyle = bodyColor;
        context.font = '16px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        visibleBodyLines.forEach((line) => {
            if (line) {
                context.fillText(line, padding, y + 16);
            }
            y += line ? bodyLineHeight : Math.round(bodyLineHeight * 0.65);
        });

        if (truncated) {
            y += 12;
            context.fillStyle = mutedColor;
            context.font = '600 13px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            context.fillText('Snapshot continues in copied page content.', padding, Math.min(y + 14, captureHeight - padding));
        }

        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((canvasBlob) => {
                if (canvasBlob) {
                    resolve(canvasBlob);
                } else {
                    reject(new Error('Screenshot export failed'));
                }
            }, 'image/png', 0.92);
        });

        return {
            blob,
            truncated,
        };
    };

    const shareOrDownloadScreenshot = async (blob: Blob) => {
        const fileName = `${currentSlug.length > 0 ? currentSlug.join('-') : 'mycodex-index'}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        const nav = navigator as Navigator & {
            share?: (data: ShareData) => Promise<void>;
            canShare?: (data: ShareData) => boolean;
        };

        try {
            if (nav.share && nav.canShare?.({ files: [file] })) {
                await nav.share({
                    title: currentDocumentTitle,
                    text: documentSourcePath,
                    files: [file],
                });
                showActionStatus('Screenshot shared', 'info');
                return;
            }
        } catch {
            // Continue to download fallback.
        }

        try {
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
            showActionStatus('Screenshot downloaded', 'info');
        } catch {
            await copyDocumentContent();
            showActionStatus('Screenshot unavailable; page copied', 'info');
        }
    };

    const copyDocumentScreenshot = async () => {
        if (!readerCaptureRef.current || isCopyingScreenshot) return;

        setIsCopyingScreenshot(true);
        try {
            const { blob, truncated } = await createScreenshotBlob(readerCaptureRef.current);
            const clipboardWindow = window as Window & {
                ClipboardItem?: typeof ClipboardItem;
            };

            if (navigator.clipboard?.write && clipboardWindow.ClipboardItem) {
                try {
                    await navigator.clipboard.write([
                        new clipboardWindow.ClipboardItem({ 'image/png': blob }),
                    ]);
                    showActionStatus(truncated ? 'Screenshot copied: top section' : 'Screenshot copied');
                    return;
                } catch {
                    await shareOrDownloadScreenshot(blob);
                    return;
                }
            }

            await shareOrDownloadScreenshot(blob);
        } catch {
            showActionStatus('Could not capture screenshot', 'error');
        } finally {
            setIsCopyingScreenshot(false);
        }
    };

    const readerStyle = {
        '--mycodex-font-size': `${readerFontSize}px`,
        maxWidth: READER_WIDTH_VALUES[readerWidth],
    } as CSSProperties;
    const speechRateLabel = `${speechRate.toFixed(2).replace(/\.?0+$/, '')}x`;
    const speechProgressLabel = speechProgress.total > 0
        ? `${speechProgress.current}/${speechProgress.total}`
        : '';
    const selectedVoiceName = speechVoices.find((voice) => voice.voiceURI === selectedVoiceURI)?.name || 'Device default';
    const selectedVoiceValue = speechVoices.some((voice) => voice.voiceURI === selectedVoiceURI) ? selectedVoiceURI : '';
    const hasReadableDocument = isHomeRoute ? false : isQueueRoute ? queueDocs.length > 0 : isFavoritesRoute ? favoriteDocs.length > 0 : currentMarkdown.trim().length > 0;
    const primaryReadPageLabel = audioStatus === 'playing'
        ? 'Pause reading'
        : audioStatus === 'paused'
            ? 'Resume reading'
            : isFavoritesRoute || isQueueRoute
                ? 'Play all'
                : 'Read page';
    const primaryReadPageTitle = audioStatus === 'idle'
        ? isQueueRoute ? 'Play read-later queue' : isFavoritesRoute ? 'Play all favorites' : 'Read the whole page'
        : primaryReadPageLabel;

    const readerControlButtonClass = 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:border-sky-300 hover:text-sky-700 active:scale-95 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-sky-700 dark:hover:text-sky-300';
    const readerControlTextButtonClass = 'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition-colors hover:border-sky-300 hover:text-sky-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-sky-700 dark:hover:text-sky-300';
    const documentActionButtonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition-colors hover:border-sky-300 hover:text-sky-700 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-sky-700 dark:hover:text-sky-300';

    // Helper to traverse and remove alert prefixes in component
    const removePrefixFromChild = (child: any, prefix: string): any => {
        if (!child) return child;
        if (typeof child === 'string') {
            if (child.trim().startsWith(prefix)) {
                return child.replace(prefix, '').trim();
            }
            return child;
        }
        if (child.props && child.props.children) {
            const children = React.Children.map(child.props.children, (c) => removePrefixFromChild(c, prefix));
            return React.cloneElement(child, { ...child.props, children });
        }
        return child;
    };

    // Custom ReactMarkdown render components
    const customComponents = useMemo(() => ({
        blockquote: ({ children }: any) => {
            let textContent = '';
            const findText = (node: any) => {
                if (!node) return;
                if (typeof node === 'string') {
                    textContent += node;
                } else if (node.props && node.props.children) {
                    React.Children.forEach(node.props.children, findText);
                }
            };
            React.Children.forEach(children, findText);

            const alertMatch = textContent.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
            if (alertMatch) {
                const type = alertMatch[1].toUpperCase();
                const cleanedChildren = React.Children.map(children, (child) => {
                    return removePrefixFromChild(child, `[!${type}]`);
                });

                const alertStyles = {
                    NOTE: 'bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500 text-blue-700 dark:text-blue-200',
                    TIP: 'bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 text-emerald-700 dark:text-emerald-200',
                    IMPORTANT: 'bg-purple-50 dark:bg-purple-950/20 border-l-4 border-purple-500 text-purple-700 dark:text-purple-200',
                    WARNING: 'bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 text-amber-700 dark:text-amber-200',
                    CAUTION: 'bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 text-red-700 dark:text-red-200',
                }[type] || 'bg-zinc-100 dark:bg-zinc-800/40 border-l-4 border-zinc-400 dark:border-zinc-500';

                const alertHeaders = {
                    NOTE: 'Note',
                    TIP: 'Tip',
                    IMPORTANT: 'Important',
                    WARNING: 'Warning',
                    CAUTION: 'Caution',
                }[type] || 'Info';

                return (
                    <div className={`p-4 my-5 rounded-r-xl ${alertStyles} shadow-lg shadow-black/5 dark:shadow-black/10`}>
                        <div className="font-bold flex items-center gap-1.5 text-xs mb-1.5 uppercase tracking-wider">
                            {alertHeaders}
                        </div>
                        <div className="text-sm leading-relaxed prose-p:my-1">{cleanedChildren}</div>
                    </div>
                );
            }

            return (
                <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-700 pl-4 py-1 my-5 italic text-zinc-600 dark:text-zinc-300 bg-zinc-100/50 dark:bg-zinc-900/20 rounded-r">
                    {children}
                </blockquote>
            );
        },
        a: ({ href, children, node: _node, ...props }: any) => {
            if (!href) return <a {...props}>{children}</a>;

            let targetHref = href;

            // Handle file:/// absolute paths pointing to __docs__
            if (href.startsWith('file:///')) {
                const docsPathIndex = href.indexOf('__docs__/');
                if (docsPathIndex !== -1) {
                    targetHref = '/' + normalizeMarkdownDocPath(href.slice(docsPathIndex + 9));
                }
            } else if (!/^https?:\/\//i.test(href) && !href.startsWith('mailto:') && !href.startsWith('#')) {
                // Resolve relative paths relative to current file slug
                const currentDir = currentSlug.slice(0, -1).join('/');
                const parts = (currentDir + '/' + href).split('/');
                const resolvedParts: string[] = [];
                for (const part of parts) {
                    if (part === '.' || part === '') continue;
                    if (part === '..') {
                        resolvedParts.pop();
                    } else {
                        resolvedParts.push(part);
                    }
                }
                const resolved = '/' + normalizeMarkdownDocPath(resolvedParts.join('/'));
                targetHref = resolved;
            }

            const isExternal = /^https?:\/\//i.test(href) || href.startsWith('mailto:');
            const finalHref = isExternal ? href : buildUrl(targetHref);

            return (
                <a 
                    href={finalHref} 
                    {...props} 
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    className="text-sky-700 dark:text-sky-300 hover:text-sky-600 dark:hover:text-sky-200 underline underline-offset-4 decoration-sky-400/30 hover:decoration-sky-300 transition-colors font-medium"
                >
                    {children}
                </a>
            );
        },
        // Auto-assign IDs to headings so they can be scrolled to via jump links
        h1: ({ children, node: _node, ...props }: any) => {
            const id = createHeadingId(getNodeText(children));
            return <h1 id={id} {...props}>{children}</h1>;
        },
        h2: ({ children, node: _node, ...props }: any) => {
            const id = createHeadingId(getNodeText(children));
            return <h2 id={id} {...props}>{children}</h2>;
        },
        h3: ({ children, node: _node, ...props }: any) => {
            const id = createHeadingId(getNodeText(children));
            return <h3 id={id} {...props}>{children}</h3>;
        },
        table: ({ children, node: _node, ...props }: any) => (
            <div className="mycodex-scroll-block" role="region" aria-label="Scrollable table">
                <table {...props}>{children}</table>
            </div>
        ),
    }), [buildUrl, currentSlug]);

    // Recursive sidebar node renderer
    const renderNode = (node: DocNode, depth = 0) => {
        const isSelected = currentPath === '/' + node.path || (node.path === 'index' && currentPath === '/');
        const isSearching = searchQuery.trim().length > 0;
        const isFolderExpanded = isSearching || expandedFolders[node.path];
        const indentSize = Math.min(depth, MAX_TREE_INDENT_DEPTH) * 10 + 12;

        if (node.isDir) {
            return (
                <div key={node.path} className="mb-1">
                    <button
                        type="button"
                        onClick={() => toggleFolder(node.path)}
                        className={`w-full flex items-center gap-2 py-2 pr-3 rounded-lg text-sm text-left transition-all duration-200 active:scale-[0.98] ${
                            isFolderExpanded 
                                ? 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10'
                                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900/50'
                        }`}
                        style={{ paddingLeft: `${indentSize}px`, minHeight: '44px' }}
                    >
                        <span className="flex min-w-0 flex-1 items-center gap-2 font-medium text-left">
                            <LuFolder className={`w-4 h-4 shrink-0 ${isFolderExpanded ? 'text-sky-600 dark:text-sky-300' : 'text-zinc-400 dark:text-zinc-500'}`} />
                            <span className="truncate">{formatTitle(node.name)}</span>
                        </span>
                        {isFolderExpanded ? <LuChevronDown className="w-3.5 h-3.5 shrink-0" /> : <LuChevronRight className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                    {isFolderExpanded && node.children && (
                        <div className="mt-1 transition-all duration-300">
                            {node.children.map(child => renderNode(child, depth + 1))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <a
                key={node.path}
                href={buildUrl(node.path)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2 py-2 pr-3 rounded-lg text-sm transition-all duration-200 active:scale-[0.98] mb-0.5 ${
                    isSelected
                        ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-200 border-l-2 border-sky-500 shadow-sm shadow-sky-500/5'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900/30'
                }`}
                style={{ paddingLeft: `${indentSize}px`, minHeight: '44px' }}
            >
                <LuFileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-sky-600 dark:text-sky-300' : 'text-zinc-400 dark:text-zinc-500'}`} />
                <span className="min-w-0 flex-1 truncate text-left">{formatTitle(node.name)}</span>
            </a>
        );
    };

    const favoritesPageContent = (
        <section className="space-y-6">
            <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                        <LuStar className="h-4 w-4 fill-current" />
                        <span>{favoriteDocs.length} saved</span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
                        Favorite Documents
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                        Star docs you revisit often, then play them one by one from this page.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {IS_AUDIO_READER_ENABLED && (
                        <button
                            type="button"
                            onClick={() => void readFavoriteDocumentsQueue()}
                            disabled={!isSpeechSupported || favoriteDocs.length === 0}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-800 transition-colors hover:border-amber-300 hover:bg-amber-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-800/70 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/15"
                        >
                            <LuPlay className="h-4 w-4" />
                            <span>Play all</span>
                        </button>
                    )}
                    {audioStatus !== 'idle' && (
                        <button
                            type="button"
                            onClick={stopSpeech}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-700"
                        >
                            <LuSquare className="h-4 w-4" />
                            <span>Stop</span>
                        </button>
                    )}
                </div>
            </div>

            {favoriteDocs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                        <LuStar className="h-6 w-6" />
                    </div>
                    <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        No favorites yet
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                        Open any document and press the star in the header. It will appear here automatically on this device.
                    </p>
                    <a
                        href={buildUrl('/')}
                        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition-colors hover:border-sky-300 hover:text-sky-700 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-sky-700 dark:hover:text-sky-300"
                    >
                        <LuHome className="h-4 w-4" />
                        <span>Open index</span>
                    </a>
                </div>
            ) : (
                <div className="grid gap-3">
                    {favoriteDocs.map((entry) => (
                        <div
                            key={entry.path}
                            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950/80 dark:shadow-black/20"
                        >
                            <div className="flex min-w-0 gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                                    <LuStar className="h-5 w-5 fill-current" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <a
                                        href={buildUrl(entry.path)}
                                        className="block truncate text-base font-bold text-zinc-950 transition-colors hover:text-sky-700 dark:text-zinc-50 dark:hover:text-sky-300"
                                    >
                                        {entry.title}
                                    </a>
                                    <div className="mt-1 break-all font-mono text-xs leading-5 text-zinc-500 dark:text-zinc-500">
                                        {entry.sourcePath}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {IS_AUDIO_READER_ENABLED && (
                                    <button
                                        type="button"
                                        onClick={() => void readFavoriteDocument(entry)}
                                        disabled={!isSpeechSupported}
                                        className={`${documentActionButtonClass} border-amber-200 text-amber-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-900/70 dark:text-amber-300`}
                                    >
                                        <LuPlay className="h-4 w-4" />
                                        <span>Play</span>
                                    </button>
                                )}
                                <a href={buildUrl(entry.path)} className={documentActionButtonClass}>
                                    <LuFileText className="h-4 w-4" />
                                    <span>Open</span>
                                </a>
                                <button
                                    type="button"
                                    onClick={() => removeFavoriteDocument(entry.path)}
                                    className={documentActionButtonClass}
                                >
                                    <LuX className="h-4 w-4" />
                                    <span>Remove</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );

    const queuePageContent = (
        <section className="space-y-6">
            <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                        <LuHistory className="h-4 w-4" />
                        <span>{queueDocs.length} queued</span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
                        Read Later
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                        Keep a temporary list for the next free window.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {IS_AUDIO_READER_ENABLED && (
                        <button
                            type="button"
                            onClick={() => void readQueueDocuments()}
                            disabled={!isSpeechSupported || queueDocs.length === 0}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm font-bold text-sky-800 transition-colors hover:border-sky-300 hover:bg-sky-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:border-sky-800/70 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/15"
                        >
                            <LuPlay className="h-4 w-4" />
                            <span>Play queue</span>
                        </button>
                    )}
                    {queueDocs.length > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                setQueueDocs([]);
                                showActionStatus('Queue cleared', 'info');
                            }}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-700"
                        >
                            <LuX className="h-4 w-4" />
                            <span>Clear</span>
                        </button>
                    )}
                </div>
            </div>

            {queueDocs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                        <LuHistory className="h-6 w-6" />
                    </div>
                    <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        Queue is empty
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                        Open a document and add it to the queue when you want to read or listen later.
                    </p>
                    <button
                        type="button"
                        onClick={openNavigationSearch}
                        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition-colors hover:border-sky-300 hover:text-sky-700 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-sky-700 dark:hover:text-sky-300"
                    >
                        <LuSearch className="h-4 w-4" />
                        <span>Find docs</span>
                    </button>
                </div>
            ) : (
                <div className="grid gap-3">
                    {queueDocs.map((entry) => (
                        <div
                            key={entry.path}
                            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950/80 dark:shadow-black/20"
                        >
                            <div className="flex min-w-0 gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                                    <LuHistory className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <button
                                        type="button"
                                        onClick={() => openDocumentAtSavedPosition(entry)}
                                        className="block max-w-full truncate text-left text-base font-bold text-zinc-950 transition-colors hover:text-sky-700 dark:text-zinc-50 dark:hover:text-sky-300"
                                    >
                                        {entry.title}
                                    </button>
                                    <div className="mt-1 break-all font-mono text-xs leading-5 text-zinc-500 dark:text-zinc-500">
                                        {entry.sourcePath}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {IS_AUDIO_READER_ENABLED && (
                                    <button
                                        type="button"
                                        onClick={() => void readFavoriteDocument(entry)}
                                        disabled={!isSpeechSupported}
                                        className={`${documentActionButtonClass} border-sky-200 text-sky-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-sky-900/70 dark:text-sky-300`}
                                    >
                                        <LuPlay className="h-4 w-4" />
                                        <span>Play</span>
                                    </button>
                                )}
                                <button type="button" onClick={() => openDocumentAtSavedPosition(entry)} className={documentActionButtonClass}>
                                    <LuFileText className="h-4 w-4" />
                                    <span>Open</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setQueueDocs((previous) => previous.filter((queuedEntry) => queuedEntry.path !== entry.path));
                                        showActionStatus('Removed from queue', 'info');
                                    }}
                                    className={documentActionButtonClass}
                                >
                                    <LuX className="h-4 w-4" />
                                    <span>Remove</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );

    const homePageContent = (
        <section className="space-y-6 md:hidden">
            <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                    Mobile home
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
                    Continue Reading
                </h1>
                <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    Pick up from the last doc, queue, or favorites.
                </p>
            </div>

            {continueReadingDoc ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950/80 dark:shadow-black/20">
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                        Last opened
                    </div>
                    <div className="mt-2 text-lg font-bold text-zinc-950 dark:text-zinc-50">
                        {continueReadingDoc.title}
                    </div>
                    <div className="mt-1 break-all font-mono text-xs leading-5 text-zinc-500 dark:text-zinc-500">
                        {continueReadingDoc.sourcePath}
                    </div>
                    {continueScrollPosition && continueScrollPosition.progress > 0 && (
                        <div className="mt-3 h-2 rounded-full bg-zinc-100 dark:bg-zinc-900">
                            <div
                                className="h-full rounded-full bg-sky-500 dark:bg-sky-400"
                                style={{ width: `${Math.min(100, Math.max(4, continueScrollPosition.progress))}%` }}
                            />
                        </div>
                    )}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => openDocumentAtSavedPosition(continueReadingDoc)}
                            className={`${documentActionButtonClass} border-sky-200 text-sky-700 dark:border-sky-900/70 dark:text-sky-300`}
                        >
                            <LuPlay className="h-4 w-4" />
                            <span>Continue</span>
                        </button>
                        {IS_AUDIO_READER_ENABLED && (
                            <button
                                type="button"
                                onClick={() => void readFavoriteDocument(continueReadingDoc)}
                                disabled={!isSpeechSupported}
                                className={`${documentActionButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
                            >
                                <LuVolume2 className="h-4 w-4" />
                                <span>Listen</span>
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
                    <LuFileText className="mx-auto h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                    <div className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">No recent doc yet</div>
                    <button type="button" onClick={openNavigationSearch} className={`${documentActionButtonClass} mt-4`}>
                        <LuSearch className="h-4 w-4" />
                        <span>Find docs</span>
                    </button>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <a href={buildUrl(QUEUE_ROUTE_PATH)} className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-sm shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-100">
                    <LuHistory className="h-5 w-5 text-sky-700 dark:text-sky-300" />
                    <div className="mt-3 text-sm font-bold">Queue</div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{queueDocs.length} docs</div>
                </a>
                <a href={buildUrl(FAVORITES_ROUTE_PATH)} className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-sm shadow-black/5 dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-100">
                    <LuStar className="h-5 w-5 fill-current text-amber-500" />
                    <div className="mt-3 text-sm font-bold">Favorites</div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{favoriteDocs.length} docs</div>
                </a>
            </div>

            {visibleRecentDocs.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                        <LuHistory className="h-4 w-4" />
                        <span>Recent</span>
                    </div>
                    <div className="space-y-2">
                        {visibleRecentDocs.slice(0, 4).map((entry) => (
                            <button
                                key={`${entry.path}:${entry.visitedAt}`}
                                type="button"
                                onClick={() => openDocumentAtSavedPosition(entry)}
                                className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-left text-sm font-semibold text-zinc-700 transition-colors hover:border-sky-300 hover:text-sky-700 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-sky-700 dark:hover:text-sky-300"
                            >
                                <LuFileText className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
                                <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <a
                href={buildUrl('/index')}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-sky-300 hover:text-sky-700 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-sky-700 dark:hover:text-sky-300"
            >
                <LuHome className="h-4 w-4" />
                <span>Open master index</span>
            </a>
        </section>
    );

    return (
        <div className="mycodex-reader-shell flex-1 flex flex-col md:flex-row relative overflow-x-clip">
            <div
                aria-hidden="true"
                className="mycodex-progress-bar fixed left-0 top-0 z-[60] h-0.5 bg-sky-500 transition-[width] duration-150 dark:bg-sky-400"
                style={{ width: `${readingProgress}%` }}
            />

            {/* Header / Mobile Action Bar */}
            <header className="mycodex-mobile-header fixed inset-x-0 top-0 z-50 h-16 w-full flex items-center justify-between px-4 md:hidden bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80">
                <a
                    href={buildUrl('/')}
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Open MyCodex index"
                    className="flex min-h-11 items-center gap-2 rounded-lg pr-2 text-zinc-900 transition-colors active:scale-[0.98] dark:text-zinc-100"
                >
                    <MyCodexLogoMark className="h-7 w-[17px] shrink-0" />
                    <span className="font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        MyCodex
                    </span>
                </a>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={openSettingsDrawer}
                        aria-label="Open reader settings"
                        className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 active:scale-95"
                        style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <LuSettings className="w-5 h-5" />
                    </button>
                    {isDocumentRoute && (
                        <button
                            type="button"
                            onClick={toggleCurrentDocumentFavorite}
                            aria-label={isCurrentDocumentFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            title={isCurrentDocumentFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            className={`p-2 rounded-xl border active:scale-95 ${
                                isCurrentDocumentFavorite
                                    ? 'border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                                    : 'border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
                            }`}
                            style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <LuStar className={`w-5 h-5 ${isCurrentDocumentFavorite ? 'fill-current' : ''}`} />
                        </button>
                    )}
                    {IS_AUDIO_READER_ENABLED && (
                        <button
                            type="button"
                            onClick={toggleSpeechPause}
                            disabled={!hasReadableDocument}
                            aria-label={primaryReadPageTitle}
                            title={primaryReadPageTitle}
                            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                            style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            {audioStatus === 'playing' ? <LuPause className="w-5 h-5" /> : <LuPlay className="w-5 h-5" />}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setSidebarOpen((previous) => !previous)}
                        aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
                        className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 active:scale-95"
                        style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        {sidebarOpen ? <LuX className="w-5 h-5" /> : <LuMenu className="w-5 h-5" />}
                    </button>
                </div>
            </header>

            {/* Sidebar (Desktop Slide/Lock & Mobile Modal Drawer) */}
            <aside className={`
                mycodex-sidebar
                fixed inset-y-0 left-0 z-[60] w-72 md:w-80 flex flex-col transform transition-transform duration-300 ease-in-out
                bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-r border-zinc-200 dark:border-zinc-800/80
                ${sidebarPinned ? 'md:sticky md:top-0 md:h-screen md:translate-x-0' : 'md:hidden'}
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Brand identity on desktop */}
                <div className="hidden h-16 md:flex items-center gap-2 px-4 border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/20">
                    <a
                        href={buildUrl('/')}
                        aria-label="Open MyCodex index"
                        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-2 pr-2 text-zinc-900 transition-colors hover:text-sky-700 active:scale-[0.98] dark:text-white dark:hover:text-sky-300"
                    >
                        <MyCodexLogoMark className="h-7 w-[17px] shrink-0" />
                        <h1 className="min-w-0 truncate text-base font-extrabold tracking-tight">
                            MyCodex
                        </h1>
                    </a>
                    <button
                        type="button"
                        onClick={() => setSidebarPinned(false)}
                        aria-label="Collapse navigation"
                        title="Collapse navigation"
                        className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition-all hover:border-sky-300 hover:text-sky-700 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-sky-700 dark:hover:text-sky-300"
                    >
                        <LuPanelLeftClose className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={openSettingsDrawer}
                        aria-label="Open reader settings"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition-all hover:border-sky-300 hover:text-sky-700 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-sky-700 dark:hover:text-sky-300"
                    >
                        <LuSettings className="w-4 h-4" />
                    </button>
                </div>

                {/* Mobile Drawer Close Button */}
                <div className="mycodex-sidebar-mobile-header flex md:hidden justify-between items-center px-4 py-4 border-b border-zinc-200 dark:border-zinc-900">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">Navigation</span>
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Close navigation"
                        className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <LuX className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-950/40">
                    <div className="relative">
                        <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            aria-label="Search documentation"
                            placeholder="Search specs, impls..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500/80 focus:ring-1 focus:ring-sky-400/30 dark:focus:ring-sky-500/30 transition-all"
                            style={{ minHeight: '40px' }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                aria-label="Clear search"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Navigation Links Scroll Container */}
                <nav className="mycodex-sidebar-nav flex-1 overflow-y-auto px-3 py-3 space-y-1 select-none">
                    {/* Master Index Quicklink */}
                    <a
                        href={buildUrl('/')}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 mb-2 ${
                            currentPath === '/' || currentPath === '/index'
                                ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-200 border-l-2 border-sky-500 shadow-sm'
                                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900/40'
                        }`}
                        style={{ minHeight: '44px' }}
                    >
                        <LuHome className="w-4 h-4 text-sky-600 dark:text-sky-300" />
                        <span>Master Index</span>
                    </a>
                    <a
                        href={buildUrl(FAVORITES_ROUTE_PATH)}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 mb-2 ${
                            currentPath === FAVORITES_ROUTE_PATH
                                ? 'bg-amber-50 text-amber-800 border-l-2 border-amber-500 shadow-sm dark:bg-amber-500/10 dark:text-amber-200'
                                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900/40'
                        }`}
                        style={{ minHeight: '44px' }}
                    >
                        <LuStar className={`w-4 h-4 ${currentPath === FAVORITES_ROUTE_PATH ? 'fill-current text-amber-500' : 'text-amber-500'}`} />
                        <span className="min-w-0 flex-1">Favorites</span>
                        {favoriteDocs.length > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                                {favoriteDocs.length}
                            </span>
                        )}
                    </a>
                    <a
                        href={buildUrl(QUEUE_ROUTE_PATH)}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 mb-2 ${
                            currentPath === QUEUE_ROUTE_PATH
                                ? 'bg-sky-50 text-sky-800 border-l-2 border-sky-500 shadow-sm dark:bg-sky-500/10 dark:text-sky-200'
                                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900/40'
                        }`}
                        style={{ minHeight: '44px' }}
                    >
                        <LuHistory className={`w-4 h-4 ${currentPath === QUEUE_ROUTE_PATH ? 'text-sky-600 dark:text-sky-300' : 'text-sky-600 dark:text-sky-300'}`} />
                        <span className="min-w-0 flex-1">Read Later</span>
                        {queueDocs.length > 0 && (
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
                                {queueDocs.length}
                            </span>
                        )}
                    </a>

                    {filteredTree.length > 0 ? (
                        filteredTree.map(node => renderNode(node))
                    ) : (
                        <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-xs">
                            No documents match your query
                        </div>
                    )}
                </nav>

                {/* Footer bar */}
                <div className="mycodex-sidebar-footer px-6 py-4 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-950/30 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                    <span>v2.2 Stable</span>
                    <a href="https://menulist.ai" target="_blank" rel="noopener noreferrer" className="hover:text-sky-600 dark:hover:text-sky-300 transition-colors">menulist.ai</a>
                </div>
            </aside>

            {/* Mobile Sidebar overlay */}
            {sidebarOpen && (
                <div 
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 md:hidden backdrop-blur-sm"
                />
            )}

            {settingsMounted && (
                <>
                    <div
                        aria-hidden="true"
                        onClick={closeSettingsDrawer}
                        className={`fixed inset-0 z-[65] bg-black/35 backdrop-blur-sm transition-opacity duration-300 ease-in-out dark:bg-black/60 ${
                            settingsOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                        }`}
                    />
                    <aside
                        role="dialog"
                        aria-modal={settingsOpen}
                        aria-hidden={!settingsOpen}
                        aria-label="Reader settings"
                        className={`mycodex-settings-drawer fixed inset-y-0 right-0 z-[70] flex w-full max-w-md transform flex-col border-l border-zinc-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out will-change-transform dark:border-zinc-800 dark:bg-zinc-950 ${
                            settingsOpen ? 'translate-x-0' : 'translate-x-full'
                        }`}
                    >
                        <div className="mycodex-settings-header flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
                            <div>
                                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Settings</div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-500">Reader and document actions</div>
                            </div>
                            <button
                                type="button"
                                onClick={closeSettingsDrawer}
                                aria-label="Close settings"
                                className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                            >
                                <LuX className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mycodex-settings-body flex-1 space-y-5 overflow-y-auto px-4 py-5">
                            {isDocumentRoute && (
                                <section className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                                        <LuFileText className="h-4 w-4" />
                                        <span>Current document</span>
                                    </div>
                                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                            {currentDocumentTitle}
                                        </div>
                                        <div className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                                            {documentSourceLabel}
                                        </div>
                                        <code className="mt-1 block break-all rounded-lg bg-white px-2.5 py-2 font-mono text-[11px] leading-relaxed text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                                            {documentSourcePath}
                                        </code>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={copyDocumentPath} className={documentActionButtonClass}>
                                            <LuCopy className="h-4 w-4" />
                                            <span>Copy path</span>
                                        </button>
                                        <button type="button" onClick={copyDocumentLink} className={documentActionButtonClass}>
                                            <LuLink className="h-4 w-4" />
                                            <span>Copy link</span>
                                        </button>
                                        <button type="button" onClick={shareDocumentLink} className={documentActionButtonClass}>
                                            <LuShare2 className="h-4 w-4" />
                                            <span>Share</span>
                                        </button>
                                        <button type="button" onClick={copyDocumentContent} className={documentActionButtonClass}>
                                            <LuClipboard className="h-4 w-4" />
                                            <span>Copy page</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={copyDocumentScreenshot}
                                            disabled={isCopyingScreenshot}
                                            className={`${documentActionButtonClass} col-span-2 disabled:cursor-wait disabled:opacity-60`}
                                        >
                                            <LuCamera className="h-4 w-4" />
                                            <span>{isCopyingScreenshot ? 'Capturing' : 'Copy screenshot'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={toggleCurrentDocumentQueue}
                                            className={`${documentActionButtonClass} col-span-2 ${
                                                isCurrentDocumentQueued
                                                    ? 'border-sky-300 text-sky-700 dark:border-sky-700 dark:text-sky-300'
                                                    : ''
                                            }`}
                                        >
                                            <LuPlus className="h-4 w-4" />
                                            <span>{isCurrentDocumentQueued ? 'Remove from read later' : 'Add to read later'}</span>
                                        </button>
                                    </div>
                                </section>
                            )}

                            <section className="space-y-3">
                                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                                    Reading
                                </div>
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Font size</span>
                                    <div className="inline-flex items-center rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950">
                                        <button
                                            type="button"
                                            onClick={decreaseReaderFontSize}
                                            disabled={readerFontSize <= MIN_READER_FONT_SIZE}
                                            className={`${readerControlButtonClass} border-0 bg-transparent disabled:cursor-not-allowed disabled:opacity-40`}
                                            aria-label="Decrease font size"
                                        >
                                            <LuMinus className="h-4 w-4" />
                                        </button>
                                        <div className="flex h-10 min-w-[3.5rem] items-center justify-center px-2 text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
                                            {readerFontSize}px
                                        </div>
                                        <button
                                            type="button"
                                            onClick={increaseReaderFontSize}
                                            disabled={readerFontSize >= MAX_READER_FONT_SIZE}
                                            className={`${readerControlButtonClass} border-0 bg-transparent disabled:cursor-not-allowed disabled:opacity-40`}
                                            aria-label="Increase font size"
                                        >
                                            <LuPlus className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={resetReaderFontSize} className={documentActionButtonClass}>
                                        <LuRotateCcw className="h-4 w-4" />
                                        <span>Reset text</span>
                                    </button>
                                    {isDark !== null && (
                                        <button type="button" onClick={toggleTheme} className={documentActionButtonClass}>
                                            {isDark ? <LuSun className="h-4 w-4" /> : <LuMoon className="h-4 w-4" />}
                                            <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
                                        </button>
                                    )}
                                </div>

                                <div className="hidden grid-cols-2 gap-2 lg:grid">
                                    <button type="button" onClick={cycleReaderWidth} className={documentActionButtonClass}>
                                        <LuColumns className="h-4 w-4" />
                                        <span>{READER_WIDTH_LABELS[readerWidth]}</span>
                                    </button>
                                    <button type="button" onClick={() => setSidebarPinned((previous) => !previous)} className={documentActionButtonClass}>
                                        {sidebarPinned ? <LuPanelLeftClose className="h-4 w-4" /> : <LuPanelLeftOpen className="h-4 w-4" />}
                                        <span>{sidebarPinned ? 'Hide nav' : 'Show nav'}</span>
                                    </button>
                                </div>
                            </section>

                            {IS_AUDIO_READER_ENABLED && (
                                <section className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                                        <LuVolume2 className="h-4 w-4" />
                                        <span>Audio</span>
                                    </div>

                                    {!isSpeechSupported ? (
                                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
                                            Voice reading is not available in this browser. Use Chrome, Safari, or the installed PWA on a device with text-to-speech enabled.
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={toggleSpeechPause}
                                                    disabled={!hasReadableDocument}
                                                    className={`${documentActionButtonClass} ${audioStatus === 'playing' ? 'border-sky-300 text-sky-700 dark:border-sky-700 dark:text-sky-300' : ''} disabled:cursor-not-allowed disabled:opacity-40`}
                                                >
                                                    {audioStatus === 'playing' ? <LuPause className="h-4 w-4" /> : <LuPlay className="h-4 w-4" />}
                                                    <span>{primaryReadPageLabel}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={stopSpeech}
                                                    disabled={audioStatus === 'idle'}
                                                    className={`${documentActionButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
                                                >
                                                    <LuSquare className="h-4 w-4" />
                                                    <span>Stop</span>
                                                </button>
                                            </div>

                                            <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                                                <label className="block space-y-1.5">
                                                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">India voice</span>
                                                    <select
                                                        value={selectedVoiceValue}
                                                        onChange={(event) => setSelectedVoiceURI(event.target.value)}
                                                        className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/30 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:focus:border-sky-600"
                                                    >
                                                        {speechVoices.length === 0 ? (
                                                            <option value="">{selectedVoiceName}</option>
                                                        ) : (
                                                            speechVoices.map((voice) => (
                                                                <option key={voice.voiceURI} value={voice.voiceURI}>
                                                                    {voice.name} ({voice.lang})
                                                                </option>
                                                            ))
                                                        )}
                                                    </select>
                                                    {speechVoices.length === 0 && (
                                                        <span className="block text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
                                                            No India voice is installed in this browser. MyCodex will use the device default until an Indian English, Hindi, or other India voice is available.
                                                        </span>
                                                    )}
                                                </label>

                                                <label className="block space-y-2">
                                                    <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                                                        <span>Speed</span>
                                                        <span>{speechRateLabel}</span>
                                                    </span>
                                                    <input
                                                        type="range"
                                                        min={MIN_READER_AUDIO_RATE}
                                                        max={MAX_READER_AUDIO_RATE}
                                                        step={0.05}
                                                        value={speechRate}
                                                        onChange={(event) => setSpeechRate(clampSpeechRate(Number(event.target.value)))}
                                                        className="w-full accent-sky-600"
                                                    />
                                                </label>

                                                <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
                                                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Follow while reading</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={speechAutoScroll}
                                                        onChange={(event) => setSpeechAutoScroll(event.target.checked)}
                                                        className="h-5 w-5 accent-sky-600"
                                                    />
                                                </label>

                                                <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
                                                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Keep screen awake</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={keepScreenAwake}
                                                        onChange={(event) => setKeepScreenAwake(event.target.checked)}
                                                        className="h-5 w-5 accent-sky-600"
                                                    />
                                                </label>

                                                {keepScreenAwake && (
                                                    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                                                        {wakeLockActive
                                                            ? 'Screen awake while reading'
                                                            : wakeLockUnavailable || !isWakeLockSupported
                                                                ? 'Keep-awake unavailable on this browser'
                                                                : 'Keep-awake starts during playback'}
                                                    </div>
                                                )}

                                                {audioStatus !== 'idle' && (
                                                    <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/50 dark:text-sky-200">
                                                        {audioStatus === 'paused' ? 'Paused' : 'Reading'} {speechProgressLabel ? `(${speechProgressLabel})` : ''}: {activeSpeechLabel || currentDocumentTitle}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </section>
                            )}

                            <section className="space-y-3">
                                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                                    Navigation
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => goToDocument(previousDocument?.path)}
                                        disabled={!previousDocument}
                                        className={`${documentActionButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
                                    >
                                        <LuArrowLeft className="h-4 w-4" />
                                        <span>Previous</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => goToDocument(nextDocument?.path)}
                                        disabled={!nextDocument}
                                        className={`${documentActionButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
                                    >
                                        <span>Next</span>
                                        <LuArrowRight className="h-4 w-4" />
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={openNavigationSearch}
                                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-sky-300 hover:text-sky-700 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-sky-700 dark:hover:text-sky-300"
                                >
                                    <LuSearch className="h-4 w-4" />
                                    <span>Search documents</span>
                                </button>
                                <form method="post" action={buildUrl('/api/logout')}>
                                    <button
                                        type="submit"
                                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-sky-300 hover:text-sky-700 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-sky-700 dark:hover:text-sky-300"
                                    >
                                        <LuLogOut className="h-4 w-4" />
                                        <span>Sign out</span>
                                    </button>
                                </form>
                            </section>

                            {visibleFavoriteDocs.length > 0 && (
                                <section className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                                            <LuStar className="h-4 w-4 text-amber-500" />
                                            <span>Favorites</span>
                                        </div>
                                        <a
                                            href={buildUrl(FAVORITES_ROUTE_PATH)}
                                            className="text-xs font-bold text-amber-700 transition-colors hover:text-amber-600 dark:text-amber-300 dark:hover:text-amber-200"
                                        >
                                            View all
                                        </a>
                                    </div>
                                    {IS_AUDIO_READER_ENABLED && (
                                        <button
                                            type="button"
                                            onClick={() => void readFavoriteDocumentsQueue()}
                                            disabled={!isSpeechSupported || favoriteDocs.length === 0}
                                            className={`${documentActionButtonClass} w-full border-amber-200 text-amber-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-900/70 dark:text-amber-300`}
                                        >
                                            <LuPlay className="h-4 w-4" />
                                            <span>Play all favorites</span>
                                        </button>
                                    )}
                                    <div className="space-y-2">
                                        {visibleFavoriteDocs.map((entry) => (
                                            <a
                                                key={entry.path}
                                                href={buildUrl(entry.path)}
                                                title={entry.sourcePath}
                                                className="flex min-h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-amber-300 hover:text-amber-700 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-amber-700 dark:hover:text-amber-300"
                                            >
                                                <LuStar className="h-4 w-4 shrink-0 fill-current text-amber-500" />
                                                <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                                            </a>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {visibleQueueDocs.length > 0 && (
                                <section className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                                            <LuHistory className="h-4 w-4 text-sky-600 dark:text-sky-300" />
                                            <span>Read later</span>
                                        </div>
                                        <a
                                            href={buildUrl(QUEUE_ROUTE_PATH)}
                                            className="text-xs font-bold text-sky-700 transition-colors hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
                                        >
                                            View all
                                        </a>
                                    </div>
                                    {IS_AUDIO_READER_ENABLED && (
                                        <button
                                            type="button"
                                            onClick={() => void readQueueDocuments()}
                                            disabled={!isSpeechSupported || queueDocs.length === 0}
                                            className={`${documentActionButtonClass} w-full border-sky-200 text-sky-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-sky-900/70 dark:text-sky-300`}
                                        >
                                            <LuPlay className="h-4 w-4" />
                                            <span>Play queue</span>
                                        </button>
                                    )}
                                    <div className="space-y-2">
                                        {visibleQueueDocs.map((entry) => (
                                            <a
                                                key={entry.path}
                                                href={buildUrl(entry.path)}
                                                title={entry.sourcePath}
                                                className="flex min-h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-sky-300 hover:text-sky-700 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-sky-700 dark:hover:text-sky-300"
                                            >
                                                <LuHistory className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-300" />
                                                <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                                            </a>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {visibleRecentDocs.length > 0 && (
                                <section className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                                        <LuHistory className="h-4 w-4" />
                                        <span>Recent</span>
                                    </div>
                                    <div className="space-y-2">
                                        {visibleRecentDocs.map((entry) => (
                                            <a
                                                key={`${entry.path}:${entry.visitedAt}`}
                                                href={buildUrl(entry.path)}
                                                title={entry.sourcePath}
                                                className="flex min-h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-sky-300 hover:text-sky-700 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-sky-700 dark:hover:text-sky-300"
                                            >
                                                <LuFileText className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
                                                <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                                            </a>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </aside>
                </>
            )}

            {/* Main Content Area */}
            <main className="mycodex-main flex-1 min-w-0 overflow-x-clip bg-zinc-50 pt-16 dark:bg-zinc-950 md:pt-0">
                <div className="sticky top-0 z-40 hidden h-16 items-center border-b border-zinc-200/80 bg-zinc-50/95 px-8 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/95 md:flex">
                    <div className="flex w-full items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            {!sidebarPinned && (
                                <button
                                    type="button"
                                    onClick={() => setSidebarPinned(true)}
                                    className={readerControlButtonClass}
                                    aria-label="Expand navigation"
                                    title="Expand navigation"
                                >
                                    <LuPanelLeftOpen className="h-4 w-4" />
                                </button>
                            )}
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    {currentDocumentTitle}
                                </div>
                                <div className="truncate text-xs text-zinc-500 dark:text-zinc-500">
                                    {documentSourcePath}
                                </div>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={() => goToDocument(previousDocument?.path)}
                                disabled={!previousDocument}
                                className={`${readerControlButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
                                aria-label="Previous document"
                                title={previousDocument?.title || 'Previous document'}
                            >
                                <LuArrowLeft className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => goToDocument(nextDocument?.path)}
                                disabled={!nextDocument}
                                className={`${readerControlButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
                                aria-label="Next document"
                                title={nextDocument?.title || 'Next document'}
                            >
                                <LuArrowRight className="h-4 w-4" />
                            </button>
                            {isDocumentRoute && (
                                <button
                                    type="button"
                                    onClick={toggleCurrentDocumentFavorite}
                                    className={`${readerControlButtonClass} ${
                                        isCurrentDocumentFavorite
                                            ? 'border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-300'
                                            : ''
                                    }`}
                                    aria-label={isCurrentDocumentFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                    title={isCurrentDocumentFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                >
                                    <LuStar className={`h-4 w-4 ${isCurrentDocumentFavorite ? 'fill-current' : ''}`} />
                                </button>
                            )}
                            {isDocumentRoute && (
                                <button
                                    type="button"
                                    onClick={toggleCurrentDocumentQueue}
                                    className={`${readerControlButtonClass} ${
                                        isCurrentDocumentQueued
                                            ? 'border-sky-300 text-sky-700 dark:border-sky-700 dark:text-sky-300'
                                            : ''
                                    }`}
                                    aria-label={isCurrentDocumentQueued ? 'Remove from read later' : 'Add to read later'}
                                    title={isCurrentDocumentQueued ? 'Remove from read later' : 'Add to read later'}
                                >
                                    <LuPlus className="h-4 w-4" />
                                </button>
                            )}
                            {IS_AUDIO_READER_ENABLED && (
                                <button
                                    type="button"
                                    onClick={toggleSpeechPause}
                                    disabled={!hasReadableDocument}
                                    className={readerControlTextButtonClass}
                                    aria-label={primaryReadPageTitle}
                                    title={primaryReadPageTitle}
                                >
                                    {audioStatus === 'playing' ? <LuPause className="h-4 w-4" /> : <LuPlay className="h-4 w-4" />}
                                    <span>{primaryReadPageLabel}</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={openSettingsDrawer}
                                className={readerControlButtonClass}
                                aria-label="Open reader settings"
                                title="Open reader settings"
                            >
                                <LuSettings className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex min-w-0 flex-col lg:flex-row">
                    <article className="mycodex-article flex-1 min-w-0 overflow-x-clip px-4 py-6 md:px-10 md:py-8">
                        <div ref={readerCaptureRef} className="mx-auto w-full transition-[max-width] duration-200" style={readerStyle}>
                            {/* Breadcrumbs */}
                            {currentSlug.length > 0 && (
                                <div className="mb-6 hidden w-fit max-w-full flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-500 select-none dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-500 md:flex">
                                    <a href={buildUrl('/')} className="hover:text-sky-600 dark:hover:text-sky-300 transition-colors">docs</a>
                                    {currentSlug.map((seg, idx) => {
                                        const isLast = idx === currentSlug.length - 1;
                                        const segmentPath = '/' + currentSlug.slice(0, idx + 1).join('/');
                                        return (
                                            <React.Fragment key={idx}>
                                                <LuChevronRight className="w-3 h-3 text-zinc-400 dark:text-zinc-600" />
                                                {isLast ? (
                                                    <span className="max-w-[120px] truncate font-medium text-sky-700 dark:text-sky-300 sm:max-w-[220px]">
                                                        {formatTitle(seg)}
                                                    </span>
                                                ) : (
                                                    <a href={buildUrl(segmentPath)} className="max-w-[110px] truncate hover:text-sky-600 dark:hover:text-sky-300 transition-colors">
                                                        {toTitleCase(seg)}
                                                    </a>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            )}

                            {isFavoritesRoute ? (
                                favoritesPageContent
                            ) : isQueueRoute ? (
                                queuePageContent
                            ) : (
                                <>
                                    {isHomeRoute && homePageContent}
                                    <div className={`prose prose-custom max-w-none ${isHomeRoute ? 'hidden md:block' : ''}`}>
                                        {currentScrollPosition && currentScrollPosition.y > 320 && (
                                            <button
                                                type="button"
                                                onClick={resumeCurrentDocumentPosition}
                                                className="not-prose mb-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm font-bold text-sky-800 transition-colors hover:border-sky-300 hover:bg-sky-100 active:scale-[0.98] dark:border-sky-800/70 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/15"
                                            >
                                                <LuArrowUp className="h-4 w-4 rotate-180" />
                                                <span>Resume at {currentScrollPosition.progress}%</span>
                                            </button>
                                        )}
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={customComponents}
                                        >
                                            {currentMarkdown}
                                        </ReactMarkdown>
                                    </div>
                                </>
                            )}
                        </div>
                    </article>

                    {/* Table of Contents / Outline Panel (Desktop Only) */}
                    {headings.length > 0 && (
                        <aside className="hidden lg:block w-64 xl:w-72 shrink-0 border-l border-zinc-200 dark:border-zinc-900 px-6 py-8 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto select-none bg-zinc-50/80 dark:bg-zinc-950/80">
                            <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                                <LuCompass className="w-4 h-4" />
                                <span>On This Page</span>
                            </div>
                            <ul className="space-y-2 text-xs">
                                {headings.map((heading, idx) => {
                                    const indent = heading.level === 1 ? 'pl-0 font-medium' : heading.level === 2 ? 'pl-3' : 'pl-6';
                                    return (
                                        <li key={idx} className={indent}>
                                            <a
                                                href={`#${heading.id}`}
                                                className="text-zinc-500 dark:text-zinc-500 hover:text-sky-700 dark:hover:text-sky-300 transition-all duration-200 block truncate py-1 leading-relaxed relative hover:translate-x-1"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    const el = document.getElementById(heading.id);
                                                    if (el) {
                                                        el.scrollIntoView({ behavior: 'smooth' });
                                                        window.history.pushState(null, '', `#${heading.id}`);
                                                    }
                                                }}
                                            >
                                                {heading.text}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </aside>
                    )}
                </div>
            </main>

            <nav
                aria-label="Mobile shortcuts"
                className="mycodex-bottom-nav fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-zinc-200 bg-white/95 px-2 py-1 text-[11px] font-semibold text-zinc-500 shadow-2xl shadow-black/10 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-400"
            >
                <a
                    href={buildUrl('/')}
                    className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg active:scale-95 ${
                        currentPath === '/' ? 'text-sky-700 dark:text-sky-300' : ''
                    }`}
                >
                    <LuHome className="h-4 w-4" />
                    <span>Home</span>
                </a>
                <button
                    type="button"
                    onClick={openNavigationSearch}
                    className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg active:scale-95"
                >
                    <LuSearch className="h-4 w-4" />
                    <span>Search</span>
                </button>
                <a
                    href={buildUrl(QUEUE_ROUTE_PATH)}
                    className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg active:scale-95 ${
                        currentPath === QUEUE_ROUTE_PATH ? 'text-sky-700 dark:text-sky-300' : ''
                    }`}
                >
                    <LuHistory className="h-4 w-4" />
                    <span>Queue</span>
                </a>
                <a
                    href={buildUrl(FAVORITES_ROUTE_PATH)}
                    className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg active:scale-95 ${
                        currentPath === FAVORITES_ROUTE_PATH ? 'text-amber-600 dark:text-amber-300' : ''
                    }`}
                >
                    <LuStar className={`h-4 w-4 ${currentPath === FAVORITES_ROUTE_PATH ? 'fill-current' : ''}`} />
                    <span>Saved</span>
                </a>
                <button
                    type="button"
                    onClick={openSettingsDrawer}
                    className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg active:scale-95"
                >
                    <LuSettings className="h-4 w-4" />
                    <span>Settings</span>
                </button>
            </nav>

            {IS_AUDIO_READER_ENABLED && audioStatus !== 'idle' && (
                <div
                    role="status"
                    aria-live="polite"
                    className="mycodex-audio-player fixed bottom-5 left-4 right-20 z-[55] flex min-h-14 items-center gap-3 rounded-2xl border border-zinc-200 bg-white/95 px-3 py-2 text-zinc-800 shadow-2xl shadow-black/10 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-100 sm:left-auto sm:right-20 sm:w-80"
                >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                        <LuVolume2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold">
                            {audioStatus === 'paused' ? 'Paused' : 'Reading'} {speechProgressLabel}
                        </div>
                        <div className="truncate text-[11px] font-medium text-zinc-500 dark:text-zinc-500">
                            {activeSpeechLabel || currentDocumentTitle}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={toggleSpeechPause}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                        aria-label={audioStatus === 'playing' ? 'Pause reading' : 'Resume reading'}
                    >
                        {audioStatus === 'playing' ? <LuPause className="h-4 w-4" /> : <LuPlay className="h-4 w-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={stopSpeech}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                        aria-label="Stop reading"
                    >
                        <LuSquare className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Scroll-To-Top Button */}
            {showScrollTop && (
                <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="mycodex-scroll-top fixed bottom-5 right-4 md:bottom-6 md:right-6 p-3 rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-xl shadow-sky-600/20 hover:scale-105 active:scale-95 transition-all duration-200 z-50 border border-sky-400/20"
                    style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-label="Scroll to top"
                >
                    <LuArrowUp className="w-5 h-5 font-bold" />
                </button>
            )}

            {actionStatus && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`mycodex-action-toast fixed bottom-20 left-4 right-4 z-[70] rounded-xl border px-4 py-3 text-sm font-semibold shadow-xl backdrop-blur sm:left-auto sm:right-6 sm:w-fit ${
                        actionStatus.tone === 'error'
                            ? 'border-red-200 bg-red-50/95 text-red-700 dark:border-red-900/60 dark:bg-red-950/90 dark:text-red-200'
                            : actionStatus.tone === 'info'
                                ? 'border-sky-200 bg-sky-50/95 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/90 dark:text-sky-200'
                                : 'border-emerald-200 bg-emerald-50/95 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/90 dark:text-emerald-200'
                    }`}
                >
                    {actionStatus.message}
                </div>
            )}
        </div>
    );
}
