export const dynamic = 'force-dynamic';

import { forceSignOutAnswerlatticeStaffUser } from '@lib/answerlattice/staffAccessServer';
import { withAuth } from '../../../../../middleware/auth';

export const POST = withAuth(forceSignOutAnswerlatticeStaffUser);
