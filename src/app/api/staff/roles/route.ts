export const dynamic = "force-dynamic";

import {
    deleteRoleDefinition,
    saveRoleDefinition,
} from "@lib/staffManagement/server";
import { withAuth } from "../../../../middleware/auth";

export const POST = withAuth(saveRoleDefinition);
export const PATCH = withAuth(saveRoleDefinition);
export const DELETE = withAuth(deleteRoleDefinition);
