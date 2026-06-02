import { Metadata } from 'next';
import AnswerlatticePageStructuredData from '../../../components/PageStructuredData';
import AnswerlatticeInstallContractPage from '../../InstallContractPage';

export const metadata: Metadata = {
    title: 'React Install',
    description: 'AnswerLattice v1 install guidance for React SPAs.',
    alternates: { canonical: '/install/frameworks/react' },
};

export default function Page() {
    return (
        <>
            <AnswerlatticePageStructuredData path="/install/frameworks/react" />
            <AnswerlatticeInstallContractPage docKey="react" />
        </>
    );
}
