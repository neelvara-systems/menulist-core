'use client'

import {
    createGrowthOSKitForProject,
    recordGrowthOSKitExport,
    refreshGrowthOSForProject,
    useGrowthOS,
} from '@hook/useGrowthOS';
import { getGrowthOSBoundedStringContext, logGrowthOSApiFailure } from '@lib/growthos/diagnostics';
import { isGrowthOSSummaryKitStale } from '@lib/growthos/todayTrigger';
import type { GrowthOSOutput, GrowthOSStaffBriefOutput } from '@type/growthos';
import { theme } from 'antd';
import { useMemo, useState } from 'react';
import { LuCopy, LuRefreshCw, LuSend, LuShieldCheck } from 'react-icons/lu';
import { Button, Card, Flex, Tag, Text, Toast } from '../antd';

interface GrowthKitsMobileCardProps {
    projectId?: string | null;
}

const MOBILE_GROWTHOS_COPY_CLIPBOARD_UNAVAILABLE = 'mobile_growthos_copy_clipboard_unavailable';
const MOBILE_GROWTHOS_COPY_FALLBACK_FAILED = 'mobile_growthos_copy_fallback_failed';

const buildMobileGrowthOSCopyError = (code: string) => Object.assign(new Error(code), { code });

const hasMobileGrowthOSClipboardWrite = () => (
    typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.writeText)
);

const hasMobileGrowthOSCopyFallback = () => (
    typeof document !== 'undefined'
    && Boolean(document.body)
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
);

const getMobileGrowthOSCopySupportContext = () => ({
    hasClipboardWrite: hasMobileGrowthOSClipboardWrite(),
    hasCopyFallback: hasMobileGrowthOSCopyFallback(),
});

const copyText = async (text: string) => {
    if (hasMobileGrowthOSClipboardWrite()) {
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
    if (!hasMobileGrowthOSCopyFallback()) {
        throw buildMobileGrowthOSCopyError(MOBILE_GROWTHOS_COPY_CLIPBOARD_UNAVAILABLE);
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw buildMobileGrowthOSCopyError(MOBILE_GROWTHOS_COPY_FALLBACK_FAILED);
        }
        return true;
    } finally {
        document.body.removeChild(textArea);
    }
};

const canUseOutput = (output: GrowthOSOutput) => output.preflight?.status !== 'blocked';
const isStaffBriefOutput = (output: GrowthOSOutput): output is GrowthOSStaffBriefOutput => (
    output.destination === 'staff_brief'
);
type MobileGrowthOSLogContext = Record<string, boolean | number | string | null | undefined>;

export default function GrowthKitsMobileCard({ projectId }: GrowthKitsMobileCardProps) {
    const { token } = theme.useToken();
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
    const staffBrief = latestKit?.outputs.find(isStaffBriefOutput) || null;
    const counterPrompt = latestKit?.outputs.find((output) => output.destination === 'counter_prompt') || null;
    const isStale = isGrowthOSSummaryKitStale(growthOSSummary);
    const primaryOutputBlocked = Boolean(primaryOutput && !canUseOutput(primaryOutput));
    const canUsePrimaryOutput = Boolean(primaryOutput && !primaryOutputBlocked && !isStale);
    const needsNewPack = !primaryOutput || isStale || primaryOutputBlocked;
    const buildMobileGrowthOSLogContext = (
        flow: string,
        output?: GrowthOSOutput | null,
        metadata: MobileGrowthOSLogContext = {},
    ): MobileGrowthOSLogContext => ({
        surface: 'mobile_growth_kits',
        flow,
        hasLatestKit: Boolean(latestKit),
        hasPrimaryAction: Boolean(primaryAction),
        isStale,
        primaryOutputBlocked,
        outputTextLength: output?.text?.length || 0,
        ...getGrowthOSBoundedStringContext('projectId', projectId),
        ...getGrowthOSBoundedStringContext('kitId', latestKit?.id),
        ...getGrowthOSBoundedStringContext('actionId', primaryAction?.id),
        ...getGrowthOSBoundedStringContext('outputId', output?.id),
        ...getGrowthOSBoundedStringContext('destination', output?.destination),
        ...metadata,
    });

    const logMobileGrowthOSFailure = (
        failureCode: string,
        error: unknown,
        flow: string,
        output?: GrowthOSOutput | null,
        metadata: MobileGrowthOSLogContext = {},
    ) => {
        logGrowthOSApiFailure('[GrowthOS Mobile] Operation failed', failureCode, error, buildMobileGrowthOSLogContext(flow, output, metadata));
    };

    const refresh = async () => {
        if (!projectId) {
            Toast.show({ content: 'Select a menu first', duration: 1500 });
            return;
        }
        setIsWorking(true);
        try {
            const payload = await refreshGrowthOSForProject(projectId, true);
            await mutate(payload.data, { revalidate: false });
            Toast.show({ content: 'Menu checked', duration: 1300 });
        } catch (error) {
            logMobileGrowthOSFailure('mobile_growthos_refresh_failed', error, 'refresh');
            Toast.show({
                content: latestKit ? 'Could not check menu. Latest pack is still here.' : 'Could not check menu.',
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
            Toast.show({ content: 'Sales Pack ready', duration: 1300 });
        } catch (error) {
            logMobileGrowthOSFailure('mobile_growthos_generate_failed', error, 'generate');
            Toast.show({ content: 'Could not prepare Sales Pack', duration: 2000 });
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
            const copied = await copyText(output.text);
            if (!copied) throw new Error('mobile_growthos_copy_failed');
            await record(output, 'copy');
            Toast.show({ content: 'Copied', duration: 1200 });
        } catch (error) {
            logMobileGrowthOSFailure('mobile_growthos_copy_failed', error, 'copy', output, getMobileGrowthOSCopySupportContext());
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
            if (navigator.share) {
                await navigator.share({ text: output.text });
            } else {
                const copied = await copyText(output.text);
                if (!copied) throw new Error('mobile_growthos_share_fallback_copy_failed');
            }
            await record(output, 'share');
            Toast.show({ content: navigator.share ? 'Shared' : 'Copied', duration: 1200 });
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            logMobileGrowthOSFailure('mobile_growthos_share_failed', error, 'share', output, {
                ...getMobileGrowthOSCopySupportContext(),
                usedNativeShare: Boolean(navigator.share),
            });
            Toast.show({ content: 'Could not share this kit.', duration: 1800 });
        }
    };

    const markUsed = async (output: GrowthOSOutput) => {
        if (!canUseOutput(output) || isStale) {
            Toast.show({ content: 'Update this pack before marking it used.', duration: 1800 });
            return;
        }
        try {
            await record(output, 'mark_used');
            Toast.show({ content: 'Marked used', duration: 1200 });
        } catch (error) {
            logMobileGrowthOSFailure('mobile_growthos_mark_used_failed', error, 'mark_used', output);
            Toast.show({ content: 'Could not mark used.', duration: 1800 });
        }
    };

    return (
        <Card style={{ borderRadius: 20 }}>
            <Flex gap={12} vertical>
                <Flex align="flex-start" justify="space-between">
                    <Flex gap={4} vertical>
                        <Text type="secondary">Today&apos;s Sales Pack</Text>
                        <Text strong style={{ fontSize: 17 }}>{latestKit?.title || primaryAction?.title || 'Prepare today&apos;s message'}</Text>
                    </Flex>
                    <Tag color={isStale || primaryOutputBlocked ? 'warning' : latestKit ? 'success' : 'primary'}>
                        {isStale ? 'Update' : primaryOutputBlocked ? 'Review' : latestKit ? 'Ready' : 'Prepare'}
                    </Tag>
                </Flex>

                {!needsNewPack ? (
                    <Flex gap={6} wrap>
                        <Tag color="success">Menu checked</Tag>
                        <Tag color="primary">Customer</Tag>
                        <Tag color="primary">Staff</Tag>
                        {counterPrompt ? <Tag color="primary">Counter</Tag> : null}
                    </Flex>
                ) : null}

                {isStale || primaryOutputBlocked ? (
                    <Text
                        style={{
                            background: token.colorWarningBg,
                            borderRadius: 12,
                            color: token.colorWarningText,
                            padding: 12,
                        }}
                    >
                        {isStale ? 'Menu details changed. Update this pack before copying or sharing.' : 'This message needs review before use.'}
                    </Text>
                ) : null}

                {primaryOutput && !needsNewPack ? (
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
                    <Text type="secondary">Prepare one customer message, one staff line, and one counter line from the selected menu.</Text>
                )}

                <Flex gap={8} wrap>
                    <Button color="primary" loading={isWorking} onClick={canUsePrimaryOutput ? () => copyOutput(primaryOutput) : createKit} style={{ minHeight: 44 }}>
                        <Flex align="center" gap={6}>
                            {canUsePrimaryOutput ? <LuCopy size={16} /> : <LuShieldCheck size={16} />}
                            <Text>{canUsePrimaryOutput ? 'Copy WhatsApp' : isStale ? 'Update pack' : 'Prepare pack'}</Text>
                        </Flex>
                    </Button>
                    {canUsePrimaryOutput ? (
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
                            <Text>Check menu</Text>
                        </Flex>
                    </Button>
                </Flex>

                {staffBrief && !needsNewPack ? (
                    <Flex
                        gap={8}
                        style={{
                            borderTop: '1px solid var(--adm-color-border)',
                            paddingTop: 10,
                        }}
                        vertical
                    >
                        <Text strong>Staff line</Text>
                        <Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{staffBrief.mainLine || staffBrief.text}</Text>
                        <Flex gap={8}>
                            <Button fill="outline" onClick={() => copyOutput(staffBrief)} style={{ minHeight: 44 }}>
                                Copy staff line
                            </Button>
                            <Button fill="none" onClick={() => markUsed(staffBrief)} style={{ minHeight: 44 }}>
                                Done
                            </Button>
                        </Flex>
                    </Flex>
                ) : null}

                {counterPrompt && !needsNewPack ? (
                    <Flex
                        gap={8}
                        style={{
                            borderTop: staffBrief ? undefined : '1px solid var(--adm-color-border)',
                            paddingTop: staffBrief ? 0 : 10,
                        }}
                        vertical
                    >
                        <Text strong>Counter line</Text>
                        <Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{counterPrompt.text}</Text>
                        <Button fill="outline" onClick={() => copyOutput(counterPrompt)} style={{ minHeight: 44, width: 'fit-content' }}>
                            Copy counter line
                        </Button>
                    </Flex>
                ) : null}
            </Flex>
        </Card>
    );
}
