import { FEATURE_FLAGS } from "@config/features";
import { useOfferingLabels } from '@hook/useOfferingLabels';
import type { OfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { Badge, Button, Card, Flex, Popover, theme, Typography } from "antd";
import { useMemo, useState } from "react";
import { LuArrowUpDown, LuImage, LuLanguages, LuLayoutGrid, LuMoreVertical, LuSettings2, LuSparkles, LuZap } from "react-icons/lu";

const { Text } = Typography;

export type EditorAction = 'language' | 'description' | 'images' | 'activeInactive' | 'reorder' | 'decisionBlocks' | 'storeCustomization' | 'commandCenter';

type ActionConfig = {
    key: EditorAction;
    icon: React.ReactNode;
    title: string;
    description: string;
    outletOnly?: boolean; // Only show for outlet stores (isMasterLinked = true)
    isNew?: boolean; // Show "New" badge for discovery
};

function getActions(labels: OfferingLabels): ActionConfig[] {
    return [
        {
            key: 'commandCenter',
            icon: <LuLayoutGrid style={{ fontSize: 20 }} />,
            title: labels.commandCenterLabel,
            description: 'Bulk update prices, availability, and categories for many items at once',
            isNew: true
        },
        {
            key: 'language',
            icon: <LuLanguages style={{ fontSize: 20 }} />,
            title: 'Manage Languages',
            description: labels.languageDesc
        },
        {
            key: 'description',
            icon: <LuSparkles style={{ fontSize: 20 }} />,
            title: 'Generate Descriptions',
            description: labels.descriptionDesc
        },
        {
            key: 'images',
            icon: <LuImage style={{ fontSize: 20 }} />,
            title: 'Add Images',
            description: labels.imagesDesc
        },
        {
            key: 'reorder',
            icon: <LuArrowUpDown style={{ fontSize: 20 }} />,
            title: labels.rearrangeLabel,
            description: 'Change the order of categories and items'
        },
        {
            key: 'decisionBlocks',
            icon: <LuZap style={{ fontSize: 20 }} />,
            title: 'Smart Recommendations',
            description: 'Configure which items appear in Popular, Quick Pick, and Best Value blocks'
        },
        {
            key: 'storeCustomization',
            icon: <LuSettings2 style={{ fontSize: 20 }} />,
            title: 'Store Customization',
            description: 'Manage local prices, stock status, and bestsellers for your store',
            outletOnly: true,
            isNew: true
        }
    ];
}

type EditorActionsPopoverProps = {
    onActionClick: (action: EditorAction) => void;
    isMasterLinked?: boolean; // True if this is an outlet store linked to master
};

export default function EditorActionsPopover({
    onActionClick,
    isMasterLinked = false
}: EditorActionsPopoverProps) {
    const { token } = theme.useToken();
    const [open, setOpen] = useState(false);
    const labels = useOfferingLabels();

    // Filter actions based on store type and feature flags
    const visibleActions = useMemo(() => {
        return getActions(labels).filter(action => {
            // Only show outlet-only actions if this is an outlet store AND feature is enabled
            if (action.outletOnly) {
                return FEATURE_FLAGS.ENABLE_MULTI_OUTLET && isMasterLinked;
            }
            // Gate command center behind feature flag
            if (action.key === 'commandCenter') {
                return FEATURE_FLAGS.ENABLE_MENU_COMMAND_CENTER;
            }
            return true;
        });
    }, [isMasterLinked, labels]);

    const content = (
        <Flex vertical gap={12} style={{ width: "100%" }}>
            {visibleActions.map((action) => (
                <Card
                    key={action.key}
                    size="small"
                    hoverable
                    onClick={() => {
                        setOpen(false);
                        onActionClick(action.key);
                    }}
                    style={{ borderRadius: 14 }}
                    styles={{ body: { padding: 12 } }}
                >
                    <Badge.Ribbon text="New" color="green" style={{ display: action.isNew ? 'block' : 'none' }}>
                        <Flex gap={12} align="flex-start">
                            <div style={{
                                padding: 8,
                                borderRadius: 8,
                                background: token.colorPrimaryBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {action.icon}
                            </div>
                            <Flex vertical gap={4} style={{ flex: 1 }}>
                                <Text strong>{action.title}</Text>
                                <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                    {action.description}
                                </Text>
                            </Flex>
                        </Flex>
                    </Badge.Ribbon>
                </Card>
            ))}
        </Flex>
    );

    const popoverTitle = (
        <Flex vertical gap={4} style={{ marginBottom: 20 }}>
            <Text strong style={{ fontSize: 16 }}>
                Manage & Control Your {labels.offeringTitle}
            </Text>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal', lineHeight: 1.5 }}>
                Customize content, add languages, upload images, and organize items
            </Text>
        </Flex>
    );

    return (
        <Popover
            title={popoverTitle}
            trigger="click"
            placement="bottomLeft"
            content={content}
            open={open}
            onOpenChange={setOpen}
            arrow={{ pointAtCenter: true }}
            styles={{
                body: {
                    boxShadow: token.boxShadowSecondary,
                    borderRadius: 12,
                }
            }}
        >
            <Button icon={<LuMoreVertical />}>
                More Actions
            </Button>
        </Popover>
    );
}
