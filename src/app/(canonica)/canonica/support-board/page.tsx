import dynamic from 'next/dynamic';

export const metadata = {
    title: 'Support Board | Canonica',
};

const CanonicaSupportBoard = dynamic(
    () => import('@/components/templates/canonica/supportBoard/CanonicaSupportBoard'),
    { ssr: false },
);

export default function CanonicaSupportBoardPage() {
    return <CanonicaSupportBoard />;
}
