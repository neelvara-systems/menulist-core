import dynamic from 'next/dynamic';

export const metadata = {
    title: 'Daily Brief | Answerlattice',
};

const AnswerlatticeOwnerSupportAssistant = dynamic(
    () => import('@/components/templates/answerlattice/ownerSupportAssistant/AnswerlatticeOwnerSupportAssistant'),
    { ssr: false },
);

export default function AnswerlatticeOwnerSupportAssistantPage() {
    return <AnswerlatticeOwnerSupportAssistant />;
}
