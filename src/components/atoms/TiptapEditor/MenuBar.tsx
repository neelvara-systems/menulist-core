import { Button, ColorPicker, Divider, Dropdown, Flex, Input, Modal, Tooltip } from 'antd'; // Added Dropdown
import React, { useCallback, useState } from 'react';
import {
    LuAlignCenter,
    LuAlignJustify,
    LuAlignLeft,
    LuAlignRight,
    LuBold,
    LuCheckSquare,
    LuCode,
    LuHeading1,
    LuHeading2,
    LuHeading3,
    LuHeading4,
    LuHeading5,
    LuImage,
    LuItalic,
    LuList,
    LuListOrdered,
    LuPilcrow,
    LuQuote,
    LuStrikethrough,
    LuTable, // Added
    LuUnderline,
} from 'react-icons/lu';
import { MenuBarProps } from './types';

const MenuBar: React.FC<MenuBarProps> = ({ editor }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [imageUrl, setImageUrl] = useState('');

    const addImage = useCallback(() => {
        if (imageUrl) {
            editor.chain().focus().setImage({ src: imageUrl }).run();
            setIsModalOpen(false);
            setImageUrl('');
        }
    }, [editor, imageUrl]);

    if (!editor) {
        return null;
    }

    return (
        <Flex wrap gap={4} align="center">
            {/* Group 1: Basic Styles */}
            <Flex gap={4}>
                <Tooltip title="Bold">
                    <Button
                        type={editor.isActive('bold') ? 'primary' : 'text'}
                        ghost={editor.isActive('bold')}
                        icon={<LuBold />}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                    />
                </Tooltip>
                <Tooltip title="Italic">
                    <Button
                        type={editor.isActive('italic') ? 'primary' : 'text'}
                        ghost={editor.isActive('italic')}
                        icon={<LuItalic />}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                    />
                </Tooltip>
                <Tooltip title="Underline">
                    <Button
                        type={editor.isActive('underline') ? 'primary' : 'text'}
                        ghost={editor.isActive('underline')}
                        icon={<LuUnderline />}
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                    />
                </Tooltip>
                <Tooltip title="Strikethrough">
                    <Button
                        type={editor.isActive('strike') ? 'primary' : 'text'}
                        ghost={editor.isActive('strike')}
                        icon={<LuStrikethrough />}
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                    />
                </Tooltip>
                <Tooltip title="Code">
                    <Button
                        type={editor.isActive('code') ? 'primary' : 'text'}
                        ghost={editor.isActive('code')}
                        icon={<LuCode />}
                        onClick={() => editor.chain().focus().toggleCode().run()}
                    />
                </Tooltip>
            </Flex>

            <Divider type="vertical" />

            {/* Group 2: Headings */}
            <Flex gap={4}>
                <Tooltip title="Heading 1">
                    <Button
                        type={editor.isActive('heading', { level: 1 }) ? 'primary' : 'text'}
                        ghost={editor.isActive('heading', { level: 1 })}
                        icon={<LuHeading1 />}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    />
                </Tooltip>
                <Tooltip title="Heading 2">
                    <Button
                        type={editor.isActive('heading', { level: 2 }) ? 'primary' : 'text'}
                        ghost={editor.isActive('heading', { level: 2 })}
                        icon={<LuHeading2 />}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    />
                </Tooltip>
                <Tooltip title="Heading 3">
                    <Button
                        type={editor.isActive('heading', { level: 3 }) ? 'primary' : 'text'}
                        ghost={editor.isActive('heading', { level: 3 })}
                        icon={<LuHeading3 />}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    />
                </Tooltip>
                <Tooltip title="Heading 4">
                    <Button
                        type={editor.isActive('heading', { level: 4 }) ? 'primary' : 'text'}
                        ghost={editor.isActive('heading', { level: 4 })}
                        icon={<LuHeading4 />}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
                    />
                </Tooltip>
                <Tooltip title="Heading 5">
                    <Button
                        type={editor.isActive('heading', { level: 5 }) ? 'primary' : 'text'}
                        ghost={editor.isActive('heading', { level: 5 })}
                        icon={<LuHeading5 />}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
                    />
                </Tooltip>
            </Flex>

            <Divider type="vertical" />

            {/* Group 3: Block Elements */}
            <Flex gap={4}>
                <Tooltip title="Blockquote">
                    <Button
                        type={editor.isActive('blockquote') ? 'primary' : 'text'}
                        ghost={editor.isActive('blockquote')}
                        icon={<LuQuote />}
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    />
                </Tooltip>
                <Tooltip title="Horizontal Rule">
                    <Button
                        type={editor.isActive('horizontalRule') ? 'primary' : 'text'}
                        ghost={editor.isActive('horizontalRule')}
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                        icon={<LuPilcrow />}
                    />
                </Tooltip>
            </Flex>

            <Divider type="vertical" />

            {/* Group 4: Lists */}
            <Flex gap={4}>
                <Tooltip title="Bullet List">
                    <Button
                        type={editor.isActive('bulletList') ? 'primary' : 'text'}
                        ghost={editor.isActive('bulletList')}
                        icon={<LuList />}
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                    />
                </Tooltip>
                <Tooltip title="Numbered List">
                    <Button
                        type={editor.isActive('orderedList') ? 'primary' : 'text'}
                        ghost={editor.isActive('orderedList')}
                        icon={<LuListOrdered />}
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    />
                </Tooltip>
                <Tooltip title="Task List">
                    <Button
                        type={editor.isActive('taskList') ? 'primary' : 'text'}
                        ghost={editor.isActive('taskList')}
                        icon={<LuCheckSquare />}
                        onClick={() => editor.chain().focus().toggleTaskList().run()}
                    />
                </Tooltip>
            </Flex>

            <Divider type="vertical" />

            {/* Group 5: Alignment */}
            <Flex gap={4}>
                <Tooltip title="Align Left">
                    <Button
                        type={editor.isActive({ textAlign: 'left' }) ? 'primary' : 'text'}
                        ghost={editor.isActive({ textAlign: 'left' })}
                        icon={<LuAlignLeft />}
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    />
                </Tooltip>
                <Tooltip title="Align Center">
                    <Button
                        type={editor.isActive({ textAlign: 'center' }) ? 'primary' : 'text'}
                        ghost={editor.isActive({ textAlign: 'center' })}
                        icon={<LuAlignCenter />}
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    />
                </Tooltip>
                <Tooltip title="Align Right">
                    <Button
                        type={editor.isActive({ textAlign: 'right' }) ? 'primary' : 'text'}
                        ghost={editor.isActive({ textAlign: 'right' })}
                        icon={<LuAlignRight />}
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    />
                </Tooltip>
                <Tooltip title="Justify">
                    <Button
                        type={editor.isActive({ textAlign: 'justify' }) ? 'primary' : 'text'}
                        ghost={editor.isActive({ textAlign: 'justify' })}
                        icon={<LuAlignJustify />}
                        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    />
                </Tooltip>
            </Flex>

            <Divider type="vertical" />

            {/* Group 6: Media and Tables */}
            <Flex gap={4}>
                <Tooltip title="Image">
                    <Button
                        type={editor.isActive('image') ? 'primary' : 'text'}
                        ghost={editor.isActive('image')}
                        onClick={() => setIsModalOpen(true)}
                        icon={<LuImage />}
                    />
                </Tooltip>
                <Dropdown
                    menu={{
                        items: [
                            {
                                key: 'insertTable',
                                label: 'Insert Table',
                                onClick: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
                            },
                            {
                                key: 'addColumnBefore',
                                label: 'Add Column Before',
                                onClick: () => editor.chain().focus().addColumnBefore().run(),
                            },
                            {
                                key: 'addColumnAfter',
                                label: 'Add Column After',
                                onClick: () => editor.chain().focus().addColumnAfter().run(),
                            },
                            {
                                key: 'deleteColumn',
                                label: 'Delete Column',
                                onClick: () => editor.chain().focus().deleteColumn().run(),
                            },
                            {
                                key: 'addRowBefore',
                                label: 'Add Row Before',
                                onClick: () => editor.chain().focus().addRowBefore().run(),
                            },
                            {
                                key: 'addRowAfter',
                                label: 'Add Row After',
                                onClick: () => editor.chain().focus().addRowAfter().run(),
                            },
                            {
                                key: 'deleteRow',
                                label: 'Delete Row',
                                onClick: () => editor.chain().focus().deleteRow().run(),
                            },
                            {
                                key: 'deleteTable',
                                label: 'Delete Table',
                                onClick: () => editor.chain().focus().deleteTable().run(),
                            },
                            {
                                key: 'toggleHeaderCell',
                                label: 'Toggle Header Cell',
                                onClick: () => editor.chain().focus().toggleHeaderCell().run(),
                            },
                        ],
                    }}
                >
                    <Button
                        type={editor.isActive('table') ? 'primary' : 'text'}
                        ghost={editor.isActive('table')}
                        icon={<LuTable />}
                    />
                </Dropdown>
            </Flex>

            <Divider type="vertical" />

            {/* Group 7: Color */}
            <Tooltip title="Text Color">
                <ColorPicker
                    value={editor.getAttributes('textStyle').color || '#000000'}
                    onChange={(color) => editor.chain().focus().setColor(color.toHexString()).run()}
                />
            </Tooltip>

            {/* Modal for Image URL */}
            <Modal
                title="Add Image URL"
                open={isModalOpen}
                onOk={addImage}
                onCancel={() => setIsModalOpen(false)}
                okText="Add Image"
            >
                <Input
                    placeholder="https://example.com/image.png"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    onPressEnter={addImage}
                />
            </Modal>
        </Flex>
    );
};

export default MenuBar;

