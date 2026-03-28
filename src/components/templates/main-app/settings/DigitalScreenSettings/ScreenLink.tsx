"use client";

/**
 * Screen Link Section
 * Per spec v2.0: Two URLs per store — Menu Board (default) + Highlights
 * Per spec: FR-9 - One URL base per store (bookmarkable)
 * 
 * Menu Board: /screen/{token}               → full menu with prices
 * Highlights: /screen/{token}?mode=highlights → rotating promotional slides
 */

import { CheckOutlined, CopyOutlined, DesktopOutlined, LinkOutlined, PlaySquareOutlined } from "@ant-design/icons";
import { Button, Input, message, Space, Tag, Tooltip, Typography } from "antd";
import { useState } from "react";

const { Text } = Typography;

interface ScreenLinkProps {
    screenUrl: string;
    screenToken: string;
}

export default function ScreenLink({ screenUrl, screenToken }: ScreenLinkProps) {
    const [copiedMenu, setCopiedMenu] = useState(false);
    const [copiedHighlights, setCopiedHighlights] = useState(false);

    const highlightsUrl = `${screenUrl}?mode=highlights`;

    const handleCopy = async (url: string, type: 'menu' | 'highlights') => {
        try {
            await navigator.clipboard.writeText(url);
            if (type === 'menu') {
                setCopiedMenu(true);
                setTimeout(() => setCopiedMenu(false), 2000);
            } else {
                setCopiedHighlights(true);
                setTimeout(() => setCopiedHighlights(false), 2000);
            }
            message.success('Link copied to clipboard');
        } catch (error) {
            message.error('Failed to copy link');
        }
    };

    return (
        <div className="screen-link-section">
            {/* Menu Board Link (Default) */}
            <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DesktopOutlined style={{ color: '#1677ff' }} />
                    <Text strong>Menu Board</Text>
                    <Tag color="blue">Main TV</Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    Full menu with categories, items, and prices — for your counter or ordering screen
                </Text>
                <Space.Compact style={{ width: '100%' }}>
                    <Input
                        value={screenUrl}
                        readOnly
                        style={{ fontFamily: 'monospace', fontSize: 13 }}
                        prefix={<LinkOutlined style={{ color: '#999' }} />}
                    />
                    <Tooltip title={copiedMenu ? 'Copied!' : 'Copy link'}>
                        <Button
                            type="primary"
                            icon={copiedMenu ? <CheckOutlined /> : <CopyOutlined />}
                            onClick={() => handleCopy(screenUrl, 'menu')}
                        >
                            {copiedMenu ? 'Copied' : 'Copy'}
                        </Button>
                    </Tooltip>
                </Space.Compact>
                <Button
                    type="link"
                    size="small"
                    onClick={() => window.open(screenUrl, '_blank')}
                    style={{ padding: 0, marginTop: 4 }}
                >
                    Preview Menu Board →
                </Button>
            </div>

            {/* Highlights Link */}
            <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PlaySquareOutlined style={{ color: '#722ed1' }} />
                    <Text strong>Highlights</Text>
                    <Tag color="purple">Second TV</Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    Rotating promotional slides with featured items — for entrance or waiting area
                </Text>
                <Space.Compact style={{ width: '100%' }}>
                    <Input
                        value={highlightsUrl}
                        readOnly
                        style={{ fontFamily: 'monospace', fontSize: 13 }}
                        prefix={<LinkOutlined style={{ color: '#999' }} />}
                    />
                    <Tooltip title={copiedHighlights ? 'Copied!' : 'Copy link'}>
                        <Button
                            icon={copiedHighlights ? <CheckOutlined /> : <CopyOutlined />}
                            onClick={() => handleCopy(highlightsUrl, 'highlights')}
                        >
                            {copiedHighlights ? 'Copied' : 'Copy'}
                        </Button>
                    </Tooltip>
                </Space.Compact>
                <Button
                    type="link"
                    size="small"
                    onClick={() => window.open(highlightsUrl, '_blank')}
                    style={{ padding: 0, marginTop: 4 }}
                >
                    Preview Highlights →
                </Button>
            </div>

            {/* Setup Tip */}
            <div
                style={{
                    padding: 12,
                    background: '#f6ffed',
                    borderRadius: 8,
                    border: '1px solid #b7eb8f'
                }}
            >
                <Text style={{ fontSize: 13 }}>
                    <strong>Setup tip:</strong> Open the Menu Board link on your counter TV and the Highlights
                    link on your entrance TV. Bookmark both — they refresh automatically and work offline.
                </Text>
            </div>

            <style jsx>{`
                .screen-link-section {
                    padding: 0;
                }
            `}</style>
        </div>
    );
}
