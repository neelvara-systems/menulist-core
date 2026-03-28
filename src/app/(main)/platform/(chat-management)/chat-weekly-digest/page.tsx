import { Metadata } from 'next';
import WeeklyDigest from '@template/platform/chatManagement/WeeklyDigest';

export const metadata: Metadata = {
    title: 'Weekly Digest | Chat Management',
    description: 'AI-powered weekly performance summaries and insights'
};

export default function WeeklyDigestPage() {
    return <WeeklyDigest />;
}
