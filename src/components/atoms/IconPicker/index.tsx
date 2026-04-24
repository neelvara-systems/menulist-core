import { useAppSelector } from '@hook/useAppSelector';
import { getDarkModeState } from '@reduxSlices/clientThemeConfig';
import { Button, Popover, Tabs, theme } from 'antd';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useState } from 'react';
import CategoryIcon from '../CategoryIcon';
import LucideIconGrid from './LucideIconGrid';
import './styles.scss';

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
    const isDarkMode = useAppSelector(getDarkModeState);
    const [open, setOpen] = useState(false);

    const handleSelect = (selectedValue: string) => {
        onChange?.(selectedValue);
        setOpen(false);
    };

    const tabItems = [
        {
            key: '1',
            label: 'Icons',
            children: <LucideIconGrid onSelect={handleSelect} selectedIcon={value} suggestedIcons={suggestedIcons} width={gridWidth} />,
        },
        {
            key: '2',
            label: 'Emoji',
            children: (
                <EmojiPicker
                    onEmojiClick={(emoji) => handleSelect(`emoji:${emoji.emoji}`)}
                    width="100%"
                    height={300}
                    searchPlaceholder="Search emoji..."
                    theme={isDarkMode ? Theme.DARK : Theme.LIGHT}
                    previewConfig={{ showPreview: false }}
                />
            ),
        },
    ];

    const content = <Tabs defaultActiveKey="1" items={tabItems} style={{ width: popoverWidth }} />;

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
