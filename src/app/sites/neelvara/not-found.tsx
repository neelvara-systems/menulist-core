import { LuArrowRight, LuExternalLink } from "react-icons/lu";
import { NEELVARA_PRODUCT_LINEUP } from "./siteConfig";
import { PageShell } from "./content";
import { NeelvaraLink } from "./SiteHeaderNav";

export default function NeelvaraNotFound() {
  return (
    <PageShell>
      <section className="nv-page-hero">
        <div className="nv-wrap nv-page-hero-inner">
          <div className="nv-page-hero-copy nv-reveal">
            <span className="nv-eyebrow mono">
              <span className="nv-pip" aria-hidden="true" />
              Page not found
            </span>
            <h1 className="serif">Page not found</h1>
            <p>
              The page you requested is not available on the Neelvara Systems
              company reference website.
            </p>
            <div className="nv-actions nv-not-found-actions">
              <NeelvaraLink
                className="nv-button nv-button-solid nv-button-large"
                href="/"
              >
                Home
                <LuArrowRight aria-hidden="true" />
              </NeelvaraLink>
              <NeelvaraLink
                className="nv-button nv-button-glass nv-button-large"
                href="/products"
              >
                Products
              </NeelvaraLink>
              <NeelvaraLink
                className="nv-button nv-button-glass nv-button-large"
                href="/contact"
              >
                Contact
              </NeelvaraLink>
            </div>
          </div>
        </div>
      </section>

      <section className="nv-section nv-section-tight nv-reveal">
        <div className="nv-wrap nv-text-panel nv-section-frame">
          <div>
            <h2 className="serif">Looking for a product website?</h2>
            <p>
              Product support, onboarding, billing, documentation, and account
              questions start from the relevant product site.
            </p>
          </div>
          <ul className="nv-check-list">
            {NEELVARA_PRODUCT_LINEUP.map((product) => (
              <li key={product.name}>
                <a href={product.url}>
                  {product.name}
                  <LuExternalLink aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
