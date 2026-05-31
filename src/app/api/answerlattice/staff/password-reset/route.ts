export const dynamic = 'force-dynamic';

import { requestAnswerlatticeStaffPasswordReset } from '@lib/answerlattice/staffAccessServer';
import { withAuth } from '../../../../../middleware/auth';

export const POST = withAuth(requestAnswerlatticeStaffPasswordReset);

