import { redirect } from 'next/navigation';
import { CANONICA_ROUTES } from '@constant/canonica/routes';

export default function CanonicaKBGenerationPage() {
    redirect(CANONICA_ROUTES.KNOWLEDGE_INTAKE);
}
