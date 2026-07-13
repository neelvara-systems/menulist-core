import { PRODUCT_IDS } from '@constant/product';
import { ANSWERLATTICE_ROUTES } from './routes';

export const ANSWERLATTICE_PERMISSION_KEYS = {
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

export type AnswerlatticePermissionKey = typeof ANSWERLATTICE_PERMISSION_KEYS[keyof typeof ANSWERLATTICE_PERMISSION_KEYS];
export type AnswerlatticeRolePermissions = Partial<Record<AnswerlatticePermissionKey, boolean>>;

export type AnswerlatticeRoleDefinition = {
    id: string;
    name: string;
    description: string;
    active: boolean;
    permissions: AnswerlatticeRolePermissions;
    pId: typeof PRODUCT_IDS.ANSWERLATTICE;
    tId: number;
    sId: number;
    createdOn: string;
    createdBy: string;
    creationRequestFingerprint?: string;
    creationRequestId?: string;
    modifiedOn?: string;
    modifiedBy?: string;
};

export const DEFAULT_ANSWERLATTICE_ROLE_IDS = {
    OWNER: 'owner',
    MANAGER: 'manager',
    STAFF: 'staff',
} as const;

export type DefaultAnswerlatticeRoleId = typeof DEFAULT_ANSWERLATTICE_ROLE_IDS[keyof typeof DEFAULT_ANSWERLATTICE_ROLE_IDS];

export function isDefaultAnswerlatticeRoleId(value: unknown): value is DefaultAnswerlatticeRoleId {
    return typeof value === 'string'
        && Object.values(DEFAULT_ANSWERLATTICE_ROLE_IDS).includes(value as DefaultAnswerlatticeRoleId);
}

export const ANSWERLATTICE_ALL_PERMISSIONS: AnswerlatticePermissionKey[] = Object.values(ANSWERLATTICE_PERMISSION_KEYS);

export const ANSWERLATTICE_PERMISSION_LABELS: Record<AnswerlatticePermissionKey, string> = {
    [ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS]: 'View readiness and reports',
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WORKSPACE]: 'Manage product details',
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_TEAM]: 'Manage team access',
    [ANSWERLATTICE_PERMISSION_KEYS.ASSIGN_ROLES]: 'Create and assign roles',
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING]: 'Manage billing',
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE]: 'Manage knowledge content',
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE]: 'Manage knowledge governance',
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET]: 'Manage widget install',
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT]: 'Manage support signals',
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS]: 'Manage workflow notifications',
    [ANSWERLATTICE_PERMISSION_KEYS.EXPORT_DATA]: 'Export data',
    [ANSWERLATTICE_PERMISSION_KEYS.REBUILD_CONTEXT]: 'Rebuild context bundles',
};

export const ANSWERLATTICE_PERMISSION_DESCRIPTIONS: Record<AnswerlatticePermissionKey, string> = {
    [ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS]: 'Can open readiness metrics, digest, and operational health summaries.',
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WORKSPACE]: 'Can edit product profile, surfaces, and workspace setup details.',
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_TEAM]: 'Can add, edit, deactivate, and remove workspace members.',
    [ANSWERLATTICE_PERMISSION_KEYS.ASSIGN_ROLES]: 'Can create custom roles and change a member role.',
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING]: 'Can view transactions and manage Answerlattice subscription settings.',
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE]: 'Can import, edit, publish, and organize knowledge content.',
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE]: 'Can review canonical answers, drift, entities, and signal queues.',
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET]: 'Can configure widget keys, allowed origins, appearance, and install snippets.',
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT]: 'Can review tickets, conversations, feedback, and support signals.',
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS]: 'Can configure Slack/email workflow notifications and test deliveries.',
    [ANSWERLATTICE_PERMISSION_KEYS.EXPORT_DATA]: 'Can export workspace data where export actions exist.',
    [ANSWERLATTICE_PERMISSION_KEYS.REBUILD_CONTEXT]: 'Can rebuild compiled context bundles for runtime surfaces.',
};

export const ANSWERLATTICE_PERMISSION_CATEGORIES: Array<{
    key: string;
    label: string;
    permissions: AnswerlatticePermissionKey[];
}> = [
    {
        key: 'workspace',
        label: 'Workspace',
        permissions: [
            ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS,
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WORKSPACE,
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_TEAM,
            ANSWERLATTICE_PERMISSION_KEYS.ASSIGN_ROLES,
        ],
    },
    {
        key: 'knowledge',
        label: 'Knowledge Control',
        permissions: [
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE,
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE,
            ANSWERLATTICE_PERMISSION_KEYS.REBUILD_CONTEXT,
        ],
    },
    {
        key: 'runtime',
        label: 'Runtime Surfaces',
        permissions: [
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET,
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT,
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS,
        ],
    },
    {
        key: 'commercial',
        label: 'Commercial',
        permissions: [
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING,
            ANSWERLATTICE_PERMISSION_KEYS.EXPORT_DATA,
        ],
    },
];

const ownerPermissions = ANSWERLATTICE_ALL_PERMISSIONS.reduce((acc, permission) => {
    acc[permission] = true;
    return acc;
}, {} as Record<AnswerlatticePermissionKey, boolean>);

const managerPermissions: Record<AnswerlatticePermissionKey, boolean> = {
    [ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS]: true,
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WORKSPACE]: true,
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_TEAM]: true,
    [ANSWERLATTICE_PERMISSION_KEYS.ASSIGN_ROLES]: false,
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING]: false,
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE]: true,
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE]: true,
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET]: true,
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT]: true,
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS]: false,
    [ANSWERLATTICE_PERMISSION_KEYS.EXPORT_DATA]: false,
    [ANSWERLATTICE_PERMISSION_KEYS.REBUILD_CONTEXT]: false,
};

const staffPermissions: Record<AnswerlatticePermissionKey, boolean> = {
    [ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS]: false,
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WORKSPACE]: false,
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_TEAM]: false,
    [ANSWERLATTICE_PERMISSION_KEYS.ASSIGN_ROLES]: false,
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING]: false,
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE]: false,
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE]: false,
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET]: false,
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT]: true,
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS]: false,
    [ANSWERLATTICE_PERMISSION_KEYS.EXPORT_DATA]: false,
    [ANSWERLATTICE_PERMISSION_KEYS.REBUILD_CONTEXT]: false,
};

export const DEFAULT_ANSWERLATTICE_ROLE_METADATA = {
    [DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER]: {
        name: 'Owner',
        description: 'Full access to Answerlattice setup, knowledge governance, billing, team, and runtime controls.',
        permissions: ownerPermissions,
    },
    [DEFAULT_ANSWERLATTICE_ROLE_IDS.MANAGER]: {
        name: 'Manager',
        description: 'Can run daily Answerlattice setup, knowledge, widget, and support work. No billing or role design.',
        permissions: managerPermissions,
    },
    [DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF]: {
        name: 'Support Staff',
        description: 'Can review support signals assigned to the team. No workspace, billing, or governance controls.',
        permissions: staffPermissions,
    },
} as const;

const DEFAULT_ANSWERLATTICE_ROLE_CREATED_ON = new Date(0).toISOString();

export const ANSWERLATTICE_ROUTE_PERMISSION_REQUIREMENTS: Partial<Record<string, AnswerlatticePermissionKey>> = {
    [ANSWERLATTICE_ROUTES.ACTIVATION]: ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS,
    [ANSWERLATTICE_ROUTES.INSTALL_CENTER]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET,
    [ANSWERLATTICE_ROUTES.DASHBOARD]: ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS,
    [ANSWERLATTICE_ROUTES.SETTINGS]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WORKSPACE,
    [ANSWERLATTICE_ROUTES.TEAM]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_TEAM,
    [ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE,
    [ANSWERLATTICE_ROUTES.KB_GENERATION]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE,
    [ANSWERLATTICE_ROUTES.ANSWER_TESTS]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE,
    [ANSWERLATTICE_ROUTES.KNOWN_ISSUES]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE,
    [ANSWERLATTICE_ROUTES.SUPPORT_ASSISTANT]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT,
    [ANSWERLATTICE_ROUTES.PRODUCT_SURFACES]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE,
    [ANSWERLATTICE_ROUTES.KNOWLEDGE_BASE]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE,
    [ANSWERLATTICE_ROUTES.FAQS]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE,
    [ANSWERLATTICE_ROUTES.CHANGELOG]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE,
    [ANSWERLATTICE_ROUTES.WIDGET]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET,
    [ANSWERLATTICE_ROUTES.SUPPORT_BOARD]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT,
    [ANSWERLATTICE_ROUTES.TICKETS]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT,
    [ANSWERLATTICE_ROUTES.CONVERSATIONS]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT,
    [ANSWERLATTICE_ROUTES.FEEDBACK]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT,
    [ANSWERLATTICE_ROUTES.WEEKLY_DIGEST]: ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS,
    [ANSWERLATTICE_ROUTES.BILLING]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING,
    [ANSWERLATTICE_ROUTES.TRANSACTIONS]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING,
    [ANSWERLATTICE_ROUTES.GOVERNANCE]: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE,
};

export function createDefaultAnswerlatticeRoles(params: {
    tId: number;
    sId: number;
    createdBy: string;
}): AnswerlatticeRoleDefinition[] {
    return Object.entries(DEFAULT_ANSWERLATTICE_ROLE_METADATA).map(([roleId, metadata]) => ({
        id: roleId,
        name: metadata.name,
        description: metadata.description,
        active: true,
        permissions: { ...metadata.permissions },
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: params.tId,
        sId: params.sId,
        createdOn: DEFAULT_ANSWERLATTICE_ROLE_CREATED_ON,
        createdBy: 'system',
    }));
}

export function normalizeAnswerlatticeRolePermissions(
    permissions: AnswerlatticeRolePermissions | undefined,
    defaults: AnswerlatticeRolePermissions = {},
): Record<AnswerlatticePermissionKey, boolean> {
    return ANSWERLATTICE_ALL_PERMISSIONS.reduce((acc, permission) => {
        acc[permission] = permissions?.[permission] === true || defaults?.[permission] === true;
        return acc;
    }, {} as Record<AnswerlatticePermissionKey, boolean>);
}

export function getAnswerlatticeRouteRequiredPermission(pathname: string): AnswerlatticePermissionKey | null {
    const normalized = pathname === '/' ? ANSWERLATTICE_ROUTES.DASHBOARD : pathname.replace(/\/+$/, '');
    const exact = ANSWERLATTICE_ROUTE_PERMISSION_REQUIREMENTS[normalized];
    if (exact) return exact;

    const prefix = Object.entries(ANSWERLATTICE_ROUTE_PERMISSION_REQUIREMENTS)
        .find(([route]) => normalized.startsWith(`${route}/`));
    return prefix?.[1] || null;
}
