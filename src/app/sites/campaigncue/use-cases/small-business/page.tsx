import type { Metadata } from "next";
import { headers } from "next/headers";
import {
    LuArrowRight,
    LuBarChart3,
    LuCheckCircle2,
    LuClipboardCheck,
    LuDownload,
    LuFileDown,
    LuImage,
    LuLayers,
    LuLink,
    LuMegaphone,
    LuMessageSquare,
    LuPalette,
    LuRadar,
    LuRefreshCcw,
    LuShieldAlert,
    LuShieldCheck,
    LuUpload,
    LuWorkflow,
} from "react-icons/lu";
import {
    CAMPAIGNCUE_SMALL_BUSINESS_USE_CASE,
    CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS,
} from "@constant/campaigncue/websiteUseCases";
import { CAMPAIGNCUE_WEBSITE_FEATURE_PATHS } from "@constant/campaigncue/websiteFeatures";
import {
    CAMPAIGNCUE_LOCAL_PATH_PREFIX,
    CAMPAIGNCUE_SITE_DESCRIPTION,
    buildCampaignCueUrl,
} from "../../siteConfig";
import CampaignCueAiSummary from "../../components/CampaignCueAiSummary";
import CampaignCueMobileNavigation from "../../components/CampaignCueMobileNavigation";

export const metadata: Metadata = {
    title: `${CAMPAIGNCUE_SMALL_BUSINESS_USE_CASE.title} - CampaignCue`,
    description: CAMPAIGNCUE_SMALL_BUSINESS_USE_CASE.metaDescription,
    alternates: { canonical: buildCampaignCueUrl(CAMPAIGNCUE_SMALL_BUSINESS_USE_CASE.path) },
    openGraph: {
        title: `${CAMPAIGNCUE_SMALL_BUSINESS_USE_CASE.title} - CampaignCue`,
        description: CAMPAIGNCUE_SMALL_BUSINESS_USE_CASE.metaDescription,
        url: buildCampaignCueUrl(CAMPAIGNCUE_SMALL_BUSINESS_USE_CASE.path),
        siteName: "CampaignCue",
        type: "website",
    },
};

function serializeJsonLd(data: Record<string, unknown>): string {
    return JSON.stringify(data).replace(/</g, "\\u003c");
}

const JSON_LD = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "SoftwareApplication",
            name: "CampaignCue",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: buildCampaignCueUrl(CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS.smallBusiness),
            description: CAMPAIGNCUE_SITE_DESCRIPTION,
        },
        {
            "@type": "FAQPage",
            mainEntity: CAMPAIGNCUE_SMALL_BUSINESS_USE_CASE.faq.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: {
                    "@type": "Answer",
                    text: item.answer,
                },
            })),
        },
    ],
};

function getBasePath(): string {
    try {
        const headerList = headers();
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

function BrandMark() {
    return (
        <span className="campaigncue-brand-mark" aria-hidden="true">
            <LuMegaphone />
        </span>
    );
}

function UseCaseHeroPreview() {
    const outputs = CAMPAIGNCUE_SMALL_BUSINESS_USE_CASE.assets.slice(0, 4);

    return (
        <div className="campaigncue-use-case-preview" aria-label="Small business CampaignCue pack preview">
            <div className="campaigncue-use-case-floating-assets" aria-hidden="true">
                {CAMPAIGNCUE_SMALL_BUSINESS_USE_CASE.assets.map((asset, index) => (
                    <div className={`campaigncue-use-case-floating-card is-${asset.tone} is-${index + 1}`} key={asset.title}>
                        <span>{asset.label}</span>
                        <strong>{asset.title}</strong>
                        <em>{asset.note}</em>
                    </div>
                ))}
            </div>
            <div className="campaigncue-feature-preview-window">
                <div className="campaigncue-window-bar">
                    <span />
                    <span />
                    <span />
                    <strong>Small business pack</strong>
                </div>
                <div className="campaigncue-use-case-window">
                    <aside aria-label="Small business preview navigation">
                        <span className="is-active">Today</span>
                        <span>Facts</span>
                        <span>Pack</span>
                        <span>Review</span>
                    </aside>
                    <section>
                        <div className="campaigncue-use-case-kicker">
                            <LuRadar aria-hidden="true" />
                            <span>Ready after fact check</span>
                        </div>
                        <h2>Promote the lunch combo before 2 PM.</h2>
                        <p>Photo, price, pickup link, WhatsApp text, Google update, story creative, and counter note are ready.</p>
                        <div className="campaigncue-use-case-hero-checks">
                            <span>
                                <LuCheckCircle2 aria-hidden="true" />
                                Price checked
                            </span>
                            <span>
                                <LuShieldCheck aria-hidden="true" />
                                Export first
                            </span>
                        </div>
                    </section>
                    <div className="campaigncue-use-case-pack-list">
                        {outputs.map((asset) => (
                            <div key={asset.title}>
                                <LuFileDown aria-hidden="true" />
                                <span>{asset.label}</span>
                                <strong>{asset.title}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SourceToPackVisual() {
    return (
        <div className="campaigncue-use-case-source-pack" aria-label="Small business source to pack flow">
            <section>
                <span>Source facts</span>
                <strong>Lunch combo</strong>
                <p>Rs 249, today 12-3 PM, pickup link, owner photo, and staff note.</p>
                <div>
                    <span>Photo ready</span>
                    <span>Price ready</span>
                    <span>Link ready</span>
                </div>
            </section>
            <LuArrowRight aria-hidden="true" />
            <section>
                <span>Campaign pack</span>
                <strong>Ready to export</strong>
                <p>WhatsApp, Google, story, print, reel brief, and trust notes from the same source.</p>
                <div>
                    <span>Copy</span>
                    <span>Download</span>
                    <span>Manual task</span>
                </div>
            </section>
        </div>
    );
}

function ReusePreview() {
    return (
        <div className="campaigncue-use-case-reuse-preview" aria-label="Creative Studio and CueLayers reuse preview">
            <section>
                <LuUpload aria-hidden="true" />
                <strong>Existing image</strong>
                <span>Original preserved</span>
            </section>
            <section>
                <span>Creative Studio</span>
                <strong>Change the offer without starting over.</strong>
                <p>Protected text, brand guidance, resize presets, and export checks stay nearby.</p>
            </section>
            <section>
                <span>Layer candidates</span>
                <span>Flat fallback</span>
                <span>Review flags</span>
            </section>
        </div>
    );
}

export default function CampaignCueSmallBusinessUseCasePage() {
    const basePath = getBasePath();
    const useCase = CAMPAIGNCUE_SMALL_BUSINESS_USE_CASE;

    return (
        <main className="campaigncue-site campaigncue-use-case-page">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(JSON_LD) }}
            />
            <header className="campaigncue-nav">
                <a className="campaigncue-brand" href={withBasePath(basePath, "/")}>
                    <BrandMark />
                    <strong>CampaignCue</strong>
                </a>
                <nav aria-label="CampaignCue use-case navigation">
                    <a href={withBasePath(basePath, "/")}>Home</a>
                    <a href={withBasePath(basePath, "/#studio")}>Packs</a>
                    <a href={withBasePath(basePath, CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeStudio)}>Studio</a>
                    <a href={withBasePath(basePath, CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.cueLayers)}>CueLayers</a>
                    <a href="#faq">FAQ</a>
                </nav>
                <a className="campaigncue-nav-action" href={withBasePath(basePath, "/app")}>
                    App
                    <LuArrowRight aria-hidden="true" />
                </a>
                <CampaignCueMobileNavigation basePath={basePath} />
            </header>

            <section className="campaigncue-use-case-hero">
                <div className="campaigncue-use-case-hero-copy">
                    <a className="campaigncue-feature-breadcrumb" href={withBasePath(basePath, "/#use-cases")}>
                        CampaignCue use cases
                    </a>
                    <span>{useCase.eyebrow}</span>
                    <h1>{useCase.heroTitle}</h1>
                    <p>{useCase.description}</p>
                    <div className="campaigncue-actions">
                        <a className="campaigncue-primary-action" href={withBasePath(basePath, "/app")}>
                            Open workspace
                            <LuArrowRight aria-hidden="true" />
                        </a>
                        <a className="campaigncue-secondary-action" href="#pack-output">
                            See the pack
                        </a>
                    </div>
                    <div className="campaigncue-use-case-pills" aria-label="Small business page boundaries">
                        <span>
                            <LuCheckCircle2 aria-hidden="true" />
                            No blank prompt
                        </span>
                        <span>
                            <LuDownload aria-hidden="true" />
                            Export before posting
                        </span>
                        <span>
                            <LuShieldCheck aria-hidden="true" />
                            Review stays visible
                        </span>
                    </div>
                </div>
                <UseCaseHeroPreview />
            </section>

            <section className="campaigncue-use-case-proof-strip" aria-label="CampaignCue small business workflow">
                <span>Business facts</span>
                <span>Daily cue</span>
                <span>Pack outputs</span>
                <span>Creative reuse</span>
                <span>Manual export</span>
                <span>Result memory</span>
            </section>

            <section className="campaigncue-use-case-section">
                <div className="campaigncue-use-case-section-heading">
                    <span>Owner questions</span>
                    <h2>The page answers the questions owners already have.</h2>
                </div>
                <div className="campaigncue-use-case-question-grid">
                    {useCase.ownerQuestions.map((item) => (
                        <article key={item.question}>
                            <strong>{item.question}</strong>
                            <p>{item.answer}</p>
                            <span>{item.proof}</span>
                        </article>
                    ))}
                </div>
            </section>

            <section className="campaigncue-use-case-section campaigncue-use-case-pack-section" id="pack-output">
                <div>
                    <div className="campaigncue-use-case-section-heading">
                        <span>From one input</span>
                        <h2>One local cue becomes the useful pieces, not a wall of ideas.</h2>
                        <p>
                            The CampaignCue version of an asset-heavy creative page is practical: show the fact,
                            show the outputs, and show what the owner can copy or download.
                        </p>
                    </div>
                    <SourceToPackVisual />
                </div>
                <div className="campaigncue-use-case-asset-grid" aria-label="Small business campaign assets">
                    {useCase.assets.map((asset) => (
                        <article className={`is-${asset.tone}`} key={asset.title}>
                            <span>{asset.label}</span>
                            <strong>{asset.title}</strong>
                            <em>{asset.note}</em>
                        </article>
                    ))}
                </div>
            </section>

            <section className="campaigncue-use-case-section">
                <div className="campaigncue-use-case-section-heading">
                    <span>Business types</span>
                    <h2>Concrete local examples make the product easier to understand.</h2>
                </div>
                <div className="campaigncue-use-case-scenarios">
                    {useCase.scenarios.map((scenario) => (
                        <article key={scenario.businessType}>
                            <span>{scenario.businessType}</span>
                            <h3>{scenario.source}</h3>
                            <p>{scenario.output}</p>
                            <em>
                                <LuShieldCheck aria-hidden="true" />
                                {scenario.review}
                            </em>
                        </article>
                    ))}
                </div>
            </section>

            <section className="campaigncue-use-case-section campaigncue-use-case-steps-section">
                <div className="campaigncue-use-case-section-heading">
                    <span>Owner flow</span>
                    <h2>The whole journey stays simple enough for mobile.</h2>
                </div>
                <div className="campaigncue-use-case-steps">
                    {useCase.steps.map((step) => (
                        <article key={step.title}>
                            <span>{step.label}</span>
                            <strong>{step.title}</strong>
                            <p>{step.detail}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="campaigncue-use-case-section campaigncue-use-case-reuse-section">
                <div>
                    <div className="campaigncue-use-case-section-heading">
                        <span>Creative reuse</span>
                        <h2>Reuse the assets owners already have.</h2>
                        <p>
                            Small businesses often have old posters, generated images, and phone photos.
                            CampaignCue should help them reuse those assets safely through Creative Studio and CueLayers.
                        </p>
                    </div>
                    <div className="campaigncue-inline-checks">
                        <span>
                            <LuImage aria-hidden="true" />
                            Uploaded assets
                        </span>
                        <span>
                            <LuLayers aria-hidden="true" />
                            Layer candidates
                        </span>
                        <span>
                            <LuRefreshCcw aria-hidden="true" />
                            Repeatable packs
                        </span>
                    </div>
                </div>
                <ReusePreview />
            </section>

            <section className="campaigncue-use-case-boundary">
                <div>
                    <span>Boundaries</span>
                    <h2>Clear limits stay visible before an owner trusts the pack.</h2>
                </div>
                <ul>
                    {useCase.boundaries.map((boundary) => (
                        <li key={boundary}>
                            <LuShieldAlert aria-hidden="true" />
                            {boundary}
                        </li>
                    ))}
                </ul>
            </section>

            <section className="campaigncue-use-case-section campaigncue-use-case-system-map">
                <div>
                    <LuWorkflow aria-hidden="true" />
                    <strong>Connected to the product, not a separate landing-page promise.</strong>
                    <p>
                        Daily Campaign Desk, Campaign Pack Studio, Creative Studio, CueLayers, Trust Center,
                        export delivery, and result memory are the real surfaces behind this page.
                    </p>
                </div>
                <div>
                    <a href={withBasePath(basePath, CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.dailyCampaignDesk)}>
                        <LuRadar aria-hidden="true" />
                        Daily desk
                    </a>
                    <a href={withBasePath(basePath, CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.campaignPackStudio)}>
                        <LuMessageSquare aria-hidden="true" />
                        Pack studio
                    </a>
                    <a href={withBasePath(basePath, CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeStudio)}>
                        <LuPalette aria-hidden="true" />
                        Creative Studio
                    </a>
                    <a href={withBasePath(basePath, CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.cueLayers)}>
                        <LuLayers aria-hidden="true" />
                        CueLayers
                    </a>
                    <a href={withBasePath(basePath, CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeTrustCenter)}>
                        <LuClipboardCheck aria-hidden="true" />
                        Trust Center
                    </a>
                    <a href={withBasePath(basePath, CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.reusablePackTemplates)}>
                        <LuBarChart3 aria-hidden="true" />
                        Result memory
                    </a>
                </div>
            </section>

            <section className="campaigncue-use-case-section" id="faq">
                <div className="campaigncue-use-case-section-heading">
                    <span>FAQ</span>
                    <h2>Clear answers for small-business owners.</h2>
                </div>
                <div className="campaigncue-feature-faq">
                    {useCase.faq.map((item) => (
                        <details key={item.question}>
                            <summary>{item.question}</summary>
                            <p>{item.answer}</p>
                        </details>
                    ))}
                </div>
            </section>

            <section className="campaigncue-final-cta">
                <div>
                    <span>Small business workflow</span>
                    <h2>Open the workspace and turn today&apos;s facts into a checked pack.</h2>
                    <p>
                        CampaignCue keeps the owner in control: facts in, useful campaign pack out,
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
                            <LuLink aria-hidden="true" />
                            Source backed
                        </span>
                        <span>
                            <LuDownload aria-hidden="true" />
                            Export first
                        </span>
                    </div>
                </div>
                <div className="campaigncue-footer-groups">
                    <nav aria-label="CampaignCue use-case links">
                        <h3>Use cases</h3>
                        <a href={withBasePath(basePath, CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS.smallBusiness)}>Small business</a>
                        <a href={withBasePath(basePath, "/#starts")}>Restaurants</a>
                        <a href={withBasePath(basePath, "/#starts")}>Salons</a>
                        <a href={withBasePath(basePath, "/#starts")}>Retail and services</a>
                    </nav>
                    <nav aria-label="CampaignCue feature links">
                        <h3>Features</h3>
                        <a href={withBasePath(basePath, CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.dailyCampaignDesk)}>Daily Campaign Desk</a>
                        <a href={withBasePath(basePath, CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.campaignPackStudio)}>Campaign Pack Studio</a>
                        <a href={withBasePath(basePath, CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeStudio)}>Creative Studio</a>
                        <a href={withBasePath(basePath, CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.cueLayers)}>CueLayers</a>
                    </nav>
                    <nav aria-label="CampaignCue review links">
                        <h3>Trust</h3>
                        <a href={withBasePath(basePath, CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeTrustCenter)}>Trust Center</a>
                        <a href={withBasePath(basePath, CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.brandPlaybookProofDeck)}>Brand and proof</a>
                        <a href={withBasePath(basePath, "/#delivery")}>Export-first delivery</a>
                        <a href="#faq">FAQ</a>
                    </nav>
                    <nav aria-label="CampaignCue workspace links">
                        <h3>Workspace</h3>
                        <a href={withBasePath(basePath, "/app")}>Open workspace</a>
                        <a href={withBasePath(basePath, "/#workflow")}>Product loop</a>
                        <a href={withBasePath(basePath, "/#trust")}>Trust checks</a>
                    </nav>
                </div>
                <CampaignCueAiSummary />
                <div className="campaigncue-footer-bottom">
                    <span>© 2026 CampaignCue</span>
                    <span>Public use-case pages explain the workflow. Owner data stays inside the app.</span>
                </div>
            </footer>
        </main>
    );
}
