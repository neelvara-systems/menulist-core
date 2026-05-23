import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaPageStructuredData from '../components/PageStructuredData';
import ProductFeatureLandingPage from '../components/ProductFeatureLandingPage';
import type { CanonicaProductFeature } from '../productFeatures';

export function buildProductFeatureMetadata(feature: CanonicaProductFeature): Metadata {
    return {
        title: feature.label,
        description: feature.description,
        alternates: { canonical: feature.href },
        openGraph: {
            title: `${feature.label} | Canonica`,
            description: feature.description,
            url: feature.href,
        },
    };
}

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

export default function ProductFeatureRoutePage({ feature }: { feature: CanonicaProductFeature }) {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaPageStructuredData path={feature.href} />
            <CanonicaHeader basePath={basePath} />
            <ProductFeatureLandingPage feature={feature} basePath={basePath} />
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
