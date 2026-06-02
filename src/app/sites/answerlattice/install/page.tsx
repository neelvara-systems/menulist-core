import { Metadata } from 'next';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import AnswerlatticeInstallContractPage from './InstallContractPage';

export const metadata: Metadata = {
    title: 'Install AnswerLattice with your AI coding agent',
    description: 'Copy the AnswerLattice agent packet, install the v1 widget once, pass safe page context, block sensitive routes, and verify the integration.',
    alternates: { canonical: '/install' },
};

export default function AnswerlatticeInstallPage() {
    return (
        <>
            <AnswerlatticePageStructuredData path="/install" />
            <AnswerlatticeInstallContractPage docKey="overview" />
        </>
    );
}
