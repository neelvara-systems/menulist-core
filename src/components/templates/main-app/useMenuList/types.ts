/**
 * Use MenuList — Output Center Types (v2)
 *
 * @see __docs__/use-menulist/use-menulist_impl.md
 */

import type { DigitalScreenSeenByMode } from '@type/campaigns';

export interface ProjectLink {
    projectId: string;
    name: string | Record<string, string>;
    isDefault: boolean;
    active?: boolean;
    deleted?: boolean;
    isSpecialMenu?: boolean;
    projectImage?: string | null;
    specialMenuBaseProjectId?: string;
    specialMenuEndsAt?: string;
    specialMenuStatus?: 'scheduled' | 'active' | 'expired' | 'cancelled';
    url: string;
    feedbackUrl: string;
    feedbackQrUrl: string;
}

export interface UseMenuListData {
    // Links
    obpLink: string;
    menuLink: string;
    installAppLink: string | null;
    feedbackLink: string;
    feedbackQrLink: string;

    // Screen
    screenToken: string | null;
    menuBoardLink: string | null;
    highlightsLink: string | null;
    screenContentVersion: number | null;
    screenSeenByMode?: DigitalScreenSeenByMode;

    // Store info
    storeName: string;
    storeLogo: string | null;
    subdomain: string;
    customDomain: string | null;
    businessType: string;

    // Project info (active/selected project)
    projectId: string | null;
    projectName: string | null;
    isDefaultProject: boolean;
    menuModifiedOn: unknown;

    // Multi-project support
    allProjects: ProjectLink[];

    // POS Sync (optional — only when enabled)
    hasPosSync: boolean;
    posSyncStatus: string | null;

    // States
    hasPublishedMenu: boolean;
    hasScreen: boolean;
    hasFeedbackEnabled: boolean;
}

export type PageState = 'loading' | 'no_menu' | 'missing_public_address' | 'not_published' | 'ready';
