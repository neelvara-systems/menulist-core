/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEV-ONLY COMPONENT: Clear All Chat Data Button
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ⚠️ THIS COMPONENT IS EXCLUDED FROM PRODUCTION BUILDS
 * 
 * PURPOSE:
 * --------
 * Provides a quick way for developers to clear the current user's loaded chat
 * sessions during development/testing.
 * 
 * WHY THIS EXISTS:
 * ----------------
 * During development, we frequently need to test the chat system with a fresh
 * user conversation list. This button removes only the loaded user sessions
 * through the same DAL used by normal single-session deletion.
 * 
 * WHAT IT DELETES:
 * ----------------
 * 1. chatSessions      - The current user's loaded conversations
 * 2. Firebase Storage  - Images owned by successfully deleted sessions
 * 
 * SAFETY MECHANISMS:
 * ------------------
 * - Triple environment check (component render, handler, database function)
 * - Confirmation modal with clear warning
 * - Only rendered in development (process.env.NODE_ENV !== 'production')
 * - The action is omitted from production UI and rejected by its DAL guard
 * 
 * USAGE:
 * ------
 * 1. Import this component in ChatHistory.tsx
 * 2. Render it conditionally: {process.env.NODE_ENV !== 'production' && <DevOnlyClearDataButton />}
 * 3. Pass onClearAllData handler from useChatHandlers
 * 
 * MAINTENANCE NOTES:
 * ------------------
 * - Keep deletion routed through the normal Answerlattice chat DAL
 * - Do not add client deletion for analytics or embedding collections
 * - Keep this file in the same directory as ChatHistory.tsx for co-location
 * 
 * CREATED: 2025-01-23
 * AUTHOR: Development Team
 * LAST MODIFIED: 2025-01-23
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

'use client'

import { Button, Modal, Typography, theme } from 'antd';
import { LuTrash2 } from 'react-icons/lu';

const { Text } = Typography;

interface DevOnlyClearDataButtonProps {
    /**
     * Handler function to clear all chat data
     * Should come from useChatHandlers.handleClearAllData
     */
    onClearAllData: () => void;
}

/**
 * DEV-ONLY: Button to clear all chat data from database
 * 
 * This component renders a danger button that, when clicked, shows a 
 * confirmation modal and then deletes all documents from chat-related 
 * Firestore collections.
 * 
 * @param onClearAllData - Handler that performs the actual deletion
 * @returns Button component (only in development)
 */
const DevOnlyClearDataButton = ({ onClearAllData }: DevOnlyClearDataButtonProps) => {
    const { token } = theme.useToken();

    // Defensive check: Should never render in production
    // But if it somehow does, return null
    if (process.env.NODE_ENV === 'production') {
        return null;
    }

    /**
     * Show confirmation modal before deletion
     * 
     * Modal warns user about:
     * - Which collections will be deleted
     * - Irreversibility of action
     * - Dev-only nature of this feature
     */
    const handleClick = () => {
        Modal.confirm({
            title: 'Delete your loaded chats?',
            content: (
                <div>
                    <Text>This will permanently delete the chats currently loaded for your signed-in user:</Text>
                    <ul style={{ marginTop: 8, marginBottom: 8 }}>
                        <li><Text code>chatSessions</Text> - Your loaded chat conversations</li>
                        <li><Text code>Firebase Storage</Text> - Images owned by those chats</li>
                    </ul>
                    <Text strong style={{ color: token.colorError }}>
                        This action cannot be undone!
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                        Chat records are deleted before their owned image files are cleaned up.
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        This is a development tool. It&apos;s disabled in production for safety.
                    </Text>
                </div>
            ),
                okText: 'Delete loaded chats',
            cancelText: 'Cancel',
            okButtonProps: {
                danger: true,
                size: 'middle'
            },
            centered: true,
            onOk: onClearAllData,
            width: 520
        });
    };

    return (
        <Button
            danger
            shape='circle'
            icon={<LuTrash2 />}
            onClick={handleClick}
            aria-label="Clear all chat data (development only)"
        />
    );
};

export default DevOnlyClearDataButton;
