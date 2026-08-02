import { completeWebsiteMetadata } from '@/lib/seo/websiteMetadata';
import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import '@/styles/website.css';
import { isOwnerReferralAcquisitionEnabled } from '@lib/ownerReferral/ownerReferralFeature';
import { OWNER_APP_URL } from '@constant/urls';
import type { Metadata } from 'next';
import OwnerReferralInviteClient from './OwnerReferralInviteClient';

export const metadata: Metadata = completeWebsiteMetadata({
    title: 'Business owner invitation - MenuList',
    description: 'A business owner you know invited you to create your official customer link.',
    alternates: { canonical: `${OWNER_APP_URL}/create-menu` },
    openGraph: {
        title: 'Business owner invitation - MenuList',
        description: 'A business owner you know invited you to create your official customer link.',
        type: 'website',
    },
    robots: { index: false, follow: false, nocache: true },
});

export default function OwnerReferralInvitePage() {
    return (
        <div className="ws-page">
            <Header />
            <OwnerReferralInviteClient enabled={isOwnerReferralAcquisitionEnabled()} />
            <Footer />
        </div>
    );
}
