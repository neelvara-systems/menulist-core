import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getAnswerlatticeSupportFeature } from '../../productFeatures';

const feature = getAnswerlatticeSupportFeature('team-access');

if (!feature) {
    throw new Error('Answerlattice Team Access feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function AnswerlatticeTeamAccessFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
