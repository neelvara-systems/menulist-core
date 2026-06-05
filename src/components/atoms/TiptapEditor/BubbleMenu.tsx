import { BubbleMenu as TiptapBubbleMenu } from '@tiptap/react';
import { Button, ColorPicker, Flex, Tooltip, theme } from 'antd';
import React from 'react';
import {
    LuBold,
    LuCode,
    LuHeading1,
    LuHeading2,
    LuItalic,
    LuRemoveFormatting,
    LuStrikethrough,
    LuUnderline,
} from 'react-icons/lu';
import { BubbleMenuProps } from './types';

const BubbleMenu: React.FC<BubbleMenuProps> = ({ editor }) => {
    const { token } = theme.useToken();

    if (!editor) {
        return null;
    }

    const bubbleButton = (
        label: string,
        icon: React.ReactNode,
        onClick: () => void,
        active = false,
    ) => (
        <Tooltip title={label}>
            <Button
                aria-label={label}
                size="small"
                type={active ? 'primary' : 'text'}
                icon={icon}
                onClick={onClick}
            />
        </Tooltip>
    );

    return (
        <TiptapBubbleMenu
            tippyOptions={{ duration: 100, maxWidth: 'none' }}
            editor={editor}
            shouldShow={({ editor }) => editor.isEditable && !editor.state.selection.empty}
        >
            <div
                className="tiptap-bubble-menu"
                style={{
                    background: token.colorBgElevated,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: token.borderRadiusLG,
                    boxShadow: token.boxShadowSecondary,
                    padding: 4,
                }}
            >
                <Flex gap={2} align="center">
                    {bubbleButton('Bold', <LuBold />, () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
                    {bubbleButton('Italic', <LuItalic />, () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
                    {bubbleButton('Underline', <LuUnderline />, () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'))}
                    {bubbleButton('Strike', <LuStrikethrough />, () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'))}
                    {bubbleButton('Inline code', <LuCode />, () => editor.chain().focus().toggleCode().run(), editor.isActive('code'))}
                    {bubbleButton('Heading 1', <LuHeading1 />, () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }))}
                    {bubbleButton('Heading 2', <LuHeading2 />, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }))}
                    {bubbleButton('Clear formatting', <LuRemoveFormatting />, () => editor.chain().focus().unsetAllMarks().clearNodes().run())}
                    <Tooltip title="Text color">
                        <ColorPicker
                            size="small"
                            value={editor.getAttributes('textStyle').color || undefined}
                            onChange={(color) => editor.chain().focus().setColor(color.toHexString()).run()}
                        />
                    </Tooltip>
                </Flex>
            </div>
        </TiptapBubbleMenu>
    );
};

export default BubbleMenu;
