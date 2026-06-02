/**
 * Special Menu Card
 *
 * Dashboard card showing special menu status and management actions.
 * Displays active, scheduled, and past special menus with quick actions.
 *
 * @see __docs__/special-menu-switching/special-menu-switching_impl.md
 */
import { FEATURE_FLAGS } from "@config/features";
import type { SpecialMenuListItem } from "@hook/useSpecialMenus";
import { useSpecialMenus } from "@hook/useSpecialMenus";
import { formatDateTime } from "@util/dateTime";
import { Button, Card, Empty, Flex, Modal, Popconfirm, Space, Typography, theme } from "antd";
import { useFormatter } from "next-intl";
import { useState } from "react";
import { LuCalendar, LuPause, LuPlus, LuSparkles, LuX } from "react-icons/lu";
import CreateSpecialMenuModal from "./CreateSpecialMenuModal";
import SpecialMenuStatusBadge from "./SpecialMenuStatusBadge";

const { Text, Title } = Typography;

interface SpecialMenuCardProps {
    baseProjectId?: string;
    baseProjectLanguages?: string[];
    baseProjectName?: string;
}

function SpecialMenuItem({
    item,
    onDeactivate,
    onCancel,
}: {
    item: SpecialMenuListItem;
    onDeactivate: (id: string) => void;
    onCancel: (id: string) => void;
}) {
    const { token } = theme.useToken();
    const formatter = useFormatter();

    return (
        <Flex
            justify="space-between"
            align="center"
            style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: item.status === "active" ? token.colorSuccessBg : token.colorFillQuaternary,
                border: item.status === "active" ? `1px solid ${token.colorSuccessBorder}` : `1px solid ${token.colorBorderSecondary}`,
                marginBottom: 8,
            }}
        >
            <Flex vertical gap={2} style={{ flex: 1 }}>
                <Flex align="center" gap={8}>
                    <Text strong style={{ fontSize: 14 }}>
                        {item.displayName}
                    </Text>
                    <SpecialMenuStatusBadge status={item.status} size="small" />
                </Flex>
                <Flex align="center" gap={4}>
                    <LuCalendar size={12} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDateTime(item.startsAt, "date", formatter)} → {formatDateTime(item.endsAt, "date", formatter)}
                    </Text>
                </Flex>
                <Text type="secondary" style={{ fontSize: 11 }}>
                    Mode: {item.mode === "replace" ? "Full replacement" : "Added section"}
                </Text>
            </Flex>

            <Space size={4}>
                {item.status === "active" && (
                    <Popconfirm
                        title="End this special menu?"
                        description="Your regular menu will come back immediately."
                        onConfirm={() => onDeactivate(item.projectId)}
                        okText="End Now"
                        cancelText="Keep Active"
                    >
                        <Button size="small" icon={<LuPause size={14} />} danger>
                            End Now
                        </Button>
                    </Popconfirm>
                )}
                {item.status === "scheduled" && (
                    <Popconfirm
                        title="Cancel this special menu?"
                        description="It won't activate on the scheduled date."
                        onConfirm={() => onCancel(item.projectId)}
                        okText="Cancel It"
                        cancelText="Keep Scheduled"
                    >
                        <Button size="small" icon={<LuX size={14} />}>
                            Cancel
                        </Button>
                    </Popconfirm>
                )}
            </Space>
        </Flex>
    );
}

export default function SpecialMenuCard({
    baseProjectId,
    baseProjectLanguages,
    baseProjectName,
}: SpecialMenuCardProps) {
    const {
        specialMenus,
        activeMenu,
        scheduledMenus,
        expiredMenus,
        isLoading,
        createSpecialMenu,
        deactivateMenu,
        cancelMenu,
    } = useSpecialMenus();

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [showExpired, setShowExpired] = useState(false);

    if (!FEATURE_FLAGS.ENABLE_SPECIAL_MENU_SWITCHING) return null;

    const handleDeactivate = async (projectId: string) => {
        const result = await deactivateMenu(projectId);
        if (!result.success) {
            Modal.error({
                title: "Could not end special menu",
                content: result.error,
            });
        }
    };

    const handleCancel = async (projectId: string) => {
        const result = await cancelMenu(projectId);
        if (!result.success) {
            Modal.error({
                title: "Could not cancel special menu",
                content: result.error,
            });
        }
    };

    const hasAnyMenus = specialMenus.length > 0;
    const activeOrScheduled = [...(activeMenu ? [activeMenu] : []), ...scheduledMenus];

    return (
        <>
            <Card
                size="small"
                title={
                    <Flex align="center" gap={8}>
                        <LuSparkles size={16} />
                        <span>Special Menus</span>
                    </Flex>
                }
                extra={
                    baseProjectId && (
                        <Button
                            type="primary"
                            size="small"
                            icon={<LuPlus size={14} />}
                            onClick={() => setCreateModalOpen(true)}
                        >
                            Create
                        </Button>
                    )
                }
                loading={isLoading}
                style={{ marginBottom: 16 }}
            >
                {!hasAnyMenus && (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                No special menus yet. Create one for festivals, events, or seasonal items.
                            </Text>
                        }
                    />
                )}

                {activeOrScheduled.map((item) => (
                    <SpecialMenuItem
                        key={item.projectId}
                        item={item}
                        onDeactivate={handleDeactivate}
                        onCancel={handleCancel}
                    />
                ))}

                {expiredMenus.length > 0 && (
                    <Flex justify="center" style={{ marginTop: 4 }}>
                        <Button
                            type="link"
                            size="small"
                            onClick={() => setShowExpired(!showExpired)}
                            style={{ fontSize: 12 }}
                        >
                            {showExpired
                                ? "Hide past menus"
                                : `Show ${expiredMenus.length} past menu${expiredMenus.length > 1 ? "s" : ""}`}
                        </Button>
                    </Flex>
                )}

                {showExpired &&
                    expiredMenus.slice(0, 5).map((item) => (
                        <SpecialMenuItem
                            key={item.projectId}
                            item={item}
                            onDeactivate={handleDeactivate}
                            onCancel={handleCancel}
                        />
                    ))}
            </Card>

            {baseProjectId && baseProjectName && (
                <CreateSpecialMenuModal
                    open={createModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                    baseProjectId={baseProjectId}
                    baseProjectLanguages={baseProjectLanguages}
                    baseProjectName={baseProjectName}
                    onSubmit={createSpecialMenu}
                />
            )}
        </>
    );
}
