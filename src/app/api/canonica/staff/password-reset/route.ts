export const dynamic = 'force-dynamic';

import { requestCanonicaStaffPasswordReset } from '@lib/canonica/staffAccessServer';
import { withAuth } from '../../../../../middleware/auth';

export const POST = withAuth(requestCanonicaStaffPasswordReset);

