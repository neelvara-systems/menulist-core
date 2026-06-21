import type { Metadata } from 'next';
import ConstantLayerHomePage from '../page';
import {
    CONSTANTLAYER_SITE_DESCRIPTION,
    CONSTANTLAYER_SITE_TITLE,
    buildConstantLayerUrl,
} from '../siteConfig';

export const metadata: Metadata = {
    title: {
        absolute: CONSTANTLAYER_SITE_TITLE,
    },
    description: CONSTANTLAYER_SITE_DESCRIPTION,
    alternates: { canonical: buildConstantLayerUrl('/') },
};

export default ConstantLayerHomePage;
