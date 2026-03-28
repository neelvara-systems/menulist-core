import { Button, Card, Flex, Typography, theme } from 'antd';
import { LuArrowLeft, LuDollarSign, LuEyeOff, LuFolderInput, LuToggleRight } from 'react-icons/lu';
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
    SelectedItemInfo,
} from '../../types/commandCenter.types';
import ActiveInactiveAction from './actions/ActiveInactiveAction';
import AvailabilityAction from './actions/AvailabilityAction';
import MoveCategoryAction from './actions/MoveCategoryAction';
import PricingAction from './actions/PricingAction';

const { Text } = Typography;

type ActionDef = {
    key: CommandCenterAction;
    icon: React.ReactNode;
    title: string;
    description: string;
};

const ACTIONS: ActionDef[] = [
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
                        Select items in the left panel first.
                    </Text>
                )}
                <Flex vertical gap={8}>
                    {ACTIONS.map((action) => (
                        <Card
                            key={action.key}
                            size="small"
                            hoverable={hasSelection}
                            onClick={() => hasSelection && onActionSelect(action.key)}
                            style={{
                                borderRadius: 10,
                                cursor: hasSelection ? 'pointer' : 'not-allowed',
                                opacity: hasSelection ? 1 : 0.5,
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
                    ))}
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
                {activeAction === 'pricing' && (
                    <PricingAction
                        selectedItems={selectedItems}
                        onPreviewChange={onPricingPreview}
                        onConfigReady={onPricingConfigReady}
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
