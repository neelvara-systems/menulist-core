import type { MenuCardTemplate } from '../models/templateTypes';

export const premiumTemplate: MenuCardTemplate = {
    id: 'premium',
    version: '1.0.0',
    family: 'premium',
    name: 'Premium',
    description: 'Airier single-column layout for shorter menus.',
    supportedPresets: ['home_print', 'whatsapp', 'table_menu', 'print_shop_packet'],
    supportedPaperSizes: ['a4', 'a5', 'letter'],
    supportedOrientations: ['portrait'],
    defaultDensity: 'comfortable',
    columns: 1,
};
