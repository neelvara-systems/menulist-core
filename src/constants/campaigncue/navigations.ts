import type { ComponentType } from "react";
import {
    LuBarChart3,
    LuBuilding2,
    LuCalendarDays,
    LuCreditCard,
    LuDownload,
    LuFileText,
    LuImage,
    LuLayoutDashboard,
    LuLayers,
    LuMapPin,
    LuMegaphone,
    LuPenLine,
    LuSearch,
    LuSend,
    LuSettings,
    LuShieldCheck,
    LuSparkles,
    LuStore,
    LuUsers,
    LuVideo,
} from "react-icons/lu";

type CampaignCueWorkspaceTabDefinition = {
    group: "Start" | "Campaigns" | "Channels" | "Operations";
    key: string;
    label: string;
    icon: ComponentType<{ size?: number }>;
};

export const CAMPAIGNCUE_WORKSPACE_TABS = [
    { group: "Start", key: "home", label: "Daily desk", icon: LuLayoutDashboard },
    { group: "Start", key: "details", label: "Business", icon: LuStore },
    { group: "Start", key: "sources", label: "Offers, events, and notes", icon: LuFileText },
    { group: "Start", key: "delivery", label: "Exports", icon: LuDownload },
    { group: "Start", key: "settings", label: "Settings", icon: LuSettings },
    { group: "Campaigns", key: "cues", label: "Ideas", icon: LuSparkles },
    { group: "Campaigns", key: "inspiration", label: "Examples", icon: LuVideo },
    { group: "Campaigns", key: "campaigns", label: "Packs", icon: LuMegaphone },
    { group: "Campaigns", key: "editor", label: "Editor", icon: LuLayers },
    { group: "Channels", key: "creative", label: "Social", icon: LuImage },
    { group: "Channels", key: "video", label: "Reels", icon: LuVideo },
    { group: "Channels", key: "ugc", label: "Scripts", icon: LuPenLine },
    { group: "Channels", key: "whatsapp", label: "WhatsApp", icon: LuSend },
    { group: "Channels", key: "google", label: "Google", icon: LuMapPin },
    { group: "Channels", key: "ads", label: "Ads", icon: LuMegaphone },
    { group: "Operations", key: "trust", label: "Checks", icon: LuShieldCheck },
    { group: "Operations", key: "visibility", label: "Visibility", icon: LuSearch },
    { group: "Operations", key: "calendar", label: "Calendar", icon: LuCalendarDays },
    { group: "Operations", key: "assets", label: "Assets", icon: LuImage },
    { group: "Operations", key: "analytics", label: "Results", icon: LuBarChart3 },
    { group: "Operations", key: "agency", label: "Agency", icon: LuUsers },
    { group: "Operations", key: "locations", label: "Locations", icon: LuBuilding2 },
    { group: "Operations", key: "billing", label: "Plan", icon: LuCreditCard },
] as const satisfies readonly CampaignCueWorkspaceTabDefinition[];

export type CampaignCueWorkspaceTabKey = typeof CAMPAIGNCUE_WORKSPACE_TABS[number]["key"];
