import { LuArchive, LuBook, LuBug, LuPalette, LuSparkles, LuShield, LuThumbsUp, LuTrash2, LuWrench, LuZap } from 'react-icons/lu';

export const CHANGELOG_TAGS = {
    NEW_FEATURE: 'New Feature',
    IMPROVEMENT: 'Improvement',
    BUG_FIX: 'Bug Fix',
    PERFORMANCE: 'Performance',
    UI_UX: 'UI/UX',
    SECURITY: 'Security',
    DEPRECATED: 'Deprecated',
    REMOVED: 'Removed',
    MAINTENANCE: 'Maintenance',
    DOCUMENTATION: 'Documentation',
};

export const CHANGELOG_TAG_OPTIONS = Object.values(CHANGELOG_TAGS);

export const CHANGELOG_TAG_CONFIG = {
    [CHANGELOG_TAGS.NEW_FEATURE]: { icon: LuSparkles, color: 'blue' },
    [CHANGELOG_TAGS.IMPROVEMENT]: { icon: LuThumbsUp, color: 'cyan' },
    [CHANGELOG_TAGS.BUG_FIX]: { icon: LuBug, color: 'red' },
    [CHANGELOG_TAGS.PERFORMANCE]: { icon: LuZap, color: 'purple' },
    [CHANGELOG_TAGS.UI_UX]: { icon: LuPalette, color: 'geekblue' },
    [CHANGELOG_TAGS.SECURITY]: { icon: LuShield, color: 'gold' },
    [CHANGELOG_TAGS.DEPRECATED]: { icon: LuArchive, color: 'orange' },
    [CHANGELOG_TAGS.REMOVED]: { icon: LuTrash2, color: 'magenta' },
    [CHANGELOG_TAGS.MAINTENANCE]: { icon: LuWrench, color: 'volcano' },
    [CHANGELOG_TAGS.DOCUMENTATION]: { icon: LuBook, color: 'green' },
};
