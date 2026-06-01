import {
    LuBot,
    LuBuilding2,
    LuClipboardCheck,
    LuFileText,
    LuGlobe2,
    LuListChecks,
    LuMapPin,
    LuQrCode,
    LuSearch,
    LuTableProperties,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import type { WebsiteResourceCluster } from '@/content/websiteResources/types';

export const resourceIconByCluster: Record<WebsiteResourceCluster, IconType> = {
    'source-audit': LuClipboardCheck,
    'official-source': LuGlobe2,
    'qr-menu': LuQrCode,
    'google-menu': LuMapPin,
    'menu-seo': LuSearch,
    'ai-discovery': LuBot,
    'menu-engineering': LuTableProperties,
    'checklists': LuListChecks,
    'multi-location': LuBuilding2,
};

export const ResourceFallbackIcon = LuFileText;
