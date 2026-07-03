import type { Metadata } from 'next';
import { PAGE_DATA, SecondaryPage, buildPageMetadata } from '../content';

export const metadata: Metadata = buildPageMetadata(PAGE_DATA.legal);

export default function NeelvaraLegalPage() {
    return <SecondaryPage page={PAGE_DATA.legal} />;
}
