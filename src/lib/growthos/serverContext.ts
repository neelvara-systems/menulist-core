import { buildGrowthOSSourceFacts, hashGrowthOSSourceFacts } from "@lib/growthos/sourceFacts";
import { rankGrowthOSActions } from "@lib/growthos/actionRanking";
import { computeGrowthOSReadiness } from "@lib/growthos/readiness";
import { evaluateGrowthOSServerEntitlement } from "@lib/growthos/serverEntitlements";
import { resolveStorePermissionSessionScope } from "@lib/permissions/scopeDocumentId";
import {
    readGrowthOSProjectDataServer,
    readGrowthOSStoreDataServer,
    readGrowthOSSummaryServer,
} from "@database/growthos/server";
import type {
    GrowthOSActionSummary,
    GrowthOSPreflightResult,
    GrowthOSSourceFacts,
    GrowthOSSummaryDocument,
} from "@type/growthos";

export interface GrowthOSServerContext {
    actions: GrowthOSActionSummary[];
    entitlement: Awaited<ReturnType<typeof evaluateGrowthOSServerEntitlement>>;
    facts?: GrowthOSSourceFacts;
    projectData?: any;
    readiness?: GrowthOSPreflightResult;
    sourceFactsHash?: string;
    storeData?: any;
    summary?: GrowthOSSummaryDocument | null;
}

export interface GrowthOSSourceSnapshot {
    facts?: GrowthOSSourceFacts;
    projectData?: any;
    readiness?: GrowthOSPreflightResult;
    sourceFactsHash?: string;
    storeData?: any;
}

const requireGrowthOSSessionScope = (session: unknown) => {
    const scope = resolveStorePermissionSessionScope(session);
    if (!scope) {
        throw new Error("GrowthOS workspace is unavailable");
    }
    return scope;
};

export async function loadGrowthOSSourceSnapshot(params: {
    projectId: string;
    session: any;
    storeData?: any;
}): Promise<GrowthOSSourceSnapshot> {
    const scope = requireGrowthOSSessionScope(params.session);
    const storeData = params.storeData ?? await readGrowthOSStoreDataServer(scope.storeScope.documentId);
    const projectData = await readGrowthOSProjectDataServer({
        projectId: params.projectId,
        tId: scope.tenantScope.documentId,
        sId: scope.storeScope.documentId,
    });

    if (!projectData) {
        return { projectData, storeData };
    }

    const facts = buildGrowthOSSourceFacts({
        projectData,
        projectId: params.projectId,
        storeData,
        tId: scope.tenantScope.documentId,
        sId: scope.storeScope.documentId,
    });
    const sourceFactsHash = hashGrowthOSSourceFacts(facts);
    const readiness = computeGrowthOSReadiness(facts);

    return {
        facts,
        projectData,
        readiness,
        sourceFactsHash,
        storeData,
    };
}

export async function loadGrowthOSServerContext(params: {
    projectId: string;
    session: any;
}): Promise<GrowthOSServerContext> {
    const scope = requireGrowthOSSessionScope(params.session);
    const storeData = await readGrowthOSStoreDataServer(scope.storeScope.documentId);
    const entitlement = await evaluateGrowthOSServerEntitlement({
        session: params.session,
        storeData,
    });

    if (!entitlement.allowed) {
        return { actions: [], entitlement, storeData };
    }

    const snapshot = await loadGrowthOSSourceSnapshot({
        projectId: params.projectId,
        session: params.session,
        storeData,
    });

    if (!snapshot.projectData || !snapshot.facts) {
        const summary = await readGrowthOSSummaryServer({
            storeId: scope.storeScope.documentId,
            tenantId: scope.tenantScope.documentId,
        });
        return {
            actions: [],
            entitlement,
            projectData: snapshot.projectData,
            storeData,
            summary,
        };
    }

    const actions = rankGrowthOSActions(snapshot.facts);
    const summary = await readGrowthOSSummaryServer({
        storeId: scope.storeScope.documentId,
        tenantId: scope.tenantScope.documentId,
    });

    return {
        actions,
        entitlement,
        facts: snapshot.facts,
        projectData: snapshot.projectData,
        readiness: snapshot.readiness,
        sourceFactsHash: snapshot.sourceFactsHash,
        storeData: snapshot.storeData,
        summary,
    };
}

export function buildGrowthOSEmptySummary(params: {
    reason: GrowthOSSummaryDocument["reason"];
    session: any;
    sourceFactsHash?: string;
    readiness?: GrowthOSPreflightResult;
}): GrowthOSSummaryDocument {
    const scope = requireGrowthOSSessionScope(params.session);
    return {
        tId: scope.tenantScope.documentId,
        sId: scope.storeScope.documentId,
        date: new Date().toISOString().split("T")[0],
        sourceFactsHash: params.sourceFactsHash,
        eligible: false,
        reason: params.reason,
        readiness: params.readiness,
        primaryAction: null,
        secondaryActions: [],
        latestKit: null,
    };
}
