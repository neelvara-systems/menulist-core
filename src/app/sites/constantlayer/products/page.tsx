import type { Metadata } from 'next';
import { PAGE_DATA, SecondaryPage, buildPageMetadata } from '../content';

export const metadata: Metadata = buildPageMetadata(PAGE_DATA.products);

export default function ConstantLayerProductsPage() {
    return <SecondaryPage page={PAGE_DATA.products} />;
}
