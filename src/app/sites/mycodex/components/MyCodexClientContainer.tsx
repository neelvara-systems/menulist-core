'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    LuMenu, 
    LuX, 
    LuSearch, 
    LuBookOpen, 
    LuChevronRight, 
    LuChevronDown, 
    LuCornerDownRight,
    LuFileText,
    LuFolder,
    LuArrowUp,
    LuHome,
    LuBookmark,
    LuCompass,
    LuSun,
    LuMoon
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
}

export default function MyCodexClientContainer({
    docsTree,
    currentMarkdown,
    currentSlug,
    headings,
    isLocalDev,
}: MyCodexClientContainerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [isDark, setIsDark] = useState<boolean | null>(null);

    // Read theme from localStorage / system pref on mount
    useEffect(() => {
        const stored = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDark(stored ? stored === 'dark' : prefersDark);
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

    // Track scroll position to show/hide scroll to top button
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const currentPath = '/' + currentSlug.join('/');

    // Auto-expand folder tree leading to the active document
    useEffect(() => {
        if (currentSlug.length > 0) {
            const newExpanded: Record<string, boolean> = { ...expandedFolders };
            let pathAccumulator = '';
            for (let i = 0; i < currentSlug.length - 1; i++) {
                pathAccumulator = pathAccumulator ? `${pathAccumulator}/${currentSlug[i]}` : currentSlug[i];
                newExpanded[pathAccumulator] = true;
            }
            setExpandedFolders(newExpanded);
        }
    }, [currentPath]);

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
                        const filteredChildren = filterNodes(node.children);
                        const matchSelf = node.name.toLowerCase().includes(query);
                        if (filteredChildren.length > 0 || matchSelf) {
                            return {
                                ...node,
                                children: filteredChildren.length > 0 ? filteredChildren : node.children
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
                    NOTE: '📋 Note',
                    TIP: '💡 Tip',
                    IMPORTANT: '⚠️ Important',
                    WARNING: '🔥 Warning',
                    CAUTION: '🚨 Caution',
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
        a: ({ href, children, ...props }: any) => {
            if (!href) return <a {...props}>{children}</a>;

            let targetHref = href;

            // Handle file:/// absolute paths pointing to __docs__
            if (href.startsWith('file:///')) {
                const docsPathIndex = href.indexOf('__docs__/');
                if (docsPathIndex !== -1) {
                    targetHref = '/' + href.slice(docsPathIndex + 9).replace(/\.md$/, '').replace(/#.*$/, '');
                }
            } else if (!href.startsWith('http') && !href.startsWith('mailto') && !href.startsWith('#')) {
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
                const resolved = '/' + resolvedParts.join('/').replace(/\.md$/, '').replace(/#.*$/, '');
                targetHref = resolved;
            }

            const isExternal = href.startsWith('http') || href.startsWith('mailto');
            const finalHref = isExternal ? href : buildUrl(targetHref);

            return (
                <a 
                    href={finalHref} 
                    {...props} 
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 underline underline-offset-4 decoration-purple-400/30 hover:decoration-purple-300 transition-colors font-medium"
                >
                    {children}
                </a>
            );
        },
        // Auto-assign IDs to headings so they can be scrolled to via jump links
        h1: ({ children, ...props }: any) => {
            const textContent = String(children);
            const id = textContent.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
            return <h1 id={id} {...props}>{children}</h1>;
        },
        h2: ({ children, ...props }: any) => {
            const textContent = String(children);
            const id = textContent.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
            return <h2 id={id} {...props}>{children}</h2>;
        },
        h3: ({ children, ...props }: any) => {
            const textContent = String(children);
            const id = textContent.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
            return <h3 id={id} {...props}>{children}</h3>;
        }
    }), [currentSlug, isLocalDev]);

    // Recursive sidebar node renderer
    const renderNode = (node: DocNode, depth = 0) => {
        const isSelected = currentPath === '/' + node.path || (node.path === 'index' && currentPath === '/');
        const isFolderExpanded = expandedFolders[node.path];

        if (node.isDir) {
            return (
                <div key={node.path} className="mb-1">
                    <button
                        onClick={() => toggleFolder(node.path)}
                        className={`w-full flex items-center justify-between py-2 px-3 rounded-lg text-sm text-left transition-all duration-200 active:scale-[0.98] ${
                            isFolderExpanded 
                                ? 'text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/5' 
                                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900/50'
                        }`}
                        style={{ paddingLeft: `${depth * 12 + 12}px`, minHeight: '44px' }}
                    >
                        <span className="flex items-center gap-2 font-medium truncate">
                            <LuFolder className={`w-4 h-4 shrink-0 ${isFolderExpanded ? 'text-purple-500 dark:text-purple-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                            {formatTitle(node.name)}
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
                className={`flex items-center gap-2 py-2 px-3 rounded-lg text-sm transition-all duration-200 active:scale-[0.98] mb-0.5 ${
                    isSelected
                        ? 'bg-purple-100 dark:bg-purple-600/20 text-purple-700 dark:text-purple-200 border-l-2 border-purple-500 shadow-sm shadow-purple-500/5'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900/30'
                }`}
                style={{ paddingLeft: `${depth * 12 + 12}px`, minHeight: '44px' }}
            >
                <LuFileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-purple-500 dark:text-purple-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                <span className="truncate">{formatTitle(node.name)}</span>
            </a>
        );
    };

    return (
        <div className="flex-1 flex flex-col md:flex-row relative overflow-x-hidden">
            {/* Header / Mobile Action Bar */}
            <header className="sticky top-0 z-40 w-full flex items-center justify-between px-4 py-3 md:hidden bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="flex items-center gap-2">
                    <LuBookOpen className="w-5 h-5 text-purple-500 animate-pulse" />
                    <span className="font-bold tracking-tight bg-gradient-to-r from-purple-600 to-indigo-500 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                        MyCodex
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Theme toggle — before hamburger */}
                    {isDark !== null && (
                        <button
                            onClick={toggleTheme}
                            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 active:scale-95 transition-all"
                            style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            {isDark ? (
                                <LuSun className="w-5 h-5 text-yellow-400" />
                            ) : (
                                <LuMoon className="w-5 h-5 text-indigo-600" />
                            )}
                        </button>
                    )}
                    {/* Hamburger */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 active:scale-95"
                        style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        {sidebarOpen ? <LuX className="w-5 h-5" /> : <LuMenu className="w-5 h-5" />}
                    </button>
                </div>
            </header>

            {/* Sidebar (Desktop Slide/Lock & Mobile Modal Drawer) */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 md:w-80 flex flex-col transform transition-transform duration-300 ease-in-out
                bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-r border-zinc-200 dark:border-zinc-800/80
                md:sticky md:top-0 md:h-screen md:translate-x-0
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Brand Identity — Desktop */}
                <div className="hidden md:flex items-center gap-2 px-4 py-4 border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/20">
                    <LuBookOpen className="w-5 h-5 text-purple-500 shrink-0" />
                    <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 to-purple-600 dark:from-white dark:to-purple-400 bg-clip-text text-transparent flex-1">
                        MyCodex
                    </h1>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 shrink-0">
                        PWA
                    </span>
                    {/* Theme toggle in desktop sidebar header */}
                    {isDark !== null && (
                        <button
                            onClick={toggleTheme}
                            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                            className="ml-1 p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all shrink-0"
                        >
                            {isDark ? (
                                <LuSun className="w-4 h-4 text-yellow-400" />
                            ) : (
                                <LuMoon className="w-4 h-4 text-indigo-600" />
                            )}
                        </button>
                    )}
                </div>

                {/* Mobile Drawer Close Button */}
                <div className="flex md:hidden justify-between items-center px-4 py-4 border-b border-zinc-200 dark:border-zinc-900">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">Navigation</span>
                    <button
                        onClick={() => setSidebarOpen(false)}
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
                            type="text"
                            placeholder="Search specs, impls..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-purple-400 dark:focus:border-purple-500/80 focus:ring-1 focus:ring-purple-400/30 dark:focus:ring-purple-500/30 transition-all"
                            style={{ minHeight: '40px' }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
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
                                ? 'bg-purple-50 dark:bg-gradient-to-r dark:from-purple-500/10 dark:to-indigo-500/5 text-purple-700 dark:text-purple-200 border-l-2 border-purple-500 shadow-sm'
                                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900/40'
                        }`}
                        style={{ minHeight: '44px' }}
                    >
                        <LuHome className="w-4 h-4 text-purple-500 dark:text-purple-400" />
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
                    <a href="https://menulist.ai" target="_blank" rel="noopener noreferrer" className="hover:text-purple-500 dark:hover:text-purple-400 transition-colors">menulist.ai</a>
                </div>
            </aside>

            {/* Mobile Sidebar overlay */}
            {sidebarOpen && (
                <div 
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 md:hidden backdrop-blur-sm"
                />
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col md:flex-row min-w-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950 dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.08),rgba(255,255,255,0))]">
                <article className="flex-1 px-4 py-6 md:px-12 md:py-10 max-w-4xl min-w-0 overflow-x-auto">
                    {/* Breadcrumbs */}
                    {currentSlug.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-500 font-mono mb-6 select-none bg-zinc-100 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-900/50 px-3 py-2 rounded-lg w-fit">
                            <a href={buildUrl('/')} className="hover:text-purple-500 dark:hover:text-purple-400 transition-colors">docs</a>
                            {currentSlug.map((seg, idx) => {
                                const isLast = idx === currentSlug.length - 1;
                                const segmentPath = '/' + currentSlug.slice(0, idx + 1).join('/');
                                return (
                                    <React.Fragment key={idx}>
                                        <LuChevronRight className="w-3 h-3 text-zinc-400 dark:text-zinc-600" />
                                        {isLast ? (
                                            <span className="text-purple-600 dark:text-purple-400/80 font-medium truncate max-w-[120px] sm:max-w-[200px]">
                                                {seg.replace(/[-_]/g, ' ')}
                                            </span>
                                        ) : (
                                            <a href={buildUrl(segmentPath)} className="hover:text-purple-500 dark:hover:text-purple-400 transition-colors truncate max-w-[100px]">
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
                </article>

                {/* Table of Contents / Outline Panel (Desktop Only) */}
                {headings.length > 0 && (
                    <aside className="hidden lg:block w-64 xl:w-72 shrink-0 border-l border-zinc-200 dark:border-zinc-900 px-6 py-10 sticky top-0 h-screen overflow-y-auto select-none bg-zinc-50/50 dark:bg-zinc-950/20">
                        <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-purple-500 dark:text-purple-400">
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
                                            className="text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all duration-200 block truncate py-1 leading-relaxed relative hover:translate-x-1"
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
            </main>

            {/* Scroll-To-Top Button */}
            {showScrollTop && (
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-20 right-6 p-3 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-xl shadow-purple-600/20 hover:scale-105 active:scale-95 transition-all duration-200 z-50 border border-purple-400/20"
                    style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-label="Scroll to top"
                >
                    <LuArrowUp className="w-5 h-5 font-bold" />
                </button>
            )}
        </div>
    );
}
