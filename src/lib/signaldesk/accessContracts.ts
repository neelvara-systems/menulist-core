import type { SignalDeskPermission, SignalDeskRole } from "@type/signaldesk";

export const SIGNALDESK_ALL_PERMISSIONS: readonly SignalDeskPermission[] = [
    "signaldesk.view",
    "signaldesk.configure",
    "target.review",
    "contact.reveal",
    "draft.create",
    "draft.approve",
    "message.export",
    "message.send",
    "source.configure",
    "channel.configure",
    "policy.approve",
    "kill-switch.activate",
    "kill-switch.deactivate",
    "audit.view",
];

export const SIGNALDESK_HUMAN_ROLES: readonly SignalDeskRole[] = [
    "founder-admin",
    "growth-manager",
    "operator",
    "compliance-reviewer",
    "readonly-analyst",
];

export const isSignalDeskHumanRole = (value: unknown): value is SignalDeskRole => (
    typeof value === "string" && SIGNALDESK_HUMAN_ROLES.some((role) => role === value)
);

export const isSignalDeskPermission = (value: unknown): value is SignalDeskPermission => (
    typeof value === "string" && SIGNALDESK_ALL_PERMISSIONS.some((permission) => permission === value)
);
