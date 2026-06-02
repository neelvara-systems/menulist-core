import ProductFeatureRoutePage, { buildProductFeatureMetadata } from '../ProductFeatureRoutePage';
import { getAnswerlatticeSupportFeature } from '../../productFeatures';

const feature = getAnswerlatticeSupportFeature('tickets');

if (!feature) {
    throw new Error('AnswerLattice Tickets feature configuration is missing.');
}

export const metadata = buildProductFeatureMetadata(feature);

export default function AnswerlatticeTicketsFeaturePage() {
    return <ProductFeatureRoutePage feature={feature} />;
}
