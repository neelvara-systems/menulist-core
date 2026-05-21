import dynamic from 'next/dynamic';

export const metadata = {
    title: 'Weekly Digest | Canonica',
};

const CanonicaWeeklyDigest = dynamic(
    () => import('@/components/templates/canonica/weeklyDigest/CanonicaWeeklyDigest'),
    { ssr: false },
);

export default function CanonicaWeeklyDigestPage() {
    return <CanonicaWeeklyDigest />;
}
