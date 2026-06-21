import type { Metadata } from 'next';
import {
    PAGE_DATA,
    SecondaryPage,
    buildPageMetadata,
} from '../content';

export const metadata: Metadata = buildPageMetadata(PAGE_DATA.contact);

export default function ConstantLayerContactPage() {
    return <SecondaryPage page={PAGE_DATA.contact} />;
}
