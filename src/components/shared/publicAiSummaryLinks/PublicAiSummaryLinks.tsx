import styles from './PublicAiSummaryLinks.module.css';

type PublicAiSummaryProduct = 'menulist' | 'answerlattice' | 'campaigncue' | 'neutral';

type PublicAiSummaryLink = {
    label: string;
    href: string;
};

interface PublicAiSummaryLinksProps {
    label: string;
    prompt: string;
    product?: PublicAiSummaryProduct;
    className?: string;
}

const AI_TOOLS = [
    {
        label: 'Claude',
        buildHref: (query: string) => `https://claude.ai/new?q=${query}`,
    },
    {
        label: 'ChatGPT',
        buildHref: (query: string) => `https://chatgpt.com/?q=${query}`,
    },
    {
        label: 'Gemini',
        buildHref: (query: string) => `https://gemini.google.com/app?q=${query}`,
    },
] as const;

function buildSummaryLinks(prompt: string): PublicAiSummaryLink[] {
    const query = encodeURIComponent(prompt);

    return AI_TOOLS.map((tool) => ({
        label: tool.label,
        href: tool.buildHref(query),
    }));
}

export default function PublicAiSummaryLinks({
    label,
    prompt,
    product = 'neutral',
    className,
}: PublicAiSummaryLinksProps) {
    const links = buildSummaryLinks(prompt);
    const classNames = [
        styles.summary,
        styles[product],
        className,
    ].filter(Boolean).join(' ');

    return (
        <section className={classNames} aria-label={label}>
            <p className={styles.label}>{label}</p>
            <div className={styles.links}>
                {links.map((link) => (
                    <a
                        key={link.label}
                        className={styles.link}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${link.label}: ${label}`}
                    >
                        <span aria-hidden className={styles.mark}>{link.label.slice(0, 1)}</span>
                        <span>{link.label}</span>
                    </a>
                ))}
            </div>
        </section>
    );
}
