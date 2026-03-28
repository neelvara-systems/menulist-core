import { Button, Popover, Tabs, theme } from 'antd';
import EmojiPicker from 'emoji-picker-react';
import { useState } from 'react';
import CategoryIcon from '../CategoryIcon';
import LucideIconGrid from './LucideIconGrid';
import './styles.scss';

interface IconPickerProps {
    value?: string;
    onChange?: (value: string) => void;
}

const IconPicker = ({ value, onChange }: IconPickerProps) => {
    const { token } = theme.useToken();
    const [open, setOpen] = useState(false);

    const handleSelect = (selectedValue: string) => {
        onChange?.(selectedValue);
        setOpen(false);
    };

    const tabItems = [
        {
            key: '1',
            label: 'Icons',
            children: <LucideIconGrid onSelect={handleSelect} selectedIcon={value} />,
        },
        {
            key: '2',
            label: 'Emoji',
            children: (
                <EmojiPicker
                    onEmojiClick={(emoji) => handleSelect(`emoji:${emoji.emoji}`)}
                    width="100%"
                    height={300}
                    searchDisabled
                    previewConfig={{ showPreview: false }}
                />
            ),
        },
    ];

    const content = <Tabs defaultActiveKey="1" items={tabItems} style={{ width: 400 }} />;

    return (
        <Popover
            content={content}
            trigger="click"
            open={open}
            onOpenChange={setOpen}
            placement="bottomLeft"
        >
            <Button size='large' icon={<CategoryIcon icon={value || ''} defaultIcon="LuImagePlus" />} />
        </Popover>
    );
};

export default IconPicker;
