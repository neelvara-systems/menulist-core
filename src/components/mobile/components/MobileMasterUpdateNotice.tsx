'use client'

import useMasterUpdateAwareness from '@hook/useMasterUpdateAwareness';
import { buildSummaryText } from '@lib/multiOutlet/masterUpdateDiff';
import type { Project } from '@template/main-app/projects/types/project.types';
import type { MasterUpdateDiff, OperationalChange } from '@type/multiOutlet.types';
import { useMemo, useState } from 'react';
import { LuBell, LuCheck, LuX } from 'react-icons/lu';
import { Button, Card, Flex, Popup, Tag, Text, Title } from '../antd';

interface MobileMasterUpdateNoticeProps {
    project: Project | null;
    onProjectUpdate: (updates: Partial<Project>) => void;
}

function formatChangeType(type: OperationalChange['type']) {
    return type
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function getVisibleChanges(diff: MasterUpdateDiff | null) {
    if (!diff?.changes?.length) return [];
    return diff.changes.slice(0, 80);
}

export default function MobileMasterUpdateNotice({
    project,
    onProjectUpdate,
}: MobileMasterUpdateNoticeProps) {
    const [detailOpen, setDetailOpen] = useState(false);
    const {
        acknowledge,
        diff,
        hasHistory,
        isAcknowledging,
        lastDiff,
        showBanner,
    } = useMasterUpdateAwareness(project, onProjectUpdate);

    const activeDiff = diff || lastDiff;
    const visibleChanges = useMemo(() => getVisibleChanges(activeDiff), [activeDiff]);

    if (!project?.masterProjectId || (!showBanner && !hasHistory)) {
        return null;
    }

    const summary = activeDiff ? buildSummaryText(activeDiff) : '';
    const isHistoryView = !showBanner;

    const handleAcknowledge = async () => {
        await acknowledge();
        setDetailOpen(false);
    };

    return (
        <>
            <Card
                size="small"
                style={{
                    backgroundColor: showBanner ? '#eef6ff' : undefined,
                    borderColor: showBanner ? '#91caff' : undefined,
                    marginBottom: 0,
                }}
            >
                <Flex align="center" gap={10} justify="space-between">
                    <Flex align="center" gap={10} style={{ minWidth: 0 }}>
                        <LuBell size={18} />
                        <Flex gap={2} style={{ minWidth: 0 }} vertical>
                            <Text strong>{showBanner ? 'Main menu updated' : 'Last main menu changes'}</Text>
                            {summary ? (
                                <Text style={{ fontSize: 12, lineHeight: 1.3 }} type="secondary">
                                    {summary}
                                </Text>
                            ) : null}
                        </Flex>
                    </Flex>
                    <Button fill="outline" onClick={() => setDetailOpen(true)} size="small">
                        Review
                    </Button>
                </Flex>
            </Card>

            <Popup
                bodyStyle={{ maxHeight: '82vh', overflow: 'hidden', padding: 0 }}
                onMaskClick={() => setDetailOpen(false)}
                visible={detailOpen && Boolean(activeDiff)}
            >
                <Flex style={{ maxHeight: '82vh' }} vertical>
                    <Flex
                        align="center"
                        justify="space-between"
                        style={{
                            backgroundColor: '#fff',
                            borderBottom: '1px solid #f0f0f0',
                            minHeight: 52,
                            padding: '6px 12px',
                        }}
                    >
                        <div style={{ minHeight: 40, minWidth: 40 }} />
                        <Title level={4} style={{ lineHeight: 1.2, margin: 0, textAlign: 'center' }}>
                            {isHistoryView ? 'Last changes' : 'Main menu updates'}
                        </Title>
                        <Button
                            fill="none"
                            onClick={() => setDetailOpen(false)}
                            style={{ minHeight: 40, minWidth: 40, paddingInline: 0 }}
                        >
                            <LuX size={18} />
                        </Button>
                    </Flex>

                    <Flex gap={10} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 }} vertical>
                        {visibleChanges.map((change) => (
                            <div
                                key={`${change.type}-${change.entityId}`}
                                style={{
                                    border: '1px solid #f0f0f0',
                                    borderRadius: 8,
                                    padding: '10px 12px',
                                }}
                            >
                                <Flex gap={6} vertical>
                                    <Flex align="center" gap={8} justify="space-between">
                                        <Text strong style={{ minWidth: 0 }}>{change.entityName}</Text>
                                        <Tag>{formatChangeType(change.type)}</Tag>
                                    </Flex>
                                    {change.oldValue || change.newValue ? (
                                        <Text style={{ fontSize: 12 }} type="secondary">
                                            {change.oldValue || 'Not set'} → {change.newValue || 'Not set'}
                                        </Text>
                                    ) : null}
                                    {change.outletContext?.impactNote ? (
                                        <Text style={{ fontSize: 12, lineHeight: 1.35 }} type="secondary">
                                            {change.outletContext.impactNote}
                                        </Text>
                                    ) : null}
                                    {change.outletContext?.hasOverride ? (
                                        <Tag color="warning">Has outlet change</Tag>
                                    ) : null}
                                </Flex>
                            </div>
                        ))}

                        {activeDiff && activeDiff.changes.length > visibleChanges.length ? (
                            <Text style={{ textAlign: 'center' }} type="secondary">
                                +{activeDiff.changes.length - visibleChanges.length} more changes
                            </Text>
                        ) : null}
                    </Flex>

                    <Flex gap={8} style={{ borderTop: '1px solid #f0f0f0', padding: '12px 12px calc(12px + env(safe-area-inset-bottom))' }}>
                        <Button block fill="outline" onClick={() => setDetailOpen(false)}>
                            Close
                        </Button>
                        {!isHistoryView ? (
                            <Button block color="primary" loading={isAcknowledging} onClick={handleAcknowledge}>
                                <Flex align="center" gap={6} justify="center">
                                    <LuCheck size={16} />
                                    Got it
                                </Flex>
                            </Button>
                        ) : null}
                    </Flex>
                </Flex>
            </Popup>
        </>
    );
}
