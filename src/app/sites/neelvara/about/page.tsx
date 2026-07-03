import type { Metadata } from 'next';
import { PAGE_DATA, SecondaryPage, buildPageMetadata } from '../content';

export const metadata: Metadata = buildPageMetadata(PAGE_DATA.about);

export default function NeelvaraAboutPage() {
    return <SecondaryPage page={PAGE_DATA.about} />;
}
