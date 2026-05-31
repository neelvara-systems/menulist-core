import { FEATURE_FLAGS } from '@config/features';
import { CANONICA_ROUTES } from '@constant/canonica/navigations';
import { CANONICA_PERMISSION_KEYS } from '@constant/canonica/permissions';
import { authOptions } from '@lib/auth';
import { getCanonicaAccessContext } from '@lib/canonica/accessControl';
import { canUseCanonicaManagement } from '@lib/canonica/sessionScope';
import CanonicaClientHome from '@template/canonica/clientPortal/CanonicaClientHome';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

/**
 * Canonica base route — renders the client support portal.
 *
 * Keeping this as real content avoids an empty desktop shell if the app-router
 * redirect is swallowed during hydration.
 */
export default async function CanonicaBasePage() {
    const session = await getServerSession(authOptions);
    if (FEATURE_FLAGS.ENABLE_CANONICA_ACTIVATION_COMMAND_CENTER) {
        const access = await getCanonicaAccessContext(session);
        if (access?.canUseManagement) {
            if (access.permissions[CANONICA_PERMISSION_KEYS.VIEW_READINESS]) redirect(CANONICA_ROUTES.ACTIVATION);
            if (access.permissions[CANONICA_PERMISSION_KEYS.MANAGE_SUPPORT]) {
                redirect(FEATURE_FLAGS.ENABLE_CANONICA_SUPPORT_BOARD ? CANONICA_ROUTES.SUPPORT_BOARD : CANONICA_ROUTES.TICKETS);
            }
            if (access.permissions[CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE]) redirect(CANONICA_ROUTES.KNOWLEDGE_INTAKE);
            if (access.permissions[CANONICA_PERMISSION_KEYS.MANAGE_WIDGET]) redirect(CANONICA_ROUTES.WIDGET);
        }
        if (!access && canUseCanonicaManagement(session)) {
            redirect(CANONICA_ROUTES.ACTIVATION);
        }
    }

    return <CanonicaClientHome />;
}
