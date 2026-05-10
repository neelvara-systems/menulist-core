import { Metadata } from 'next';
import WeeklyDigest from '@template/platform/chatManagement/WeeklyDigest';
import CanonicaConfigNotice from '@template/platform/CanonicaConfigNotice';
import { isCanonicaFirebaseConfigured } from '@lib/firebase/canonicaFirebaseClient';

export const metadata: Metadata = {
    title: 'Weekly Digest | Chat Management',
    description: 'AI-powered weekly performance summaries and insights'
};

export default function WeeklyDigestPage() {
    if (!isCanonicaFirebaseConfigured) {
        return <CanonicaConfigNotice surface="Chat Weekly Digest" />;
    }

    return <WeeklyDigest />;
}
