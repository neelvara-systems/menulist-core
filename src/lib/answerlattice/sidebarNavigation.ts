import {
    ANSWERLATTICE_PRIMARY_SIDEBAR_SECTIONS,
    AnswerlatticeNavItem,
    AnswerlatticePrimarySidebarSection,
} from '@constant/answerlattice/navigations';

export interface AnswerlatticeProjectedSidebarSection extends Omit<AnswerlatticePrimarySidebarSection, 'items'> {
    items: AnswerlatticeNavItem[];
}

export interface AnswerlatticeSidebarProjection {
    primarySections: AnswerlatticeProjectedSidebarSection[];
    advancedItems: AnswerlatticeNavItem[];
    visibleAdvancedItems: AnswerlatticeNavItem[];
}

/**
 * Projects an already-authorized route inventory into the founder-first shell.
 * Permission and feature-flag filtering deliberately remain upstream so an
 * unauthorized route can never be reintroduced by presentation metadata.
 */
export function projectAnswerlatticeSidebarNavigation(
    authorizedItems: AnswerlatticeNavItem[],
    selectedKey: string,
    allToolsRevealed: boolean,
): AnswerlatticeSidebarProjection {
    const authorizedByRoute = new Map(authorizedItems.map(item => [item.route, item]));
    const primarySections = ANSWERLATTICE_PRIMARY_SIDEBAR_SECTIONS
        .map(section => ({
            ...section,
            items: section.items.flatMap(item => {
                const authorizedItem = authorizedByRoute.get(item.route);
                if (!authorizedItem) return [];

                return [{
                    ...authorizedItem,
                    icon: item.icon || authorizedItem.icon,
                    label: item.label || authorizedItem.label,
                }];
            }),
        }))
        .filter(section => section.items.length > 0);
    const primaryRoutes = new Set(
        primarySections.flatMap(section => section.items.map(item => item.route)),
    );
    const advancedItems = authorizedItems.filter(item => !primaryRoutes.has(item.route));
    const activeAdvancedItem = advancedItems.find(item => item.route === selectedKey);
    const visibleAdvancedItems = allToolsRevealed
        ? advancedItems
        : (activeAdvancedItem ? [activeAdvancedItem] : []);

    return {
        advancedItems,
        primarySections,
        visibleAdvancedItems,
    };
}
