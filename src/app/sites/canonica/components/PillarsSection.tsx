import { CANONICA_ENGINE_PILLARS } from '../enginePillars';
import { CanonicaSequenceDiagram } from './CanonicaFlowDiagram';

export default function PillarsSection() {
    return (
        <section className="px-6 py-24">
            <div className="mx-auto max-w-6xl">
                {/* Section header */}
                <div className="mb-16 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                        Behind the scenes
                    </p>
                    <h2 className="text-3xl font-bold sm:text-4xl">
                        What happens behind the scenes.
                    </h2>
                    <p className="mt-4 text-lg text-[#a0a0c0]">
                        Canonica knows your product structure, serves approved answers before fallback, flags stale guidance, and turns repeated misses into review tasks.
                    </p>
                </div>

                <CanonicaSequenceDiagram
                    idPrefix="cn-engine-pillars"
                    splitAfter={2}
                    items={CANONICA_ENGINE_PILLARS.map((pillar) => ({
                        title: pillar.title,
                        detail: pillar.description,
                        meta: pillar.highlight,
                    }))}
                />
            </div>
        </section>
    );
}
