import { LuActivity, LuBookOpen, LuBuilding2, LuCalendarCheck2, LuClock3, LuCreditCard, LuFolderHeart, LuHeartHandshake, LuHotel, LuLayoutDashboard, LuMapPin, LuQrCode, LuReceipt, LuShare2, LuShieldCheck, LuShieldOff, LuSparkles, LuTicket, LuUsers } from 'react-icons/lu';
import { MdOutlineManageHistory } from 'react-icons/md';
import { TbSettingsHeart } from 'react-icons/tb';
import { ECOMSAI_PLATFORM_USER_ROLE, RESELLER_USER_ROLE } from './user';


export const HOME_ROUTING = `/`;
export const CLIENT_DASHBOARD_ROUTING = `/dashboard`;
export const HELP_CENTER_ROUTING = `/help-center`;
export const HELP_CENTER_HOME_TAB = 'home';
export const helpCenterTabRouting = (tab: string) => tab && tab !== HELP_CENTER_HOME_TAB ? `${HELP_CENTER_ROUTING}/${tab}` : HELP_CENTER_ROUTING;
export const normalizeHelpCenterRouteSegment = (value?: string | null) => (value || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
export const getHelpCenterArticleRouteSegment = (article: { id?: string; url?: string; title?: string }) =>
    article.url || normalizeHelpCenterRouteSegment(article.title) || article.id || '';
export const helpCenterArticleRouting = (articleId: string) => `${helpCenterTabRouting('kb')}/articles/${articleId}`;
export const helpCenterChangelogRouting = (entryId?: string) => entryId ? `${helpCenterTabRouting('changelog')}/${entryId}` : helpCenterTabRouting('changelog');

export const NAVIGARIONS_ROUTINGS = {

    BILLING: `/billing`,
    BUSINESS_SETTINGS: `/business-settings`,
    DASHBOARD: `/dashboard`,
    TODAY: `/today`,  // Social Content - "What should I do today?"
    GROWTH_KITS: `/growth-kits`,
    PROJECTS: `/projects`,
    TRANSACTIONS: `/transactions`,
    MENU: `/menu`,
    QR_CODE: `/qr-code`,
    FEEDBACK: `/feedback`,  // Guest Feedback Inbox
    LOCATIONS: `/locations`,  // Chain Control Panel (Feature #4C)
    USE_MENULIST: `/use-menulist`,  // Output Center — links, screens, print assets

    HELP: HELP_CENTER_ROUTING,
    PLATFORM: `/platform`,
    ANSWERLATTICE: `/answerlattice`,
    RESELLER: `/reseller`,
    RESELLER_ONBOARD: `/reseller/onboard`,
    RESELLER_MANAGE: `/reseller/manage`,
    USERS: `/users`,
    USERS_LIST: `/users/list`,
    USERS_ROLES: `/users/permissions`,
    SIGNIN: `/signin`,
    FORGOT_PASSWORD: 'forgot-password',
    PLATFORM_ENTITY_BLOCKS: `/platform/entity-blocks`,
    PLATFORM_TENANTS: `/platform/tenants`,
    PLATFORM_STORES: `/platform/stores`,
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
    OPS_CONTROL_ROOM: `/platform/ops-control-room`,
    OPS_EXTRACTION_MONITOR: `/platform/extraction-monitor`,
    OPS_SCHEDULER_MONITOR: `/platform/scheduler-monitor`,
    OPS_ANSWERLATTICE_INTAKE_MONITOR: `/platform/answerlattice-intake`,
    LEGACY_OPS_CONTROL_ROOM: `/ops`,
    LEGACY_OPS_EXTRACTION_MONITOR: `/ops/extraction`,
    LEGACY_OPS_SCHEDULER_MONITOR: `/ops/scheduler`,
}

export const SKIP_CLIENT_APP_LAYOUT_ROUTINGS = [NAVIGARIONS_ROUTINGS.SIGNIN, HOME_ROUTING, NAVIGARIONS_ROUTINGS.MENU, NAVIGARIONS_ROUTINGS.FORGOT_PASSWORD];

export type NavItemType = { key?: any, label: string, route: string, defaultRoute?: string, icon: any, isChild?: boolean, subNav?: NavItemType[], showSubNav?: boolean, active?: boolean, subNavActive?: boolean, allowedPlatformRoles?: string[] };

export const SIDEBAR_DASHBOARD_LAYOUT: NavItemType[] = [
    { label: 'Dashboard', route: NAVIGARIONS_ROUTINGS.DASHBOARD, icon: LuLayoutDashboard },
    { label: 'Today', route: NAVIGARIONS_ROUTINGS.TODAY, icon: LuCalendarCheck2 },  // Social Content - daily action
    { label: 'Growth Kits', route: NAVIGARIONS_ROUTINGS.GROWTH_KITS, icon: LuSparkles },
    { label: 'Projects', route: NAVIGARIONS_ROUTINGS.PROJECTS, icon: LuFolderHeart },
    {
        label: 'Users',
        route: NAVIGARIONS_ROUTINGS.USERS,
        defaultRoute: NAVIGARIONS_ROUTINGS.USERS_LIST,
        icon: LuUsers,
        subNav: [
            { label: 'Users List', route: NAVIGARIONS_ROUTINGS.USERS_LIST, icon: LuUsers },
            { label: 'Roles', route: NAVIGARIONS_ROUTINGS.USERS_ROLES, icon: LuShieldCheck },
        ],
    },
    { label: 'Use MenuList', route: NAVIGARIONS_ROUTINGS.USE_MENULIST, icon: LuShare2 },
    { label: 'QR Code', route: NAVIGARIONS_ROUTINGS.QR_CODE, icon: LuQrCode },
    { label: 'Feedback', route: NAVIGARIONS_ROUTINGS.FEEDBACK, icon: LuTicket },
    { label: 'Business Settings', route: NAVIGARIONS_ROUTINGS.BUSINESS_SETTINGS, icon: LuHotel },
    { label: 'Transactions', route: NAVIGARIONS_ROUTINGS.TRANSACTIONS, icon: LuReceipt },
    { label: 'Locations', route: NAVIGARIONS_ROUTINGS.LOCATIONS, icon: LuMapPin },
    { label: 'Billing', route: NAVIGARIONS_ROUTINGS.BILLING, icon: LuCreditCard },
    { label: 'Help', route: NAVIGARIONS_ROUTINGS.HELP, icon: LuHeartHandshake },
    {
        label: 'Platform', route: NAVIGARIONS_ROUTINGS.PLATFORM, icon: TbSettingsHeart,
        subNav: [
            { label: 'Home', route: NAVIGARIONS_ROUTINGS.PLATFORM, icon: MdOutlineManageHistory },
            { label: 'Ops Control Room', route: NAVIGARIONS_ROUTINGS.OPS_CONTROL_ROOM, icon: LuActivity },
            { label: 'Scheduler Monitor', route: NAVIGARIONS_ROUTINGS.OPS_SCHEDULER_MONITOR, icon: LuClock3 },
            { label: 'Extraction Monitor', route: NAVIGARIONS_ROUTINGS.OPS_EXTRACTION_MONITOR, icon: LuSparkles },
            { label: 'Answerlattice Intake', route: NAVIGARIONS_ROUTINGS.OPS_ANSWERLATTICE_INTAKE_MONITOR, icon: LuBookOpen },
            { label: 'Entity Blocks', route: NAVIGARIONS_ROUTINGS.PLATFORM_ENTITY_BLOCKS, icon: LuShieldOff },
            { label: 'Tenants', route: NAVIGARIONS_ROUTINGS.PLATFORM_TENANTS, icon: LuBuilding2 },
            { label: 'Stores', route: NAVIGARIONS_ROUTINGS.PLATFORM_STORES, icon: LuMapPin },
            { label: 'Platform Users', route: NAVIGARIONS_ROUTINGS.PLATFORM_USERS, icon: LuUsers },
        ]
    },
    {
        label: 'Reseller', route: NAVIGARIONS_ROUTINGS.RESELLER, icon: LuBuilding2,
        allowedPlatformRoles: [ECOMSAI_PLATFORM_USER_ROLE, RESELLER_USER_ROLE],
        subNav: [
            { label: 'Dashboard', route: NAVIGARIONS_ROUTINGS.RESELLER, icon: LuLayoutDashboard, allowedPlatformRoles: [ECOMSAI_PLATFORM_USER_ROLE, RESELLER_USER_ROLE] },
            { label: 'Onboard Client', route: NAVIGARIONS_ROUTINGS.RESELLER_ONBOARD, icon: LuSparkles, allowedPlatformRoles: [ECOMSAI_PLATFORM_USER_ROLE, RESELLER_USER_ROLE] },
            { label: 'Reseller Management', route: NAVIGARIONS_ROUTINGS.RESELLER_MANAGE, icon: LuUsers, allowedPlatformRoles: [ECOMSAI_PLATFORM_USER_ROLE] },
        ]
    },
]

// Support menu options for help popover
export const SUPPORT_MENU_OPTIONS = [
    {
        key: 'help-center',
        label: 'Help Center',
        description: 'Open the Answerlattice help center',
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
