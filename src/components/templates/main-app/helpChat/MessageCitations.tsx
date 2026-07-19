'use client';

import type { AnswerlatticePublicCitation } from '@type/answerlattice';
import { Flex, Typography, theme } from 'antd';
import { LuExternalLink } from 'react-icons/lu';

const { Link, Text } = Typography;

export default function MessageCitations({
    citations,
    isMobile = false,
}: {
    citations: AnswerlatticePublicCitation[];
    isMobile?: boolean;
}) {
    const { token } = theme.useToken();
    if (!citations.length) return null;

    return (
        <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>
                Approved sources
            </Text>
            <Flex gap={6} wrap="wrap" vertical={isMobile}>
                {citations.map(citation => (
                    <Link
                        key={citation.id}
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            alignItems: 'center',
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: token.borderRadius,
                            display: 'inline-flex',
                            gap: 6,
                            maxWidth: isMobile ? '100%' : 280,
                            padding: '6px 8px',
                        }}
                    >
                        <LuExternalLink size={13} aria-hidden />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {citation.title}
                        </span>
                    </Link>
                ))}
            </Flex>
        </div>
    );
}
