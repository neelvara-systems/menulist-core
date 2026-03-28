/**
 * Master Update Detail Modal
 *
 * Shows structured, grouped list of operational changes
 * with outlet-specific context (override awareness).
 *
 * Used in TWO modes:
 * 1. Active banner mode — shows "Got it" button to acknowledge
 * 2. History mode — read-only, just "Close" (opened via "Last changes" link)
 *
 * Section order is FIXED (per design discussion):
 *   Removed → Added → Price Changes → Availability → Category Changes
 * Removals first = most operationally critical.
 *
 * 50+ changes in a group: collapsed with "Many items updated" summary.
 *
 * @see __docs__/multi-outlet-consistency/master-updates-awareness_impl.md §9.2
 */

import type { MasterUpdateDiff, OperationalChange } from "@type/multiOutlet.types";
import {
    Button,
    Collapse,
    Divider,
    Empty,
    List,
    Modal,
    Space,
    Tag,
    Typography,
} from "antd";
import {
    LuCheck,
    LuClock,
    LuDollarSign,
    LuEyeOff,
    LuFolderOpen,
    LuMinus,
    LuPackage,
    LuPlus,
    LuStar,
} from "react-icons/lu";

const { Text } = Typography;

/** Max items shown per group before collapsing */
const COLLAPSE_THRESHOLD = 50;

interface Props {
    open: boolean;
    onClose: () => void;
    diff: MasterUpdateDiff;
    onAcknowledge?: () => Promise<void>; // undefined in history mode
    isAcknowledging: boolean;
    isHistoryView?: boolean; // true when opened from "Last changes" link
}

function MasterUpdateDetailModal({
    open,
    onClose,
    diff,
    onAcknowledge,
    isAcknowledging,
    isHistoryView = false,
}: Props) {
    const handleAcknowledge = async () => {
        if (onAcknowledge) {
            await onAcknowledge();
            onClose();
        }
    };

    // Group changes by type — FIXED order (Removed first = most critical)
    const grouped = groupChanges(diff.changes);

    // Modal title changes based on mode
    const title = isHistoryView
        ? "Last changes from main menu"
        : "Updates from main menu";

    const subtitle = isHistoryView
        ? `${diff.totalChanges} change${diff.totalChanges > 1 ? "s" : ""} from last master update`
        : "These changes may affect your store";

    // Footer: "Got it" only in active banner mode, "Close" always
    const footer = isHistoryView
        ? [
            <Button key="close" onClick={onClose}>
                Close
            </Button>,
        ]
        : [
            <Button key="close" onClick={onClose}>
                Close
            </Button>,
            <Button
                key="ack"
                type="primary"
                onClick={handleAcknowledge}
                loading={isAcknowledging}
                icon={<LuCheck />}
            >
                Got it
            </Button>,
        ];

    return (
        <Modal
            title={title}
            open={open}
            onCancel={onClose}
            width={640}
            footer={footer}
        >
            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                {subtitle}
            </Text>

            {grouped.map((group) => (
                <div key={group.label} style={{ marginBottom: 16 }}>
                    <Space style={{ marginBottom: 8 }}>
                        {group.icon}
                        <Text strong>{group.label}</Text>
                        <Tag>{group.changes.length}</Tag>
                    </Space>

                    {/* Collapse large groups to avoid long scrolling */}
                    {group.changes.length > COLLAPSE_THRESHOLD ? (
                        <Collapse
                            size="small"
                            items={[
                                {
                                    key: group.label,
                                    label: `Many items updated (${group.changes.length})`,
                                    children: renderChangeList(group.changes),
                                },
                            ]}
                        />
                    ) : (
                        renderChangeList(group.changes)
                    )}
                    <Divider style={{ margin: "8px 0" }} />
                </div>
            ))}

            {diff.totalChanges === 0 && (
                <Empty description="No operational changes detected" />
            )}
        </Modal>
    );
}

/** Render the list of changes (shared between collapsed and expanded) */
function renderChangeList(changes: OperationalChange[]) {
    return (
        <List
            size="small"
            dataSource={changes}
            renderItem={(change: OperationalChange) => (
                <List.Item>
                    <List.Item.Meta
                        title={change.entityName}
                        description={
                            <Space direction="vertical" size={0}>
                                {change.oldValue && change.newValue && (
                                    <Text type="secondary">
                                        {change.oldValue} → {change.newValue}
                                    </Text>
                                )}
                                {change.outletContext?.impactNote && (
                                    <Text
                                        type={
                                            change.outletContext.hasOverride ? "warning" : "secondary"
                                        }
                                        style={{ fontSize: 12 }}
                                    >
                                        {change.outletContext.hasOverride && "⚠ "}
                                        {change.outletContext.impactNote}
                                    </Text>
                                )}
                            </Space>
                        }
                    />
                    {change.outletContext?.hasOverride && (
                        <Tag color="orange" style={{ fontSize: 11 }}>
                            Has Override
                        </Tag>
                    )}
                </List.Item>
            )}
        />
    );
}

interface ChangeGroup {
    label: string;
    icon: React.ReactNode;
    changes: OperationalChange[];
}

/**
 * Group changes by type in FIXED display order:
 * 1. Removed items/categories/variants (most critical)
 * 2. Added items/categories/variants
 * 3. Price changes (items + variants)
 * 4. Availability/sold-out changes
 * 5. Status changes (active/disabled)
 * 6. Variant changes (attribute active toggles)
 * 7. Bestseller changes
 * 8. Prep time changes
 * 9. Category reassignments
 */
function groupChanges(changes: OperationalChange[]): ChangeGroup[] {
    const groups: ChangeGroup[] = [];

    const removed = changes.filter(
        (c) => c.type === "ITEM_REMOVED" || c.type === "CATEGORY_REMOVED" || c.type === "ATTRIBUTE_REMOVED",
    );
    const added = changes.filter(
        (c) => c.type === "ITEM_ADDED" || c.type === "CATEGORY_ADDED" || c.type === "ATTRIBUTE_ADDED",
    );
    const priceChanges = changes.filter(
        (c) => c.type === "ITEM_PRICE_CHANGED" || c.type === "ATTRIBUTE_PRICE_CHANGED",
    );
    const availabilityChanges = changes.filter(
        (c) => c.type === "ITEM_AVAILABILITY_CHANGED",
    );
    const statusChanges = changes.filter((c) =>
        [
            "ITEM_DISABLED",
            "ITEM_ENABLED",
            "CATEGORY_DISABLED",
            "CATEGORY_ENABLED",
            "ATTRIBUTE_DISABLED",
            "ATTRIBUTE_ENABLED",
        ].includes(c.type),
    );
    const bestsellerChanges = changes.filter(
        (c) => c.type === "ITEM_BESTSELLER_CHANGED",
    );
    const durationChanges = changes.filter(
        (c) => c.type === "ITEM_DURATION_CHANGED",
    );
    const moved = changes.filter((c) => c.type === "ITEM_MOVED_CATEGORY");

    // FIXED ORDER: Removed → Added → Price → Availability → Status → Bestseller → Prep Time → Moved
    if (removed.length > 0)
        groups.push({
            label: "Removed",
            icon: <LuMinus color="red" />,
            changes: removed,
        });
    if (added.length > 0)
        groups.push({
            label: "Added",
            icon: <LuPlus color="green" />,
            changes: added,
        });
    if (priceChanges.length > 0)
        groups.push({
            label: "Price Changes",
            icon: <LuDollarSign color="blue" />,
            changes: priceChanges,
        });
    if (availabilityChanges.length > 0)
        groups.push({
            label: "Availability (Sold Out)",
            icon: <LuPackage color="#d4380d" />,
            changes: availabilityChanges,
        });
    if (statusChanges.length > 0)
        groups.push({
            label: "Visibility Changes",
            icon: <LuEyeOff color="orange" />,
            changes: statusChanges,
        });
    if (bestsellerChanges.length > 0)
        groups.push({
            label: "Bestseller Changes",
            icon: <LuStar color="#faad14" />,
            changes: bestsellerChanges,
        });
    if (durationChanges.length > 0)
        groups.push({
            label: "Prep Time Changes",
            icon: <LuClock color="#722ed1" />,
            changes: durationChanges,
        });
    if (moved.length > 0)
        groups.push({
            label: "Category Changes",
            icon: <LuFolderOpen color="purple" />,
            changes: moved,
        });

    return groups;
}

export default MasterUpdateDetailModal;
