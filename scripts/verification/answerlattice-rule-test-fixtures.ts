import { doc, type Firestore, setDoc } from 'firebase/firestore';

export async function seedActiveAnswerlatticeRuleWorkspace(
    db: unknown,
    scope: { tenantId?: number; storeId?: number } = {},
): Promise<void> {
    const tenantId = scope.tenantId ?? 1;
    const storeId = scope.storeId ?? 101;
    await setDoc(doc(db as Firestore, 'stores', String(storeId)), {
        active: true,
        authDisabled: false,
        deleted: false,
        id: storeId,
        pId: 'AL',
        productId: 'AL',
        sId: storeId,
        storeId,
        tId: tenantId,
        tenantId,
    });
}
