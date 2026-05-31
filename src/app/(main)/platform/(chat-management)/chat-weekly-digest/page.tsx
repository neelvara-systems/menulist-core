import { Metadata } from 'next';
import WeeklyDigest from '@template/platform/chatManagement/WeeklyDigest';
import AnswerlatticeConfigNotice from '@template/platform/AnswerlatticeConfigNotice';
import { isAnswerlatticeFirebaseConfigured } from '@lib/firebase/answerlatticeFirebaseClient';

export const metadata: Metadata = {
    title: 'Weekly Digest | Chat Management',
    description: 'AI-powered weekly performance summaries and insights'
};

export default function WeeklyDigestPage() {
    if (!isAnswerlatticeFirebaseConfigured) {
        return <AnswerlatticeConfigNotice surface="Chat Weekly Digest" />;
    }

    return <WeeklyDigest />;
}
