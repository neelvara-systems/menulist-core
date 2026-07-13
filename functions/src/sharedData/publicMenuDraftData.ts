/**
 * Public Menu Draft Extracted Data Contract
 *
 * PRIMARY SOURCE — copy this file byte-for-byte to:
 *   functions/src/sharedData/publicMenuDraftData.ts
 *
 * Provider responses are untrusted. This contract allowlists the exact menu
 * fields that may cross from the extraction worker into a public draft and,
 * later, a persisted owner project. It deliberately omits provider-only,
 * owner-only, file, confidence, and arbitrary extension fields.
 */

export const PUBLIC_MENU_DRAFT_DATA_LIMITS = {
  MAX_ALIASES: 20,
  MAX_ATTRIBUTES_PER_ITEM: 40,
  MAX_CATEGORIES: 100,
  MAX_ITEMS: 500,
  MAX_LANGUAGES: 8,
  MAX_LIST_VALUES: 30,
  MAX_LOCALIZED_LANGUAGES: 12,
} as const;

export interface PublicMenuDraftLanguage {
  code: string;
  name: string;
  isPrimary: boolean;
}

export interface PublicMenuDraftCategory {
  id: string;
  active: boolean;
  name: Record<string, string>;
  extractionIdAliases?: string[];
  icon?: string;
  orderIndex?: number;
}

export interface PublicMenuDraftItemAttribute {
  id: string;
  name: Record<string, string>;
  price: string;
  active: boolean;
  orderIndex?: number;
}

export interface PublicMenuDraftNutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servingSize?: string;
}

export interface PublicMenuDraftItem {
  id: string;
  category: string;
  name: Record<string, string>;
  active: boolean;
  available: boolean;
  extractionIdAliases?: string[];
  attributes?: PublicMenuDraftItemAttribute[];
  description?: Record<string, string>;
  price?: string;
  tags?: string[];
  isBestSeller?: boolean;
  allergens?: string[];
  dietaryTags?: string[];
  spiceLevel?: "none" | "mild" | "medium" | "hot" | "very-hot";
  nutritionInfo?: PublicMenuDraftNutritionInfo;
  skillLevel?: "beginner" | "intermediate" | "advanced" | "all-levels";
  targetAudience?: "for-men" | "for-women" | "unisex" | "kids" | "adults" | "seniors";
  materials?: string;
  warranty?: string;
  duration?: number;
  orderIndex?: number;
}

export interface PublicMenuDraftExtractedData {
  categories: PublicMenuDraftCategory[];
  items: PublicMenuDraftItem[];
  languages: PublicMenuDraftLanguage[];
}

type UnknownRecord = Record<string, unknown>;

const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/;
const LOCALIZED_KEY_PATTERN = /^[a-z0-9_-]{1,16}$/i;
const SPICE_LEVELS = new Set(["none", "mild", "medium", "hot", "very-hot"]);
const SKILL_LEVELS = new Set(["beginner", "intermediate", "advanced", "all-levels"]);
const TARGET_AUDIENCES = new Set(["for-men", "for-women", "unisex", "kids", "adults", "seniors"]);

export function getPublicMenuDraftTimestampMillis(value: unknown): number | null {
  try {
    if (value instanceof Date) {
      const millis = value.getTime();
      return Number.isFinite(millis) ? millis : null;
    }
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const record = toRecord(value);
    if (!record) return null;
    if (typeof record.toMillis === "function") {
      const millis = Number(record.toMillis.call(value));
      return Number.isFinite(millis) ? millis : null;
    }
    if (typeof record.seconds === "number" && Number.isFinite(record.seconds)) {
      const nanos = typeof record.nanoseconds === "number" && Number.isFinite(record.nanoseconds)
        ? record.nanoseconds
        : 0;
      return (record.seconds * 1_000) + Math.floor(nanos / 1_000_000);
    }
    return null;
  } catch {
    return null;
  }
}

function toRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function cleanId(value: unknown): string | null {
  const normalized = cleanText(value, 160);
  return normalized && !normalized.includes("/") && normalized !== "." && normalized !== ".."
    ? normalized
    : null;
}

function normalizeLocalizedText(value: unknown, maxValueLength: number): Record<string, string> | null {
  const source = toRecord(value);
  if (!source) return null;

  const normalized: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(source)) {
    const key = rawKey.trim().toLowerCase();
    if (!LOCALIZED_KEY_PATTERN.test(key) || Object.keys(normalized).length >= PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_LOCALIZED_LANGUAGES) {
      continue;
    }
    const text = cleanText(rawValue, maxValueLength);
    if (text) normalized[key] = text;
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
}

function normalizeStringList(value: unknown, maxValueLength: number, limit: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values: string[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    const normalized = cleanText(raw, maxValueLength);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    values.push(normalized);
    if (values.length >= limit) break;
  }
  return values.length > 0 ? values : undefined;
}

function normalizeOrderIndex(value: unknown): number | undefined {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isInteger(numeric) && numeric >= 0 && numeric <= 100_000
    ? numeric
    : undefined;
}

function normalizeNonNegativeNumber(value: unknown, max: number): number | undefined {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= max
    ? numeric
    : undefined;
}

function normalizeEnum<T extends string>(value: unknown, values: Set<string>): T | undefined {
  const normalized = cleanText(value, 40)?.toLowerCase();
  return normalized && values.has(normalized) ? normalized as T : undefined;
}

function normalizeNutritionInfo(value: unknown): PublicMenuDraftNutritionInfo | undefined {
  const source = toRecord(value);
  if (!source) return undefined;
  const nutrition: PublicMenuDraftNutritionInfo = {};
  const calories = normalizeNonNegativeNumber(source.calories, 100_000);
  const protein = normalizeNonNegativeNumber(source.protein, 100_000);
  const carbs = normalizeNonNegativeNumber(source.carbs, 100_000);
  const fat = normalizeNonNegativeNumber(source.fat, 100_000);
  const servingSize = cleanText(source.servingSize, 120);
  if (calories !== undefined) nutrition.calories = calories;
  if (protein !== undefined) nutrition.protein = protein;
  if (carbs !== undefined) nutrition.carbs = carbs;
  if (fat !== undefined) nutrition.fat = fat;
  if (servingSize) nutrition.servingSize = servingSize;
  return Object.keys(nutrition).length > 0 ? nutrition : undefined;
}

function normalizeCategory(value: unknown): PublicMenuDraftCategory | null {
  const source = toRecord(value);
  if (!source) return null;
  const id = cleanId(source.id);
  const name = normalizeLocalizedText(source.name, 180);
  if (!id || !name) return null;

  const aliases = normalizeStringList(source.extractionIdAliases, 160, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_ALIASES);
  const icon = cleanText(source.icon, 100);
  const orderIndex = normalizeOrderIndex(source.orderIndex);
  return {
    id,
    active: source.active !== false,
    name,
    ...(aliases ? { extractionIdAliases: aliases } : {}),
    ...(icon ? { icon } : {}),
    ...(orderIndex !== undefined ? { orderIndex } : {}),
  };
}

function normalizeAttribute(value: unknown): PublicMenuDraftItemAttribute | null {
  const source = toRecord(value);
  if (!source) return null;
  const id = cleanId(source.id);
  const name = normalizeLocalizedText(source.name, 180);
  if (!id || !name) return null;
  const orderIndex = normalizeOrderIndex(source.orderIndex);
  return {
    id,
    name,
    price: cleanText(source.price, 80) || "",
    active: source.active !== false,
    ...(orderIndex !== undefined ? { orderIndex } : {}),
  };
}

function normalizeItem(value: unknown): PublicMenuDraftItem | null {
  const source = toRecord(value);
  if (!source) return null;
  const id = cleanId(source.id);
  const category = cleanId(source.category ?? source.categoryId);
  const name = normalizeLocalizedText(source.name, 180);
  if (!id || !category || !name) return null;

  const aliases = normalizeStringList(source.extractionIdAliases, 160, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_ALIASES);
  const description = normalizeLocalizedText(source.description, 2_000);
  const price = cleanText(source.price, 80);
  const tags = normalizeStringList(source.tags, 80, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_LIST_VALUES);
  const allergens = normalizeStringList(source.allergens, 80, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_LIST_VALUES);
  const dietaryTags = normalizeStringList(source.dietaryTags, 80, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_LIST_VALUES);
  const spiceLevel = normalizeEnum<PublicMenuDraftItem["spiceLevel"] & string>(source.spiceLevel, SPICE_LEVELS);
  const nutritionInfo = normalizeNutritionInfo(source.nutritionInfo);
  const skillLevel = normalizeEnum<PublicMenuDraftItem["skillLevel"] & string>(source.skillLevel, SKILL_LEVELS);
  const targetAudience = normalizeEnum<PublicMenuDraftItem["targetAudience"] & string>(source.targetAudience, TARGET_AUDIENCES);
  const materials = cleanText(source.materials, 500);
  const warranty = cleanText(source.warranty, 500);
  const duration = normalizeNonNegativeNumber(source.duration, 100_000);
  const orderIndex = normalizeOrderIndex(source.orderIndex);
  const attributes = Array.isArray(source.attributes)
    ? source.attributes
      .slice(0, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_ATTRIBUTES_PER_ITEM)
      .map(normalizeAttribute)
      .filter((attribute): attribute is PublicMenuDraftItemAttribute => attribute !== null)
    : [];

  return {
    id,
    category,
    name,
    active: source.active !== false,
    available: source.available !== false,
    ...(aliases ? { extractionIdAliases: aliases } : {}),
    ...(attributes.length > 0 ? { attributes } : {}),
    ...(description ? { description } : {}),
    ...(price ? { price } : {}),
    ...(tags ? { tags } : {}),
    ...(typeof source.isBestSeller === "boolean" ? { isBestSeller: source.isBestSeller } : {}),
    ...(allergens ? { allergens } : {}),
    ...(dietaryTags ? { dietaryTags } : {}),
    ...(spiceLevel ? { spiceLevel } : {}),
    ...(nutritionInfo ? { nutritionInfo } : {}),
    ...(skillLevel ? { skillLevel } : {}),
    ...(targetAudience ? { targetAudience } : {}),
    ...(materials ? { materials } : {}),
    ...(warranty ? { warranty } : {}),
    ...(duration !== undefined ? { duration } : {}),
    ...(orderIndex !== undefined ? { orderIndex } : {}),
  };
}

function normalizeLanguage(value: unknown): PublicMenuDraftLanguage | null {
  if (typeof value === "string") {
    const code = value.trim().toLowerCase();
    if (!LANGUAGE_CODE_PATTERN.test(code)) return null;
    return { code, name: code === "en" ? "English" : code, isPrimary: false };
  }

  const source = toRecord(value);
  if (!source) return null;
  const code = cleanText(source.code, 16)?.toLowerCase();
  if (!code || !LANGUAGE_CODE_PATTERN.test(code)) return null;
  return {
    code,
    name: cleanText(source.name, 80) || (code === "en" ? "English" : code),
    isPrimary: source.isPrimary === true,
  };
}

function normalizeLanguages(value: unknown): PublicMenuDraftLanguage[] {
  const raw = Array.isArray(value) ? value : [];
  const languages = new Map<string, PublicMenuDraftLanguage>();
  for (const entry of raw) {
    const language = normalizeLanguage(entry);
    if (!language || languages.has(language.code)) continue;
    languages.set(language.code, language);
    if (languages.size >= PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_LANGUAGES) break;
  }
  if (!languages.has("en")) {
    languages.set("en", { code: "en", name: "English", isPrimary: languages.size === 0 });
  }
  const normalized = Array.from(languages.values()).slice(0, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_LANGUAGES);
  if (!normalized.some((language) => language.isPrimary)) normalized[0].isPrimary = true;
  let primarySeen = false;
  return normalized.map((language) => {
    if (!language.isPrimary) return language;
    if (primarySeen) return { ...language, isPrimary: false };
    primarySeen = true;
    return language;
  });
}

/**
 * Normalize a worker result or persisted legacy draft into the only data shape
 * that may be promoted to a public project. Returns null when no coherent menu
 * remains after validation.
 */
export function normalizePublicMenuDraftExtractedData(value: unknown): PublicMenuDraftExtractedData | null {
  const source = toRecord(value);
  if (!source) return null;

  const categoryMap = new Map<string, PublicMenuDraftCategory>();
  const rawCategories = Array.isArray(source.categories) ? source.categories : [];
  for (const rawCategory of rawCategories.slice(0, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_CATEGORIES)) {
    const category = normalizeCategory(rawCategory);
    if (category && !categoryMap.has(category.id)) categoryMap.set(category.id, category);
  }
  if (categoryMap.size === 0) return null;

  const itemMap = new Map<string, PublicMenuDraftItem>();
  const rawItems = Array.isArray(source.items) ? source.items : [];
  for (const rawItem of rawItems.slice(0, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_ITEMS)) {
    const item = normalizeItem(rawItem);
    if (!item || !categoryMap.has(item.category) || itemMap.has(item.id)) continue;
    itemMap.set(item.id, item);
  }
  if (itemMap.size === 0) return null;

  return {
    categories: Array.from(categoryMap.values()),
    items: Array.from(itemMap.values()),
    languages: normalizeLanguages(source.languages),
  };
}
