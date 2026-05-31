import { PRODUCT_IDS } from '@constant/product';
import { CANONICA_ROUTES } from './routes';

export const CANONICA_PERMISSION_KEYS = {
    VIEW_READINESS: 'canViewReadiness',
    MANAGE_WORKSPACE: 'canManageWorkspace',
    MANAGE_TEAM: 'canManageTeam',
    ASSIGN_ROLES: 'canAssignRoles',
    MANAGE_BILLING: 'canManageBilling',
    MANAGE_KNOWLEDGE: 'canManageKnowledge',
    MANAGE_GOVERNANCE: 'canManageGovernance',
    MANAGE_WIDGET: 'canManageWidget',
    MANAGE_SUPPORT: 'canManageSupport',
    MANAGE_INTEGRATIONS: 'canManageIntegrations',
    EXPORT_DATA: 'canExportData',
    REBUILD_CONTEXT: 'canRebuildContext',
} as const;

export type CanonicaPermissionKey = typeof CANONICA_PERMISSION_KEYS[keyof typeof CANONICA_PERMISSION_KEYS];
export type CanonicaRolePermissions = Partial<Record<CanonicaPermissionKey, boolean>>;

export type CanonicaRoleDefinition = {
    id: string;
    name: string;
    description: string;
    active: boolean;
    permissions: CanonicaRolePermissions;
    pId: typeof PRODUCT_IDS.CANONICA;
    tId: number;
    sId: number;
    createdOn: string;
    createdBy: string;
    modifiedOn?: string;
    modifiedBy?: string;
};

export const DEFAULT_CANONICA_ROLE_IDS = {
    OWNER: 'owner',
    MANAGER: 'manager',
    STAFF: 'staff',
} as const;

export type DefaultCanonicaRoleId = typeof DEFAULT_CANONICA_ROLE_IDS[keyof typeof DEFAULT_CANONICA_ROLE_IDS];

export const CANONICA_ALL_PERMISSIONS: CanonicaPermissionKey[] = Object.values(CANONICA_PERMISSION_KEYS);

export const CANONICA_PERMISSION_LABELS: Record<CanonicaPermissionKey, string> = {
    [CANONICA_PERMISSION_KEYS.VIEW_READINESS]: 'View readiness and reports',
    [CANONICA_PERMISSION_KEYS.MANAGE_WORKSPACE]: 'Manage product details',
    [CANONICA_PERMISSION_KEYS.MANAGE_TEAM]: 'Manage team access',
    [CANONICA_PERMISSION_KEYS.ASSIGN_ROLES]: 'Create and assign roles',
    [CANONICA_PERMISSION_KEYS.MANAGE_BILLING]: 'Manage billing',
    [CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE]: 'Manage knowledge content',
    [CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE]: 'Manage knowledge governance',
    [CANONICA_PERMISSION_KEYS.MANAGE_WIDGET]: 'Manage widget install',
    [CANONICA_PERMISSION_KEYS.MANAGE_SUPPORT]: 'Manage support signals',
    [CANONICA_PERMISSION_KEYS.MANAGE_INTEGRATIONS]: 'Manage workflow notifications',
    [CANONICA_PERMISSION_KEYS.EXPORT_DATA]: 'Export data',
    [CANONICA_PERMISSION_KEYS.REBUILD_CONTEXT]: 'Rebuild context bundles',
};

export const CANONICA_PERMISSION_DESCRIPTIONS: Record<CanonicaPermissionKey, string> = {
    [CANONICA_PERMISSION_KEYS.VIEW_READINESS]: 'Can open readiness metrics, digest, and operational health summaries.',
    [CANONICA_PERMISSION_KEYS.MANAGE_WORKSPACE]: 'Can edit product profile, surfaces, and workspace setup details.',
    [CANONICA_PERMISSION_KEYS.MANAGE_TEAM]: 'Can add, edit, deactivate, and remove workspace members.',
    [CANONICA_PERMISSION_KEYS.ASSIGN_ROLES]: 'Can create custom roles and change a member role.',
    [CANONICA_PERMISSION_KEYS.MANAGE_BILLING]: 'Can view transactions and manage Canonica subscription settings.',
    [CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE]: 'Can import, edit, publish, and organize knowledge content.',
    [CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE]: 'Can review canonical answers, drift, entities, and signal queues.',
    [CANONICA_PERMISSION_KEYS.MANAGE_WIDGET]: 'Can configure widget keys, allowed origins, appearance, and install snippets.',
    [CANONICA_PERMISSION_KEYS.MANAGE_SUPPORT]: 'Can review tickets, conversations, feedback, and support signals.',
    [CANONICA_PERMISSION_KEYS.MANAGE_INTEGRATIONS]: 'Can configure Slack/email workflow notifications and test deliveries.',
    [CANONICA_PERMISSION_KEYS.EXPORT_DATA]: 'Can export workspace data where export actions exist.',
    [CANONICA_PERMISSION_KEYS.REBUILD_CONTEXT]: 'Can rebuild compiled context bundles for runtime surfaces.',
};

export const CANONICA_PERMISSION_CATEGORIES: Array<{
    key: string;
    label: string;
    permissions: CanonicaPermissionKey[];
}> = [
    {
        key: 'workspace',
        label: 'Workspace',
        permissions: [
            CANONICA_PERMISSION_KEYS.VIEW_READINESS,
            CANONICA_PERMISSION_KEYS.MANAGE_WORKSPACE,
            CANONICA_PERMISSION_KEYS.MANAGE_TEAM,
            CANONICA_PERMISSION_KEYS.ASSIGN_ROLES,
        ],
    },
    {
        key: 'knowledge',
        label: 'Knowledge Control',
        permissions: [
            CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE,
            CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE,
            CANONICA_PERMISSION_KEYS.REBUILD_CONTEXT,
        ],
    },
    {
        key: 'runtime',
        label: 'Runtime Surfaces',
        permissions: [
            CANONICA_PERMISSION_KEYS.MANAGE_WIDGET,
            CANONICA_PERMISSION_KEYS.MANAGE_SUPPORT,
            CANONICA_PERMISSION_KEYS.MANAGE_INTEGRATIONS,
        ],
    },
    {
        key: 'commercial',
        label: 'Commercial',
        permissions: [
            CANONICA_PERMISSION_KEYS.MANAGE_BILLING,
            CANONICA_PERMISSION_KEYS.EXPORT_DATA,
        ],
    },
];

const ownerPermissions = CANONICA_ALL_PERMISSIONS.reduce((acc, permission) => {
    acc[permission] = true;
    return acc;
}, {} as Record<CanonicaPermissionKey, boolean>);

const managerPermissions: Record<CanonicaPermissionKey, boolean> = {
    [CANONICA_PERMISSION_KEYS.VIEW_READINESS]: true,
    [CANONICA_PERMISSION_KEYS.MANAGE_WORKSPACE]: true,
    [CANONICA_PERMISSION_KEYS.MANAGE_TEAM]: true,
    [CANONICA_PERMISSION_KEYS.ASSIGN_ROLES]: false,
    [CANONICA_PERMISSION_KEYS.MANAGE_BILLING]: false,
    [CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE]: true,
    [CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE]: true,
    [CANONICA_PERMISSION_KEYS.MANAGE_WIDGET]: true,
    [CANONICA_PERMISSION_KEYS.MANAGE_SUPPORT]: true,
    [CANONICA_PERMISSION_KEYS.MANAGE_INTEGRATIONS]: false,
    [CANONICA_PERMISSION_KEYS.EXPORT_DATA]: false,
    [CANONICA_PERMISSION_KEYS.REBUILD_CONTEXT]: false,
};

const staffPermissions: Record<CanonicaPermissionKey, boolean> = {
    [CANONICA_PERMISSION_KEYS.VIEW_READINESS]: false,
    [CANONICA_PERMISSION_KEYS.MANAGE_WORKSPACE]: false,
    [CANONICA_PERMISSION_KEYS.MANAGE_TEAM]: false,
    [CANONICA_PERMISSION_KEYS.ASSIGN_ROLES]: false,
    [CANONICA_PERMISSION_KEYS.MANAGE_BILLING]: false,
    [CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE]: false,
    [CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE]: false,
    [CANONICA_PERMISSION_KEYS.MANAGE_WIDGET]: false,
    [CANONICA_PERMISSION_KEYS.MANAGE_SUPPORT]: true,
    [CANONICA_PERMISSION_KEYS.MANAGE_INTEGRATIONS]: false,
    [CANONICA_PERMISSION_KEYS.EXPORT_DATA]: false,
    [CANONICA_PERMISSION_KEYS.REBUILD_CONTEXT]: false,
};

export const DEFAULT_CANONICA_ROLE_METADATA = {
    [DEFAULT_CANONICA_ROLE_IDS.OWNER]: {
        name: 'Owner',
        description: 'Full access to Canonica setup, knowledge governance, billing, team, and runtime controls.',
        permissions: ownerPermissions,
    },
    [DEFAULT_CANONICA_ROLE_IDS.MANAGER]: {
        name: 'Manager',
        description: 'Can run daily Canonica setup, knowledge, widget, and support work. No billing or role design.',
        permissions: managerPermissions,
    },
    [DEFAULT_CANONICA_ROLE_IDS.STAFF]: {
        name: 'Support Staff',
        description: 'Can review support signals assigned to the team. No workspace, billing, or governance controls.',
        permissions: staffPermissions,
    },
} as const;

export const CANONICA_ROUTE_PERMISSION_REQUIREMENTS: Partial<Record<string, CanonicaPermissionKey>> = {
    [CANONICA_ROUTES.ACTIVATION]: CANONICA_PERMISSION_KEYS.VIEW_READINESS,
    [CANONICA_ROUTES.INSTALL_CENTER]: CANONICA_PERMISSION_KEYS.MANAGE_WIDGET,
    [CANONICA_ROUTES.DASHBOARD]: CANONICA_PERMISSION_KEYS.VIEW_READINESS,
    [CANONICA_ROUTES.SETTINGS]: CANONICA_PERMISSION_KEYS.MANAGE_WORKSPACE,
    [CANONICA_ROUTES.TEAM]: CANONICA_PERMISSION_KEYS.MANAGE_TEAM,
    [CANONICA_ROUTES.KNOWLEDGE_INTAKE]: CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE,
    [CANONICA_ROUTES.KB_GENERATION]: CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE,
    [CANONICA_ROUTES.PRODUCT_SURFACES]: CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE,
    [CANONICA_ROUTES.KNOWLEDGE_BASE]: CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE,
    [CANONICA_ROUTES.FAQS]: CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE,
    [CANONICA_ROUTES.CHANGELOG]: CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE,
    [CANONICA_ROUTES.WIDGET]: CANONICA_PERMISSION_KEYS.MANAGE_WIDGET,
    [CANONICA_ROUTES.SUPPORT_BOARD]: CANONICA_PERMISSION_KEYS.MANAGE_SUPPORT,
    [CANONICA_ROUTES.TICKETS]: CANONICA_PERMISSION_KEYS.MANAGE_SUPPORT,
    [CANONICA_ROUTES.CONVERSATIONS]: CANONICA_PERMISSION_KEYS.MANAGE_SUPPORT,
    [CANONICA_ROUTES.FEEDBACK]: CANONICA_PERMISSION_KEYS.MANAGE_SUPPORT,
    [CANONICA_ROUTES.WEEKLY_DIGEST]: CANONICA_PERMISSION_KEYS.VIEW_READINESS,
    [CANONICA_ROUTES.BILLING]: CANONICA_PERMISSION_KEYS.MANAGE_BILLING,
    [CANONICA_ROUTES.TRANSACTIONS]: CANONICA_PERMISSION_KEYS.MANAGE_BILLING,
    [CANONICA_ROUTES.GOVERNANCE]: CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE,
};

export function createDefaultCanonicaRoles(params: {
    tId: number;
    sId: number;
    createdBy: string;
}): CanonicaRoleDefinition[] {
    const now = new Date().toISOString();
    return Object.entries(DEFAULT_CANONICA_ROLE_METADATA).map(([roleId, metadata]) => ({
        id: roleId,
        name: metadata.name,
        description: metadata.description,
        active: true,
        permissions: { ...metadata.permissions },
        pId: PRODUCT_IDS.CANONICA,
        tId: params.tId,
        sId: params.sId,
        createdOn: now,
        createdBy: params.createdBy || 'system',
    }));
}

export function normalizeCanonicaRolePermissions(
    permissions: CanonicaRolePermissions | undefined,
    defaults: CanonicaRolePermissions = {},
): Record<CanonicaPermissionKey, boolean> {
    return CANONICA_ALL_PERMISSIONS.reduce((acc, permission) => {
        acc[permission] = permissions?.[permission] === true || defaults?.[permission] === true;
        return acc;
    }, {} as Record<CanonicaPermissionKey, boolean>);
}

export function getCanonicaRouteRequiredPermission(pathname: string): CanonicaPermissionKey | null {
    const normalized = pathname === '/' ? CANONICA_ROUTES.DASHBOARD : pathname.replace(/\/+$/, '');
    const exact = CANONICA_ROUTE_PERMISSION_REQUIREMENTS[normalized];
    if (exact) return exact;

    const prefix = Object.entries(CANONICA_ROUTE_PERMISSION_REQUIREMENTS)
        .find(([route]) => normalized.startsWith(`${route}/`));
    return prefix?.[1] || null;
}
