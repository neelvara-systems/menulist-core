export const INITIAL_BG_LARGE = 'https://image-editor-ten.vercel.app/Backgrounds/Large_Banner/Gradient/Frame%2028.png';
export const INITIAL_BG_SQUARE = 'https://image-editor-ten.vercel.app/Backgrounds/Square_Banner/Watercolor/Frame%20332.png';

export const SHOW_BEYOND_CANVAS = true;
export const GRID_SIZES = { horizontal: 100, vertical: 60 };
export const DEFAULT_NO_BG_OPACITY = 0.4;

export const DEFAULT_CRAFT_TEMPLATE_ID = "0000"
export const CUSTOME_ATTRIBUTES = {
    PATTERN_DATA: 'patternData',
    QR_CODE_CONFIG: 'qrConfig',
    BAR_CODE_CONFIG: 'barCodeConfig',
    OBJECT_TYPE: 'objectType',
    UID: 'uid',
    WATERMARK: 'watermark',
    CUSTOME_PROPS: 'customProps',
}

export const CUSTOME_ATTRIBUTES_LIST = [
    CUSTOME_ATTRIBUTES.PATTERN_DATA,
    CUSTOME_ATTRIBUTES.OBJECT_TYPE,
    CUSTOME_ATTRIBUTES.UID,
    CUSTOME_ATTRIBUTES.WATERMARK,
    CUSTOME_ATTRIBUTES.QR_CODE_CONFIG,
    CUSTOME_ATTRIBUTES.BAR_CODE_CONFIG,
    CUSTOME_ATTRIBUTES.CUSTOME_PROPS
];
export const HOTKEYS_MOVE_PIXELS = 3;
export const IMAGE_TYPES = {
    SVG: 'svg',
    PNG: 'png',
}

export const EDITOR_TABS = {
    AI: 'AI Tools',
    TEMPLATES: 'Templates',
    BACKGROUND: 'Background',
    Illustrations: 'Illustrations',
    GRAPHICS: 'Graphics',
    PARSONAS: 'Characters',
    IMAGES: 'Images',
    TEXT: 'Text',
    TOOLS: 'Tools',
    QRCODE: 'QRCode',
    BARCODE: 'Barcode',
    MYSTUFF: 'My Stuff',
    BRANDKIT: 'Brand Kit',
    DOCUMENTS: 'Documents',
    AI_TEXT: 'AI Text',//only in case editing
}

export const EDITOR_SIDEBAR = [
    { label: EDITOR_TABS.AI, key: 'AI Tools', icon: 'aiTools' },
    { label: EDITOR_TABS.TEMPLATES, key: 'Templates', icon: 'template' },
    { label: EDITOR_TABS.BACKGROUND, key: 'Background', icon: 'background' },
    { label: EDITOR_TABS.Illustrations, key: 'Illustrations', icon: 'illustrations' },
    { label: EDITOR_TABS.GRAPHICS, key: 'Graphics', icon: 'graphics' },
    { label: EDITOR_TABS.PARSONAS, key: 'Characters', icon: 'character' },
    { label: EDITOR_TABS.IMAGES, key: 'Images', icon: 'images' },
    { label: EDITOR_TABS.TEXT, key: 'Text', icon: 'text' },
    { label: EDITOR_TABS.TOOLS, key: 'Tools', icon: 'shapes' },
    { label: EDITOR_TABS.QRCODE, key: 'QRCode', icon: 'qrcode' },
    { label: EDITOR_TABS.BARCODE, key: 'Barcode', icon: 'barcode' },
    { label: EDITOR_TABS.MYSTUFF, key: 'My Stuff', icon: 'myStuff' },
    { label: EDITOR_TABS.BRANDKIT, key: 'Brand Kit', icon: 'brandKit' },
    { label: EDITOR_TABS.DOCUMENTS, key: 'Documents', icon: 'documents' },
]

export const editorEventMode = {
    EMPTY: '',
    ONE: 'one',
    MULTI: 'multiple',
}

export const eventOneType = {
    EMPTY: '',
    GROUP: 'group',
    POLYGON: 'polygon',
}

export const groupAlignments = {
    "left": "left",
    "centerX": "centerX",
    "right": "right",
    "top": "top",
    "bottom": "bottom",
    "centerY": "centerY",
    "averageX": "averageX",
    "averageY": "averageY",
    "center": "center"
}

export const elementType = {
    HEAD: 'head',
    FACE: 'face',
}

export const OBJECT_TYPES = {
    'text': 'text',
    'itext': 'i-text',
    'textbox': 'textbox',
    'rect': 'rect',
    'circle': 'circle',
    'triangle': 'triangle',
    'polygon': 'polygon',
    'image': 'image',
    'group': 'group',
    'line': 'line',
    'arrow': 'arrow',
    'ellipse': 'ellipse',
    'path': 'path',
    'CharactersProps': 'CharactersProps',
    'graphics': 'graphics',
    'workspace': 'workspace',
    'pattern': 'pattern',
    'qrCode': 'qrCode',
    'barCode': 'barCode',
    'drawingTool': 'drawingTool',
}

export const SOLID_COLORS_LIST = [
    {
        label: 'Dark',
        colors: ['#5F2B63', '#B23554', '#F27E56', '#FCE766'],
    },
    {
        label: 'Pestal',
        colors: ['#86DCCD', '#E7FDCB', '#FFDC84', '#F57677'],
    },
    {
        label: 'Pestal',
        colors: ['#5FC2C7', '#98DFE5', '#C2EFF3', '#DDFDFD'],
    },
    {
        label: 'Pestal',
        colors: ['#9EE9D3', '#2FC6C8', '#2D7A9D', '#48466d'],
    },
    {
        label: 'Pestal',
        colors: ['#61c0bf', '#bbded6', '#fae3d9', '#ffb6b9'],
    },
    {
        label: 'Pestal',
        colors: ['#ffaaa5', '#ffd3b6', '#dcedc1', '#a8e6cf'],
    },
];

export const textAttributes = {
    fontSize: 20,
    fontFamily: '',
    lineHeight: 0,
    charSpacing: 0,
    fontWeight: '',
    textBackgroundColor: '#0000',
    fill: '#000',
    textAlign: '',
    fontStyle: '',
    underline: false,
    linethrough: false,
    overline: false,
}


// no parameter filter
export const simpleImageFilters = {
    BlackWhite: false,
    Brownie: false,
    Vintage: false,
    Kodachrome: false,
    technicolor: false,
    Polaroid: false,
    Invert: false,
    Sepia: false,
};

// UI type
export const uiTypeImageFilters = {
    SELECT: 'select',
    COLOR: 'color',
    NUMBER: 'number',
};
// With parametric filter
export const complexImageFilters = [
    {
        name: 'Brightness',
        type: 'Brightness',
        status: false,
        key: 'brightness',
        value: 0,
        uiType: uiTypeImageFilters.NUMBER,
        min: -1,
        max: 1,
        step: 0.01,
    },
    {
        name: 'Contrast',
        type: 'Contrast',
        status: false,
        key: 'contrast',
        value: 0,
        uiType: uiTypeImageFilters.NUMBER,
        min: -1,
        max: 1,
        step: 0.01,
    },
    {
        name: 'Saturation',
        type: 'Saturation',
        status: false,
        key: 'saturation',
        value: 0,
        uiType: uiTypeImageFilters.NUMBER,
        min: -1,
        max: 1,
        step: 0.01,
    },
    {
        name: 'Vibrance',
        type: 'Vibrance',
        status: false,
        key: 'vibrance',
        value: 0,
        uiType: uiTypeImageFilters.NUMBER,
        min: -1,
        max: 1,
        step: 0.01,
    },
    {
        name: 'Hue',
        type: 'HueRotation',
        status: false,
        key: 'rotation',
        value: 0,
        uiType: uiTypeImageFilters.NUMBER,
        min: -1,
        max: 1,
        step: 0.01,
    },
    {
        name: 'Noise',
        type: 'Noise',
        status: false,
        key: 'noise',
        value: 500,
        uiType: uiTypeImageFilters.NUMBER,
        min: -1,
        max: 1000,
        step: 0.1,
    },
    {
        name: 'Pixelate',
        type: 'Pixelate',
        status: false,
        key: 'blocksize',
        value: 0.01,
        uiType: uiTypeImageFilters.NUMBER,
        min: 0.01,
        max: 100,
        step: 0.01,
    },
    {
        name: 'Blur',
        type: 'Blur',
        status: false,
        key: 'blur',
        value: 0,
        uiType: uiTypeImageFilters.NUMBER,
        min: 0,
        max: 1,
        step: 0.01,
    },
    // {
    //     type: 'Grayscale',
    //     status: false,
    //     params: [
    //         {
    //             key: 'mode',
    //             value: 'average',
    //             uiType: uiTypeImageFilters.SELECT,
    //             list: ['average', 'lightness', 'luminosity'],
    //         },
    //     ],
    // },
    // {
    //     type: 'RemoveColor',
    //     status: false,
    //     params: [
    //         {
    //             key: 'color',
    //             value: '',
    //             uiType: uiTypeImageFilters.COLOR,
    //         },
    //         {
    //             key: 'distance',
    //             value: 0,
    //             uiType: uiTypeImageFilters.NUMBER,
    //             min: 0,
    //             max: 1,
    //             step: 0.01,
    //         },
    //     ],
    // },
];
// Combined Parametric Filters
const gammaImageFilters = [
    {
        type: 'Gamma',
        status: false,
        params: [
            {
                key: 'red',
                value: 0,
                uiType: uiTypeImageFilters.NUMBER,
                min: 0.01,
                max: 2.2,
                step: 0.01,
            },
            {
                key: 'green',
                value: 0,
                uiType: uiTypeImageFilters.NUMBER,
                min: 0.01,
                max: 2.2,
                step: 0.01,
            },
            {
                key: 'blue',
                value: 0,
                uiType: uiTypeImageFilters.NUMBER,
                min: 0.01,
                max: 2.2,
                step: 0.01,
            },
        ],
        handler(red, green, blue) {
            return {
                gamma: [red, green, blue],
            };
        },
    },
];

// 1
// 2
// 3
// 4
// 5
// 6
// 7
// 8

export const lineHeightsList = [
    { label: 'Unset', value: 'unset' },
    { label: '0.5', value: '0.5' },
    { label: '1', value: '1' },
    { label: '1.1', value: '1.1' },
    { label: '1.2', value: '1.2' },
    { label: '1.3', value: '1.3' },
    { label: '1.4', value: '1.4' },
    { label: '1.5', value: '1.5' },
    { label: '1.6', value: '1.6' },
    { label: '1.7', value: '1.7' },
    { label: '1.8', value: '1.8' },
    { label: '1.9', value: '1.9' },
    { label: '2', value: '2' },
    { label: '2.1', value: '2.1' },
    { label: '2.2', value: '2.2' },
    { label: '2.3', value: '2.3' },
    { label: '2.4', value: '2.4' },
    { label: '2.5', value: '2.5' },
    { label: '2.6', value: '2.6' },
    { label: '2.7', value: '2.7' },
    { label: '2.8', value: '2.8' },
    { label: '2.9', value: '2.9' },
    { label: '3', value: '3' }
]

export const letterSpacingList = [
    { label: '0', value: '0' },
    // { label: '0.2', value: '0.2' },
    // { label: '0.4', value: '0.4' },
    // { label: '0.6', value: '0.6' },
    // { label: '0.8', value: '0.8' },
    { label: '1', value: '1' },
    // { label: '1.2', value: '1.2' },
    // { label: '1.4', value: '1.4' },
    // { label: '1.6', value: '1.6' },
    // { label: '1.8', value: '1.8' },
    { label: '2', value: '2' },
    // { label: '2.2', value: '2.2' },
    // { label: '2.4', value: '2.4' },
    // { label: '2.6', value: '2.6' },
    // { label: '2.8', value: '2.8' },
    { label: '3', value: '3' },
    // { label: '3.2', value: '3.2' },
    // { label: '3.4', value: '3.4' },
    // { label: '3.6', value: '3.6' },
    // { label: '3.8', value: '3.8' },
    { label: '4', value: '4' },
    // { label: '4.2', value: '4.2' },
    // { label: '4.4', value: '4.4' },
    // { label: '4.6', value: '4.6' },
    // { label: '4.8', value: '4.8' },
    { label: '5', value: '5' },
    { label: '6', value: '6' },
    { label: '7', value: '7' },
    { label: '8', value: '8' },
    { label: '9', value: '9' },
    { label: '10', value: '10' },
    { label: '11', value: '11' },
    { label: '12', value: '12' },
    { label: '13', value: '13' },
    { label: '14', value: '14' },
    { label: '15', value: '15' },
    { label: '16', value: '16' },
    { label: '17', value: '17' },
    { label: '18', value: '18' },
    { label: '19', value: '19' },
    { label: '20', value: '20' },
]

export const strokeTypeList = [
    {
        stroke: '#0000',
        strokeWidth: 0,
        strokeUniform: true,
        strokeDashArray: [],
        strokeLineCap: 'butt',
        label: 'Unset',
    },
    {
        stroke: '#000',
        strokeWidth: 10,
        strokeUniform: true,
        strokeDashArray: [1, 10],
        strokeLineCap: 'butt',
        label: 'Dash-1',
    },
    {
        stroke: '#000',
        strokeWidth: 10,
        strokeUniform: true,
        strokeDashArray: [1, 10],
        strokeLineCap: 'round',
        label: 'Dash-2',
    },
    {
        stroke: '#000',
        strokeWidth: 10,
        strokeUniform: true,
        strokeDashArray: [15, 15],
        strokeLineCap: 'square',
        label: 'Dash-3',
    },
    {
        stroke: '#000',
        strokeWidth: 10,
        strokeUniform: true,
        strokeDashArray: [15, 15],
        strokeLineCap: 'round',
        label: 'Dash-4',
    },
    {
        stroke: '#000',
        strokeWidth: 10,
        strokeUniform: true,
        strokeDashArray: [25, 25],
        strokeLineCap: 'square',
        label: 'Dash-5',
    },
    {
        stroke: '#000',
        strokeWidth: 10,
        strokeUniform: true,
        strokeDashArray: [25, 25],
        strokeLineCap: 'round',
        label: 'Dash-6',
    },
    {
        stroke: '#000',
        strokeWidth: 10,
        strokeUniform: true,
        strokeDashArray: [1, 8, 16, 8, 1, 20],
        strokeLineCap: 'square',
        label: 'Dash-7',
    },
    {
        stroke: '#000',
        strokeWidth: 10,
        strokeUniform: true,
        strokeDashArray: [1, 8, 16, 8, 1, 20],
        strokeLineCap: 'round',
        label: 'Dash-8',
    },
]

export const shadowTypeList = [
    {
        color: '#0000',
        blur: 0,
        offsetX: 0,
        offsetY: 0,
        label: 'unset',
        value: 'unset',
    },
    {
        color: "rgba(34, 34, 100, 0.3)",
        blur: 1,
        offsetX: -4,
        offsetY: 3,
        label: 'Regular',
        value: 'Regular',
    },
    {
        color: 'rgba(0, 0, 0, 0.2)',
        blur: 5,
        offsetX: 1,
        offsetY: 5,
        label: 'Soft Shadow',
        value: 'Soft Shadow',
    },
    {
        color: 'rgba(0, 0, 0, 0.4)',
        blur: 5,
        offsetX: 1,
        offsetY: 5,
        label: 'Mid Shadow',
        value: 'Mid Shadow',
    },
    {
        color: 'rgba(0, 0, 0, 0.7)',
        blur: 5,
        offsetX: 1,
        offsetY: 5,
        label: 'Hard Shadow',
        value: 'Hard Shadow',
    }, {
        color: 'rgba(0, 0, 0, 0.1) ',
        blur: 2,
        offsetX: 0,
        offsetY: 8,
        label: 'Far Shadow',
        value: 'Far Shadow',
    },
    {
        color: 'rgba(0, 0, 0, 0.2)',
        blur: 15,
        offsetX: 0,
        offsetY: 25,
        label: 'Blury Shadow',
        value: 'Blury Shadow',
    },
    {
        color: 'rgba(0, 0, 0, 0.2)',
        blur: 25,
        offsetX: 0,
        offsetY: 25,
        label: 'Dark With Heighlight',
        value: 'Dark With Heighlight',
    }, {
        color: 'rgba(0, 0, 0, 0.4)',
        blur: 25,
        offsetX: 2,
        offsetY: 25,
        label: 'Soft Inner',
        value: 'Soft Inner',
    },
    {
        color: 'rgba(0, 0, 0, 0.4)',
        blur: 5,
        offsetX: 0,
        offsetY: 10,
        label: 'Mid Inner Shadow',
        value: 'Mid Inner Shadow',
    },
    {
        color: 'rgba(0, 0, 0, 0.4)',
        blur: 5,
        offsetX: 0,
        offsetY: 15,
        label: 'Hard Inner Shadow',
        value: 'Hard Inner Shadow',
    }
]


export const TREE_D_STYLES = [
    {
        skewX: 0,
        skewY: 0,
        label: 'unset',
        value: 'unset',
    },
    {
        skewX: 10,
        skewY: 10,
        label: 'Balanced',
        value: 'Balanced',
    },
    {
        skewX: -10,
        skewY: -10,
        label: 'Balanced Reversed',
        value: 'Balanced Reversed',
    },
    {
        skewX: 20,
        skewY: 0,
        label: 'Horizontal',
        value: 'Horizontal',
    },
    {
        skewX: -20,
        skewY: 0,
        label: 'Horizontal Reversed',
        value: 'Horizontal Reversed',
    },
    {
        skewX: 0,
        skewY: 20,
        label: 'Vertical',
        value: 'Vertical',
    },
    {
        skewX: 0,
        skewY: -20,
        label: 'Vertical Reversed',
        value: 'Vertical Reversed',
    }, {
        skewX: 20,
        skewY: -20,
        label: 'Opposite',
        value: 'Opposite',
    },
    {
        skewX: -20,
        skewY: 20,
        label: 'Opposite Reversed',
        value: 'Opposite Reversed',
    },
    {
        skewX: 15,
        skewY: -15,
        label: 'Diagonal',
        value: 'Diagonal',
    }, {
        skewX: -15,
        skewY: 15,
        label: 'Diagonal Reversed',
        value: 'Diagonal Reversed',
    },
    {
        skewX: 3,
        skewY: -3,
        label: 'Subtle',
        value: 'Subtle',
    }, {
        skewX: -3,
        skewY: 3,
        label: 'Subtle Reversed',
        value: 'Subtle Reversed',
    }
]


export const SHARE_CRAFT_TYPES = [
    { id: 3, tooltip: 'Whatsapp', name: 'Whatsapp', icon: "whatsapp", showTitle: false, showDesc: true, showUserData: true, userDataType: 'Number' },
    { id: 2, tooltip: 'Facebook', name: 'Facebook', icon: "facebook", showTitle: false, showDesc: false },
    { id: 9, tooltip: 'Instagram', name: 'Instagram', icon: "instagram", showTitle: false, showDesc: false },
    { id: 3, tooltip: 'Twitter', name: 'Twitter', icon: "twitter", showDesc: true },
    { id: 4, tooltip: 'Linkedin', name: 'Linkedin', icon: "linkedin", showTitle: true, showDesc: true },
    { id: 7, tooltip: 'Email', name: 'Email', icon: "email", showTitle: true, showDesc: true, showUserData: true, userDataType: 'Email' },
    { id: 8, tooltip: 'Pinterest', name: 'Pinterest', icon: "pinterest", showTitle: false, showDesc: true },
    { id: 10, tooltip: 'Tumblr', name: 'Tumblr', icon: "tumblr", showTitle: false, showDesc: true },
    { id: 11, tooltip: 'Snapchat', name: 'Snapchat', icon: "snapchat", showTitle: false, showDesc: false },
    { id: 15, tooltip: 'SMS', name: 'SMS', icon: "sms", showTitle: false, showDesc: true, showUserData: true, userDataType: 'Number' },
]

export const DRAWING_TOOLS_TYPE = {
    Pencil: 'Pencil',
    PathText: 'PathText',
    Circle: 'Circle',
    Spray: 'Spray',
    Pattern: 'Pattern',
    Horizontal: 'Horizontal Line',
    Vertical: 'Vertical Line',
    Square: 'Square',
    Diamond: 'Diamond',
    Texture: 'Texture',
};

export const BRANDKIT_OPTIONS = {
    LOGOS: "logos",
    COLORS: "colors",
    FONTS: "fonts",
    ASSETS: "assets",

}