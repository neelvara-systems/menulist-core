import type { MenuCardTemplate } from '../models/templateTypes';

export const compactTemplate: MenuCardTemplate = {
    id: 'compact',
    version: '1.0.0',
    family: 'compact',
    name: 'Compact',
    description: 'Dense layout for long menus and price lists.',
    supportedPresets: ['home_print', 'whatsapp', 'table_menu', 'print_shop_packet', 'staff_reference'],
    supportedPaperSizes: ['a4', 'a5', 'letter'],
    supportedOrientations: ['portrait', 'landscape'],
    defaultDensity: 'compact',
    columns: 3,
};
