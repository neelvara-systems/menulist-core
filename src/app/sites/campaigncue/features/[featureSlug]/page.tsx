import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
    LuArrowRight,
    LuBadgeCheck,
    LuBarChart3,
    LuCheckCircle2,
    LuDownload,
    LuFileDown,
    LuLayoutDashboard,
    LuMegaphone,
    LuPalette,
    LuShieldAlert,
    LuShieldCheck,
    LuSparkles,
    LuUpload,
    LuWorkflow,
} from "react-icons/lu";
import {
    CAMPAIGNCUE_WEBSITE_FEATURES,
    getCampaignCueWebsiteFeature,
    type CampaignCueWebsiteFeature,
} from "@constant/campaigncue/websiteFeatures";
import {
    CAMPAIGNCUE_LOCAL_PATH_PREFIX,
    CAMPAIGNCUE_SITE_DESCRIPTION,
    CAMPAIGNCUE_SITE_TITLE,
    buildCampaignCueUrl,
} from "../../siteConfig";
import CampaignCueAiSummary from "../../components/CampaignCueAiSummary";
import CampaignCueMobileNavigation from "../../components/CampaignCueMobileNavigation";

export const dynamic = "force-dynamic";

type PageProps = {
    params: Promise<{
        featureSlug: string;
    }>;
};

type CampaignCueFeatureProofImage = {
    src: string;
    alt: string;
    caption: string;
};

const CAMPAIGNCUE_FEATURE_PROOF_IMAGES = {
    "daily-desk": {
        src: "/campaigncue-website-assets/dummy/campaigncue-feature-daily-desk.webp",
        alt: "Sample CampaignCue Daily Campaign Desk showing a recommended lunch cue, checked facts, campaign pack outputs, and result memory.",
        caption: "Sample Daily Campaign Desk output with dummy business data.",
    },
    "pack-studio": {
        src: "/campaigncue-website-assets/dummy/campaigncue-feature-pack-studio.webp",
        alt: "Sample CampaignCue Campaign Pack Studio showing grouped outputs, proof notes, and manual delivery controls.",
        caption: "Dummy Campaign Pack Studio image for source-backed export packs.",
    },
    "creative-studio": {
        src: "/campaigncue-website-assets/dummy/campaigncue-feature-creative-studio.webp",
        alt: "Sample CampaignCue Creative Studio showing a campaign asset, protected source text, review panel, and export checks.",
        caption: "Dummy Creative Studio asset showing protected text and export checks.",
    },
    cuelayers: {
        src: "/campaigncue-website-assets/dummy/campaigncue-feature-cuelayers.webp",
        alt: "Sample CampaignCue CueLayers flow showing original flat image preservation, editable layer candidates, and flat-safe fallback.",
        caption: "Dummy CueLayers image showing conservative image reuse.",
    },
    "trust-center": {
        src: "/campaigncue-website-assets/dummy/campaigncue-feature-trust-center.webp",
        alt: "Sample CampaignCue Creative Trust Center showing claim, source, risk, and action rows before handoff.",
        caption: "Dummy trust-center matrix showing review posture before handoff.",
    },
    "proof-deck": {
        src: "/campaigncue-website-assets/dummy/campaigncue-feature-proof-deck.webp",
        alt: "Sample CampaignCue proof deck showing a review brief, Brand Playbook note, source trace, UGC consent, and manual export boundary.",
        caption: "Dummy proof deck image for review-ready handoff.",
    },
    templates: {
        src: "/campaigncue-website-assets/dummy/campaigncue-feature-reusable-templates.webp",
        alt: "Sample CampaignCue reusable pack template flow showing save, refresh, review, and export steps.",
        caption: "Dummy reusable-pack flow showing fact refresh before export.",
    },
} satisfies Record<CampaignCueWebsiteFeature["previewKind"], CampaignCueFeatureProofImage>;

export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const params = await props.params;
    const feature = getCampaignCueWebsiteFeature(params.featureSlug);

    if (!feature) {
        return {
            title: CAMPAIGNCUE_SITE_TITLE,
            description: CAMPAIGNCUE_SITE_DESCRIPTION,
        };
    }

    return {
        title: `${feature.title} - CampaignCue`,
        description: feature.metaDescription,
        alternates: { canonical: buildCampaignCueUrl(feature.path) },
        openGraph: {
            title: `${feature.title} - CampaignCue`,
            description: feature.metaDescription,
            url: buildCampaignCueUrl(feature.path),
            siteName: "CampaignCue",
            type: "website",
        },
    };
}

async function getBasePath(): Promise<string> {
    try {
        const headerList = (await headers());
        const aliasBasePath = headerList.get("x-product-base-path") || "";
        if (aliasBasePath) return aliasBasePath;

        const host = headerList.get("host") || "";
        const productId = headerList.get("x-product-id");
        const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
        return productId && isLocalhost ? CAMPAIGNCUE_LOCAL_PATH_PREFIX : "";
    } catch {
        return "";
    }
}

function withBasePath(basePath: string, href: string): string {
    if (href.startsWith("#") || href.startsWith("mailto:")) return href;
    if (href === "/") return basePath || "/";
    return `${basePath}${href}`;
}

function getActionLabel(title: string): string {
    return title.split(/\s+/)[0]?.replace(/[^A-Za-z]/g, "") || "Work";
}

function BrandMark() {
    return (
        <span className="campaigncue-brand-mark" aria-hidden="true">
            <LuMegaphone />
        </span>
    );
}

function FeatureSection({
    eyebrow,
    title,
    children,
}: {
    eyebrow: string;
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="campaigncue-feature-section">
            <div className="campaigncue-feature-section-heading">
                <span>{eyebrow}</span>
                <h2>{title}</h2>
            </div>
            {children}
        </section>
    );
}

function MiniChrome({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="campaigncue-feature-preview-window">
            <div className="campaigncue-window-bar">
                <span />
                <span />
                <span />
                <strong>{title}</strong>
            </div>
            {children}
        </div>
    );
}

function CampaignCueFeatureProofFigure({ image }: { image: CampaignCueFeatureProofImage }) {
    return (
        <figure className="campaigncue-product-proof campaigncue-product-proof--feature">
            <img src={image.src} alt={image.alt} loading="lazy" decoding="async" />
            <figcaption>{image.caption}</figcaption>
        </figure>
    );
}

function DailyDeskPreview() {
    return (
        <MiniChrome title="Daily desk">
            <div className="campaigncue-feature-desk-preview">
                <aside>
                    <span className="is-active">Today</span>
                    <span>Ideas</span>
                    <span>Exports</span>
                    <span>Memory</span>
                </aside>
                <section>
                    <span>
                        <LuLayoutDashboard aria-hidden="true" />
                        Recommended today
                    </span>
                    <h3>Lunch combo needs a push</h3>
                    <p>Photo, price, pickup link, Google update, WhatsApp status, and counter card are ready.</p>
                    <div>
                        <em>No owner action needed</em>
                        <em>Export ready</em>
                    </div>
                </section>
            </div>
        </MiniChrome>
    );
}

function PackStudioPreview() {
    const outputs = ["WhatsApp text", "Google local fields", "Story creative", "Poster", "Staff note", "Proof deck"];

    return (
        <MiniChrome title="Campaign pack">
            <div className="campaigncue-feature-pack-preview">
                <section>
                    <span>Source cue</span>
                    <h3>Promote weekend offer</h3>
                    <p>Use current price, booking link, product photo, and manual delivery notes.</p>
                </section>
                <div>
                    {outputs.map((output) => (
                        <span key={output}>
                            <LuCheckCircle2 aria-hidden="true" />
                            {output}
                        </span>
                    ))}
                </div>
            </div>
        </MiniChrome>
    );
}

function CreativeStudioPreview() {
    return (
        <MiniChrome title="Creative Studio">
            <div className="campaigncue-feature-editor-preview">
                <aside>
                    <span>Text</span>
                    <span>Image</span>
                    <span>Brand</span>
                    <span>Export</span>
                </aside>
                <section>
                    <div>
                        <span>Source locked</span>
                        <strong>Paneer tikka lunch bowl</strong>
                        <em>Today 12-3 PM</em>
                    </div>
                </section>
                <aside>
                    <span>Protected text</span>
                    <span>Check facts</span>
                    <span>Download PNG</span>
                </aside>
            </div>
        </MiniChrome>
    );
}

function CueLayersPreview() {
    return (
        <MiniChrome title="CueLayers">
            <div className="campaigncue-feature-cuelayers-preview">
                <section>
                    <LuUpload aria-hidden="true" />
                    <strong>Flat image</strong>
                    <span>Original preserved</span>
                </section>
                <LuArrowRight aria-hidden="true" />
                <section>
                    <span>Original locked</span>
                    <span>Add verified text</span>
                    <span>Add shapes or QR</span>
                    <span>Save and export</span>
                </section>
            </div>
        </MiniChrome>
    );
}

function TrustCenterPreview() {
    const rows = [
        ["Lunch combo today 12-3 PM", "Menu price", "Clear", "Export ready"],
        ["Best in town", "No ranking source", "Blocked", "Rewrite"],
        ["Visible results", "No proof", "Needs review", "Owner check"],
    ];

    return (
        <MiniChrome title="Creative Trust Center">
            <div className="campaigncue-feature-trust-preview">
                <div aria-hidden="true">
                    <span>Claim</span>
                    <span>Source</span>
                    <span>Risk</span>
                    <span>Action</span>
                </div>
                {rows.map((row) => (
                    <div key={row[0]}>
                        {row.map((cell) => (
                            <span key={cell}>{cell}</span>
                        ))}
                    </div>
                ))}
            </div>
        </MiniChrome>
    );
}

function ProofDeckPreview() {
    return (
        <MiniChrome title="Proof deck">
            <div className="campaigncue-feature-proof-preview">
                <section>
                    <span>Review brief</span>
                    <h3>Lunch combo campaign</h3>
                    <p>Brand direction, source trace, UGC/reel notes, trust checks, and manual delivery boundary.</p>
                </section>
                <div>
                    <span>Brand Playbook</span>
                    <span>Source trace</span>
                    <span>UGC consent</span>
                    <span>Manual export</span>
                </div>
            </div>
        </MiniChrome>
    );
}

function TemplatePreview() {
    return (
        <MiniChrome title="Reusable template">
            <div className="campaigncue-feature-template-preview">
                {[
                    ["Save", "Save useful pack", "Lunch, slot-fill, event, or approval pack"],
                    ["Refresh", "Update facts", "Price, date, photo, location, and CTA"],
                    ["Export", "Export again", "Checked files and copy for manual use"],
                ].map(([label, title, detail]) => (
                    <section key={title}>
                        <span>{label}</span>
                        <strong>{title}</strong>
                        <p>{detail}</p>
                    </section>
                ))}
            </div>
        </MiniChrome>
    );
}

function CampaignCueFeaturePreview({ feature }: { feature: CampaignCueWebsiteFeature }) {
    switch (feature.previewKind) {
        case "daily-desk":
            return <DailyDeskPreview />;
        case "pack-studio":
            return <PackStudioPreview />;
        case "creative-studio":
            return <CreativeStudioPreview />;
        case "cuelayers":
            return <CueLayersPreview />;
        case "trust-center":
            return <TrustCenterPreview />;
        case "proof-deck":
            return <ProofDeckPreview />;
        case "templates":
            return <TemplatePreview />;
        default:
            return <PackStudioPreview />;
    }
}

function RelatedFeatureLinks({ feature, basePath }: { feature: CampaignCueWebsiteFeature; basePath: string }) {
    const relatedFeatures = feature.relatedFeatureSlugs
        .map((slug) => getCampaignCueWebsiteFeature(slug))
        .filter((item): item is CampaignCueWebsiteFeature => Boolean(item));

    return (
        <div className="campaigncue-feature-related">
            {relatedFeatures.map((item) => (
                <a href={withBasePath(basePath, item.path)} key={item.slug}>
                    <span>{item.eyebrow}</span>
                    <strong>{item.title}</strong>
                    <LuArrowRight aria-hidden="true" />
                </a>
            ))}
        </div>
    );
}

export default async function CampaignCueFeaturePage(props: PageProps) {
    const params = await props.params;
    const feature = getCampaignCueWebsiteFeature(params.featureSlug);
    if (!feature) notFound();

    const basePath = await getBasePath();

    return (
        <main className="campaigncue-site campaigncue-feature-page">
            <header className="campaigncue-nav">
                <a className="campaigncue-brand" href={withBasePath(basePath, "/")}>
                    <BrandMark />
                    <strong>CampaignCue</strong>
                </a>
                <nav aria-label="CampaignCue feature navigation">
                    <a href={withBasePath(basePath, "/#use-cases")}>Features</a>
                    <a href={withBasePath(basePath, "/#studio")}>Packs</a>
                    <a href={withBasePath(basePath, "/#trust")}>Trust</a>
                    <a href={withBasePath(basePath, "/#faq")}>FAQ</a>
                </nav>
                <a className="campaigncue-nav-action" href={withBasePath(basePath, "/app")}>
                    App
                    <LuArrowRight aria-hidden="true" />
                </a>
                <CampaignCueMobileNavigation basePath={basePath} />
            </header>

            <section className="campaigncue-feature-hero">
                <div className="campaigncue-feature-hero-copy">
                    <a className="campaigncue-feature-breadcrumb" href={withBasePath(basePath, "/#use-cases")}>
                        CampaignCue features
                    </a>
                    <span>{feature.eyebrow}</span>
                    <h1>{feature.heroTitle}</h1>
                    <p>{feature.description}</p>
                    <div className="campaigncue-actions">
                        <a className="campaigncue-primary-action" href={withBasePath(basePath, "/app")}>
                            Open workspace
                            <LuArrowRight aria-hidden="true" />
                        </a>
                        <a className="campaigncue-secondary-action" href={withBasePath(basePath, "/#workflow")}>
                            See product loop
                        </a>
                    </div>
                </div>
                <div className={`campaigncue-feature-preview is-${feature.previewKind}`}>
                    <CampaignCueFeaturePreview feature={feature} />
                    <CampaignCueFeatureProofFigure image={CAMPAIGNCUE_FEATURE_PROOF_IMAGES[feature.previewKind]} />
                    <p>{feature.dashboardNote}</p>
                </div>
            </section>

            <section className="campaigncue-feature-outcome">
                <div>
                    <span>Owner problem</span>
                    <p>{feature.ownerProblem}</p>
                </div>
                <div>
                    <span>CampaignCue outcome</span>
                    <p>{feature.outcome}</p>
                </div>
            </section>

            <FeatureSection eyebrow="How it works" title={`${feature.title} in the owner workflow.`}>
                <div className="campaigncue-feature-steps">
                    {feature.steps.map((step) => (
                        <article key={step.title}>
                            <span>{getActionLabel(step.title)}</span>
                            <strong>{step.title}</strong>
                            <p>{step.detail}</p>
                        </article>
                    ))}
                </div>
            </FeatureSection>

            <FeatureSection eyebrow="What owners can see" title="The screen explains the work before asking for action.">
                <div className="campaigncue-feature-proof-grid">
                    {feature.proofRows.map((row) => (
                        <article key={row.label}>
                            <span>{row.label}</span>
                            <strong>{row.value}</strong>
                            <em>{row.status}</em>
                        </article>
                    ))}
                </div>
            </FeatureSection>

            <FeatureSection eyebrow="Why it matters" title="Built for SMB owners who need useful work, not another system to manage.">
                <div className="campaigncue-feature-benefits">
                    {feature.benefits.map((benefit) => (
                        <span key={benefit}>
                            <LuCheckCircle2 aria-hidden="true" />
                            {benefit}
                        </span>
                    ))}
                </div>
            </FeatureSection>

            <section className="campaigncue-feature-boundary">
                <div>
                    <span>Boundary</span>
                    <h2>What this feature deliberately does not promise.</h2>
                </div>
                <ul>
                    {feature.boundaries.map((boundary) => (
                        <li key={boundary}>
                            <LuShieldAlert aria-hidden="true" />
                            {boundary}
                        </li>
                    ))}
                </ul>
            </section>

            <section className="campaigncue-feature-system-map">
                <div>
                    <LuWorkflow aria-hidden="true" />
                    <strong>Connected to the CampaignCue loop</strong>
                    <p>
                        Business facts, campaign packs, Creative Studio, CueLayers, trust checks, exports, and result
                        memory stay part of one source-backed product path.
                    </p>
                </div>
                <div>
                    <span>
                        <LuLayoutDashboard aria-hidden="true" />
                        Daily cue
                    </span>
                    <span>
                        <LuSparkles aria-hidden="true" />
                        Pack prepared
                    </span>
                    <span>
                        <LuPalette aria-hidden="true" />
                        Asset edited
                    </span>
                    <span>
                        <LuShieldCheck aria-hidden="true" />
                        Trust checked
                    </span>
                    <span>
                        <LuDownload aria-hidden="true" />
                        Exported
                    </span>
                    <span>
                        <LuBarChart3 aria-hidden="true" />
                        Result remembered
                    </span>
                </div>
            </section>

            <FeatureSection eyebrow="FAQ" title="Plain answers for this feature.">
                <div className="campaigncue-feature-faq">
                    {feature.faq.map((item) => (
                        <details key={item.question}>
                            <summary>{item.question}</summary>
                            <p>{item.answer}</p>
                        </details>
                    ))}
                </div>
            </FeatureSection>

            <FeatureSection eyebrow="Related features" title="See the next part of the CampaignCue workflow.">
                <RelatedFeatureLinks feature={feature} basePath={basePath} />
            </FeatureSection>

            <section className="campaigncue-final-cta">
                <div>
                    <span>Export-first workflow</span>
                    <h2>Open the workspace and build from real business facts.</h2>
                    <p>
                        CampaignCue keeps the owner in control: source data in, checked campaign pack out,
                        manual delivery all the way through.
                    </p>
                </div>
                <a className="campaigncue-primary-action" href={withBasePath(basePath, "/app")}>
                    Open workspace
                    <LuArrowRight aria-hidden="true" />
                </a>
            </section>

            <footer className="campaigncue-footer campaigncue-feature-footer">
                <div className="campaigncue-footer-brand">
                    <a className="campaigncue-brand" href={withBasePath(basePath, "/")}>
                        <BrandMark />
                        <strong>CampaignCue</strong>
                    </a>
                    <p>Campaign packs from real business data, checked before use.</p>
                    <div>
                        <span>
                            <LuBadgeCheck aria-hidden="true" />
                            Source backed
                        </span>
                        <span>
                            <LuFileDown aria-hidden="true" />
                            Export first
                        </span>
                    </div>
                </div>
                <div className="campaigncue-footer-groups">
                    <nav aria-label="CampaignCue feature pages">
                        <h3>Features</h3>
                        {CAMPAIGNCUE_WEBSITE_FEATURES.slice(0, 4).map((item) => (
                            <a href={withBasePath(basePath, item.path)} key={item.slug}>
                                {item.title}
                            </a>
                        ))}
                    </nav>
                    <nav aria-label="CampaignCue review pages">
                        <h3>Review</h3>
                        {CAMPAIGNCUE_WEBSITE_FEATURES.slice(4).map((item) => (
                            <a href={withBasePath(basePath, item.path)} key={item.slug}>
                                {item.title}
                            </a>
                        ))}
                    </nav>
                    <nav aria-label="CampaignCue product links">
                        <h3>Product</h3>
                        <a href={withBasePath(basePath, "/#workflow")}>Product loop</a>
                        <a href={withBasePath(basePath, "/#delivery")}>Delivery boundary</a>
                        <a href={withBasePath(basePath, "/#faq")}>FAQ</a>
                    </nav>
                    <nav aria-label="CampaignCue app links">
                        <h3>Workspace</h3>
                        <a href={withBasePath(basePath, "/app")}>Open workspace</a>
                        <a href={withBasePath(basePath, "/#starts")}>Owner examples</a>
                        <a href={withBasePath(basePath, "/#trust")}>Trust checks</a>
                    </nav>
                </div>
                <CampaignCueAiSummary />
                <div className="campaigncue-footer-bottom">
                    <span>© 2026 CampaignCue</span>
                    <span>Public feature pages explain the workflow. Owner data stays inside the app.</span>
                </div>
            </footer>
        </main>
    );
}
