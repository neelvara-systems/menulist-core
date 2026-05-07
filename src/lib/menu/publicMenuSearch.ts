import {
    getDecisionFactArray,
    getDecisionFactNumber,
    getDecisionFactString,
    getDecisionFactValue,
    getNutritionFact,
    ItemDecisionFactKey,
} from '@lib/menu/itemDecisionFacts';
import { resolveBusinessCategory } from '@data/shared/businessTypes';

type LocalizedValue = string | Record<string, unknown> | null | undefined;

export interface PublicMenuSearchDocument {
    text: string;
    tokens: string[];
}

export interface PublicMenuSearchQuery {
    raw: string;
    text: string;
    tokens: string[];
    tokenVariants: string[][];
}

interface PublicMenuBusinessContext {
    businessType?: string;
    businessCategory?: string;
}

interface PublicMenuSearchOptions extends PublicMenuBusinessContext {
    category?: any;
    includePrices?: boolean;
}

interface AttachSearchIndexOptions extends PublicMenuBusinessContext {
    includePrices?: boolean;
}

const SEARCH_FACT_KEYS: ItemDecisionFactKey[] = [
    'allergens',
    'dietaryTags',
    'spiceLevel',
    'duration',
    'skillLevel',
    'targetAudience',
    'materials',
    'warranty',
];

const SEARCH_FACT_LABELS: Record<ItemDecisionFactKey, string[]> = {
    allergens: ['allergens', 'allergy'],
    dietaryTags: ['dietary', 'diet', 'veg', 'vegan'],
    spiceLevel: ['spice', 'spicy'],
    nutritionInfo: ['nutrition'],
    duration: ['duration', 'time'],
    skillLevel: ['skill level', 'level'],
    targetAudience: ['for', 'audience'],
    materials: ['material', 'materials'],
    warranty: ['warranty', 'guarantee'],
};

const MAX_INDEX_TERMS = 96;
const MAX_DOC_TOKENS = 320;
const MAX_QUERY_TOKENS = 12;

const TOKEN_ALIASES: Record<string, string[]> = {
    paneer: ['panir', 'panner', 'paneir', 'paner'],
    panir: ['paneer', 'panner', 'paneir', 'paner'],
    panner: ['paneer', 'panir', 'paneir', 'paner'],
    biryani: ['biriyani', 'biryanee'],
    biriyani: ['biryani', 'biryanee'],
    chai: ['chay', 'chaai', 'tea'],
    masala: ['masaala', 'masla'],
    dosa: ['dosai', 'dose'],
    idli: ['idly', 'idlee'],
    paratha: ['parota', 'parotta', 'parantha'],
    roti: ['chapati', 'chapatti'],
    chapati: ['roti', 'chapatti'],
    sabzi: ['sabji', 'subzi'],
    tikka: ['tika'],
    momo: ['momos'],
    momos: ['momo'],
    chowmein: ['chow mein', 'chowmin'],
    colour: ['color'],
    color: ['colour'],
    haircut: ['hair cut'],
    keratin: ['karatin'],
    mehndi: ['mehendi', 'henna'],
    mehendi: ['mehndi', 'henna'],
    jewellery: ['jewelry'],
    jewelry: ['jewellery'],
};

const CATEGORY_TOKEN_ALIASES: Record<string, Record<string, string[]>> = {
    food: {
        coffee: ['cofee', 'kofi'],
        pizza: ['piza', 'pitsa'],
        burger: ['burgur'],
        sandwich: ['sandwitch'],
        noodles: ['noodle'],
        fries: ['frys'],
        cake: ['pastry'],
        pastry: ['cake'],
        catering: ['cater'],
    },
    service: {
        appointment: ['booking', 'slot'],
        booking: ['appointment', 'slot'],
        consultation: ['consult', 'session'],
        colour: ['color'],
        color: ['colour'],
        treatment: ['service', 'therapy'],
        massage: ['therapy'],
        manicure: ['nails'],
        pedicure: ['nails'],
        haircut: ['hair cut'],
    },
    health: {
        appointment: ['booking', 'slot'],
        booking: ['appointment', 'slot'],
        consultation: ['consult', 'session'],
        therapy: ['treatment'],
        treatment: ['therapy', 'session'],
        class: ['session'],
        session: ['class'],
    },
    professional: {
        consultation: ['consult', 'session'],
        service: ['consultation'],
        package: ['plan'],
        plan: ['package'],
        appointment: ['booking'],
    },
    creative: {
        offering: ['service'],
        service: ['offering'],
        session: ['shoot', 'class'],
        shoot: ['session'],
        workshop: ['class'],
        class: ['workshop'],
        material: ['materials'],
        materials: ['material'],
    },
    retail: {
        product: ['item', 'goods'],
        item: ['product'],
        goods: ['product'],
        material: ['materials', 'fabric'],
        materials: ['material', 'fabric'],
        warranty: ['guarantee'],
        guarantee: ['warranty'],
        colour: ['color'],
        color: ['colour'],
        shoes: ['shoe'],
        shoe: ['shoes'],
        books: ['book'],
        book: ['books'],
    },
    specialty: {
        service: ['offering'],
        offering: ['service'],
        appointment: ['booking'],
        booking: ['appointment'],
        rental: ['hire'],
        hire: ['rental'],
        repair: ['service'],
    },
};

const INDIC_WORD_ALIASES: Record<string, string> = {
    'पनीर': 'paneer panir panner',
    'टिक्का': 'tikka tika',
    'चाय': 'chai chay tea',
    'मसाला': 'masala masaala',
    'डोसा': 'dosa dosai',
    'इडली': 'idli idly',
    'पराठा': 'paratha parotta',
    'रोटी': 'roti chapati',
    'सब्जी': 'sabzi sabji subzi',
    'सब्ज़ी': 'sabzi sabji subzi',
    'મેંદી': 'mehndi mehendi henna',
    'મેહંદી': 'mehndi mehendi henna',
    'પનીર': 'paneer panir panner',
    'ચા': 'chai chay tea',
    'મસાલા': 'masala masaala',
    'ઢોસા': 'dosa dosai',
    'ઇડલી': 'idli idly',
    'રોટલી': 'roti chapati',
    'શાક': 'sabzi sabji subzi',
};

const INDIC_LATIN_MAP: Record<string, string> = {
    अ: 'a',
    आ: 'aa',
    इ: 'i',
    ई: 'ee',
    उ: 'u',
    ऊ: 'oo',
    ए: 'e',
    ऐ: 'ai',
    ओ: 'o',
    औ: 'au',
    ऋ: 'ri',
    क: 'ka',
    ख: 'kha',
    ग: 'ga',
    घ: 'gha',
    च: 'cha',
    छ: 'chha',
    ज: 'ja',
    झ: 'jha',
    ट: 'ta',
    ठ: 'tha',
    ड: 'da',
    ढ: 'dha',
    ण: 'na',
    त: 'ta',
    थ: 'tha',
    द: 'da',
    ध: 'dha',
    न: 'na',
    प: 'pa',
    फ: 'pha',
    ब: 'ba',
    भ: 'bha',
    म: 'ma',
    य: 'ya',
    र: 'ra',
    ल: 'la',
    व: 'va',
    श: 'sha',
    ष: 'sha',
    स: 'sa',
    ह: 'ha',
    ळ: 'la',
    ક્ષ: 'ksha',
    અ: 'a',
    આ: 'aa',
    ઇ: 'i',
    ઈ: 'ee',
    ઉ: 'u',
    ઊ: 'oo',
    એ: 'e',
    ઐ: 'ai',
    ઓ: 'o',
    ઔ: 'au',
    ક: 'ka',
    ખ: 'kha',
    ગ: 'ga',
    ઘ: 'gha',
    ચ: 'cha',
    છ: 'chha',
    જ: 'ja',
    ઝ: 'jha',
    ટ: 'ta',
    ઠ: 'tha',
    ડ: 'da',
    ઢ: 'dha',
    ણ: 'na',
    ત: 'ta',
    થ: 'tha',
    દ: 'da',
    ધ: 'dha',
    ન: 'na',
    પ: 'pa',
    ફ: 'pha',
    બ: 'ba',
    ભ: 'bha',
    મ: 'ma',
    ય: 'ya',
    ર: 'ra',
    લ: 'la',
    વ: 'va',
    શ: 'sha',
    ષ: 'sha',
    સ: 'sa',
    હ: 'ha',
    ળ: 'la',
    'ा': 'aa',
    'ि': 'i',
    'ी': 'ee',
    'ु': 'u',
    'ू': 'oo',
    'े': 'e',
    'ै': 'ai',
    'ो': 'o',
    'ौ': 'au',
    'ृ': 'ri',
    'ं': 'n',
    'ँ': 'n',
    '़': '',
    '्': '',
    'ા': 'aa',
    'િ': 'i',
    'ી': 'ee',
    'ુ': 'u',
    'ૂ': 'oo',
    'ે': 'e',
    'ૈ': 'ai',
    'ો': 'o',
    'ૌ': 'au',
    'ૃ': 'ri',
    'ં': 'n',
    'ઁ': 'n',
    '્': '',
};

const getResolvedBusinessCategory = (context?: PublicMenuBusinessContext): string | undefined =>
    resolveBusinessCategory(context?.businessType, context?.businessCategory);

const escapeRegExp = (value: string): string =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const applyIndicWordAliases = (input: string): string => {
    let result = input;
    for (const [word, aliases] of Object.entries(INDIC_WORD_ALIASES)) {
        result = result.replace(new RegExp(escapeRegExp(word), 'g'), ` ${aliases} `);
    }
    return result;
};

const collectLocalizedValues = (value: LocalizedValue): string[] => {
    if (!value) return [];
    if (typeof value === 'string') return [value];
    if (typeof value !== 'object') return [];
    return Object.values(value)
        .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
};

const collectUnknownText = (value: unknown): string[] => {
    if (value === undefined || value === null || value === '') return [];
    if (typeof value === 'string' || typeof value === 'number') return [String(value)];
    if (Array.isArray(value)) return value.flatMap(collectUnknownText);
    if (typeof value === 'object') return Object.values(value as Record<string, unknown>).flatMap(collectUnknownText);
    return [];
};

const transliterateIndicToLatin = (input: string): string =>
    Array.from(applyIndicWordAliases(input)).map((char) => INDIC_LATIN_MAP[char] ?? char).join('');

export const normalizePublicMenuSearchText = (input: unknown): string => {
    if (input === undefined || input === null) return '';

    return String(input)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[’'`´‘“”"()[\]{}.,;:!?/\\|+*=<>@#$%^&_~]+/g, ' ')
        .replace(/[-–—]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const phoneticFold = (value: string): string =>
    normalizePublicMenuSearchText(value)
        .replace(/chh/g, 'ch')
        .replace(/ph/g, 'f')
        .replace(/kh/g, 'k')
        .replace(/gh/g, 'g')
        .replace(/th/g, 't')
        .replace(/dh/g, 'd')
        .replace(/aa/g, 'a')
        .replace(/ee|ii/g, 'i')
        .replace(/oo|uu/g, 'u')
        .replace(/w/g, 'v')
        .replace(/q/g, 'k')
        .replace(/z/g, 'j')
        .replace(/([a-z])\1+/g, '$1');

const skeleton = (token: string): string =>
    token.length >= 5 ? token.replace(/[aeiou]/g, '') : token;

const hasLatinVowel = (token: string): boolean => /[aeiou]/.test(token);

const tokenize = (value: string): string[] =>
    normalizePublicMenuSearchText(value)
        .split(' ')
        .map((token) => token.trim())
        .filter(Boolean);

const addTokenVariants = (tokens: Set<string>, token: string, businessCategory?: string) => {
    const normalized = normalizePublicMenuSearchText(token);
    if (!normalized) return;

    tokens.add(normalized);

    const folded = phoneticFold(normalized);
    if (folded) tokens.add(folded);

    const compact = skeleton(folded || normalized);
    if (compact && compact !== normalized) tokens.add(compact);

    const aliases = [
        ...(TOKEN_ALIASES[normalized] || []),
        ...(businessCategory ? CATEGORY_TOKEN_ALIASES[businessCategory]?.[normalized] || [] : []),
    ];

    for (const alias of aliases) {
        for (const aliasToken of tokenize(alias)) {
            tokens.add(aliasToken);
            const aliasFolded = phoneticFold(aliasToken);
            if (aliasFolded) tokens.add(aliasFolded);
            const aliasSkeleton = skeleton(aliasFolded || aliasToken);
            if (aliasSkeleton) tokens.add(aliasSkeleton);
        }
    }
};

const buildVariantsFromText = (value: string): string[] => {
    const variants = new Set<string>();
    const normalized = normalizePublicMenuSearchText(value);
    if (normalized) variants.add(normalized);

    const indicAliasText = normalizePublicMenuSearchText(applyIndicWordAliases(value));
    if (indicAliasText) variants.add(indicAliasText);

    const transliterated = normalizePublicMenuSearchText(transliterateIndicToLatin(value));
    if (transliterated) variants.add(transliterated);

    const folded = phoneticFold(transliterated || normalized);
    if (folded) variants.add(folded);

    return Array.from(variants);
};

const extractPublicSearchFields = (
    item: any,
    options: PublicMenuSearchOptions = {},
): string[] => {
    const fields: string[] = [
        ...collectLocalizedValues(item?.name),
        ...collectLocalizedValues(item?.description),
        ...collectLocalizedValues(options.category?.name),
        ...collectUnknownText(item?.tags),
        ...collectUnknownText(item?._publicSearch?.terms),
    ];

    for (const attribute of item?.attributes || []) {
        if (attribute?.active === false) continue;
        fields.push(...collectLocalizedValues(attribute?.name));
        if (options.includePrices) fields.push(...collectUnknownText(attribute?.price));
    }

    for (const key of SEARCH_FACT_KEYS) {
        const arrayValue = getDecisionFactArray(item, key);
        const stringValue = getDecisionFactString(item, key);
        const numberValue = getDecisionFactNumber(item, key);
        const rawValue = getDecisionFactValue(item, key);

        fields.push(...arrayValue);
        if (stringValue) fields.push(stringValue);
        if (numberValue !== undefined) fields.push(String(numberValue));
        if (arrayValue.length || stringValue || numberValue !== undefined || rawValue !== undefined) {
            fields.push(...SEARCH_FACT_LABELS[key]);
        }
        if (!arrayValue.length && !stringValue && numberValue === undefined) {
            fields.push(...collectUnknownText(rawValue));
        }
    }

    const nutrition = getNutritionFact(item);
    if (nutrition) {
        fields.push('nutrition');
        fields.push(...collectUnknownText(nutrition));
    }

    if (options.includePrices) {
        fields.push(...collectUnknownText(item?.price));
    }

    return fields.filter((field) => field.trim().length > 0);
};

export function buildPublicMenuSearchDocument(
    item: any,
    options: PublicMenuSearchOptions = {},
): PublicMenuSearchDocument {
    const fields = extractPublicSearchFields(item, options);
    const businessCategory = getResolvedBusinessCategory(options);
    const textVariants = new Set<string>();
    const tokenVariants = new Set<string>();

    for (const field of fields) {
        for (const textVariant of buildVariantsFromText(field)) {
            textVariants.add(textVariant);
            for (const token of tokenize(textVariant)) {
                addTokenVariants(tokenVariants, token, businessCategory);
            }
        }
    }

    return {
        text: Array.from(textVariants).join(' '),
        tokens: Array.from(tokenVariants).slice(0, MAX_DOC_TOKENS),
    };
}

export function buildPublicMenuSearchQuery(
    raw: string,
    options: PublicMenuBusinessContext = {},
): PublicMenuSearchQuery {
    const textVariants = buildVariantsFromText(raw);
    const text = textVariants.join(' ');
    const tokens = tokenize(text).slice(0, MAX_QUERY_TOKENS);
    const businessCategory = getResolvedBusinessCategory(options);
    const tokenVariants = tokens.map((token) => {
        const variants = new Set<string>();
        addTokenVariants(variants, token, businessCategory);
        return Array.from(variants);
    });

    return {
        raw,
        text,
        tokens,
        tokenVariants,
    };
}

const getLevenshteinThreshold = (token: string): number => {
    if (token.length >= 7) return 2;
    if (token.length >= 4) return 1;
    return 0;
};

const levenshtein = (left: string, right: string): number => {
    if (left === right) return 0;
    if (!left) return right.length;
    if (!right) return left.length;

    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    const current = Array(right.length + 1).fill(0);

    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
        current[0] = leftIndex;
        for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
            const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
            current[rightIndex] = Math.min(
                previous[rightIndex] + 1,
                current[rightIndex - 1] + 1,
                previous[rightIndex - 1] + cost,
            );
        }
        for (let index = 0; index <= right.length; index += 1) {
            previous[index] = current[index];
        }
    }

    return previous[right.length];
};

const tokenMatches = (queryVariants: string[], documentTokens: string[], documentTokenSet: Set<string>): boolean => {
    for (const queryToken of queryVariants) {
        if (documentTokenSet.has(queryToken)) return true;

        if (queryToken.length >= 3 && documentTokens.some((docToken) => docToken.includes(queryToken))) {
            return true;
        }

        const threshold = getLevenshteinThreshold(queryToken);
        if (threshold > 0) {
            const match = documentTokens.some((docToken) => {
                if (Math.abs(docToken.length - queryToken.length) > threshold) return false;
                if (hasLatinVowel(queryToken) && !hasLatinVowel(docToken)) return false;
                return levenshtein(queryToken, docToken) <= threshold;
            });
            if (match) return true;
        }
    }

    return false;
};

export function matchesPublicMenuSearchDocument(
    document: PublicMenuSearchDocument,
    query: PublicMenuSearchQuery,
): boolean {
    if (!query.tokens.length) return true;
    if (!document.tokens.length && !document.text) return false;

    if (query.text.length >= 3 && document.text.includes(query.text)) return true;

    const documentTokenSet = new Set(document.tokens);
    return query.tokenVariants.every((queryVariants) =>
        tokenMatches(queryVariants, document.tokens, documentTokenSet),
    );
}

export function attachPublicMenuSearchIndex(
    projectData: any,
    options: AttachSearchIndexOptions = {},
): any {
    if (!projectData?.files?.length) return projectData;

    const nextProjectData = JSON.parse(JSON.stringify(projectData));
    const categoriesById = new Map<string, any>();

    for (const file of nextProjectData.files || []) {
        for (const category of file?.extractedData?.data?.categories || []) {
            if (category?.id && !categoriesById.has(category.id)) {
                categoriesById.set(category.id, category);
            }
        }
    }

    for (const file of nextProjectData.files || []) {
        const items = file?.extractedData?.data?.items || [];
        for (const item of items) {
            const category = item?.category ? categoriesById.get(item.category) : undefined;
            const document = buildPublicMenuSearchDocument(item, {
                category,
                includePrices: options.includePrices,
                businessType: options.businessType,
                businessCategory: options.businessCategory,
            });
            item._publicSearch = {
                terms: document.tokens.slice(0, MAX_INDEX_TERMS),
            };
        }
    }

    return nextProjectData;
}
