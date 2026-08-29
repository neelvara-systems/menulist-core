export type UseMenuListPrerequisiteState = 'no_menu' | 'missing_public_address' | 'ready';

const hasText = (value: unknown): boolean => (
    typeof value === 'string' && value.trim().length > 0
);

export function getUseMenuListPrerequisiteState(input: {
    customDomain?: unknown;
    hasMenu: boolean;
    subdomain?: unknown;
}): UseMenuListPrerequisiteState {
    if (!input.hasMenu) return 'no_menu';
    if (!hasText(input.subdomain) && !hasText(input.customDomain)) {
        return 'missing_public_address';
    }
    return 'ready';
}
