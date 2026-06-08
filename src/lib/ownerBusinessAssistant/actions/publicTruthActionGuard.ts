import { FEATURE_FLAGS } from '@config/features';
import type { OwnerBusinessActionDefinition } from '../types';

export function canRunOwnerBusinessAssistantPublicTruthAction(definition: OwnerBusinessActionDefinition) {
  if (definition.cacheImpact === 'none') return true;
  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_CONFIRMED_WRITES) return false;
  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_PUBLIC_TRUTH) return false;
  return false;
}

export function getPublicTruthBlockedMessage() {
  return 'This change must be completed in the existing MenuList editor so published menu and cache rules stay correct.';
}
