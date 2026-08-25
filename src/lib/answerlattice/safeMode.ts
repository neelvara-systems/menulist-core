import { requireAnswerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkSafeMode } from '@lib/ops/safeMode';

/**
 * Runs the shared cost-protection policy against Answerlattice's dedicated
 * Firebase project. Never let an Answerlattice route fall back to the default
 * MenuList Admin app merely because SAFE_MODE is shared infrastructure.
 */
export const checkAnswerlatticeSafeMode = () => checkSafeMode({
    getFirestore: requireAnswerlatticeFirestoreAdmin,
});
