import dynamic from 'next/dynamic';

export const metadata = {
    title: 'Weekly Digest | Answerlattice',
};

const AnswerlatticeWeeklyDigest = dynamic(
    () => import('@/components/templates/answerlattice/weeklyDigest/AnswerlatticeWeeklyDigest'),
    { ssr: false },
);

export default function AnswerlatticeWeeklyDigestPage() {
    return <AnswerlatticeWeeklyDigest />;
}
