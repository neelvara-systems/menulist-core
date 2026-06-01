import type { MenuCardTemplate } from '../models/templateTypes';

export const drinksTemplate: MenuCardTemplate = {
    id: 'drinks',
    version: '1.0.0',
    family: 'drinks',
    name: 'Drinks',
    description: 'Compact price-list layout for drinks and counters.',
    supportedPresets: ['home_print', 'whatsapp', 'table_menu'],
    supportedPaperSizes: ['a4', 'a5', 'letter'],
    supportedOrientations: ['portrait'],
    defaultDensity: 'compact',
    columns: 2,
};
