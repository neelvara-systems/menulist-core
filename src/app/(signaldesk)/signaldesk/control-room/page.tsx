import SignalDeskWorkspace from "@/components/signaldesk/SignalDeskWorkspace";
import { FEATURE_FLAGS } from "@config/features";
import { notFound } from "next/navigation";

export default function SignalDeskControlRoomPage() {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_CONTROL_ROOM) notFound();
    return <SignalDeskWorkspace activeSection="control-room" />;
}
