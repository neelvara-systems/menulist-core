import { Input, theme } from 'antd';
import { FixedSizeGrid } from 'react-window';
import * as LuIcons from 'react-icons/lu';
import { useMemo, useState } from 'react';

interface LucideIconGridProps {
    onSelect: (iconName: string) => void;
    selectedIcon?: string;
}

const allIcons = Object.keys(LuIcons);

const LucideIconGrid = ({ onSelect, selectedIcon }: LucideIconGridProps) => {
    const { token } = theme.useToken();
    const [search, setSearch] = useState('');

    const filteredIcons = useMemo(() =>
        allIcons.filter(icon => icon.toLowerCase().includes(search.toLowerCase())),
        [search]
    );

    const COLUMN_COUNT = 8;
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
                width={400}
                itemData={filteredIcons}
            >
                {Cell}
            </FixedSizeGrid>
        </div>
    );
};

export default LucideIconGrid;
