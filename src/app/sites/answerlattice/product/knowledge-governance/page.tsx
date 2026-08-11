import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../../components/Footer';
import AnswerlatticeHeader from '../../components/Header';
import ProductCapabilityLandingPage from '../../components/ProductCapabilityLandingPage';
import {
    ANSWERLATTICE_KNOWLEDGE_MAP_ASSET,
    ANSWERLATTICE_RELEASE_ASSURANCE_ASSET,
} from '../../answerlatticeWebsiteAssets';
import { ANSWERLATTICE_PRODUCT_AREAS } from '../../productAreas';

export const metadata: Metadata = {
    title: 'Approved Answer Review',
    description: 'Find missing, stale, or release-affected support, test critical answers, and approve what becomes official before users depend on it.',
    alternates: { canonical: '/product/knowledge-governance' },
};

async function getBasePath(): Promise<string> {
    try {
        const h = (await headers());
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;

        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default async function KnowledgeGovernanceProductPage() {
    const basePath = await getBasePath();

    return (
        <>
            <AnswerlatticeHeader basePath={basePath} />
            <ProductCapabilityLandingPage
                basePath={basePath}
                canonicalPath="/product/knowledge-governance"
                eyebrow="Review approved answers"
                title="See which support is ready, missing, stale, or at risk."
                description="Find the product areas users struggle with, see which answers need attention, test critical support paths, and review release impact before users depend on a change."
                activeTab="Review approved answers"
                tabs={ANSWERLATTICE_PRODUCT_AREAS}
                heroAsset={ANSWERLATTICE_KNOWLEDGE_MAP_ASSET}
                heroAssetSlotId="product.knowledge-map"
                workflowAsset={ANSWERLATTICE_RELEASE_ASSURANCE_ASSET}
                workflowAssetSlotId="product.release-assurance"
                bentoTitle="One product model, several owner decisions."
                bentoDescription="These are focused review views over the same product areas, approved answers, support evidence, releases, and tests. Knowledge Map helps owners make a decision; it is not a raw graph or diagram editor."
                bentoCards={[
                    { title: 'Knowledge Map', description: 'Inspect product relationships, approved-answer coverage, stale guidance, and review state without exposing a raw internal graph.' },
                    { title: 'Product Friction Evidence', description: 'Compare mapped product areas across completed seven-day windows and open the selected area in Knowledge Map for review.' },
                    { title: 'Approve before users see it', description: 'Draft answers and suggested changes do not become official until a human approves them.' },
                    { title: 'Stale-answer review', description: 'AnswerLattice makes stale answers visible after releases, scope conflicts, or deprecated product behavior.' },
                    { title: 'Answer Tests', description: 'Save critical questions and check expected source, answer, fallback class, evidence, and required or forbidden wording without polluting production support history.' },
                    { title: 'Critical proof boundary', description: 'Provider-backed fallback can be tested, but it cannot certify critical guidance. An approved answer or an expected safe abstention path is required.' },
                    { title: 'Release impact', description: 'Review directly linked approved answers and current linked tests before activating a versioned release.' },
                    { title: 'Reviewed rollback', description: 'Prepare a prior audited answer version for review without overwriting the live answer or applying a rollback automatically.' },
                ]}
                workflowTitle="Move from a visible support issue to a tested answer."
                workflowDescription="The owner path keeps context intact: prioritize current work, locate the affected product area, inspect evidence, review the answer, and test the result."
                workflowSteps={[
                    { title: 'Start from current evidence', description: 'Daily Brief and Product Friction Evidence show the support work that needs attention instead of producing a second task queue.' },
                    { title: 'Open the mapped product area', description: 'Friction rows retain the selected product area when the owner opens Knowledge Map.' },
                    { title: 'Inspect support and coverage', description: 'Review relationships, answer coverage, stale guidance, and the exact product concept that needs attention.' },
                    { title: 'Review the answer or draft', description: 'Open the answer editor with validated context, then approve, refine, or reject the change.' },
                    { title: 'Test critical behavior', description: 'Run deterministic approved-answer checks, or a capped full-runtime check when fallback behavior must be verified.' },
                    { title: 'Check release impact', description: 'Review directly linked answers and linked tests before a versioned release is activated.' },
                    { title: 'Publish only after approval', description: 'No map, metric, test, or impact preview changes official support automatically.' },
                ]}
            />
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
