import { Metadata } from 'next';
import AnswerlatticeDeveloperDocPage from '../DeveloperDocPage';
import { getAnswerlatticeDeveloperDoc } from '../../publicContent';

const docPath = '/developers/widget-verification';
const doc = getAnswerlatticeDeveloperDoc(docPath);

export const metadata: Metadata = {
    title: doc?.title || 'Widget Verification | AnswerLattice Developers',
    description: doc?.metaDescription,
    alternates: { canonical: docPath },
};

export default function WidgetVerificationPage() {
    return <AnswerlatticeDeveloperDocPage docPath={docPath} />;
}
