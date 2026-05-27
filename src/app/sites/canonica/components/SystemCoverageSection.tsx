import { CANONICA_SYSTEM_COVERAGE } from '../systemCoverage';
import { CanonicaHubDiagram } from './CanonicaFlowDiagram';

export default function SystemCoverageSection() {
    const midpoint = Math.ceil(CANONICA_SYSTEM_COVERAGE.length / 2);
    const inputs = CANONICA_SYSTEM_COVERAGE.slice(0, midpoint);
    const outputs = CANONICA_SYSTEM_COVERAGE.slice(midpoint);

    return (
        <section className="border-t border-white/[0.06] px-6 py-24">
            <div className="mx-auto max-w-7xl">
                <div className="mb-14 max-w-3xl">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">
                        Product System
                    </p>
                    <h2 className="text-3xl font-bold sm:text-4xl">
                        One control plane across setup, support, governance, and runtime.
                    </h2>
                    <p className="mt-4 text-lg leading-relaxed text-[#a0a0c0]">
                        Canonica is not only a search box. It connects onboarding, help content, product pages, widget context, tickets, release notes, and review queues so support can keep up with fast-moving software.
                    </p>
                </div>

                <CanonicaHubDiagram
                    idPrefix="cn-system-coverage"
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
