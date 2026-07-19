'use client';

import { FEATURE_FLAGS } from '@config/features';
import {
  assertExternalLocationIdentityMutationSucceeded,
  clearExternalLocationIdentity,
  confirmExternalLocationIdentity,
  type ExternalLocationIdentityMutationResult,
} from '@database/stores';
import { functions } from '@lib/firebase/firebaseClient';
import { buildMapsPlaceCheckIdentityBinding } from '@lib/public-truth-tools/externalLocationIdentity';
import { httpsCallable } from 'firebase/functions';

export type MapsPlaceCheckClientInput = {
  tenantId: string | number;
  storeId: string | number;
  businessName: string;
  address?: string;
  latLng?: {
    latitude: number;
    longitude: number;
  };
  languageCode?: string;
};

export type MapsPlaceCheckClientResult = {
  status: 'needs_owner_confirmation' | 'no_grounded_result';
  attributionRequired: boolean;
  checkedAt: string;
  model: string;
  candidate: {
    title?: string;
    placeId?: string;
    uri?: string;
    proposedFacts: Record<string, unknown>;
    sources: Array<{
      title: string;
      uri: string;
      placeId?: string;
    }>;
  } | null;
};

const isMapsPlaceCheckClientResult = (value: unknown): value is MapsPlaceCheckClientResult => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (
    (record.status !== 'needs_owner_confirmation' && record.status !== 'no_grounded_result')
    || typeof record.attributionRequired !== 'boolean'
    || typeof record.checkedAt !== 'string'
    || !Number.isFinite(new Date(record.checkedAt).getTime())
    || typeof record.model !== 'string'
  ) {
    return false;
  }
  if (record.status === 'no_grounded_result') return record.candidate === null;
  if (!record.candidate || typeof record.candidate !== 'object' || Array.isArray(record.candidate)) {
    return false;
  }
  const candidate = record.candidate as Record<string, unknown>;
  return Boolean(
    candidate.proposedFacts
    && typeof candidate.proposedFacts === 'object'
    && !Array.isArray(candidate.proposedFacts)
    && Array.isArray(candidate.sources),
  );
};

export async function checkMapsPlaceIdentity(
  input: MapsPlaceCheckClientInput,
): Promise<MapsPlaceCheckClientResult> {
  if (!FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_MAPS_PLACE_CHECK) {
    throw new Error('maps_place_check_not_enabled');
  }
  if (!functions) {
    throw new Error('maps_place_check_functions_unavailable');
  }

  const callable = httpsCallable<MapsPlaceCheckClientInput, unknown>(
    functions,
    'mapsPlaceCheck',
    { timeout: 60_000 },
  );
  const response = await callable(input);
  if (!isMapsPlaceCheckClientResult(response.data)) {
    throw new Error('maps_place_check_response_invalid');
  }
  return response.data;
}

export async function confirmMapsPlaceCheckIdentity(
  storeId: number,
  result: MapsPlaceCheckClientResult,
): Promise<ExternalLocationIdentityMutationResult> {
  if (
    result.status !== 'needs_owner_confirmation'
    || result.attributionRequired !== true
    || !result.candidate
  ) {
    throw new Error('maps_place_check_candidate_missing');
  }
  const binding = buildMapsPlaceCheckIdentityBinding(
    result.candidate,
    new Date().toISOString(),
  );
  if (!binding) {
    throw new Error('maps_place_check_candidate_identity_incomplete');
  }
  const mutationResult = await confirmExternalLocationIdentity({ storeId, binding });
  assertExternalLocationIdentityMutationSucceeded(
    mutationResult,
    storeId,
    'google_maps',
    true,
  );
  return mutationResult;
}

export async function removeConfirmedMapsPlaceIdentity(
  storeId: number,
): Promise<ExternalLocationIdentityMutationResult> {
  const mutationResult = await clearExternalLocationIdentity({
    storeId,
    provider: 'google_maps',
  });
  assertExternalLocationIdentityMutationSucceeded(
    mutationResult,
    storeId,
    'google_maps',
    false,
  );
  return mutationResult;
}
