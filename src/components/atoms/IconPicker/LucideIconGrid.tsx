import { theme } from 'antd';
import { useMemo } from 'react';
import * as LuIcons from 'react-icons/lu';

interface LucideIconGridProps {
    onSelect: (iconName: string) => void;
    searchQuery: string;
    selectedIcon?: string;
    suggestedIcons?: string[];
    width?: number;
}

const allIcons = Object.keys(LuIcons);

const LucideIconGrid = ({
    onSelect,
    searchQuery,
    selectedIcon,
    suggestedIcons = [],
    width = 400,
}: LucideIconGridProps) => {
    const { token } = theme.useToken();
    const filteredSuggestedIcons = useMemo(() => (
        suggestedIcons.filter((iconName) => allIcons.includes(iconName))
    ), [suggestedIcons]);

    const filteredIcons = useMemo(() =>
        allIcons.filter(icon => icon.toLowerCase().includes(searchQuery.toLowerCase())),
        [searchQuery]
    );

    return (
        <div
            className="icon-grid-picker"
            style={{
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 18,
                ['--icon-picker-panel-bg' as any]: token.colorBgContainer,
                ['--icon-picker-input-bg' as any]: token.colorFillSecondary,
                ['--icon-picker-input-border' as any]: token.colorFillSecondary,
                padding: 10,
            }}
        >
            <div className="icon-grid-picker__scroll">
                {filteredSuggestedIcons.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="icon-grid-picker__label">Suggested</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {filteredSuggestedIcons.map((iconName) => {
                                const Icon = LuIcons[iconName as keyof typeof LuIcons];
                                const iconValue = `lu:${iconName}`;
                                const isSelected = selectedIcon === iconValue;

                                if (!Icon) return null;

                                return (
                                    <button
                                        key={iconName}
                                        className={`icon-picker-cell-container icon-picker-cell-container--suggested ${isSelected ? 'selected' : ''}`}
                                        onClick={() => onSelect(iconValue)}
                                        type="button"
                                    >
                                        <span
                                            className={`icon-picker-cell icon-picker-cell--button ${isSelected ? 'selected' : ''}`}
                                            style={{
                                                background: isSelected ? token.colorPrimaryBg : token.colorBgElevated,
                                                border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                                                color: token.colorText,
                                            }}
                                        >
                                            <Icon size={24} />
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : null}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="icon-grid-picker__label">
                        {searchQuery.trim() ? 'Search Results' : 'All icons'}
                    </div>
                    {filteredIcons.length > 0 ? (
                        <div className="icon-grid-picker__results-grid">
                            {filteredIcons.map((iconName) => {
                                const Icon = LuIcons[iconName as keyof typeof LuIcons];
                                const iconValue = `lu:${iconName}`;
                                const isSelected = selectedIcon === iconValue;

                                if (!Icon) return null;

                                return (
                                    <button
                                        key={iconName}
                                        className="icon-picker-cell-container icon-picker-cell-container--result"
                                        onClick={() => onSelect(iconValue)}
                                        type="button"
                                    >
                                        <span
                                            className={`icon-picker-cell icon-picker-cell--button ${isSelected ? 'selected' : ''}`}
                                            style={{
                                                background: isSelected ? token.colorPrimaryBg : token.colorBgElevated,
                                                border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                                                color: token.colorText,
                                            }}
                                        >
                                            <Icon size={24} />
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div
                            style={{
                                border: `1px dashed ${token.colorBorderSecondary}`,
                                borderRadius: 12,
                                color: token.colorTextSecondary,
                                padding: '18px 14px',
                                textAlign: 'center',
                            }}
                        >
                            No icons found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LucideIconGrid;
