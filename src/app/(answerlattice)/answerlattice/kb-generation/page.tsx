import { redirect } from 'next/navigation';
import { ANSWERLATTICE_ROUTES } from '@constant/answerlattice/routes';

export default function AnswerlatticeKBGenerationPage() {
    redirect(ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE);
}
