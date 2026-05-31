import { Metadata } from 'next';
import AnswerlatticePageStructuredData from '../../../components/PageStructuredData';
import AnswerlatticeInstallContractPage from '../../InstallContractPage';

export const metadata: Metadata = {
    title: 'Vue Install',
    description: 'Answerlattice v1 install guidance for Vue and Nuxt apps.',
    alternates: { canonical: '/install/frameworks/vue' },
};

export default function Page() {
    return (
        <>
            <AnswerlatticePageStructuredData path="/install/frameworks/vue" />
            <AnswerlatticeInstallContractPage docKey="vue" />
        </>
    );
}
