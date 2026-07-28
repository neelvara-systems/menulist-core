import { DEFAULT_ANSWERLATTICE_ROLE_IDS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { formatStaffLoginId, normalizeStaffLoginUsername } from '@lib/auth/loginIdentifiers';
import type { AnswerlatticeStaffStoreMembership } from '@lib/answerlattice/staffAccessContracts';
import {
    normalizeAnswerlatticeScopeDocumentId,
    normalizeConsistentAnswerlatticeScopeDocumentIds,
} from '@lib/answerlattice/sessionScope';
import { sanitizeForFirestore } from '@lib/firestore/sanitizeForFirestore';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const getRecord = (value: unknown): Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {}
);

export const parseAnswerlatticeStaffBridgeAccountScope = (
    account: Record<string, unknown>,
): { tenantId: number; storeId: number | null } | null => {
    const tenantId = normalizeConsistentAnswerlatticeScopeDocumentIds([
        account.tenantId,
        account.tId,
    ]);
    if (!tenantId) return null;
    const suppliedStoreAliases = [account.storeId, account.sId]
        .filter((value) => value !== undefined && value !== null);
    const storeId = suppliedStoreAliases.length > 0
        ? normalizeConsistentAnswerlatticeScopeDocumentIds(suppliedStoreAliases)
        : null;
    if (suppliedStoreAliases.length > 0 && !storeId) return null;
    return { tenantId, storeId };
};

export const hasNoAnswerlatticeStaffBridgeMemberships = (
    account: Record<string, unknown>,
): boolean => {
    const hasDirectStore = [account.storeId, account.sId]
        .some((value) => value !== undefined && value !== null);
    if (hasDirectStore) return false;
    if (account.storeIds === undefined) return true;
    return Array.isArray(account.storeIds) && account.storeIds.length === 0;
};

export const syncAnswerlatticeStaffProductAccountBridge = async (params: {
    accessRevision: number;
    active: boolean;
    db: FirebaseFirestore.Firestore;
    defaultUserId: string;
    email: string;
    fallbackStoreId: number;
    firebaseUid?: string;
    loginUsername?: string;
    memberships: AnswerlatticeStaffStoreMembership[];
    name: string;
    primaryMembership: AnswerlatticeStaffStoreMembership | null;
    staffAuthMode: string;
    tenantId: number;
    userId: string;
}): Promise<boolean> => {
    const userRef = params.db.collection(DB_COLLECTIONS.USERS).doc(params.defaultUserId);
    return params.db.runTransaction(async (transaction) => {
        const userSnapshot = await transaction.get(userRef);
        const userData = userSnapshot.data() || {};
        const productAccounts = getRecord(userData.productAccounts);
        const currentAccount = getRecord(productAccounts[PRODUCT_IDS.ANSWERLATTICE]);
        const suppliedRootProductIds = [userData.pId, userData.productId]
            .filter((productId) => productId !== undefined);
        const rootIsAnswerlattice = suppliedRootProductIds.length > 0
            && suppliedRootProductIds.every((productId) => productId === PRODUCT_IDS.ANSWERLATTICE);
        const currentAccountRevision = typeof currentAccount.accessRevision === 'number'
            && Number.isSafeInteger(currentAccount.accessRevision)
            && currentAccount.accessRevision >= 0
            ? currentAccount.accessRevision
            : 0;
        const currentRootRevision = rootIsAnswerlattice
            && typeof userData.accessRevision === 'number'
            && Number.isSafeInteger(userData.accessRevision)
            && userData.accessRevision >= 0
            ? userData.accessRevision
            : 0;
        const currentRevision = Math.max(currentAccountRevision, currentRootRevision);
        if (currentRevision > params.accessRevision) return false;

        const currentAccountScope = parseAnswerlatticeStaffBridgeAccountScope(currentAccount);
        const currentAccountStoreId = currentAccountScope?.storeId ?? null;
        const primaryMembership = params.primaryMembership
            || params.memberships.find(({ storeId }) => storeId === currentAccountStoreId)
            || params.memberships[0]
            || null;
        const accountStoreId = primaryMembership?.storeId
            ?? (params.memberships.length > 0 ? currentAccountStoreId || params.fallbackStoreId : null);
        const accountActive = params.active && params.memberships.length > 0;
        const rootStoreId = accountActive ? accountStoreId : null;
        const accountRole = primaryMembership?.role
            || (typeof currentAccount.role === 'string' ? currentAccount.role : DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF);
        const nextStoreIds = params.memberships.map(({ storeId }) => storeId);
        const currentStoreIds = Array.isArray(currentAccount.storeIds)
            ? currentAccount.storeIds
                .map((storeId) => normalizeAnswerlatticeScopeDocumentId(storeId))
                .filter((storeId): storeId is number => storeId !== null)
            : [];
        const currentStoreIdsAreCanonical = Array.isArray(currentAccount.storeIds)
            && currentAccount.storeIds.length === nextStoreIds.length
            && currentAccount.storeIds.every((storeId, index) => storeId === nextStoreIds[index]);
        const hasRootScopeEvidence = [
            userData.tenantId,
            userData.tId,
            userData.storeId,
            userData.sId,
        ].some((value) => value !== undefined && value !== null);
        const expectedFirebaseUid = params.firebaseUid || userData.firebaseUid;
        const loginUsername = normalizeStaffLoginUsername(
            params.loginUsername
            || (typeof userData.loginUsername === 'string' ? userData.loginUsername : '')
            || (typeof userData.staffLoginId === 'string' ? userData.staffLoginId : ''),
        );
        const staffLoginId = formatStaffLoginId(
            params.loginUsername
            || (typeof userData.staffLoginId === 'string' ? userData.staffLoginId : '')
            || (typeof userData.loginUsername === 'string' ? userData.loginUsername : ''),
        );
        const shouldSetRootAnswerlatticeScope = rootIsAnswerlattice
            || (suppliedRootProductIds.length === 0 && !hasRootScopeEvidence);
        const rootScopeMatches = !shouldSetRootAnswerlatticeScope || (
            userData.active === accountActive
            && userData.authDisabled === !accountActive
            && userData.pId === PRODUCT_IDS.ANSWERLATTICE
            && userData.productId === PRODUCT_IDS.ANSWERLATTICE
            && userData.tId === params.tenantId
            && userData.tenantId === params.tenantId
            && userData.sId === rootStoreId
            && userData.storeId === rootStoreId
            && userData.role === accountRole
            && Array.isArray(userData.storeIds)
            && JSON.stringify(userData.storeIds) === JSON.stringify(nextStoreIds)
        );
        if (
            currentRevision === params.accessRevision
            && currentAccount.active === accountActive
            && currentAccount.authDisabled === !accountActive
            && currentAccount.deleted === (params.memberships.length === 0)
            && currentAccount.tenantId === params.tenantId
            && currentAccount.storeId === accountStoreId
            && currentAccount.role === accountRole
            && JSON.stringify(currentStoreIds) === JSON.stringify(nextStoreIds)
            && currentStoreIdsAreCanonical
            && rootScopeMatches
            && userData.email === params.email
            && userData.firebaseUid === expectedFirebaseUid
            && userData.isVerified === true
            && userData.loginUsername === loginUsername
            && userData.name === params.name
            && userData.staffAuthMode === params.staffAuthMode
            && userData.staffLoginId === staffLoginId
        ) {
            return false;
        }
        const platformRole = typeof userData.platformRole === 'string' ? userData.platformRole : 'USER';
        const now = Timestamp.now();
        const productAccount = {
            ...currentAccount,
            accessRevision: params.accessRevision,
            active: accountActive,
            authDisabled: !accountActive,
            deleted: params.memberships.length === 0,
            platformRole,
            role: accountRole,
            storeId: accountStoreId,
            storeIds: nextStoreIds,
            tenantId: params.tenantId,
            updatedAt: now,
        };
        const update = sanitizeForFirestore({
            email: params.email,
            firebaseUid: expectedFirebaseUid,
            isVerified: true,
            loginUsername,
            modifiedOn: now,
            name: params.name,
            productAccounts: {
                ...productAccounts,
                [PRODUCT_IDS.ANSWERLATTICE]: productAccount,
            },
            staffAuthMode: params.staffAuthMode,
            staffLoginId,
            ...(shouldSetRootAnswerlatticeScope ? {
                accessRevision: params.accessRevision,
                active: accountActive,
                authDisabled: !accountActive,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                platformRole,
                productId: PRODUCT_IDS.ANSWERLATTICE,
                role: accountRole,
                sId: rootStoreId,
                storeId: rootStoreId,
                storeIds: nextStoreIds,
                stores: params.memberships,
                tId: params.tenantId,
                tenantId: params.tenantId,
                uId: params.userId,
            } : {}),
        }, { undefinedObjectValue: 'omit' });
        transaction.set(userRef, update, { merge: true });
        return true;
    });
};

export const eraseAnswerlatticeStaffProductAccountBridge = async (params: {
    db: FirebaseFirestore.Firestore;
    defaultUserId: string;
    tenantId: number;
}): Promise<boolean> => {
    const userRef = params.db.collection(DB_COLLECTIONS.USERS).doc(params.defaultUserId);
    return params.db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(userRef);
        if (!snapshot.exists) return false;

        const data = snapshot.data() || {};
        const productAccounts = getRecord(data.productAccounts);
        const account = getRecord(productAccounts[PRODUCT_IDS.ANSWERLATTICE]);
        const accountScope = parseAnswerlatticeStaffBridgeAccountScope(account);
        if (!accountScope || accountScope.tenantId !== params.tenantId) {
            return false;
        }
        if (!hasNoAnswerlatticeStaffBridgeMemberships(account)) {
            throw new Error('ANSWERLATTICE_PRODUCT_ACCOUNT_STILL_HAS_MEMBERSHIPS');
        }

        const suppliedRootProductIds = [data.pId, data.productId]
            .filter((value) => value !== undefined);
        const rootIsAnswerlattice = suppliedRootProductIds.length > 0
            && suppliedRootProductIds.every((value) => value === PRODUCT_IDS.ANSWERLATTICE);
        const update: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {
            [`productAccounts.${PRODUCT_IDS.ANSWERLATTICE}`]: FieldValue.delete(),
            modifiedOn: Timestamp.now(),
        };
        if (rootIsAnswerlattice) {
            [
                'accessRevision',
                'pId',
                'productId',
                'role',
                'sId',
                'storeId',
                'storeIds',
                'stores',
                'tId',
                'tenantId',
            ].forEach((field) => {
                update[field] = FieldValue.delete();
            });
        }
        transaction.update(userRef, update);
        return true;
    });
};
