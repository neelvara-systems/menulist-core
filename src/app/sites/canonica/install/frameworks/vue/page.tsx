import { Metadata } from 'next';
import CanonicaPageStructuredData from '../../../components/PageStructuredData';
import CanonicaInstallContractPage from '../../InstallContractPage';

export const metadata: Metadata = {
    title: 'Vue Install',
    description: 'Canonica v1 install guidance for Vue and Nuxt apps.',
    alternates: { canonical: '/install/frameworks/vue' },
};

export default function Page() {
    return (
        <>
            <CanonicaPageStructuredData path="/install/frameworks/vue" />
            <CanonicaInstallContractPage docKey="vue" />
        </>
    );
}
