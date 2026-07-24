'use client'
import { helpCenterChangelogRouting } from '@constant/navigations';
import { Button, Card, Flex, Grid, Modal, Typography, message } from 'antd';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { LuArrowRight } from 'react-icons/lu';

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { fetchAnswerlatticePublicChangelogPage } from '@lib/answerlattice/publicContentClient';
import { useAnswerlatticePublicContentRequestScope } from '@hook/answerlattice/useAnswerlatticeCacheScope';
import ChangelogPreview from '@template/platform/changelog/ChangelogPreview';
import ChangelogTagRenderer from '@template/platform/changelog/ChangelogTagRenderer';
import { ChangelogEntry, ChangelogPage } from '@type/changelog';
import type { AnswerlatticePublicChangelogEntry, AnswerlatticePublicChangelogPage } from '@lib/answerlattice/publicContentBoundary';

const { Text, Title, Paragraph } = Typography;

const getPlainTextFromDescription = (description: ChangelogEntry['description'] | AnswerlatticePublicChangelogEntry['description']): string => {
    if (!description || typeof description !== 'object') return '';

    const extractText = (node: any): string => {
        if (!node) return '';
        if (node.type === 'text') {
            return node.text || '';
        }
        if (Array.isArray(node.content)) {
            return node.content.map(extractText).join(' ');
        }
        return '';
    };

    if (Array.isArray(description.content)) {
        return description.content.map(extractText).join(' ').replace(/\s+/g, ' ').trim();
    }

    return '';
};

const getExcerpt = (entry: ChangelogEntry | AnswerlatticePublicChangelogEntry, maxLength = 160): string | null => {
    const plain = getPlainTextFromDescription(entry.description);
    if (!plain) return null;
    if (plain.length <= maxLength) return plain;
    return `${plain.slice(0, maxLength - 1)}…`;
};

function WhatsNew() {
    const t = useTranslations('HelpCenter');
    const router = useRouter();
    const screens = Grid.useBreakpoint();
    const [selectedEntry, setSelectedEntry] = useState<AnswerlatticePublicChangelogEntry | null>(null);
    const [changelog, setChangelog] = useState<AnswerlatticePublicChangelogPage | null>(null);
    const requestScope = useAnswerlatticePublicContentRequestScope();

    useEffect(() => {
        if (!requestScope) return;
        let mounted = true;
        setChangelog(null);
        fetchAnswerlatticePublicChangelogPage(requestScope)
            .then((changelogData) => {
                if (mounted) setChangelog(changelogData);
            })
            .catch(() => {
                if (mounted) message.error(t('failedToLoadChangelog'));
            });
        return () => {
            mounted = false;
        };
    }, [requestScope, t]);

    const latestEntries = useMemo(() => changelog?.entries?.slice(0, 3) || [], [changelog?.entries]);
    const isMobile = screens.md === false;

    return (
        <Card variant='borderless' style={{ width: '100%' }}>
            <Flex vertical gap="large">
                <Flex justify="space-between" align="center">
                    <Title level={4} style={{ margin: 0 }}>{t('whatsNewTitle')}</Title>
                    <Button type='text' size='small' icon={<LuArrowRight />} iconPosition='end' onClick={() => router.push(helpCenterChangelogRouting())}>{t('viewAll')}</Button>
                </Flex>
                {latestEntries.map((update) => {
                    const excerpt = getExcerpt(update);
                    return (
                        <Card
                            key={update.id}
                            hoverable
                            style={{ width: '100%', cursor: 'pointer' }}
                            styles={{ body: { padding: 16 } }}
                            onClick={() => setSelectedEntry(update)}
                        >
                            <Flex vertical gap="middle">
                                <Flex justify="space-between" align="center" wrap>
                                    <Flex gap={8} wrap>
                                        {update.tags?.map(tag => (
                                            <ChangelogTagRenderer key={tag} tag={tag} />
                                        ))}
                                    </Flex>
                                    {update.version && <Text type="secondary">Version {update.version}</Text>}
                                </Flex>
                                <Title level={5} style={{ margin: 0 }}>{update.title}</Title>
                                {excerpt && (
                                    <Paragraph type="secondary" style={{ margin: 0 }}>{excerpt}</Paragraph>
                                )}
                                <Flex justify="space-between" align="center">
                                    <DateTimeDisplay value={update.releasedOn} mode="date" label="Released" style={{ fontSize: 12 }} />
                                    <Button type="link" icon={<LuArrowRight />} iconPosition='end'>{t('learnMore')}</Button>
                                </Flex>
                            </Flex>
                        </Card>
                    );
                })}
            </Flex>

            <Modal
                open={!!Boolean(selectedEntry)}
                onCancel={() => setSelectedEntry(null)}
                footer={null}
                width={isMobile ? '100vw' : 800}
                style={{ top: isMobile ? 0 : 20, maxWidth: isMobile ? '100vw' : undefined, margin: isMobile ? 0 : undefined }}
                styles={{
                    body: { maxHeight: isMobile ? '100dvh' : 'calc(100vh - 80px)', overflowY: 'auto', padding: isMobile ? 10 : undefined },
                    content: { borderRadius: isMobile ? 0 : undefined, minHeight: isMobile ? '100dvh' : undefined, padding: isMobile ? 8 : undefined },
                }}
            >
                {selectedEntry && (<ChangelogPreview item={selectedEntry} mode="modal" pageId={changelog?.id || ''} />)}
            </Modal>
        </Card>
    );
}

export default WhatsNew;
