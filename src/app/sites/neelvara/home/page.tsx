import type { Metadata } from 'next';
import NeelvaraHomePage from '../page';
import {
    NEELVARA_SITE_DESCRIPTION,
    NEELVARA_SITE_TITLE,
    buildNeelvaraUrl,
} from '../siteConfig';

export const metadata: Metadata = {
    title: {
        absolute: NEELVARA_SITE_TITLE,
    },
    description: NEELVARA_SITE_DESCRIPTION,
    alternates: { canonical: buildNeelvaraUrl('/') },
};

export default NeelvaraHomePage;
