
export type TEMPLATE_OR_ENITITY_TYPE = "platform" | "client";

export const TEMPLATE_TYPES = {
    PLATFORM: "platform",
    CLIENT: "client",
}


export const WEBSITE_PAGES_LIST: any = [
    { key: '1', label: 'Home Page' },
    { key: '2', label: 'About Us' },
    { key: '3', label: 'Contact Us' },
];

export type TEMPLATES_PROPS_TYPE = {
    key: any,
    title: string,
    active?: boolean,
    image?: string
}

export const TEMPLATE_TYPES_LIST: TEMPLATES_PROPS_TYPE[] = [
    { key: 1, title: "Ecommerce", active: true },
    { key: 2, title: "Landing Page", active: true },
    { key: 3, title: "Mini", active: true },
    { key: 4, title: "Personal", active: true },
    { key: 5, title: "Portfolio", active: true },
    { key: 6, title: "Real Estate", active: true },
    { key: 7, title: "Startup", active: true },
    { key: 8, title: "Personal", active: true },
    { key: 9, title: "Agency", active: true },
    { key: 10, title: "Business", active: true },
    { key: 11, title: "Changelog", active: true },
    { key: 12, title: "Entertainment", active: true },
]

export const TEMPLATE_PAGES_LIST: TEMPLATES_PROPS_TYPE[] = [
    { key: 1, title: 'Home Page' },
    { key: 2, title: 'About' },
    { key: 3, title: 'Contact' },
    { key: 4, title: 'Terms' },
    { key: 5, title: 'Privacy' },
    { key: 6, title: 'Signin/Signup' },
    { key: 7, title: 'List' },
    { key: 8, title: 'List Details' },

    //all bellow covered in list and list details
    // { key: 9, title: 'Category' },
    // { key: 10, title: 'Category Details' },
    // { key: 11, title: 'Products' },
    // { key: 12, title: 'Product Details' },
    // { key: 13, title: 'Services' },
    // { key: 14, title: 'Service Details' },
    // { key: 15, title: 'Portfolio' },
    // { key: 16, title: 'Portfolio Details' },
    // { key: 17, title: 'Blogs' },
    // { key: 18, title: 'Blog Details' },

    { key: 19, title: 'Profile' },
    { key: 20, title: 'Careers' },
    { key: 21, title: 'Footer' },
    { key: 22, title: 'Testimonials' },
    { key: 23, title: 'How It Works' },
    { key: 24, title: 'FAQ' },
    { key: 25, title: '404' },
]

export const TEMPLATE_SECTIONS_LIST: TEMPLATES_PROPS_TYPE[] = [
    { key: 1, title: 'Header' },
    { key: 2, title: 'Hero Banners' },
    { key: 3, title: 'Hero Section' },
    { key: 4, title: 'Feature' },
    { key: 5, title: 'Features Grid' },
    { key: 6, title: 'CTA' },
    { key: 7, title: 'Partener' },
    { key: 8, title: 'Gallery' },
    { key: 1, title: 'Pricing' },
    { key: 10, title: 'Testinomial' },
    { key: 11, title: 'FAQ' },
    { key: 12, title: 'Stats' },
    { key: 13, title: 'Form' },
    { key: 14, title: 'Map' },
    { key: 14, title: 'Timeline' },//refer to https://ant.design/components/timeline
    { key: 14, title: 'Social Media' },
]
