import Footer from '@/components/website/Footer';
import Header from '@/components/website/Header';
import '@/styles/website.css';
import { isOwnerReferralAcquisitionEnabled } from '@lib/ownerReferral/ownerReferralFeature';
import type { Metadata } from 'next';
import OwnerReferralInviteClient from './OwnerReferralInviteClient';

export const metadata: Metadata = {
    title: 'Business owner invitation - MenuList',
    description: 'A MenuList business invited you to create your official customer link.',
    alternates: { canonical: '/create-menu' },
    openGraph: {
        title: 'Business owner invitation - MenuList',
        description: 'A MenuList business invited you to create your official customer link.',
        type: 'website',
    },
    robots: { index: false, follow: false, nocache: true },
};

export default function OwnerReferralInvitePage() {
    return (
        <div className="ws-page">
            <Header />
            <OwnerReferralInviteClient enabled={isOwnerReferralAcquisitionEnabled()} />
            <Footer />
        </div>
    );
}
