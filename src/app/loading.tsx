import BrandedPageLoader, { type BrandedPageLoaderBrand } from '@atoms/brandedPageLoader';
import { headers } from 'next/headers';

export type ServerSidePageLoaderBrand = BrandedPageLoaderBrand;

function getRequestLoaderBrand(): ServerSidePageLoaderBrand {
    try {
        const h = headers();
        return h.get('x-product-id') === 'answerlattice' ? 'answerlattice' : 'menulist';
    } catch {
        return 'menulist';
    }
}

function ServerSidePageLoader({
    page,
    brand,
}: {
    page?: string;
    brand?: ServerSidePageLoaderBrand;
}) {
    const resolvedBrand = brand || getRequestLoaderBrand();
    return <BrandedPageLoader page={page} brand={resolvedBrand} />
}

export default ServerSidePageLoader
