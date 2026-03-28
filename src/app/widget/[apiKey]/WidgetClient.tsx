'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_SESSION_MESSAGES = 10; // Keep last 10 messages (5 Q&A pairs)

interface WidgetMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    canonical?: boolean;
    confidence?: string;
    references?: { id: string; title: string }[];
    suggestedQuestions?: string[];
    searchHistoryId?: string;
    feedback?: 'up' | 'down' | null;
    imageBase64?: string;
}

interface WidgetClientProps {
    apiKey: string;
}

export default function WidgetClient({ apiKey }: WidgetClientProps) {
    const [messages, setMessages] = useState<WidgetMessage[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
    const [productContext, setProductContext] = useState<Record<string, any> | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    // Listen for context updates from embed script via postMessage
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data?.type === 'canonica-context-update' && e.data.context) {
                setProductContext(e.data.context);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    // Build conversation history for context (last 5 messages)
    const getConversationHistory = () => {
        if (messages.length < 2) return undefined;
        return messages.slice(-MAX_SESSION_MESSAGES).map(m => ({
            role: m.role,
            content: m.role === 'user' ? m.content : m.content,
        }));
    };

    const handleSearch = async (searchQuery?: string) => {
        const q = (searchQuery || query).trim();
        if (!q || loading) return;

        const userMsg: WidgetMessage = {
            id: `u-${Date.now()}`,
            role: 'user',
            content: q,
            imageBase64: selectedImage?.base64,
        };

        setMessages(prev => [...prev, userMsg]);
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

            const aiMsg: WidgetMessage = {
                id: `a-${Date.now()}`,
                role: 'assistant',
                content: data.answer || 'No answer found.',
                canonical: data.canonical,
                confidence: data.confidence,
                references: data.references,
                suggestedQuestions: data.suggestedQuestions,
                searchHistoryId: data.searchHistoryId,
                feedback: null,
            };

            setMessages(prev => [...prev, aiMsg]);
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

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
                <div style={styles.headerIcon}>?</div>
                <span style={styles.headerTitle}>Help</span>
            </div>

            {/* Messages area */}
            <div style={styles.messagesArea}>
                {messages.length === 0 && !loading && (
                    <div style={styles.welcomeContainer}>
                        <div style={styles.welcomeIcon}>💬</div>
                        <p style={styles.welcomeTitle}>How can we help?</p>
                        <p style={styles.welcomeSubtext}>
                            Ask a question and we will find the best answer from our knowledge base.
                        </p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} style={msg.role === 'user' ? styles.userMsgRow : styles.aiMsgRow}>
                        <div style={msg.role === 'user' ? styles.userBubble : styles.aiBubble}>
                            {msg.imageBase64 && (
                                <img
                                    src={`data:image/png;base64,${msg.imageBase64}`}
                                    alt="Uploaded"
                                    style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 8, marginBottom: 6 }}
                                />
                            )}
                            <p style={styles.msgText}>{msg.content}</p>

                            {msg.canonical && (
                                <div style={styles.canonicalBadge}>✓ Verified answer</div>
                            )}

                            {msg.references && msg.references.length > 0 && (
                                <div style={styles.refsContainer}>
                                    {msg.references.map((ref, i) => (
                                        <span key={i} style={styles.refTag}>📄 {ref.title}</span>
                                    ))}
                                </div>
                            )}

                            {/* Feedback buttons for AI messages */}
                            {msg.role === 'assistant' && msg.searchHistoryId && (
                                <div style={styles.feedbackRow}>
                                    {msg.feedback ? (
                                        <span style={styles.feedbackDone}>
                                            {msg.feedback === 'up' ? '👍' : '👎'} Thanks for feedback
                                        </span>
                                    ) : (
                                        <>
                                            <button style={styles.feedbackBtn} onClick={() => handleFeedback(msg.id, true)} title="Helpful">👍</button>
                                            <button style={styles.feedbackBtn} onClick={() => handleFeedback(msg.id, false)} title="Not helpful">👎</button>
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
                                if (lastUser) handleSearch(lastUser.content);
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
                    <button style={styles.imageRemoveBtn} onClick={() => setSelectedImage(null)}>✕</button>
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
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                    </svg>
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
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
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

const styles: Record<string, React.CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#ffffff', color: '#1a1a2e', fontSize: 14 },
    header: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#6366f1', color: '#ffffff', flexShrink: 0 },
    headerIcon: { width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 },
    headerTitle: { fontSize: 15, fontWeight: 600 },
    messagesArea: { flex: 1, overflowY: 'auto', padding: 16 },
    welcomeContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 16px' },
    welcomeIcon: { fontSize: 32, marginBottom: 12 },
    welcomeTitle: { fontSize: 16, fontWeight: 600, margin: '0 0 8px 0', color: '#1a1a2e' },
    welcomeSubtext: { fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.5 },
    userMsgRow: { display: 'flex', justifyContent: 'flex-end', marginBottom: 12 },
    aiMsgRow: { display: 'flex', justifyContent: 'flex-start', marginBottom: 12 },
    userBubble: { maxWidth: '80%', padding: '10px 14px', borderRadius: '16px 16px 4px 16px', background: '#6366f1', color: '#ffffff' },
    aiBubble: { maxWidth: '85%', padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: '#f3f4f6', color: '#1a1a2e' },
    msgText: { margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', fontSize: 13 },
    canonicalBadge: { marginTop: 8, padding: '4px 8px', borderRadius: 6, background: '#ecfdf5', color: '#059669', fontSize: 11, fontWeight: 500 },
    refsContainer: { marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 },
    refTag: { padding: '3px 8px', borderRadius: 4, background: '#e5e7eb', fontSize: 11, color: '#4b5563' },
    feedbackRow: { marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 },
    feedbackBtn: { padding: '2px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#ffffff', fontSize: 14, cursor: 'pointer', lineHeight: 1 },
    feedbackDone: { fontSize: 11, color: '#9ca3af' },
    suggestionsContainer: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 },
    suggestionBtn: { padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#ffffff', color: '#6366f1', fontSize: 12, cursor: 'pointer', textAlign: 'left' as const },
    loadingDots: { display: 'flex', gap: 4, padding: '4px 0' },
    dot: { fontSize: 10, color: '#9ca3af' },
    errorContainer: { padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', marginBottom: 12 },
    errorText: { margin: '0 0 8px 0', fontSize: 13, color: '#dc2626' },
    retryBtn: { padding: '4px 12px', borderRadius: 6, border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', fontSize: 12, cursor: 'pointer' },
    imagePreview: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderTop: '1px solid #f3f4f6', background: '#f9fafb' },
    imageRemoveBtn: { width: 20, height: 20, borderRadius: '50%', border: 'none', background: '#e5e7eb', color: '#6b7280', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    inputArea: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', borderTop: '1px solid #e5e7eb', background: '#ffffff', flexShrink: 0 },
    imageBtn: { width: 36, height: 36, borderRadius: '50%', border: '1px solid #d1d5db', background: '#ffffff', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    input: { flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', background: '#f9fafb' },
    sendBtn: { width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#6366f1', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    footer: { padding: '8px 16px', textAlign: 'center' as const, borderTop: '1px solid #f3f4f6', flexShrink: 0 },
    footerText: { fontSize: 11, color: '#9ca3af' },
    footerLink: { color: '#6366f1', textDecoration: 'none', fontWeight: 500 },
};
