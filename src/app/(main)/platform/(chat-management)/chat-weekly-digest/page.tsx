import { Metadata } from 'next';
import WeeklyDigest from '@template/platform/chatManagement/WeeklyDigest';
import AnswerlatticeConfigNotice from '@template/platform/AnswerlatticeConfigNotice';
import { isAnswerlatticeFirebaseConfigured } from '@lib/firebase/answerlatticeConfig';

export const metadata: Metadata = {
    title: 'Weekly Digest | Chat Management',
    description: 'Deterministic completed-week support summary and review signals'
};

export default function WeeklyDigestPage() {
    if (!isAnswerlatticeFirebaseConfigured) {
        return <AnswerlatticeConfigNotice surface="Chat Weekly Digest" />;
    }

    return <WeeklyDigest />;
}
