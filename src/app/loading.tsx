import BrandedPageLoader, { type BrandedPageLoaderBrand } from '@atoms/brandedPageLoader';
import { headers } from 'next/headers';

export type ServerSidePageLoaderBrand = BrandedPageLoaderBrand;

async function getRequestLoaderBrand(): Promise<ServerSidePageLoaderBrand> {
    try {
        const h = (await headers());
        const productId = h.get('x-product-id');
        if (productId === 'answerlattice') return 'answerlattice';
        if (productId === 'campaigncue') return 'campaigncue';
        return 'menulist';
    } catch {
        return 'menulist';
    }
}

async function ServerSidePageLoader({
    page,
    brand,
}: {
    page?: string;
    brand?: ServerSidePageLoaderBrand;
}) {
    const resolvedBrand = brand || await getRequestLoaderBrand();
    return <BrandedPageLoader page={page} brand={resolvedBrand} />
}

export default ServerSidePageLoader
