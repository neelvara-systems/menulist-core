import { Flex, Typography } from 'antd';
import KeyboardKey from './KeyboardKey';

const { Text } = Typography;

interface KeyboardShortcutDisplayProps {
    keys: string[];
    isMac?: boolean;
    separator?: string;
}

/**
 * Reusable component for displaying a sequence of keyboard keys
 * Automatically adds separators between keys
 * 
 * @example
 * <KeyboardShortcutDisplay keys={['Cmd', 'S']} isMac={true} />
 * // Renders: [⌘ Cmd] + [S]
 * 
 * <KeyboardShortcutDisplay keys={['Cmd', 'Shift', 'N']} isMac={true} />
 * // Renders: [⌘ Cmd] + [Shift] + [N]
 */
export default function KeyboardShortcutDisplay({
    keys,
    isMac = false,
    separator = '+'
}: KeyboardShortcutDisplayProps) {
    return (
        <Flex gap={4} align="center">
            {keys.map((key, keyIndex) => (
                <Flex key={keyIndex} align="center" gap={4}>
                    <KeyboardKey keyName={key} isMac={isMac} />
                    {keyIndex < keys.length - 1 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {separator}
                        </Text>
                    )}
                </Flex>
            ))}
        </Flex>
    );
}
