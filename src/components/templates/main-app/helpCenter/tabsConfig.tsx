import { ReactNode } from 'react';
import { LuBookOpen, LuBug, LuHeartHandshake, LuHeartPulse, LuInfo, LuMail } from 'react-icons/lu';

import KnowledgeBaseExplorer from '@organisms/KnowledgeBaseExplorer';

import ChangelogView from './ChangelogView';
import ContactUsView from './ContactUsView';
import FaqView from './FaqView';
import ShareFeedbackView from './ShareFeedbackView';
import TicketView from './TicketView';

export interface HelpCenterTabConfig {
    key: string;
    titleKey: string;
    icon: ReactNode;
    render: ReactNode;
    maxWidth?: number | string;
}

const iconStyle = { fontSize: 24 };

export const HELP_CENTER_TABS: HelpCenterTabConfig[] = [
    {
        key: 'kb',
        titleKey: 'knowledgeBase',
        icon: <LuBookOpen style={iconStyle} />,
        render: <KnowledgeBaseExplorer />,
    },
    {
        key: 'ticket',
        titleKey: 'submitTicket',
        icon: <LuBug style={iconStyle} />,
        render: <TicketView />,
        // maxWidth: 800,
    },
    {
        key: 'feedback',
        titleKey: 'shareFeedback',
        icon: <LuHeartHandshake style={iconStyle} />,
        render: <ShareFeedbackView />,
        maxWidth: 800,
    },
    {
        key: 'faq',
        titleKey: 'readFaq',
        icon: <LuInfo style={iconStyle} />,
        render: <FaqView />,
        maxWidth: 800,
    },
    {
        key: 'contact-us',
        titleKey: 'contactUs',
        icon: <LuMail style={iconStyle} />,
        render: <ContactUsView />,
        maxWidth: 800,
    },
    {
        key: 'changelog',
        titleKey: 'whatsNew',
        icon: <LuHeartPulse style={iconStyle} />,
        render: <ChangelogView />,
    },
];

export const HOME_TAB_KEY = 'home';
export const DEFAULT_HOME_TAB = { key: HOME_TAB_KEY, titleKey: 'home' } as const;
