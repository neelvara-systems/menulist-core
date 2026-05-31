import { Metadata } from 'next';
import AnswerlatticePageStructuredData from '../../../components/PageStructuredData';
import AnswerlatticeInstallContractPage from '../../InstallContractPage';

export const metadata: Metadata = {
    title: 'Next.js Install',
    description: 'Answerlattice v1 install guidance for Next.js App Router and Pages Router.',
    alternates: { canonical: '/install/frameworks/nextjs' },
};

export default function Page() {
    return (
        <>
            <AnswerlatticePageStructuredData path="/install/frameworks/nextjs" />
            <AnswerlatticeInstallContractPage docKey="nextjs" />
        </>
    );
}
