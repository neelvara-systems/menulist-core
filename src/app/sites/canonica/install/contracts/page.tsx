import { Metadata } from 'next';
import CanonicaPageStructuredData from '../../components/PageStructuredData';
import CanonicaInstallContractPage from '../InstallContractPage';

export const metadata: Metadata = {
    title: 'Widget Contract v1',
    description: 'Canonica Widget Contract v1 stability policy and compatibility boundary.',
    alternates: { canonical: '/install/contracts' },
};

export default function Page() {
    return (
        <>
            <CanonicaPageStructuredData path="/install/contracts" />
            <CanonicaInstallContractPage docKey="contracts" />
        </>
    );
}
