'use client';

import dynamic from 'next/dynamic';

const CanonicaBilling = dynamic(
    () => import('@/components/templates/canonica/billing/CanonicaBilling'),
    { ssr: false },
);

export default function CanonicaBillingPage() {
    return <CanonicaBilling />;
}
