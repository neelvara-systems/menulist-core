/**
 * Customer-Facing Menu Category (B2C Output)
 * 
 * Mobile-first, performance-optimized
 * NO Ant Design - Minimal styling
 */

import CategoryIcon from '@atoms/CategoryIcon';
import { FEATURE_FLAGS } from '@config/features';
import { MenuMoodConfig, SPACING } from '../designSystem';

interface MenuCategoryOutputProps {
    category: {
        id: string;
        icon?: string;
        name: string;
        description?: string;
    };
    moodConfig: MenuMoodConfig;
    children: React.ReactNode;
}

export default function MenuCategoryOutput({
    category,
    moodConfig,
    children,
}: MenuCategoryOutputProps) {
    const categoryStyle = moodConfig.categoryStyle;
    const spacing = SPACING[moodConfig.spacing];

    return (
        <section className="mb-6 md:mb-8">
            <header
                className="mb-3 md:mb-4"
                style={{
                    padding: categoryStyle.borderWidth ? spacing.item : 0,
                    background: categoryStyle.background,
                    borderRadius: categoryStyle.borderRadius,
                    border: categoryStyle.borderWidth
                        ? `${categoryStyle.borderWidth}px solid ${categoryStyle.borderColor}`
                        : 'none',
                }}
            >
                <div className="flex items-center gap-2">
                    {FEATURE_FLAGS.ENABLE_CATEGORY_ICONS && category.icon ? (
                        <div
                            className="flex items-center justify-center rounded-lg"
                            style={{
                                background: `${moodConfig.accentColor}12`,
                                border: `1px solid ${moodConfig.categoryStyle.borderColor}`,
                                height: 30,
                                width: 30,
                            }}
                        >
                            <CategoryIcon color={moodConfig.headingColor} icon={category.icon} size={17} />
                        </div>
                    ) : null}
                    <h2
                        className="m-0 text-base md:text-lg font-semibold"
                        style={{
                            fontFamily: moodConfig.headingFont,
                            color: moodConfig.headingColor,
                            textTransform: categoryStyle.titleTransform || 'none',
                            letterSpacing: categoryStyle.titleLetterSpacing || '0',
                        }}
                    >
                        {category.name}
                    </h2>
                </div>

                {category.description && (
                    <p
                        className="m-0 mt-1 text-xs md:text-sm opacity-70"
                        style={{
                            fontFamily: moodConfig.bodyFont,
                            color: moodConfig.descriptionColor || moodConfig.bodyColor,
                        }}
                    >
                        {category.description}
                    </p>
                )}

                {categoryStyle.dividerStyle === 'line' && (
                    <div
                        className="mt-3 h-px w-12"
                        style={{
                            background: categoryStyle.dividerColor || moodConfig.accentColor,
                        }}
                    />
                )}
            </header>

            <div
                className="flex flex-col"
                style={{ gap: spacing.itemGap }}
            >
                {children}
            </div>
        </section>
    );
}
