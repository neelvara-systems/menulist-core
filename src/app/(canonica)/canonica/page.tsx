import { FEATURE_FLAGS } from '@config/features';
import { CANONICA_ROUTES } from '@constant/canonica/navigations';
import { authOptions } from '@lib/auth';
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
    if (FEATURE_FLAGS.ENABLE_CANONICA_ACTIVATION_COMMAND_CENTER && canUseCanonicaManagement(session)) {
        redirect(CANONICA_ROUTES.ACTIVATION);
    }

    return <CanonicaClientHome />;
}
