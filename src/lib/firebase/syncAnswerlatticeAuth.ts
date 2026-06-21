import { signInWithCustomToken } from 'firebase/auth';
import { shouldUseSharedAnswerlatticeFirebase } from './answerlatticeConfig';

export async function syncAnswerlatticeAuthWithCustomToken(answerlatticeCustomToken?: string | null): Promise<boolean> {
    if (shouldUseSharedAnswerlatticeFirebase || !answerlatticeCustomToken) {
        return false;
    }

    const { answerlatticeAuth } = await import('./answerlatticeFirebaseClient');
    if (!answerlatticeAuth) {
        return false;
    }

    await signInWithCustomToken(answerlatticeAuth, answerlatticeCustomToken);
    return true;
}
