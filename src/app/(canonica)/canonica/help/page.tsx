'use client'

import dynamic from 'next/dynamic';

const CanonicaClientHome = dynamic(
    () => import('@/components/templates/canonica/clientPortal/CanonicaClientHome'),
    { ssr: false }
);

export default function CanonicaHelpPage() {
    return <CanonicaClientHome />;
}
