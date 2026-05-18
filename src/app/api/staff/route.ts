export const dynamic = "force-dynamic";

import {
    createStaffUser,
    listStaffUsers,
    removeStaffFromStore,
    updateStaffUser,
} from "@lib/staffManagement/server";
import { withAuth } from "../../../middleware/auth";

export const GET = withAuth(listStaffUsers);
export const POST = withAuth(createStaffUser);
export const PATCH = withAuth(updateStaffUser);
export const DELETE = withAuth(removeStaffFromStore);
