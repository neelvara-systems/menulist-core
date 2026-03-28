import { BubbleMenu as TiptapBubbleMenu } from '@tiptap/react';
import { Button, Card, ColorPicker, Divider, Space } from 'antd';
import React from 'react';
import {
    LuBold,
    LuCode,
    LuHeading1,
    LuHeading2,
    LuHeading3,
    LuItalic,
    LuStrikethrough,
    LuUnderline,
} from 'react-icons/lu';
import { BubbleMenuProps } from './types';

const BubbleMenu: React.FC<BubbleMenuProps> = ({ editor }) => {
    if (!editor) {
        return null;
    }

    return (
        <TiptapBubbleMenu tippyOptions={{ duration: 100 }} editor={editor}>
            <Card size="small" styles={{ body: { padding: '4px' } }}>
                <Space>
                    <Button
                        size="small"
                        type={editor.isActive('bold') ? 'primary' : 'text'}
                        icon={<LuBold />}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                    />
                    <Button
                        size="small"
                        type={editor.isActive('italic') ? 'primary' : 'text'}
                        icon={<LuItalic />}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                    />
                    <Button
                        size="small"
                        type={editor.isActive('underline') ? 'primary' : 'text'}
                        icon={<LuUnderline />}
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                    />
                    <Button
                        size="small"
                        type={editor.isActive('strike') ? 'primary' : 'text'}
                        icon={<LuStrikethrough />}
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                    />
                    <Button
                        size="small"
                        type={editor.isActive('code') ? 'primary' : 'text'}
                        icon={<LuCode />}
                        onClick={() => editor.chain().focus().toggleCode().run()}
                    />

                    <Divider type="vertical" />

                    <Button
                        size="small"
                        type={editor.isActive('heading', { level: 1 }) ? 'primary' : 'text'}
                        icon={<LuHeading1 />}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    />
                    <Button
                        size="small"
                        type={editor.isActive('heading', { level: 2 }) ? 'primary' : 'text'}
                        icon={<LuHeading2 />}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    />
                    <Button
                        size="small"
                        type={editor.isActive('heading', { level: 3 }) ? 'primary' : 'text'}
                        icon={<LuHeading3 />}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    />

                    <Divider type="vertical" />

                    <ColorPicker
                        size="small"
                        value={editor.getAttributes('textStyle').color || '#000000'}
                        onChange={(color) => editor.chain().focus().setColor(color.toHexString()).run()}
                    />
                </Space>
            </Card>
        </TiptapBubbleMenu>
    );
};

export default BubbleMenu;

