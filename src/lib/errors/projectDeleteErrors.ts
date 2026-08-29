export const PROJECT_DELETE_REJECTION_CODES = {
    ALREADY_DELETED: 'project_delete_already_deleted',
    FAILED: 'project_delete_failed',
    FORBIDDEN: 'project_delete_forbidden',
    INHERITED_OUTLET: 'project_delete_inherited_outlet',
    INVALID_INPUT: 'project_delete_invalid_input',
    LINKED_OUTLETS: 'project_delete_linked_outlets',
    LIVE_SPECIAL_MENU_REFERENCE: 'project_delete_live_special_menu_reference',
    NOT_FOUND: 'project_delete_not_found',
    PROTECTED_SPECIAL_MENU: 'project_delete_protected_special_menu',
    RATE_LIMITED: 'project_delete_rate_limited',
    STORE_MEMBERSHIP_CHANGED: 'project_delete_store_membership_changed',
    STORE_STATE_CHANGED: 'project_delete_store_state_changed',
    TENANT_STATE_CHANGED: 'project_delete_tenant_state_changed',
} as const;

export type ProjectDeleteRejectionCode = (
    typeof PROJECT_DELETE_REJECTION_CODES[keyof typeof PROJECT_DELETE_REJECTION_CODES]
);

const PROJECT_DELETE_REJECTION_CODE_SET = new Set<string>(
    Object.values(PROJECT_DELETE_REJECTION_CODES),
);

export const isProjectDeleteRejectionCode = (
    value: unknown,
): value is ProjectDeleteRejectionCode => (
    typeof value === 'string' && PROJECT_DELETE_REJECTION_CODE_SET.has(value)
);

export const PROJECT_DELETE_SAFE_UI_MESSAGES: Readonly<Record<ProjectDeleteRejectionCode, string>> = {
    [PROJECT_DELETE_REJECTION_CODES.ALREADY_DELETED]: 'This menu was already deleted. Refresh your menus to continue.',
    [PROJECT_DELETE_REJECTION_CODES.FAILED]: 'Could not delete this menu. Please try again.',
    [PROJECT_DELETE_REJECTION_CODES.FORBIDDEN]: 'You no longer have permission to delete this menu.',
    [PROJECT_DELETE_REJECTION_CODES.INHERITED_OUTLET]: 'This inherited menu cannot be deleted here. Manage it from its main location.',
    [PROJECT_DELETE_REJECTION_CODES.INVALID_INPUT]: 'Could not verify this menu. Refresh your menus and try again.',
    [PROJECT_DELETE_REJECTION_CODES.LINKED_OUTLETS]: 'This menu is used by another location and cannot be deleted. Contact MenuList support if it must be removed.',
    [PROJECT_DELETE_REJECTION_CODES.LIVE_SPECIAL_MENU_REFERENCE]: 'End or cancel the special menu using this menu before deleting it.',
    [PROJECT_DELETE_REJECTION_CODES.NOT_FOUND]: 'This menu is no longer available. Refresh your menus to continue.',
    [PROJECT_DELETE_REJECTION_CODES.PROTECTED_SPECIAL_MENU]: 'End or cancel this special menu before deleting it.',
    [PROJECT_DELETE_REJECTION_CODES.RATE_LIMITED]: 'Too many delete attempts. Wait a moment and try again.',
    [PROJECT_DELETE_REJECTION_CODES.STORE_MEMBERSHIP_CHANGED]: 'Your location access changed. Refresh and try again.',
    [PROJECT_DELETE_REJECTION_CODES.STORE_STATE_CHANGED]: 'This location changed. Refresh and try again.',
    [PROJECT_DELETE_REJECTION_CODES.TENANT_STATE_CHANGED]: 'This business changed. Refresh and try again.',
};

export const getProjectDeleteSafeUiMessage = (code: unknown): string | null => (
    isProjectDeleteRejectionCode(code) ? PROJECT_DELETE_SAFE_UI_MESSAGES[code] : null
);

export type ProjectDeleteRejectionResponse = {
    code: ProjectDeleteRejectionCode;
    error: string;
};

export const isProjectDeleteRejectionResponse = (
    value: unknown,
): value is ProjectDeleteRejectionResponse => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const candidate = value as { code?: unknown; error?: unknown };
    return isProjectDeleteRejectionCode(candidate.code) && typeof candidate.error === 'string';
};
