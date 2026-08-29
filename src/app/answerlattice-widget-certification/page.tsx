import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AnswerlatticeLocalWidgetCertificationClient from './AnswerlatticeLocalWidgetCertificationClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    robots: { follow: false, index: false },
    title: 'Answerlattice local widget certification',
};

export default function AnswerlatticeLocalWidgetCertificationPage() {
    if (process.env.NODE_ENV !== 'development') notFound();

    return <AnswerlatticeLocalWidgetCertificationClient />;
}
