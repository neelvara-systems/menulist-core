'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    LuAlertTriangle,
    LuBookOpen,
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

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_SESSION_MESSAGES = 5;
const MAX_CONTEXT_PAYLOAD_BYTES = 2048;

type WidgetHistoryMode = 'session' | 'forget';

interface WidgetProcedureStep {
    stepOrder: number;
    action?: string;
    instruction: string;
    target?: string;
    expectedResult?: string;
    troubleshootingHint?: string;
}

interface WidgetProcedure {
    steps?: WidgetProcedureStep[];
    warnings?: { message: string; severity?: string }[];
    prerequisites?: { description: string; type?: string; value?: string }[];
}

interface WidgetMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    canonical?: boolean;
    confidence?: string;
    references?: { id: string; title: string }[];
    relatedContent?: {
        key?: string;
        label?: string;
        articles?: Array<{ id: string; title: string; url?: string }>;
        changelogs?: Array<{ id: string; pageId?: string; title: string; version?: string | null }>;
    };
    suggestedQuestions?: string[];
    searchHistoryId?: string;
    feedback?: 'up' | 'down' | null;
    imageBase64?: string;
    imageMimeType?: string;
    procedure?: WidgetProcedure;
}

interface WidgetClientProps {
    apiKey: string;
}

const sanitizeContextString = (value: unknown, maxLength = 100): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '').slice(0, maxLength);
    return normalized || null;
};

const sanitizeContextPayload = (value: unknown): Record<string, any> | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const input = value as Record<string, unknown>;
    const output: Record<string, any> = {};
    ['contextKey', 'feature', 'page', 'workflow', 'userRole', 'plan'].forEach((key) => {
        const current = sanitizeContextString(input[key]);
        if (current) output[key] = current;
    });
    if (typeof input.contextVersion === 'number' && input.contextVersion >= 1 && input.contextVersion <= 10) {
        output.contextVersion = Math.floor(input.contextVersion);
    }
    if (Array.isArray(input.entityHints)) {
        output.entityHints = input.entityHints
            .slice(0, 5)
            .map((hint) => sanitizeContextString(hint, 64))
            .filter((hint): hint is string => Boolean(hint));
    }
    const hasMeaningfulContext = ['contextKey', 'feature', 'page', 'workflow', 'userRole', 'plan'].some((key) => Boolean(output[key]))
        || (Array.isArray(output.entityHints) && output.entityHints.length > 0);
    if (!hasMeaningfulContext) return null;

    const payloadBytes = new TextEncoder().encode(JSON.stringify(output)).length;
    return payloadBytes <= MAX_CONTEXT_PAYLOAD_BYTES ? output : null;
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

const formatContextLabel = (context: Record<string, any> | null): string | null => {
    const rawValue = typeof context?.contextKey === 'string'
        ? context.contextKey
        : typeof context?.page === 'string'
        ? context.page
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
    const [historyMode, setHistoryMode] = useState<WidgetHistoryMode>('session');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const activeRequestRef = useRef(0);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    const clearConversation = useCallback(() => {
        activeRequestRef.current += 1;
        setMessages([]);
        setQuery('');
        setLoading(false);
        setError(null);
        setSelectedImage(null);
    }, []);

    const closeWidget = useCallback(() => {
        window.parent?.postMessage({ type: 'canonica-widget-close' }, '*');
    }, []);

    // Listen for context updates from embed script via postMessage
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.source !== window.parent) return;
            if (e.data?.type === 'canonica-context-update') {
                const nextContext = sanitizeContextPayload(e.data.context);
                setProductContext(nextContext);
            }
            if (e.data?.type === 'canonica-widget-visibility') {
                const nextHistoryMode: WidgetHistoryMode = e.data.historyMode === 'forget' ? 'forget' : 'session';
                setHistoryMode(nextHistoryMode);
                if (e.data.state === 'closed' && e.data.clearHistory) {
                    clearConversation();
                }
            }
            if (e.data?.type === 'canonica-widget-clear-history') {
                clearConversation();
            }
            if (e.data?.type === 'canonica-predictive-suggestion' && e.data.suggestion) {
                const suggestion = e.data.suggestion;
                const title = typeof suggestion.title === 'string' ? suggestion.title.slice(0, 160) : '';
                const summary = typeof suggestion.summary === 'string' ? suggestion.summary.slice(0, 600) : '';
                const content = [title, summary].filter(Boolean).join('\n\n');
                if (!content) return;

                setMessages(prev => {
                    const triggerId = typeof suggestion.triggerId === 'string' ? suggestion.triggerId.slice(0, 120) : String(Date.now());
                    const id = `p-${triggerId}`;
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
                    }];
                });
            }
        };
        window.addEventListener('message', handler);
        window.parent?.postMessage({ type: 'canonica-widget-ready' }, '*');
        return () => window.removeEventListener('message', handler);
    }, [clearConversation]);

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
        if (!q || loading) return;
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
            const body: Record<string, any> = { query: q };

            // Session memory: include conversation history after first exchange
            const history = getConversationHistory();
            if (history && history.length > 0) {
                body.conversationHistory = history;
            }

            // Context-aware support: include product context if available
            if (productContext) {
                body.context = productContext;
            }

            // Image support: send base64 inline
            if (currentImage) {
                body.imageBase64 = currentImage.base64;
                body.imageMimeType = currentImage.mimeType;
            }

            const res = await fetch('/api/widget/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Request failed (${res.status})`);
            }

            const data = await res.json();
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
                references: data.references,
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
        } catch (err: any) {
            if (activeRequestRef.current !== requestId) return;
            setError(err.message || 'Something went wrong');
        } finally {
            if (activeRequestRef.current === requestId) {
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
        if (file.size > MAX_IMAGE_SIZE) {
            setError('Image must be less than 5MB');
            return;
        }
        if (!file.type.startsWith('image/')) {
            setError('Only image files are allowed');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1]; // Remove data:image/...;base64, prefix
            setSelectedImage({ base64, mimeType: file.type, name: file.name });
        };
        reader.readAsDataURL(file);
    };

    // Clipboard paste support for images
    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) handleImageSelect(file);
                break;
            }
        }
    };

    // Feedback handler
    const handleFeedback = async (msgId: string, isGood: boolean) => {
        const msg = messages.find(m => m.id === msgId);
        if (!msg?.searchHistoryId || msg.feedback) return;

        setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, feedback: isGood ? 'up' : 'down' } : m
        ));

        try {
            await fetch('/api/widget/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
                body: JSON.stringify({ searchHistoryId: msg.searchHistoryId, isGood }),
            });
        } catch {
            // Fire-and-forget — don't revert UI on failure
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
            <div style={styles.header}>
                <div style={styles.headerMain}>
                    <div style={styles.headerIcon}>
                        <LuMessageCircle size={16} aria-hidden />
                    </div>
                    <div style={styles.headerText}>
                        <span style={styles.headerTitle}>Help</span>
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
                        <div style={styles.welcomeIcon}>
                            <LuMessageCircle size={32} aria-hidden />
                        </div>
                        <p style={styles.welcomeTitle}>How can we help?</p>
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
                        <div style={msg.role === 'user' ? styles.userBubble : styles.aiBubble}>
                            {msg.imageBase64 && (
                                <img
                                    src={`data:${msg.imageMimeType || 'image/png'};base64,${msg.imageBase64}`}
                                    alt="Uploaded"
                                    style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 8, marginBottom: 6 }}
                                />
                            )}
                            <p style={styles.msgText}>{msg.content}</p>

                            {msg.canonical && (
                                <div style={styles.canonicalBadge}>
                                    <LuCheckCircle size={12} aria-hidden />
                                    Verified answer
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
                                            .map((step, i) => (
                                                <div key={`${step.stepOrder}-${i}`} style={styles.procedureStep}>
                                                    <span style={styles.procedureStepNumber}>{step.stepOrder || i + 1}</span>
                                                    <div style={styles.procedureStepBody}>
                                                        <p style={styles.procedureStepText}>{step.instruction}</p>
                                                        {step.expectedResult && (
                                                            <p style={styles.procedureStepHint}>{step.expectedResult}</p>
                                                        )}
                                                        {step.troubleshootingHint && (
                                                            <p style={styles.procedureTroubleshoot}>{step.troubleshootingHint}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {msg.references && msg.references.length > 0 && (
                                <div style={styles.refsContainer}>
                                    {msg.references.map((ref, i) => (
                                        <span key={i} style={styles.refTag}>
                                            <LuBookOpen size={12} aria-hidden />
                                            {ref.title}
                                        </span>
                                    ))}
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
                                                style={styles.relatedBtn}
                                                onClick={() => article.url && window.open(article.url, '_blank', 'noopener,noreferrer')}
                                                title={article.title}
                                            >
                                                <LuBookOpen size={12} aria-hidden />
                                                <span style={styles.relatedBtnText}>{article.title}</span>
                                            </button>
                                        ))}
                                        {(msg.relatedContent.changelogs || []).slice(0, 2).map((entry) => (
                                            <button
                                                key={`changelog-${entry.pageId || 'page'}-${entry.id}`}
                                                style={styles.relatedBtn}
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
                                            {msg.feedback === 'up' ? <LuThumbsUp size={13} aria-hidden /> : <LuThumbsDown size={13} aria-hidden />}
                                            Thanks for feedback
                                        </span>
                                    ) : (
                                        <>
                                            <button style={styles.feedbackBtn} onClick={() => handleFeedback(msg.id, true)} title="Helpful" aria-label="Helpful">
                                                <LuThumbsUp size={15} aria-hidden />
                                            </button>
                                            <button style={styles.feedbackBtn} onClick={() => handleFeedback(msg.id, false)} title="Not helpful" aria-label="Not helpful">
                                                <LuThumbsDown size={15} aria-hidden />
                                            </button>
                                        </>
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
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0]); e.target.value = ''; }}
                />
                <button
                    style={styles.imageBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    title="Attach screenshot"
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
                    style={{ ...styles.sendBtn, opacity: loading || !query.trim() ? 0.5 : 1 }}
                    aria-label="Send question"
                >
                    <LuSend size={16} aria-hidden />
                </button>
            </div>

            {/* Footer */}
            <div style={styles.footer}>
                <span style={styles.footerText}>
                    Powered by{' '}
                    <a href="https://canonica.app" target="_blank" rel="noopener noreferrer" style={styles.footerLink}>
                        Canonica
                    </a>
                </span>
            </div>
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
    msgText: { margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', fontSize: 13 },
    canonicalBadge: { marginTop: 8, padding: '4px 8px', borderRadius: 6, background: '#ecfdf5', color: '#059669', fontSize: 11, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 },
    procedureContainer: { marginTop: 10, padding: 10, borderRadius: 10, background: '#ffffff', border: '1px solid #e5e7eb' },
    procedureHeader: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#374151', fontSize: 12, fontWeight: 700 },
    procedureMetaBox: { display: 'flex', gap: 8, padding: 8, borderRadius: 8, background: '#eff6ff', color: '#1d4ed8', marginBottom: 8 },
    procedureMetaText: { margin: '0 0 3px 0', fontSize: 11, lineHeight: 1.4 },
    procedureWarningBox: { display: 'flex', gap: 8, padding: 8, borderRadius: 8, background: '#fff7ed', color: '#c2410c', marginBottom: 8 },
    procedureWarningText: { margin: '0 0 3px 0', fontSize: 11, lineHeight: 1.4 },
    procedureSteps: { display: 'flex', flexDirection: 'column', gap: 8 },
    procedureStep: { display: 'flex', gap: 8, alignItems: 'flex-start' },
    procedureStepNumber: { width: 22, height: 22, borderRadius: '50%', background: '#6366f1', color: '#ffffff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    procedureStepBody: { minWidth: 0, flex: 1 },
    procedureStepText: { margin: 0, color: '#111827', fontSize: 12, lineHeight: 1.45, overflowWrap: 'break-word' },
    procedureStepHint: { margin: '3px 0 0 0', color: '#4b5563', fontSize: 11, lineHeight: 1.4, overflowWrap: 'break-word' },
    procedureTroubleshoot: { margin: '3px 0 0 0', color: '#6b7280', fontSize: 11, lineHeight: 1.4, fontStyle: 'italic', overflowWrap: 'break-word' },
    refsContainer: { marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 },
    refTag: { padding: '3px 8px', borderRadius: 4, background: '#e5e7eb', fontSize: 11, color: '#4b5563', display: 'inline-flex', alignItems: 'center', gap: 4 },
    relatedContainer: { marginTop: 10, padding: 8, borderRadius: 10, background: '#ffffff', border: '1px solid #e5e7eb' },
    relatedHeader: { marginBottom: 6, color: '#374151', fontSize: 11, fontWeight: 700 },
    relatedList: { display: 'flex', flexDirection: 'column', gap: 5 },
    relatedBtn: { minHeight: 34, width: '100%', padding: '5px 8px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left' as const },
    relatedBtnText: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    feedbackRow: { marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 },
    feedbackBtn: { width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', background: '#ffffff', color: '#4b5563', fontSize: 14, cursor: 'pointer', lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
    feedbackDone: { fontSize: 11, color: '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: 4 },
    suggestionsContainer: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 },
    suggestionBtn: { padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#ffffff', color: '#6366f1', fontSize: 12, cursor: 'pointer', textAlign: 'left' as const },
    loadingDots: { display: 'flex', gap: 4, padding: '4px 0' },
    dot: { fontSize: 10, color: '#9ca3af' },
    errorContainer: { padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', marginBottom: 12 },
    errorText: { margin: '0 0 8px 0', fontSize: 13, color: '#dc2626' },
    retryBtn: { minHeight: 36, padding: '4px 12px', borderRadius: 6, border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', fontSize: 12, cursor: 'pointer' },
    imagePreview: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderTop: '1px solid #f3f4f6', background: '#f9fafb', minWidth: 0 },
    imageRemoveBtn: { width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#e5e7eb', color: '#6b7280', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    inputArea: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', borderTop: '1px solid #e5e7eb', background: '#ffffff', flexShrink: 0 },
    imageBtn: { width: 44, height: 44, borderRadius: '50%', border: '1px solid #d1d5db', background: '#ffffff', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    input: { flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: 22, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', background: '#f9fafb' },
    sendBtn: { width: 44, height: 44, borderRadius: '50%', border: 'none', background: '#6366f1', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    footer: { padding: '8px 16px', textAlign: 'center' as const, borderTop: '1px solid #f3f4f6', flexShrink: 0 },
    footerText: { fontSize: 11, color: '#9ca3af' },
    footerLink: { color: '#6366f1', textDecoration: 'none', fontWeight: 500 },
};
