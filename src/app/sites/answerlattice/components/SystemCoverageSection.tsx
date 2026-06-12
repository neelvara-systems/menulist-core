import { ANSWERLATTICE_SYSTEM_COVERAGE } from '../systemCoverage';
import { AnswerlatticeHubDiagram } from './AnswerlatticeFlowDiagram';
import SectionHeader from './SectionHeader';

export default function SystemCoverageSection() {
    const midpoint = Math.ceil(ANSWERLATTICE_SYSTEM_COVERAGE.length / 2);
    const inputs = ANSWERLATTICE_SYSTEM_COVERAGE.slice(0, midpoint);
    const outputs = ANSWERLATTICE_SYSTEM_COVERAGE.slice(midpoint);

    return (
        <section className="border-t border-white/[0.06] px-6 py-24">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    className="mb-14"
                    eyebrow="Product system"
                    title="One support layer across setup, widget, help center, tickets, and review."
                    description="AnswerLattice is not only a search box. It turns scattered onboarding material, help content, product context, tickets, release notes, and review queues into standard support outputs that can keep up with fast-moving software."
                />

                <AnswerlatticeHubDiagram
                    idPrefix="al-system-coverage"
                    inputLabel="Setup inputs"
                    outputLabel="Runtime outputs"
                    inputs={inputs.map((group) => ({
                        title: group.mode,
                        detail: group.summary,
                        meta: `${group.items.length} surfaces`,
                    }))}
                    outputs={outputs.map((group) => ({
                        title: group.mode,
                        detail: group.summary,
                        meta: `${group.items.length} surfaces`,
                    }))}
                />
            </div>
        </section>
    );
}
