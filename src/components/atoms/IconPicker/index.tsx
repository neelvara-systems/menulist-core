import { Button, Flex, Grid, Input, Popover, theme } from 'antd';
import { useState } from 'react';
import { LuSearch } from 'react-icons/lu';
import CategoryIcon from '../CategoryIcon';
import EmojiGrid from './EmojiGrid';
import LucideIconGrid from './LucideIconGrid';
import './iconPicker.scss';

interface IconPickerProps {
    value?: string;
    onChange?: (value: string) => void;
    suggestedIcons?: string[];
    buttonSize?: 'small' | 'middle' | 'large';
    popoverWidth?: number | string;
    gridWidth?: number;
}

const IconPicker = ({
    value,
    onChange,
    suggestedIcons = [],
    buttonSize = 'large',
    popoverWidth = 400,
    gridWidth = 400,
}: IconPickerProps) => {
    const { token } = theme.useToken();
    const screens = Grid.useBreakpoint();
    const showEmojiPreview = Boolean(screens.md);
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMode, setActiveMode] = useState<'icons' | 'emoji'>('icons');

    const handleSelect = (selectedValue: string) => {
        onChange?.(selectedValue);
        setOpen(false);
    };

    const content = (
        <Flex gap={12} style={{ width: popoverWidth }} vertical>
            <Flex align="center" gap={12} justify="space-between" wrap={false}>
                <Flex
                    align="center"
                    className="icon-picker-header-tabs"
                    gap={4}
                    style={{
                        background: token.colorFillTertiary,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: 999,
                        flexShrink: 0,
                        padding: 3,
                    }}
                >
                    <Button
                        onClick={() => setActiveMode('icons')}
                        size="small"
                        style={{
                            background: activeMode === 'icons' ? token.colorBgContainer : 'transparent',
                            borderColor: activeMode === 'icons' ? token.colorBorderSecondary : 'transparent',
                            borderRadius: 999,
                            boxShadow: activeMode === 'icons' ? token.boxShadowTertiary : 'none',
                            color: activeMode === 'icons' ? token.colorPrimary : token.colorText,
                            fontWeight: 600,
                            height: 32,
                            minWidth: screens.sm ? 68 : 58,
                            paddingInline: 9,
                        }}
                        type="text"
                    >
                        Icons
                    </Button>
                    <Button
                        onClick={() => setActiveMode('emoji')}
                        size="small"
                        style={{
                            background: activeMode === 'emoji' ? token.colorBgContainer : 'transparent',
                            borderColor: activeMode === 'emoji' ? token.colorBorderSecondary : 'transparent',
                            borderRadius: 999,
                            boxShadow: activeMode === 'emoji' ? token.boxShadowTertiary : 'none',
                            color: activeMode === 'emoji' ? token.colorPrimary : token.colorText,
                            fontWeight: 600,
                            height: 32,
                            minWidth: screens.sm ? 68 : 58,
                            paddingInline: 9,
                        }}
                        type="text"
                    >
                        Emoji
                    </Button>
                </Flex>
                <Input
                    allowClear
                    className="icon-picker-header-search"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={activeMode === 'icons' ? 'Search icon for category...' : 'Search emoji for category...'}
                    prefix={<LuSearch size={16} />}
                    size="middle"
                    style={{
                        background: token.colorFillSecondary,
                        borderColor: token.colorFillSecondary,
                        flex: 1,
                        minWidth: 0,
                    }}
                    styles={{
                        input: {
                            background: 'transparent',
                        },
                    }}
                    value={searchQuery}
                    variant="filled"
                />
            </Flex>

            <div>
                {activeMode === 'icons' ? (
                    <LucideIconGrid
                        onSelect={handleSelect}
                        searchQuery={searchQuery}
                        selectedIcon={value}
                        suggestedIcons={suggestedIcons}
                        width={gridWidth}
                    />
                ) : (
                    <EmojiGrid
                        onSelect={handleSelect}
                        searchQuery={searchQuery}
                        selectedIcon={value}
                        showPreview={showEmojiPreview}
                    />
                )}
            </div>
        </Flex>
    );

    return (
        <Popover
            content={content}
            trigger="click"
            open={open}
            onOpenChange={setOpen}
            placement="bottomLeft"
        >
            <Button size={buttonSize} icon={<CategoryIcon icon={value || ''} defaultIcon="LuImagePlus" />} />
        </Popover>
    );
};

export default IconPicker;
