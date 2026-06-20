import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../../components/Footer';
import AnswerlatticeHeader from '../../components/Header';
import ProductCapabilityLandingPage from '../../components/ProductCapabilityLandingPage';
import { ANSWERLATTICE_PRODUCT_AREAS } from '../../productAreas';

export const metadata: Metadata = {
    title: 'Review Approved Answers',
    description: 'Review approved answers, stale support, repeated misses, coverage signals, and launch readiness.',
    alternates: { canonical: '/product/knowledge-governance' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default function KnowledgeGovernanceProductPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticeHeader basePath={basePath} />
            <ProductCapabilityLandingPage
                basePath={basePath}
                canonicalPath="/product/knowledge-governance"
                eyebrow="Review approved answers"
                title="Keep AI support from becoming support chaos."
                description="AnswerLattice keeps approved answers in front, marks fallback clearly, flags stale support, and turns repeated misses into reviewable improvements."
                activeTab="Review approved answers"
                tabs={ANSWERLATTICE_PRODUCT_AREAS}
                bentoTitle="Known truth stays stable. Missing truth becomes visible."
                bentoDescription="The point is not to let AI answer everything. The point is to keep known answers stable, stale answers visible, and missing answers reviewable."
                bentoCards={[
                    { title: 'Product pages and states', description: 'Features, plans, roles, workflows, integrations, and errors can be mapped to the support topics users ask about.' },
                    { title: 'Approve before users see it', description: 'Drafts and proposals do not become official answers until a human approves them.' },
                    { title: 'Stale-answer review', description: 'AnswerLattice makes stale answers visible after releases, scope conflicts, or deprecated product behavior.' },
                    { title: 'Coverage view', description: 'Owners can see whether important product areas have enough approved answers.' },
                    { title: 'Readiness summary', description: 'Simple summaries help the owner understand launch readiness without scanning raw logs.' },
                ]}
                workflowTitle="Turn support misses into approved product knowledge."
                workflowDescription="The review loop is simple: approved answer first, fallback when needed, signal when weak, owner review, then a better answer for the next user."
                workflowSteps={[
                    { title: 'Serve approved answer first', description: 'If approved knowledge matches the page and scope, AnswerLattice uses it before fallback.' },
                    { title: 'Mark fallback clearly', description: 'Fallback is useful, but it is not treated as official support guidance.' },
                    { title: 'Cluster repeated signals', description: 'Tickets, low-confidence answers, and negative feedback expose recurring support gaps.' },
                    { title: 'Review the proposal', description: 'Owners approve, refine, or reject draft improvements before publishing.' },
                    { title: 'Improve future answers', description: 'Approved changes increase coverage and reduce repeated support load.' },
                ]}
            />
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
