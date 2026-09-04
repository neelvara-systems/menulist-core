import { getEnabledBlocks } from '@config/decisionBlocks';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { getProjectDefaultLanguage } from '@lib/localization/projectContent';
import { buildDecisionChoiceCampaignPosterRenderInput } from '@lib/printable-asset-templates/campaignPoster';
import type { PrintableAssetRenderInput } from '@lib/printable-asset-templates/types';
import type { StoreDataType } from '@type/platform/store';
import { Alert, Button, Collapse, Flex, Modal, Select, Switch, Tooltip, Typography, theme } from 'antd';
import { useMemo, useState } from 'react';
import { LuDownload, LuHelpCircle, LuPin, LuStar, LuTrendingUp, LuZap } from 'react-icons/lu';
import CampaignPosterModal from '@/components/shared/printableAssets/CampaignPosterModal';
import { Project } from '../types';
import {
    applyDecisionBlockSettings,
    buildAllItemOptions,
    getCategoryName,
    getDecisionBlockSettings,
    getFilteredDecisionBlockOptionIds,
    hasDecisionBlockChanges,
    isPinnedItemUnavailable,
    trackDecisionBlockChanges,
} from './decisionBlocks.shared';

const { Text, Title } = Typography;
type BlockType = 'popular' | 'quickPick' | 'bestValue';

const FEATURED_BLOCK_LABELS: Record<BlockType, { title: string; subtitle: string }> = {
    popular: {
        title: 'Featured choice',
        subtitle: 'Shown first in the Featured section.',
    },
    quickPick: {
        title: 'Quick choice',
        subtitle: 'Shown as the quick option.',
    },
    bestValue: {
        title: 'Value choice',
        subtitle: 'Shown as the value option.',
    },
};

interface DecisionBlocksSettingsModalProps {
    open: boolean;
    projectData: Project;
    businessType?: string;
    businessCategory?: string;
    hasUnsavedProjectChanges?: boolean;
    onClose: () => void;
    onApply: (updatedProject: Project) => void;
    storeDetails?: StoreDataType | null;
}

const DecisionBlocksSettingsModal = ({
    open,
    projectData,
    businessType,
    businessCategory,
    hasUnsavedProjectChanges = false,
    onClose,
    onApply,
    storeDetails,
}: DecisionBlocksSettingsModalProps) => {
    const labels = useOfferingLabels();
    const { token } = theme.useToken();
    const activeLang = getProjectDefaultLanguage(projectData);

    // Get current settings or defaults
    const currentSettings = getDecisionBlockSettings(projectData);

    // Local state for settings
    const [enablePopular, setEnablePopular] = useState(currentSettings.enablePopular);
    const [enableQuickPick, setEnableQuickPick] = useState(currentSettings.enableQuickPick);
    const [enableBestValue, setEnableBestValue] = useState(currentSettings.enableBestValue);
    const [pinnedPopular, setPinnedPopular] = useState<string | undefined>(currentSettings.pinnedPopular);
    const [pinnedQuickPick, setPinnedQuickPick] = useState<string | undefined>(currentSettings.pinnedQuickPick);
    const [pinnedBestValue, setPinnedBestValue] = useState<string | undefined>(currentSettings.pinnedBestValue);
    const [posterInput, setPosterInput] = useState<PrintableAssetRenderInput | null>(null);
    const [posterChoiceTitle, setPosterChoiceTitle] = useState('Featured choice');

    // Build item options for dropdowns
    const itemOptions = useMemo(() => {
        const options = buildAllItemOptions(projectData.files || [], activeLang);
        return options.map(opt => ({
            ...opt,
            categoryName: getCategoryName(projectData.files || [], opt.category, activeLang),
        }));
    }, [projectData.files, activeLang]);

    // Get enabled blocks for this business type
    const enabledBlockTypes = useMemo(() => getEnabledBlocks(businessType, businessCategory), [businessType, businessCategory]);

    // Reset to initial state when modal opens
    const handleOpen = () => {
        const settings = getDecisionBlockSettings(projectData);
        setEnablePopular(settings.enablePopular);
        setEnableQuickPick(settings.enableQuickPick);
        setEnableBestValue(settings.enableBestValue);
        setPinnedPopular(settings.pinnedPopular);
        setPinnedQuickPick(settings.pinnedQuickPick);
        setPinnedBestValue(settings.pinnedBestValue);
    };

    // Check if there are changes
    const hasChanges = useMemo(() => hasDecisionBlockChanges(projectData, {
        enablePopular,
        enableQuickPick,
        enableBestValue,
        pinnedPopular,
        pinnedQuickPick,
        pinnedBestValue,
    }), [enableBestValue, enablePopular, enableQuickPick, pinnedBestValue, pinnedPopular, pinnedQuickPick, projectData]);

    // Apply changes
    const handleApply = () => {
        const nextSettings = {
            enablePopular,
            enableQuickPick,
            enableBestValue,
            pinnedPopular,
            pinnedQuickPick,
            pinnedBestValue,
        };
        trackDecisionBlockChanges(projectData, nextSettings);
        const updatedProject = applyDecisionBlockSettings(projectData, nextSettings);
        onApply(updatedProject);
    };

    // Filter options for select (remove already pinned items from other blocks)
    const getFilteredOptions = (currentBlock: BlockType) => {
        const pinnedIds = getFilteredDecisionBlockOptionIds(currentBlock, {
            enablePopular,
            enableQuickPick,
            enableBestValue,
            pinnedPopular,
            pinnedQuickPick,
            pinnedBestValue,
        });

        return itemOptions
            .filter(opt => !pinnedIds.has(opt.value))
            .map(opt => ({
                value: opt.value,
                label: (
                    <Flex justify="space-between" align="center">
                        <Text ellipsis style={{ maxWidth: 200 }}>{opt.label}</Text>
                        {opt.categoryName && (
                            <Text type="secondary" style={{ fontSize: 11 }}>{opt.categoryName}</Text>
                        )}
                    </Flex>
                ),
            }));
    };

    const renderBlockConfig = (
        blockType: BlockType,
        icon: React.ReactNode,
        enabled: boolean,
        setEnabled: (v: boolean) => void,
        pinnedId: string | undefined,
        setPinnedId: (v: string | undefined) => void
    ) => {
        const isBlockTypeEnabled = enabledBlockTypes.includes(blockType);

        // Check if pinned item is unavailable
        const pinnedStatus = isPinnedItemUnavailable(projectData.files || [], pinnedId);
        const savedPinnedId = blockType === 'popular'
            ? currentSettings.pinnedPopular
            : blockType === 'quickPick'
                ? currentSettings.pinnedQuickPick
                : currentSettings.pinnedBestValue;
        const savedEnabled = blockType === 'popular'
            ? currentSettings.enablePopular
            : blockType === 'quickPick'
                ? currentSettings.enableQuickPick
                : currentSettings.enableBestValue;

        // Don't render if block type is not enabled for this business type.
        if (!isBlockTypeEnabled) return null;

        const blockLabels = FEATURED_BLOCK_LABELS[blockType];
        const isCurrentSavedChoice = Boolean(
            enabled
            && savedEnabled
            && !hasUnsavedProjectChanges
            && pinnedId
            && pinnedId === savedPinnedId
            && !pinnedStatus.unavailable
        );
        const choicePosterInput = isCurrentSavedChoice
            ? buildDecisionChoiceCampaignPosterRenderInput({
                blockType,
                project: projectData,
                store: storeDetails,
            })
            : null;

        return (
            <Flex
                vertical
                gap={12}
                style={{
                    padding: 16,
                    borderRadius: 12,
                    background: enabled ? token.colorBgContainer : token.colorBgTextHover,
                    border: `1px solid ${enabled ? token.colorBorderSecondary : token.colorBorder}`,
                    opacity: enabled ? 1 : 0.7,
                    transition: 'all 0.2s ease',
                }}
            >
                {/* Header */}
                <Flex justify="space-between" align="center">
                    <Flex gap={8} align="center">
                        <div style={{
                            padding: 6,
                            borderRadius: 8,
                            background: enabled ? token.colorPrimaryBg : token.colorBgTextHover,
                            display: 'flex',
                        }}>
                            {icon}
                        </div>
                        <Flex vertical gap={0}>
                            <Text strong>{blockLabels.title}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{blockLabels.subtitle}</Text>
                        </Flex>
                    </Flex>
                    <Switch
                        aria-label={`Show ${blockLabels.title}`}
                        checked={enabled}
                        onChange={setEnabled}
                        checkedChildren="Show"
                        unCheckedChildren="Hide"
                    />
                </Flex>

                {/* Chosen item selector */}
                {enabled && (
                    <Flex vertical gap={4}>
                        <Flex gap={4} align="center">
                            <LuPin size={12} style={{ color: token.colorTextSecondary }} />
                            <Text type="secondary" style={{ fontSize: 12 }}>Item shown here</Text>
                            <Tooltip title="Choose an item for this choice. Leave it empty and MenuList chooses automatically.">
                                <LuHelpCircle size={12} style={{ color: token.colorTextSecondary, cursor: 'help' }} />
                            </Tooltip>
                        </Flex>
                        <Select
                            aria-label={`Select item for ${blockLabels.title}`}
                            allowClear
                            showSearch
                            placeholder="MenuList chooses automatically"
                            value={pinnedId}
                            onChange={(val) => setPinnedId(val || undefined)}
                            options={getFilteredOptions(blockType)}
                            filterOption={(input, option) => {
                                const item = itemOptions.find(i => i.value === option?.value);
                                return item?.label.toLowerCase().includes(input.toLowerCase()) || false;
                            }}
                            style={{ width: '100%' }}
                            status={pinnedStatus.unavailable ? 'warning' : undefined}
                        />
                        {/* Warning when pinned item is unavailable */}
                        {pinnedStatus.unavailable && pinnedId && (
                            <Alert
                                type="warning"
                                showIcon
                                message="Chosen item is currently unavailable"
                                description={`"${pinnedStatus.itemName}" is ${pinnedStatus.reason}. MenuList may show another available choice; if none qualifies, this choice stays hidden.`}
                                style={{ borderRadius: 8, marginTop: 8 }}
                            />
                        )}
                        {pinnedId && !pinnedStatus.unavailable ? (
                            <Tooltip
                                title={choicePosterInput
                                    ? `Preview, edit, and download the saved ${blockLabels.title} poster.`
                                    : 'Wait until this project is saved and make sure its public customer link is ready before creating the poster.'}
                            >
                                <Button
                                    block
                                    disabled={!choicePosterInput}
                                    icon={<LuDownload />}
                                    onClick={() => {
                                        if (!choicePosterInput) return;
                                        setPosterChoiceTitle(blockLabels.title);
                                        setPosterInput(choicePosterInput);
                                    }}
                                >
                                    Preview &amp; download poster
                                </Button>
                            </Tooltip>
                        ) : null}
                    </Flex>
                )}
            </Flex>
        );
    };

    return (
        <>
        <Modal
            title={
                <Flex vertical gap={4}>
                    <Title level={5} style={{ margin: 0 }}>Featured section</Title>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                        Choose which {labels.itemsPlural} appear as Featured choice, Quick choice, and Value choice on your public menu.
                    </Text>
                </Flex>
            }
            open={open}
            onCancel={onClose}
            afterOpenChange={(visible) => visible && handleOpen()}
            width={520}
            styles={{
                body: {
                    maxHeight: 'calc(100vh - 260px)',
                    overflowY: 'auto',
                },
            }}
            footer={(_, { CancelBtn }) => (
                <Flex justify="space-between">
                    <CancelBtn />
                    <Button type="primary" onClick={handleApply} disabled={!hasChanges}>
                        Save Changes
                    </Button>
                </Flex>
            )}
        >
            <Flex vertical gap={16} style={{ marginTop: 16 }}>
                {/* Info Alert */}
                <Alert
                    type="info"
                    showIcon
                    message="Featured choices are shown on the menu"
                    description="MenuList can choose automatically, or you can choose an item for each choice."
                    style={{ borderRadius: 8 }}
                />

                {/* Block Configurations */}
                {renderBlockConfig(
                    'popular',
                    <LuStar size={18} style={{ color: token.colorWarning }} />,
                    enablePopular,
                    setEnablePopular,
                    pinnedPopular,
                    setPinnedPopular
                )}

                {renderBlockConfig(
                    'quickPick',
                    <LuZap size={18} style={{ color: token.colorSuccess }} />,
                    enableQuickPick,
                    setEnableQuickPick,
                    pinnedQuickPick,
                    setPinnedQuickPick
                )}

                {renderBlockConfig(
                    'bestValue',
                    <LuTrendingUp size={18} style={{ color: token.colorPrimary }} />,
                    enableBestValue,
                    setEnableBestValue,
                    pinnedBestValue,
                    setPinnedBestValue
                )}

                {/* No blocks available message */}
                {enabledBlockTypes.length === 0 && (
                    <Alert
                        type="warning"
                        message="Featured section is not available"
                        description="Featured choices are not available for this business type."
                    />
                )}

                {enabledBlockTypes.length > 0 && (
                    <Collapse
                        ghost
                        size="small"
                        items={[
                            {
                                key: 'featured-owner-note',
                                label: <Text strong>Owner note</Text>,
                                children: (
                                    <Flex vertical gap={8}>
                                        <Text type="secondary">This changes only the Featured section. It does not change the normal menu order.</Text>
                                        <Text type="secondary">Leave a choice empty when you want MenuList to choose automatically.</Text>
                                        <Text type="secondary">Automatic choices stay within items that can be shown. Your selected item is used whenever it is available.</Text>
                                        <Text type="secondary">Hidden, unavailable, out-of-time, or repeated items may be skipped on the public menu.</Text>
                                    </Flex>
                                ),
                            },
                        ]}
                    />
                )}
            </Flex>
        </Modal>
        <CampaignPosterModal
            input={posterInput}
            introDescription={`Uses the saved ${posterChoiceTitle}, selected parent theme, current item details, and exact item link. Review it before downloading and placing it in-store.`}
            introTitle={`Prepared from ${posterChoiceTitle}`}
            onClose={() => setPosterInput(null)}
            onDownloaded={() => undefined}
            open={Boolean(posterInput)}
            sourceLabel={`Saved ${posterChoiceTitle}`}
            unavailableDescription="A saved selected item, active public listing, and customer link are required"
        />
        </>
    );
};

export default DecisionBlocksSettingsModal;
