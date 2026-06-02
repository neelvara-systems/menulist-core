import { Metadata } from 'next';
import AnswerlatticeDeveloperDocPage from '../DeveloperDocPage';
import { getAnswerlatticeDeveloperDoc } from '../../publicContent';

const docPath = '/developers/safe-page-context';
const doc = getAnswerlatticeDeveloperDoc(docPath);

export const metadata: Metadata = {
    title: doc?.title || 'Safe Page Context | AnswerLattice Developers',
    description: doc?.metaDescription,
    alternates: { canonical: docPath },
};

export default function SafePageContextPage() {
    return <AnswerlatticeDeveloperDocPage docPath={docPath} />;
}
