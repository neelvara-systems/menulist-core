'use client'

/**
 * Canonica — Multi-Language KB Articles Management
 * 
 * Manage translations for KB articles. Each article can have translations
 * stored as a map: translations.{locale} = { title, content, translatedBy, ... }
 * 
 * Phase 4 — Multi-Language (4.2)
 * Feature-flagged: ENABLE_CANONICA_MULTI_LANGUAGE
 * 
 * @see __docs__/canonica/canonica-build-priority-roadmap.md Phase 4
 */

import { FEATURE_FLAGS } from '@config/features';
import {
    CanonicaArticleTranslation,
    CanonicaSupportedLocale
} from '@type/canonica';
import {
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
    message
} from 'antd';
import { useState } from 'react';
import {
    LuEye,
    LuFileCheck,
    LuFilePlus,
    LuGlobe,
    LuLanguages
} from 'react-icons/lu';

const { Text, Title, Paragraph } = Typography;

interface ArticleSummary {
    id: string;
    title: string;
    translations?: Record<string, CanonicaArticleTranslation>;
}

interface Props {
    tId: number;
    sId: number;
    articles?: ArticleSummary[];
    enabledLocales?: CanonicaSupportedLocale[];
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

export default function MultiLanguageArticles({
    tId,
    sId,
    articles = [],
    enabledLocales = ['en-US'],
    onTranslate,
}: Props) {
    const [selectedArticle, setSelectedArticle] = useState<ArticleSummary | null>(null);
    const [translating, setTranslating] = useState(false);
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;

    if (!FEATURE_FLAGS.ENABLE_CANONICA_MULTI_LANGUAGE) {
        return <Empty description="Multi-language articles is not enabled" />;
    }

    // Compute coverage stats
    const totalArticles = articles.length;
    const targetLocales = enabledLocales.filter(l => l !== 'en-US');
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
        setTranslating(true);
        try {
            await onTranslate(articleId, locale);
            message.success(`Translation for ${getLocaleLabel(locale)} initiated`);
        } catch (err) {
            message.error('Failed to initiate translation');
        } finally {
            setTranslating(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Coverage Stats */}
            <Row gutter={16}>
                <Col span={6}>
                    <Card size="small">
                        <Statistic
                            title="Articles"
                            value={totalArticles}
                            prefix={<LuFileCheck size={16} />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small">
                        <Statistic
                            title="Target Locales"
                            value={targetLocales.length}
                            prefix={<LuGlobe size={16} />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small">
                        <Statistic
                            title="Translations"
                            value={totalTranslationsExisting}
                            suffix={`/ ${totalTranslationsNeeded}`}
                            prefix={<LuLanguages size={16} />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small">
                        <Statistic
                            title="Coverage"
                            value={coveragePercent}
                            suffix="%"
                            valueStyle={{
                                color: coveragePercent >= 80 ? '#52c41a' :
                                    coveragePercent >= 50 ? '#faad14' : '#ff4d4f'
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

            {/* Article Translation Status */}
            {articles.length === 0 ? (
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
                                                loading={translating}
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
