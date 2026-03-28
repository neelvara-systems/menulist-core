import { Card, Flex, Modal, theme, Typography } from 'antd';
import { useMemo } from 'react';
import { getAllEditorShortcuts, getShortcutCategories, getShortcutDisplay } from './editorShortcuts.config';
import KeyboardShortcutDisplay from './KeyboardShortcutDisplay';

const { Text, Title } = Typography;

interface KeyboardShortcutsHelpProps {
    open: boolean;
    onClose: () => void;
}

export default function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
    const { token } = theme.useToken();

    const isMac = useMemo(() => {
        if (typeof navigator === 'undefined') return false;
        return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    }, []);

    // Get all shortcuts from single source of truth
    const shortcuts = useMemo(() => getAllEditorShortcuts(), []);
    const categories = useMemo(() => getShortcutCategories(), []);

    const getShortcutsByCategory = (category: string) => {
        return shortcuts.filter(s => s.category === category);
    };

    return (
        <Modal
            title={
                <Flex vertical gap={4}>
                    <Title level={4} style={{ margin: 0 }}>
                        ⌨️ Keyboard Shortcuts
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13, fontWeight: 'normal' }}>
                        Work faster with these keyboard shortcuts
                    </Text>
                </Flex>
            }
            open={open}
            onCancel={onClose}
            footer={null}
            width={600}
            styles={{
                body: {
                    maxHeight: 'calc(100vh - 200px)',
                    overflowY: 'auto'
                }
            }}
        >
            <Flex vertical gap={24} style={{ marginTop: 16 }}>
                {categories.map(category => (
                    <Flex key={category} vertical gap={12}>
                        <Text strong style={{ fontSize: 13, color: '#666' }}>
                            {category}
                        </Text>
                        <Flex vertical gap={8}>
                            {getShortcutsByCategory(category).map((shortcut, index) => (
                                <Card
                                    key={index}
                                    size="small"
                                    styles={{ body: { padding: '10px 12px' } }}
                                    style={{ borderRadius: 8 }}
                                >
                                    <Flex justify="space-between" align="center" gap={16}>
                                        <Text style={{ flex: 1, fontSize: 13 }}>
                                            {shortcut.description}
                                        </Text>
                                        <KeyboardShortcutDisplay
                                            keys={getShortcutDisplay(shortcut, isMac)}
                                            isMac={isMac}
                                        />
                                    </Flex>
                                </Card>
                            ))}
                        </Flex>
                    </Flex>
                ))}

                {/* How It Works - Selection System */}
                <Card
                    size="small"
                    style={{
                        background: token.colorWarningBg,
                        borderColor: token.colorWarningBorder,
                        borderRadius: 8
                    }}
                    styles={{ body: { padding: '12px 16px' } }}
                >
                    <Flex gap={8} align="flex-start">
                        <Text style={{ fontSize: 16 }}>�</Text>
                        <Flex vertical gap={8}>
                            <Text strong style={{ fontSize: 13 }}>
                                How Selection Works
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                                Most shortcuts require an item to be selected first:
                            </Text>
                            <Flex vertical gap={6} style={{ paddingLeft: 8 }}>
                                <Flex gap={8} align="flex-start">
                                    <Text type="secondary" style={{ fontSize: 12 }}>1.</Text>
                                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                                        Use <Text strong>Arrow Up/Down</Text> to navigate through items
                                    </Text>
                                </Flex>
                                <Flex gap={8} align="flex-start">
                                    <Text type="secondary" style={{ fontSize: 12 }}>2.</Text>
                                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                                        The selected item will be highlighted
                                    </Text>
                                </Flex>
                                <Flex gap={8} align="flex-start">
                                    <Text type="secondary" style={{ fontSize: 12 }}>3.</Text>
                                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                                        Now you can use <Text strong>E</Text> to edit, <Text strong>Delete</Text> to remove, or <Text strong>Cmd+I</Text> to toggle active/inactive
                                    </Text>
                                </Flex>
                            </Flex>
                        </Flex>
                    </Flex>
                </Card>

                {/* Example Workflow */}
                <Card
                    size="small"
                    style={{
                        background: token.colorSuccessBg,
                        borderColor: token.colorSuccessBorder,
                        borderRadius: 8
                    }}
                    styles={{ body: { padding: '12px 16px' } }}
                >
                    <Flex gap={8} align="flex-start">
                        <Text style={{ fontSize: 16 }}>✨</Text>
                        <Flex vertical gap={8}>
                            <Text strong style={{ fontSize: 13 }}>
                                Example Workflow
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6, fontStyle: 'italic' }}>
                                &ldquo;I want to edit the 3rd item in my menu:&rdquo;
                            </Text>
                            <Flex vertical gap={4} style={{ paddingLeft: 8, marginTop: 4 }}>
                                <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                                    Press <Text code style={{ fontSize: 11 }}>↓ ↓ ↓</Text> to navigate to item 3
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                                    Press <Text code style={{ fontSize: 11 }}>E</Text> to open edit modal
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                                    Make your changes and press <Text code style={{ fontSize: 11 }}>Cmd+S</Text> to save
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                                    Press <Text code style={{ fontSize: 11 }}>Escape</Text> to close modal
                                </Text>
                            </Flex>
                            <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.6, marginTop: 8, opacity: 0.8 }}>
                                💡 No mouse needed - pure keyboard workflow!
                            </Text>
                        </Flex>
                    </Flex>
                </Card>

                {/* Pro Tip */}
                <Card
                    size="small"
                    style={{
                        background: token.colorInfoBg,
                        borderColor: token.colorInfoBorder,
                        borderRadius: 8
                    }}
                    styles={{ body: { padding: '12px 16px' } }}
                >
                    <Flex gap={8} align="flex-start">
                        <Text style={{ fontSize: 16 }}>💡</Text>
                        <Flex vertical gap={4}>
                            <Text strong style={{ fontSize: 13 }}>
                                Quick Tips
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                                • Press <Text strong>Shift+?</Text> anytime to view these shortcuts<br />
                                • Most shortcuts work in both Advanced and Traditional views<br />
                                • Use <Text strong>Cmd+F</Text> to quickly find items by searching
                            </Text>
                        </Flex>
                    </Flex>
                </Card>
            </Flex>
        </Modal>
    );
}
