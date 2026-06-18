import { LuArrowRight } from 'react-icons/lu';
import AnswerlatticeLink from './AnswerlatticeLink';

export default function CTASection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="al-final-cta">
            <div className="al-final-cta__panel mx-auto max-w-4xl text-center" data-answerlattice-reveal>
                <h2>
                    Give your product users support they can trust.
                </h2>
                <p>
                    Launch with an in-app support widget, hosted help, and approved answers before fallback. Missing coverage becomes tickets, feedback, and review work so support knowledge keeps improving without pretending to run on autopilot.
                </p>
                <div className="al-final-cta__actions">
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/get-started"
                        data-answerlattice-event="final_cta_clicked"
                        data-answerlattice-label="start_support_setup"
                        className="al-final-cta__button al-final-cta__button--primary"
                    >
                        Start support setup
                        <LuArrowRight aria-hidden size={16} />
                    </AnswerlatticeLink>
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/demo"
                        data-answerlattice-event="final_cta_clicked"
                        data-answerlattice-label="see_demo"
                        className="al-final-cta__button al-final-cta__button--secondary"
                    >
                        View demo
                        <LuArrowRight aria-hidden size={16} />
                    </AnswerlatticeLink>
                </div>
                <span>
                    Built for solo founders, small SaaS teams, and studios managing multiple launches.
                </span>
            </div>
        </section>
    );
}
