import { Metadata } from 'next';
import CanonicaPageStructuredData from '../../components/PageStructuredData';
import CanonicaInstallContractPage from '../InstallContractPage';

export const metadata: Metadata = {
    title: 'Install Changelog',
    description: 'Canonica agent install layer and widget contract changelog.',
    alternates: { canonical: '/install/changelog' },
};

export default function Page() {
    return (
        <>
            <CanonicaPageStructuredData path="/install/changelog" />
            <CanonicaInstallContractPage docKey="changelog" />
        </>
    );
}
