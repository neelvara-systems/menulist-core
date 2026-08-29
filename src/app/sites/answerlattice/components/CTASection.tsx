import { LuArrowRight } from 'react-icons/lu';
import AnswerlatticeLink from './AnswerlatticeLink';

export default function CTASection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="al-final-cta">
            <div className="al-final-cta__panel mx-auto max-w-4xl text-center" data-answerlattice-reveal>
                <h2>
                    Start with the 10 questions your users will ask first.
                </h2>
                <p>
                    Bring the product material you already have. Review the first answers, verify the user experience, and improve from real missed questions.
                </p>
                <div className="al-final-cta__actions">
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/early-access"
                        data-answerlattice-event="final_cta_clicked"
                        data-answerlattice-label="build_first_10_answers"
                        className="al-final-cta__button al-final-cta__button--primary"
                    >
                        Request early access
                        <LuArrowRight aria-hidden size={16} />
                    </AnswerlatticeLink>
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/demo"
                        data-answerlattice-event="final_cta_clicked"
                        data-answerlattice-label="see_60_sec_demo"
                        className="al-final-cta__button al-final-cta__button--secondary"
                    >
                        See 60-sec demo
                        <LuArrowRight aria-hidden size={16} />
                    </AnswerlatticeLink>
                </div>
                <span>
                    Built for vibe coders, solo founders, small SaaS teams, and studios.
                </span>
            </div>
        </section>
    );
}
