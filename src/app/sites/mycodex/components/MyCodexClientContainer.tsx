'use client';

import React, { useState, useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    LuMenu, 
    LuX, 
    LuSearch, 
    LuBookOpen, 
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
    LuSettings
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

interface MyCodexClientContainerProps {
    docsTree: DocNode[];
    currentMarkdown: string;
    currentSlug: string[];
    headings: Heading[];
    isLocalDev: boolean;
    sourceFilePath: string | null;
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
const DEFAULT_READER_FONT_SIZE = 16;
const MIN_READER_FONT_SIZE = 10;
const MAX_READER_FONT_SIZE = 22;
const MAX_TREE_INDENT_DEPTH = 4;
const MAX_SCREENSHOT_HEIGHT = 14000;

type ReaderWidth = 'focus' | 'standard' | 'wide';

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

const clampReaderFontSize = (value: number) => Math.min(MAX_READER_FONT_SIZE, Math.max(MIN_READER_FONT_SIZE, value));

const isReaderWidth = (value: string | null): value is ReaderWidth => (
    value === 'focus' || value === 'standard' || value === 'wide'
);

export default function MyCodexClientContainer({
    docsTree,
    currentMarkdown,
    currentSlug,
    headings,
    isLocalDev,
    sourceFilePath,
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
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const readerCaptureRef = useRef<HTMLDivElement | null>(null);
    const actionStatusTimerRef = useRef<number | null>(null);

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
    }, []);

    // Apply dark class to <html> and persist
    useEffect(() => {
        if (isDark === null) return;
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    const toggleTheme = () => setIsDark((prev) => !prev);

    useEffect(() => {
        localStorage.setItem(READER_FONT_SIZE_STORAGE_KEY, String(readerFontSize));
    }, [readerFontSize]);

    useEffect(() => {
        localStorage.setItem(READER_WIDTH_STORAGE_KEY, readerWidth);
    }, [readerWidth]);

    useEffect(() => {
        localStorage.setItem(READER_NAV_STORAGE_KEY, String(sidebarPinned));
    }, [sidebarPinned]);

    useEffect(() => {
        const isMobileViewport = window.matchMedia('(max-width: 767px)').matches;
        const shouldLockScroll = settingsOpen || (sidebarOpen && isMobileViewport);
        if (!shouldLockScroll) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [sidebarOpen, settingsOpen]);

    useEffect(() => {
        return () => {
            if (actionStatusTimerRef.current) {
                window.clearTimeout(actionStatusTimerRef.current);
            }
        };
    }, []);

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
                setSettingsOpen(false);
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
    }, []);

    const currentPath = '/' + currentSlug.join('/');

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

    // Format human-readable title from path/filename
    const formatTitle = (name: string) => {
        return name
            .replace(/\.md$/, '')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    };

    // Build standard URL based on current routing prefix
    const buildUrl = (targetPath: string) => {
        const cleanPath = targetPath.startsWith('/') ? targetPath : '/' + targetPath;
        return isLocalDev ? `/__mycodex${cleanPath === '/' ? '' : cleanPath}` : cleanPath;
    };

    const openNavigationSearch = () => {
        setSidebarPinned(true);
        setSidebarOpen(true);
        setSettingsOpen(false);
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
    };

    const currentDocumentTitle = currentSlug.length > 0
        ? formatTitle(currentSlug[currentSlug.length - 1])
        : 'Master Index';

    const fallbackSourcePath = currentSlug.length > 0
        ? `__docs__/${currentSlug.join('/')}.md`
        : '__docs__/index.md';
    const documentSourcePath = sourceFilePath || fallbackSourcePath;
    const documentSourceLabel = sourceFilePath ? 'Source file' : 'Document route';

    const showActionStatus = (message: string, tone: 'success' | 'error' | 'info' = 'success') => {
        setActionStatus({ message, tone });
        if (actionStatusTimerRef.current) {
            window.clearTimeout(actionStatusTimerRef.current);
        }
        actionStatusTimerRef.current = window.setTimeout(() => setActionStatus(null), 2400);
    };

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

    const readerControlButtonClass = 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:border-sky-300 hover:text-sky-700 active:scale-95 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-sky-700 dark:hover:text-sky-300';
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
        }
    }), [currentSlug, isLocalDev]);

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

    return (
        <div className="flex-1 flex flex-col md:flex-row relative overflow-x-hidden">
            <div
                aria-hidden="true"
                className="fixed left-0 top-0 z-[60] h-0.5 bg-sky-500 transition-[width] duration-150 dark:bg-sky-400"
                style={{ width: `${readingProgress}%` }}
            />

            {/* Header / Mobile Action Bar */}
            <header className="fixed inset-x-0 top-0 z-50 h-16 w-full flex items-center justify-between px-4 md:hidden bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="flex items-center gap-2">
                    <LuBookOpen className="w-5 h-5 text-sky-600 dark:text-sky-300" />
                    <span className="font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        MyCodex
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setSettingsOpen(true)}
                        aria-label="Open reader settings"
                        className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 active:scale-95"
                        style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <LuSettings className="w-5 h-5" />
                    </button>
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
                fixed inset-y-0 left-0 z-[60] w-72 md:w-80 flex flex-col transform transition-transform duration-300 ease-in-out
                bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-r border-zinc-200 dark:border-zinc-800/80
                ${sidebarPinned ? 'md:sticky md:top-0 md:h-screen md:translate-x-0' : 'md:hidden'}
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Brand identity on desktop */}
                <div className="hidden h-20 md:flex items-center gap-2 px-4 border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/20">
                    <LuBookOpen className="w-5 h-5 text-sky-600 dark:text-sky-300 shrink-0" />
                    <h1 className="text-base font-extrabold tracking-tight text-zinc-900 dark:text-white flex-1">
                        MyCodex
                    </h1>
                    <button
                        type="button"
                        onClick={() => setSettingsOpen(true)}
                        aria-label="Open reader settings"
                        className="ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-500 transition-all hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    >
                        <LuSettings className="w-4 h-4" />
                    </button>
                </div>

                {/* Mobile Drawer Close Button */}
                <div className="flex md:hidden justify-between items-center px-4 py-4 border-b border-zinc-200 dark:border-zinc-900">
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
                <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 select-none">
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

                    {filteredTree.length > 0 ? (
                        filteredTree.map(node => renderNode(node))
                    ) : (
                        <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-xs">
                            No documents match your query
                        </div>
                    )}
                </nav>

                {/* Footer bar */}
                <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-950/30 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
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

            {settingsOpen && (
                <>
                    <div
                        aria-hidden="true"
                        onClick={() => setSettingsOpen(false)}
                        className="fixed inset-0 z-[65] bg-black/35 backdrop-blur-sm dark:bg-black/60"
                    />
                    <aside
                        role="dialog"
                        aria-modal="true"
                        aria-label="Reader settings"
                        className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
                    >
                        <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
                            <div>
                                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Settings</div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-500">Reader and document actions</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSettingsOpen(false)}
                                aria-label="Close settings"
                                className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                            >
                                <LuX className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
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
                                </div>
                            </section>

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

                            <section className="space-y-3">
                                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                                    Navigation
                                </div>
                                <button
                                    type="button"
                                    onClick={openNavigationSearch}
                                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-sky-300 hover:text-sky-700 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-sky-700 dark:hover:text-sky-300"
                                >
                                    <LuSearch className="h-4 w-4" />
                                    <span>Search documents</span>
                                </button>
                            </section>
                        </div>
                    </aside>
                </>
            )}

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 overflow-x-hidden bg-zinc-50 pt-16 dark:bg-zinc-950 md:pt-0">
                <div className="sticky top-0 z-30 hidden h-16 items-center border-b border-zinc-200/80 bg-zinc-50/95 px-8 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/95 md:flex">
                    <div className="flex w-full items-center justify-between gap-3">
                        <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {currentDocumentTitle}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-500">
                                {documentSourcePath}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSettingsOpen(true)}
                            className={readerControlButtonClass}
                            aria-label="Open reader settings"
                            title="Open reader settings"
                        >
                            <LuSettings className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="flex min-w-0 flex-col lg:flex-row">
                    <article className="flex-1 min-w-0 overflow-x-auto px-4 py-6 md:px-10 md:py-8">
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
                                                        {seg.replace(/[-_]/g, ' ')}
                                                    </span>
                                                ) : (
                                                    <a href={buildUrl(segmentPath)} className="max-w-[110px] truncate hover:text-sky-600 dark:hover:text-sky-300 transition-colors">
                                                        {seg.replace(/[-_]/g, ' ')}
                                                    </a>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Main Markdown Body */}
                            <div className="prose prose-custom max-w-none overflow-x-auto">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={customComponents}
                                >
                                    {currentMarkdown}
                                </ReactMarkdown>
                            </div>
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

            {/* Scroll-To-Top Button */}
            {showScrollTop && (
                <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-5 right-4 md:bottom-6 md:right-6 p-3 rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-xl shadow-sky-600/20 hover:scale-105 active:scale-95 transition-all duration-200 z-50 border border-sky-400/20"
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
                    className={`fixed bottom-20 left-4 right-4 z-[70] rounded-xl border px-4 py-3 text-sm font-semibold shadow-xl backdrop-blur sm:left-auto sm:right-6 sm:w-fit ${
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
