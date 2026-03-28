// Type definition for gallery image items
export interface GalleryImage {
    url: string;
    tag: string;
    category: string;
}

// Background images with tags and categories for menu designs
export const galleryImages: GalleryImage[] = [
    // Restaurant & Cafe backgrounds
    {
        url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
        tag: 'elegant,dark,wooden',
        category: 'restaurant,cafe'
    },
    {
        url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9',
        tag: 'textured,marble,bright',
        category: 'cafe,bakery'
    },
    {
        url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b',
        tag: 'plain,clean,minimal',
        category: 'restaurant,bistro'
    },
    {
        url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de',
        tag: 'texture,rustic,warm',
        category: 'cafe,pub'
    },
    {
        url: 'https://images.unsplash.com/photo-1544148103-0773bf10d330',
        tag: 'dark,moody,textured',
        category: 'fine-dining,bar'
    },
    
    // Additional textures and backgrounds
    {
        url: 'https://images.unsplash.com/photo-1606816690822-0387e9a3bd71',
        tag: 'marble,luxury,white',
        category: 'fine-dining,upscale'
    },
    {
        url: 'https://images.unsplash.com/photo-1589395937772-f67057e233f4',
        tag: 'concrete,modern,textured',
        category: 'modern,cafe'
    },
    {
        url: 'https://images.unsplash.com/photo-1551636898-47668aa61de2',
        tag: 'paper,vintage,old',
        category: 'bistro,traditional'
    },
    {
        url: 'https://images.unsplash.com/photo-1526404423292-15db8c2334e5',
        tag: 'wood,natural,light',
        category: 'cafe,organic'
    },
    
    // Pattern backgrounds
    {
        url: 'https://images.unsplash.com/photo-1603665301175-57ba46f392bf',
        tag: 'pattern,geometric,modern',
        category: 'trendy,contemporary'
    },
    {
        url: 'https://images.unsplash.com/photo-1535376472810-5d229c65da09',
        tag: 'floral,pattern,elegant',
        category: 'tea-house,garden-cafe'
    },
    {
        url: 'https://images.unsplash.com/photo-1567929009324-fa4f6929ece7',
        tag: 'retro,pattern,colorful',
        category: 'pizzeria,family-restaurant'
    },
    
    // Specific cuisine themes
    {
        url: 'https://images.unsplash.com/photo-1516749396351-ab32940146c4',
        tag: 'pasta,italian,ingredients',
        category: 'italian,trattoria'
    },
    {
        url: 'https://images.unsplash.com/photo-1483648969698-5e7dcaa3444f',
        tag: 'spices,colorful,vibrant',
        category: 'indian,asian'
    },
    {
        url: 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137',
        tag: 'seafood,blue,ocean',
        category: 'seafood,coastal'
    },
    
    // Solid & gradient backgrounds
    {
        url: 'https://images.unsplash.com/photo-1579546929662-711aa81148cf',
        tag: 'gradient,purple,soft',
        category: 'dessert,bakery'
    },
    {
        url: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d',
        tag: 'gradient,minimal,clean',
        category: 'modern,fast-casual'
    },
    {
        url: 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5',
        tag: 'gradient,green,calm',
        category: 'vegan,healthy'
    },
];
