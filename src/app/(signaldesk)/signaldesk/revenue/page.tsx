import { FEATURE_FLAGS } from "@config/features";
import SignalDeskWorkspace from "@/components/signaldesk/SignalDeskWorkspace";
import { notFound } from "next/navigation";

export default function SignalDeskRevenuePage() {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_REVENUE_OPERATING_LAYER) notFound();
    return <SignalDeskWorkspace activeSection="revenue" />;
}
