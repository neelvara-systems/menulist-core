import type { MenuCardTemplate } from '../models/templateTypes';

export const takeawayTemplate: MenuCardTemplate = {
    id: 'takeaway',
    version: '1.0.0',
    family: 'takeaway',
    name: 'Takeaway',
    description: 'Small-format menu insert with QR emphasis.',
    supportedPresets: ['takeaway_insert', 'qr_insert'],
    supportedPaperSizes: ['a5'],
    supportedOrientations: ['portrait'],
    defaultDensity: 'compact',
    columns: 1,
};
