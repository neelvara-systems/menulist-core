'use client'

import {
    createGrowthOSKitForProject,
    recordGrowthOSKitExport,
    refreshGrowthOSForProject,
    useGrowthOS,
} from '@hook/useGrowthOS';
import { isGrowthOSKitExpired } from '@lib/growthos/readiness';
import type { GrowthOSOutput } from '@type/growthos';
import { useMemo, useState } from 'react';
import { LuCopy, LuRefreshCw, LuSend, LuShieldCheck } from 'react-icons/lu';
import { Button, Card, Flex, Tag, Text, Toast } from '../antd';

interface GrowthKitsMobileCardProps {
    projectId?: string | null;
}

const copyText = async (text: string) => {
    if (navigator.clipboard?.writeText) {
        try {
            await Promise.race([
                navigator.clipboard.writeText(text),
                new Promise((_, reject) => window.setTimeout(() => reject(new Error('Clipboard write timed out')), 1200)),
            ]);
            return true;
        } catch {
            // Fall through to textarea copy for browsers that expose Clipboard API but block it.
        }
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);
    return copied;
};

const canUseOutput = (output: GrowthOSOutput) => output.preflight?.status !== 'blocked';

export default function GrowthKitsMobileCard({ projectId }: GrowthKitsMobileCardProps) {
    const { growthOSSummary, mutate } = useGrowthOS();
    const [isWorking, setIsWorking] = useState(false);
    const latestKit = growthOSSummary?.latestKit || null;
    const primaryAction = growthOSSummary?.primaryAction || null;
    const primaryOutput = useMemo(() => (
        latestKit?.outputs.find((output) => output.destination === 'whatsapp_message')
        || latestKit?.outputs.find((output) => output.destination === 'whatsapp_status')
        || latestKit?.outputs[0]
        || null
    ), [latestKit?.outputs]);
    const staffBrief = latestKit?.outputs.find((output) => output.destination === 'staff_brief') || null;
    const isStale = Boolean(latestKit?.isStale)
        || Boolean(latestKit?.sourceFactsHash && growthOSSummary?.sourceFactsHash && latestKit.sourceFactsHash !== growthOSSummary.sourceFactsHash)
        || isGrowthOSKitExpired(latestKit?.expiresAt);

    const refresh = async () => {
        if (!projectId) {
            Toast.show({ content: 'Select a menu first', duration: 1500 });
            return;
        }
        setIsWorking(true);
        try {
            const payload = await refreshGrowthOSForProject(projectId, true);
            await mutate(payload.data, { revalidate: false });
            Toast.show({ content: 'Growth Kits refreshed', duration: 1300 });
        } catch {
            Toast.show({
                content: latestKit ? 'Could not refresh. Latest kit is still available.' : 'Could not refresh Growth Kits.',
                duration: 2200,
            });
        } finally {
            setIsWorking(false);
        }
    };

    const createKit = async () => {
        if (!projectId) {
            Toast.show({ content: 'Select a menu first', duration: 1500 });
            return;
        }
        setIsWorking(true);
        try {
            const payload = await createGrowthOSKitForProject({
                projectId,
                actionId: primaryAction?.id,
            });
            await mutate(payload.data.summary, { revalidate: false });
            Toast.show({ content: 'Growth Kit ready', duration: 1300 });
        } catch {
            Toast.show({ content: 'Could not create Growth Kit', duration: 2000 });
        } finally {
            setIsWorking(false);
        }
    };

    const record = async (output: GrowthOSOutput, method: 'copy' | 'share' | 'mark_used') => {
        if (!latestKit) return;
        const payload = await recordGrowthOSKitExport({
            kitId: latestKit.id,
            destination: output.destination,
            method,
            outputId: output.id,
        });
        await mutate((current) => current ? {
            ...current,
            latestKit: current.latestKit ? {
                ...current.latestKit,
                status: method === 'mark_used' ? 'used' : method === 'copy' ? 'copied' : 'shared',
                isStale: typeof payload?.data?.isStale === 'boolean' ? payload.data.isStale : current.latestKit.isStale,
            } : current.latestKit,
        } : current, { revalidate: false });
    };

    const copyOutput = async (output: GrowthOSOutput | null) => {
        if (!output) return;
        if (!canUseOutput(output)) {
            Toast.show({ content: 'This output needs review first.', duration: 1800 });
            return;
        }
        if (isStale) {
            Toast.show({ content: 'This may use old menu details. Create it again before using.', duration: 2200 });
            return;
        }
        try {
            await record(output, 'copy');
            await copyText(output.text);
            Toast.show({ content: 'Copied', duration: 1200 });
        } catch {
            Toast.show({ content: 'Could not copy this kit.', duration: 1800 });
        }
    };

    const shareOutput = async (output: GrowthOSOutput | null) => {
        if (!output) return;
        if (!canUseOutput(output)) {
            Toast.show({ content: 'This output needs review first.', duration: 1800 });
            return;
        }
        if (isStale) {
            Toast.show({ content: 'This may use old menu details. Create it again before sharing.', duration: 2200 });
            return;
        }
        try {
            await record(output, 'share');
            if (navigator.share) {
                await navigator.share({ text: output.text });
            } else {
                await copyText(output.text);
            }
            Toast.show({ content: navigator.share ? 'Shared' : 'Copied', duration: 1200 });
        } catch {
            Toast.show({ content: 'Could not share this kit.', duration: 1800 });
        }
    };

    const markUsed = async (output: GrowthOSOutput) => {
        try {
            await record(output, 'mark_used');
            Toast.show({ content: 'Marked used', duration: 1200 });
        } catch {
            Toast.show({ content: 'Could not mark used.', duration: 1800 });
        }
    };

    return (
        <Card style={{ borderRadius: 20 }}>
            <Flex gap={12} vertical>
                <Flex align="flex-start" justify="space-between">
                    <Flex gap={4} vertical>
                        <Text type="secondary">Growth Kits</Text>
                        <Text strong style={{ fontSize: 17 }}>{latestKit?.title || primaryAction?.title || 'Ready to share'}</Text>
                    </Flex>
                    <Tag color={isStale ? 'warning' : 'primary'}>{isStale ? 'Check details' : 'Add-on'}</Tag>
                </Flex>

                {isStale ? (
                    <Text style={{ color: 'var(--adm-color-warning)' }}>
                        This kit may use old menu details. Create it again before using.
                    </Text>
                ) : null}

                {primaryOutput ? (
                    <Text
                        style={{
                            background: 'var(--adm-color-background)',
                            borderRadius: 12,
                            padding: 12,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                        }}
                    >
                        {primaryOutput.text}
                    </Text>
                ) : (
                    <Text type="secondary">Create a Growth Kit from the current menu action.</Text>
                )}

                <Flex gap={8} wrap>
                    <Button color="primary" loading={isWorking} onClick={primaryOutput ? () => copyOutput(primaryOutput) : createKit} style={{ minHeight: 44 }}>
                        <Flex align="center" gap={6}>
                            {primaryOutput ? <LuCopy size={16} /> : <LuShieldCheck size={16} />}
                            <Text>{primaryOutput ? 'Copy message' : 'Create kit'}</Text>
                        </Flex>
                    </Button>
                    {primaryOutput ? (
                        <Button fill="outline" onClick={() => shareOutput(primaryOutput)} style={{ minHeight: 44 }}>
                            <Flex align="center" gap={6}>
                                <LuSend size={16} />
                                <Text>Share</Text>
                            </Flex>
                        </Button>
                    ) : null}
                    <Button fill="none" loading={isWorking} onClick={refresh} style={{ minHeight: 44 }}>
                        <Flex align="center" gap={6}>
                            <LuRefreshCw size={16} />
                            <Text>Refresh</Text>
                        </Flex>
                    </Button>
                </Flex>

                {staffBrief ? (
                    <Flex
                        gap={8}
                        style={{
                            borderTop: '1px solid var(--adm-color-border)',
                            paddingTop: 10,
                        }}
                        vertical
                    >
                        <Text strong>Staff brief</Text>
                        <Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{staffBrief.text}</Text>
                        <Flex gap={8}>
                            <Button fill="outline" onClick={() => copyOutput(staffBrief)} style={{ minHeight: 44 }}>
                                Use staff line
                            </Button>
                            <Button fill="none" onClick={() => markUsed(staffBrief)} style={{ minHeight: 44 }}>
                                Mark used
                            </Button>
                        </Flex>
                    </Flex>
                ) : null}
            </Flex>
        </Card>
    );
}
