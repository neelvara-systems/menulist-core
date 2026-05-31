import FeedbackAdminTemplate from '@template/platform/feedbackAdmin';
import AnswerlatticeConfigNotice from '@template/platform/AnswerlatticeConfigNotice';
import { isAnswerlatticeFirebaseConfigured } from '@lib/firebase/answerlatticeFirebaseClient';

function FeedbackAdminPage() {
    if (!isAnswerlatticeFirebaseConfigured) {
        return <AnswerlatticeConfigNotice surface="Feedback Admin" />;
    }

    return <FeedbackAdminTemplate />;
}

export default FeedbackAdminPage;
