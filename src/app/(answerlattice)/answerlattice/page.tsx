import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_ROUTES } from '@constant/answerlattice/navigations';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { authOptions } from '@lib/auth';
import { getAnswerlatticeAccessContext, getAnswerlatticeDb } from '@lib/answerlattice/accessControl';
import { getAnswerlatticeActivationSummaryDocId } from '@lib/answerlattice/activationSummary';
import { getAnswerlatticeScopeLogContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import { DB_COLLECTIONS } from '@constant/database';
import { canUseAnswerlatticeManagement } from '@lib/answerlattice/sessionScope';
import AnswerlatticeClientHome from '@template/answerlattice/clientPortal/AnswerlatticeClientHome';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

/**
 * Answerlattice base route — renders the client support portal.
 *
 * Keeping this as real content avoids an empty desktop shell if the app-router
 * redirect is swallowed during hydration.
 */
export default async function AnswerlatticeBasePage() {
    const session = await getServerSession(authOptions);
    if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ACTIVATION_COMMAND_CENTER) {
        const access = await getAnswerlatticeAccessContext(session);
        if (access?.canUseManagement) {
            if (access.permissions[ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS]) {
                const dailyBriefEnabled = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT
                    && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_FOUNDER_DAILY_BRIEF
                    && access.permissions[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT];
                if (dailyBriefEnabled) {
                    const db = getAnswerlatticeDb();
                    if (db) {
                        let launchProofReady = false;
                        try {
                            const activationSnapshot = await db
                                .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
                                .doc(getAnswerlatticeActivationSummaryDocId(access.scope.tenantId, access.scope.storeId))
                                .get();
                            const activation = activationSnapshot.exists ? activationSnapshot.data() : null;
                            const launchProof = activation?.launchProof;
                            const currentPriorityProofReady = Array.isArray(launchProof?.items)
                                && launchProof.items.some((item: unknown) => (
                                    Boolean(item)
                                    && typeof item === 'object'
                                    && (item as { key?: unknown }).key === 'priority-answer-checks'
                                    && (item as { status?: unknown }).status === 'complete'
                                ));
                            launchProofReady = Boolean(
                                activation?.pId === 'AL'
                                && activation?.tId === access.scope.tenantId
                                && activation?.sId === access.scope.storeId
                                && launchProof?.ready === true
                                && Number.isInteger(launchProof.completeCount)
                                && Number.isInteger(launchProof.totalCount)
                                && launchProof.totalCount > 0
                                && launchProof.completeCount === launchProof.totalCount
                                && Array.isArray(launchProof.blockers)
                                && launchProof.blockers.length === 0
                                && currentPriorityProofReady
                            );
                        } catch (error) {
                            logAnswerlatticeFailure(
                                'answerlattice_base_route_activation_snapshot_failed',
                                error,
                                getAnswerlatticeScopeLogContext({
                                    tId: access.scope.tenantId,
                                    sId: access.scope.storeId,
                                }),
                            );
                        }
                        if (launchProofReady) redirect(ANSWERLATTICE_ROUTES.SUPPORT_ASSISTANT);
                    }
                }
                redirect(ANSWERLATTICE_ROUTES.ACTIVATION);
            }
            if (access.permissions[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT]) {
                redirect(FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SUPPORT_BOARD ? ANSWERLATTICE_ROUTES.SUPPORT_BOARD : ANSWERLATTICE_ROUTES.TICKETS);
            }
            if (access.permissions[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE]) redirect(ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE);
            if (access.permissions[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET]) redirect(ANSWERLATTICE_ROUTES.WIDGET);
        }
        if (!access && canUseAnswerlatticeManagement(session)) {
            redirect(ANSWERLATTICE_ROUTES.ACTIVATION);
        }
    }

    return <AnswerlatticeClientHome />;
}
