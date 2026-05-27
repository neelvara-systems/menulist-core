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
        slug: 'team-access',
        label: 'Team Access',
        href: '/product/team-access',
        eyebrow: 'Team Access',
        title: 'Give the right people the right Canonica access.',
        description:
            'Invite workspace members, assign Canonica-specific roles, reset login details, and force sign-out without exposing broad owner-level controls.',
        heroBullets: [
            'Workspace members and roles',
            'Email or owner-passcode login',
            'Owner reset and force sign-out',
        ],
        proofTitle: 'Production support needs controlled workspace access.',
        proofDescription:
            'Canonica now treats team management as part of the workspace control layer. Owners can add staff, assign role permissions, reset access, and keep support work role-scoped.',
        cards: [
            {
                title: 'Invite team members',
                description:
                    'Add support leads, managers, or staff to the Canonica workspace without giving every member owner-level access.',
            },
            {
                title: 'Assign Canonica roles',
                description:
                    'Use Owner, Manager, Support Staff, or custom Canonica roles so billing, team, knowledge, widget, governance, and support controls stay scoped.',
            },
            {
                title: 'Use email or passcode login',
                description:
                    'Members can be added with an email setup path or an owner-managed staff ID and temporary passcode.',
            },
            {
                title: 'Reset access from the workspace',
                description:
                    'Owners can create a new temporary passcode, share it once, revoke active sessions, and keep the member record intact.',
            },
            {
                title: 'Force sign-out when needed',
                description:
                    'Sensitive access changes can revoke sessions instead of waiting for a member to sign out on their own device.',
            },
            {
                title: 'Keep workspace controls scoped',
                description:
                    'Canonica roles use Canonica permission claims and routes, so billing, widget, knowledge, support, and governance access can be controlled separately.',
            },
        ],
        workflowTitle: 'From workspace owner to controlled team access.',
        workflowDescription:
            'Team Access gives Canonica workspaces an owner-managed member lifecycle for support, governance, billing, widget, and knowledge access.',
        workflowSteps: [
            { title: 'Open Team Access', description: 'The owner uses the Canonica workspace team page.' },
            { title: 'Add member details', description: 'Enter name, optional email, phone metadata, and the starting role.' },
            { title: 'Share login details', description: 'Email users set their password; passcode users receive a one-time staff ID and temporary passcode.' },
            { title: 'Adjust permissions', description: 'Change roles or custom permission sets as the workspace team grows.' },
            { title: 'Reset or sign out', description: 'Create a new temporary passcode or force sign-out when access needs to be refreshed.' },
        ],
        connectedTitle: 'Team access protects the support control plane.',
        connectedDescription:
            'Roles and reset controls matter because the same workspace contains billing, widget setup, support content, governance review, tickets, and release-aware knowledge.',
        connectedItems: [
            { title: 'Launch Setup', description: 'Owners can add the people who will help configure product details, pages, and starter knowledge.' },
            { title: 'Knowledge Base', description: 'Staff can be limited to support content work without receiving billing or role-management controls.' },
            { title: 'Widget', description: 'Widget configuration can stay with trusted managers instead of every support user.' },
            { title: 'Governance', description: 'Answer review and role assignment remain controlled so drafts do not become official without the right access.' },
        ],
        faq: [
            {
                title: 'Is this general account management?',
                description:
                    'No. The roles and permissions are Canonica-specific and apply only to the Canonica workspace.',
            },
            {
                title: 'Can owners reset passwords and passcodes?',
                description:
                    'Yes. Owners can create a new temporary passcode and revoke active sessions. Email-backed members receive setup email when first created.',
            },
            {
                title: 'Where do team members use Canonica?',
                description:
                    'Team members use the Canonica dashboard and team page with the permissions assigned to their workspace role.',
            },
        ],
    },
    {
        slug: 'knowledge-base',
        label: 'Knowledge Base',
        href: '/product/knowledge-base',
        eyebrow: 'Knowledge Base',
        title: 'Docs that power page-aware support.',
        description:
            'Import or write help articles, connect them to app pages, and use them as source material for approved answers, custom owner Q&A, FAQs, hosted help, and widget suggestions.',
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
                    'Start from current docs, files, FAQs, release notes, owner Q&A, or starter support answers instead of building a blank help center.',
            },
            {
                title: 'Organise by surface',
                description:
                    'Connect articles to product pages, workflows, entities, tags, and support contexts so answers match where users are stuck.',
            },
            {
                title: 'Generate related FAQs',
                description:
                    'Create short article-backed FAQ answers or write exact owner answers while keeping the long-form source article close for review and updates.',
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
            'Canonica treats FAQs and custom owner answers as customer-facing shortcuts, not loose snippets. Owners can write exact Q&A, generate article-backed suggestions, link source articles, and serve matching answers in the Help Center or widget.',
        heroBullets: [
            'Manual Q&A and article-backed generation',
            'Linked articles, tags, entities, and surfaces',
            'Served before fallback after canonical answers',
        ],
        proofTitle: 'Answer repeated questions quickly.',
        proofDescription:
            'FAQs and owner-written answers help users get direct responses without making owners maintain a second disconnected knowledge system.',
        cards: [
            {
                title: 'Add exact owner Q&A',
                description:
                    'Write the repeated question and the answer you want users to receive when their query matches closely enough.',
            },
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
                    'Use context keys, tags, entities, and article links so billing answers show on billing pages and onboarding answers show on onboarding pages.',
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
            'The lowest-cost long-term path is to write exact repeated answers or create FAQs with article generation, then refresh them only when source content changes materially.',
        workflowSteps: [
            { title: 'Write or generate an article', description: 'Use the article as the source of truth for a support topic.' },
            { title: 'Create owner answers', description: 'Write exact Q&A directly or generate short question-answer drafts from that same article context.' },
            { title: 'Attach source and context', description: 'Link articles, context keys, tags, and entities so matching stays page-aware.' },
            { title: 'Review and publish', description: 'Approve only the FAQ answers that are correct and useful.' },
            { title: 'Refresh when content changes', description: 'Regenerate or edit FAQs from the article modal when the source answer changes.' },
        ],
        connectedTitle: 'FAQs should not become loose snippets.',
        connectedDescription:
            'A good FAQ system reduces repeated questions only when it follows the same product context and source freshness rules as the rest of support.',
        connectedItems: [
            { title: 'Knowledge Base', description: 'FAQ answers can point back to article source material.' },
            { title: 'Widget', description: 'Page-aware support can surface matching owner answers after canonical answers and before fallback.' },
            { title: 'Hosted Help', description: 'FAQ sections can sit beside docs and changelog on the support domain.' },
            { title: 'Cache freshness', description: 'Public reads can reuse cached content while invalidating when source versions change.' },
        ],
        faq: [
            {
                title: 'Can owners add their own custom questions and answers?',
                description:
                    'Yes. Owners can write exact Q&A, attach article and surface context, publish it, and let Canonica use it as an owner answer when it matches the user question.',
            },
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
    {
        slug: 'support-board',
        label: 'Support Board',
        href: '/product/support-board',
        eyebrow: 'Support Board',
        title: 'A private board for support work that should become knowledge.',
        description:
            'Track manual support cards, private owner notes, status history, assignee context, related surfaces, and governed answer-proposal handoff without turning Canonica into a project-management tool.',
        heroBullets: [
            'Manual support cards and private notes',
            'Status history for owner review',
            'Answer proposal handoff',
        ],
        proofTitle: 'Keep support follow-up visible without mirroring every ticket.',
        proofDescription:
            'Support Board is the owner/staff workboard for support gaps that need follow-up. Tickets, conversations, and signals keep their own screens; the board is for the items owners decide should become reviewed support work.',
        cards: [
            {
                title: 'Create support cards',
                description:
                    'Add a manual card when a customer question, product gap, or support follow-up needs owner attention.',
            },
            {
                title: 'Keep private notes',
                description:
                    'Store internal owner/staff context on the card. Notes stay private and never render in hosted help, widget answers, or public pages.',
            },
            {
                title: 'Track status history',
                description:
                    'Use the current status for filtering while keeping a timestamped activity trail of status changes and remarks.',
            },
            {
                title: 'Assign follow-up',
                description:
                    'Add assignee, due date, priority, tags, and related customer/support context without building a full helpdesk workflow.',
            },
            {
                title: 'Link support context',
                description:
                    'Attach the card to related product surfaces, entities, tickets, conversations, or answers when that context makes review faster.',
            },
            {
                title: 'Create answer proposals',
                description:
                    'Turn a handled support card into a governed answer proposal, then approve it through Knowledge Governance before it becomes official.',
            },
        ],
        workflowTitle: 'From owner note to reviewed support knowledge.',
        workflowDescription:
            'Support Board stays manual-first by default: owners create the cards that matter, add private context, move the item through review, and hand off answer work to governance when needed.',
        workflowSteps: [
            { title: 'Create a card', description: 'Capture the support gap, unresolved question, or follow-up item the owner wants to track.' },
            { title: 'Add private context', description: 'Record internal notes, assignee, priority, due date, and links to the relevant support objects.' },
            { title: 'Move the status', description: 'Use current status for the board view while preserving timestamped status activity.' },
            { title: 'Connect product context', description: 'Link the item to a surface, entity, answer, ticket, or conversation when that helps review.' },
            { title: 'Create a proposal', description: 'Draft an answer proposal only when the support item should become reusable support knowledge.' },
            { title: 'Approve in governance', description: 'Knowledge Governance remains the authority layer before an answer becomes official.' },
        ],
        connectedTitle: 'The board connects support work without duplicating every screen.',
        connectedDescription:
            'Support Board is useful because it sits above tickets, conversations, surfaces, and governance as an owner review lane. It should not replace those dedicated screens.',
        connectedItems: [
            { title: 'Tickets', description: 'Fallback tickets stay in the ticket inbox; selected issues can become board follow-up.' },
            { title: 'Conversations', description: 'Low-confidence conversations and feedback can inform cards without exposing chat logs publicly.' },
            { title: 'Product surfaces', description: 'Cards can point to billing, onboarding, settings, integrations, releases, or error pages.' },
            { title: 'Governance', description: 'Answer proposals created from cards still require owner approval before becoming authoritative.' },
        ],
        faq: [
            {
                title: 'Is Support Board a ticket inbox?',
                description:
                    'No. Tickets stay in the ticket inbox. Support Board is the private owner workboard for selected support gaps, follow-up notes, and knowledge tasks.',
            },
            {
                title: 'Does the board sync every ticket and signal?',
                description:
                    'No. The default public product story is manual-first. Ticket/signal sync and nightly board preparation are controlled rollout paths and are not on for every workspace by default.',
            },
            {
                title: 'Are notes visible to end users?',
                description:
                    'No. Support Board notes are internal owner/staff context only. They do not appear in hosted help, widget responses, public APIs, or customer-facing docs.',
            },
            {
                title: 'Does creating a card publish an answer?',
                description:
                    'No. Cards can create answer proposals, but Knowledge Governance and owner approval decide what becomes authoritative support knowledge.',
            },
        ],
    },
    {
        slug: 'workflow-notifications',
        label: 'Workflow Notifications',
        href: '/product/workflow-notifications',
        eyebrow: 'Workflow Notifications',
        title: 'Slack and email alerts for support governance.',
        description:
            'Send bounded Slack and email notifications for the support events owners should actually see: nightly digests, critical coverage drops, repeated AI failures, and controlled test messages.',
        heroBullets: [
            'Slack webhook and email recipients',
            'Digest-first governance updates',
            'Delivery health and test notification',
        ],
        proofTitle: 'Notify owners without turning support into alert noise.',
        proofDescription:
            'Canonica keeps workflow notifications tied to governance. Routine drift, gaps, and proposal activity can roll into digest output, while critical failures can alert immediately.',
        cards: [
            {
                title: 'Configure Slack',
                description:
                    'Add a Slack destination and choose the support events that should reach the channel.',
            },
            {
                title: 'Configure email',
                description:
                    'Add owner or team recipients for the same governance events without forcing everyone into the dashboard.',
            },
            {
                title: 'Send a test notification',
                description:
                    'Verify the destination before relying on it for production support movement.',
            },
            {
                title: 'Prefer daily digests',
                description:
                    'Use digest-first delivery for normal drift, proposal, gap, and summary activity so owners are not spammed.',
            },
            {
                title: 'Track delivery health',
                description:
                    'Show recent success, failure, disabled adapter state, and consecutive failure count from a compact health summary.',
            },
            {
                title: 'Cap delivery volume',
                description:
                    'Rate limits and retention policies keep notification work bounded as tenants, events, and recipients grow.',
            },
        ],
        workflowTitle: 'From support movement to owner attention.',
        workflowDescription:
            'Notifications should help owners act, not recreate raw logs. Canonica keeps configuration, testing, delivery, and health review in one workflow.',
        workflowSteps: [
            { title: 'Choose destinations', description: 'Add Slack or email destinations for the workspace.' },
            { title: 'Pick event filters', description: 'Select the support events that deserve notification.' },
            { title: 'Send test message', description: 'Confirm the destination and capture delivery status.' },
            { title: 'Deliver digest or alert', description: 'Routine movement rolls into digest; critical events can alert sooner.' },
            { title: 'Review health', description: 'Use the compact health summary instead of reading delivery logs.' },
        ],
        connectedTitle: 'Notifications should stay connected to support truth.',
        connectedDescription:
            'Workflow notifications are useful only when they point owners back to the support content, answers, tickets, and governance items that need review.',
        connectedItems: [
            { title: 'Governance', description: 'Coverage drops, drift, proposals, and failed support paths can reach owners.' },
            { title: 'Tickets', description: 'Fallback activity can be summarized without making every ticket an alert.' },
            { title: 'Weekly digest', description: 'Normal support movement stays grouped for owner review.' },
            { title: 'Settings', description: 'Slack, email, filters, test delivery, and health remain owner-controlled.' },
        ],
        faq: [
            {
                title: 'Does Canonica send every event immediately?',
                description:
                    'No. The production default should stay digest-first, with immediate alerts reserved for critical coverage or repeated failure conditions.',
            },
            {
                title: 'Are Slack and email self-service?',
                description:
                    'Yes. Slack webhook and email recipient configuration are owner-facing. Broader workflow adapters should stay controlled until their credential and delivery model is safe for self-service.',
            },
            {
                title: 'Do notifications expose private workspace IDs?',
                description:
                    'No. Public and notification copy should describe the support event and destination without exposing tenant, store, or raw implementation identifiers.',
            },
        ],
    },
    {
        slug: 'proactive-help',
        label: 'Proactive Help',
        href: '/product/proactive-help',
        eyebrow: 'Proactive Help',
        title: 'Show help before users ask, only where it is configured.',
        description:
            'Canonica can use owner-approved, page-aware triggers to suggest relevant help from the widget when active triggers exist for the current app page.',
        heroBullets: [
            'Owner-approved page triggers',
            'Widget skips calls when disabled',
            'Resolved suggestion summaries',
        ],
        proofTitle: 'Proactive help should be helpful, quiet, and bounded.',
        proofDescription:
            'The widget should not guess or interrupt everywhere. Canonica keeps proactive prompts tied to active triggers, safe page context, cached trigger summaries, and approved support content.',
        cards: [
            {
                title: 'Trigger by product page',
                description:
                    'Use safe route, feature, workflow, plan, or role context to match a prompt to the screen where the user is working.',
            },
            {
                title: 'Serve approved suggestions',
                description:
                    'Resolved trigger summaries can point to reviewed answers or support content instead of running broad lookup on every page view.',
            },
            {
                title: 'Skip when disabled',
                description:
                    'Runtime configuration tells the widget whether proactive help is enabled, so inactive tenants avoid unnecessary API calls.',
            },
            {
                title: 'Cache no-trigger states',
                description:
                    'When no active triggers exist, negative caching avoids repeated backend checks for the same page context.',
            },
            {
                title: 'Respect widget controls',
                description:
                    'Allowed origins, blocked routes, and safe context rules still apply before any proactive prompt appears.',
            },
            {
                title: 'Turn misses into review',
                description:
                    'If a prompt is missing or weak, feedback and fallback can become governance work instead of invisible analytics noise.',
            },
        ],
        workflowTitle: 'From page trigger to quiet in-app guidance.',
        workflowDescription:
            'Proactive help stays owner-controlled: configure the page trigger, connect it to approved support, let the widget display it only when eligible, and review feedback.',
        workflowSteps: [
            { title: 'Map the support-heavy page', description: 'Connect the route or workflow to the product surface where users get stuck.' },
            { title: 'Create an active trigger', description: 'Define when the widget should suggest help for that page context.' },
            { title: 'Resolve the suggestion', description: 'Attach reviewed support content or an approved answer summary.' },
            { title: 'Let runtime gate the call', description: 'The widget checks capability state before requesting proactive help.' },
            { title: 'Review feedback', description: 'Use feedback and fallback signals to improve the trigger or support content.' },
        ],
        connectedTitle: 'Proactive prompts should follow the same authority model.',
        connectedDescription:
            'A proactive suggestion is still support knowledge. It must stay scoped to product context, approved content, widget controls, and reviewable signals.',
        connectedItems: [
            { title: 'Widget', description: 'The prompt appears inside the same page-aware runtime controls.' },
            { title: 'Approved answers', description: 'Suggestions can point to reviewed answer summaries instead of free-form guesses.' },
            { title: 'Product surfaces', description: 'Triggers stay attached to routes, workflows, and product areas.' },
            { title: 'Governance', description: 'Feedback and fallbacks keep proactive help reviewable.' },
        ],
        faq: [
            {
                title: 'Is proactive help enabled for every workspace?',
                description:
                    'No. It should appear only when configured and enabled for the workspace, with runtime capability checks preventing unnecessary calls when inactive.',
            },
            {
                title: 'Does proactive help auto-generate answers?',
                description:
                    'No. Proactive prompts should point to approved support content or reviewable fallback paths. They do not publish new authoritative answers by themselves.',
            },
            {
                title: 'Will this increase widget cost on every page?',
                description:
                    'The runtime is designed to skip proactive calls when the feature is disabled and use trigger summaries and negative caching when no active triggers exist.',
            },
        ],
    },
];

export function getCanonicaSupportFeature(slug: string) {
    return CANONICA_SUPPORT_FEATURES.find((feature) => feature.slug === slug);
}
