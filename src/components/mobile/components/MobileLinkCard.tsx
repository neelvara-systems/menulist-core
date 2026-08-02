'use client'

import { theme } from 'antd';
import { LuCopy, LuExternalLink, LuQrCode, LuShare2 } from 'react-icons/lu';
import { Button, Card, Flex, Text } from '../antd';

interface MobileLinkCardProps {
    compact?: boolean;
    description: string;
    icon: React.ReactNode;
    isPrimary?: boolean;
    label: string;
    onCopy: () => void;
    onOpen: () => void;
    onShare?: () => void;
    onShowQr: () => void;
    value: string;
}

export default function MobileLinkCard({
    compact,
    description,
    icon,
    isPrimary,
    label,
    onCopy,
    onOpen,
    onShare,
    onShowQr,
    value,
}: MobileLinkCardProps) {
    const { token } = theme.useToken();

    return (
        <Card style={{ borderRadius: compact ? 20 : 24 }}>
            <Flex gap={compact ? 12 : 14} vertical>
                <Flex align="center" justify="space-between">
                    <Flex align="center" gap={12} style={{ flex: 1, minWidth: 0 }}>
                        <IconBadge tint={token.colorFillAlter}>
                            {icon}
                        </IconBadge>
                        <Flex gap={2} style={{ flex: 1, minWidth: 0 }} vertical>
                            <Text strong style={{ color: token.colorText, fontSize: isPrimary ? (compact ? 14 : 15) : (compact ? 13 : 14) }}>
                                {label}
                            </Text>
                            <Text style={{ color: token.colorTextSecondary, fontSize: compact ? 11 : 12 }}>{description}</Text>
                        </Flex>
                    </Flex>
                </Flex>

                <Card
                    size="small"
                    style={{
                        backgroundColor: token.colorFillAlter,
                        borderColor: token.colorBorderSecondary,
                        borderRadius: compact ? 14 : 16,
                    }}
                >
                    <Text style={{ color: token.colorText, fontSize: compact ? 11 : 12, wordBreak: 'break-all' }}>
                        {value}
                    </Text>
                </Card>

                <Flex gap={compact ? 8 : 10}>
                    <ActionTile ariaLabel={`Copy ${label}`} compact={compact} icon={<LuCopy size={18} />} onClick={onCopy} />
                    {onShare ? <ActionTile ariaLabel={`Share ${label}`} compact={compact} icon={<LuShare2 size={18} />} onClick={onShare} /> : null}
                    <ActionTile ariaLabel={`Show QR code for ${label}`} compact={compact} icon={<LuQrCode size={18} />} onClick={onShowQr} />
                    <ActionTile ariaLabel={`Open ${label}`} compact={compact} icon={<LuExternalLink size={18} />} onClick={onOpen} />
                </Flex>
            </Flex>
        </Card>
    );
}

function ActionTile({ ariaLabel, compact, icon, onClick }: { ariaLabel: string; compact?: boolean; icon: React.ReactNode; onClick: () => void }) {
    const { token } = theme.useToken();

    return (
        <Button
            ariaLabel={ariaLabel}
            fill="outline"
            onClick={onClick}
            size="small"
            style={{
                borderColor: token.colorBorderSecondary,
                borderRadius: compact ? 14 : 16,
                flex: 1,
                minHeight: compact ? 44 : 48,
                minWidth: 0,
                paddingBlock: 0,
                paddingInline: 0,
            }}
        >
            <Flex align="center" justify="center" style={{ color: token.colorText, minHeight: 20 }}>
                {icon}
            </Flex>
        </Button>
    );
}

function IconBadge({ children, tint }: { children: React.ReactNode; tint: string }) {
    return (
        <Flex
            align="center"
            justify="center"
            style={{
                backgroundColor: tint,
                borderRadius: 16,
                height: 44,
                minWidth: 44,
                width: 44,
            }}
        >
            {children}
        </Flex>
    );
}
