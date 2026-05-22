import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../../components/Footer';
import CanonicaHeader from '../../components/Header';
import ProductCapabilityLandingPage from '../../components/ProductCapabilityLandingPage';
import { CANONICA_PRODUCT_AREAS } from '../../productAreas';

export const metadata: Metadata = {
    title: 'Knowledge Governance',
    description: 'Govern Canonica product ontology, canonical answers, drift, signal mutation, coverage KPI, and trust/readiness metrics.',
    alternates: { canonical: '/product/knowledge-governance' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

export default function KnowledgeGovernanceProductPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <ProductCapabilityLandingPage
                basePath={basePath}
                eyebrow="Knowledge Governance"
                title="Keep support truth accurate as the product changes."
                description="Canonica treats support knowledge as governed product truth: product ontology, canonical answers, drift, signal mutation, coverage, and trust metrics all point owners toward what to review."
                activeTab="Knowledge Governance"
                tabs={CANONICA_PRODUCT_AREAS}
                canvasTitle="Governance queue and answer health"
                canvasSubtitle="Missed questions, stale release context, negative feedback, and repeated tickets become visible review work before they become bad support habits."
                canvasBadge="Human review"
                canvasItems={[
                    { title: 'Canonical answers', description: 'Approved, scoped answers stay the source of truth before fallback or generated help.' },
                    { title: 'Drift review', description: 'Release, scope, deprecated entity, and signal anomaly drift become visible instead of silently misleading users.' },
                    { title: 'Signal mutation', description: 'Recurring misses become reviewable proposals or draft answer changes for human approval.' },
                ]}
                metrics={[
                    { label: 'Coverage KPI', value: 'Improving' },
                    { label: 'Drift pressure', value: 'Visible' },
                    { label: 'Authority', value: 'Approved' },
                ]}
                bentoTitle="Governance keeps AI support from improvising."
                bentoDescription="The point is not to let AI answer everything. The point is to make known support truth stable, stale truth visible, and missing truth reviewable."
                bentoCards={[
                    { title: 'Product ontology', description: 'Features, plans, roles, workflows, states, integrations, and errors can be treated as first-class support concepts.' },
                    { title: 'Approved before authority', description: 'Drafts and proposals do not become official support truth until a human approves them.' },
                    { title: 'Drift detection', description: 'Canonica makes stale answers visible after releases, scope conflicts, or deprecated product behavior.' },
                    { title: 'Coverage metrics', description: 'Owners can see whether important surfaces have enough approved support truth.' },
                    { title: 'Trust readiness', description: 'Summary-backed metrics help the owner understand readiness without scanning raw logs.' },
                ]}
                workflowTitle="Turn support misses into governed product knowledge."
                workflowDescription="Governance is the loop: canonical answer first, fallback when needed, signal when weak, owner review, then improved truth for the next user."
                workflowSteps={[
                    { title: 'Serve canonical answer first', description: 'If approved knowledge matches the page and scope, Canonica uses it before fallback.' },
                    { title: 'Mark fallback clearly', description: 'Fallback is useful, but it is not treated as authoritative support truth.' },
                    { title: 'Cluster repeated signals', description: 'Tickets, low-confidence answers, and negative feedback expose recurring support gaps.' },
                    { title: 'Review the proposal', description: 'Owners approve, refine, or reject draft improvements before publishing.' },
                    { title: 'Improve future answers', description: 'Approved changes increase coverage and reduce repeated support load.' },
                ]}
            />
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
