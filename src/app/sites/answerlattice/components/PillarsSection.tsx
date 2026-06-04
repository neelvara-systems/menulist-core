import { ANSWERLATTICE_ENGINE_PILLARS } from '../enginePillars';
import { AnswerlatticeCrossDiagram } from './AnswerlatticeFlowDiagram';
import SectionHeader from './SectionHeader';

export default function PillarsSection() {
    return (
        <section className="px-6 py-24">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    className="mb-16"
                    eyebrow="Behind the scenes"
                    title="What happens behind the scenes."
                    description="AnswerLattice knows your product structure, serves approved answers before fallback, flags stale guidance, and turns repeated misses into review tasks."
                />

                <AnswerlatticeCrossDiagram
                    idPrefix="al-engine-pillars"
                    items={ANSWERLATTICE_ENGINE_PILLARS.map((pillar) => ({
                        title: pillar.title,
                        detail: pillar.description,
                        meta: pillar.highlight,
                    }))}
                />
            </div>
        </section>
    );
}
