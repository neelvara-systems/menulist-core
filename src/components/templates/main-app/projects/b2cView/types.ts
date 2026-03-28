export enum PageType {
    HOME = 'home',
    MENU = 'menu'
}

export const pageOptions = [
    { label: 'Home Page', value: PageType.HOME },
    { label: 'Menu Page', value: PageType.MENU }
];

export type DeviceTypes = 'desktop' | 'mobile' | 'tablet'