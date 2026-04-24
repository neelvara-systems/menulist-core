import { Input, theme } from 'antd';
import { FixedSizeGrid } from 'react-window';
import * as LuIcons from 'react-icons/lu';
import { useMemo, useState } from 'react';

interface LucideIconGridProps {
    onSelect: (iconName: string) => void;
    selectedIcon?: string;
    suggestedIcons?: string[];
    width?: number;
}

const allIcons = Object.keys(LuIcons);

const LucideIconGrid = ({
    onSelect,
    selectedIcon,
    suggestedIcons = [],
    width = 400,
}: LucideIconGridProps) => {
    const { token } = theme.useToken();
    const [search, setSearch] = useState('');
    const filteredSuggestedIcons = useMemo(() => (
        suggestedIcons.filter((iconName) => allIcons.includes(iconName))
    ), [suggestedIcons]);

    const filteredIcons = useMemo(() =>
        allIcons.filter(icon => icon.toLowerCase().includes(search.toLowerCase())),
        [search]
    );

    const COLUMN_COUNT = Math.max(4, Math.floor(width / 50));
    const ROW_COUNT = Math.ceil(filteredIcons.length / COLUMN_COUNT);

    const Cell = ({ columnIndex, rowIndex, style }: any) => {
        const index = rowIndex * COLUMN_COUNT + columnIndex;
        if (index >= filteredIcons.length) return null;

        const iconName = filteredIcons[index] as keyof typeof LuIcons;
        const Icon = LuIcons[iconName];
        const isSelected = selectedIcon === `lu:${iconName}`;

        return (
            <div style={style} className="icon-picker-cell-container">
                <div
                    className={`icon-picker-cell ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelect(`lu:${iconName}`)}
                    style={{
                        borderColor: isSelected ? token.colorPrimary : token.colorBorderSecondary,
                        background: isSelected ? token.colorPrimaryBg : 'transparent',
                    }}
                >
                    <Icon size={24} />
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredSuggestedIcons.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ color: token.colorTextSecondary, fontSize: 12, fontWeight: 500 }}>
                        Suggested
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {filteredSuggestedIcons.map((iconName) => {
                            const Icon = LuIcons[iconName as keyof typeof LuIcons];
                            const iconValue = `lu:${iconName}`;
                            const isSelected = selectedIcon === iconValue;

                            if (!Icon) return null;

                            return (
                                <button
                                    key={iconName}
                                    className={`icon-picker-cell ${isSelected ? 'selected' : ''}`}
                                    onClick={() => onSelect(iconValue)}
                                    style={{
                                        alignItems: 'center',
                                        background: isSelected ? token.colorPrimaryBg : token.colorBgContainer,
                                        border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                                        borderRadius: 10,
                                        color: token.colorText,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        height: 42,
                                        justifyContent: 'center',
                                        padding: 0,
                                        width: 42,
                                    }}
                                    type="button"
                                >
                                    <Icon size={20} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}
            <Input.Search
                placeholder="Search for an icon..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
            />
            <FixedSizeGrid
                columnCount={COLUMN_COUNT}
                columnWidth={50}
                height={300}
                rowCount={ROW_COUNT}
                rowHeight={50}
                width={width}
                itemData={filteredIcons}
            >
                {Cell}
            </FixedSizeGrid>
        </div>
    );
};

export default LucideIconGrid;
