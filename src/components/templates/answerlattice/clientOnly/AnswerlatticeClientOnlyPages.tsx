'use client';

import dynamic from 'next/dynamic';

export const AnswerlatticeAnswerTestsClient = dynamic(
    () => import('@/components/templates/answerlattice/answerTests/AnswerlatticeAnswerTests'),
    { ssr: false },
);

export const AnswerlatticeKnownIssuesClient = dynamic(
    () => import('@/components/templates/answerlattice/knownIssues/AnswerlatticeKnownIssues'),
    { ssr: false },
);

export const AnswerlatticeOwnerSupportAssistantClient = dynamic(
    () => import('@/components/templates/answerlattice/ownerSupportAssistant/AnswerlatticeOwnerSupportAssistant'),
    { ssr: false },
);

export const AnswerlatticeSupportBoardClient = dynamic(
    () => import('@/components/templates/answerlattice/supportBoard/AnswerlatticeSupportBoard'),
    { ssr: false },
);

export const AnswerlatticeWeeklyDigestClient = dynamic(
    () => import('@/components/templates/answerlattice/weeklyDigest/AnswerlatticeWeeklyDigest'),
    { ssr: false },
);
