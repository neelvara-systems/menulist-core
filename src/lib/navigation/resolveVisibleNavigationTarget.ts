export type VisibleNavigationTarget = {
    defaultRoute?: string;
    route: string;
    subNav?: ReadonlyArray<{
        route: string;
    }>;
};

/**
 * Resolves a navigation destination from the already-filtered item shown to
 * the owner. A hidden default route must never become reachable again merely
 * because the parent group was selected.
 */
export const resolveVisibleNavigationTarget = (
    navItem: VisibleNavigationTarget,
): string | null => {
    const visibleChildren = navItem.subNav ?? [];

    if (!visibleChildren.length) return navItem.route || null;

    const visibleDefault = visibleChildren.find((child) => (
        child.route === navItem.defaultRoute
    ));

    return visibleDefault?.route ?? visibleChildren[0]?.route ?? null;
};
