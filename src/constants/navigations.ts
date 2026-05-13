import { LuActivity, LuBarChartBig, LuBook, LuBookOpen, LuCalendarCheck2, LuClock3, LuCreditCard, LuDatabase, LuDatabaseBackup, LuFolderHeart, LuHeartHandshake, LuHotel, LuLayoutDashboard, LuLineChart, LuMapPin, LuMessageCircle, LuMessageSquare, LuPieChart, LuQrCode, LuReceipt, LuShare2, LuSparkles, LuTicket, LuUsers } from 'react-icons/lu';
import { MdOutlineManageHistory, MdOutlineSupportAgent } from 'react-icons/md';
import { TbSettingsHeart } from 'react-icons/tb';


export const HOME_ROUTING = `/`;
export const CLIENT_DASHBOARD_ROUTING = `/dashboard`;
export const HELP_CENTER_ROUTING = `/help-center`;
export const helpCenterTabRouting = (tab: string) => `${HELP_CENTER_ROUTING}?tab=${tab}`;

export const NAVIGARIONS_ROUTINGS = {

    BILLING: `/billing`,
    BUSINESS_SETTINGS: `/business-settings`,
    DASHBOARD: `/dashboard`,
    TODAY: `/today`,  // Social Content - "What should I do today?"
    PROJECTS: `/projects`,
    TRANSACTIONS: `/transactions`,
    MENU: `/menu`,
    QR_CODE: `/qr-code`,
    FEEDBACK: `/feedback`,  // Guest Feedback Inbox
    LOCATIONS: `/locations`,  // Chain Control Panel (Feature #4C)
    USE_MENULIST: `/use-menulist`,  // Output Center — links, screens, print assets

    HELP: HELP_CENTER_ROUTING,
    PLATFORM: `/platform`,
    USERS: `/users`,
    SIGNIN: `/signin`,
    FORGOT_PASSWORD: 'forgot-password',
    PLATFORM_USERS: `/platform/users`,
    PLATFORM_SUPPORT_TICKETS: `/platform/support-tickets`,
    PLATFORM_KB_GENERATION: `/platform/kb-generation`,
    PLATFORM_KNOWLEDGE_BASE: `/platform/knowledge-base`,
    PLATFORM_CHANGELOG: `/platform/changelog`,
    CHAT_MANAGEMENT: `/platform/chat-management`,
    CHAT_INSIGHTS: `/platform/chat-insights`,
    CHAT_ROI_CALCULATOR: `/platform/chat-roi-calculator`,
    CHAT_WEEKLY_DIGEST: `/platform/chat-weekly-digest`,
    CHAT_BACKFILL: `/platform/chat-backfill`,
    PLATFORM_FEEDBACK_ADMIN: `/platform/feedback-admin`,
    OPS_CONTROL_ROOM: `/ops`,
    OPS_EXTRACTION_MONITOR: `/ops/extraction`,
    OPS_SCHEDULER_MONITOR: `/ops/scheduler`,
}

export const SKIP_CLIENT_APP_LAYOUT_ROUTINGS = [NAVIGARIONS_ROUTINGS.SIGNIN, HOME_ROUTING, NAVIGARIONS_ROUTINGS.MENU, NAVIGARIONS_ROUTINGS.FORGOT_PASSWORD];

export type NavItemType = { key?: any, label: string, route: string, defaultRoute?: string, icon: any, isChild?: boolean, subNav?: NavItemType[], showSubNav?: boolean, active?: boolean, subNavActive?: boolean };

export const SIDEBAR_DASHBOARD_LAYOUT: NavItemType[] = [
    { label: 'Dashboard', route: NAVIGARIONS_ROUTINGS.DASHBOARD, icon: LuLayoutDashboard },
    { label: 'Today', route: NAVIGARIONS_ROUTINGS.TODAY, icon: LuCalendarCheck2 },  // Social Content - daily action
    { label: 'Projects', route: NAVIGARIONS_ROUTINGS.PROJECTS, icon: LuFolderHeart },
    { label: 'Users', route: NAVIGARIONS_ROUTINGS.USERS, icon: LuUsers },
    { label: 'Use MenuList', route: NAVIGARIONS_ROUTINGS.USE_MENULIST, icon: LuShare2 },
    { label: 'QR Code', route: NAVIGARIONS_ROUTINGS.QR_CODE, icon: LuQrCode },
    { label: 'Feedback', route: NAVIGARIONS_ROUTINGS.FEEDBACK, icon: LuTicket },
    { label: 'Business Settings', route: NAVIGARIONS_ROUTINGS.BUSINESS_SETTINGS, icon: LuHotel },
    { label: 'Transactions', route: NAVIGARIONS_ROUTINGS.TRANSACTIONS, icon: LuReceipt },
    { label: 'Locations', route: NAVIGARIONS_ROUTINGS.LOCATIONS, icon: LuMapPin },
    { label: 'Billing', route: NAVIGARIONS_ROUTINGS.BILLING, icon: LuCreditCard },
    { label: 'Help', route: NAVIGARIONS_ROUTINGS.HELP, icon: LuHeartHandshake },
    {
        label: 'Conversations', route: NAVIGARIONS_ROUTINGS.CHAT_MANAGEMENT, icon: LuMessageCircle,
        subNav: [
            { label: 'Chat List', route: NAVIGARIONS_ROUTINGS.CHAT_MANAGEMENT, icon: LuMessageSquare },       // Most used - view/manage chats
            { label: 'Chat Insights', route: NAVIGARIONS_ROUTINGS.CHAT_INSIGHTS, icon: LuBarChartBig },              // Daily analytics & metrics
            { label: 'Weekly Digest', route: NAVIGARIONS_ROUTINGS.CHAT_WEEKLY_DIGEST, icon: LuLineChart },        // Weekly AI summary (trend line)
            { label: 'ROI Calculator', route: NAVIGARIONS_ROUTINGS.CHAT_ROI_CALCULATOR, icon: LuPieChart },       // Monthly business value (breakdown)
            { label: 'Chat Backfill', route: NAVIGARIONS_ROUTINGS.CHAT_BACKFILL, icon: LuDatabaseBackup },        // Admin tool (rare use)
        ]
    },
    {
        label: 'Platform', route: NAVIGARIONS_ROUTINGS.PLATFORM, icon: TbSettingsHeart,
        subNav: [
            { label: 'Home', route: NAVIGARIONS_ROUTINGS.PLATFORM, icon: MdOutlineManageHistory },
            { label: 'Ops Control Room', route: NAVIGARIONS_ROUTINGS.OPS_CONTROL_ROOM, icon: LuActivity },
            { label: 'Scheduler Monitor', route: NAVIGARIONS_ROUTINGS.OPS_SCHEDULER_MONITOR, icon: LuClock3 },
            { label: 'Extraction Monitor', route: NAVIGARIONS_ROUTINGS.OPS_EXTRACTION_MONITOR, icon: LuSparkles },
            { label: 'Platform Users', route: NAVIGARIONS_ROUTINGS.PLATFORM_USERS, icon: LuUsers },
            { label: 'Support Tickets', route: NAVIGARIONS_ROUTINGS.PLATFORM_SUPPORT_TICKETS, icon: MdOutlineSupportAgent },
            { label: 'Feedback Admin', route: NAVIGARIONS_ROUTINGS.PLATFORM_FEEDBACK_ADMIN, icon: LuHeartHandshake },
            { label: 'Knowledge Base', route: NAVIGARIONS_ROUTINGS.PLATFORM_KNOWLEDGE_BASE, icon: LuBook },
            { label: 'KB Generation', route: NAVIGARIONS_ROUTINGS.PLATFORM_KB_GENERATION, icon: LuDatabase },
            { label: 'Changelog', route: NAVIGARIONS_ROUTINGS.PLATFORM_CHANGELOG, icon: LuReceipt },
            { label: 'Chat Management', route: NAVIGARIONS_ROUTINGS.CHAT_MANAGEMENT, icon: LuMessageSquare },
            { label: 'Chat Insights', route: NAVIGARIONS_ROUTINGS.CHAT_INSIGHTS, icon: LuBarChartBig },
            { label: 'Chat Backfill', route: NAVIGARIONS_ROUTINGS.CHAT_BACKFILL, icon: LuDatabaseBackup },
            { label: 'Weekly Digest', route: NAVIGARIONS_ROUTINGS.CHAT_WEEKLY_DIGEST, icon: LuLineChart },
            { label: 'ROI Calculator', route: NAVIGARIONS_ROUTINGS.CHAT_ROI_CALCULATOR, icon: LuPieChart },
        ]
    },
]

// Support menu options for help popover
export const SUPPORT_MENU_OPTIONS = [
    {
        key: 'help-center',
        label: 'Help Center',
        description: 'Open the Canonica help center',
        icon: LuHeartHandshake,
        route: HELP_CENTER_ROUTING,
    },
    {
        key: 'documentation',
        label: 'Documentation',
        description: 'Browse docs and guides',
        icon: LuBookOpen,
        route: helpCenterTabRouting('kb'),
    },
    {
        key: 'submit-ticket',
        label: 'Submit a Ticket',
        description: 'Get help from our team',
        icon: LuTicket,
        route: helpCenterTabRouting('ticket'),
    },
] as const;
