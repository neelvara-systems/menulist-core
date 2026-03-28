/**
 * Master Update Awareness Banner (Feature #4.1)
 *
 * Two-part component:
 * 1. BANNER — Persistent alert when new master changes exist (until "Got it")
 * 2. QUIET LINK — "Last main menu changes" text, always visible for outlet projects
 *
 * Design principles:
 * - Calm, not alarming (info color, not warning/error)
 * - Persistent until acknowledged (not dismissible by X button)
 * - Shows summary in banner, details in expandable modal
 * - Outlet context: shows impact on local overrides
 * - After acknowledgment: quiet text link remains for re-viewing last diff
 *   (no badge, no icon, no color — just calm availability)
 *
 * @see __docs__/multi-outlet-consistency/master-updates-awareness_impl.md §9.1
 */

import { FEATURE_FLAGS } from "@config/features";
import useMasterUpdateAwareness from "@hook/useMasterUpdateAwareness";
import { buildSummaryText } from "@lib/multiOutlet/masterUpdateDiff";
import { ProjectsDataContext } from "@providers/projectsDataProvider";
import { Alert, Button, Space, Typography } from "antd";
import { useCallback, useContext, useState } from "react";
import { LuBell, LuCheck } from "react-icons/lu";
import MasterUpdateDetailModal from "./MasterUpdateDetailModal";

const { Text } = Typography;

function MasterUpdateBanner() {
    const { activeProject, setActiveProject } = useContext(ProjectsDataContext);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    // After acknowledge: update local activeProject with new masterSnapshot.
    // This fixes SWR stale cache (hasHistory/lastDiff update immediately)
    // and triggers Editor's resolve useEffect (re-resolves with cached master).
    const handleProjectUpdate = useCallback(
        (updates: Record<string, unknown>) => {
            if (activeProject) {
                setActiveProject({ ...activeProject, ...updates });
            }
        },
        [activeProject, setActiveProject],
    );

    // Hook only activates for outlet projects
    const {
        showBanner,
        diff,
        acknowledge,
        isAcknowledging,
        hasHistory,
        lastDiff,
    } = useMasterUpdateAwareness(activeProject, handleProjectUpdate);

    // Gate: feature flags
    if (
        !FEATURE_FLAGS.ENABLE_MULTI_OUTLET ||
        !FEATURE_FLAGS.ENABLE_MASTER_UPDATE_AWARENESS
    ) {
        return null;
    }

    // Gate: must be an outlet project
    if (!activeProject?.masterProjectId) {
        return null;
    }

    // Determine which diff to show in the modal
    const modalDiff = diff || lastDiff;

    return (
        <>
            {/* ── BANNER (only when new unacknowledged changes exist) ── */}
            {showBanner && diff && (
                <Alert
                    type="info"
                    showIcon
                    icon={<LuBell />}
                    closable={false} // Persists until "Got it" — no X dismiss
                    message={
                        <Space>
                            <Text strong>Main menu updated</Text>
                            <Text type="secondary">{buildSummaryText(diff)}</Text>
                        </Space>
                    }
                    action={
                        <Space>
                            <Button size="small" onClick={() => setDetailModalOpen(true)}>
                                Review
                            </Button>
                            <Button
                                size="small"
                                type="primary"
                                onClick={acknowledge}
                                loading={isAcknowledging}
                                icon={<LuCheck />}
                            >
                                Got it
                            </Button>
                        </Space>
                    }
                    style={{
                        margin: "0 0 10px 0",
                        borderRadius: 8,
                    }}
                />
            )}

            {/* ── QUIET HISTORY LINK (always visible when history exists) ── */}
            {/* 
                This renders AFTER banner is dismissed (via "Got it").
                No badge. No icon. No color. Just calm text.
                Opens the same modal showing the last acknowledged diff.
                
                Rules (from design discussion — locked):
                - Never show badge/dot on this link
                - Never use attention-grabbing colors
                - Frame as "history", not "alert"
                - Visible only for outlet stores with acknowledged history
            */}
            {!showBanner && hasHistory && (
                <Text
                    type="secondary"
                    style={{
                        fontSize: 12,
                        cursor: "pointer",
                        marginBottom: 8,
                        display: "inline-block",
                    }}
                    onClick={() => setDetailModalOpen(true)}
                >
                    Last main menu changes
                </Text>
            )}

            {/* ── DETAIL MODAL (shared by banner Review + history link) ── */}
            {modalDiff && (
                <MasterUpdateDetailModal
                    open={detailModalOpen}
                    onClose={() => setDetailModalOpen(false)}
                    diff={modalDiff}
                    onAcknowledge={showBanner ? acknowledge : undefined}
                    isAcknowledging={isAcknowledging}
                    isHistoryView={!showBanner}
                />
            )}
        </>
    );
}

export default MasterUpdateBanner;
