/**
 * Inheritance Badge Component
 *
 * Displays inheritance state for menu items/categories in multi-store context.
 * Shows whether item is inherited from master, overridden locally, or local-only.
 *
 * @see __docs__/multi-outlet-consistency/multi-outlet-consistency_impl.md Section 9
 */

"use client";

import { InheritanceState } from "@type/multiOutlet.types";
import { Tag, Tooltip } from "antd";
import { LuLink, LuPencil, LuPlus } from "react-icons/lu";

interface InheritanceBadgeProps {
    state: InheritanceState;
    compact?: boolean;
    showTooltip?: boolean;
    masterPrice?: string;
}

const BADGE_CONFIG: Record<
    InheritanceState,
    {
        color: string;
        icon: React.ReactNode;
        label: string;
        tooltip: string;
    }
> = {
    inherited: {
        color: "blue",
        icon: <LuLink size={12} />,
        label: "Inherited",
        tooltip:
            "This item comes from master menu. Name, description, and images are controlled by HQ.",
    },
    overridden: {
        color: "orange",
        icon: <LuPencil size={12} />,
        label: "Modified",
        tooltip:
            "This item is inherited but has local modifications (price, availability, etc.)",
    },
    "local-only": {
        color: "green",
        icon: <LuPlus size={12} />,
        label: "Local",
        tooltip:
            "This item exists only at this store. Not synced with master menu.",
    },
};

export function InheritanceBadge({
    state,
    compact = false,
    showTooltip = true,
    masterPrice,
}: InheritanceBadgeProps) {
    const config = BADGE_CONFIG[state];

    const badge = (
        <Tag
            color={config.color}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                margin: 0,
                fontSize: compact ? 10 : 12,
                padding: compact ? "0 4px" : "2px 8px",
            }}
        >
            {config.icon}
            {!compact && config.label}
        </Tag>
    );

    if (!showTooltip) {
        return badge;
    }

    const tooltipContent = masterPrice
        ? `${config.tooltip} (Master price: ${masterPrice})`
        : config.tooltip;

    return (
        <Tooltip title={tooltipContent} placement="top">
            {badge}
        </Tooltip>
    );
}

export function InheritedBadge(props: Omit<InheritanceBadgeProps, "state">) {
    return <InheritanceBadge {...props} state="inherited" />;
}

export function OverriddenBadge(props: Omit<InheritanceBadgeProps, "state">) {
    return <InheritanceBadge {...props} state="overridden" />;
}

export function LocalOnlyBadge(props: Omit<InheritanceBadgeProps, "state">) {
    return <InheritanceBadge {...props} state="local-only" />;
}

/**
 * LocalOverrideBadge — Shows "Local Override" next to item name in outlet context
 * @see __docs__/multi-outlet-consistency/store-onboarding/store-onboarding_impl.md §17.3
 */
export function LocalOverrideBadge({ compact = false }: { compact?: boolean }) {
    return (
        <Tooltip title="This field has been customized for this outlet only">
            <Tag
                color="volcano"
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    margin: 0,
                    fontSize: compact ? 10 : 12,
                    padding: compact ? "0 4px" : "2px 8px",
                }}
            >
                <LuPencil size={12} />
                {!compact && "Local Override"}
            </Tag>
        </Tooltip>
    );
}

export default InheritanceBadge;
