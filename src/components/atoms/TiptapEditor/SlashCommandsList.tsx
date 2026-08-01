import type { Editor, Range } from '@tiptap/core';
import { getNextSlashCommandIndex } from '@lib/editor/slashCommandNavigation';
import { Flex, List, Typography, theme } from 'antd';
import React, { forwardRef, useEffect, useImperativeHandle, useState, type ReactNode } from 'react';
import {
    LuCheckSquare,
    LuHeading1,
    LuHeading2,
    LuHeading3,
    LuList,
    LuListOrdered,
    LuTextQuote
} from 'react-icons/lu';

export interface SlashCommandsListRef {
    onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const { Text } = Typography;

export interface SlashCommandContext {
    editor: Editor;
    range: Range;
}

export interface SlashCommandItem {
    command: (context: SlashCommandContext) => void;
    icon: ReactNode;
    title: string;
}

export interface SlashCommandsListProps {
    command: (item: SlashCommandItem) => void;
    items: SlashCommandItem[];
}

const getSuggestionItems = ({ query }: { editor: Editor; query: string }): SlashCommandItem[] => {
    return [
        {
            title: 'Heading 1',
            icon: <LuHeading1 size={18} />,
            command: ({ editor, range }: SlashCommandContext) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
            },
        },
        {
            title: 'Heading 2',
            icon: <LuHeading2 size={18} />,
            command: ({ editor, range }: SlashCommandContext) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
            },
        },
        {
            title: 'Heading 3',
            icon: <LuHeading3 size={18} />,
            command: ({ editor, range }: SlashCommandContext) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
            },
        },
        {
            title: 'Bullet List',
            icon: <LuList size={18} />,
            command: ({ editor, range }: SlashCommandContext) => {
                editor.chain().focus().deleteRange(range).toggleBulletList().run();
            },
        },
        {
            title: 'Numbered List',
            icon: <LuListOrdered size={18} />,
            command: ({ editor, range }: SlashCommandContext) => {
                editor.chain().focus().deleteRange(range).toggleOrderedList().run();
            },
        },
        {
            title: 'Task List',
            icon: <LuCheckSquare size={18} />,
            command: ({ editor, range }: SlashCommandContext) => {
                editor.chain().focus().deleteRange(range).toggleTaskList().run();
            },
        },
        {
            title: 'Blockquote',
            icon: <LuTextQuote size={18} />,
            command: ({ editor, range }: SlashCommandContext) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().run();
            },
        },
    ].filter(item => item.title.toLowerCase().startsWith(query.toLowerCase())).slice(0, 10);
};

const SlashCommandsList = forwardRef<SlashCommandsListRef, SlashCommandsListProps>((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { token } = theme.useToken();

    const selectItem = (index: number): boolean => {
        const item = props.items[index];

        if (item) {
            props.command(item);
            return true;
        }
        return false;
    };

    const moveSelection = (direction: -1 | 1): boolean => {
        const nextIndex = getNextSlashCommandIndex(selectedIndex, props.items.length, direction);
        if (nextIndex === null) return false;
        setSelectedIndex(nextIndex);
        return true;
    };

    const upHandler = () => moveSelection(-1);
    const downHandler = () => moveSelection(1);
    const enterHandler = () => selectItem(selectedIndex);

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }) => {
            if (event.key === 'ArrowUp') {
                return upHandler();
            }

            if (event.key === 'ArrowDown') {
                return downHandler();
            }

            if (event.key === 'Enter') {
                return enterHandler();
            }

            return false;
        },
    }));

    return (
        <List
            className='slash-command-list'
            size="small"
            dataSource={props.items}
            style={{
                minWidth: 220,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG,
                background: token.colorBgElevated,
                boxShadow: token.boxShadowSecondary,
                padding: 4,
            }}
            renderItem={(item: SlashCommandItem, index: number) => (
                <List.Item
                    onClick={() => selectItem(index)}
                    style={{
                        background: index === selectedIndex ? token.colorPrimaryBg : 'transparent',
                        borderRadius: '4px',
                        color: token.colorText,
                        cursor: 'pointer',
                        padding: '8px 12px',
                    }}
                >
                    <Flex align="center" gap={12}>
                        {item.icon}
                        <Text>{item.title}</Text>
                    </Flex>
                </List.Item>
            )}
        />
    );
});

SlashCommandsList.displayName = 'SlashCommandsList';

export { getSuggestionItems, SlashCommandsList };
