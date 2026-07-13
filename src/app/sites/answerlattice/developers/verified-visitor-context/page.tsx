import { Metadata } from 'next';
import AnswerlatticeDeveloperDocPage from '../DeveloperDocPage';
import { getAnswerlatticeDeveloperDoc } from '../../publicContent';

const doc = getAnswerlatticeDeveloperDoc('/developers/verified-visitor-context');

export const metadata: Metadata = {
    title: doc?.title || 'Verified Visitor Context | AnswerLattice Developers',
    description: doc?.metaDescription,
    alternates: { canonical: '/developers/verified-visitor-context' },
};

export default function AnswerlatticeVerifiedVisitorContextDeveloperPage() {
    return <AnswerlatticeDeveloperDocPage docPath="/developers/verified-visitor-context" />;
}
