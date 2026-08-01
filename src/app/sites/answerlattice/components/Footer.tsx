import { LuArrowRight } from 'react-icons/lu';
import PublicAiSummaryLinks from '@/components/shared/publicAiSummaryLinks/PublicAiSummaryLinks';
import AnswerlatticeLink from './AnswerlatticeLink';
import AnswerlatticeLogoMark from './AnswerlatticeLogoMark';
import AnswerlatticeThemeSwitcher from './AnswerlatticeThemeSwitcher';

const FOOTER_LINKS = {
    Product: [
        { label: 'Product', href: '/product' },
        { label: 'Set up support', href: '/product/launch-setup' },
        { label: 'In-app help widget', href: '/product/page-aware-widget' },
        { label: 'Help center and tickets', href: '/product/support-control' },
        { label: 'Review approved answers', href: '/product/knowledge-governance' },
    ],
    Features: [
        { label: 'Team Access', href: '/product/team-access' },
        { label: 'Knowledge Intake', href: '/product/knowledge-intake' },
        { label: 'Knowledge Base', href: '/product/knowledge-base' },
        { label: 'FAQ Management', href: '/product/faq-management' },
        { label: 'Changelog', href: '/product/changelog' },
        { label: 'Tickets', href: '/product/tickets' },
        { label: 'Support Board', href: '/product/support-board' },
        { label: 'Feedback Review', href: '/product/feedback-review' },
        { label: 'Workflow Notifications', href: '/product/workflow-notifications' },
        { label: 'Proactive Help', href: '/product/proactive-help' },
    ],
    Evaluate: [
        { label: 'Use Cases', href: '/use-cases' },
        { label: 'AI-built SaaS', href: '/use-cases/ai-built-saas' },
        { label: 'Solo Founders', href: '/use-cases/founders' },
        { label: 'Small SaaS Teams', href: '/use-cases/small-saas-teams' },
        { label: 'Studios & Agencies', href: '/use-cases/studios-agencies' },
        { label: 'Support Teams', href: '/use-cases/support-teams' },
        { label: 'Product Teams', href: '/use-cases/product-teams' },
        { label: 'Engineering Teams', href: '/use-cases/engineering' },
        { label: 'Demo', href: '/demo' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Create workspace', href: '/get-started' },
        { label: 'Page-Aware Widget', href: '/page-aware-support-widget' },
        { label: 'Hosted Help Center', href: '/hosted-help-center-for-saas' },
    ],
    Resources: [
        { label: 'Resources', href: '/resources' },
        { label: 'Operating Guide', href: '/resources/answerlattice-operating-guide' },
        { label: 'Pre-Onboarding Kit', href: '/pre-onboarding' },
        { label: 'Pre-Onboarding Guide', href: '/pre-onboarding/guide' },
        { label: 'Widget Install', href: '/install' },
        { label: 'Developer Docs', href: '/developers' },
        { label: 'Developer Quickstarts', href: '/quickstarts' },
        { label: 'Comparisons', href: '/comparisons' },
        { label: 'Integrations', href: '/integrations' },
        { label: 'ROI Calculator', href: '/roi-calculator' },
        { label: 'Proof Pack', href: '/proof' },
    ],
    Trust: [
        { label: 'Updates', href: '/updates' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Trust and Data Handling', href: '/trust' },
        { label: 'Security', href: '/security' },
        { label: 'Security One-Pager', href: '/security-one-pager' },
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
        { label: 'Privacy Policy', href: '/privacy-policy' },
        { label: 'Terms of Service', href: '/terms-of-service' },
    ],
};

const ANSWERLATTICE_AI_SUMMARY_PROMPT = [
    'Please summarize what AnswerLattice does, who it is for, and how it turns scattered product/support context into governed answers, hosted help, widget support, feedback review, and knowledge governance.',
    'Use https://answerlattice.com and https://answerlattice.com/llms.txt as context.',
    'Do not describe AnswerLattice as a generic chatbot, helpdesk replacement, documentation CMS, autonomous AI support system, or business analytics platform.',
].join(' ');

export default function AnswerlatticeFooter({ basePath = '' }: { basePath?: string }) {
    return (
        <footer className="al-site-footer">
            <div className="al-site-footer__inner">
                <div className="al-site-footer__top">
                    <div className="al-site-footer__brand" data-answerlattice-reveal>
                        <div className="al-site-footer__brand-row">
                            <AnswerlatticeLogoMark idPrefix="answerlattice-footer" height={34} />
                            <span>AnswerLattice</span>
                        </div>
                        <p>
                            The governed support layer for founder-led SaaS.
                            Turns scattered docs, tickets, releases, screenshots, recordings, notes, and repeated replies into widget help, hosted docs, fallback tickets, feedback, and reviewable answers.
                        </p>
                        <div className="al-site-footer__actions">
                            <AnswerlatticeLink basePath={basePath} href="/get-started" className="al-site-footer__cta">
                                Create workspace
                                <LuArrowRight aria-hidden size={16} />
                            </AnswerlatticeLink>
                            <AnswerlatticeLink basePath={basePath} href="/demo" className="al-site-footer__plain-link">See 60-sec demo</AnswerlatticeLink>
                        </div>
                    </div>

                    <nav className="al-site-footer__nav" aria-label="AnswerLattice footer navigation">
                        {Object.entries(FOOTER_LINKS).map(([title, links]) => (
                            <div key={title} className="al-site-footer__column" data-answerlattice-reveal-item>
                                <h4>/{title}</h4>
                                <ul>
                                    {links.map((link) => (
                                        <li key={`${link.href}:${link.label}`}>
                                            <AnswerlatticeLink
                                                basePath={basePath}
                                                href={link.href}
                                                className="al-site-footer__link"
                                            >
                                                {link.label}
                                            </AnswerlatticeLink>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </div>

                <div className="al-site-footer__wordmark" data-answerlattice-reveal aria-hidden>
                    <AnswerlatticeLogoMark
                        idPrefix="answerlattice-footer-wordmark"
                        className="al-site-footer__wordmark-logo"
                        height={132}
                    />
                    <span className="al-site-footer__wordmark-text">
                        <span className="al-site-footer__wordmark-word">Answer</span>
                        <span className="al-site-footer__wordmark-word al-site-footer__wordmark-word--second">Lattice</span>
                    </span>
                </div>

                <PublicAiSummaryLinks
                    className="al-site-footer__ai-summary"
                    label="Get an AI summary of AnswerLattice:"
                    product="answerlattice"
                    prompt={ANSWERLATTICE_AI_SUMMARY_PROMPT}
                />

                <div className="al-site-footer__bottom">
                    <p>&copy; {new Date().getFullYear()} AnswerLattice. All rights reserved.</p>
                    <AnswerlatticeThemeSwitcher />
                    <div className="al-site-footer__legal">
                        <AnswerlatticeLink basePath={basePath} href="/privacy-policy">
                            Privacy Policy
                        </AnswerlatticeLink>
                        <AnswerlatticeLink basePath={basePath} href="/terms-of-service">
                            Terms of Service
                        </AnswerlatticeLink>
                    </div>
                </div>
            </div>
        </footer>
    );
}
