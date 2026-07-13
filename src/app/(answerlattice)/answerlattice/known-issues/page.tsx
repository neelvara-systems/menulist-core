import dynamic from 'next/dynamic';

export const metadata = {
    title: 'Known Issues | Answerlattice',
};

const AnswerlatticeKnownIssues = dynamic(
    () => import('@/components/templates/answerlattice/knownIssues/AnswerlatticeKnownIssues'),
    { ssr: false },
);

export default function AnswerlatticeKnownIssuesPage() {
    return <AnswerlatticeKnownIssues />;
}
