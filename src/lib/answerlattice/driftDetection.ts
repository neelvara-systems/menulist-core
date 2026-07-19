/**
 * Answerlattice deterministic drift policy.
 *
 * The browser may import these pure rules for display or tests, but drift
 * evaluation and persistence are owned by the governance server and nightly
 * Answerlattice scheduler. No client may submit an authoritative drift reason.
 */
export {
    ANSWERLATTICE_DRIFT_CLASSES,
    ANSWERLATTICE_SIGNAL_DRIFT_THRESHOLDS,
    buildAnswerlatticeVersionDriftReason,
    deriveAutomatedDriftState,
    evaluateAnswerlatticeAutomatedDrift,
} from '@data/shared/answerlatticeDrift';

export type {
    AnswerlatticeAutomatedDriftEvaluation,
    AnswerlatticeDriftAnswer,
    AnswerlatticeDriftClass,
    AnswerlatticeDriftEntity,
    AnswerlatticeDriftSignal,
    AutomatedDriftState,
} from '@data/shared/answerlatticeDrift';
