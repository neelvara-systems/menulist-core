/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEV-ONLY COMPONENT: Clear All Chat Data Button
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ⚠️ THIS COMPONENT IS EXCLUDED FROM PRODUCTION BUILDS
 * 
 * PURPOSE:
 * --------
 * Provides a quick way for developers to clear all chat-related database 
 * collections during development/testing without manually deleting from 
 * Firestore Console.
 * 
 * WHY THIS EXISTS:
 * ----------------
 * During development, we frequently need to test the chat system with fresh 
 * data. Manually deleting from 3 different Firestore collections 
 * (aiSearchHistory, chatSessions, queryEmbeddings) is time-consuming and 
 * error-prone. This button does it in one click.
 * 
 * WHAT IT DELETES:
 * ----------------
 * 1. aiSearchHistory   - All AI search history records (analytics)
 * 2. chatSessions      - All chat conversations
 * 3. queryEmbeddings   - All cached vector embeddings
 * 
 * SAFETY MECHANISMS:
 * ------------------
 * - Triple environment check (component render, handler, database function)
 * - Confirmation modal with clear warning
 * - Only rendered in development (process.env.NODE_ENV !== 'production')
 * - Uses tree-shaking: This entire component is removed from production bundle
 * 
 * USAGE:
 * ------
 * 1. Import this component in ChatHistory.tsx
 * 2. Render it conditionally: {process.env.NODE_ENV !== 'production' && <DevOnlyClearDataButton />}
 * 3. Pass onClearAllData handler from useChatHandlers
 * 
 * MAINTENANCE NOTES:
 * ------------------
 * - If you add new chat-related collections, update the deletion logic in 
 *   /src/database/devUtils/index.ts
 * - Update the modal content below to reflect new collections
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
            title: '⚠️ Delete ALL Chat Data?',
            content: (
                <div>
                    <Text>This will permanently delete ALL data from:</Text>
                    <ul style={{ marginTop: 8, marginBottom: 8 }}>
                        <li><Text code>aiSearchHistory</Text> - All AI search analytics</li>
                        <li><Text code>chatSessions</Text> - All chat conversations</li>
                        <li><Text code>queryEmbeddings</Text> - All cached embeddings</li>
                        <li><Text code>Firebase Storage</Text> - All uploaded chat images</li>
                    </ul>
                    <Text strong style={{ color: token.colorError }}>
                        This action cannot be undone!
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                        💡 This deletes both database records AND storage files to prevent orphaned data.
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        🔒 This is a development tool. It&apos;s disabled in production for safety.
                    </Text>
                </div>
            ),
            okText: 'Yes, Delete Everything',
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
