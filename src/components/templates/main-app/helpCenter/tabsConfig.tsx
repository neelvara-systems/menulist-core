import { FEATURE_FLAGS } from '@config/features';
import { ReactNode } from 'react';
import { LuBookOpen, LuBug, LuHeartHandshake, LuHeartPulse, LuInfo, LuMail, LuShield } from 'react-icons/lu';

import KnowledgeBaseExplorer from '@organisms/KnowledgeBaseExplorer';

import GovernanceHub from '@template/canonica/governance';
import ChangelogView from './ChangelogView';
import ContactUsView from './ContactUsView';
import FaqView from './FaqView';
import ShareFeedbackView from './ShareFeedbackView';
import TicketView from './TicketView';

export interface HelpCenterTabConfig {
    key: string;
    title: string;
    titleKey: string;
    description: string;
    descriptionKey: string;
    icon: ReactNode;
    render: ReactNode;
    maxWidth?: number | string;
}

const iconStyle = { fontSize: 24 };

export const HELP_CENTER_TABS: HelpCenterTabConfig[] = [
    {
        key: 'kb',
        title: 'Knowledge Base',
        titleKey: 'knowledgeBase',
        description: 'Find answers and guides for using your dashboard.',
        descriptionKey: 'knowledgeBaseDesc',
        icon: <LuBookOpen style={iconStyle} />,
        render: <KnowledgeBaseExplorer />,
    },
    {
        key: 'ticket',
        title: 'Submit a Ticket',
        titleKey: 'submitTicket',
        description: 'Submit a ticket if you need help or have a question.',
        descriptionKey: 'submitTicketDesc',
        icon: <LuBug style={iconStyle} />,
        render: <TicketView />,
        // maxWidth: 800,
    },
    {
        key: 'feedback',
        title: 'Share Feedback',
        titleKey: 'shareFeedback',
        description: 'Share your feedback with us to help us improve our platform.',
        descriptionKey: 'shareFeedbackDesc',
        icon: <LuHeartHandshake style={iconStyle} />,
        render: <ShareFeedbackView />,
        maxWidth: 800,
    },
    {
        key: 'faq',
        title: 'Read FAQ',
        titleKey: 'readFaq',
        description: 'Read our frequently asked questions to find answers to common questions.',
        descriptionKey: 'readFaqDesc',
        icon: <LuInfo style={iconStyle} />,
        render: <FaqView />,
        maxWidth: 800,
    },
    {
        key: 'contact-us',
        title: 'Contact Us',
        titleKey: 'contactUs',
        description: 'Contact us if you have any questions or need assistance.',
        descriptionKey: 'contactUsDesc',
        icon: <LuMail style={iconStyle} />,
        render: <ContactUsView />,
        maxWidth: 800,
    },
    {
        key: 'changelog',
        title: "What's New",
        titleKey: 'whatsNew',
        description: "View our changelog to see what's new and what's been updated.",
        descriptionKey: 'whatsNewDesc',
        icon: <LuHeartPulse style={iconStyle} />,
        render: <ChangelogView />,
    },
    // Canonica Governance Hub — only visible when feature flag is ON
    ...(FEATURE_FLAGS.ENABLE_CANONICA_GOVERNANCE_UI ? [{
        key: 'governance',
        title: 'Governance',
        titleKey: 'governance',
        description: 'Manage canonical answers, entities, drift detection, and knowledge health.',
        descriptionKey: 'governanceDesc',
        icon: <LuShield style={iconStyle} />,
        render: <GovernanceHub />,
    }] : []),
];

export const HOME_TAB_KEY = 'home';
export const DEFAULT_HOME_TAB = { key: HOME_TAB_KEY, title: 'Home' } as const;
