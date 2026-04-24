import { getBusinessCategory } from '@data/shared/businessTypes';

type CategoryIconSuggestion = {
    icon: string;
    keywords: string[];
};

const COMMON_SUGGESTIONS: CategoryIconSuggestion[] = [
    { icon: 'lu:LuStore', keywords: ['featured', 'highlights', 'top picks', 'popular', 'special', 'signature'] },
    { icon: 'lu:LuSparkles', keywords: ['new', 'seasonal', 'limited', 'chef special', 'recommended'] },
    { icon: 'lu:LuTag', keywords: ['sale', 'offer', 'deal', 'combo', 'bundle'] },
];

const BUSINESS_CATEGORY_ICON_SUGGESTIONS: Record<string, CategoryIconSuggestion[]> = {
    food: [
        { icon: 'lu:LuUtensilsCrossed', keywords: ['menu', 'mains', 'main course', 'food', 'all day', 'house specials'] },
        { icon: 'lu:LuChefHat', keywords: ['chef', 'specials', 'kitchen', 'signature'] },
        { icon: 'lu:LuCoffee', keywords: ['coffee', 'cafe', 'espresso', 'latte', 'tea', 'hot drinks'] },
        { icon: 'lu:LuCupSoda', keywords: ['drink', 'drinks', 'beverage', 'beverages', 'juice', 'soda', 'shake', 'mocktail'] },
        { icon: 'lu:LuWine', keywords: ['wine', 'cocktail', 'bar', 'spirits'] },
        { icon: 'lu:LuBeer', keywords: ['beer', 'draft', 'ale', 'lager'] },
        { icon: 'lu:LuCakeSlice', keywords: ['cake', 'bakery', 'pastry'] },
        { icon: 'lu:LuCroissant', keywords: ['croissant', 'baked', 'bread', 'toast'] },
        { icon: 'lu:LuDessert', keywords: ['dessert', 'desserts', 'sweet', 'sweets'] },
        { icon: 'lu:LuDonut', keywords: ['donut', 'doughnut'] },
        { icon: 'lu:LuPizza', keywords: ['pizza', 'flatbread'] },
        { icon: 'lu:LuSandwich', keywords: ['sandwich', 'burger', 'wrap', 'roll'] },
        { icon: 'lu:LuSalad', keywords: ['salad', 'greens', 'healthy bowls'] },
        { icon: 'lu:LuSoup', keywords: ['soup', 'broth', 'ramen'] },
        { icon: 'lu:LuFish', keywords: ['fish', 'seafood', 'sushi', 'prawn', 'shrimp'] },
        { icon: 'lu:LuBeef', keywords: ['beef', 'meat', 'steak', 'bbq', 'grill', 'kebab', 'chicken'] },
        { icon: 'lu:LuLeafyGreen', keywords: ['vegan', 'vegetarian', 'plant based', 'organic'] },
        { icon: 'lu:LuCherry', keywords: ['ice cream', 'gelato', 'frozen', 'sundae'] },
        { icon: 'lu:LuApple', keywords: ['fruit', 'fresh', 'breakfast'] },
    ],
    service: [
        { icon: 'lu:LuScissors', keywords: ['hair', 'haircut', 'barber', 'trim', 'styling'] },
        { icon: 'lu:LuSparkles', keywords: ['beauty', 'glow', 'facial', 'skin', 'bridal', 'makeup'] },
        { icon: 'lu:LuFlower2', keywords: ['spa', 'wellness', 'relax', 'aroma'] },
        { icon: 'lu:LuHand', keywords: ['massage', 'therapy', 'care'] },
        { icon: 'lu:LuBath', keywords: ['bath', 'spa bath', 'body soak'] },
        { icon: 'lu:LuDroplets', keywords: ['hydration', 'wash', 'cleanse'] },
        { icon: 'lu:LuShowerHead', keywords: ['wash', 'rinse', 'shower'] },
        { icon: 'lu:LuBrush', keywords: ['nail', 'nails', 'brush', 'grooming'] },
        { icon: 'lu:LuDog', keywords: ['pet', 'dog', 'cat', 'grooming'] },
        { icon: 'lu:LuCar', keywords: ['car wash', 'detailing', 'vehicle'] },
        { icon: 'lu:LuWrench', keywords: ['repair', 'service', 'maintenance', 'fix'] },
    ],
    retail: [
        { icon: 'lu:LuShoppingBag', keywords: ['shop', 'store', 'collection', 'new arrivals', 'featured'] },
        { icon: 'lu:LuShirt', keywords: ['shirt', 'clothing', 'fashion', 'apparel', 'mens', 'womens', 'kids'] },
        { icon: 'lu:LuFootprints', keywords: ['shoes', 'footwear', 'sneakers', 'sandals'] },
        { icon: 'lu:LuGem', keywords: ['jewelry', 'diamond', 'gold', 'ring', 'luxury'] },
        { icon: 'lu:LuWatch', keywords: ['watch', 'timepiece'] },
        { icon: 'lu:LuBookOpen', keywords: ['books', 'book', 'reading', 'stationery'] },
        { icon: 'lu:LuGift', keywords: ['gift', 'gifts', 'occasion'] },
        { icon: 'lu:LuLaptop', keywords: ['laptop', 'computer', 'electronics'] },
        { icon: 'lu:LuSmartphone', keywords: ['phone', 'mobile', 'smartphone', 'gadgets'] },
        { icon: 'lu:LuSofa', keywords: ['home', 'furniture', 'living', 'decor'] },
        { icon: 'lu:LuFlower', keywords: ['flower', 'flowers', 'floral', 'bouquet'] },
        { icon: 'lu:LuStore', keywords: ['essentials', 'catalog', 'products'] },
    ],
    health: [
        { icon: 'lu:LuHeartPulse', keywords: ['wellness', 'care', 'health', 'cardio'] },
        { icon: 'lu:LuDumbbell', keywords: ['gym', 'fitness', 'strength', 'training', 'weights'] },
        { icon: 'lu:LuStethoscope', keywords: ['clinic', 'consultation', 'doctor', 'dental', 'medical'] },
        { icon: 'lu:LuPill', keywords: ['supplements', 'medicine', 'recovery'] },
        { icon: 'lu:LuSyringe', keywords: ['treatment', 'shots'] },
        { icon: 'lu:LuLeaf', keywords: ['yoga', 'holistic', 'natural'] },
        { icon: 'lu:LuBadgePlus', keywords: ['program', 'plan', 'membership'] },
    ],
    creative: [
        { icon: 'lu:LuCamera', keywords: ['photo', 'photography', 'shoot', 'studio'] },
        { icon: 'lu:LuPalette', keywords: ['art', 'design', 'creative', 'gallery'] },
        { icon: 'lu:LuMusic', keywords: ['music', 'instruments', 'lessons'] },
        { icon: 'lu:LuPenTool', keywords: ['tattoo', 'custom', 'illustration', 'editing'] },
        { icon: 'lu:LuBrush', keywords: ['makeup', 'beauty', 'paint', 'craft'] },
        { icon: 'lu:LuFlower2', keywords: ['decor', 'event', 'styling'] },
        { icon: 'lu:LuGem', keywords: ['handmade jewelry', 'artisan'] },
    ],
    professional: [
        { icon: 'lu:LuBriefcase', keywords: ['services', 'advisory', 'consulting', 'firm'] },
        { icon: 'lu:LuHome', keywords: ['property', 'real estate', 'interior', 'home'] },
        { icon: 'lu:LuCreditCard', keywords: ['finance', 'billing', 'pricing'] },
        { icon: 'lu:LuCalendarDays', keywords: ['appointments', 'bookings', 'planning'] },
        { icon: 'lu:LuMapPin', keywords: ['travel', 'destination', 'local'] },
        { icon: 'lu:LuUsers2', keywords: ['team', 'group', 'family'] },
        { icon: 'lu:LuShield', keywords: ['legal', 'compliance', 'protection'] },
    ],
    specialty: [
        { icon: 'lu:LuCar', keywords: ['car', 'auto', 'vehicle', 'garage'] },
        { icon: 'lu:LuWrench', keywords: ['repair', 'fix', 'service bay'] },
        { icon: 'lu:LuBike', keywords: ['bike', 'cycle', 'rental'] },
        { icon: 'lu:LuBaby', keywords: ['kids', 'child', 'children', 'daycare'] },
        { icon: 'lu:LuBedDouble', keywords: ['rooms', 'stay', 'hotel'] },
        { icon: 'lu:LuKeyRound', keywords: ['access', 'workspace', 'membership'] },
        { icon: 'lu:LuHome', keywords: ['space', 'property', 'rental'] },
    ],
};

function normalizeKeyword(value: string): string {
    return value
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function matchesKeyword(normalizedName: string, keyword: string): boolean {
    const normalizedKeyword = normalizeKeyword(keyword);
    return normalizedKeyword.length > 0 && normalizedName.includes(normalizedKeyword);
}

function dedupeIcons(icons: string[]): string[] {
    return Array.from(new Set(icons.filter(Boolean)));
}

export function getSuggestedCategoryIcons(categoryName?: string, businessType?: string, limit = 8): string[] {
    const businessCategory = getBusinessCategory(businessType) || 'food';
    const scopedSuggestions = BUSINESS_CATEGORY_ICON_SUGGESTIONS[businessCategory] || [];
    const normalizedName = normalizeKeyword(categoryName || '');

    const matchedScoped = normalizedName
        ? scopedSuggestions.filter((entry) => entry.keywords.some((keyword) => matchesKeyword(normalizedName, keyword)))
        : [];
    const matchedCommon = normalizedName
        ? COMMON_SUGGESTIONS.filter((entry) => entry.keywords.some((keyword) => matchesKeyword(normalizedName, keyword)))
        : [];

    const ordered = dedupeIcons([
        ...matchedScoped.map((entry) => entry.icon),
        ...matchedCommon.map((entry) => entry.icon),
        ...scopedSuggestions.map((entry) => entry.icon),
        ...COMMON_SUGGESTIONS.map((entry) => entry.icon),
    ]);

    return ordered.slice(0, limit);
}

export function getSuggestedCategoryIcon(categoryName?: string, businessType?: string): string | null {
    return getSuggestedCategoryIcons(categoryName, businessType, 1)[0] || null;
}
