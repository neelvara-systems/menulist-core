'use client';

import { Button, Space, theme } from 'antd';
import { FormEvent } from 'react';
import { LuSparkles, LuX } from 'react-icons/lu';
import uiStyles from './AiSearchBarComponentUI.module.scss';

interface SearchBarProps {
    query: string;
    setQuery: (query: string) => void;
    onSearch: ({ query }: { query: string }) => Promise<void> | void;
    handleClear: () => void;
    isSearching: boolean;
    isFocused: boolean;
    setIsFocused: (isFocused: boolean) => void;
    showAnimatedBorder: boolean;
}

export default function SearchBar({ 
    query, 
    setQuery, 
    onSearch,
    handleClear, 
    isSearching, 
    isFocused, 
    setIsFocused,
    showAnimatedBorder,
}: SearchBarProps) {
    const { token } = theme.useToken();

    const wrapperStyle: React.CSSProperties = {
        '--primary-color': token.colorPrimary,
        '--primary-color-light': token.colorPrimaryBg,
        '--primary-color-glow': token.colorPrimaryHover,
        '--input-bg': token.colorBgContainer,
    } as React.CSSProperties;

    return (
        <form
            onSubmit={(e: FormEvent) => {
                e.preventDefault();
                if (query.trim()) {
                    onSearch({ query });
                }
            }}
            style={{ marginBottom: 24 }}
        >
            <div className={`${uiStyles.searchInputWrapper} ${isFocused ? uiStyles.focused : ''} ${showAnimatedBorder ? uiStyles.borderVisible : ''}`} style={{ ...wrapperStyle }}>
                <input
                    style={{ border: `1px solid ${token.colorPrimaryBorderHover}` }}
                    type="text"
                    placeholder="Ask me anything about the platform..."
                    className={uiStyles.searchInput}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
                <div className={uiStyles.inputActions}>
                    <Space>
                        {query && <Button icon={<LuX />} onClick={handleClear} type="text" shape="circle" />}
                        <Button disabled={isSearching || !query.trim()} type="primary" htmlType="submit" loading={isSearching} icon={<LuSparkles />}>
                            Ask AI
                        </Button>
                    </Space>
                </div>
            </div>
        </form>
    );
}
