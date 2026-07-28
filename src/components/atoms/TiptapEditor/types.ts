import type { Content, JSONContent } from '@tiptap/core';
import type { Editor } from '@tiptap/react';

export interface TiptapEditorProps {
    value?: Content;
    onChange?: (content: JSONContent) => void;
    placeholder?: string;
    isEditable?: boolean;
    editorBoxHeight?: number | string;
    hideCharactersCount?: boolean;
}

export interface MenuBarProps {
    editor: Editor | null;
}

export interface BubbleMenuProps {
    editor: Editor | null;
}
