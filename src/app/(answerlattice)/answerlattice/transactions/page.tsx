'use client';

import dynamic from 'next/dynamic';

const AnswerlatticeTransactions = dynamic(
    () => import('@/components/templates/answerlattice/billing/AnswerlatticeTransactions'),
    { ssr: false },
);

export default function AnswerlatticeTransactionsPage() {
    return <AnswerlatticeTransactions />;
}
