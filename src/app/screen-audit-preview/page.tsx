import type { MenuItemForSlide, ScreenSlide, ScreenStoreInfo } from "@type/campaigns";
import MenuBoardDisplay from "../screen/[token]/MenuBoardDisplay";
import ScreenDisplay from "../screen/[token]/ScreenDisplay";

const storeInfo: ScreenStoreInfo = {
    name: "Annapurna Family Restaurant",
    logoUrl: "/apple-touch-icon.png",
    menuQrUrl: "https://menulist.ai",
    currencyCode: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    activePlanType: "Growth",
};

const categoryItems: Array<{
    category: string;
    items: Array<[string, number, string, string[]?]>;
}> = [
    {
        category: "Breakfast Favourites",
        items: [
            ["Masala Dosa", 145, "Crisp dosa, potato masala, sambar and chutney", ["vegetarian"]],
            ["Ghee Podi Idli", 135, "Soft idlis tossed with house podi and ghee", ["vegetarian"]],
            ["Paneer Paratha Platter", 195, "Two stuffed parathas with curd and pickle", ["vegetarian"]],
            ["Egg Bhurji Pav", 165, "Spiced scrambled eggs with toasted pav", ["contains egg"]],
            ["Filter Coffee", 65, "Freshly brewed South Indian filter coffee"],
        ],
    },
    {
        category: "Lunch & Dinner",
        items: [
            ["Annapurna Special Thali", 295, "A complete seasonal meal with rice, breads and dessert", ["vegetarian"]],
            ["Paneer Butter Masala", 265, "Paneer in a rich tomato and cashew gravy", ["vegetarian"]],
            ["Chicken Chettinad", 325, "Roasted spices, coconut and tender chicken", ["non-vegetarian"]],
            ["Dal Tadka", 195, "Yellow lentils tempered with garlic and cumin", ["vegetarian"]],
            ["Jeera Rice", 145, "Basmati rice with toasted cumin", ["vegetarian"]],
        ],
    },
    {
        category: "Quick Bites",
        items: [
            ["Bombay Grilled Sandwich", 175, "Vegetables, chutney and cheese", ["vegetarian"]],
            ["Crispy Corn Pepper Salt", 215, "Sweet corn with peppers and spring onion", ["vegetarian"]],
            ["Chicken 65", 285, "Crisp, spicy and finished with curry leaves", ["non-vegetarian"]],
            ["Paneer Tikka", 275, "Charred cottage cheese with peppers and onion", ["vegetarian"]],
        ],
    },
    {
        category: "Desserts & Drinks",
        items: [
            ["Gulab Jamun", 95, "Two warm dumplings in cardamom syrup", ["vegetarian"]],
            ["Sizzling Brownie With Ice Cream", 245, "Chocolate brownie, vanilla ice cream and hot sauce", ["vegetarian"]],
            ["Fresh Lime Soda", 85, "Sweet, salted or mixed"],
            ["Mango Lassi", 115, "Thick yoghurt drink with mango", ["vegetarian"]],
        ],
    },
];

const menuItems: MenuItemForSlide[] = categoryItems.flatMap((group, categoryIndex) =>
    group.items.map(([name, price, description, tags], itemIndex) => ({
        id: `${categoryIndex}-${itemIndex}`,
        name,
        price,
        description,
        tags,
        available: true,
        isBestSeller: itemIndex === 0,
        categoryName: group.category,
        categoryOrderIndex: categoryIndex,
        orderIndex: itemIndex,
    })),
);

const slides: ScreenSlide[] = [
    {
        id: "audit-owner",
        source: "pinned",
        type: "owner_upload",
        imageUrl: "/images/website/menulist-launch-square.png",
        caption: "Today’s family meal",
        confidenceScore: 1,
        availabilityLinked: false,
        availabilityReliability: "high",
    },
    {
        id: "audit-item",
        source: "evergreen",
        type: "item_highlight",
        imageUrl: "/images/website/menulist-hero-official-source.webp",
        itemName: "Annapurna Special Thali",
        price: 295,
        description: "A complete seasonal meal with rice, breads and dessert",
        tags: ["vegetarian"],
        confidenceScore: 0.9,
        availabilityLinked: true,
        availabilityReliability: "high",
    },
    {
        id: "audit-brand",
        source: "evergreen",
        type: "brand_fallback",
        imageUrl: "",
        confidenceScore: 0.8,
        availabilityLinked: false,
        availabilityReliability: "high",
    },
];

export default async function DigitalScreenAuditPage(props: {
    searchParams: Promise<{ mode?: string }>;
}) {
    const { mode } = await props.searchParams;

    if (mode === "highlights") {
        return (
            <ScreenDisplay
                initialData={{
                    slides,
                    storeInfo,
                    contentVersion: 7,
                    config: {
                        refreshIntervalMs: 30 * 60 * 1000,
                        slideDurationMs: 8000,
                    },
                    token: "audit123",
                    storeId: "99999999",
                }}
            />
        );
    }

    return (
        <MenuBoardDisplay
            initialData={{
                menuItems,
                storeInfo,
                contentVersion: 7,
                token: "audit123",
                storeId: "99999999",
            }}
        />
    );
}
