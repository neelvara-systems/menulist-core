import CharacterCount from '@tiptap/extension-character-count';
import Color from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';

import { SlashCommandsExtension } from '../components/atoms/TiptapEditor/SlashCommandsExtension';

interface ExtensionOptions {
    isEditable?: boolean;
    placeholder?: string;
}

export const getTiptapExtensions = (options: ExtensionOptions = {}) => {
    const { isEditable = true, placeholder = 'Start typing...' } = options;

    const extensions = [
        StarterKit.configure({
            heading: {
                levels: isEditable ? [1, 2, 3] : [1, 2, 3, 4, 5, 6],
            },
        }),
        TaskList,
        TaskItem.configure({
            nested: true,
        }),
        Underline,
        Link.configure({
            openOnClick: false,
        }),
        TextStyle,
        Color.configure({ types: ['textStyle'] }),
        TextAlign.configure({
            types: ['heading', 'paragraph'],
            alignments: ['left', 'center', 'right', 'justify'],
            defaultAlignment: 'left',
        }),
        Typography,
        Placeholder.configure({
            placeholder,
        }),
        CharacterCount,
        Image,
        Table.configure({
            resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
    ];

    if (isEditable) {
        extensions.push(SlashCommandsExtension);
    }

    return extensions;
};
