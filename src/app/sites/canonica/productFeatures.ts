export type CanonicaFeatureCard = {
    title: string;
    description: string;
};

export type CanonicaProductFeature = {
    slug: string;
    label: string;
    href: string;
    eyebrow: string;
    title: string;
    description: string;
    heroBullets: string[];
    proofTitle: string;
    proofDescription: string;
    cards: CanonicaFeatureCard[];
    workflowTitle: string;
    workflowDescription: string;
    workflowSteps: CanonicaFeatureCard[];
    connectedTitle: string;
    connectedDescription: string;
    connectedItems: CanonicaFeatureCard[];
    faq: CanonicaFeatureCard[];
};

export const CANONICA_SUPPORT_FEATURES: CanonicaProductFeature[] = [
    {
        slug: 'knowledge-base',
        label: 'Knowledge Base',
        href: '/product/knowledge-base',
        eyebrow: 'Knowledge Base',
        title: 'Docs that power page-aware support.',
        description:
            'Import or write help articles, connect them to app pages, and use them as source material for approved answers, FAQs, hosted help, and widget suggestions.',
        heroBullets: [
            'Import starter knowledge and files',
            'Attach articles to app pages',
            'Keep Help Center, widget, and governance connected',
        ],
        proofTitle: 'Manage support knowledge without building a docs empire.',
        proofDescription:
            'The knowledge base is not just a document shelf. It is the reviewed source material Canonica uses for page-aware support, approved answers, FAQs, and coverage review.',
        cards: [
            {
                title: 'Create reviewed articles',
                description:
                    'Write support docs with clear owner review before the content becomes customer-facing support.',
            },
            {
                title: 'Import existing knowledge',
                description:
                    'Start from current docs, files, FAQs, release notes, or starter support answers instead of building a blank help center.',
            },
            {
                title: 'Organise by surface',
                description:
                    'Connect articles to product pages, workflows, entities, tags, and support contexts so answers match where users are stuck.',
            },
            {
                title: 'Generate related FAQs',
                description:
                    'Create short article-backed FAQ answers while keeping the long-form source article close for review and updates.',
            },
            {
                title: 'Publish to hosted help',
                description:
                    'Use the same reviewed article set across hosted help, widget answers, related content, and Help Center surfaces.',
            },
        ],
        workflowTitle: 'From rough notes to trusted support source.',
        workflowDescription:
            'Canonica keeps the owner in control: source content becomes drafts, drafts are reviewed, and approved knowledge becomes reusable support.',
        workflowSteps: [
            { title: 'Bring content in', description: 'Upload files or add starter support content from existing product material.' },
            { title: 'Review generated drafts', description: 'Check article drafts and related FAQs before publishing.' },
            { title: 'Attach product context', description: 'Map articles to pages, workflows, entities, and tags.' },
            { title: 'Serve where needed', description: 'Use approved content in hosted help, widget answers, and related suggestions.' },
        ],
        connectedTitle: 'Articles should feed the full support loop.',
        connectedDescription:
            'Articles feed the support loop instead of living alone. FAQ, changelog, tickets, and governance all refer back to reviewed product knowledge.',
        connectedItems: [
            { title: 'FAQ', description: 'Short answers stay linked to article source material.' },
            { title: 'Changelog', description: 'Release changes can point to support docs that need review.' },
            { title: 'Tickets', description: 'Resolved tickets can become new article or approved-answer proposals.' },
            { title: 'Governance', description: 'Coverage and drift checks use article relationships instead of raw document count.' },
        ],
        faq: [
            {
                title: 'Is this a full documentation CMS?',
                description:
                    'No. Canonica keeps publishing simple because the product goal is reviewed support knowledge, not a general website builder.',
            },
            {
                title: 'Can articles power widget answers?',
                description:
                    'Yes. Articles can be used as reviewed support source material and connected to page-aware widget responses.',
            },
            {
                title: 'Does imported content publish automatically?',
                description:
                    'No. Generated or imported drafts should be reviewed before becoming authoritative customer-facing knowledge.',
            },
        ],
    },
    {
        slug: 'faq-management',
        label: 'FAQ Management',
        href: '/product/faq-management',
        eyebrow: 'FAQ Management',
        title: 'Short answers backed by real source content.',
        description:
            'Canonica treats FAQs as customer-facing shortcuts, not loose snippets. FAQs can be generated with article context, linked back to source articles, and shown in the Help Center or widget.',
        heroBullets: [
            'Article-backed FAQ generation',
            'Owner review before publishing',
            'Surface-aware FAQ display',
        ],
        proofTitle: 'Answer repeated questions quickly.',
        proofDescription:
            'FAQs help users get direct answers without making owners maintain a second disconnected knowledge system.',
        cards: [
            {
                title: 'Generate from article context',
                description:
                    'Create FAQ drafts while the article context and metadata are already available, avoiding an extra broad generation pass.',
            },
            {
                title: 'Link FAQ to source article',
                description:
                    'Keep each FAQ tied to the article it came from so owners know what to update when the source changes.',
            },
            {
                title: 'Attach to product surfaces',
                description:
                    'Show billing FAQs on billing pages, onboarding FAQs on onboarding pages, and release FAQs where they are relevant.',
            },
            {
                title: 'Review before authority',
                description:
                    'Owner-approved FAQ answers can become trusted shortcuts; drafts do not silently become official guidance.',
            },
            {
                title: 'Serve in Help Center and widget',
                description:
                    'Use short answers in public help, related content rows, and page-aware widget suggestions without duplicating content work.',
            },
        ],
        workflowTitle: 'Generate FAQs from source content, then keep them attached.',
        workflowDescription:
            'The lowest-cost long-term path is to create FAQs with article generation, then refresh them only when the source article changes materially.',
        workflowSteps: [
            { title: 'Write or generate an article', description: 'Use the article as the source of truth for a support topic.' },
            { title: 'Create FAQ drafts', description: 'Generate short question-answer pairs from that same article context.' },
            { title: 'Review and publish', description: 'Approve only the FAQ answers that are correct and useful.' },
            { title: 'Refresh when content changes', description: 'Regenerate or edit FAQs from the article modal when the source answer changes.' },
        ],
        connectedTitle: 'FAQs should not become loose snippets.',
        connectedDescription:
            'A good FAQ system reduces repeated questions only when it follows the same product context and source freshness rules as the rest of support.',
        connectedItems: [
            { title: 'Knowledge Base', description: 'FAQ answers point back to article source material.' },
            { title: 'Widget', description: 'Page-aware support can surface relevant FAQs before fallback.' },
            { title: 'Hosted Help', description: 'FAQ sections can sit beside docs and changelog on the support domain.' },
            { title: 'Cache freshness', description: 'Public reads can reuse cached content while invalidating when source versions change.' },
        ],
        faq: [
            {
                title: 'Should FAQs be generated separately after all articles?',
                description:
                    'Only for bulk repair. The normal path should generate FAQs with the article because that is where the best context and lowest cost already exist.',
            },
            {
                title: 'Can owners refresh FAQs later?',
                description:
                    'Yes. Owners should be able to regenerate or edit article-linked FAQs when the source article changes.',
            },
            {
                title: 'Are FAQs a replacement for articles?',
                description:
                    'No. FAQs are short answers. Articles remain the deeper source material for review, search, and governance.',
            },
        ],
    },
    {
        slug: 'changelog',
        label: 'Changelog',
        href: '/product/changelog',
        eyebrow: 'Changelog',
        title: 'Release notes that keep support current.',
        description:
            'Canonica connects changelog entries to product surfaces, tags, affected entities, and support content so releases become review triggers instead of stale support risk.',
        heroBullets: [
            'Publish release notes for customers',
            'Connect changes to product surfaces',
            'Review affected support answers after releases',
        ],
        proofTitle: 'Explain what changed and what support must review.',
        proofDescription:
            'A changelog should do more than announce features. In Canonica it also helps owners see which answers, articles, and FAQs may need review after a release.',
        cards: [
            {
                title: 'Create customer-facing updates',
                description:
                    'Publish release notes that users can read from hosted help or support surfaces without exposing workspace internals.',
            },
            {
                title: 'Attach affected surfaces',
                description:
                    'Connect changes to routes, workflows, tags, and entities so support context understands what changed.',
            },
            {
                title: 'Link related articles',
                description:
                    'Point users to updated docs and help owners find support content that needs follow-up.',
            },
            {
                title: 'Trigger drift review',
                description:
                    'A release can expose stale answers, deprecated flows, or scope conflicts before users receive wrong help.',
            },
            {
                title: 'Show latest context in support',
                description:
                    'Help Center and widget surfaces can show relevant product movement beside current support answers.',
            },
        ],
        workflowTitle: 'From release note to support readiness.',
        workflowDescription:
            'Canonica treats product changes as support events. When the product moves, support content gets a review path.',
        workflowSteps: [
            { title: 'Write the release note', description: 'Describe what changed in customer-readable language.' },
            { title: 'Assign affected surfaces', description: 'Connect the update to pages, workflows, entities, tags, and related articles.' },
            { title: 'Review stale support', description: 'Check approved answers and FAQs that may now be outdated.' },
            { title: 'Publish support context', description: 'Expose the update through hosted help and page-aware support where useful.' },
        ],
        connectedTitle: 'Every product change can become support context.',
        connectedDescription:
            'Changelog entries help support stay accurate because they connect product movement to articles, answers, FAQs, tickets, and drift signals.',
        connectedItems: [
            { title: 'Knowledge Base', description: 'Release notes point to articles that explain the change.' },
            { title: 'Approved answers', description: 'Affected answers can be reviewed after product changes.' },
            { title: 'FAQ', description: 'Short answers can be refreshed when release behavior changes.' },
            { title: 'Signals', description: 'Post-release tickets and feedback reveal where users remain confused.' },
        ],
        faq: [
            {
                title: 'Is this only a public release log?',
                description:
                    'No. The public update is useful, but the support value comes from connecting each change to affected support content.',
            },
            {
                title: 'Can changelog content appear in the widget?',
                description:
                    'Yes, when it is relevant to the current product surface and safe to show as related support context.',
            },
            {
                title: 'Does Canonica auto-change answers after a release?',
                description:
                    'No. Release impact can create review work, but authoritative answers remain human-approved.',
            },
        ],
    },
    {
        slug: 'tickets',
        label: 'Tickets',
        href: '/product/tickets',
        eyebrow: 'Tickets',
        title: 'Fallback tickets that improve future answers.',
        description:
            'Canonica keeps tickets as a fallback and signal source. When approved knowledge is missing, tickets capture the issue, safe context, and resolution patterns that can become future support content.',
        heroBullets: [
            'Ticket fallback when coverage is missing',
            'Capped safe debugging context',
            'Resolved issues become knowledge signals',
        ],
        proofTitle: 'Handle unresolved questions without making tickets the center.',
        proofDescription:
            'Tickets should not become the center of the product. In Canonica they are the practical fallback path and the evidence trail for improving canonical coverage.',
        cards: [
            {
                title: 'Create fallback tickets',
                description:
                    'Let users ask for help when approved answers or Help Center content cannot resolve the issue.',
            },
            {
                title: 'Capture safe context',
                description:
                    'Attach bounded page, browser, and sanitized debugging context so owners avoid repeated technical questions.',
            },
            {
                title: 'Manage status and replies',
                description:
                    'Support teams can review, reply, and close tickets while keeping the workflow intentionally lightweight.',
            },
            {
                title: 'Extract reusable knowledge',
                description:
                    'Resolved ticket patterns can become signals for new answers, article updates, or FAQ improvements.',
            },
            {
                title: 'Reduce future tickets',
                description:
                    'The goal is not more ticket workflow. The goal is turning repeated tickets into approved support knowledge.',
            },
        ],
        workflowTitle: 'From unresolved question to reviewed answer.',
        workflowDescription:
            'Tickets close the support loop by capturing missing coverage and routing repeated issues into knowledge review.',
        workflowSteps: [
            { title: 'User cannot resolve the issue', description: 'Widget or Help Center fallback opens a ticket path.' },
            { title: 'Ticket includes useful context', description: 'Safe page and browser context reduces back-and-forth.' },
            { title: 'Owner resolves the issue', description: 'The support answer is handled through normal ticket response.' },
            { title: 'Repeated patterns become proposals', description: 'Resolved clusters can create draft knowledge changes for review.' },
        ],
        connectedTitle: 'Tickets are fallback, not the product.',
        connectedDescription:
            'Canonica uses tickets to improve support knowledge. That keeps the product aligned with answer review rather than becoming another helpdesk.',
        connectedItems: [
            { title: 'Widget', description: 'Fallback can create a ticket from the same page context.' },
            { title: 'Knowledge Base', description: 'Resolved issues can become article improvements.' },
            { title: 'FAQ', description: 'Repeated simple tickets can become short approved answers.' },
            { title: 'Governance', description: 'Ticket clusters feed signal-to-knowledge proposals.' },
        ],
        faq: [
            {
                title: 'Is Canonica a helpdesk replacement?',
                description:
                    'No. Tickets exist as fallback and signal source. Canonica stays focused on support knowledge accuracy.',
            },
            {
                title: 'What debugging context is captured?',
                description:
                    'Only bounded, sanitized support context should be captured. Sensitive secrets and raw private data should not be collected.',
            },
            {
                title: 'Do tickets automatically become public answers?',
                description:
                    'No. Ticket learnings can create draft proposals, but owners approve knowledge before it becomes authoritative.',
            },
        ],
    },
];

export function getCanonicaSupportFeature(slug: string) {
    return CANONICA_SUPPORT_FEATURES.find((feature) => feature.slug === slug);
}
