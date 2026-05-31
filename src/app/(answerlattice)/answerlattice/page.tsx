import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_ROUTES } from '@constant/answerlattice/navigations';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { authOptions } from '@lib/auth';
import { getAnswerlatticeAccessContext } from '@lib/answerlattice/accessControl';
import { canUseAnswerlatticeManagement } from '@lib/answerlattice/sessionScope';
import AnswerlatticeClientHome from '@template/answerlattice/clientPortal/AnswerlatticeClientHome';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

/**
 * Answerlattice base route — renders the client support portal.
 *
 * Keeping this as real content avoids an empty desktop shell if the app-router
 * redirect is swallowed during hydration.
 */
export default async function AnswerlatticeBasePage() {
    const session = await getServerSession(authOptions);
    if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ACTIVATION_COMMAND_CENTER) {
        const access = await getAnswerlatticeAccessContext(session);
        if (access?.canUseManagement) {
            if (access.permissions[ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS]) redirect(ANSWERLATTICE_ROUTES.ACTIVATION);
            if (access.permissions[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT]) {
                redirect(FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SUPPORT_BOARD ? ANSWERLATTICE_ROUTES.SUPPORT_BOARD : ANSWERLATTICE_ROUTES.TICKETS);
            }
            if (access.permissions[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE]) redirect(ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE);
            if (access.permissions[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET]) redirect(ANSWERLATTICE_ROUTES.WIDGET);
        }
        if (!access && canUseAnswerlatticeManagement(session)) {
            redirect(ANSWERLATTICE_ROUTES.ACTIVATION);
        }
    }

    return <AnswerlatticeClientHome />;
}
