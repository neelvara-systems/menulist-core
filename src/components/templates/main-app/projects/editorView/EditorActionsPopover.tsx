import { FEATURE_FLAGS } from "@config/features";
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { Badge, Button, Card, Flex, Popover, theme, Typography } from "antd";
import { useMemo, useState } from "react";
import { LuMoreVertical } from "react-icons/lu";
import { EditorAction, getEditorActions } from "./editorActions.config";
export type { EditorAction } from "./editorActions.config";

const { Text } = Typography;

type EditorActionsPopoverProps = {
    onActionClick: (action: EditorAction) => void;
    isMasterLinked?: boolean; // True if this is an outlet store linked to master
    canGenerateDescriptions?: boolean;
};

export default function EditorActionsPopover({
    onActionClick,
    isMasterLinked = false,
    canGenerateDescriptions = false,
}: EditorActionsPopoverProps) {
    const { token } = theme.useToken();
    const [open, setOpen] = useState(false);
    const labels = useOfferingLabels();

    // Filter actions based on store type and feature flags
    const visibleActions = useMemo(() => {
        return getEditorActions(labels).filter(action => {
            // Only show outlet-only actions if this is an outlet store AND feature is enabled
            if (action.outletOnly) {
                return FEATURE_FLAGS.ENABLE_MULTI_OUTLET && isMasterLinked;
            }
            // Gate command center behind feature flag
            if (action.key === 'commandCenter') {
                return FEATURE_FLAGS.ENABLE_MENU_COMMAND_CENTER;
            }
            if (action.key === 'description') {
                return canGenerateDescriptions;
            }
            if (action.key === 'decisionBlocks') {
                return FEATURE_FLAGS.ENABLE_DECISION_BLOCKS;
            }
            return true;
        });
    }, [canGenerateDescriptions, isMasterLinked, labels]);

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
                Customize content, add languages, upload images, and organize your {labels.itemsPlural}
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
