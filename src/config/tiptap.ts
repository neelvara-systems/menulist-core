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
import type { Extensions } from '@tiptap/core';
import { mergeSafeTiptapAttributes } from '@lib/tiptap/safeAttributes';
import {
    normalizeTiptapImageUrl,
    normalizeTiptapLinkUrl,
    normalizeTiptapTextAlign,
    normalizeTiptapTextColor,
} from '@lib/tiptap/urlPolicy';

import { SlashCommandsExtension } from '../components/atoms/TiptapEditor/SlashCommandsExtension';

interface ExtensionOptions {
    isEditable?: boolean;
    placeholder?: string;
}

const SafeImage = Image.extend({
    renderHTML({ HTMLAttributes }) {
        const src = normalizeTiptapImageUrl(HTMLAttributes.src);
        if (!src) {
            return ['span', { 'aria-label': 'Invalid image', role: 'img' }];
        }

        return ['img', mergeSafeTiptapAttributes(this.options.HTMLAttributes, HTMLAttributes, { src })];
    },
});

const SafeColor = Color.extend({
    addGlobalAttributes() {
        return [{
            types: this.options.types,
            attributes: {
                color: {
                    default: null,
                    parseHTML: (element) => normalizeTiptapTextColor(element.style.color) || null,
                    renderHTML: (attributes) => {
                        const color = normalizeTiptapTextColor(attributes.color);
                        return color ? { style: `color: ${color}` } : {};
                    },
                },
            },
        }];
    },
});

const SafeTextAlign = TextAlign.extend({
    addGlobalAttributes() {
        return [{
            types: this.options.types,
            attributes: {
                textAlign: {
                    default: this.options.defaultAlignment,
                    parseHTML: (element) => normalizeTiptapTextAlign(element.style.textAlign) || this.options.defaultAlignment,
                    renderHTML: (attributes) => {
                        const textAlign = normalizeTiptapTextAlign(attributes.textAlign);
                        return textAlign ? { style: `text-align: ${textAlign}` } : {};
                    },
                },
            },
        }];
    },
});

export const getTiptapExtensions = (options: ExtensionOptions = {}) => {
    const { isEditable = true, placeholder = 'Start typing...' } = options;

    const extensions: Extensions = [
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
            isAllowedUri: (url) => Boolean(normalizeTiptapLinkUrl(url)),
        }),
        TextStyle,
        SafeColor.configure({ types: ['textStyle'] }),
        SafeTextAlign.configure({
            types: ['heading', 'paragraph'],
            alignments: ['left', 'center', 'right', 'justify'],
            defaultAlignment: 'left',
        }),
        Typography,
        Placeholder.configure({
            placeholder,
        }),
        CharacterCount,
        SafeImage,
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
