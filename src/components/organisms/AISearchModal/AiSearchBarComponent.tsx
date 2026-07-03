'use client';

import { fetchAnswerlatticePublicCategories } from '@lib/answerlattice/publicContentClient';
import {
    HELP_CENTER_SEARCH_REQUEST_POLICY,
    getHelpCenterSearchClientFailureMessage,
    readHelpCenterSearchResponse,
} from '@lib/search/helpCenterSearchResponse';
import { KnowledgeBaseArticleType, KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import { Alert, Button, Flex, theme, Typography } from 'antd';
import { useEffect, useReducer, useRef, useState } from 'react';
import { LuSparkles } from 'react-icons/lu';
import LocalSearchResults from './LocalSearchResults';
import SearchBar from './SearchBar';
import SearchResultDisplay from './SearchResultDisplay';
import { initialState, reducer } from './state';
import { SearchDisplayResultDataType, SearchDisplayResultReferenceType, SerachAPIResponseType } from './types';
import TypingIndicator from './TypingIndicator';

const AI_SEARCH_FAILED_MESSAGE = 'Search failed. Please try again.';

function AiSearchBarComponent({ initialCategories }: { initialCategories: KnowledgeBaseCategoriesType | null }) {
    const { token } = theme.useToken();
    const [state, dispatch] = useReducer(reducer, initialState);
    const answerContainerRef = useRef<HTMLDivElement>(null);
    const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [showAnimatedBorder, setShowAnimatedBorder] = useState(true);

    const [categoriesData, setCategoriesData] = useState<KnowledgeBaseCategoriesType | null>(initialCategories);

    const fetchCategories = async () => {
        // appDispatch(startLoader("Fetching knowledge base categories"));
        try {
            const categoriesResult = await fetchAnswerlatticePublicCategories();
            if (categoriesResult) {
                setCategoriesData(categoriesResult);
            }
        } catch (error) {
            // message.error("Failed to fetch knowledge base categories.");
        } finally {
            // appDispatch(stopLoader("Fetching knowledge base categories"));
        }
    };

    useEffect(() => {
        if (!initialCategories) {
            fetchCategories();
        }
    }, []);

    const handleClear = () => {
        setQuery('');
        dispatch({ type: 'CLEAR' });
    };

    useEffect(() => {
        const isIdle = state.status === 'idle' && !isFocused && !query.trim();
        const isSearching = state.status === 'loading';
        setShowAnimatedBorder(isIdle || isSearching);
    }, [state.status, isFocused, query]);

    const onSearch = async ({ query }: { query: string }) => {
        if (!query) return;
        dispatch({ type: 'SEARCH_START', payload: { query } });

        try {
            const response = await fetch('/api/helpCenter/search-kb', {
                ...HELP_CENTER_SEARCH_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            const data = await readHelpCenterSearchResponse(response, 'ai_search_modal') as SerachAPIResponseType;

            const responseToDisplay: SearchDisplayResultDataType = {
                craftedAnswer: data.craftedAnswer,
                searchHistoryId: data.id,
                references: data.references.map((article: KnowledgeBaseArticleType): Partial<SearchDisplayResultReferenceType> => {
                    const category = categoriesData ? Object.values(categoriesData.categories).find(cat => cat.id === article.categoryId) : undefined;
                    const section = category ? category.sections.find(sec => sec.id === article.sectionId) : undefined;

                    return {
                        articleId: article.id,
                        categoryId: article.categoryId,
                        sectionId: article.sectionId,
                        category: category,
                        section: section,
                        article: article,
                    };
                }).filter((ref): ref is SearchDisplayResultReferenceType => !!(ref.category && ref.article))
            };

            dispatch({ type: 'SEARCH_SUCCESS', payload: responseToDisplay });
        } catch (error) {
            dispatch({ type: 'SEARCH_ERROR', payload: getHelpCenterSearchClientFailureMessage(error, AI_SEARCH_FAILED_MESSAGE) });
        }
    };

    useEffect(() => {
        if (state.status === 'typing' && state.data?.craftedAnswer) {
            const answer = state.data.craftedAnswer;
            let index = 0;

            typingIntervalRef.current = setInterval(() => {
                if (index < answer.length) {
                    dispatch({ type: 'TYPING_UPDATE', payload: answer.charAt(index) });
                    index++;
                } else {
                    if (typingIntervalRef.current) {
                        clearInterval(typingIntervalRef.current);
                    }
                    dispatch({ type: 'TYPING_COMPLETE' });
                }
            }, 15);

            return () => {
                if (typingIntervalRef.current) {
                    clearInterval(typingIntervalRef.current);
                }
            };
        }
    }, [state.status, state.data]);

    useEffect(() => {
        if (answerContainerRef.current) {
            answerContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [state.displayedAnswer]);

    const handleSkipTyping = () => {
        if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
        }
        dispatch({ type: 'SKIP_TYPING' });
    };

    const handleRegenerate = () => {
        if (state.lastQuery) {
            onSearch({ query: state.lastQuery });
        }
    };

    const isSearching = state.status === 'loading';
    const isTyping = state.status === 'typing';
    const showResult = ['typing', 'success'].includes(state.status);

    return (
        <Flex vertical>
            <SearchBar
                query={query}
                setQuery={setQuery}
                onSearch={onSearch}
                handleClear={handleClear}
                isSearching={isSearching}
                isFocused={isFocused}
                setIsFocused={setIsFocused}
                showAnimatedBorder={showAnimatedBorder}
            />

            {state.status === 'error' && state.error && (
                <Alert
                    message="Search Failed"
                    description={state.error}
                    type="error"
                    showIcon
                    closable
                    onClose={() => dispatch({ type: 'CLEAR' })}
                    style={{ marginBottom: 24 }}
                    action={
                        <Button size="small" danger onClick={handleRegenerate}>
                            Try Again
                        </Button>
                    }
                />
            )}

            {showResult && state.data ? (
                <SearchResultDisplay
                    state={state}
                    isTyping={isTyping}
                    answerContainerRef={answerContainerRef}
                    handleSkipTyping={handleSkipTyping}
                    handleRegenerate={handleRegenerate}
                />
            ) : isSearching ? (
                <TypingIndicator />
            ) : query ? (
                <LocalSearchResults query={query} categoriesData={categoriesData} onClose={handleClear} />
            ) : (
                <Flex vertical align="center" justify="center" style={{ gap: 16, minHeight: 150 }}>
                    <LuSparkles size={48} color={token.colorTextTertiary} />
                    <Typography.Text type="secondary">Ask a question to get an answer.</Typography.Text>
                </Flex>
            )}
        </Flex>
    );
}
export default AiSearchBarComponent;
