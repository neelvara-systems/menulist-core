'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
    LuCheck,
    LuClipboard,
    LuDownload,
    LuFileText,
    LuLoader2,
    LuX,
} from 'react-icons/lu';

type PromptModalProps = {
    basePath?: string;
    buttonClassName?: string;
    buttonLabel?: string;
};

const PROMPT_FILE_NAME = 'answerlattice-pre-onboarding-master-prompt.md';

export default function AnswerlatticePreOnboardingPromptModal({
    basePath = '',
    buttonClassName = '',
    buttonLabel = 'Open the agent prompt',
}: PromptModalProps) {
    const [open, setOpen] = useState(false);
    const [promptText, setPromptText] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'copied' | 'downloaded' | 'error'>('idle');
    const dialogTitleId = useId();
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);

    const promptUrl = `${basePath}/pre-onboarding.md`;

    const loadPrompt = useCallback(async () => {
        if (promptText || status === 'loading') return;

        setStatus('loading');
        try {
            const response = await fetch(promptUrl, { headers: { Accept: 'text/markdown' } });
            if (!response.ok) throw new Error(`Prompt request failed: ${response.status}`);
            setPromptText(await response.text());
            setStatus('idle');
        } catch {
            setStatus('error');
        }
    }, [promptText, promptUrl, status]);

    const openModal = () => {
        setOpen(true);
        void loadPrompt();
    };

    const closeModal = useCallback(() => {
        setOpen(false);
        if (status === 'copied' || status === 'downloaded') {
            setStatus('idle');
        }
    }, [status]);

    const copyPrompt = async () => {
        if (!promptText) return;

        try {
            await navigator.clipboard.writeText(promptText);
            setStatus('copied');
        } catch {
            setStatus('error');
        }
    };

    const downloadPrompt = () => {
        if (!promptText) return;

        const blob = new Blob([promptText], { type: 'text/markdown;charset=utf-8' });
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = PROMPT_FILE_NAME;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
        setStatus('downloaded');
    };

    useEffect(() => {
        if (!open) return undefined;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.setTimeout(() => closeButtonRef.current?.focus(), 0);

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeModal();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [closeModal, open]);

    return (
        <>
            <button className={buttonClassName} onClick={openModal} type="button">
                <span className="inline-flex items-center justify-center gap-2">
                    <LuFileText aria-hidden size={16} />
                    {buttonLabel}
                </span>
            </button>

            {open ? (
                <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 px-3 py-4 backdrop-blur-md sm:items-center sm:px-6" role="presentation">
                    <button
                        aria-label="Close prompt preview"
                        className="absolute inset-0 h-full w-full cursor-default"
                        onClick={closeModal}
                        type="button"
                    />
                    <section
                        aria-labelledby={dialogTitleId}
                        aria-modal="true"
                        className="relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#09091a] text-white shadow-2xl shadow-black/60"
                        role="dialog"
                    >
                        <div className="flex flex-col gap-4 border-b border-white/[0.08] bg-white/[0.025] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                            <div className="flex min-w-0 items-start gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-200/10 bg-teal-300/[0.08] text-teal-200">
                                    <LuFileText aria-hidden size={18} />
                                </span>
                                <div className="min-w-0">
                                    <h2 id={dialogTitleId} className="text-lg font-bold text-white">
                                        Answerlattice pre-onboarding prompt
                                    </h2>
                                    <p className="mt-1 text-sm leading-relaxed text-[#9a9ab8]">
                                        Copy this into Codex, Cursor, Windsurf, Antigravity, Claude Code, or download it as a Markdown file.
                                    </p>
                                </div>
                            </div>
                            <button
                                aria-label="Close prompt preview"
                                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg text-[#a0a0c0] transition hover:bg-white/[0.06] hover:text-white sm:static"
                                onClick={closeModal}
                                ref={closeButtonRef}
                                type="button"
                            >
                                <LuX aria-hidden size={20} />
                            </button>
                        </div>

                        <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[1fr_16rem]">
                            <div className="min-h-0 overflow-hidden rounded-xl border border-white/[0.08] bg-[#050512]">
                                {status === 'loading' ? (
                                    <div className="flex min-h-[24rem] items-center justify-center gap-3 text-sm text-[#a0a0c0]">
                                        <LuLoader2 aria-hidden className="animate-spin" size={18} />
                                        Loading prompt
                                    </div>
                                ) : status === 'error' && !promptText ? (
                                    <div className="flex min-h-[24rem] items-center justify-center px-6 text-center text-sm leading-relaxed text-amber-100">
                                        The prompt could not be loaded. Use the download route again after the page refreshes.
                                    </div>
                                ) : (
                                    <pre className="max-h-[56vh] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-[#d6d6ef] sm:text-sm">
                                        {promptText}
                                    </pre>
                                )}
                            </div>

                            <aside className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                                <button
                                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={!promptText || status === 'loading'}
                                    onClick={copyPrompt}
                                    type="button"
                                >
                                    {status === 'copied' ? <LuCheck aria-hidden size={16} /> : <LuClipboard aria-hidden size={16} />}
                                    {status === 'copied' ? 'Copied' : 'Copy prompt'}
                                </button>
                                <button
                                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={!promptText || status === 'loading'}
                                    onClick={downloadPrompt}
                                    type="button"
                                >
                                    {status === 'downloaded' ? <LuCheck aria-hidden size={16} /> : <LuDownload aria-hidden size={16} />}
                                    {status === 'downloaded' ? 'Downloaded' : 'Download .md'}
                                </button>
                                {status === 'error' && promptText ? (
                                    <p className="rounded-lg border border-amber-300/20 bg-amber-300/[0.055] p-3 text-xs leading-relaxed text-amber-100">
                                        Clipboard access was blocked. Use the preview text or download the Markdown file.
                                    </p>
                                ) : null}
                                <p className="mt-2 text-xs leading-relaxed text-[#8585a3]">
                                    Direct agent access remains available at <span className="break-all font-mono text-[#d6d6ef]">{promptUrl}</span>. Review the generated package before upload.
                                </p>
                            </aside>
                        </div>
                    </section>
                </div>
            ) : null}
        </>
    );
}
