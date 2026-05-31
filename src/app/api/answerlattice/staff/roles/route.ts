export const dynamic = 'force-dynamic';

import {
    deleteAnswerlatticeRoleDefinition,
    saveAnswerlatticeRoleDefinition,
} from '@lib/answerlattice/staffAccessServer';
import { withAuth } from '../../../../../middleware/auth';

export const POST = withAuth(saveAnswerlatticeRoleDefinition);
export const PATCH = withAuth(saveAnswerlatticeRoleDefinition);
export const DELETE = withAuth(deleteAnswerlatticeRoleDefinition);

