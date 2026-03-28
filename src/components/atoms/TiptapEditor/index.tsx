'use client';

import { getTiptapExtensions } from '@config/tiptap';
import { EditorContent, useEditor } from '@tiptap/react';
import { Flex, theme } from 'antd';
import React, { useEffect, useMemo } from 'react';
import BubbleMenu from './BubbleMenu';
import MenuBar from './MenuBar';
import './styles.scss';
import { TiptapEditorProps } from './types';

const TiptapEditor: React.FC<TiptapEditorProps> = ({ value, onChange, placeholder = 'Start typing...', isEditable = true, editorBoxHeight = 400, hideCharactersCount = false }) => {
    const { token } = theme.useToken();

    // Memoize extensions to prevent infinite re-renders
    const extensions = useMemo(() => getTiptapExtensions({ isEditable, placeholder }), [isEditable, placeholder]);

    const editor = useEditor({
        extensions,
        content: value,
        onUpdate: ({ editor }) => {
            onChange?.(editor.getJSON());
        },
        editable: isEditable,
        editorProps: {
            attributes: {
                class: 'rich-text-editor',
                style: `padding: 12px;border:1px solid ${token.colorBorder};border-radius:${token.borderRadiusLG}; max-height: ${editorBoxHeight}px; overflow-y: auto;`,

            },
        },
        immediatelyRender: false,
    });

    useEffect(() => {
        if (!editor || !value) {
            return;
        }

        const isSame = JSON.stringify(editor.getJSON()) === JSON.stringify(value);

        if (!isSame) {
            editor.commands.setContent(value, false);
        }
    }, [editor, value]);

    return (
        <div
            style={{
                border: isEditable ? `1px solid ${token.colorBorder}` : 'none',
                borderRadius: token.borderRadiusLG,
                padding: isEditable ? '0px 12px' : "0",
            }}
        >
            {isEditable && (
                <>
                    <div style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: '8px', marginBottom: '8px' }}>
                        <MenuBar editor={editor} />
                    </div>
                    {editor && <BubbleMenu editor={editor} />}
                </>
            )}
            <EditorContent editor={editor} />
            {editor && !hideCharactersCount && (
                <Flex justify="end" style={{ color: token.colorTextSecondary, fontSize: '12px' }}>
                    {editor.storage.characterCount.characters()} characters
                </Flex>
            )}
        </div>
    );
};

export default TiptapEditor;
