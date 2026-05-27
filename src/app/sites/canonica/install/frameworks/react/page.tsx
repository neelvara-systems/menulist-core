import { Metadata } from 'next';
import CanonicaPageStructuredData from '../../../components/PageStructuredData';
import CanonicaInstallContractPage from '../../InstallContractPage';

export const metadata: Metadata = {
    title: 'React Install',
    description: 'Canonica v1 install guidance for React SPAs.',
    alternates: { canonical: '/install/frameworks/react' },
};

export default function Page() {
    return (
        <>
            <CanonicaPageStructuredData path="/install/frameworks/react" />
            <CanonicaInstallContractPage docKey="react" />
        </>
    );
}
