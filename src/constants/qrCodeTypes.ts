
export type QRProps = {
    value?: string;
    ecLevel?: 'L' | 'M' | 'Q' | 'H';
    enableCORS?: boolean;
    size?: number;
    quietZone?: number;
    bgColor?: string;
    fgColor?: string;
    logoImage?: string;
    logoWidth?: number;
    logoHeight?: number;
    logoOpacity?: number;
    removeQrCodeBehindLogo?: boolean;
    logoPadding?: number;
    logoPaddingStyle?: 'square' | 'circle';
    eyeRadius?: any;
    borderRadius: number;
    contentType: any,
    // eyeRadius?: CornerRadii | [CornerRadii, CornerRadii, CornerRadii];
    eyeColor?: any;
    // eyeColor?: EyeColor | [EyeColor, EyeColor, EyeColor];
    qrStyle?: 'squares' | 'dots' | 'fluid';
    style?: object;
    id?: string;
    valueType: any;
    phone: any;
    text: any;
}

export const TAB_TYPES = {
    STYLE: 'Style',
    CONTENT: 'Content',
    TEMPLATE: 'Theme',
}

export const CONTENT_TYPES = [
    { id: 1, tooltip: 'Facebook Link', name: 'Facebook', icon: "facebook" },
    { id: 2, tooltip: 'Instagram Link', name: 'Instagram', icon: "instagram" },
    { id: 3, tooltip: 'Twitter Link', name: 'Twitter', icon: "twitter" },
    { id: 4, tooltip: 'Linkedin Link', name: 'Linkedin', icon: "linkedin" },
    { id: 5, tooltip: 'Youtube Link', name: 'Youtube', icon: "youtube" },
    { id: 6, tooltip: 'Dribble Link', name: 'Dribble', icon: "dribble" },
    { id: 7, tooltip: 'Email Link', name: 'Email', icon: "email" },
    { id: 8, tooltip: 'Pinterest Link', name: 'Pinterest', icon: "pinterest" },
    { id: 10, tooltip: 'Tiktok Link', name: 'Tiktok', icon: "tiktok" },
    { id: 11, tooltip: 'Snapchat Link', name: 'Snapchat', icon: "snapchat" },
    { id: 12, tooltip: 'Drive Link', name: 'Drive', icon: "drive" },
    { id: 13, tooltip: 'Vcard Link', name: 'Vcard', icon: "vcard" },
    { id: 14, tooltip: 'Call Link', name: 'Call', icon: "call" },
    { id: 15, tooltip: 'SMS Link', name: 'SMS', icon: "sms" },
    { id: 16, tooltip: 'Location Link', name: 'Location', icon: "location" },
    { id: 9, tooltip: 'Appstore App Link', name: 'Appstore', icon: "appstore" },
    { id: 18, tooltip: 'Website Link', name: 'Website', icon: "weburl" },
    { id: 17, tooltip: 'Playstore App Link', name: 'Playstore', icon: "playstore" },
]

export const VALUE_TYPES = {
    OTHERS: 'Others',
    WHATSAPP: 'Whatsapp',
}

export const LOGO_SIZES = [
    { key: 'Hide', value: 1 },
    { key: 'Small', value: 40 },
    { key: 'Medium', value: 60 },
    { key: 'Large', value: 80 },
]

export const DEFAULT_QR_SIZE = 300;
export const DEFAULT_QR_INNER_RADIUS = 10;
export const DEFAULT_QR_OUTER_RADIUS = 50;

export interface BarcodeProps {
    width?: number;
    height?: number;
    format?: any;
    displayValue?: boolean;
    fontOptions?: string;
    font?: string;
    text?: string;
    textAlign?: string;
    textPosition?: string;
    textMargin?: number;
    fontSize?: number;
    background?: string;
    lineColor?: string;
    margin?: number;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    value?: any;
}