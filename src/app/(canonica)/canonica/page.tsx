import { CANONICA_ROUTES } from '@constant/canonica/navigations';
import { redirect } from 'next/navigation';

/**
 * Canonica base route — redirects to dashboard
 */
export default function CanonicaBasePage() {
    redirect(CANONICA_ROUTES.DASHBOARD);
}
