import type { MenuProps } from 'antd';
import { Button, ColorPicker, Dropdown, Flex, Input, Modal, Tooltip, message } from 'antd';
import { useEditorState } from '@tiptap/react';
import React, { useState } from 'react';
import {
    LuAlignCenter,
    LuAlignJustify,
    LuAlignLeft,
    LuAlignRight,
    LuBold,
    LuCheckSquare,
    LuChevronDown,
    LuCode,
    LuHeading,
    LuImage,
    LuItalic,
    LuLink,
    LuList,
    LuListOrdered,
    LuMinus,
    LuPilcrow,
    LuQuote,
    LuRedo2,
    LuRemoveFormatting,
    LuStrikethrough,
    LuTable2,
    LuTrash2,
    LuUnderline,
    LuUndo2,
    LuUnlink,
} from 'react-icons/lu';
import { MenuBarProps } from './types';
import {
    normalizeTiptapImageUrl,
    normalizeTiptapLinkUrl,
} from '@lib/tiptap/urlPolicy';

const emptyEditorState = {
    activeBlock: 'paragraph',
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    code: false,
    bulletList: false,
    orderedList: false,
    taskList: false,
    blockquote: false,
    link: false,
    image: false,
    table: false,
    canUndo: false,
    canRedo: false,
};

const MenuBar: React.FC<MenuBarProps> = ({ editor }) => {
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    const editorState = useEditorState({
        editor,
        selector: ({ editor }) => {
            if (!editor) return emptyEditorState;

            return {
                activeBlock: editor.isActive('heading', { level: 1 })
                    ? 'heading-1'
                    : editor.isActive('heading', { level: 2 })
                        ? 'heading-2'
                        : editor.isActive('heading', { level: 3 })
                            ? 'heading-3'
                            : 'paragraph',
                bold: editor.isActive('bold'),
                italic: editor.isActive('italic'),
                underline: editor.isActive('underline'),
                strike: editor.isActive('strike'),
                code: editor.isActive('code'),
                bulletList: editor.isActive('bulletList'),
                orderedList: editor.isActive('orderedList'),
                taskList: editor.isActive('taskList'),
                blockquote: editor.isActive('blockquote'),
                link: editor.isActive('link'),
                image: editor.isActive('image'),
                table: editor.isActive('table'),
                canUndo: editor.can().chain().focus().undo().run(),
                canRedo: editor.can().chain().focus().redo().run(),
            };
        },
    });

    if (!editor) {
        return null;
    }

    const run = (callback: () => boolean) => {
        callback();
    };

    const toolbarButton = (
        label: string,
        icon: React.ReactNode,
        onClick: () => void,
        options: { active?: boolean; disabled?: boolean; danger?: boolean } = {},
    ) => (
        <Tooltip title={label}>
            <Button
                aria-label={label}
                aria-pressed={options.active === undefined ? undefined : options.active}
                size="small"
                type={options.active ? 'primary' : 'text'}
                danger={options.danger}
                disabled={options.disabled}
                icon={icon}
                onClick={onClick}
            />
        </Tooltip>
    );

    const openLinkModal = () => {
        setLinkUrl(editor.getAttributes('link').href || '');
        setIsLinkModalOpen(true);
    };

    const applyLink = () => {
        const nextUrl = normalizeTiptapLinkUrl(linkUrl, { assumeHttps: true });
        if (!nextUrl) {
            void message.warning('Enter a valid link.');
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: nextUrl }).run();
        setIsLinkModalOpen(false);
        setLinkUrl('');
    };

    const applyImage = () => {
        const nextUrl = normalizeTiptapImageUrl(imageUrl);
        if (!nextUrl) {
            void message.warning('Use a valid image URL.');
            return;
        }

        editor.chain().focus().setImage({ src: nextUrl }).run();
        setIsImageModalOpen(false);
        setImageUrl('');
    };

    const headingItems: MenuProps['items'] = [
        {
            key: 'paragraph',
            label: 'Normal text',
            icon: <LuPilcrow />,
            onClick: () => run(() => editor.chain().focus().setParagraph().run()),
        },
        {
            key: 'heading-1',
            label: 'Heading 1',
            icon: <LuHeading />,
            onClick: () => run(() => editor.chain().focus().toggleHeading({ level: 1 }).run()),
        },
        {
            key: 'heading-2',
            label: 'Heading 2',
            icon: <LuHeading />,
            onClick: () => run(() => editor.chain().focus().toggleHeading({ level: 2 }).run()),
        },
        {
            key: 'heading-3',
            label: 'Heading 3',
            icon: <LuHeading />,
            onClick: () => run(() => editor.chain().focus().toggleHeading({ level: 3 }).run()),
        },
    ];

    const alignmentItems: MenuProps['items'] = [
        {
            key: 'left',
            label: 'Align left',
            icon: <LuAlignLeft />,
            onClick: () => run(() => editor.chain().focus().setTextAlign('left').run()),
        },
        {
            key: 'center',
            label: 'Align center',
            icon: <LuAlignCenter />,
            onClick: () => run(() => editor.chain().focus().setTextAlign('center').run()),
        },
        {
            key: 'right',
            label: 'Align right',
            icon: <LuAlignRight />,
            onClick: () => run(() => editor.chain().focus().setTextAlign('right').run()),
        },
        {
            key: 'justify',
            label: 'Justify',
            icon: <LuAlignJustify />,
            onClick: () => run(() => editor.chain().focus().setTextAlign('justify').run()),
        },
    ];

    const tableActive = !!editorState?.table;
    const tableItems: MenuProps['items'] = [
        {
            key: 'insert-table',
            label: 'Insert table',
            icon: <LuTable2 />,
            onClick: () => run(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()),
        },
        { type: 'divider' },
        {
            key: 'add-row-before',
            label: 'Add row above',
            disabled: !tableActive,
            onClick: () => run(() => editor.chain().focus().addRowBefore().run()),
        },
        {
            key: 'add-row-after',
            label: 'Add row below',
            disabled: !tableActive,
            onClick: () => run(() => editor.chain().focus().addRowAfter().run()),
        },
        {
            key: 'add-column-before',
            label: 'Add column before',
            disabled: !tableActive,
            onClick: () => run(() => editor.chain().focus().addColumnBefore().run()),
        },
        {
            key: 'add-column-after',
            label: 'Add column after',
            disabled: !tableActive,
            onClick: () => run(() => editor.chain().focus().addColumnAfter().run()),
        },
        {
            key: 'toggle-header-cell',
            label: 'Toggle header cell',
            disabled: !tableActive,
            onClick: () => run(() => editor.chain().focus().toggleHeaderCell().run()),
        },
        { type: 'divider' },
        {
            key: 'delete-row',
            label: 'Delete row',
            disabled: !tableActive,
            danger: true,
            onClick: () => run(() => editor.chain().focus().deleteRow().run()),
        },
        {
            key: 'delete-column',
            label: 'Delete column',
            disabled: !tableActive,
            danger: true,
            onClick: () => run(() => editor.chain().focus().deleteColumn().run()),
        },
        {
            key: 'delete-table',
            label: 'Delete table',
            icon: <LuTrash2 />,
            disabled: !tableActive,
            danger: true,
            onClick: () => run(() => editor.chain().focus().deleteTable().run()),
        },
    ];

    return (
        <>
            <Flex className="tiptap-toolbar" wrap gap={8} align="center">
                <Flex className="tiptap-toolbar-group" gap={2} align="center">
                    {toolbarButton(
                        'Undo',
                        <LuUndo2 />,
                        () => run(() => editor.chain().focus().undo().run()),
                        { disabled: !editorState?.canUndo },
                    )}
                    {toolbarButton(
                        'Redo',
                        <LuRedo2 />,
                        () => run(() => editor.chain().focus().redo().run()),
                        { disabled: !editorState?.canRedo },
                    )}
                </Flex>

                <Flex className="tiptap-toolbar-group" gap={2} align="center">
                    <Dropdown
                        menu={{ items: headingItems, selectable: true, selectedKeys: [editorState?.activeBlock || 'paragraph'] }}
                        trigger={['click']}
                    >
                        <Tooltip title="Text style">
                            <Button
                                aria-label="Text style"
                                size="small"
                                type={editorState?.activeBlock !== 'paragraph' ? 'primary' : 'text'}
                                icon={<LuHeading />}
                            >
                                <LuChevronDown size={14} />
                            </Button>
                        </Tooltip>
                    </Dropdown>
                    {toolbarButton('Bold', <LuBold />, () => run(() => editor.chain().focus().toggleBold().run()), { active: editorState?.bold })}
                    {toolbarButton('Italic', <LuItalic />, () => run(() => editor.chain().focus().toggleItalic().run()), { active: editorState?.italic })}
                    {toolbarButton('Underline', <LuUnderline />, () => run(() => editor.chain().focus().toggleUnderline().run()), { active: editorState?.underline })}
                    {toolbarButton('Strike', <LuStrikethrough />, () => run(() => editor.chain().focus().toggleStrike().run()), { active: editorState?.strike })}
                    {toolbarButton('Inline code', <LuCode />, () => run(() => editor.chain().focus().toggleCode().run()), { active: editorState?.code })}
                    {toolbarButton('Clear formatting', <LuRemoveFormatting />, () => run(() => editor.chain().focus().unsetAllMarks().clearNodes().run()))}
                </Flex>

                <Flex className="tiptap-toolbar-group" gap={2} align="center">
                    {toolbarButton('Bullet list', <LuList />, () => run(() => editor.chain().focus().toggleBulletList().run()), { active: editorState?.bulletList })}
                    {toolbarButton('Numbered list', <LuListOrdered />, () => run(() => editor.chain().focus().toggleOrderedList().run()), { active: editorState?.orderedList })}
                    {toolbarButton('Task list', <LuCheckSquare />, () => run(() => editor.chain().focus().toggleTaskList().run()), { active: editorState?.taskList })}
                    {toolbarButton('Quote', <LuQuote />, () => run(() => editor.chain().focus().toggleBlockquote().run()), { active: editorState?.blockquote })}
                    {toolbarButton('Divider', <LuMinus />, () => run(() => editor.chain().focus().setHorizontalRule().run()))}
                </Flex>

                <Flex className="tiptap-toolbar-group" gap={2} align="center">
                    <Dropdown menu={{ items: alignmentItems }} trigger={['click']}>
                        <Tooltip title="Alignment">
                            <Button aria-label="Alignment" size="small" type="text" icon={<LuAlignLeft />}>
                                <LuChevronDown size={14} />
                            </Button>
                        </Tooltip>
                    </Dropdown>
                    {toolbarButton('Add link', <LuLink />, openLinkModal, { active: editorState?.link })}
                    {toolbarButton(
                        'Remove link',
                        <LuUnlink />,
                        () => run(() => editor.chain().focus().extendMarkRange('link').unsetLink().run()),
                        { disabled: !editorState?.link },
                    )}
                    {toolbarButton('Image', <LuImage />, () => setIsImageModalOpen(true), { active: editorState?.image })}
                    <Dropdown menu={{ items: tableItems }} trigger={['click']}>
                        <Tooltip title="Table">
                            <Button
                                aria-label="Table"
                                size="small"
                                type={tableActive ? 'primary' : 'text'}
                                icon={<LuTable2 />}
                            >
                                <LuChevronDown size={14} />
                            </Button>
                        </Tooltip>
                    </Dropdown>
                </Flex>

                <Flex className="tiptap-toolbar-group" gap={2} align="center">
                    <Tooltip title="Text color">
                        <ColorPicker
                            size="small"
                            value={editor.getAttributes('textStyle').color || undefined}
                            onChange={(color) => editor.chain().focus().setColor(color.toHexString()).run()}
                        />
                    </Tooltip>
                </Flex>
            </Flex>

            <Modal
                title="Add link"
                open={isLinkModalOpen}
                onOk={applyLink}
                onCancel={() => setIsLinkModalOpen(false)}
                okText="Apply"
                okButtonProps={{ disabled: !linkUrl.trim() }}
            >
                <Input
                    autoFocus
                    maxLength={2048}
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    onPressEnter={applyLink}
                />
            </Modal>

            <Modal
                title="Add image"
                open={isImageModalOpen}
                onOk={applyImage}
                onCancel={() => setIsImageModalOpen(false)}
                okText="Insert"
                okButtonProps={{ disabled: !imageUrl.trim() }}
            >
                <Input
                    autoFocus
                    maxLength={2048}
                    placeholder="https://example.com/image.png"
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    onPressEnter={applyImage}
                />
            </Modal>
        </>
    );
};

export default MenuBar;
