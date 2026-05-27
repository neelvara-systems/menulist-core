import { Metadata } from 'next';
import CanonicaPageStructuredData from '../../components/PageStructuredData';
import CanonicaInstallContractPage from '../InstallContractPage';

export const metadata: Metadata = {
    title: 'Verify Installation',
    description: 'Canonica v1 install verification checks for script load, blocked routes, context updates, and dashboard status.',
    alternates: { canonical: '/install/verify' },
};

export default function Page() {
    return (
        <>
            <CanonicaPageStructuredData path="/install/verify" />
            <CanonicaInstallContractPage docKey="verify" />
        </>
    );
}
