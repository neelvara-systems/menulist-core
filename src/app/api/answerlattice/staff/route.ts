export const dynamic = 'force-dynamic';

import {
    createAnswerlatticeStaffUser,
    listAnswerlatticeStaffUsers,
    removeAnswerlatticeStaffUser,
    updateAnswerlatticeStaffUser,
} from '@lib/answerlattice/staffAccessServer';
import { withAuth } from '../../../../middleware/auth';

export const GET = withAuth(listAnswerlatticeStaffUsers);
export const POST = withAuth(createAnswerlatticeStaffUser);
export const PATCH = withAuth(updateAnswerlatticeStaffUser);
export const DELETE = withAuth(removeAnswerlatticeStaffUser);

