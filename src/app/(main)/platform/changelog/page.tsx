import ChangelogTemplate from '@template/platform/changelog';
import AnswerlatticeConfigNotice from '@template/platform/AnswerlatticeConfigNotice';
import { isAnswerlatticeFirebaseConfigured } from '@lib/firebase/answerlatticeConfig';

function ChangelogPage() {
    if (!isAnswerlatticeFirebaseConfigured) {
        return <AnswerlatticeConfigNotice surface="Changelog Management" />;
    }

    return <ChangelogTemplate />;
}

export default ChangelogPage;
