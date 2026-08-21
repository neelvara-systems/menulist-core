import type { Metadata } from 'next';
import { PAGE_DATA, SecondaryPage, buildPageMetadata } from '../content';

export const metadata: Metadata = buildPageMetadata(PAGE_DATA.trust);

export default function NeelvaraTrustPage() {
    return <SecondaryPage page={PAGE_DATA.trust} />;
}
