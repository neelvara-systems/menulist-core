import type { PublicMenuDraftExtractedData } from '@data/shared/publicMenuDraftData';

export type MessagingPublishMenuValidation = {
  activeCategoryCount: number;
  activeItemCount: number;
  pricedItemCount: number;
  valid: boolean;
};

function hasPrice(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Validate the owner-visible graph, including attribute/variant prices. */
export function validateMessagingPublishMenu(
  menu: PublicMenuDraftExtractedData,
): MessagingPublishMenuValidation {
  const activeCategoryIds = new Set(
    menu.categories
      .filter((category) => category.active !== false)
      .map((category) => category.id),
  );
  const activeItems = menu.items.filter(
    (item) => item.active !== false && activeCategoryIds.has(item.category),
  );
  const pricedItemCount = activeItems.filter((item) => (
    hasPrice(item.price)
    || item.attributes?.some(
      (attribute) => attribute.active !== false && hasPrice(attribute.price),
    ) === true
  )).length;

  return {
    activeCategoryCount: activeCategoryIds.size,
    activeItemCount: activeItems.length,
    pricedItemCount,
    valid: activeCategoryIds.size > 0 && activeItems.length > 0 && pricedItemCount > 0,
  };
}
