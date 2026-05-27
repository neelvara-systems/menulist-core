import { Metadata } from 'next';
import CanonicaPageStructuredData from '../../../components/PageStructuredData';
import CanonicaInstallContractPage from '../../InstallContractPage';

export const metadata: Metadata = {
    title: 'Next.js Install',
    description: 'Canonica v1 install guidance for Next.js App Router and Pages Router.',
    alternates: { canonical: '/install/frameworks/nextjs' },
};

export default function Page() {
    return (
        <>
            <CanonicaPageStructuredData path="/install/frameworks/nextjs" />
            <CanonicaInstallContractPage docKey="nextjs" />
        </>
    );
}
