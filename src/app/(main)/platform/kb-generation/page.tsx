import KBGenerationTemplate from '@template/platform/KBGeneration'
import AnswerlatticeConfigNotice from '@template/platform/AnswerlatticeConfigNotice'
import { isAnswerlatticeFirebaseConfigured } from '@lib/firebase/answerlatticeConfig'

function page() {
    if (!isAnswerlatticeFirebaseConfigured) {
        return <AnswerlatticeConfigNotice surface="KB Generation" />
    }

    return (
        <KBGenerationTemplate />
    )
}

export default page
