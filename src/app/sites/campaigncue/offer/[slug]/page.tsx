import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LuArrowRight, LuBadgeCheck, LuClock3, LuMapPin, LuShieldCheck } from "react-icons/lu";
import { CAMPAIGNCUE_OFFER_PAGE_COPY } from "@constant/campaigncue/offerPage";
import { resolveCampaignCuePublicOfferPage } from "@lib/campaigncue/offerPageServer";
import { CampaignCueOfferPageSlugSchema } from "@lib/validation/campaigncueOfferPageSchemas";
import styles from "./offer.module.css";

export const dynamic = "force-dynamic";

type OfferPageProps = {
    params: Promise<{ slug: string }>;
};

async function getOffer(slugValue: string) {
    const slug = CampaignCueOfferPageSlugSchema.safeParse(slugValue);
    if (!slug.success) return null;
    try {
        return await resolveCampaignCuePublicOfferPage(slug.data);
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: OfferPageProps): Promise<Metadata> {
    const { slug } = await params;
    const offer = await getOffer(slug);
    return {
        title: offer ? `${offer.title} | ${offer.businessName}` : "Campaign unavailable",
        description: offer?.body.slice(0, 160) || "This campaign page is unavailable.",
        robots: {
            index: false,
            follow: false,
            nocache: true,
            googleBot: {
                index: false,
                follow: false,
                noarchive: true,
                noimageindex: true,
                nosnippet: true,
            },
        },
        referrer: "no-referrer",
    };
}

const formatExpiry = (value: string) => new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
}).format(new Date(value));

export default async function CampaignCueOfferPage({ params }: OfferPageProps) {
    const { slug } = await params;
    const offer = await getOffer(slug);
    if (!offer) notFound();

    return (
        <main className={styles.page} style={{ "--offer-primary": offer.theme.primaryColor } as React.CSSProperties}>
            <header className={styles.header}>
                <div className={styles.brandMark} aria-hidden="true" />
                <strong>{offer.businessName}</strong>
                <span><LuBadgeCheck size={17} /> Business details checked</span>
            </header>

            <section className={styles.offer}>
                <div className={styles.copy}>
                    <p className={styles.eyebrow}>Current campaign</p>
                    <h1>{offer.title}</h1>
                    <p className={styles.body}>{offer.body}</p>
                    {offer.locality ? (
                        <p className={styles.locality}><LuMapPin size={18} /> {offer.locality}</p>
                    ) : null}
                    <a className={styles.cta} href={offer.destination} rel="noreferrer noopener">
                        {offer.ctaLabel}
                        <LuArrowRight size={19} />
                    </a>
                </div>

                <aside className={styles.details} aria-label="Campaign details">
                    <div>
                        <LuShieldCheck size={20} />
                        <span>
                            <strong>Checked before sharing</strong>
                            <small>This page uses the business details approved for this campaign.</small>
                        </span>
                    </div>
                    <div>
                        <LuClock3 size={20} />
                        <span>
                            <strong>Available until {formatExpiry(offer.expiresAt)}</strong>
                            <small>Contact the business to confirm current availability.</small>
                        </span>
                    </div>
                    {offer.terms.length ? (
                        <div className={styles.terms}>
                            <strong>Details</strong>
                            <ul>{offer.terms.map((term) => <li key={term}>{term}</li>)}</ul>
                        </div>
                    ) : null}
                </aside>
            </section>

            <footer className={styles.footer}>
                <span>{offer.businessName}</span>
                <span>{CAMPAIGNCUE_OFFER_PAGE_COPY.noTracking}</span>
            </footer>
        </main>
    );
}
