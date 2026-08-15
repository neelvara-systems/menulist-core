import type { AnswerlatticeAnswerTestCase } from '@lib/answerlattice/answerTestContracts';
import {
    ANSWERLATTICE_PRODUCT_STARTER_PACK_CASE_IDS,
    isAnswerlatticeProductStarterPackCaseId,
} from '@lib/answerlattice/firstTrustedAnswerPackContracts';
import {
    ANSWERLATTICE_FIRST_TRUSTED_ANSWER_CASE_IDS,
    ANSWERLATTICE_FIRST_TRUSTED_ANSWER_STARTER_QUESTIONS,
} from '@lib/answerlattice/firstTrustedAnswerStarterQuestions';

export { ANSWERLATTICE_FIRST_TRUSTED_ANSWER_CASE_IDS } from '@lib/answerlattice/firstTrustedAnswerStarterQuestions';

export const createAnswerlatticeFirstTrustedAnswerCases = (
    existingCaseIds: Iterable<string>,
    now = new Date(),
): AnswerlatticeAnswerTestCase[] => {
    const existing = new Set(existingCaseIds);
    if (Array.from(existing).some(isAnswerlatticeProductStarterPackCaseId)) return [];
    const timestamp = now.toISOString();

    return ANSWERLATTICE_FIRST_TRUSTED_ANSWER_STARTER_QUESTIONS
        .filter(testCase => !existing.has(testCase.id))
        .map((testCase): AnswerlatticeAnswerTestCase => ({
            id: testCase.id,
            title: testCase.title,
            query: testCase.query,
            context: {
                contextVersion: 1,
                feature: testCase.feature,
                workflow: testCase.workflow,
            },
            expected: {
                source: 'canonical',
                mustInclude: [],
                mustNotInclude: [],
                citationPolicy: 'not_required',
                referenceIds: [],
            },
            riskLevel: testCase.riskLevel,
            relatedEntityIds: [],
            active: true,
            createdAt: timestamp,
            updatedAt: timestamp,
        }));
};

type FirstTrustedAnswerCaseLike = Pick<AnswerlatticeAnswerTestCase, 'id' | 'active' | 'launchPack'>;

const getCasesInRequiredOrder = <T extends FirstTrustedAnswerCaseLike>(
    cases: ReadonlyArray<T>,
    requiredIds: readonly string[],
): T[] => {
    const casesById = new Map<string, T>();
    for (const testCase of cases) {
        if (casesById.has(testCase.id)) return [];
        casesById.set(testCase.id, testCase);
    }
    return requiredIds.flatMap(id => {
        const testCase = casesById.get(id);
        return testCase ? [testCase] : [];
    });
};

export const getAnswerlatticeFirstTrustedAnswerCases = <T extends FirstTrustedAnswerCaseLike>(
    cases: ReadonlyArray<T>,
    options: { activeOnly?: boolean } = {},
): T[] => {
    const hasProductPackCase = cases.some(testCase => isAnswerlatticeProductStarterPackCaseId(testCase.id));
    if (!hasProductPackCase) {
        return getCasesInRequiredOrder(cases, ANSWERLATTICE_FIRST_TRUSTED_ANSWER_CASE_IDS)
            .filter(testCase => !options.activeOnly || testCase.active === true);
    }

    const orderedProductCases = getCasesInRequiredOrder(
        cases,
        ANSWERLATTICE_PRODUCT_STARTER_PACK_CASE_IDS,
    );
    const validLaunchPacks = orderedProductCases.flatMap(testCase => (
        testCase.launchPack?.version === 1
        && /^[a-f0-9]{64}$/.test(testCase.launchPack.sourceHash)
        && /^kii_[a-f0-9]{28}$/.test(testCase.launchPack.reviewItemId)
            ? [testCase.launchPack]
            : []
    ));
    const sourceHashes = new Set(validLaunchPacks.map(pack => pack.sourceHash));
    if (sourceHashes.size !== 1) return [];
    if (new Set(validLaunchPacks.map(pack => pack.reviewItemId)).size !== validLaunchPacks.length) return [];
    const [sourceHash] = Array.from(sourceHashes);
    return orderedProductCases.filter(testCase => (
        (!options.activeOnly || testCase.active === true)
        && testCase.launchPack?.version === 1
        && testCase.launchPack.sourceHash === sourceHash
        && /^kii_[a-f0-9]{28}$/.test(testCase.launchPack.reviewItemId)
    ));
};

export const countAnswerlatticeFirstTrustedAnswerCases = (
    cases: ReadonlyArray<FirstTrustedAnswerCaseLike>,
    options: { activeOnly?: boolean } = {},
): number => getAnswerlatticeFirstTrustedAnswerCases(cases, options).length;

export const replaceAnswerlatticeFirstTrustedAnswerCases = (
    existingCases: AnswerlatticeAnswerTestCase[],
    productCases: AnswerlatticeAnswerTestCase[],
): AnswerlatticeAnswerTestCase[] => {
    const genericStarterIds = new Set<string>(ANSWERLATTICE_FIRST_TRUSTED_ANSWER_CASE_IDS);
    const existingById = new Map(existingCases.map(testCase => [testCase.id, testCase]));
    const nextProductCases = productCases.map((testCase) => {
        const existing = existingById.get(testCase.id);
        return existing?.launchPack?.sourceHash
            && existing.launchPack.sourceHash === testCase.launchPack?.sourceHash
            ? existing
            : testCase;
    });
    return [
        ...existingCases.filter(testCase => (
            !genericStarterIds.has(testCase.id)
            && !isAnswerlatticeProductStarterPackCaseId(testCase.id)
        )),
        ...nextProductCases,
    ];
};
