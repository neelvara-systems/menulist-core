import { getBlockLabels, getEnabledBlocks } from '@config/decisionBlocks';
import { trackOwnerControlUsage } from '@database/ownerControlUsage';
import { removeObjRef } from '@util/utils';
import { Alert, Button, Flex, Modal, Select, Switch, Tooltip, Typography, theme } from 'antd';
import { useMemo, useState } from 'react';
import { LuHelpCircle, LuPin, LuStar, LuTrendingUp, LuZap } from 'react-icons/lu';
import { Project, ProjectFileType } from '../types';

const { Text, Title } = Typography;

interface DecisionBlocksSettingsModalProps {
    open: boolean;
    projectData: Project;
    businessType?: string;
    onClose: () => void;
    onApply: (updatedProject: Project) => void;
}

interface ItemOption {
    value: string;
    label: string;
    category: string;
}

// Build all items from all files for the dropdown
function buildAllItemOptions(files: ProjectFileType[], activeLang: string): ItemOption[] {
    const options: ItemOption[] = [];
    files?.forEach(file => {
        if (!file.extractedData?.data?.items) return;
        file.extractedData.data.items.forEach(item => {
            if (item.active === false) return; // Skip inactive items
            const name = item.name?.[activeLang] || item.name?.['en'] || 'Untitled item';
            options.push({
                value: item.id,
                label: name,
                category: item.category || '',
            });
        });
    });
    return options;
}

/**
 * Check if a pinned item is currently unavailable
 * Used to show admin warning when pinned item won't be displayed to customers
 * 
 * IMPORTANT: Owner pin does NOT override availability
 * If pinned item is unavailable, system will use next candidate
 * This warning helps owner understand why their pin isn't showing
 */
function isPinnedItemUnavailable(
    files: ProjectFileType[],
    pinnedId: string | undefined
): { unavailable: boolean; itemName?: string; reason?: string } {
    if (!pinnedId) return { unavailable: false };

    for (const file of files || []) {
        const items = file.extractedData?.data?.items || [];
        const item = items.find(i => i.id === pinnedId);

        if (item) {
            // Check if item is unavailable
            if (item.available === false) {
                const name = item.name?.['en'] || 'This item';
                return {
                    unavailable: true,
                    itemName: name,
                    reason: 'marked as unavailable'
                };
            }
            if (item.active === false) {
                const name = item.name?.['en'] || 'This item';
                return {
                    unavailable: true,
                    itemName: name,
                    reason: 'disabled'
                };
            }
            // Item exists and is available
            return { unavailable: false };
        }
    }

    // Item not found (might have been deleted)
    return {
        unavailable: true,
        itemName: 'Pinned item',
        reason: 'not found (may have been deleted)'
    };
}

// Get category name by ID
function getCategoryName(files: ProjectFileType[], categoryId: string, activeLang: string): string {
    for (const file of files || []) {
        const cat = file.extractedData?.data?.categories?.find(c => c.id === categoryId);
        if (cat) {
            return cat.name?.[activeLang] || cat.name?.['en'] || 'Unknown';
        }
    }
    return '';
}

const DecisionBlocksSettingsModal = ({
    open,
    projectData,
    businessType,
    onClose,
    onApply
}: DecisionBlocksSettingsModalProps) => {
    const { token } = theme.useToken();
    const activeLang = projectData.languages?.[0] || 'en';

    // Get current settings or defaults
    const currentSettings = projectData.menuSettings?.decisionBlocks || {};

    // Local state for settings
    const [enablePopular, setEnablePopular] = useState(currentSettings.enablePopular !== false);
    const [enableQuickPick, setEnableQuickPick] = useState(currentSettings.enableQuickPick !== false);
    const [enableBestValue, setEnableBestValue] = useState(currentSettings.enableBestValue !== false);
    const [pinnedPopular, setPinnedPopular] = useState<string | undefined>(currentSettings.pinnedPopular);
    const [pinnedQuickPick, setPinnedQuickPick] = useState<string | undefined>(currentSettings.pinnedQuickPick);
    const [pinnedBestValue, setPinnedBestValue] = useState<string | undefined>(currentSettings.pinnedBestValue);

    // Build item options for dropdowns
    const itemOptions = useMemo(() => {
        const options = buildAllItemOptions(projectData.files || [], activeLang);
        return options.map(opt => ({
            ...opt,
            categoryName: getCategoryName(projectData.files || [], opt.category, activeLang),
        }));
    }, [projectData.files, activeLang]);

    // Get enabled blocks for this business type
    const enabledBlockTypes = useMemo(() => getEnabledBlocks(businessType), [businessType]);

    // Get labels for each block
    const popularLabels = useMemo(() => getBlockLabels('popular', businessType), [businessType]);
    const quickPickLabels = useMemo(() => getBlockLabels('quickPick', businessType), [businessType]);
    const bestValueLabels = useMemo(() => getBlockLabels('bestValue', businessType), [businessType]);

    // Reset to initial state when modal opens
    const handleOpen = () => {
        const settings = projectData.menuSettings?.decisionBlocks || {};
        setEnablePopular(settings.enablePopular !== false);
        setEnableQuickPick(settings.enableQuickPick !== false);
        setEnableBestValue(settings.enableBestValue !== false);
        setPinnedPopular(settings.pinnedPopular);
        setPinnedQuickPick(settings.pinnedQuickPick);
        setPinnedBestValue(settings.pinnedBestValue);
    };

    // Check if there are changes
    const hasChanges = useMemo(() => {
        const settings = projectData.menuSettings?.decisionBlocks || {};
        return (
            enablePopular !== (settings.enablePopular !== false) ||
            enableQuickPick !== (settings.enableQuickPick !== false) ||
            enableBestValue !== (settings.enableBestValue !== false) ||
            pinnedPopular !== settings.pinnedPopular ||
            pinnedQuickPick !== settings.pinnedQuickPick ||
            pinnedBestValue !== settings.pinnedBestValue
        );
    }, [enablePopular, enableQuickPick, enableBestValue, pinnedPopular, pinnedQuickPick, pinnedBestValue, projectData.menuSettings?.decisionBlocks]);

    // Apply changes
    const handleApply = () => {
        const updatedProject = removeObjRef(projectData) as Project;
        const currentSettings = projectData.menuSettings?.decisionBlocks || {};

        // Track Decision Block setting changes (Authority Maturation Doctrine)
        // Track enable/disable toggles
        if (enablePopular !== (currentSettings.enablePopular !== false)) {
            trackOwnerControlUsage('enablePopular', {
                previousValue: currentSettings.enablePopular !== false,
                newValue: enablePopular,
                projectId: projectData.projectId,
            });
        }
        if (enableQuickPick !== (currentSettings.enableQuickPick !== false)) {
            trackOwnerControlUsage('enableQuickPick', {
                previousValue: currentSettings.enableQuickPick !== false,
                newValue: enableQuickPick,
                projectId: projectData.projectId,
            });
        }
        if (enableBestValue !== (currentSettings.enableBestValue !== false)) {
            trackOwnerControlUsage('enableBestValue', {
                previousValue: currentSettings.enableBestValue !== false,
                newValue: enableBestValue,
                projectId: projectData.projectId,
            });
        }
        // Track pinned item changes
        if (pinnedPopular !== currentSettings.pinnedPopular) {
            trackOwnerControlUsage('pinnedPopular', {
                previousValue: currentSettings.pinnedPopular,
                newValue: pinnedPopular,
                projectId: projectData.projectId,
            });
        }
        if (pinnedQuickPick !== currentSettings.pinnedQuickPick) {
            trackOwnerControlUsage('pinnedQuickPick', {
                previousValue: currentSettings.pinnedQuickPick,
                newValue: pinnedQuickPick,
                projectId: projectData.projectId,
            });
        }
        if (pinnedBestValue !== currentSettings.pinnedBestValue) {
            trackOwnerControlUsage('pinnedBestValue', {
                previousValue: currentSettings.pinnedBestValue,
                newValue: pinnedBestValue,
                projectId: projectData.projectId,
            });
        }

        // Initialize menuSettings if not exists
        if (!updatedProject.menuSettings) {
            updatedProject.menuSettings = {};
        }

        // Update decision blocks settings
        updatedProject.menuSettings.decisionBlocks = {
            enablePopular,
            enableQuickPick,
            enableBestValue,
            pinnedPopular,
            pinnedQuickPick,
            pinnedBestValue,
        };

        onApply(updatedProject);
        onClose();
    };

    // Filter options for select (remove already pinned items from other blocks)
    const getFilteredOptions = (currentBlock: 'popular' | 'quickPick' | 'bestValue') => {
        const pinnedIds = new Set<string>();
        if (currentBlock !== 'popular' && pinnedPopular) pinnedIds.add(pinnedPopular);
        if (currentBlock !== 'quickPick' && pinnedQuickPick) pinnedIds.add(pinnedQuickPick);
        if (currentBlock !== 'bestValue' && pinnedBestValue) pinnedIds.add(pinnedBestValue);

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
        blockType: 'popular' | 'quickPick' | 'bestValue',
        icon: React.ReactNode,
        labels: { title: string; subtitle: string } | null,
        enabled: boolean,
        setEnabled: (v: boolean) => void,
        pinnedId: string | undefined,
        setPinnedId: (v: string | undefined) => void
    ) => {
        const isBlockTypeEnabled = enabledBlockTypes.includes(blockType);

        // Check if pinned item is unavailable
        const pinnedStatus = isPinnedItemUnavailable(projectData.files || [], pinnedId);

        // Don't render if block type is not enabled or labels are null
        if (!isBlockTypeEnabled || !labels) return null;

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
                            <Text strong>{labels.title}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{labels.subtitle}</Text>
                        </Flex>
                    </Flex>
                    <Switch
                        checked={enabled}
                        onChange={setEnabled}
                        checkedChildren="Show"
                        unCheckedChildren="Hide"
                    />
                </Flex>

                {/* Pin Item Selector */}
                {enabled && (
                    <Flex vertical gap={4}>
                        <Flex gap={4} align="center">
                            <LuPin size={12} style={{ color: token.colorTextSecondary }} />
                            <Text type="secondary" style={{ fontSize: 12 }}>Pin specific item (optional)</Text>
                            <Tooltip title="Pin an item to always show it in this block, overriding the automatic selection">
                                <LuHelpCircle size={12} style={{ color: token.colorTextSecondary, cursor: 'help' }} />
                            </Tooltip>
                        </Flex>
                        <Select
                            allowClear
                            showSearch
                            placeholder="Auto-select based on data"
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
                                message="Pinned item is currently unavailable"
                                description={`"${pinnedStatus.itemName}" is ${pinnedStatus.reason}. The next best available item will be shown to customers instead.`}
                                style={{ borderRadius: 8, marginTop: 8 }}
                            />
                        )}
                    </Flex>
                )}
            </Flex>
        );
    };

    return (
        <Modal
            title={
                <Flex vertical gap={4}>
                    <Title level={5} style={{ margin: 0 }}>Smart Recommendations</Title>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                        Configure which items appear in Decision Blocks on your menu
                    </Text>
                </Flex>
            }
            open={open}
            onCancel={onClose}
            afterOpenChange={(visible) => visible && handleOpen()}
            width={520}
            footer={
                <Flex justify="space-between">
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="primary" onClick={handleApply} disabled={!hasChanges}>
                        Save Changes
                    </Button>
                </Flex>
            }
        >
            <Flex vertical gap={16} style={{ marginTop: 16 }}>
                {/* Info Alert */}
                <Alert
                    type="info"
                    showIcon
                    message="These blocks help customers decide faster"
                    description="Items are automatically selected based on popularity, prep time, and value. You can override by pinning specific items."
                    style={{ borderRadius: 8 }}
                />

                {/* Block Configurations */}
                {renderBlockConfig(
                    'popular',
                    <LuStar size={18} style={{ color: token.colorWarning }} />,
                    popularLabels,
                    enablePopular,
                    setEnablePopular,
                    pinnedPopular,
                    setPinnedPopular
                )}

                {renderBlockConfig(
                    'quickPick',
                    <LuZap size={18} style={{ color: token.colorSuccess }} />,
                    quickPickLabels,
                    enableQuickPick,
                    setEnableQuickPick,
                    pinnedQuickPick,
                    setPinnedQuickPick
                )}

                {renderBlockConfig(
                    'bestValue',
                    <LuTrendingUp size={18} style={{ color: token.colorPrimary }} />,
                    bestValueLabels,
                    enableBestValue,
                    setEnableBestValue,
                    pinnedBestValue,
                    setPinnedBestValue
                )}

                {/* No blocks available message */}
                {enabledBlockTypes.length === 0 && (
                    <Alert
                        type="warning"
                        message="No Decision Blocks available"
                        description="Decision Blocks are not available for this business type."
                    />
                )}
            </Flex>
        </Modal>
    );
};

export default DecisionBlocksSettingsModal;
