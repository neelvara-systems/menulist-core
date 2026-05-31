import { Metadata } from 'next';
import AnswerlatticePageStructuredData from '../../components/PageStructuredData';
import AnswerlatticeInstallContractPage from '../InstallContractPage';

export const metadata: Metadata = {
    title: 'AI Agent Install Packet',
    description: 'Copyable Answerlattice v1 install packet for Codex, Claude Code, Cursor, Windsurf, and other coding agents.',
    alternates: { canonical: '/install/ai-agent' },
};

export default function Page() {
    return (
        <>
            <AnswerlatticePageStructuredData path="/install/ai-agent" />
            <AnswerlatticeInstallContractPage docKey="ai-agent" />
        </>
    );
}
