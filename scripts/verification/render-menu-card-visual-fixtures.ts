import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createCanvas, Path2D as CanvasPath2D } from '@napi-rs/canvas';

import { renderPdf } from '../../src/lib/menu-card-export/render/renderPdf';
import type { MenuCardExportSettings } from '../../src/lib/menu-card-export/models/exportTypes';
import type { MenuCardPrintSource, PrintCategory } from '../../src/lib/menu-card-export/models/printModel';
import { drawMenuListLogoMark, getMenuListLogoMarkWidth } from '../../src/lib/menu-kit/platformAttribution';
import { resolveItemDecisionSymbolIds } from '../../src/lib/menu/itemDecisionSymbols';
import { PRINTABLE_THEME_FAMILY_IDS } from '../../src/lib/printable-asset-templates/templateFamilies';
import { getPrintableThemeArtworkPaths } from '../../src/lib/printable-asset-templates/themeArtwork';
import type { PrintableTemplateFamilyId } from '../../src/lib/printable-asset-templates/types';

const OUTPUT_DIRECTORY = path.resolve(process.cwd(), 'output/menu-card-visual-audit');
const GENERATED_AT = new Date('2026-08-30T10:30:00.000Z');
const BOTANICAL_CORNER_PATH = path.resolve(process.cwd(), 'public/images/menu-card-export/botanical-corner-watercolor.png');
const BOTANICAL_RAIL_PATH = path.resolve(process.cwd(), 'public/images/menu-card-export/botanical-rail-line-art.png');
const THEME_PAGE_PATHS = Object.fromEntries(
    PRINTABLE_THEME_FAMILY_IDS.flatMap((themeId) => {
        const publicPath = getPrintableThemeArtworkPaths(themeId)?.page;
        return publicPath ? [[themeId, path.resolve(process.cwd(), `public${publicPath}`)]] : [];
    }),
) as Partial<Record<PrintableTemplateFamilyId, string>>;

const requestedThemeIds = new Set(
    (process.env.PRINTABLE_THEME_FILTER || '').split(',').map((value) => value.trim()).filter(Boolean),
);
const SALON_BEAUTY_THEME_IDS = new Set<PrintableTemplateFamilyId>([
    'salon-atelier',
    'petal-studio',
    'pearl-veil',
    'terracotta-glow',
    'glasshouse-beauty',
]);
const SPA_THEME_IDS = new Set<PrintableTemplateFamilyId>([
    'ritual-sanctuary',
    'eucalyptus-retreat',
    'mineral-spring',
    'lotus-stillness',
    'sunlit-ritual',
]);

const rawCategories: PrintCategory[] = [
    {
        id: 'breakfast',
        name: 'Morning Favourites',
        icon: 'lu:LuSunrise',
        items: [
            { id: 'b1', name: 'Masala Omelette on Sourdough', price: '295', description: 'Three eggs folded with caramelised onion, tomato, green chilli and garden herbs, served with toasted country sourdough, cultured butter and a bright seasonal leaf salad.', attributes: [], tags: ['popular'] },
            { id: 'b2', name: 'Avocado & Millet Toast', price: '345', description: 'Smashed avocado layered over toasted millet bread with lime, fresh herbs and a soft-poached egg, finished with toasted seeds and our house citrus dressing.', attributes: [{ name: 'Add feta', price: '75' }, { name: 'Add roasted mushrooms', price: '95' }], tags: ['vegetarian'] },
            { id: 'b3', name: 'Coconut French Toast', price: '325', description: 'Brioche, coconut custard, seasonal fruit and jaggery caramel.', attributes: [], tags: ['vegetarian'] },
            { id: 'b4', name: 'House Granola Bowl', price: '265', description: 'Toasted oats, nuts, seeds, seasonal fruit and lightly sweetened yoghurt.', attributes: [], tags: ['vegetarian'] },
            { id: 'b5', name: 'Idli, Podi & Brown Butter', price: '245', description: 'Steamed idli, gunpowder spice and curry-leaf brown butter.', attributes: [], tags: ['vegetarian'] },
        ],
    },
    {
        id: 'small-plates',
        name: 'Small Plates',
        icon: 'lu:LuUtensilsCrossed',
        items: [
            { id: 's1', name: 'Charred Corn Ribs', price: '285', description: 'Smoked chilli butter, lime and aged cheese.', attributes: [], tags: ['vegetarian'] },
            { id: 's2', name: 'Crisp Lotus Stem', price: '315', description: 'Sweet chilli glaze, sesame and spring onion.', attributes: [], tags: ['vegetarian'] },
            { id: 's3', name: 'Pepper Chicken Skewers', price: '395', description: 'Black pepper, curry leaf, shallot and charred lemon.', attributes: [], tags: [] },
            { id: 's4', name: 'Whipped Feta & Flatbread', price: '345', description: 'Roasted peppers, herb oil and warm house flatbread.', attributes: [], tags: ['vegetarian'] },
            { id: 's5', name: 'Prawn Toast', price: '445', description: 'Sesame brioche, chilli crisp and pickled cucumber.', attributes: [], tags: [] },
        ],
    },
    {
        id: 'mains',
        name: 'From the Kitchen',
        icon: 'lu:LuChefHat',
        items: [
            { id: 'm1', name: 'Wild Mushroom & Truffle Rice', price: '525', description: 'Short-grain rice, forest mushrooms, parmesan and black truffle.', attributes: [], tags: ['vegetarian'] },
            { id: 'm2', name: 'Slow-Cooked Lamb Pepper Fry', price: '645', description: 'Tender lamb, roasted pepper masala, coconut and flaky parotta.', attributes: [], tags: [] },
            { id: 'm3', name: 'Seasonal Vegetable Kofta', price: '475', description: 'Cashew curry, fenugreek and saffron pilaf.', attributes: [], tags: ['vegetarian'] },
            { id: 'm4', name: 'Coastal Fish Curry', price: '595', description: 'Catch of the day, kokum, coconut and steamed red rice.', attributes: [], tags: [] },
            { id: 'm5', name: 'Smoked Paneer Steak', price: '495', description: 'Charred greens, tomato fondue and coriander butter.', attributes: [], tags: ['vegetarian'] },
            { id: 'm6', name: 'Buttermilk Fried Chicken', price: '545', description: 'Crisp chicken, fermented chilli honey and cabbage slaw.', attributes: [], tags: [] },
        ],
    },
    {
        id: 'coffee',
        name: 'Coffee & Slow Brews',
        icon: 'lu:LuCoffee',
        items: [
            { id: 'c1', name: 'Espresso', price: '145', attributes: [], tags: [] },
            { id: 'c2', name: 'Flat White', price: '195', attributes: [{ name: 'Oat milk', price: '60' }], tags: [] },
            { id: 'c3', name: 'Cortado', price: '185', attributes: [], tags: [] },
            { id: 'c4', name: 'Vietnamese Iced Coffee', price: '235', attributes: [], tags: [] },
            { id: 'c5', name: 'Seasonal Pour Over', price: '265', description: 'Ask the team about today’s single-origin coffee.', attributes: [], tags: [] },
        ],
    },
    {
        id: 'dessert',
        name: 'A Sweet Finish',
        icon: 'emoji:🍰',
        items: [
            { id: 'd1', name: 'Dark Chocolate & Sea Salt Tart', price: '325', description: '70% chocolate ganache, cocoa pastry and vanilla bean cream.', attributes: [], tags: ['vegetarian'] },
            { id: 'd2', name: 'Burnt Basque Cheesecake', price: '345', description: 'Caramelised cheesecake with seasonal fruit preserve.', attributes: [], tags: ['vegetarian'] },
            { id: 'd3', name: 'Tender Coconut Panna Cotta', price: '295', description: 'Fresh coconut, lime leaf and pineapple.', attributes: [], tags: ['vegetarian'] },
        ],
    },
];

const categories: PrintCategory[] = rawCategories.map((category) => ({
    ...category,
    items: category.items.map((item) => ({
        ...item,
        // Review output follows the production admission rule: only facts on
        // this item may create symbols. Descriptive words never create them.
        decisionSymbols: resolveItemDecisionSymbolIds(item),
    })),
}));

const source: MenuCardPrintSource = {
    tenantId: 'visual-audit-tenant',
    storeId: 'visual-audit-store',
    projectId: 'visual-audit-project',
    menuSnapshotId: null,
    business: {
        name: 'Nila House',
        phone: '+91 80 4567 8900',
        address: '12 Museum Road, Bengaluru, Karnataka 560001',
        businessType: 'Cafe',
        businessCategory: 'food',
        catalogKind: 'menu',
        offeringKind: 'menuItem',
        publicMenuUrl: 'https://nila-house.menulist.online',
        activePlanType: 'pro',
        brandColor: '#315C4B',
        brandTokens: {
            accentColor: '#315C4B',
            textColor: '#1E2622',
            mutedColor: '#5E6B64',
            borderColor: '#CAD2CE',
        },
    },
    qr: {
        destinationUrl: 'https://nila-house.menulist.online?utm_source=print_menu',
        shortUrl: 'nila-house.menulist.online',
        label: 'View current menu',
        errorCorrection: 'Q',
    },
    menu: {
        title: 'All-Day Menu',
        updatedAt: '2026-08-30T08:00:00.000Z',
        language: 'en',
        currency: '₹',
        currencyCode: 'INR',
        categories,
    },
    flags: {
        hasPhotos: false,
        hasDescriptions: true,
        hasVariants: true,
        hasDietaryTags: true,
        hasCategoryIcons: true,
        hasMissingPrices: false,
    },
};

const salonSource: MenuCardPrintSource = {
    ...source,
    projectId: 'visual-audit-salon-project',
    business: {
        ...source.business,
        name: 'Aster & Oak Studio',
        tagline: 'Thoughtful care, beautifully finished',
        phone: '+91 80 4123 7788',
        address: '42 Indiranagar Main Road, Bengaluru, Karnataka 560038',
        businessType: 'Salon',
        businessCategory: 'service',
        catalogKind: 'offerCatalog',
        offeringKind: 'service',
        publicMenuUrl: 'https://aster-oak.menulist.online',
        brandColor: '#164B3A',
        brandTokens: {
            accentColor: '#164B3A',
            textColor: '#18271F',
            mutedColor: '#66746C',
            borderColor: '#B7C2BA',
        },
    },
    qr: {
        destinationUrl: 'https://aster-oak.menulist.online?utm_source=print_menu',
        shortUrl: 'aster-oak.menulist.online',
        label: 'View current services',
        errorCorrection: 'Q',
    },
    menu: {
        ...source.menu,
        title: 'Services & Pricing',
        categories: [
            {
                id: 'hair',
                name: 'Hair & Grooming',
                items: [
                    { id: 'h1', name: 'Signature Haircut', price: '650', description: 'Consultation, precision cut, wash and finish.', attributes: [], tags: ['popular'] },
                    { id: 'h2', name: 'Haircut & Beard Detail', price: '950', description: 'Complete grooming session with tailored finishing.', attributes: [], tags: [] },
                    { id: 'h3', name: 'Classic Shave', price: '450', description: 'Hot towel preparation and close razor finish.', attributes: [], tags: [] },
                    { id: 'h4', name: 'Hair Colour', price: '1800', description: 'Professional colour consultation and application.', attributes: [], tags: [] },
                ],
            },
            {
                id: 'rituals',
                name: 'Care Rituals',
                items: [
                    { id: 'r1', name: 'Deep Conditioning Ritual', price: '1200', description: 'Restorative treatment selected for your hair condition.', attributes: [], tags: [] },
                    { id: 'r2', name: 'Scalp Renewal', price: '1450', description: 'Clarifying scalp care followed by a relaxing massage.', attributes: [], tags: [] },
                    { id: 'r3', name: 'Express Facial', price: '1100', description: 'Cleanse, exfoliation, mask and moisturising finish.', attributes: [], tags: [] },
                    { id: 'r4', name: 'Signature Facial', price: '2200', description: 'Extended skin ritual with massage and targeted mask.', attributes: [], tags: ['popular'] },
                ],
            },
            {
                id: 'hands',
                name: 'Hands & Feet',
                items: [
                    { id: 'n1', name: 'Classic Manicure', price: '850', description: 'Nail shaping, cuticle care and polish.', attributes: [], tags: [] },
                    { id: 'n2', name: 'Classic Pedicure', price: '1050', description: 'Foot soak, nail care, exfoliation and polish.', attributes: [], tags: [] },
                    { id: 'n3', name: 'Spa Pedicure', price: '1550', description: 'Extended foot ritual with scrub, mask and massage.', attributes: [], tags: [] },
                ],
            },
            {
                id: 'colour',
                name: 'Colour Atelier',
                items: [
                    { id: 'c1', name: 'Root Refresh', price: '1800', description: 'Precision regrowth colour with a polished finish.', attributes: [], tags: [] },
                    { id: 'c2', name: 'Global Colour', price: '3200', description: 'Full-length colour selected after a personal consultation.', attributes: [], tags: [] },
                    { id: 'c3', name: 'Face-Framing Highlights', price: '2400', description: 'Soft placement designed to brighten the face.', attributes: [], tags: [] },
                    { id: 'c4', name: 'Full Highlights', price: '4800', description: 'Dimensional colour placement with toning and finish.', attributes: [], tags: [] },
                ],
            },
            {
                id: 'texture',
                name: 'Texture & Finish',
                items: [
                    { id: 't1', name: 'Signature Blow-Dry', price: '850', description: 'Wash, styling preparation and a tailored finish.', attributes: [], tags: [] },
                    { id: 't2', name: 'Event Styling', price: '1800', description: 'Refined styling for celebrations and special occasions.', attributes: [], tags: [] },
                    { id: 't3', name: 'Smoothing Ritual', price: '4200', description: 'Consultation-led smoothing service for easier daily care.', attributes: [], tags: [] },
                    { id: 't4', name: 'Curl Definition', price: '1450', description: 'Hydration, shaping and curl-by-curl finishing.', attributes: [], tags: [] },
                ],
            },
            {
                id: 'skin',
                name: 'Skin Rituals',
                items: [
                    { id: 'f1', name: 'Essential Cleanse', price: '1200', description: 'A focused cleanse, exfoliation and hydration service.', attributes: [], tags: [] },
                    { id: 'f2', name: 'Renewal Facial', price: '1950', description: 'Targeted treatment with massage and restorative mask.', attributes: [], tags: ['popular'] },
                    { id: 'f3', name: 'Calm & Restore Facial', price: '2200', description: 'Comforting ritual for sensitive or stressed skin.', attributes: [], tags: [] },
                    { id: 'f4', name: 'Radiance Facial', price: '2500', description: 'Brightening treatment with a luminous finishing ritual.', attributes: [], tags: [] },
                ],
            },
            {
                id: 'grooming',
                name: 'Finishing Details',
                items: [
                    { id: 'g1', name: 'Brow Shape', price: '350', description: 'Precise shaping tailored to your natural brow line.', attributes: [], tags: [] },
                    { id: 'g2', name: 'Brow Tint', price: '450', description: 'Soft colour definition with a natural finish.', attributes: [], tags: [] },
                    { id: 'g3', name: 'Express Makeup', price: '1600', description: 'Polished makeup for daytime events and portraits.', attributes: [], tags: [] },
                    { id: 'g4', name: 'Occasion Makeup', price: '2800', description: 'Complete event-ready makeup with finishing touches.', attributes: [], tags: [] },
                ],
            },
        ],
    },
    flags: {
        ...source.flags,
        hasVariants: false,
        hasDietaryTags: false,
    },
};

const spaSource: MenuCardPrintSource = {
    ...salonSource,
    projectId: 'visual-audit-spa-project',
    business: {
        ...salonSource.business,
        name: 'Stillwater Ritual Spa',
        businessType: 'Spa',
        businessCategory: 'health',
        publicMenuUrl: 'https://stillwater-spa.menulist.online',
    },
    qr: {
        ...salonSource.qr,
        destinationUrl: 'https://stillwater-spa.menulist.online?utm_source=print_menu',
        shortUrl: 'stillwater-spa.menulist.online',
    },
    menu: {
        ...salonSource.menu,
        title: 'Treatments & Rituals',
        categories: [
            {
                id: 'massage',
                name: 'Massage Rituals',
                items: [
                    { id: 'sm1', name: 'Stillwater Signature', price: '3200', description: '75 min - A flowing full-body massage tailored after consultation.', attributes: [], tags: ['popular'] },
                    { id: 'sm2', name: 'Deep Release', price: '3600', description: '75 min - Focused pressure and assisted stretching for tired muscles.', attributes: [], tags: [] },
                    { id: 'sm3', name: 'Calm Within', price: '2700', description: '60 min - Gentle rhythmic massage with a quiet breathing ritual.', attributes: [], tags: [] },
                    { id: 'sm4', name: 'Mother-to-Be', price: '3000', description: '60 min - Supportive comfort massage after suitability consultation.', attributes: [], tags: [] },
                ],
            },
            {
                id: 'facials',
                name: 'Facial Treatments',
                items: [
                    { id: 'sf1', name: 'Essential Hydration', price: '2600', description: '60 min - Cleanse, gentle exfoliation, massage and hydration mask.', attributes: [], tags: [] },
                    { id: 'sf2', name: 'Radiance Renewal', price: '3400', description: '75 min - Brightening care with targeted massage and restorative finish.', attributes: [], tags: ['popular'] },
                    { id: 'sf3', name: 'Calm & Comfort', price: '3100', description: '60 min - A soothing ritual selected for sensitive or stressed skin.', attributes: [], tags: [] },
                    { id: 'sf4', name: 'Express Revival', price: '1900', description: '30 min - Focused cleanse, mask and finishing hydration.', attributes: [], tags: [] },
                ],
            },
            {
                id: 'body',
                name: 'Body & Mineral Care',
                items: [
                    { id: 'sb1', name: 'Mineral Body Polish', price: '2400', description: '45 min - Mineral exfoliation followed by replenishing body moisture.', attributes: [], tags: [] },
                    { id: 'sb2', name: 'Eucalyptus Renewal', price: '3800', description: '90 min - Body polish, wrap and restorative scalp massage.', attributes: [], tags: [] },
                    { id: 'sb3', name: 'Back Purification', price: '2200', description: '45 min - Cleanse, exfoliation and mask for the back and shoulders.', attributes: [], tags: [] },
                    { id: 'sb4', name: 'Foot & Leg Restore', price: '1800', description: '45 min - Cooling foot ritual with focused lower-leg massage.', attributes: [], tags: [] },
                ],
            },
            {
                id: 'journeys',
                name: 'Spa Journeys',
                items: [
                    { id: 'sj1', name: 'Half-Day Reset', price: '6800', description: '180 min - Body polish, signature massage, facial and herbal refreshment.', attributes: [], tags: ['popular'] },
                    { id: 'sj2', name: 'Together Ritual', price: '7600', description: '120 min - A private paired massage and relaxation ritual for two.', attributes: [], tags: [] },
                    { id: 'sj3', name: 'Quiet Morning', price: '5200', description: '120 min - Gentle massage, express facial and guided rest.', attributes: [], tags: [] },
                    { id: 'sj4', name: 'Gift of Wellness', price: '5000', description: 'Flexible value - Presented as a personalised spa gift certificate.', attributes: [], tags: [] },
                ],
            },
        ],
    },
};

function buildFoodThemeSource(params: {
    businessType: string;
    categoryItems: ReadonlyArray<readonly [string, readonly string[]]>;
    name: string;
    projectId: string;
    shortUrl: string;
    title: string;
}): MenuCardPrintSource {
    const themedCategories: PrintCategory[] = params.categoryItems.map(([categoryName, itemNames], categoryIndex) => ({
        id: `food-${categoryIndex + 1}`,
        name: categoryName,
        items: itemNames.map((name, itemIndex) => ({
            attributes: [],
            description: `House-made with carefully selected ingredients and a balanced signature finish.`,
            id: `food-${categoryIndex + 1}-${itemIndex + 1}`,
            name,
            price: String(165 + categoryIndex * 55 + itemIndex * 35),
            tags: itemIndex === 0 ? ['popular'] : [],
        })),
    }));
    return {
        ...source,
        projectId: params.projectId,
        business: {
            ...source.business,
            address: '18 Market Lane, Bengaluru, Karnataka 560001',
            businessType: params.businessType,
            name: params.name,
            publicMenuUrl: `https://${params.shortUrl}`,
        },
        qr: {
            ...source.qr,
            destinationUrl: `https://${params.shortUrl}?utm_source=print_menu`,
            shortUrl: params.shortUrl,
        },
        menu: {
            ...source.menu,
            categories: themedCategories,
            title: params.title,
        },
    };
}

const roasteryLedgerSource = buildFoodThemeSource({
    businessType: 'Specialty Coffee Shop',
    categoryItems: [
        ['Espresso Bar', ['House Espresso', 'Macchiato', 'Flat White', 'Cappuccino', 'Mocha No. 5']],
        ['Slow Brew', ['Seasonal Pour Over', 'Chemex for Two', 'Aeropress Reserve', 'Cold Drip', 'Roaster Flight']],
        ['Coffee Editions', ['Honey Process Reserve', 'Washed Estate Lot', 'Natural Microlot', 'Decaf Selection', 'Guest Roaster Cup']],
        ['Bakery Counter', ['Butter Croissant', 'Almond Morning Bun', 'Cocoa Babka', 'Orange Tea Cake', 'Sea Salt Cookie']],
        ['Cold Coffee', ['Iced Long Black', 'Cloud Latte', 'Citrus Espresso Tonic', 'Cold Brew Float', 'Cascara Spritz']],
    ],
    name: 'Copper & Bloom Roastery',
    projectId: 'visual-audit-roastery-ledger',
    shortUrl: 'copper-bloom.menulist.online',
    title: 'Coffee & Roastery Menu',
});

const patisserieConservatorySource = buildFoodThemeSource({
    businessType: 'Bakery',
    categoryItems: [
        ['Viennoiserie', ['Butter Croissant', 'Pain au Chocolat', 'Pistachio Escargot', 'Almond Croissant', 'Seasonal Danish']],
        ['Signature Cakes', ['Pistachio Rose', 'Dark Chocolate Opera', 'Vanilla Berry Gateau', 'Citrus Praline', 'Hazelnut Caramel']],
        ['Tarts & Choux', ['Lemon Meringue Tart', 'Raspberry Choux', 'Chocolate Éclair', 'Pear Frangipane', 'Salted Caramel Tart']],
        ['Tea Cakes', ['Orange Blossom Loaf', 'Brown Butter Financier', 'Madeleine Collection', 'Cocoa Tea Cake', 'Vanilla Marble Slice']],
        ['Gift Collections', ['Petit Four Box', 'Macaron Six', 'Celebration Cake', 'Conservatory Hamper', 'Afternoon Pastry Box']],
    ],
    name: 'Maison Pistache',
    projectId: 'visual-audit-patisserie-conservatory',
    shortUrl: 'maison-pistache.menulist.online',
    title: 'Patisserie Collection',
});

const gelateriaRivieraSource = buildFoodThemeSource({
    businessType: 'Ice Cream Shop',
    categoryItems: [
        ['House Classics', ['Madagascar Vanilla', 'Dark Chocolate', 'Pistachio Verde', 'Stracciatella', 'Salted Caramel']],
        ['Riviera Fruits', ['Amalfi Lemon', 'Wild Strawberry', 'Blood Orange', 'White Peach', 'Raspberry Hibiscus']],
        ['Crema Collection', ['Tiramisu', 'Roasted Hazelnut', 'Ricotta Honey', 'Espresso Cream', 'Coconut Praline']],
        ['Coppe & Sundaes', ['Riviera Coppa', 'Chocolate Affogato', 'Berry Garden', 'Pistachio Cloud', 'Citrus Meringue']],
        ['Take Home', ['Piccolo Tub', 'Family Tub', 'Six Gelato Sandwiches', 'Celebration Gelato Cake', 'Tasting Flight']],
    ],
    name: 'Riviera Gelato House',
    projectId: 'visual-audit-gelateria-riviera',
    shortUrl: 'riviera-gelato.menulist.online',
    title: 'Gelato & Dolci',
});

function buildThemeServiceSource(params: {
    address: string;
    businessCategory: string;
    businessType: string;
    categories: PrintCategory[];
    name: string;
    projectId: string;
    shortUrl: string;
    title: string;
}): MenuCardPrintSource {
    return {
        ...salonSource,
        projectId: params.projectId,
        business: {
            ...salonSource.business,
            name: params.name,
            address: params.address,
            businessType: params.businessType,
            businessCategory: params.businessCategory,
            publicMenuUrl: `https://${params.shortUrl}`,
        },
        qr: {
            ...salonSource.qr,
            destinationUrl: `https://${params.shortUrl}?utm_source=print_menu`,
            shortUrl: params.shortUrl,
            label: 'View current services',
        },
        menu: {
            ...salonSource.menu,
            title: params.title,
            currency: '$',
            currencyCode: 'USD',
            categories: params.categories,
        },
    };
}

const galleryLedgerSource = buildThemeServiceSource({
    address: '18 Design District, City North',
    businessCategory: 'professional',
    businessType: 'Interior Designer',
    name: 'Northline Atelier',
    projectId: 'visual-audit-gallery-ledger',
    shortUrl: 'northline.menulist.online',
    title: 'Objects & Services',
    categories: [
        { id: 'consultation', name: 'Consultation & Direction', items: [
            { id: 'gl-01', name: 'Discovery Consultation', price: '220', description: 'A focused working session to define scope, priorities, budget and next steps.', attributes: [], tags: ['popular'] },
            { id: 'gl-02', name: 'Spatial Planning', price: '480', description: 'Measured layout guidance for circulation, furniture placement and functional zones.', attributes: [], tags: [] },
            { id: 'gl-03', name: 'Material Direction', price: '350', description: 'A considered palette of finishes, surfaces, textiles and complementary colour.', attributes: [], tags: [] },
            { id: 'gl-04', name: 'Styling Review', price: '180', description: 'Editorial refinement of objects, lighting and final visual balance.', attributes: [], tags: [] },
        ] },
        { id: 'objects', name: 'Curated Objects', items: [
            { id: 'gl-05', name: 'Statement Lighting Edit', price: '680', description: 'A curated lighting selection matched to scale, atmosphere and practical needs.', attributes: [], tags: [] },
            { id: 'gl-06', name: 'Art & Object Curation', price: '520', description: 'Sourcing guidance for artwork and objects with provenance and purpose.', attributes: [], tags: [] },
            { id: 'gl-07', name: 'Textile Collection', price: '420', description: 'Coordinated upholstery, drapery and soft-furnishing recommendations.', attributes: [], tags: [] },
            { id: 'gl-08', name: 'Seasonal Object Edit', price: '240', description: 'A compact refresh using a restrained, cohesive collection of finishing pieces.', attributes: [], tags: [] },
        ] },
        { id: 'made-order', name: 'Made To Order', items: [
            { id: 'gl-09', name: 'Custom Console', price: '1250', description: 'Made-to-measure furniture developed for the intended wall, storage and finish.', attributes: [], tags: [] },
            { id: 'gl-10', name: 'Bespoke Shelving', price: '1680', description: 'Purpose-built shelving with material, proportion and installation planning.', attributes: [], tags: [] },
            { id: 'gl-11', name: 'Upholstery Commission', price: '650', description: 'Renewal of a selected piece using premium fabric and traditional detailing.', attributes: [], tags: [] },
            { id: 'gl-12', name: 'Dining Table Commission', price: '2200', description: 'A custom table designed around room scale, seating and chosen timber.', attributes: [], tags: [] },
        ] },
        { id: 'delivery', name: 'Project Delivery', items: [
            { id: 'gl-13', name: 'Procurement Management', price: '950', description: 'Supplier coordination, order tracking and a clear consolidated purchase record.', attributes: [], tags: [] },
            { id: 'gl-14', name: 'Installation Day', price: '780', description: 'On-site coordination of placement, assembly, styling and final adjustments.', attributes: [], tags: [] },
            { id: 'gl-15', name: 'Room Completion Package', price: '1850', description: 'A complete final-layer service for one room, from selections through styling.', attributes: [], tags: ['popular'] },
            { id: 'gl-16', name: 'Project Documentation', price: '320', description: 'A concise specification record of approved items, finishes and care notes.', attributes: [], tags: [] },
        ] },
        { id: 'care', name: 'Care & Restoration', items: [
            { id: 'gl-17', name: 'Furniture Condition Review', price: '160', description: 'A practical assessment of finish, joinery, upholstery and restoration priorities.', attributes: [], tags: [] },
            { id: 'gl-18', name: 'Surface Restoration', price: '480', description: 'Careful renewal of timber, stone or metal surfaces with a restrained finish.', attributes: [], tags: [] },
            { id: 'gl-19', name: 'Reupholstery Service', price: '720', description: 'Fabric replacement, internal repair and finishing for a selected furniture piece.', attributes: [], tags: [] },
            { id: 'gl-20', name: 'Annual Collection Review', price: '295', description: 'A scheduled review to maintain, rotate and refresh your curated collection.', attributes: [], tags: [] },
        ] },
    ],
});

const vitalCurrentSource = buildThemeServiceSource({
    address: '90 Riverfront Avenue, Harbor City',
    businessCategory: 'health',
    businessType: 'Fitness Center',
    name: 'Form & Field Studio',
    projectId: 'visual-audit-vital-current',
    shortUrl: 'form-field.menulist.online',
    title: 'Service Menu',
    categories: [
        { id: 'movement', name: 'Movement', items: [
            { id: 'vc-01', name: 'Foundations Session', price: '95', description: '60 min - Personal movement assessment and guided strength foundations.', attributes: [], tags: ['popular'] },
            { id: 'vc-02', name: 'Movement Flow', price: '32', description: '50 min - Small-group mobility, coordination and functional movement class.', attributes: [], tags: [] },
            { id: 'vc-03', name: 'Strength Technique', price: '85', description: '60 min - One-to-one coaching for safe, efficient strength mechanics.', attributes: [], tags: [] },
            { id: 'vc-04', name: 'Mobility Reset', price: '55', description: '45 min - Guided range-of-motion work for daily comfort and performance.', attributes: [], tags: [] },
        ] },
        { id: 'recovery', name: 'Recovery', items: [
            { id: 'vc-05', name: 'Restore & Recover', price: '110', description: '60 min - Targeted mobility, soft-tissue work and guided breath practice.', attributes: [], tags: [] },
            { id: 'vc-06', name: 'Reset Therapy', price: '130', description: '75 min - Advanced recovery session to reduce tension and support performance.', attributes: [], tags: [] },
            { id: 'vc-07', name: 'Assisted Stretch', price: '70', description: '45 min - Personalised assisted mobility for common restriction patterns.', attributes: [], tags: [] },
            { id: 'vc-08', name: 'Recovery Circuit', price: '38', description: '45 min - Small-group recovery using mobility, breath and low-load movement.', attributes: [], tags: [] },
        ] },
        { id: 'coaching', name: 'Coaching', items: [
            { id: 'vc-09', name: 'Performance Coaching', price: '120', description: '60 min - Individual coaching to improve movement quality and training focus.', attributes: [], tags: [] },
            { id: 'vc-10', name: 'Lifestyle Coaching', price: '90', description: '45 min - Sustainable habit planning, accountability and progress review.', attributes: [], tags: [] },
            { id: 'vc-11', name: 'Return To Training', price: '135', description: '60 min - A measured progression plan following a break or completed treatment.', attributes: [], tags: [] },
            { id: 'vc-12', name: 'Team Coaching Session', price: '240', description: '75 min - Collaborative performance session for teams of up to eight people.', attributes: [], tags: [] },
        ] },
        { id: 'memberships', name: 'Memberships', items: [
            { id: 'vc-13', name: 'Essential Membership', price: '129', description: 'Monthly - Unlimited classes, one progress review and member booking access.', attributes: [], tags: [] },
            { id: 'vc-14', name: 'Premium Membership', price: '199', description: 'Monthly - Essential benefits plus recovery credits and guest access.', attributes: [], tags: ['popular'] },
            { id: 'vc-15', name: 'Studio Ten Pack', price: '280', description: 'Flexible class pack valid for twelve weeks from first use.', attributes: [], tags: [] },
            { id: 'vc-16', name: 'Private Coaching Four Pack', price: '430', description: 'Four personal sessions with an individual progress framework.', attributes: [], tags: [] },
        ] },
        { id: 'assessments', name: 'Assessments', items: [
            { id: 'vc-17', name: 'Movement Screen', price: '75', description: '45 min - Baseline mobility, balance and movement-pattern review.', attributes: [], tags: [] },
            { id: 'vc-18', name: 'Performance Baseline', price: '145', description: '75 min - Strength, capacity and movement measures with a written summary.', attributes: [], tags: [] },
            { id: 'vc-19', name: 'Training Plan Review', price: '65', description: '30 min - A focused review of current training, load and next priorities.', attributes: [], tags: [] },
            { id: 'vc-20', name: 'Quarterly Progress Review', price: '95', description: '60 min - Repeat measures, coaching review and updated recommendations.', attributes: [], tags: [] },
        ] },
    ],
});

const workshopAtlasSource = buildThemeServiceSource({
    address: '44 Foundry Lane, River District',
    businessCategory: 'professional',
    businessType: 'Home Renovation Contractor',
    name: 'Harbor Works Co.',
    projectId: 'visual-audit-workshop-atlas',
    shortUrl: 'harbor-works.menulist.online',
    title: 'Service Catalogue',
    categories: [
        { id: 'care-plans', name: 'Care Plans', items: [
            { id: 'wa-01', name: 'Essential Care Plan', price: '79', description: 'Monthly - Routine check-ins and proactive upkeep for one service area.', attributes: [], tags: [] },
            { id: 'wa-02', name: 'Property Care Plan', price: '149', description: 'Monthly - Scheduled maintenance coordination across up to three areas.', attributes: [], tags: ['popular'] },
            { id: 'wa-03', name: 'Seasonal Readiness Visit', price: '189', description: 'A practical inspection and maintenance pass before seasonal change.', attributes: [], tags: [] },
            { id: 'wa-04', name: 'Priority Member Access', price: '299', description: 'Annual - Priority scheduling, preferred rates and a yearly condition review.', attributes: [], tags: [] },
        ] },
        { id: 'precision', name: 'Precision Services', items: [
            { id: 'wa-05', name: 'Finish & Detail', price: '259', description: 'Two to three days - Fine adjustment and finishing for one defined area.', attributes: [], tags: [] },
            { id: 'wa-06', name: 'Upgrade & Optimise', price: '349', description: 'Planned improvements that strengthen function, comfort and long-term value.', attributes: [], tags: [] },
            { id: 'wa-07', name: 'Hardware Refresh', price: '195', description: 'Replacement and alignment of selected handles, hinges and fittings.', attributes: [], tags: [] },
            { id: 'wa-08', name: 'Surface Renewal', price: '420', description: 'Preparation and renewal of a selected wall, timber or metal surface.', attributes: [], tags: [] },
        ] },
        { id: 'builds', name: 'Project Builds', items: [
            { id: 'wa-09', name: 'Project Build', price: '799', description: 'Custom small project delivered from measured plan through final completion.', attributes: [], tags: [] },
            { id: 'wa-10', name: 'Storage Installation', price: '950', description: 'Made-to-fit storage planning, fabrication coordination and installation.', attributes: [], tags: [] },
            { id: 'wa-11', name: 'Room Refresh', price: '1250', description: 'A coordinated practical update for one room, including finishing and detail.', attributes: [], tags: [] },
            { id: 'wa-12', name: 'Custom Fabrication', price: '1480', description: 'A measured fabrication project using agreed materials and specifications.', attributes: [], tags: [] },
        ] },
        { id: 'support', name: 'Site Support', items: [
            { id: 'wa-13', name: 'Design Consult', price: '129', description: '90 min - Collaborative planning, material guidance and practical next steps.', attributes: [], tags: [] },
            { id: 'wa-14', name: 'On-Site Support', price: '199', description: 'Same day - Up to two hours of hands-on support and problem solving.', attributes: [], tags: [] },
            { id: 'wa-15', name: 'Site Measure', price: '145', description: 'Measured survey of the agreed area with concise specification notes.', attributes: [], tags: [] },
            { id: 'wa-16', name: 'Installation Supervision', price: '390', description: 'On-site coordination for placement, fit, safety and finishing quality.', attributes: [], tags: [] },
        ] },
        { id: 'aftercare', name: 'Aftercare & Review', items: [
            { id: 'wa-17', name: 'Completion Inspection', price: '95', description: 'A detailed finishing review with a documented correction list.', attributes: [], tags: [] },
            { id: 'wa-18', name: 'Thirty-Day Check', price: '85', description: 'Follow-up inspection and adjustment after the completed work has settled.', attributes: [], tags: [] },
            { id: 'wa-19', name: 'Repair Assessment', price: '110', description: 'A practical diagnosis with scope, material and timing recommendations.', attributes: [], tags: [] },
            { id: 'wa-20', name: 'Annual Condition Review', price: '180', description: 'A yearly inspection to identify maintenance needs before they become repairs.', attributes: [], tags: [] },
        ] },
    ],
});

function getFixtureSourceForTheme(themeId: PrintableTemplateFamilyId): MenuCardPrintSource {
    if (themeId === 'roastery-ledger') return roasteryLedgerSource;
    if (themeId === 'patisserie-conservatory') return patisserieConservatorySource;
    if (themeId === 'gelateria-riviera') return gelateriaRivieraSource;
    if (SALON_BEAUTY_THEME_IDS.has(themeId)) return {
        ...salonSource,
        projectId: `visual-audit-${themeId}`,
    };
    if (SPA_THEME_IDS.has(themeId)) return {
        ...spaSource,
        projectId: `visual-audit-${themeId}`,
        business: {
            ...spaSource.business,
        },
        qr: {
            ...spaSource.qr,
        },
    };
    if (themeId === 'performance-circuit') return vitalCurrentSource;
    if (themeId === 'gallery-ledger') return galleryLedgerSource;
    if (themeId === 'vital-current') return vitalCurrentSource;
    if (themeId === 'workshop-atlas') return workshopAtlasSource;
    if (themeId === 'neighbourhood-standard') return salonSource;
    if (themeId === 'field-notes') return workshopAtlasSource;
    if (
        themeId === 'boutique-window'
        || themeId === 'market-label'
        || themeId === 'civic-letterpress'
        || themeId === 'modern-practice'
        || themeId === 'studio-contact-sheet'
        || themeId === 'maker-ledger'
        || themeId === 'hospitality-house'
    ) return galleryLedgerSource;
    if (themeId === 'clinical-calm' || themeId === 'mindful-motion') return vitalCurrentSource;
    if (themeId === 'future-workshop') return workshopAtlasSource;
    if (
        themeId === 'botanical-heritage'
        || themeId === 'sunset-atelier'
        || themeId === 'rosewater-editorial'
        || themeId === 'mineral-sanctuary'
        || themeId === 'noir-studio'
    ) return salonSource;
    return source;
}

function settings(styleId: 'classic' | 'premium' | 'compact'): MenuCardExportSettings {
    return {
        preset: 'table_menu',
        paperSize: 'a4',
        orientation: 'portrait',
        density: styleId === 'premium' ? 'comfortable' : styleId === 'compact' ? 'compact' : 'balanced',
        styleId,
        includeCoverPage: true,
        includeLogo: true,
        includeDescriptions: true,
        includePhotos: false,
        includeQr: true,
        includeContactBlock: true,
        includeUpdatedDate: true,
    };
}

async function main() {
    await mkdir(OUTPUT_DIRECTORY, { recursive: true });
    Reflect.set(globalThis, 'Path2D', CanvasPath2D);
    const menuListLogoHeight = 160;
    const menuListLogoCanvas = createCanvas(
        Math.round(getMenuListLogoMarkWidth(menuListLogoHeight)),
        menuListLogoHeight,
    );
    drawMenuListLogoMark(
        menuListLogoCanvas.getContext('2d') as unknown as CanvasRenderingContext2D,
        0,
        0,
        menuListLogoHeight,
    );
    const menuListLogoDataUrl = menuListLogoCanvas.toDataURL('image/png');
    const [botanicalCorner, botanicalRail] = await Promise.all([
        readFile(BOTANICAL_CORNER_PATH),
        readFile(BOTANICAL_RAIL_PATH),
    ]);
    const themePageDataUrls = new Map(
        await Promise.all(Object.entries(THEME_PAGE_PATHS).map(async ([themeId, filePath]) => {
            const bytes = await readFile(filePath);
            return [themeId, `data:image/png;base64,${bytes.toString('base64')}`] as const;
        })),
    );
    const backgroundArtworkDataUrls = {
        botanicalCorner: `data:image/png;base64,${botanicalCorner.toString('base64')}`,
        botanicalRail: `data:image/png;base64,${botanicalRail.toString('base64')}`,
    };
    if (requestedThemeIds.size === 0) {
        for (const styleId of ['classic', 'premium', 'compact'] as const) {
            const fixtureSource = styleId === 'premium' ? salonSource : source;
            const artifact = await renderPdf(fixtureSource, settings(styleId), {}, GENERATED_AT, {
                fallbackLogoDataUrl: menuListLogoDataUrl,
                backgroundArtworkDataUrls,
            });
            const outputPath = path.join(OUTPUT_DIRECTORY, `${styleId}.pdf`);
            await writeFile(outputPath, Buffer.from(await artifact.blob.arrayBuffer()));
            process.stdout.write(`${styleId}: ${artifact.pageCount} page(s) -> ${outputPath}\n`);
        }
    }
    const themeIds = (Object.keys(THEME_PAGE_PATHS) as PrintableTemplateFamilyId[])
        .filter((themeId) => requestedThemeIds.size === 0 || requestedThemeIds.has(themeId));
    for (const themeId of themeIds) {
        const themeSettings = {
            ...settings('premium'),
            printableThemeId: themeId,
        } satisfies MenuCardExportSettings;
        const fixtureSource = getFixtureSourceForTheme(themeId);
        const artifact = await renderPdf(fixtureSource, themeSettings, {}, GENERATED_AT, {
            // Every parent-theme fixture exercises the production no-logo
            // contract: truthful initials are used instead of substituting
            // the MenuList platform mark for the business identity.
            fallbackLogoDataUrl: undefined,
            backgroundArtworkDataUrls: {
                themePage: themePageDataUrls.get(themeId),
            },
        });
        if (artifact.pageCount < 5) {
            throw new Error(
                `${themeId} fixture must preserve a cover, readable content pagination, and a dedicated closing page`,
            );
        }
        const outputPath = path.join(OUTPUT_DIRECTORY, `${themeId}.pdf`);
        await writeFile(outputPath, Buffer.from(await artifact.blob.arrayBuffer()));
        process.stdout.write(`${themeId}: ${artifact.pageCount} page(s) -> ${outputPath}\n`);
    }
}

main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
});
