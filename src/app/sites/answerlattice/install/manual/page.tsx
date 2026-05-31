import { Metadata } from 'next';
import AnswerlatticePageStructuredData from '../../components/PageStructuredData';
import AnswerlatticeInstallContractPage from '../InstallContractPage';

export const metadata: Metadata = {
    title: 'Manual Widget Install',
    description: 'Human-readable Answerlattice v1 widget install steps.',
    alternates: { canonical: '/install/manual' },
};

export default function Page() {
    return (
        <>
            <AnswerlatticePageStructuredData path="/install/manual" />
            <AnswerlatticeInstallContractPage docKey="manual" />
        </>
    );
}
