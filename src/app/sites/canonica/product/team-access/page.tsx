import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getCanonicaSupportFeature } from '../../productFeatures';

const feature = getCanonicaSupportFeature('team-access');

if (!feature) {
    throw new Error('Canonica Team Access feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function CanonicaTeamAccessFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
