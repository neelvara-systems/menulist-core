import type { MenuCardExportSettings, MenuCardSafeOverrides } from '../models/exportTypes';
import type { MenuCardPrintSource } from '../models/printModel';

const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
        let c = i;
        for (let j = 0; j < 8; j += 1) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
    }
    return table;
})();

function crc32(value: string): number {
    let crc = 0xffffffff;
    for (let i = 0; i < value.length; i += 1) {
        crc = CRC32_TABLE[(crc ^ value.charCodeAt(i)) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

export function buildPrintSourceHash(
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    overrides: MenuCardSafeOverrides = {},
): string {
    const stable = {
        business: {
            name: source.business.name,
            publicMenuUrl: source.business.publicMenuUrl,
            brandColor: source.business.brandColor || null,
        },
        menu: source.menu.categories.map((category) => ({
            id: category.id,
            name: category.name,
            items: category.items.map((item) => ({
                id: item.id,
                name: item.name,
                price: item.price || '',
                description: item.description || '',
                attributes: item.attributes,
                tags: item.tags,
            })),
        })),
        settings,
        overrides,
    };

    return `mce-${crc32(JSON.stringify(stable)).toString(36)}`;
}
