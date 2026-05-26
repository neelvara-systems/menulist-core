export const dynamic = 'force-dynamic';

import { forceSignOutCanonicaStaffUser } from '@lib/canonica/staffAccessServer';
import { withAuth } from '../../../../../middleware/auth';

export const POST = withAuth(forceSignOutCanonicaStaffUser);
