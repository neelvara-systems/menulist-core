'use client'

import dynamic from 'next/dynamic';

const HelpCenter = dynamic(
    () => import('@template/main-app/helpCenter'),
    { ssr: false }
);

export default function AnswerlatticeHelpPage() {
    return <HelpCenter syncRoute={false} />;
}
