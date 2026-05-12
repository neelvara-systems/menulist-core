import { CANONICA_ROUTES } from '@constant/canonica/navigations';
import { redirect } from 'next/navigation';

/**
 * Canonica base route — redirects to the MenuList client support portal.
 */
export default function CanonicaBasePage() {
    redirect(CANONICA_ROUTES.HELP);
}
