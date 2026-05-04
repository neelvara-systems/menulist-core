export enum PageType {
    OBP = 'obp',
    MENU = 'menu'
}

export const pageOptions = [
    { label: 'Official Page', value: PageType.OBP },
    { label: 'Menu Page', value: PageType.MENU }
];

export type DeviceTypes = 'desktop' | 'mobile' | 'tablet'
