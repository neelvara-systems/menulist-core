import type { MenuCardDensity, MenuCardExportPreset, MenuCardOrientation, MenuCardPaperSize } from './exportTypes';

export type MenuCardTemplateFamily = 'classic' | 'compact' | 'premium' | 'takeaway' | 'photo' | 'drinks' | 'folded';

export type MenuCardTemplate = {
    id: string;
    version: string;
    family: MenuCardTemplateFamily;
    name: string;
    description: string;
    supportedPresets: MenuCardExportPreset[];
    supportedPaperSizes: MenuCardPaperSize[];
    supportedOrientations: MenuCardOrientation[];
    defaultDensity: MenuCardDensity;
    columns: 1 | 2 | 3;
};
