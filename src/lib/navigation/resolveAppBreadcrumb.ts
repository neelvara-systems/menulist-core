import type { NavItemType } from '@constant/navigations';
import type { IconType } from 'react-icons';

export type ResolvedAppBreadcrumbSubpath = {
    active: boolean;
    icon: IconType;
    key: string | number;
    label: string;
    route: string;
};

export type ResolvedAppBreadcrumb = {
    icon: IconType;
    key: string | number;
    label: string;
    route: string;
    subNav: ResolvedAppBreadcrumbSubpath[];
};

/**
 * Resolves the active owner navigation path without decorating or mutating the
 * shared navigation catalog. The catalog is imported by the sidebar as well as
 * the header, so render-local keys and active flags must remain derived data.
 */
export const resolveAppBreadcrumb = (
    pathname: string,
    layout: readonly NavItemType[],
): ResolvedAppBreadcrumb[] => {
    const parentIndex = layout.findIndex((navItem) => (
        navItem.route === pathname
        || navItem.subNav?.some((subNavItem) => subNavItem.route === pathname)
    ));

    if (parentIndex < 0) return [];

    const parent = layout[parentIndex];
    if (!parent) return [];

    const subNav = (parent.subNav ?? []).map((subNavItem, subNavIndex) => ({
        active: subNavItem.route === pathname,
        icon: subNavItem.icon,
        key: subNavItem.key ?? `${parentIndex}:${subNavIndex}`,
        label: subNavItem.label,
        route: subNavItem.route,
    }));
    const activeSubNav = subNav.find((subNavItem) => subNavItem.active);

    return [{
        icon: parent.icon,
        key: activeSubNav?.key ?? parent.key ?? `parent:${parentIndex}`,
        label: parent.label,
        route: parent.route,
        subNav,
    }];
};
