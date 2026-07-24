'use client';

import CategoryIcon from '@atoms/CategoryIcon';
import { getHelpCenterArticleRouteSegment, helpCenterArticleRouting, helpCenterTabRouting } from '@constant/navigations';
import { getArticleById } from '@database/knowledgeBase/articles';
import ArticleView from '@organisms/ArticleView';
import type { KnowledgeBaseArticleType } from '@type/knowledgeBase';
import { Button, Divider, List, message, theme, Typography } from 'antd';
import { useRef, useState } from 'react';
import { LuArrowRight, LuExternalLink } from 'react-icons/lu';
import { TbLayoutBottombarCollapse, TbLayoutNavbarCollapse } from 'react-icons/tb';
import ActionButtons from './ActionButtons';
import BlinkingCursor from './BlinkingCursor';
import type { State as SearchState } from './state';
import { SearchDisplayResultReferenceType } from './types';

interface SearchResultDisplayProps {
    state: SearchState;
    isTyping: boolean;
    answerContainerRef: React.RefObject<HTMLDivElement>;
    handleSkipTyping: () => void;
    handleRegenerate: () => void;
}

export default function SearchResultDisplay({ state, isTyping, answerContainerRef, handleSkipTyping, handleRegenerate }: SearchResultDisplayProps) {
    const { token } = theme.useToken();
    const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
    const [loadingArticleId, setLoadingArticleId] = useState<string | null>(null);
    const [resolvedArticles, setResolvedArticles] = useState<Record<string, KnowledgeBaseArticleType>>({});
    const previewRequestRef = useRef(0);

    const toggleArticlePreview = async (articleId: string) => {
        const requestId = previewRequestRef.current + 1;
        previewRequestRef.current = requestId;
        if (expandedArticleId === articleId) {
            setExpandedArticleId(null);
            return;
        }
        if (resolvedArticles[articleId]) {
            setExpandedArticleId(articleId);
            return;
        }

        setLoadingArticleId(articleId);
        try {
            const article = await getArticleById(articleId);
            if (previewRequestRef.current !== requestId) return;
            if (!article) {
                message.warning('This help article is no longer available.');
                return;
            }
            setResolvedArticles(current => ({ ...current, [articleId]: article }));
            setExpandedArticleId(articleId);
        } catch {
            if (previewRequestRef.current === requestId) {
                message.error('Unable to load this help article.');
            }
        } finally {
            if (previewRequestRef.current === requestId) setLoadingArticleId(null);
        }
    };

    if (!state.data) return null;

    return (
        <div>
            <Typography.Title level={5}>💡 Here&apos;s what I found</Typography.Title>

            {/* Display result */}
            <div
                ref={answerContainerRef}
                style={{
                    whiteSpace: 'pre-wrap',
                    position: 'relative',
                    color: token.colorText,
                    backgroundColor: token.colorFillQuaternary,
                    padding: '16px',
                    borderRadius: token.borderRadiusLG,
                    minHeight: '100px'
                }}
            >
                {state.displayedAnswer}
                {isTyping && <BlinkingCursor />}
            </div>
            {isTyping && (
                <div style={{ marginTop: '16px', textAlign: 'right' }}>
                    <Button onClick={handleSkipTyping}>Skip</Button>
                </div>
            )}

            {state.data.citations && state.data.citations.length > 0 && (
                <>
                    <Divider style={{ margin: '8px 0' }}>Approved sources</Divider>
                    <List
                        size="small"
                        dataSource={state.data.citations}
                        renderItem={(citation) => (
                            <List.Item>
                                <a href={citation.url} target="_blank" rel="noopener noreferrer">
                                    <LuExternalLink size={13} aria-hidden style={{ marginRight: 6 }} />
                                    {citation.title}
                                </a>
                            </List.Item>
                        )}
                    />
                </>
            )}

            {/* Display references */}
            {state.data.references && state.data.references.length > 0 && (
                <>
                    <Divider style={{ margin: "8px 0" }}>References</Divider>
                    <List
                        itemLayout="horizontal"
                        dataSource={state.data.references}
                        renderItem={(item: SearchDisplayResultReferenceType, index) => {
                            const isExpanded = expandedArticleId === item.article.id;
                            const resolvedArticle = resolvedArticles[item.article.id];
                            const articleHref = helpCenterArticleRouting(getHelpCenterArticleRouteSegment(item.article));
                            return (
                                <div style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: '8px 0' }}>
                                    <List.Item
                                        key={item.article.id}
                                        actions={[
                                            <Button
                                                key={item.article.id}
                                                type="link"
                                                icon={isExpanded ? <TbLayoutNavbarCollapse /> : <TbLayoutBottombarCollapse />}
                                                loading={loadingArticleId === item.article.id}
                                                onClick={() => void toggleArticlePreview(item.article.id)}>
                                                {isExpanded ? 'Hide Preview' : 'Preview'}
                                            </Button>
                                        ]}
                                        style={{ borderBottom: 'none' }}
                                            >
                                                <List.Item.Meta
                                                    avatar={<CategoryIcon icon={item.category.icon} />}
                                            title={<a href={articleHref} target="_blank" rel="noopener noreferrer">{item.article.title || `Reference ${index + 1}`}</a>}
                                            description={`${item.category.title} / ${item.section.title}`}
                                        />
                                    </List.Item>
                                    {isExpanded && resolvedArticle && (
                                        <div style={{ padding: '12px 16px', backgroundColor: token.colorFillTertiary, borderRadius: token.borderRadiusLG, marginTop: 8 }}>
                                            <ArticleView 
                                                article={resolvedArticle}
                                                mode="preview"
                                                showBreadcrumbs={false}
                                                showTags={true}
                                                showCopyLink={false}
                                                enableKeyboardShortcuts={false}
                                            />
                                            <Button icon={<LuArrowRight />} type='text' href={articleHref} target="_blank" rel="noopener noreferrer">
                                                Open Full Article
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )
                        }}
                    />
                </>
            )}

            {/* Display action buttons */}
            <ActionButtons
                answer={state.data.craftedAnswer}
                onRegenerate={handleRegenerate}
                isTyping={isTyping}
                searchHistoryId={state.data?.searchHistoryId}
            />

            {/* Display additional information */}
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                    Answers may still miss details. If you don&apos;t find the correct answer, you can still explore our documentation <a href={helpCenterTabRouting('kb')}>here</a>.
                </Typography.Text>
            </div>
        </div>
    );
}
