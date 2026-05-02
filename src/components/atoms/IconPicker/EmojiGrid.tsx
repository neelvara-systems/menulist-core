import { useAppSelector } from '@hook/useAppSelector';
import { getDarkModeState } from '@reduxSlices/clientThemeConfig';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { init, SearchIndex } from 'emoji-mart';
import { theme } from 'antd';
import { useLocale } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

type EmojiOption = {
    emoji: string;
    label: string;
    keywords: string[];
};

type EmojiGroup = {
    id: string;
    label: string;
    emojis: EmojiOption[];
};

export const EMOJI_GROUPS: EmojiGroup[] = [
    {
        id: 'food',
        label: 'Food & Drink',
        emojis: [
            { emoji: '🍕', label: 'Pizza', keywords: ['pizza', 'food', 'slice'] },
            { emoji: '🍔', label: 'Burger', keywords: ['burger', 'sandwich', 'food'] },
            { emoji: '🌮', label: 'Taco', keywords: ['taco', 'mexican', 'food'] },
            { emoji: '🍜', label: 'Noodles', keywords: ['noodle', 'ramen', 'soup'] },
            { emoji: '🍣', label: 'Sushi', keywords: ['sushi', 'fish', 'seafood'] },
            { emoji: '🥗', label: 'Salad', keywords: ['salad', 'healthy', 'greens'] },
            { emoji: '🍰', label: 'Cake', keywords: ['cake', 'dessert', 'bakery'] },
            { emoji: '🧁', label: 'Cupcake', keywords: ['cupcake', 'dessert', 'bakery'] },
            { emoji: '🍩', label: 'Donut', keywords: ['donut', 'dessert', 'sweet'] },
            { emoji: '🍦', label: 'Ice Cream', keywords: ['ice cream', 'dessert', 'gelato'] },
            { emoji: '☕', label: 'Coffee', keywords: ['coffee', 'cafe', 'drink'] },
            { emoji: '🍵', label: 'Tea', keywords: ['tea', 'drink'] },
            { emoji: '🥤', label: 'Soft Drink', keywords: ['drink', 'soda', 'juice', 'beverage'] },
            { emoji: '🍷', label: 'Wine', keywords: ['wine', 'bar', 'drink'] },
            { emoji: '🍺', label: 'Beer', keywords: ['beer', 'bar', 'drink'] },
            { emoji: '🍇', label: 'Grapes', keywords: ['grapes', 'fruit', 'fresh'] },
            { emoji: '🍎', label: 'Apple', keywords: ['apple', 'fruit', 'fresh'] },
            { emoji: '🌶️', label: 'Chili', keywords: ['chili', 'spicy', 'hot'] },
        ],
    },
    {
        id: 'animals',
        label: 'Animals & Nature',
        emojis: [
            { emoji: '🐟', label: 'Fish', keywords: ['fish', 'seafood', 'water'] },
            { emoji: '🐠', label: 'Tropical Fish', keywords: ['fish', 'tropical', 'water'] },
            { emoji: '🐡', label: 'Puffer Fish', keywords: ['fish', 'puffer', 'water'] },
            { emoji: '🪼', label: 'Jellyfish', keywords: ['jellyfish', 'water', 'sea'] },
            { emoji: '🐓', label: 'Chicken', keywords: ['chicken', 'bird', 'meat'] },
            { emoji: '🐄', label: 'Cow', keywords: ['cow', 'beef', 'meat'] },
            { emoji: '🐑', label: 'Sheep', keywords: ['sheep', 'lamb', 'wool'] },
            { emoji: '🐶', label: 'Dog', keywords: ['dog', 'pet', 'grooming'] },
            { emoji: '🐱', label: 'Cat', keywords: ['cat', 'pet', 'grooming'] },
            { emoji: '🌿', label: 'Herb', keywords: ['herb', 'leaf', 'green', 'organic'] },
            { emoji: '🌸', label: 'Flower', keywords: ['flower', 'beauty', 'spa'] },
            { emoji: '🌴', label: 'Palm', keywords: ['palm', 'spa', 'resort'] },
            { emoji: '🔥', label: 'Fire', keywords: ['fire', 'hot', 'grill', 'spicy'] },
            { emoji: '💧', label: 'Water Drop', keywords: ['water', 'wash', 'clean'] },
        ],
    },
    {
        id: 'beauty',
        label: 'Beauty & Service',
        emojis: [
            { emoji: '✂️', label: 'Scissors', keywords: ['scissors', 'haircut', 'salon', 'barber'] },
            { emoji: '💇', label: 'Haircut', keywords: ['hair', 'haircut', 'salon'] },
            { emoji: '💅', label: 'Nails', keywords: ['nails', 'manicure', 'beauty'] },
            { emoji: '💄', label: 'Lipstick', keywords: ['makeup', 'beauty', 'lipstick'] },
            { emoji: '🧴', label: 'Lotion', keywords: ['lotion', 'spa', 'skin', 'beauty'] },
            { emoji: '🫧', label: 'Bubbles', keywords: ['bubbles', 'wash', 'spa', 'bath'] },
            { emoji: '🛁', label: 'Bath', keywords: ['bath', 'spa', 'relax'] },
            { emoji: '💆', label: 'Massage', keywords: ['massage', 'spa', 'therapy'] },
            { emoji: '🧼', label: 'Soap', keywords: ['soap', 'wash', 'clean'] },
            { emoji: '🚗', label: 'Car', keywords: ['car', 'detailing', 'wash'] },
            { emoji: '🧹', label: 'Cleaning', keywords: ['cleaning', 'service', 'clean'] },
        ],
    },
    {
        id: 'shopping',
        label: 'Shopping & Retail',
        emojis: [
            { emoji: '🛍️', label: 'Shopping Bags', keywords: ['shopping', 'bags', 'retail', 'store'] },
            { emoji: '👕', label: 'Shirt', keywords: ['shirt', 'fashion', 'clothing'] },
            { emoji: '👗', label: 'Dress', keywords: ['dress', 'fashion', 'clothing'] },
            { emoji: '👟', label: 'Shoes', keywords: ['shoes', 'footwear', 'sneakers'] },
            { emoji: '💍', label: 'Ring', keywords: ['ring', 'jewelry', 'gem'] },
            { emoji: '⌚', label: 'Watch', keywords: ['watch', 'timepiece', 'retail'] },
            { emoji: '👜', label: 'Handbag', keywords: ['bag', 'fashion', 'accessory'] },
            { emoji: '🎁', label: 'Gift', keywords: ['gift', 'present', 'retail'] },
            { emoji: '📚', label: 'Books', keywords: ['books', 'bookstore', 'reading'] },
            { emoji: '💻', label: 'Laptop', keywords: ['laptop', 'electronics', 'computer'] },
            { emoji: '📱', label: 'Phone', keywords: ['phone', 'mobile', 'electronics'] },
            { emoji: '🛋️', label: 'Sofa', keywords: ['sofa', 'furniture', 'home'] },
        ],
    },
    {
        id: 'wellness',
        label: 'Wellness & Activity',
        emojis: [
            { emoji: '💪', label: 'Strength', keywords: ['gym', 'fitness', 'strength'] },
            { emoji: '🏋️', label: 'Weightlifting', keywords: ['gym', 'weights', 'training'] },
            { emoji: '🧘', label: 'Yoga', keywords: ['yoga', 'wellness', 'mindfulness'] },
            { emoji: '❤️', label: 'Heart', keywords: ['heart', 'wellness', 'care'] },
            { emoji: '🩺', label: 'Stethoscope', keywords: ['clinic', 'medical', 'health'] },
            { emoji: '💊', label: 'Pill', keywords: ['pill', 'medicine', 'health'] },
            { emoji: '🦷', label: 'Tooth', keywords: ['dental', 'tooth', 'clinic'] },
            { emoji: '🥊', label: 'Boxing', keywords: ['boxing', 'martial arts', 'training'] },
            { emoji: '🚴', label: 'Cycling', keywords: ['bike', 'rental', 'cycling'] },
        ],
    },
    {
        id: 'objects',
        label: 'Objects & Symbols',
        emojis: [
            { emoji: '⭐', label: 'Star', keywords: ['star', 'featured', 'popular'] },
            { emoji: '✨', label: 'Sparkles', keywords: ['sparkles', 'new', 'featured'] },
            { emoji: '🎨', label: 'Art', keywords: ['art', 'creative', 'design'] },
            { emoji: '📷', label: 'Camera', keywords: ['camera', 'photo', 'photography'] },
            { emoji: '🎵', label: 'Music', keywords: ['music', 'song', 'audio'] },
            { emoji: '🏠', label: 'Home', keywords: ['home', 'property', 'interior'] },
            { emoji: '📍', label: 'Location', keywords: ['location', 'travel', 'place'] },
            { emoji: '📅', label: 'Calendar', keywords: ['calendar', 'booking', 'schedule'] },
            { emoji: '💼', label: 'Briefcase', keywords: ['briefcase', 'business', 'professional'] },
            { emoji: '🔧', label: 'Wrench', keywords: ['wrench', 'repair', 'tools'] },
            { emoji: '🧸', label: 'Toy', keywords: ['kids', 'children', 'daycare'] },
            { emoji: '🔑', label: 'Key', keywords: ['key', 'access', 'workspace'] },
        ],
    },
];

interface EmojiGridProps {
    onSelect: (emojiValue: string) => void;
    searchQuery: string;
    showPreview?: boolean;
    selectedIcon?: string;
}

const SMB_EMOJI_CATEGORIES = ['frequent', 'people', 'foods', 'nature', 'objects', 'symbols'];
const EMOJI_BROWSER_COLUMNS = 7;

const EMOJI_MART_LOCALES = new Set([
    'en', 'ar', 'be', 'cs', 'de', 'es', 'fa', 'fi', 'fr', 'hi', 'it',
    'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'sa', 'tr', 'uk', 'vi', 'zh',
]);

function resolveEmojiMartLocale(locale: string | undefined) {
    if (!locale) return 'en';
    const normalized = locale.toLowerCase();
    if (EMOJI_MART_LOCALES.has(normalized)) {
        return normalized;
    }

    const baseLocale = normalized.split('-')[0];
    if (EMOJI_MART_LOCALES.has(baseLocale)) {
        return baseLocale;
    }

    return 'en';
}

export default function EmojiGrid({
    onSelect,
    searchQuery,
    selectedIcon,
    showPreview = false,
}: EmojiGridProps) {
    const isDarkMode = useAppSelector(getDarkModeState);
    const { token } = theme.useToken();
    const locale = useLocale();
    const normalizedSelected = selectedIcon?.startsWith('emoji:') ? selectedIcon.replace('emoji:', '') : undefined;
    const emojiLocale = resolveEmojiMartLocale(locale);
    const [searchReady, setSearchReady] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const hasSearchQuery = useMemo(() => searchQuery.trim().length > 0, [searchQuery]);

    useEffect(() => {
        let active = true;

        init({ data }, { caller: 'IconPicker.EmojiGrid' })
            .then(() => {
                if (active) setSearchReady(true);
            })
            .catch(() => {
                if (active) setSearchReady(false);
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;

        if (!hasSearchQuery || !searchReady) {
            setSearchResults([]);
            return () => {
                active = false;
            };
        }

        SearchIndex.search(searchQuery, {
            caller: 'IconPicker.EmojiGrid',
            maxResults: 60,
        })
            .then((results) => {
                if (active) {
                    setSearchResults(Array.isArray(results) ? results : []);
                }
            })
            .catch(() => {
                if (active) {
                    setSearchResults([]);
                }
            });

        return () => {
            active = false;
        };
    }, [hasSearchQuery, searchQuery, searchReady]);

    return (
        <div className="emoji-grid-picker" style={{ minHeight: 300, width: '100%' }}>
            {hasSearchQuery ? (
                <div
                    className="emoji-grid-picker__panel emoji-grid-picker__results"
                    style={{
                        background: token.colorBgContainer,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        padding: 16,
                    }}
                >
                    <div className="icon-grid-picker__label">Search Results</div>
                    {searchResults.length > 0 ? (
                        <div className="emoji-grid-picker__results-grid">
                            {searchResults.map((emoji) => {
                                const native = emoji?.skins?.[0]?.native;
                                if (!native) return null;
                                const isSelected = normalizedSelected === native;

                                return (
                                    <button
                                        key={emoji.id || native}
                                        className="icon-picker-cell-container icon-picker-cell-container--suggested"
                                        onClick={() => onSelect(`emoji:${native}`)}
                                        title={emoji.name}
                                        type="button"
                                    >
                                        <span
                                            className={`icon-picker-cell icon-picker-cell--button ${isSelected ? 'selected' : ''}`}
                                            style={{
                                                background: isSelected ? token.colorPrimaryBg : token.colorBgElevated,
                                                border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                                                color: token.colorText,
                                                fontSize: 28,
                                            }}
                                        >
                                            {native}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div
                            style={{
                                border: `1px dashed ${token.colorBorderSecondary}`,
                                borderRadius: 12,
                                color: token.colorTextSecondary,
                                marginTop: 12,
                                padding: '18px 14px',
                                textAlign: 'center',
                            }}
                        >
                            No emoji found
                        </div>
                    )}
                </div>
            ) : (
                <div
                    className="emoji-grid-picker__panel emoji-grid-picker__browser"
                    style={{
                        background: token.colorBgContainer,
                        border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                >
                    <Picker
                        data={data}
                        categories={SMB_EMOJI_CATEGORIES}
                        locale={emojiLocale}
                        theme={isDarkMode ? 'dark' : 'light'}
                        set="native"
                        navPosition="bottom"
                        previewPosition={showPreview ? 'bottom' : 'none'}
                        searchPosition="none"
                        skinTonePosition="search"
                        emojiButtonSize={52}
                        emojiSize={28}
                        maxFrequentRows={1}
                        perLine={EMOJI_BROWSER_COLUMNS}
                        autoFocus={false}
                        noResultsEmoji={normalizedSelected || 'thinking_face'}
                        onEmojiSelect={(emoji: { native?: string }) => {
                            if (emoji.native) {
                                onSelect(`emoji:${emoji.native}`);
                            }
                        }}
                    />
                </div>
            )}
        </div>
    );
}
