export const dynamic = "force-dynamic";

import { forceSignOutStaffUser } from "@lib/staffManagement/server";
import { withAuth } from "../../../../middleware/auth";

export const POST = withAuth(forceSignOutStaffUser);
