import { getAllShortcuts } from '@providers/GlobalKeyboardShortcutsProvider';
import { Divider, Flex, Modal, Tag, theme, Typography } from 'antd';
import { memo } from 'react';
import { LuCommand, LuKeyboard } from 'react-icons/lu';

const { Title, Text } = Typography;

interface KeyboardShortcutsModalProps {
    open: boolean;
    onClose: () => void;
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ open, onClose }) => {
    const { token } = theme.useToken();
    const shortcuts = getAllShortcuts();

    // Detect if Mac or Windows/Linux
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    const renderShortcutKey = (key: string) => {
        // Replace Ctrl with Cmd for Mac
        const displayKey = isMac ? key.replace('Ctrl', 'Cmd') : key;

        return (
            <Tag
                icon={displayKey.includes('Cmd') || displayKey.includes('Ctrl') ? <LuCommand size={12} /> : null}
                style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: 6,
                    background: token.colorFillTertiary,
                    border: `1px solid ${token.colorBorder}`,
                    color: token.colorText
                }}
            >
                {displayKey}
            </Tag>
        );
    };

    return (
        <Modal
            title={
                <Flex align="center" gap={8}>
                    <LuKeyboard size={20} />
                    <span>Keyboard Shortcuts</span>
                </Flex>
            }
            open={open}
            onCancel={onClose}
            footer={null}
            width={600}
        >
            <Flex vertical gap={24} style={{ marginTop: 16 }}>
                {/* Info Text */}
                <Text type="secondary" style={{ fontSize: 14 }}>
                    Use these keyboard shortcuts to navigate faster and boost your productivity.
                </Text>

                <Divider style={{ margin: 0 }} />

                {/* Shortcuts List */}
                <Flex vertical gap={16}>
                    {shortcuts.map((shortcut, index) => (
                        <Flex key={index} justify="space-between" align="center" gap={16}>
                            <Flex vertical gap={4} style={{ flex: 1 }}>
                                <Text strong style={{ fontSize: 14 }}>
                                    {shortcut.description}
                                </Text>
                            </Flex>
                            <div>
                                {renderShortcutKey(shortcut.display)}
                            </div>
                        </Flex>
                    ))}
                </Flex>

                <Divider style={{ margin: 0 }} />

                {/* Tips */}
                <Flex vertical gap={8} style={{
                    padding: 12,
                    background: token.colorInfoBg,
                    borderRadius: 8,
                    border: `1px solid ${token.colorInfoBorder}`
                }}>
                    <Text strong style={{ fontSize: 13, color: token.colorInfo }}>
                        💡 Pro Tips
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        • Keyboard shortcuts work from anywhere in the app
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        • Use <Tag style={{ fontSize: 11 }}>Escape</Tag> to close any modal or panel
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        • {isMac ? 'Cmd' : 'Ctrl'} key works as a modifier for most shortcuts
                    </Text>
                </Flex>
            </Flex>
        </Modal>
    );
};

export default memo(KeyboardShortcutsModal);
