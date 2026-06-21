import { LuArrowRight } from 'react-icons/lu';
import { PageShell } from './content';
import { ConstantLayerLink } from './SiteHeaderNav';

export default function ConstantLayerNotFound() {
    return (
        <PageShell>
            <section className="cl-page-hero">
                <div className="cl-container cl-page-hero-inner">
                    <span className="cl-eyebrow">Not found</span>
                    <h1>Page not found</h1>
                    <p>The page is unavailable.</p>
                </div>
            </section>
            <section className="cl-section cl-final-section">
                <div className="cl-container cl-final-band">
                    <div>
                        <span className="cl-eyebrow">ConstantLayer Systems</span>
                        <h2>Return to the company reference or product lineup.</h2>
                        <p>Company, legal, privacy, and product relationship information remains available from the main ConstantLayer pages.</p>
                    </div>
                    <div className="cl-actions">
                        <ConstantLayerLink className="cl-primary-action" href="/">
                            Home
                            <LuArrowRight aria-hidden="true" />
                        </ConstantLayerLink>
                        <ConstantLayerLink className="cl-secondary-action" href="/products">
                            Products
                        </ConstantLayerLink>
                    </div>
                </div>
            </section>
        </PageShell>
    );
}
