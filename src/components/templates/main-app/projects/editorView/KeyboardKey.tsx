import { Tag, theme } from 'antd';
import { LuCommand } from 'react-icons/lu';

interface KeyboardKeyProps {
    keyName: string;
    isMac?: boolean;
}

/**
 * Reusable component for displaying keyboard keys with proper styling
 * Automatically detects Mac vs Windows and shows appropriate key labels
 */
export default function KeyboardKey({ keyName, isMac }: KeyboardKeyProps) {
    const { token } = theme.useToken();

    // Replace Ctrl with Cmd for Mac
    const displayKey = isMac ? keyName.replace('Ctrl', 'Cmd') : keyName;

    // Show command icon for Cmd/Ctrl keys
    const showIcon = displayKey.includes('Cmd') || displayKey.includes('Ctrl');

    return (
        <Tag
            icon={showIcon ? <LuCommand size={12} /> : null}
            style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 6,
                background: token.colorFillTertiary,
                border: `1px solid ${token.colorBorder}`,
                color: token.colorText,
                fontFamily: displayKey.length === 1 ? 'monospace' : 'inherit'
            }}
        >
            {displayKey}
        </Tag>
    );
}
