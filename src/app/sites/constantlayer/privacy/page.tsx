import type { Metadata } from 'next';
import { PAGE_DATA, SecondaryPage, buildPageMetadata } from '../content';

export const metadata: Metadata = buildPageMetadata(PAGE_DATA.privacy);

export default function ConstantLayerPrivacyPage() {
    return <SecondaryPage page={PAGE_DATA.privacy} />;
}
