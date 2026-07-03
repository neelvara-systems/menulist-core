'use client'

/**
 * Answerlattice — Multi-Language KB Articles Management
 * 
 * Manage translations for KB articles. Each article can have translations
 * stored as a map: translations.{locale} = { title, content, translatedBy, ... }
 * 
 * Phase 4 — Multi-Language (4.2)
 * Feature-flagged: ENABLE_ANSWERLATTICE_MULTI_LANGUAGE
 * 
 * @see __docs__/answerlattice/answerlattice-build-priority-roadmap.md Phase 4
 */

import { FEATURE_FLAGS } from '@config/features';
import { getArticlesByIds } from '@database/knowledgeBase/articles';
import { useKBCategoriesCache } from '@hook/useKBCategoriesCache';
import {
    AnswerlatticeArticleTranslation,
    AnswerlatticeSupportedLocale,
    ANSWERLATTICE_SUPPORTED_LOCALES,
} from '@type/answerlattice';
import type { KnowledgeBaseArticleType, KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import {
    Alert,
    Badge,
    Button,
    Card,
    Col,
    Empty,
    Grid,
    List,
    Modal,
    Row,
    Space,
    Statistic,
    Tag,
    Typography,
    theme,
    message,
    Skeleton,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
    LuEye,
    LuFileCheck,
    LuFilePlus,
    LuGlobe,
    LuLanguages
} from 'react-icons/lu';

const { Text, Title, Paragraph } = Typography;
const ANSWERLATTICE_ARTICLE_TRANSLATION_FAILED = 'Failed to translate article';

interface ArticleSummary {
    id: string;
    title: string;
    translations?: Record<string, AnswerlatticeArticleTranslation>;
}

interface Props {
    tId: number;
    sId: number;
    articles?: ArticleSummary[];
    enabledLocales?: AnswerlatticeSupportedLocale[];
    onTranslate?: (articleId: string, locale: string) => Promise<void>;
}

const LOCALE_LABELS: Record<string, string> = {
    'en-US': 'English (US)',
    'en-GB': 'English (UK)',
    'hi-IN': 'Hindi',
    'ar-SA': 'Arabic',
    'es-ES': 'Spanish',
    'fr-FR': 'French',
    'de-DE': 'German',
    'pt-BR': 'Portuguese (Brazil)',
    'ja-JP': 'Japanese',
    'zh-CN': 'Chinese (Simplified)',
    'ko-KR': 'Korean',
    'it-IT': 'Italian',
    'nl-NL': 'Dutch',
    'ru-RU': 'Russian',
    'tr-TR': 'Turkish',
};

const DEFAULT_ENABLED_LOCALES = [...ANSWERLATTICE_SUPPORTED_LOCALES] as AnswerlatticeSupportedLocale[];
const MAX_LANGUAGE_ARTICLE_LOAD = 500;

function getLocaleLabel(locale: string): string {
    return LOCALE_LABELS[locale] ?? locale;
}

function formatTimestamp(ts: any): string {
    if (!ts) return 'Unknown';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}

function extractArticleIds(categoriesData: KnowledgeBaseCategoriesType | null): string[] {
    const categories = categoriesData?.categories || {};
    const ids: string[] = [];

    Object.values(categories).forEach((category: any) => {
        (category.articles || []).forEach((article: any) => {
            if (article?.id) ids.push(String(article.id));
        });
        (category.sections || []).forEach((section: any) => {
            (section.articles || []).forEach((article: any) => {
                if (article?.id) ids.push(String(article.id));
            });
        });
    });

    return Array.from(new Set(ids)).slice(0, MAX_LANGUAGE_ARTICLE_LOAD);
}

function toArticleSummary(article: KnowledgeBaseArticleType): ArticleSummary {
    return {
        id: article.id,
        title: article.title || 'Untitled article',
        translations: article.translations || {},
    };
}

export default function MultiLanguageArticles({
    tId,
    sId,
    articles: providedArticles = [],
    enabledLocales = DEFAULT_ENABLED_LOCALES,
    onTranslate,
}: Props) {
    const { token } = theme.useToken();
    const { getCategoriesCached } = useKBCategoriesCache();
    const [loadedArticles, setLoadedArticles] = useState<ArticleSummary[]>([]);
    const [articlesLoading, setArticlesLoading] = useState(false);
    const [articlesError, setArticlesError] = useState<string | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<ArticleSummary | null>(null);
    const [translatingKey, setTranslatingKey] = useState<string | null>(null);
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;

    const effectiveEnabledLocales = useMemo(() => {
        const requested = enabledLocales.length ? enabledLocales : DEFAULT_ENABLED_LOCALES;
        const supported = new Set<string>(ANSWERLATTICE_SUPPORTED_LOCALES);
        const normalized = requested.filter(locale => supported.has(locale));
        return Array.from(new Set(normalized.length ? normalized : DEFAULT_ENABLED_LOCALES)) as AnswerlatticeSupportedLocale[];
    }, [enabledLocales]);

    const articles = providedArticles.length ? providedArticles : loadedArticles;

    useEffect(() => {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_MULTI_LANGUAGE || providedArticles.length > 0) return;
        let mounted = true;

        const loadArticles = async () => {
            if (!tId || !sId) {
                setLoadedArticles([]);
                return;
            }

            setArticlesLoading(true);
            setArticlesError(null);
            try {
                const categories = await getCategoriesCached();
                const articleIds = extractArticleIds(categories);
                if (!articleIds.length) {
                    if (mounted) setLoadedArticles([]);
                    return;
                }

                const fullArticles = await getArticlesByIds(articleIds);
                const articleOrder = new Map(articleIds.map((id, index) => [id, index]));
                const summaries = (fullArticles || [])
                    .map(toArticleSummary)
                    .sort((a, b) => (articleOrder.get(a.id) ?? 0) - (articleOrder.get(b.id) ?? 0));
                if (mounted) setLoadedArticles(summaries);
            } catch {
                if (mounted) {
                    setArticlesError('Could not load KB articles for translation coverage.');
                    setLoadedArticles([]);
                }
            } finally {
                if (mounted) setArticlesLoading(false);
            }
        };

        void loadArticles();
        return () => { mounted = false; };
    }, [getCategoriesCached, providedArticles.length, sId, tId]);

    useEffect(() => {
        if (!selectedArticle) return;
        const refreshed = articles.find(article => article.id === selectedArticle.id);
        if (refreshed && refreshed !== selectedArticle) {
            setSelectedArticle(refreshed);
        }
    }, [articles, selectedArticle]);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_MULTI_LANGUAGE) {
        return <Empty description="Multi-language articles is not enabled" />;
    }

    // Compute coverage stats
    const totalArticles = articles.length;
    const targetLocales = effectiveEnabledLocales.filter(l => l !== 'en-US');
    const totalTranslationsNeeded = totalArticles * targetLocales.length;
    let totalTranslationsExisting = 0;
    for (const article of articles) {
        if (article.translations) {
            for (const locale of targetLocales) {
                if (article.translations[locale]) {
                    totalTranslationsExisting++;
                }
            }
        }
    }
    const coveragePercent = totalTranslationsNeeded > 0
        ? Math.round((totalTranslationsExisting / totalTranslationsNeeded) * 100)
        : 0;

    const handleTranslate = async (articleId: string, locale: string) => {
        if (!onTranslate) return;
        const nextTranslatingKey = `${articleId}:${locale}`;
        setTranslatingKey(nextTranslatingKey);
        try {
            await onTranslate(articleId, locale);
            if (!providedArticles.length) {
                const [freshArticle] = await getArticlesByIds([articleId]);
                if (freshArticle) {
                    const freshSummary = toArticleSummary(freshArticle);
                    setLoadedArticles(prev => prev.map(article => (
                        article.id === articleId ? freshSummary : article
                    )));
                    setSelectedArticle(prev => prev?.id === articleId ? freshSummary : prev);
                }
            }
            message.success(`Translation for ${getLocaleLabel(locale)} saved`);
        } catch {
            message.error(ANSWERLATTICE_ARTICLE_TRANSLATION_FAILED);
        } finally {
            setTranslatingKey(null);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Coverage Stats */}
            <Row gutter={16}>
                <Col xs={12} md={6}>
                    <Card size="small">
                        <Statistic
                            title="Articles"
                            value={totalArticles}
                            prefix={<LuFileCheck size={16} />}
                        />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card size="small">
                        <Statistic
                            title="Target Locales"
                            value={targetLocales.length}
                            prefix={<LuGlobe size={16} />}
                        />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card size="small">
                        <Statistic
                            title="Translations"
                            value={totalTranslationsExisting}
                            suffix={`/ ${totalTranslationsNeeded}`}
                            prefix={<LuLanguages size={16} />}
                        />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card size="small">
                        <Statistic
                            title="Coverage"
                            value={coveragePercent}
                            suffix="%"
                            valueStyle={{
                                color: coveragePercent >= 80 ? token.colorSuccess :
                                    coveragePercent >= 50 ? token.colorWarning : token.colorError
                            }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Enabled Locales */}
            <Card size="small" title="Enabled Locales">
                <Space wrap>
                    <Tag color="blue">en-US (Source)</Tag>
                    {targetLocales.map(locale => (
                        <Tag key={locale} color="default">
                            {getLocaleLabel(locale)}
                        </Tag>
                    ))}
                    {targetLocales.length === 0 && (
                        <Text type="secondary">No target locales configured</Text>
                    )}
                </Space>
            </Card>

            {articlesError ? (
                <Alert type="warning" showIcon message={articlesError} />
            ) : null}

            {/* Article Translation Status */}
            {articlesLoading ? (
                <Skeleton active paragraph={{ rows: 5 }} />
            ) : articles.length === 0 ? (
                <Empty description="No KB articles found" />
            ) : (
                <List
                    size="small"
                    header={
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text strong>Article Translation Status</Text>
                            <Text type="secondary">{totalArticles} articles</Text>
                        </div>
                    }
                    bordered
                    dataSource={articles}
                    renderItem={(article) => {
                        const translations = article.translations ?? {};
                        const translatedCount = targetLocales.filter(l => translations[l]).length;
                        const isFullyTranslated = translatedCount === targetLocales.length;

                        return (
                            <List.Item
                                actions={[
                                    <Button
                                        key="view"
                                        size="small"
                                        type="link"
                                        icon={<LuEye size={14} />}
                                        onClick={() => setSelectedArticle(article)}
                                    >
                                        Details
                                    </Button>
                                ]}
                            >
                                <List.Item.Meta
                                    title={
                                        <Space>
                                            <Text>{article.title}</Text>
                                            {isFullyTranslated ? (
                                                <Tag color="success">All Translated</Tag>
                                            ) : translatedCount > 0 ? (
                                                <Tag color="warning">
                                                    {translatedCount}/{targetLocales.length} Translated
                                                </Tag>
                                            ) : (
                                                <Tag color="default">English Only</Tag>
                                            )}
                                        </Space>
                                    }
                                    description={
                                        <Space size={4}>
                                            {targetLocales.map(locale => (
                                                <Badge
                                                    key={locale}
                                                    status={translations[locale] ? 'success' : 'default'}
                                                    text={
                                                        <Text
                                                            style={{ fontSize: 11 }}
                                                            type={translations[locale] ? undefined : 'secondary'}
                                                        >
                                                            {locale}
                                                        </Text>
                                                    }
                                                />
                                            ))}
                                        </Space>
                                    }
                                />
                            </List.Item>
                        );
                    }}
                />
            )}

            {/* Article Detail Modal */}
            <Modal
                title={selectedArticle?.title ?? 'Article Details'}
                open={!!selectedArticle}
                onCancel={() => setSelectedArticle(null)}
                footer={null}
                width={isMobile ? 'calc(100vw - 24px)' : 600}
            >
                {selectedArticle && (
                    <List
                        size="small"
                        dataSource={targetLocales}
                        renderItem={(locale) => {
                            const translation = selectedArticle.translations?.[locale];
                            return (
                                <List.Item
                                    actions={[
                                        translation ? (
                                            <Tag key="status" color="success">
                                                {translation.translatedBy === 'ai' ? 'AI' : 'Human'}
                                            </Tag>
                                        ) : (
                                            <Button
                                                key="translate"
                                                size="small"
                                                type="primary"
                                                icon={<LuFilePlus size={12} />}
                                                loading={translatingKey === `${selectedArticle.id}:${locale}`}
                                                disabled={Boolean(translatingKey)}
                                                onClick={() => handleTranslate(selectedArticle.id, locale)}
                                            >
                                                Translate
                                            </Button>
                                        )
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={getLocaleLabel(locale)}
                                        description={
                                            translation ? (
                                                <Space direction="vertical" size={0}>
                                                    <Text style={{ fontSize: 12 }}>
                                                        Title: {translation.title}
                                                    </Text>
                                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                                        Translated: {formatTimestamp(translation.translatedAt)}
                                                        {translation.reviewedBy && ` · Reviewed by ${translation.reviewedBy}`}
                                                    </Text>
                                                </Space>
                                            ) : (
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    Not translated
                                                </Text>
                                            )
                                        }
                                    />
                                </List.Item>
                            );
                        }}
                    />
                )}
            </Modal>
        </div>
    );
}
