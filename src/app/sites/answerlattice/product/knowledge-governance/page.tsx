import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../../components/Footer';
import AnswerlatticeHeader from '../../components/Header';
import ProductCapabilityLandingPage from '../../components/ProductCapabilityLandingPage';
import { ANSWERLATTICE_PRODUCT_AREAS } from '../../productAreas';

export const metadata: Metadata = {
    title: 'Review Approved Answers',
    description: 'Review approved answers, test critical questions, recheck release impact, inspect stale support, and turn repeated misses into governed improvements.',
    alternates: { canonical: '/product/knowledge-governance' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;

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
                description="AnswerLattice keeps approved answers in front, tests critical questions before releases, marks fallback clearly, flags stale support, and turns repeated misses into reviewable improvements."
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
                    { title: 'Answer Test Suite', description: 'Save critical user questions and check the expected source, answer, fallback class, confidence, and required or forbidden wording without polluting production support history.' },
                    { title: 'Release-scoped checks', description: 'Run only the saved cases linked to the release or affected product entities instead of scanning every support record.' },
                    { title: 'Rollback proposals', description: 'Prepare a prior audited answer version for review without overwriting the live answer or applying a rollback automatically.' },
                ]}
                workflowTitle="Turn support misses into approved product knowledge."
                workflowDescription="The review loop is simple: approved answer first, fallback when needed, signal when weak, owner review, then a better answer for the next user."
                workflowSteps={[
                    { title: 'Serve approved answer first', description: 'If approved knowledge matches the page and scope, AnswerLattice uses it before fallback.' },
                    { title: 'Mark fallback clearly', description: 'Fallback is useful, but it is not treated as official support guidance.' },
                    { title: 'Cluster repeated signals', description: 'Tickets, low-confidence answers, and negative feedback expose recurring support gaps.' },
                    { title: 'Review the proposal', description: 'Owners approve, refine, or reject draft improvements before publishing.' },
                    { title: 'Test critical behavior', description: 'Run deterministic approved-answer checks, or a capped full-runtime check when fallback behavior must be verified.' },
                    { title: 'Check affected release cases', description: 'Use linked product entities to rerun only the questions that a release may have changed.' },
                    { title: 'Improve future answers', description: 'Approved changes increase coverage and reduce repeated support load.' },
                ]}
            />
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
