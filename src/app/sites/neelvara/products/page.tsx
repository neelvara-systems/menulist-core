import type { Metadata } from "next";
import { LuExternalLink, LuMail } from "react-icons/lu";
import {
  NEELVARA_CONTACT_EMAIL,
  NEELVARA_OG_IMAGE_PATH,
  NEELVARA_PUBLIC_BRAND,
  NEELVARA_PRODUCT_LINEUP,
  NEELVARA_RELATIONSHIP_LINE,
  buildNeelvaraUrl,
} from "../siteConfig";
import { PageShell, StructuredData } from "../content";
import ProductLogo, { type NeelvaraProductName } from "../ProductLogo";

export const metadata: Metadata = {
  title: "Operated Products",
  description:
    "MenuList and Answerlattice are operated by Neelvara Systems. Visit their official product websites.",
  alternates: { canonical: buildNeelvaraUrl("/products") },
  openGraph: {
    title: "Operated Products | Neelvara Systems",
    description:
      "MenuList and Answerlattice are operated by Neelvara Systems. Visit their official product websites.",
    url: buildNeelvaraUrl("/products"),
    siteName: NEELVARA_PUBLIC_BRAND,
    type: "website",
    images: [
      {
        url: buildNeelvaraUrl(NEELVARA_OG_IMAGE_PATH),
        width: 1200,
        height: 630,
        alt: "Neelvara Systems, Neelvara, MenuList and Answerlattice",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Operated Products | Neelvara Systems",
    description:
      "MenuList and Answerlattice are operated by Neelvara Systems. Visit their official product websites.",
    images: [buildNeelvaraUrl(NEELVARA_OG_IMAGE_PATH)],
  },
};

type ProductName = NeelvaraProductName;

const PRODUCT_FOCUS: Record<ProductName, string[]> = {
  MenuList: ["Menus", "Hours", "Business profiles", "Customer-facing details"],
  Answerlattice: [
    "Knowledge",
    "Documentation",
    "Approved answers",
    "Support information",
  ],
};

const PRODUCT_CATEGORY: Record<ProductName, string> = {
  MenuList: "Public business information",
  Answerlattice: "Approved business answers",
};

export default function NeelvaraProductsPage() {
  return (
    <PageShell>
      <StructuredData />
      <section className="nv-page-hero">
        <div className="nv-wrap nv-page-hero-inner">
          <div className="nv-page-hero-copy nv-reveal">
            <span className="nv-eyebrow mono">
              <span className="nv-pip" aria-hidden="true" />
              Current products
            </span>
            <h1 className="serif">Products operated by Neelvara Systems.</h1>
            <p>
              MenuList publishes public business facts. Answerlattice keeps
              support knowledge tied to approved answers.
            </p>
          </div>
        </div>
      </section>

      <section className="nv-section nv-reveal">
        <div className="nv-wrap nv-section-frame nv-product-detail-frame">
          <div className="nv-section-head">
            <div>
              <span className="nv-eyebrow mono">
                <span className="nv-pip" aria-hidden="true" />
                Current lineup
              </span>
              <h2 className="serif">Two products. Two information jobs.</h2>
            </div>
            <p>
              Each product has its own website, product policies, support path,
              and commitments.
            </p>
          </div>
          <div className="nv-product-detail-list">
            {NEELVARA_PRODUCT_LINEUP.map((product) => (
              <article
                className="nv-product-detail-card glass"
                data-product={product.name.toLowerCase()}
                key={product.name}
              >
                <div className="nv-product-detail-head">
                  <span className="nv-product-logo-wrap" aria-hidden="true">
                    <ProductLogo name={product.name} />
                  </span>
                  <div>
                    <span className="mono">
                      {PRODUCT_CATEGORY[product.name]}
                    </span>
                    <h2 className="serif">{product.name}</h2>
                  </div>
                </div>
                <p className="nv-product-detail-tagline">{product.tagline}</p>
                <p>{product.summary}</p>
                <ul className="nv-product-focus-list">
                  {PRODUCT_FOCUS[product.name].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <a className="nv-button nv-button-glass" href={product.url}>
                  Visit {product.name}
                  <LuExternalLink aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="nv-section nv-final-section nv-reveal">
        <div className="nv-wrap nv-final-band glass">
          <div>
            <h2 className="serif">
              Product commitments stay with each product.
            </h2>
            <p>
              {NEELVARA_RELATIONSHIP_LINE} Product support, pricing, policies,
              and account questions remain on the relevant product website.
            </p>
          </div>
          <div className="nv-actions">
            <a
              className="nv-button nv-button-solid nv-button-large"
              href={`mailto:${NEELVARA_CONTACT_EMAIL}`}
            >
              Email Neelvara
              <LuMail aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
