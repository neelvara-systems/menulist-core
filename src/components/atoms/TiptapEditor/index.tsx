'use client';

import { getTiptapExtensions } from '@config/tiptap';
import { EditorContent, useEditor } from '@tiptap/react';
import { Flex, theme } from 'antd';
import React, { useEffect, useMemo } from 'react';
import BubbleMenu from './BubbleMenu';
import MenuBar from './MenuBar';
import './styles.scss';
import { TiptapEditorProps } from './types';

const EMPTY_TIPTAP_DOC = {
    type: 'doc',
    content: [{ type: 'paragraph' }],
};

const formatCssSize = (value: number | string) => (
    typeof value === 'number' ? `${value}px` : value
);

const TiptapEditor: React.FC<TiptapEditorProps> = ({
    value,
    onChange,
    placeholder = 'Start typing...',
    isEditable = true,
    editorBoxHeight = 400,
    hideCharactersCount = false,
}) => {
    const { token } = theme.useToken();
    const editorHeight = formatCssSize(editorBoxHeight);

    const extensions = useMemo(
        () => getTiptapExtensions({ isEditable, placeholder }),
        [isEditable, placeholder],
    );

    const editor = useEditor({
        extensions,
        content: value || EMPTY_TIPTAP_DOC,
        onUpdate: ({ editor }) => {
            onChange?.(editor.getJSON());
        },
        editable: isEditable,
        editorProps: {
            attributes: {
                class: 'rich-text-editor',
                'aria-label': 'Rich text editor',
            },
        },
        immediatelyRender: false,
    });

    useEffect(() => {
        editor?.setEditable(isEditable);
    }, [editor, isEditable]);

    useEffect(() => {
        if (!editor) return;

        const nextContent = value || EMPTY_TIPTAP_DOC;
        const isSame = JSON.stringify(editor.getJSON()) === JSON.stringify(nextContent);

        if (!isSame) {
            editor.commands.setContent(nextContent, false);
        }
    }, [editor, value]);

    const editorWords = editor?.storage.characterCount?.words?.() ?? 0;
    const editorCharacters = editor?.storage.characterCount?.characters?.() ?? 0;

    return (
        <div
            className={`tiptap-editor-shell ${isEditable ? 'is-editable' : 'is-readonly'}`}
            style={{
                '--tiptap-editor-height': editorHeight,
                '--tiptap-border': token.colorBorder,
                '--tiptap-border-secondary': token.colorBorderSecondary,
                '--tiptap-bg': token.colorBgContainer,
                '--tiptap-bg-muted': token.colorFillAlter,
                '--tiptap-bg-hover': token.colorFillSecondary,
                '--tiptap-text': token.colorText,
                '--tiptap-text-secondary': token.colorTextSecondary,
                '--tiptap-primary': token.colorPrimary,
                '--tiptap-radius': `${token.borderRadiusLG}px`,
            } as React.CSSProperties}
        >
            {isEditable && (
                <>
                    <div className="tiptap-editor-toolbar">
                        <MenuBar editor={editor} />
                    </div>
                    {editor && <BubbleMenu editor={editor} />}
                </>
            )}
            <EditorContent editor={editor} />
            {editor && !hideCharactersCount && (
                <Flex className="tiptap-editor-footer" justify="end" gap={12}>
                    <span>{editorWords} words</span>
                    <span>{editorCharacters} characters</span>
                </Flex>
            )}
        </div>
    );
};

export default TiptapEditor;
