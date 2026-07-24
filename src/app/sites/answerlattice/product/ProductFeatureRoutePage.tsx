import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import ProductFeatureLandingPage from '../components/ProductFeatureLandingPage';
import type { AnswerlatticeProductFeature } from '../productFeatures';

export function buildProductFeatureMetadata(feature: AnswerlatticeProductFeature): Metadata {
    return {
        title: feature.label,
        description: feature.description,
        alternates: { canonical: feature.href },
        openGraph: {
            title: `${feature.label} | AnswerLattice`,
            description: feature.description,
            url: feature.href,
        },
    };
}

async function getBasePath(): Promise<string> {
    try {
        const h = (await headers());
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;

        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default async function ProductFeatureRoutePage({ feature }: { feature: AnswerlatticeProductFeature }) {
    const basePath = await getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path={feature.href} />
            <AnswerlatticeHeader basePath={basePath} />
            <ProductFeatureLandingPage feature={feature} basePath={basePath} />
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
