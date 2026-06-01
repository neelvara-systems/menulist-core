import { buildGrowthOSSourceFacts, hashGrowthOSSourceFacts } from "@lib/growthos/sourceFacts";
import { rankGrowthOSActions } from "@lib/growthos/actionRanking";
import { computeGrowthOSReadiness } from "@lib/growthos/readiness";
import { evaluateGrowthOSServerEntitlement } from "@lib/growthos/serverEntitlements";
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

export async function loadGrowthOSSourceSnapshot(params: {
    projectId: string;
    session: any;
    storeData?: any;
}): Promise<GrowthOSSourceSnapshot> {
    const storeData = params.storeData ?? await readGrowthOSStoreDataServer(params.session.sId);
    const projectData = await readGrowthOSProjectDataServer({
        projectId: params.projectId,
        tId: params.session.tId,
        sId: params.session.sId,
    });

    if (!projectData) {
        return { projectData, storeData };
    }

    const facts = buildGrowthOSSourceFacts({
        projectData,
        projectId: params.projectId,
        storeData,
        tId: params.session.tId,
        sId: params.session.sId,
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
    const storeData = await readGrowthOSStoreDataServer(params.session.sId);
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
        const summary = await readGrowthOSSummaryServer(params.session.sId);
        return {
            actions: [],
            entitlement,
            projectData: snapshot.projectData,
            storeData,
            summary,
        };
    }

    const actions = rankGrowthOSActions(snapshot.facts);
    const summary = await readGrowthOSSummaryServer(params.session.sId);

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
    return {
        tId: String(params.session.tId),
        sId: String(params.session.sId),
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
