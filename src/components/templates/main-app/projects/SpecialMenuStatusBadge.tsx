/**
 * Special Menu Status Badge
 *
 * Displays the lifecycle status of a special menu with appropriate color.
 * Used in project list, special menu cards, and mobile screens.
 *
 * @see __docs__/special-menu-switching/special-menu-switching_impl.md
 */
import type { SpecialMenuStatus } from "@template/main-app/projects/types";
import { Tag } from "antd";

interface SpecialMenuStatusBadgeProps {
    status: SpecialMenuStatus;
    size?: "small" | "default";
}

const STATUS_CONFIG: Record<
    SpecialMenuStatus,
    { color: string; label: string }
> = {
    scheduled: { color: "blue", label: "Scheduled" },
    active: { color: "green", label: "Active" },
    expired: { color: "default", label: "Ended" },
    cancelled: { color: "default", label: "Cancelled" },
};

export default function SpecialMenuStatusBadge({
    status,
    size = "default",
}: SpecialMenuStatusBadgeProps) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;

    return (
        <Tag
            color={config.color}
            style={
                size === "small"
                    ? { fontSize: 11, lineHeight: "18px", padding: "0 6px" }
                    : undefined
            }
        >
            {config.label}
        </Tag>
    );
}
