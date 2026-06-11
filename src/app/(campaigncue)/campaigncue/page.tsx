import { CAMPAIGNCUE_APP_INTERNAL_WORKSPACE_PATH } from "@constant/campaigncue/domains";
import { redirect } from "next/navigation";

export default function CampaignCueBasePage() {
    redirect(CAMPAIGNCUE_APP_INTERNAL_WORKSPACE_PATH);
}
