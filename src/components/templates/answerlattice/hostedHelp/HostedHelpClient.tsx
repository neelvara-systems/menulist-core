'use client';

import type { KnowledgeBaseArticleMeta, KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import { theme } from 'antd';
import Link from 'next/link';
import { type CSSProperties, useMemo, useState } from 'react';
import styles from './HostedHelp.module.scss';

type HostedHelpView = 'home' | 'docs' | 'article' | 'faq' | 'changelog';

type ArticleSearchItem = KnowledgeBaseArticleMeta & {
    categoryTitle?: string;
    sectionTitle?: string;
};

export type HostedHelpArticle = KnowledgeBaseArticleMeta & {
    categoryTitle?: string;
    sectionTitle?: string;
    safeHtml?: string;
};

export type HostedHelpFaq = {
    id: string;
    question: string;
    answer: string;
};

export type HostedHelpChangelogEntry = {
    id: string;
    title: string;
    version?: string | null;
    releasedOn?: string | null;
    description?: any;
};

export type HostedHelpChangelogPage = {
    id?: string;
    entries: HostedHelpChangelogEntry[];
};

export type HostedHelpSiteView = {
    domain: string;
    config: {
        title: string;
        description: string;
        showFaqs: boolean;
        showChangelog: boolean;
    };
};

type HostedHelpClientProps = {
    article?: HostedHelpArticle | null;
    categories: KnowledgeBaseCategoriesType | null;
    changelogPage: HostedHelpChangelogPage | null;
    faqs: HostedHelpFaq[];
    site: HostedHelpSiteView;
    view: HostedHelpView;
};

const pathFor = (path: string) => path;

function normalizeArticleSlug(value?: string | null) {
    const normalized = String(value || '')
        .trim()
        .replace(/[?#].*$/, '')
        .replace(/^\/+|\/+$/g, '');
    return normalized
        .replace(/^(articles|help|docs)\//, '')
        .replace(/^\/+|\/+$/g, '');
}

function getArticles(categories: KnowledgeBaseCategoriesType | null): ArticleSearchItem[] {
    if (!categories?.categories) return [];

    return Object.values(categories.categories).flatMap(category => {
        const rootArticles = (category.articles || []).map(article => ({
            ...article,
            categoryTitle: category.title,
        }));
        const sectionArticles = (category.sections || []).flatMap(section => (
            (section.articles || []).map(article => ({
                ...article,
                categoryTitle: category.title,
                sectionTitle: section.title,
            }))
        ));
        return [...rootArticles, ...sectionArticles];
    });
}

function articleHref(article: Pick<KnowledgeBaseArticleMeta, 'id' | 'url'>) {
    const slug = normalizeArticleSlug(article.url || article.id) || article.id;
    return pathFor(`/articles/${encodeURIComponent(slug)}`);
}

function entryText(entry: HostedHelpChangelogEntry) {
    const extract = (node: any): string => {
        if (!node) return '';
        if (node.type === 'text') return node.text || '';
        if (Array.isArray(node.content)) return node.content.map(extract).join(' ');
        return '';
    };
    return extract(entry.description).replace(/\s+/g, ' ').trim();
}

function formatDate(value: any) {
    if (!value) return '';
    const date = typeof value?.toDate === 'function'
        ? value.toDate()
        : typeof value?.seconds === 'number'
            ? new Date(value.seconds * 1000)
            : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HostedHelpClient({
    article,
    categories,
    changelogPage,
    faqs,
    site,
    view,
}: HostedHelpClientProps) {
    const { token } = theme.useToken();
    const [query, setQuery] = useState('');
    const articles = useMemo(() => getArticles(categories), [categories]);
    const latestChangelog = changelogPage?.entries || [];
    const hostedHelpThemeVars = {
        '--hosted-help-active-bg': token.colorPrimaryBg,
        '--hosted-help-active-text': token.colorPrimary,
        '--hosted-help-border': token.colorBorderSecondary,
        '--hosted-help-border-strong': token.colorBorder,
        '--hosted-help-card-bg': token.colorBgContainer,
        '--hosted-help-hero-bg': token.colorPrimary,
        '--hosted-help-hero-text': token.colorTextLightSolid,
        '--hosted-help-link': token.colorPrimary,
        '--hosted-help-muted': token.colorTextSecondary,
        '--hosted-help-search-shadow': token.boxShadowSecondary,
        '--hosted-help-shell-bg': token.colorBgLayout,
        '--hosted-help-text': token.colorText,
    } as CSSProperties;

    const results = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return [];

        const articleResults = articles
            .filter(item => [
                item.title,
                item.categoryTitle,
                item.sectionTitle,
            ].filter(Boolean).join(' ').toLowerCase().includes(normalized))
            .slice(0, 8)
            .map(item => ({
                href: articleHref(item),
                label: item.title,
                meta: [item.categoryTitle, item.sectionTitle].filter(Boolean).join(' / ') || 'Article',
            }));

        const faqResults = faqs
            .filter(item => `${item.question} ${item.answer}`.toLowerCase().includes(normalized))
            .slice(0, 5)
            .map(item => ({
                href: '/faq',
                label: item.question,
                meta: 'FAQ',
            }));

        const changelogResults = latestChangelog
            .filter(item => `${item.title} ${entryText(item)}`.toLowerCase().includes(normalized))
            .slice(0, 4)
            .map(item => ({
                href: '/changelog',
                label: item.title,
                meta: 'Update',
            }));

        return [...articleResults, ...faqResults, ...changelogResults].slice(0, 10);
    }, [articles, faqs, latestChangelog, query]);

    const nav = [
        { href: '/', label: 'Home', active: view === 'home' },
        { href: '/docs', label: 'Docs', active: view === 'docs' || view === 'article' },
        ...(site.config.showFaqs ? [{ href: '/faq', label: 'FAQ', active: view === 'faq' }] : []),
        ...(site.config.showChangelog ? [{ href: '/changelog', label: "What's New", active: view === 'changelog' }] : []),
    ];

    return (
        <div className={styles.shell} style={hostedHelpThemeVars}>
            <header className={styles.hero}>
                <div className={styles.container}>
                    <p className={styles.eyebrow}>Help Center</p>
                    <h1 className={styles.title}>{site.config.title}</h1>
                    <p className={styles.description}>{site.config.description}</p>
                    <div className={styles.searchWrap}>
                        <input
                            aria-label="Search help content"
                            className={styles.searchInput}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search guides, FAQ, and updates"
                            value={query}
                        />
                    </div>
                    {query.trim() ? (
                        <div className={styles.list} style={{ marginTop: 14, maxWidth: 720 }}>
                            {results.length > 0 ? results.map(result => (
                                <Link className={styles.card} href={result.href} key={`${result.href}-${result.label}`}>
                                    <h3 className={styles.cardTitle}>{result.label}</h3>
                                    <p className={styles.muted}>{result.meta}</p>
                                </Link>
                            )) : (
                                <div className={styles.empty}>No published help content matched that search.</div>
                            )}
                        </div>
                    ) : null}
                </div>
            </header>

            <nav className={styles.nav}>
                <div className={`${styles.container} ${styles.navInner}`}>
                    {nav.map(item => (
                        <Link
                            className={`${styles.navLink} ${item.active ? styles.navLinkActive : ''}`}
                            href={item.href}
                            key={item.href}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            </nav>

            <main className={`${styles.container} ${styles.main}`}>
                {view === 'article' && article ? (
                    <div className={styles.articleLayout}>
                        <article className={styles.article}>
                            <p className={styles.muted}>{[article.categoryTitle, article.sectionTitle].filter(Boolean).join(' / ')}</p>
                            <h1>{article.title}</h1>
                            <div dangerouslySetInnerHTML={{ __html: article.safeHtml || '' }} />
                        </article>
                        <aside className={styles.sidePanel}>
                            <h3 className={styles.cardTitle}>More articles</h3>
                            <div className={styles.list}>
                                {articles.filter(item => item.id !== article.id).slice(0, 6).map(item => (
                                    <Link href={articleHref(item)} key={item.id}>{item.title}</Link>
                                ))}
                            </div>
                        </aside>
                    </div>
                ) : null}

                {(view === 'home' || view === 'docs') ? (
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>Guides</h2>
                            {view === 'home' ? <Link href="/docs">View all</Link> : null}
                        </div>
                        {articles.length > 0 ? (
                            <div className={styles.grid}>
                                {articles.slice(0, view === 'home' ? 9 : 200).map(item => (
                                    <Link className={styles.card} href={articleHref(item)} key={item.id}>
                                        <h3 className={styles.cardTitle}>{item.title}</h3>
                                        <p className={styles.muted}>{[item.categoryTitle, item.sectionTitle].filter(Boolean).join(' / ') || 'Article'}</p>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.empty}>No published articles yet.</div>
                        )}
                    </section>
                ) : null}

                {(view === 'home' || view === 'faq') && site.config.showFaqs ? (
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>FAQ</h2>
                            {view === 'home' ? <Link href="/faq">View all</Link> : null}
                        </div>
                        {faqs.length > 0 ? (
                            <div className={styles.list}>
                                {faqs.slice(0, view === 'home' ? 6 : 80).map(item => (
                                    <div className={styles.card} key={item.id}>
                                        <h3 className={styles.cardTitle}>{item.question}</h3>
                                        <p className={styles.muted}>{item.answer}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.empty}>No published FAQ yet.</div>
                        )}
                    </section>
                ) : null}

                {(view === 'home' || view === 'changelog') && site.config.showChangelog ? (
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>What&apos;s New</h2>
                            {view === 'home' ? <Link href="/changelog">View all</Link> : null}
                        </div>
                        {latestChangelog.length > 0 ? (
                            <div className={styles.list}>
                                {latestChangelog.slice(0, view === 'home' ? 4 : 40).map(item => (
                                    <div className={styles.card} key={item.id}>
                                        <h3 className={styles.cardTitle}>{item.title}</h3>
                                        <p className={styles.muted}>{[item.version ? `Version ${item.version}` : '', formatDate(item.releasedOn)].filter(Boolean).join(' · ')}</p>
                                        <p className={styles.muted}>{entryText(item).slice(0, 220)}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.empty}>No published updates yet.</div>
                        )}
                    </section>
                ) : null}
            </main>

            <footer className={styles.footer}>
                <div className={styles.container}>
                    Powered by Answerlattice
                </div>
            </footer>
        </div>
    );
}
