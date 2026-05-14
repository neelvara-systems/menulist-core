import { FEATURE_FLAGS } from '@config/features';
import {
    ITEM_CARD_CACHE_CONTROL,
    ITEM_CARD_IMAGE_HEIGHT,
    ITEM_CARD_IMAGE_WIDTH,
    renderMenuItemCard,
    resolvePublicItemSnapshot,
} from '@lib/menu/itemTruthRenderer';
import { slugify } from '@lib/utils/slugify';
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getItemName(item: any): string {
    const value = item?.name;
    if (!value) return 'menu-item';
    if (typeof value === 'string') return value;
    return String(value.en || value.default || Object.values(value).find(Boolean) || 'menu-item');
}

export async function GET(
    request: NextRequest,
    { params }: { params: { itemId: string } },
) {
    if (!FEATURE_FLAGS.ENABLE_ITEM_TRUTH_EXPORT) {
        return new Response('Not found', { status: 404 });
    }

    const itemId = decodeURIComponent(params.itemId || '').trim();
    if (!itemId) {
        return new Response('Missing item id', { status: 400 });
    }

    const projectId = request.nextUrl.searchParams.get('project');
    const tenantId = request.nextUrl.searchParams.get('tenant');
    const storeId = request.nextUrl.searchParams.get('store');
    const snapshot = await resolvePublicItemSnapshot(itemId, projectId, tenantId, storeId);
    if (!snapshot) {
        return new Response('Item not available', {
            status: 404,
            headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
        });
    }

    const filename = `${slugify(getItemName(snapshot.item)) || 'menu-item'}-${itemId.slice(-6)}.png`;
    return new ImageResponse(renderMenuItemCard(snapshot), {
        width: ITEM_CARD_IMAGE_WIDTH,
        height: ITEM_CARD_IMAGE_HEIGHT,
        headers: {
            'Cache-Control': ITEM_CARD_CACHE_CONTROL,
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    });
}
