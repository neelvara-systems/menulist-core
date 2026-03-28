import { Editor } from '@tiptap/react';

export interface TiptapEditorProps {
    value?: any; // antd form compatibility
    onChange?: (content: any) => void; // emit JSON
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
