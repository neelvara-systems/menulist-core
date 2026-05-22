import { Button, Card, Flex, Typography, theme } from 'antd';
import { LuArrowLeft, LuDollarSign, LuEyeOff, LuFolderInput, LuPen, LuSparkles, LuToggleRight } from 'react-icons/lu';
import type { Project } from '../../types';
import type {
    ActiveInactivePreview,
    ActiveInactiveTarget,
    AvailabilityPreview,
    AvailabilityTarget,
    CommandCenterAction,
    ImpactSummary,
    MoveCategoryPreview,
    PricingConfig,
    RepairMenuSummary,
    SelectedItemInfo,
} from '../../types/commandCenter.types';
import type { LanguageIssueSummary } from '../languageRepair.shared';
import ActiveInactiveAction from './actions/ActiveInactiveAction';
import AvailabilityAction from './actions/AvailabilityAction';
import MoveCategoryAction from './actions/MoveCategoryAction';
import PricingAction from './actions/PricingAction';
import RepairMenuAction from './actions/RepairMenuAction';
import TextCaseAction from './actions/TextCaseAction';
import type { TextCaseConfig, TextCasePreview } from '../textCase.shared';

const { Text } = Typography;

type ActionDef = {
    key: CommandCenterAction;
    icon: React.ReactNode;
    title: string;
    description: string;
    requiresSelection?: boolean;
};

const ACTIONS: ActionDef[] = [
    {
        key: 'repairMenu',
        icon: <LuSparkles style={{ fontSize: 20 }} />,
        title: 'Repair Menu',
        description: 'Fix missing descriptions, language gaps, and project detail translations',
        requiresSelection: false,
    },
    {
        key: 'pricing',
        icon: <LuDollarSign style={{ fontSize: 20 }} />,
        title: 'Adjust Pricing',
        description: 'Increase or decrease prices by percentage, flat amount, or set a fixed price',
    },
    {
        key: 'availability',
        icon: <LuToggleRight style={{ fontSize: 20 }} />,
        title: 'Change Availability',
        description: 'Mark items as available or unavailable (sold out)',
    },
    {
        key: 'moveCategory',
        icon: <LuFolderInput style={{ fontSize: 20 }} />,
        title: 'Move to Category',
        description: 'Move selected items to a different category',
    },
    {
        key: 'textCase',
        icon: <LuPen style={{ fontSize: 20 }} />,
        title: 'Fix Text Case',
        description: 'Clean category names, item names, descriptions, and attribute names',
        requiresSelection: false,
    },
    {
        key: 'activeInactive',
        icon: <LuEyeOff style={{ fontSize: 20 }} />,
        title: 'Show or Hide Items',
        description: 'Permanently show or hide items from the customer menu',
    },
];

interface ActionEngineProps {
    activeAction: CommandCenterAction | null;
    onActionSelect: (action: CommandCenterAction) => void;
    onBack: () => void;
    selectedItems: SelectedItemInfo[];
    projectData: Project;
    hasSelection: boolean;
    repairSummary: RepairMenuSummary;
    repairLanguageIssues: LanguageIssueSummary[];
    isRepairing: boolean;
    repairStep: string | null;
    onTextCasePreview: (preview: TextCasePreview | null) => void;
    onTextCaseConfigReady: (config: TextCaseConfig | null) => void;
    // Pricing callbacks
    onPricingPreview: (preview: ImpactSummary | null) => void;
    onPricingConfigReady: (config: PricingConfig | null) => void;
    // Availability callbacks
    onAvailabilityPreview: (preview: AvailabilityPreview | null) => void;
    onAvailabilityConfigReady: (target: AvailabilityTarget | null) => void;
    // Move category callbacks
    onMoveCategoryPreview: (preview: MoveCategoryPreview | null) => void;
    onMoveCategoryConfigReady: (destinationId: string | null) => void;
    // Active/inactive callbacks
    onActiveInactivePreview: (preview: ActiveInactivePreview | null) => void;
    onActiveInactiveConfigReady: (target: ActiveInactiveTarget | null) => void;
}

export default function ActionEngine({
    activeAction,
    onActionSelect,
    onBack,
    selectedItems,
    projectData,
    hasSelection,
    repairSummary,
    repairLanguageIssues,
    isRepairing,
    repairStep,
    onTextCasePreview,
    onTextCaseConfigReady,
    onPricingPreview,
    onPricingConfigReady,
    onAvailabilityPreview,
    onAvailabilityConfigReady,
    onMoveCategoryPreview,
    onMoveCategoryConfigReady,
    onActiveInactivePreview,
    onActiveInactiveConfigReady,
}: ActionEngineProps) {
    const { token } = theme.useToken();

    // Action list (default state)
    if (!activeAction) {
        return (
            <Flex vertical gap={12} style={{ padding: 16 }}>
                <Text strong style={{ fontSize: 14 }}>Choose action</Text>
                {!hasSelection && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Most actions need selected items. Repair Menu can run for the full menu.
                    </Text>
                )}
                <Flex vertical gap={8}>
                    {ACTIONS.map((action) => {
                        const isEnabled = hasSelection || action.requiresSelection === false;
                        return (
                            <Card
                                key={action.key}
                                size="small"
                                hoverable={isEnabled}
                                onClick={() => isEnabled && onActionSelect(action.key)}
                                style={{
                                    borderRadius: 10,
                                    cursor: isEnabled ? 'pointer' : 'not-allowed',
                                    opacity: isEnabled ? 1 : 0.5,
                                }}
                                styles={{ body: { padding: 12 } }}
                            >
                                <Flex gap={12} align="center">
                                    <div
                                        style={{
                                            padding: 8,
                                            borderRadius: 8,
                                            background: token.colorPrimaryBg,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {action.icon}
                                    </div>
                                    <Flex vertical gap={2} style={{ flex: 1 }}>
                                        <Text strong style={{ fontSize: 13 }}>
                                            {action.title}
                                        </Text>
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            {action.description}
                                        </Text>
                                    </Flex>
                                </Flex>
                            </Card>
                        );
                    })}
                </Flex>
            </Flex>
        );
    }

    // Active action UI
    const actionTitle = ACTIONS.find((a) => a.key === activeAction)?.title || '';

    return (
        <Flex vertical style={{ padding: 16, height: '100%' }}>
            {/* Breadcrumb / back */}
            <Flex align="center" gap={8} style={{ marginBottom: 16 }}>
                <Button
                    type="text"
                    size="small"
                    icon={<LuArrowLeft />}
                    onClick={onBack}
                    style={{ padding: '0 4px' }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>Actions</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>/</Text>
                <Text strong style={{ fontSize: 13 }}>{actionTitle}</Text>
            </Flex>

            {/* Action-specific UI */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {activeAction === 'repairMenu' && (
                    <RepairMenuAction
                        summary={repairSummary}
                        languageIssues={repairLanguageIssues}
                        isRepairing={isRepairing}
                        repairStep={repairStep}
                    />
                )}
                {activeAction === 'pricing' && (
                    <PricingAction
                        selectedItems={selectedItems}
                        onPreviewChange={onPricingPreview}
                        onConfigReady={onPricingConfigReady}
                    />
                )}
                {activeAction === 'textCase' && (
                    <TextCaseAction
                        projectData={projectData}
                        onPreviewChange={onTextCasePreview}
                        onConfigReady={onTextCaseConfigReady}
                    />
                )}
                {activeAction === 'availability' && (
                    <AvailabilityAction
                        selectedItems={selectedItems}
                        onPreviewChange={onAvailabilityPreview}
                        onConfigReady={onAvailabilityConfigReady}
                    />
                )}
                {activeAction === 'moveCategory' && (
                    <MoveCategoryAction
                        selectedItems={selectedItems}
                        projectData={projectData}
                        onPreviewChange={onMoveCategoryPreview}
                        onConfigReady={onMoveCategoryConfigReady}
                    />
                )}
                {activeAction === 'activeInactive' && (
                    <ActiveInactiveAction
                        selectedItems={selectedItems}
                        onPreviewChange={onActiveInactivePreview}
                        onConfigReady={onActiveInactiveConfigReady}
                    />
                )}
            </div>
        </Flex>
    );
}
