import type { MenuCardTemplate } from '../models/templateTypes';

export const classicTemplate: MenuCardTemplate = {
    id: 'classic',
    version: '1.0.0',
    family: 'classic',
    name: 'Classic',
    description: 'Balanced two-column menu for restaurants and cafes.',
    supportedPresets: ['home_print', 'whatsapp', 'table_menu', 'print_shop_packet', 'staff_reference'],
    supportedPaperSizes: ['a4', 'a5', 'letter'],
    supportedOrientations: ['portrait'],
    defaultDensity: 'balanced',
    columns: 2,
};
