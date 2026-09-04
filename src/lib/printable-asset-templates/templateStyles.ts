import {
    hexToRgb,
    mixHex,
    normalizeMenuKitBrandColor,
    resolveMenuKitBrandTokens,
    type MenuKitBrandTokens,
} from '@lib/menu-kit/brandTokens';
import { normalizePrintableTemplateFamilyId } from './templateFamilies';
import type { PrintableTemplateFamilyId } from './types';

function withRgb(token: Omit<MenuKitBrandTokens, `${string}Rgb`>): MenuKitBrandTokens {
    return {
        ...token,
        accentRgb: hexToRgb(token.accent),
        accentTextRgb: hexToRgb(token.accentText),
        borderRgb: hexToRgb(token.border),
        gradientFromRgb: hexToRgb(token.gradientFrom),
        gradientToRgb: hexToRgb(token.gradientTo),
        mutedRgb: hexToRgb(token.muted),
        paperRgb: hexToRgb(token.paper),
        softAccentRgb: hexToRgb(token.softAccent),
        surfaceRgb: hexToRgb(token.surface),
        textRgb: hexToRgb(token.text),
    };
}

const CATEGORY_THEME_TOKENS: Partial<
    Record<PrintableTemplateFamilyId, Omit<MenuKitBrandTokens, `${string}Rgb`>>
> = {
    'ember-house': {
        accent: '#8d3523',
        accentText: '#fff8eb',
        border: '#a78147',
        gradientFrom: '#b95532',
        gradientTo: '#262220',
        muted: '#6b5b4f',
        paper: '#f3e8d2',
        qrDark: '#262220',
        qrLight: '#fffdf7',
        softAccent: '#ead7bd',
        surface: '#fbf4e8',
        text: '#262220',
    },
    'coastal-table': {
        accent: '#153f4a',
        accentText: '#fffdf7',
        border: '#c7a66c',
        gradientFrom: '#8cb8ae',
        gradientTo: '#153f4a',
        muted: '#607077',
        paper: '#f7f2e8',
        qrDark: '#153f4a',
        qrLight: '#ffffff',
        softAccent: '#e1ece8',
        surface: '#fdfaf3',
        text: '#25343a',
    },
    'sunday-table': {
        accent: '#a7382d',
        accentText: '#fffaf0',
        border: '#c49a4b',
        gradientFrom: '#315c7a',
        gradientTo: '#456047',
        muted: '#686158',
        paper: '#f5e8d3',
        qrDark: '#2e2b27',
        qrLight: '#ffffff',
        softAccent: '#e8dfc8',
        surface: '#fcf4e4',
        text: '#2e2b27',
    },
    'counter-rush': {
        accent: '#2256a3',
        accentText: '#ffffff',
        border: '#d84c32',
        gradientFrom: '#d84c32',
        gradientTo: '#2256a3',
        muted: '#5f5b52',
        paper: '#f5e8cd',
        qrDark: '#25231f',
        qrLight: '#ffffff',
        softAccent: '#eee0bd',
        surface: '#fcf3dc',
        text: '#25231f',
    },
    'neighbourhood-standard': {
        accent: '#29483d',
        accentText: '#fffaf0',
        border: '#b58a45',
        gradientFrom: '#547269',
        gradientTo: '#29483d',
        muted: '#5f655f',
        paper: '#f5ead5',
        qrDark: '#23352f',
        qrLight: '#fffdf8',
        softAccent: '#e8dfca',
        surface: '#fbf4e6',
        text: '#292722',
    },
    'field-notes': {
        accent: '#415747',
        accentText: '#fffdf7',
        border: '#b56b3f',
        gradientFrom: '#547282',
        gradientTo: '#415747',
        muted: '#60665e',
        paper: '#f1e7d2',
        qrDark: '#293b34',
        qrLight: '#ffffff',
        softAccent: '#e4e4d6',
        surface: '#faf4e6',
        text: '#2d332e',
    },
    'boutique-window': {
        accent: '#742d3b',
        accentText: '#fffaf2',
        border: '#c19a58',
        gradientFrom: '#2f4f43',
        gradientTo: '#742d3b',
        muted: '#69625d',
        paper: '#f7f1e7',
        qrDark: '#2b2724',
        qrLight: '#ffffff',
        softAccent: '#eee3df',
        surface: '#fffaf2',
        text: '#2b2724',
    },
    'market-label': {
        accent: '#315846',
        accentText: '#fffaf0',
        border: '#c28c3c',
        gradientFrom: '#a64f55',
        gradientTo: '#315846',
        muted: '#655e54',
        paper: '#f3e7ce',
        qrDark: '#29362f',
        qrLight: '#ffffff',
        softAccent: '#eadfc8',
        surface: '#fbf3df',
        text: '#2b2b26',
    },
    'civic-letterpress': {
        accent: '#243a5a',
        accentText: '#fffaf0',
        border: '#b38c4c',
        gradientFrom: '#7a2935',
        gradientTo: '#243a5a',
        muted: '#646260',
        paper: '#f3ead7',
        qrDark: '#202c40',
        qrLight: '#ffffff',
        softAccent: '#e8e1d4',
        surface: '#fbf5e8',
        text: '#282725',
    },
    'modern-practice': {
        accent: '#165b62',
        accentText: '#ffffff',
        border: '#a67d45',
        gradientFrom: '#244a66',
        gradientTo: '#165b62',
        muted: '#5d6870',
        paper: '#f5f4ef',
        qrDark: '#1a3445',
        qrLight: '#ffffff',
        softAccent: '#e3edeb',
        surface: '#fffefa',
        text: '#26343b',
    },
    'studio-contact-sheet': {
        accent: '#1f55a5',
        accentText: '#ffffff',
        border: '#d45b42',
        gradientFrom: '#e1b629',
        gradientTo: '#1f55a5',
        muted: '#575a60',
        paper: '#f5f1e7',
        qrDark: '#20252a',
        qrLight: '#ffffff',
        softAccent: '#e7ecf4',
        surface: '#fffdf7',
        text: '#20252a',
    },
    'maker-ledger': {
        accent: '#5a3448',
        accentText: '#fffaf3',
        border: '#aa824c',
        gradientFrom: '#47634e',
        gradientTo: '#5a3448',
        muted: '#665e57',
        paper: '#f2e7d4',
        qrDark: '#302a2d',
        qrLight: '#ffffff',
        softAccent: '#e8dfd3',
        surface: '#faf3e6',
        text: '#302a2d',
    },
    'clinical-calm': {
        accent: '#17606a',
        accentText: '#ffffff',
        border: '#809d9a',
        gradientFrom: '#294a68',
        gradientTo: '#17606a',
        muted: '#596970',
        paper: '#f5f2e9',
        qrDark: '#153b45',
        qrLight: '#ffffff',
        softAccent: '#e1ece9',
        surface: '#fffdf8',
        text: '#20343b',
    },
    'mindful-motion': {
        accent: '#395b6d',
        accentText: '#ffffff',
        border: '#b5795f',
        gradientFrom: '#7d738a',
        gradientTo: '#395b6d',
        muted: '#687075',
        paper: '#f5eee3',
        qrDark: '#2b4550',
        qrLight: '#ffffff',
        softAccent: '#e6e8e1',
        surface: '#fcf7ee',
        text: '#2a373d',
    },
    'hospitality-house': {
        accent: '#314d42',
        accentText: '#fffaf1',
        border: '#b68d41',
        gradientFrom: '#b45f3e',
        gradientTo: '#314d42',
        muted: '#65655f',
        paper: '#f4ead9',
        qrDark: '#293a34',
        qrLight: '#ffffff',
        softAccent: '#e8dfd1',
        surface: '#fbf4e7',
        text: '#29302d',
    },
    'future-workshop': {
        accent: '#0f4e80',
        accentText: '#ffffff',
        border: '#f06a3a',
        gradientFrom: '#178fd0',
        gradientTo: '#0f3155',
        muted: '#586872',
        paper: '#f5f2eb',
        qrDark: '#123a5b',
        qrLight: '#ffffff',
        softAccent: '#e1ebf2',
        surface: '#fffdf8',
        text: '#1b2f3f',
    },
};

export function resolvePrintableTemplateBrandTokens(
    brandColor?: string | null,
    templateFamilyId?: string | null,
): MenuKitBrandTokens {
    const familyId = normalizePrintableTemplateFamilyId(templateFamilyId);
    const base = resolveMenuKitBrandTokens(brandColor);
    const brandAccent = normalizeMenuKitBrandColor(brandColor, base.accent);
    const categoryThemeTokens = CATEGORY_THEME_TOKENS[familyId];
    if (categoryThemeTokens) return withRgb(categoryThemeTokens);

    if (familyId === 'executive-dark') {
        const gold = '#c79a35';
        return withRgb({
            accent: gold,
            accentText: '#111111',
            border: '#8c6d28',
            gradientFrom: '#20242a',
            gradientTo: '#080a0d',
            muted: '#c7c2b8',
            paper: '#11161c',
            qrDark: '#111827',
            qrLight: '#ffffff',
            softAccent: '#2b2518',
            surface: '#151b22',
            text: '#ffffff',
        });
    }

    if (familyId === 'botanical-heritage') {
        const green = mixHex(brandAccent, '#0f3d2e', 0.38);
        const gold = '#b9903a';
        return withRgb({
            ...base,
            accent: green,
            accentText: '#ffffff',
            border: mixHex(gold, '#d5c49c', 0.45),
            gradientFrom: green,
            gradientTo: '#092219',
            muted: '#5d6b62',
            paper: '#f8f5ea',
            qrDark: '#111827',
            qrLight: '#ffffff',
            softAccent: '#edf6ef',
            surface: '#fffdf5',
            text: '#17251d',
        });
    }

    if (familyId === 'craft-kitchen') {
        return withRgb({
            ...base,
            accent: '#b21f2d',
            accentText: '#fffaf0',
            border: '#c29b64',
            gradientFrom: '#b21f2d',
            gradientTo: '#761824',
            muted: '#5f5a55',
            paper: '#efd6bd',
            qrDark: '#181411',
            qrLight: '#fffdf7',
            softAccent: '#e8c9ae',
            surface: '#f7e5d2',
            text: '#575552',
        });
    }

    if (familyId === 'roastery-ledger') {
        return withRgb({
            ...base,
            accent: '#4a2f23',
            accentText: '#fff8ec',
            border: '#b46a3c',
            gradientFrom: '#3e6273',
            gradientTo: '#4a2f23',
            muted: '#6f6259',
            paper: '#f4ebdd',
            qrDark: '#2c211c',
            qrLight: '#fffdf8',
            softAccent: '#e6ddd0',
            surface: '#fbf7ef',
            text: '#2c211c',
        });
    }

    if (familyId === 'patisserie-conservatory') {
        return withRgb({
            ...base,
            accent: '#7a3f50',
            accentText: '#fffaf1',
            border: '#b69a60',
            gradientFrom: '#9fae82',
            gradientTo: '#7a3f50',
            muted: '#70645f',
            paper: '#f5efe3',
            qrDark: '#332b28',
            qrLight: '#fffdf8',
            softAccent: '#e7ebdd',
            surface: '#fff9f0',
            text: '#332b28',
        });
    }

    if (familyId === 'gelateria-riviera') {
        return withRgb({
            ...base,
            accent: '#2f5d86',
            accentText: '#fffaf1',
            border: '#c69a52',
            gradientFrom: '#c95f75',
            gradientTo: '#2f5d86',
            muted: '#6d625c',
            paper: '#f7f0de',
            qrDark: '#322920',
            qrLight: '#fffdf8',
            softAccent: '#e8f0e1',
            surface: '#fff9ee',
            text: '#322920',
        });
    }

    if (familyId === 'salon-atelier') {
        return withRgb({
            ...base,
            accent: '#55372f',
            accentText: '#fffaf4',
            border: '#ad8650',
            gradientFrom: '#c99c96',
            gradientTo: '#55372f',
            muted: '#70615b',
            paper: '#f7f0e6',
            qrDark: '#2b211e',
            qrLight: '#ffffff',
            softAccent: '#f0ddda',
            surface: '#fffaf4',
            text: '#2b211e',
        });
    }

    if (familyId === 'petal-studio') {
        return withRgb({
            ...base,
            accent: '#a85f70',
            accentText: '#fffdf8',
            border: '#b89a63',
            gradientFrom: '#d9a4ad',
            gradientTo: '#8ea08e',
            muted: '#756866',
            paper: '#f8f1e8',
            qrDark: '#332a2a',
            qrLight: '#ffffff',
            softAccent: '#f2dddf',
            surface: '#fffaf5',
            text: '#332a2a',
        });
    }

    if (familyId === 'pearl-veil') {
        return withRgb({
            ...base,
            accent: '#6f7397',
            accentText: '#ffffff',
            border: '#bea57d',
            gradientFrom: '#c8d5e7',
            gradientTo: '#bcaecf',
            muted: '#6f6d78',
            paper: '#fbf8f3',
            qrDark: '#30313c',
            qrLight: '#ffffff',
            softAccent: '#eceaf4',
            surface: '#fffdfb',
            text: '#30313c',
        });
    }

    if (familyId === 'terracotta-glow') {
        return withRgb({
            ...base,
            accent: '#a9533e',
            accentText: '#fffdf8',
            border: '#c88a68',
            gradientFrom: '#d9a17e',
            gradientTo: '#7b8b6c',
            muted: '#75675e',
            paper: '#f7efe2',
            qrDark: '#342b26',
            qrLight: '#ffffff',
            softAccent: '#efd8c9',
            surface: '#fff9ef',
            text: '#342b26',
        });
    }

    if (familyId === 'glasshouse-beauty') {
        return withRgb({
            ...base,
            accent: '#52766c',
            accentText: '#ffffff',
            border: '#b3a176',
            gradientFrom: '#a9c3b5',
            gradientTo: '#e0b6a3',
            muted: '#66726e',
            paper: '#faf8f2',
            qrDark: '#253531',
            qrLight: '#ffffff',
            softAccent: '#e3eee8',
            surface: '#fffdf8',
            text: '#253531',
        });
    }

    if (familyId === 'ritual-sanctuary') {
        return withRgb({
            ...base,
            accent: '#40574a',
            accentText: '#fffdf7',
            border: '#9a8158',
            gradientFrom: '#87998a',
            gradientTo: '#40574a',
            muted: '#657068',
            paper: '#f3ede2',
            qrDark: '#29372f',
            qrLight: '#ffffff',
            softAccent: '#e2e8df',
            surface: '#fbf8f1',
            text: '#29372f',
        });
    }

    if (familyId === 'eucalyptus-retreat') {
        return withRgb({
            ...base,
            accent: '#58766b',
            accentText: '#ffffff',
            border: '#b49a68',
            gradientFrom: '#9eb5aa',
            gradientTo: '#b9cbd0',
            muted: '#66736e',
            paper: '#f7f2e9',
            qrDark: '#283a34',
            qrLight: '#ffffff',
            softAccent: '#e2ece7',
            surface: '#fdfaf4',
            text: '#283a34',
        });
    }

    if (familyId === 'mineral-spring') {
        return withRgb({
            ...base,
            accent: '#397e82',
            accentText: '#ffffff',
            border: '#a8a58e',
            gradientFrom: '#93c8c6',
            gradientTo: '#b5c9c4',
            muted: '#647476',
            paper: '#faf8f2',
            qrDark: '#25383a',
            qrLight: '#ffffff',
            softAccent: '#e2f0ef',
            surface: '#fffdf8',
            text: '#25383a',
        });
    }

    if (familyId === 'lotus-stillness') {
        return withRgb({
            ...base,
            accent: '#a85f62',
            accentText: '#fffdf8',
            border: '#bd9b55',
            gradientFrom: '#dca39a',
            gradientTo: '#8f9c77',
            muted: '#72685e',
            paper: '#f8efdc',
            qrDark: '#382d29',
            qrLight: '#ffffff',
            softAccent: '#f2ddd5',
            surface: '#fff9ed',
            text: '#382d29',
        });
    }

    if (familyId === 'sunlit-ritual') {
        return withRgb({
            ...base,
            accent: '#ad633d',
            accentText: '#fffdf8',
            border: '#c59a45',
            gradientFrom: '#d6a13d',
            gradientTo: '#8d9565',
            muted: '#74685a',
            paper: '#f8efdd',
            qrDark: '#382e24',
            qrLight: '#ffffff',
            softAccent: '#f1dfbc',
            surface: '#fff9ec',
            text: '#382e24',
        });
    }

    if (familyId === 'performance-circuit') {
        return withRgb({
            ...base,
            accent: '#1256a3',
            accentText: '#ffffff',
            border: '#70777d',
            gradientFrom: '#eb6b55',
            gradientTo: '#1256a3',
            muted: '#58636b',
            paper: '#faf8f3',
            qrDark: '#172331',
            qrLight: '#ffffff',
            softAccent: '#e5edf7',
            surface: '#fffdf9',
            text: '#172331',
        });
    }

    if (familyId === 'ink-vine') {
        return withRgb({
            ...base,
            accent: '#171717',
            accentText: '#ffffff',
            border: '#292824',
            gradientFrom: '#33312c',
            gradientTo: '#111111',
            muted: '#5b5750',
            paper: '#fcfbf6',
            qrDark: '#111111',
            qrLight: '#ffffff',
            softAccent: '#f0eee6',
            surface: '#fffefa',
            text: '#1d1c19',
        });
    }

    if (familyId === 'midnight-gold') {
        return withRgb({
            ...base,
            accent: '#f0d778',
            accentText: '#0b0907',
            border: '#d8b65c',
            gradientFrom: '#21130e',
            gradientTo: '#090806',
            muted: '#d6c7a7',
            paper: '#090806',
            qrDark: '#111111',
            qrLight: '#ffffff',
            softAccent: '#2d2114',
            surface: '#17110d',
            text: '#fff7d8',
        });
    }

    if (familyId === 'sunset-atelier') {
        return withRgb({
            ...base,
            accent: '#ffd0a3',
            accentText: '#063f41',
            border: '#f4b37d',
            gradientFrom: '#f1a36f',
            gradientTo: '#064b4d',
            muted: '#e8e0cf',
            paper: '#0d5554',
            qrDark: '#102b2b',
            qrLight: '#ffffff',
            softAccent: '#3f7772',
            surface: '#155b59',
            text: '#fffaf2',
        });
    }

    if (familyId === 'rosewater-editorial') {
        return withRgb({
            ...base,
            accent: '#5a3348',
            accentText: '#fffaf7',
            border: '#b5935f',
            gradientFrom: '#c98991',
            gradientTo: '#5a3348',
            muted: '#6f6267',
            paper: '#f7f1ec',
            qrDark: '#292529',
            qrLight: '#ffffff',
            softAccent: '#f1ddde',
            surface: '#fffaf7',
            text: '#292529',
        });
    }

    if (familyId === 'mineral-sanctuary') {
        return withRgb({
            ...base,
            accent: '#34433d',
            accentText: '#fffdf7',
            border: '#a69173',
            gradientFrom: '#9eb8b1',
            gradientTo: '#60746b',
            muted: '#66716b',
            paper: '#f1ece2',
            qrDark: '#26312d',
            qrLight: '#ffffff',
            softAccent: '#e2e9e4',
            surface: '#fbf8f1',
            text: '#29332f',
        });
    }

    if (familyId === 'noir-studio') {
        return withRgb({
            ...base,
            accent: '#d39a7e',
            accentText: '#15171a',
            border: '#b87a5d',
            gradientFrom: '#251821',
            gradientTo: '#101215',
            muted: '#c7bdba',
            paper: '#15171a',
            qrDark: '#15171a',
            qrLight: '#ffffff',
            softAccent: '#30252b',
            surface: '#1d1d21',
            text: '#eee8e1',
        });
    }

    if (familyId === 'bombay-chronicle') {
        return withRgb({
            ...base,
            accent: '#7b2635',
            accentText: '#fff8e8',
            border: '#b58a45',
            gradientFrom: '#29483d',
            gradientTo: '#1f352e',
            muted: '#625548',
            paper: '#f2e2bf',
            qrDark: '#29231f',
            qrLight: '#fffaf0',
            softAccent: '#ead6ad',
            surface: '#f8ebce',
            text: '#29231f',
        });
    }

    if (familyId === 'indian-atelier') {
        return withRgb({
            ...base,
            accent: '#6e2530',
            accentText: '#fffaf4',
            border: '#a77b45',
            gradientFrom: '#707568',
            gradientTo: '#42473f',
            muted: '#6b6b63',
            paper: '#f7f3ea',
            qrDark: '#252421',
            qrLight: '#ffffff',
            softAccent: '#eee8dc',
            surface: '#fffdf8',
            text: '#252421',
        });
    }

    if (familyId === 'art-deco-garden') {
        return withRgb({
            ...base,
            accent: '#103b3a',
            accentText: '#fffaf1',
            border: '#d8b56c',
            gradientFrom: '#c98d8f',
            gradientTo: '#103b3a',
            muted: '#66766c',
            paper: '#f5efe3',
            qrDark: '#103b3a',
            qrLight: '#ffffff',
            softAccent: '#e7e6d8',
            surface: '#fffaf1',
            text: '#223b38',
        });
    }

    if (familyId === 'japanese-night-luxe') {
        return withRgb({
            ...base,
            accent: '#b59055',
            accentText: '#111315',
            border: '#7f6c4d',
            gradientFrom: '#17293b',
            gradientTo: '#111315',
            muted: '#d3cdc2',
            paper: '#111315',
            qrDark: '#111315',
            qrLight: '#ffffff',
            softAccent: '#25313b',
            surface: '#1a232c',
            text: '#eee8dd',
        });
    }

    if (familyId === 'tea-salon-heritage') {
        return withRgb({
            ...base,
            accent: '#5b2d46',
            accentText: '#fff9ed',
            border: '#b5965b',
            gradientFrom: '#afc9be',
            gradientTo: '#75998b',
            muted: '#69675f',
            paper: '#f4e7cf',
            qrDark: '#34332f',
            qrLight: '#ffffff',
            softAccent: '#e1e9df',
            surface: '#fff8eb',
            text: '#34332f',
        });
    }

    if (familyId === 'lankan-block-print') {
        return withRgb({
            ...base,
            accent: '#a9472e',
            accentText: '#fff8e7',
            border: '#256a68',
            gradientFrom: '#d39a35',
            gradientTo: '#4d2f48',
            muted: '#5f5146',
            paper: '#f0e4c8',
            qrDark: '#24211f',
            qrLight: '#fffdf7',
            softAccent: '#ead8b2',
            surface: '#f8edcf',
            text: '#24211f',
        });
    }

    if (familyId === 'gallery-ledger') {
        return withRgb({
            ...base,
            accent: '#2d5bb5',
            accentText: '#fffdf8',
            border: '#9da0a2',
            gradientFrom: '#c86f4f',
            gradientTo: '#6f7479',
            muted: '#555a60',
            paper: '#f6f2e9',
            qrDark: '#20252b',
            qrLight: '#ffffff',
            softAccent: '#e9edf5',
            surface: '#fffdf8',
            text: '#20252b',
        });
    }

    if (familyId === 'vital-current') {
        return withRgb({
            ...base,
            accent: '#0f2f52',
            accentText: '#ffffff',
            border: '#85a59f',
            gradientFrom: '#ed6d53',
            gradientTo: '#15324e',
            muted: '#526675',
            paper: '#f5f2ea',
            qrDark: '#0f2f52',
            qrLight: '#ffffff',
            softAccent: '#e4eeeb',
            surface: '#fffdf8',
            text: '#10253c',
        });
    }

    if (familyId === 'workshop-atlas') {
        return withRgb({
            ...base,
            accent: '#18314f',
            accentText: '#fffaf0',
            border: '#a85c39',
            gradientFrom: '#2f5a4f',
            gradientTo: '#18314f',
            muted: '#5d5b52',
            paper: '#f2e4c8',
            qrDark: '#18314f',
            qrLight: '#ffffff',
            softAccent: '#e7dcc4',
            surface: '#f9edd4',
            text: '#1f3144',
        });
    }

    if (familyId === 'classic-luxe') {
        const gold = mixHex(brandAccent, '#bd8b2f', 0.24);
        return withRgb({
            ...base,
            accent: gold,
            accentText: '#1f1b14',
            border: '#cfb779',
            gradientFrom: '#d7b94a',
            gradientTo: '#8b7424',
            muted: '#6f6450',
            paper: '#fbf7ea',
            qrDark: '#111827',
            qrLight: '#ffffff',
            softAccent: '#f5ead3',
            surface: '#fffdf7',
            text: '#1f1b17',
        });
    }

    if (familyId === 'brand-banner' || familyId === 'local-bold') {
        return withRgb({
            ...base,
            accent: base.accent,
            accentText: base.accentText,
            border: mixHex(base.accent, '#111827', familyId === 'local-bold' ? 0.4 : 0.28),
            gradientFrom: mixHex(base.accent, '#ffffff', 0.9),
            gradientTo: mixHex(base.accent, '#111827', familyId === 'local-bold' ? 0.7 : 0.54),
            muted: '#59616b',
            paper: '#f5f8fb',
            qrDark: '#111827',
            qrLight: '#ffffff',
            softAccent: mixHex(base.accent, '#ffffff', 0.16),
            surface: '#ffffff',
            text: '#111827',
        });
    }

    if (familyId === 'soft-curve') {
        return withRgb({
            ...base,
            accent: base.accent,
            accentText: base.accentText,
            border: mixHex(base.accent, '#cad7dd', 0.18),
            gradientFrom: mixHex(base.accent, '#ffffff', 0.32),
            gradientTo: '#f8fbfd',
            muted: '#667085',
            paper: '#f4fbfb',
            qrDark: '#111827',
            qrLight: '#ffffff',
            softAccent: mixHex(base.accent, '#ffffff', 0.1),
            surface: '#ffffff',
            text: '#111827',
        });
    }

    if (familyId === 'qr-first') {
        return withRgb({
            ...base,
            accent: base.accent,
            accentText: base.accentText,
            border: mixHex(base.accent, '#94a3b8', 0.2),
            gradientFrom: mixHex(base.accent, '#ffffff', 0.78),
            gradientTo: mixHex(base.accent, '#111827', 0.62),
            muted: '#4b5563',
            paper: '#f5f7fa',
            qrDark: '#111827',
            qrLight: '#ffffff',
            softAccent: '#eef6f7',
            surface: '#ffffff',
            text: '#111827',
        });
    }

    if (familyId === 'clean-utility') {
        return withRgb({
            ...base,
            accent: '#111827',
            accentText: '#ffffff',
            border: '#d7dde3',
            gradientFrom: '#ffffff',
            gradientTo: '#f3f4f6',
            muted: '#6b7280',
            paper: '#ffffff',
            qrDark: '#111827',
            qrLight: '#ffffff',
            softAccent: '#f3f4f6',
            surface: '#ffffff',
            text: '#111827',
        });
    }

    return base;
}

export function getPrintableTemplateTone(templateFamilyId?: string | null): PrintableTemplateFamilyId {
    return normalizePrintableTemplateFamilyId(templateFamilyId);
}
