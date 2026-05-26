export const dynamic = 'force-dynamic';

import {
    deleteCanonicaRoleDefinition,
    saveCanonicaRoleDefinition,
} from '@lib/canonica/staffAccessServer';
import { withAuth } from '../../../../../middleware/auth';

export const POST = withAuth(saveCanonicaRoleDefinition);
export const PATCH = withAuth(saveCanonicaRoleDefinition);
export const DELETE = withAuth(deleteCanonicaRoleDefinition);

