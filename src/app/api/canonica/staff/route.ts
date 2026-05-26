export const dynamic = 'force-dynamic';

import {
    createCanonicaStaffUser,
    listCanonicaStaffUsers,
    removeCanonicaStaffUser,
    updateCanonicaStaffUser,
} from '@lib/canonica/staffAccessServer';
import { withAuth } from '../../../../middleware/auth';

export const GET = withAuth(listCanonicaStaffUsers);
export const POST = withAuth(createCanonicaStaffUser);
export const PATCH = withAuth(updateCanonicaStaffUser);
export const DELETE = withAuth(removeCanonicaStaffUser);

