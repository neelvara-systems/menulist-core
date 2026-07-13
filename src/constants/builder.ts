export const BUILDER_DEFAULT_COLORS = [
    {
        label: 'Dark',
        colors: ['#0C134F', '#5F264A', '#393646', '#37306B', '#2C3333'],
    },
    {
        label: 'Light',
        colors: ['#79E0EE', '#B799FF', '#99A98F', '#A6D0DD', '#FFACAC'],
    },
    {
        label: 'Neon',
        colors: ['#79E0EE', '#FFB84C', '#FF55BB', '#F6F1E9', '#F0FF42', '#060047'],
    },
    {
        label: 'Pastel',
        colors: ['#C4DFDF', '#F5F0BB', '#ACB1D6', '#DDFFBB', '#B9F3E4'],
    },
]

export const PAGE_SECTION_SEPARATOR = "#";
export const SECTION_UID_SEPARATOR = "||";
export const UNID_SEPARATOR = "-";

export const CATEGORIES_LIST = {
    HOME_PAGE: "Home Page",
    MEDIA: "Media",
    SOCIAL: "Social",
}

export const SECTIONS_LIST = {
    NAVIGATION: "Navigation",
    IMAGE_MEDIA: "Image",
}

export type ConfigType = {
    id: any,
    categoryId: any,
    sectionId: any,
    componentName: any,
    uid: any
}

export const PANEL_ACTIONS_LIST = {
    SECTIONS: "SECTIONS",
    PAGES: "PAGES",
    CREATIVES: "CREATIVES",
    MEDIA: "MEDIA",
    INTERACTIVE: "INTERACTIVE",
    SOCIAL: "SOCIAL",
    UTILITY: "UTILITY",
    EDITOR: "EDITOR",
    REDESIGN: "REDESIGN",
    LAYERS: "LAYERS",
    GLOBAL: "GLOBAL",
    KEYBOARD: "KEYBOARD",
    HELP: "HELP",
    ACTIONS: "ACTIONS",
    COLLAPSE: "COLLAPSE",
}

export const COMPONENTS_TYPE = {
    "DIV": "div",
    "IMAGE": "img",
    "VIDEO": "video",
    "YTVIDEO": "ytvideo",
    "AUDIO": "audio",
    "SOCIAL_LINK": "social",
    "H1": "h1",
    "H2": "h2",
    "H3": "h3",
    "H4": "h4",
    "H5": "h5",
    "H6": "h6",
    "P": "p",
}

export const COLOR_VARIABLES = {
    COLOR_TEXT: "--color_text",
    COLOR_PARAGRAPH: "--color_paragraph",
    COLOR_BACKGROUND: "--color_background",
    COLOR_SURFACE: "--color_surface",
    COLOR_PRIMARY: "--color_primary",
    COLOR_PRIMARY_CONTRAST: "--color_primary_contrast",
}

export const COLOR_VARIABLES_LABEL: any = {
    "textlabel": "Paragraph Color Calculated using text color",
    [COLOR_VARIABLES.COLOR_TEXT]: "Text",//Text - Color of static text and icons.
    [COLOR_VARIABLES.COLOR_PARAGRAPH]: "Paragraph",//Paragraph - Color of static sub headings/text and paragraph.

    "backgroundlabel": "Surface Color Calculated using Background color",
    [COLOR_VARIABLES.COLOR_BACKGROUND]: "Background",//Background - Background color for pages and page sections.
    [COLOR_VARIABLES.COLOR_SURFACE]: "Surface",//Surface - Background color for containers.

    "primarylabel": "Primary contrast Color Calculated using Primary color",
    [COLOR_VARIABLES.COLOR_PRIMARY]: "Primary", //Primary - Color for any primary buttons, actions, or hover treatment for clickable elements.
    [COLOR_VARIABLES.COLOR_PRIMARY_CONTRAST]: "Primary contrast", //Primary contrast - Color of text and icons in a primary button.
}

export const TEXT_STYLES_VARIABLES = {
    h1: "Heading 1",
    h2: "Heading 2",
    h3: "Heading 3",
    h4: "Heading 4",
    h5: "Heading 5",
    h6: "Heading 6",
    p: "Paragraph",
}

export const ThemeColorsList = [
    { background: "#ffff", text: "#191919", primary: "#49243E" },
    { background: "#F8FAE5", text: "#141E46", primary: "#240A34" },
    { background: "#FFF3C7", text: "#2B3467", primary: "#161853" },
    { background: "#F3F3F3", text: "#121212", primary: "#DB6B97" },
    { background: "#EDEDED", text: "#1B1717", primary: "#540E33" },
    { background: "#F5F5F5", text: "#191919", primary: "#9ADE7B" },
]
// ["Desktop", "Mobile"]
export const DEVICE_TYPES_LIST = {
    DESKTOP: "desktop",
    TABLET: "tablet",
    MOBILE: "mobile",
} as const;
