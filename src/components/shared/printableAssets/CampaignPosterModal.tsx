'use client';

import type { PrintableAssetRenderInput } from '@lib/printable-asset-templates/types';
import { Flex, Tag, Typography } from 'antd';
import { LuBadgePercent } from 'react-icons/lu';
import PrintableAssetWorkflowModal, { type PrintableAssetWorkflowDownload } from './PrintableAssetWorkflowModal';

const { Text } = Typography;

export default function CampaignPosterModal({
    input,
    introDescription = 'Uses the current Today campaign, selected parent theme, and correct customer destination. Review it before downloading and placing it in-store.',
    introTitle = 'Prepared from Today',
    onClose,
    onDownloaded,
    open,
    sourceLabel = 'Today campaign',
    unavailableDescription = 'A current campaign, selected project, and public customer link are required',
}: {
    input: PrintableAssetRenderInput | null;
    introDescription?: string;
    introTitle?: string;
    onClose: () => void;
    onDownloaded: (result: PrintableAssetWorkflowDownload) => Promise<void> | void;
    open: boolean;
    sourceLabel?: string;
    unavailableDescription?: string;
}) {
    const campaign = input?.campaignContent;
    let isExactItemDestination = false;
    try {
        isExactItemDestination = Boolean(input?.menuUrl && new URL(input.menuUrl).searchParams.get('item'));
    } catch {
        isExactItemDestination = false;
    }

    return (
        <PrintableAssetWorkflowModal
            assetTitle="Campaign Poster"
            icon={<LuBadgePercent />}
            input={input}
            introDescription={introDescription}
            introTitle={introTitle}
            metadata={campaign ? (
                <Flex gap={6} wrap="wrap">
                    <Tag>{campaign.headline}</Tag>
                    {campaign.offer ? <Tag>{campaign.offer}</Tag> : null}
                    <Text type="secondary">QR opens {isExactItemDestination ? 'this exact item' : 'the selected customer page'}.</Text>
                </Flex>
            ) : null}
            onClose={onClose}
            onDownloaded={onDownloaded}
            open={open}
            previewAlt={`Campaign Poster preview${campaign?.offer ? ` for ${campaign.offer}` : ''}`}
            previewAspectRatio="210 / 297"
            previewMaxHeight={560}
            productLabel="MenuList Campaign Poster"
            sourceLabel={sourceLabel}
            unavailableDescription={unavailableDescription}
        />
    );
}
