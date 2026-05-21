'use client';

import dynamic from 'next/dynamic';

const CanonicaTransactions = dynamic(
    () => import('@/components/templates/canonica/billing/CanonicaTransactions'),
    { ssr: false },
);

export default function CanonicaTransactionsPage() {
    return <CanonicaTransactions />;
}
