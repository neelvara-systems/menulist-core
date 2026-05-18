export const dynamic = "force-dynamic";

import { requestStaffPasswordReset } from "@lib/staffManagement/server";
import { withAuth } from "../../../../middleware/auth";

export const POST = withAuth(requestStaffPasswordReset);
