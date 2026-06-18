import type { Metadata } from 'next';
import CreateMenuSuccessClient from './CreateMenuSuccessClient';

export const metadata: Metadata = {
    title: 'Menu Published - MenuList',
    description: 'Share the published MenuList menu link and next steps after setup.',
    alternates: {
        canonical: '/create-menu/success',
    },
    robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
            'max-video-preview': 0,
            'max-image-preview': 'none',
            'max-snippet': 0,
        },
    },
};

export default function SuccessPage() {
    return <CreateMenuSuccessClient />;
}
