import type { Metadata } from 'next';
import { PAGE_DATA, SecondaryPage, buildPageMetadata } from '../content';

export const metadata: Metadata = buildPageMetadata(PAGE_DATA.terms);

export default function ConstantLayerTermsPage() {
    return <SecondaryPage page={PAGE_DATA.terms} />;
}
