import { DB_COLLECTIONS } from '@constant/database';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { parseSummaryProjects } from '@lib/firestore/parseSummaryProjects';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { getPrimaryPublicMenuImage } from '@lib/menu/publicMenuImages';
import { formatMenuPrice } from '@lib/pricing/formatMenuPrice';

export const ITEM_CARD_IMAGE_WIDTH = 1200;
export const ITEM_CARD_IMAGE_HEIGHT = 630;
export const ITEM_CARD_CACHE_CONTROL = 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800';

type ItemTruthSnapshot = {
    item: any;
    category?: any;
    projectData: any;
    projectMetadata?: any;
    storeData?: any;
    language: string;
};

function localized(value: unknown, language: string, fallback = ''): string {
    return getLocalizedText(value as any, language, getPrimaryLocalizedLanguage(value as any, language), fallback).trim();
}

function parseItemTenantStore(itemId: string): { tenantId: string; storeId: string } | null {
    const markerIndex = itemId.indexOf('i');
    const fileId = markerIndex > 0 ? itemId.slice(0, markerIndex) : itemId;
    const match = fileId.match(/^([^-]+)-[^-]+-([^-\s]+)$/);
    if (!match) return null;
    return { tenantId: match[1], storeId: match[2] };
}

function flattenProject(projectData: any): { categories: any[]; items: any[] } {
    const categories = projectData?.files?.flatMap((file: any) => file?.extractedData?.data?.categories || []) || [];
    const items = projectData?.files?.flatMap((file: any) => file?.extractedData?.data?.items || []) || [];
    return { categories, items };
}

async function getStoreById(storeId: string): Promise<any | null> {
    const snap = await firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeId).get();
    return snap.exists ? snap.data() : null;
}

async function getProjectDoc(tenantId: string, storeId: string, projectId: string): Promise<any | null> {
    const snap = await firestoreAdmin
        .collection(DB_COLLECTIONS.PROJECTS)
        .doc(tenantId)
        .collection(storeId)
        .doc(projectId)
        .get();
    return snap.exists ? snap.data() : null;
}

export async function resolvePublicItemSnapshot(
    itemId: string,
    projectId?: string | null,
    tenantIdOverride?: string | number | null,
    storeIdOverride?: string | number | null,
): Promise<ItemTruthSnapshot | null> {
    const normalizedItemId = String(itemId || '').trim();
    if (!normalizedItemId) return null;

    const parsed = parseItemTenantStore(normalizedItemId);
    const tenantId = parsed?.tenantId || (tenantIdOverride ? String(tenantIdOverride) : '');
    const storeId = parsed?.storeId || (storeIdOverride ? String(storeIdOverride) : '');
    if (!tenantId || !storeId) return null;

    const [storeData, summarySnap] = await Promise.all([
        getStoreById(storeId).catch(() => null),
        firestoreAdmin
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY || 'platformSummary')
            .doc(`projects_${storeId}`)
            .get()
            .catch(() => null),
    ]);

    const summaryProjects = summarySnap?.exists ? parseSummaryProjects(summarySnap.data()) : {};
    const projectEntries = Object.entries(summaryProjects)
        .filter(([id, data]: [string, any]) => {
            if (projectId && id !== projectId) return false;
            return data?.active !== false && data?.deleted !== true && !data?.isSpecialMenu;
        });

    for (const [candidateProjectId, metadata] of projectEntries) {
        const projectData = await getProjectDoc(tenantId, storeId, candidateProjectId);
        if (!projectData) continue;

        const { categories, items } = flattenProject(projectData);
        const item = items.find((entry: any) => String(entry?.id || '') === normalizedItemId);
        if (!item || item.active === false) continue;

        const language = projectData?.defaultLanguage || projectData?.languages?.[0] || 'en';
        const category = categories.find((entry: any) => entry?.id === item.category);
        return {
            item,
            category,
            projectData,
            projectMetadata: metadata,
            storeData,
            language,
        };
    }

    return null;
}

export function renderMenuItemCard(snapshot: ItemTruthSnapshot) {
    const { item, category, projectData, projectMetadata, storeData, language } = snapshot;
    const storeName = getStoreContextName(storeData, 'Menu');
    const projectName = localized(projectMetadata?.name || projectData?.metadata?.name, language, 'Menu');
    const itemName = localized(item.name, language, 'Menu item');
    const itemDescription = localized(item.description, language, '');
    const categoryName = localized(category?.name, language, '');
    const imageUrl = getPrimaryPublicMenuImage(item);
    const accent = storeData?.publicPresence?.accentColor || projectData?.config?.design?.brand?.accentColor || '#0f172a';
    const showItemPrices = projectData?.config?.design?.menu?.showItemPrices ?? true;
    const currencySymbol = storeData?.currencySymbol || storeData?.currency || '₹';
    const price = showItemPrices && item.price !== undefined && item.price !== null && String(item.price).trim()
        ? formatMenuPrice(item.price, currencySymbol, { fractionDigits: 2 })
        : '';
    const updatedOn = projectData?.lastPublishedAt || projectData?.updatedAt || storeData?.updatedAt;
    const updatedDate = typeof updatedOn === 'string'
        ? new Date(updatedOn)
        : updatedOn?.toDate?.() || null;
    const updatedLabel = updatedDate instanceof Date && !Number.isNaN(updatedDate.getTime())
        ? `Updated ${updatedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : 'Current menu';

    return (
        <div
            style={{
                background: '#f8fafc',
                color: '#111827',
                display: 'flex',
                fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
                height: '100%',
                padding: 54,
                width: '100%',
            }}
        >
            <div
                style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 24,
                    boxShadow: '0 24px 70px rgba(15, 23, 42, 0.12)',
                    display: 'flex',
                    gap: 38,
                    height: '100%',
                    overflow: 'hidden',
                    padding: 36,
                    width: '100%',
                }}
            >
                <div
                    style={{
                        alignItems: 'center',
                        background: imageUrl ? '#f1f5f9' : `${accent}12`,
                        borderRadius: 18,
                        display: 'flex',
                        flex: '0 0 420px',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        position: 'relative',
                    }}
                >
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt=""
                            style={{
                                height: '100%',
                                objectFit: 'cover',
                                width: '100%',
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                alignItems: 'center',
                                color: accent,
                                display: 'flex',
                                flexDirection: 'column',
                                fontSize: 96,
                                fontWeight: 800,
                                justifyContent: 'center',
                                lineHeight: 1,
                            }}
                        >
                            {itemName.slice(0, 1).toUpperCase()}
                        </div>
                    )}
                </div>
                <div
                    style={{
                        display: 'flex',
                        flex: 1,
                        flexDirection: 'column',
                        minWidth: 0,
                        padding: '4px 0',
                    }}
                >
                    <div
                        style={{
                            color: accent,
                            display: 'flex',
                            fontSize: 28,
                            fontWeight: 800,
                            lineHeight: 1.2,
                            marginBottom: 18,
                        }}
                    >
                        {storeName}
                    </div>
                    <div
                        style={{
                            color: '#64748b',
                            display: 'flex',
                            fontSize: 24,
                            fontWeight: 650,
                            lineHeight: 1.2,
                            marginBottom: 22,
                        }}
                    >
                        {categoryName || projectName}
                    </div>
                    <div
                        style={{
                            color: '#0f172a',
                            display: 'flex',
                            fontSize: itemName.length > 42 ? 54 : 64,
                            fontWeight: 860,
                            lineHeight: 1.04,
                            marginBottom: 22,
                            maxHeight: 138,
                            overflow: 'hidden',
                        }}
                    >
                        {itemName}
                    </div>
                    {price ? (
                        <div
                            style={{
                                color: accent,
                                display: 'flex',
                                fontSize: 44,
                                fontWeight: 850,
                                lineHeight: 1.1,
                                marginBottom: 22,
                            }}
                        >
                            {price}
                        </div>
                    ) : null}
                    {itemDescription ? (
                        <div
                            style={{
                                color: '#334155',
                                display: 'flex',
                                fontSize: 26,
                                lineHeight: 1.35,
                                maxHeight: 106,
                                overflow: 'hidden',
                            }}
                        >
                            {itemDescription}
                        </div>
                    ) : null}
                    <div style={{ flex: 1 }} />
                    <div
                        style={{
                            alignItems: 'center',
                            borderTop: '1px solid #e5e7eb',
                            color: '#64748b',
                            display: 'flex',
                            fontSize: 21,
                            fontWeight: 650,
                            justifyContent: 'space-between',
                            paddingTop: 20,
                        }}
                    >
                        <span>{updatedLabel}</span>
                        <span>MenuList</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
