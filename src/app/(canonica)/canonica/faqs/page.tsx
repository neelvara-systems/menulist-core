'use client';

import dynamic from 'next/dynamic';

const CanonicaFaqManagement = dynamic(
    () => import('@/components/templates/canonica/faqManagement/CanonicaFaqManagement'),
    { ssr: false },
);

export default function CanonicaFaqsPage() {
    return <CanonicaFaqManagement />;
}
