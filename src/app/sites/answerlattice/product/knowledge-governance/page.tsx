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
    title: 'Knowledge Map and Approved Answer Review',
    description: 'Use Knowledge Map, Product Friction Evidence, Answer Tests, and release impact to review approved answers and keep support truth current.',
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
                title="See where support truth is strong, weak, or at risk."
                description="Knowledge Map locates governed product truth. Product Friction Evidence shows where users are struggling. Answer Tests and release impact help you review changes before support depends on them."
                activeTab="Review approved answers"
                tabs={ANSWERLATTICE_PRODUCT_AREAS}
                heroAsset={ANSWERLATTICE_KNOWLEDGE_MAP_ASSET}
                heroAssetSlotId="product.knowledge-map"
                workflowAsset={ANSWERLATTICE_RELEASE_ASSURANCE_ASSET}
                workflowAssetSlotId="product.release-assurance"
                bentoTitle="One product model, several owner decisions."
                bentoDescription="These are not separate analytics systems. They are focused views over the same product entities, approved answers, support evidence, releases, and tests. Knowledge Map is a governed decision view, not a raw graph or diagram editor."
                bentoCards={[
                    { title: 'Knowledge Map', description: 'Inspect governed product relationships, approved-answer coverage, drift, and review state without exposing a raw internal graph.' },
                    { title: 'Product Friction Evidence', description: 'Compare mapped product areas across completed seven-day windows and open the selected area in Knowledge Map for review.' },
                    { title: 'Approve before users see it', description: 'Drafts and proposals do not become official answers until a human approves them.' },
                    { title: 'Stale-answer review', description: 'AnswerLattice makes stale answers visible after releases, scope conflicts, or deprecated product behavior.' },
                    { title: 'Answer Tests', description: 'Save critical questions and check expected source, answer, fallback class, evidence, and required or forbidden wording without polluting production support history.' },
                    { title: 'Critical proof boundary', description: 'Provider-backed fallback can be tested, but it cannot certify critical proof. Approved truth or an expected safe abstention path is required.' },
                    { title: 'Release impact', description: 'Review directly linked approved answers and current linked tests before activating a versioned release.' },
                    { title: 'Rollback proposals', description: 'Prepare a prior audited answer version for review without overwriting the live answer or applying a rollback automatically.' },
                ]}
                workflowTitle="Move from qualified evidence to a tested answer."
                workflowDescription="The owner path keeps context intact: prioritize current work, locate the affected product area, inspect evidence, review the answer, and test the governed result."
                workflowSteps={[
                    { title: 'Start from qualified evidence', description: 'Daily Brief and Product Friction Evidence surface bounded current work instead of producing a second task queue.' },
                    { title: 'Open the mapped product area', description: 'Friction rows retain the selected product entity when the owner opens Knowledge Map.' },
                    { title: 'Inspect truth and coverage', description: 'Review relationships, answer coverage, drift, and the exact concept that needs attention.' },
                    { title: 'Review the answer or proposal', description: 'Open the governed answer editor with validated context, then approve, refine, or reject the change.' },
                    { title: 'Test critical behavior', description: 'Run deterministic approved-answer checks, or a capped full-runtime check when fallback behavior must be verified.' },
                    { title: 'Check release impact', description: 'Review directly linked answers and linked tests before a versioned release is activated.' },
                    { title: 'Publish only after approval', description: 'No map, metric, test, or impact preview changes support truth automatically.' },
                ]}
            />
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
