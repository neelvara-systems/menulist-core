'use client';

import { FEATURE_FLAGS } from '@config/features';
import {
  assertExternalLocationIdentityMutationSucceeded,
  clearExternalLocationIdentity,
  confirmExternalLocationIdentity,
  type ExternalLocationIdentityMutationResult,
} from '@database/stores';
import { functions } from '@lib/firebase/firebaseClient';
import { normalizeOBPGoogleMapsUrl } from '@lib/obp/publicLinks';
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

const isOptionalBoundedString = (value: unknown, maxLength: number): boolean => (
  value === undefined || (
    typeof value === 'string'
    && value.trim().length > 0
    && value.length <= maxLength
  )
);

const isBoundedFactList = (value: unknown): boolean => (
  value === undefined || (
    Array.isArray(value)
    && value.length <= 8
    && value.every((item) => (
      typeof item === 'string'
      && item.trim().length > 0
      && item.length <= 120
    ))
  )
);

export const isMapsPlaceCheckClientResult = (value: unknown): value is MapsPlaceCheckClientResult => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (
    (record.status !== 'needs_owner_confirmation' && record.status !== 'no_grounded_result')
    || typeof record.attributionRequired !== 'boolean'
    || typeof record.checkedAt !== 'string'
    || !Number.isFinite(new Date(record.checkedAt).getTime())
    || new Date(record.checkedAt).toISOString() !== record.checkedAt
    || typeof record.model !== 'string'
    || !record.model.trim()
    || record.model.length > 120
  ) {
    return false;
  }
  if (record.status === 'no_grounded_result') {
    return record.attributionRequired === false && record.candidate === null;
  }
  if (record.attributionRequired !== true) return false;
  if (!record.candidate || typeof record.candidate !== 'object' || Array.isArray(record.candidate)) {
    return false;
  }
  const candidate = record.candidate as Record<string, unknown>;
  const proposedFacts = candidate.proposedFacts;
  if (!proposedFacts || typeof proposedFacts !== 'object' || Array.isArray(proposedFacts)) return false;
  const facts = proposedFacts as Record<string, unknown>;
  return (
    isOptionalBoundedString(candidate.title, 180)
    && isOptionalBoundedString(candidate.placeId, 2048)
    && isOptionalBoundedString(candidate.uri, 2048)
    && isOptionalBoundedString(facts.address, 300)
    && isOptionalBoundedString(facts.openingHours, 500)
    && isBoundedFactList(facts.amenities)
    && isBoundedFactList(facts.paymentOptions)
    && isBoundedFactList(facts.accessibility)
    && isBoundedFactList(facts.serviceOptions)
    && Array.isArray(candidate.sources)
    && candidate.sources.length <= 8
    && candidate.sources.every((source) => (
      source !== null
      && typeof source === 'object'
      && !Array.isArray(source)
      && typeof (source as Record<string, unknown>).title === 'string'
      && ((source as Record<string, unknown>).title as string).trim().length > 0
      && ((source as Record<string, unknown>).title as string).length <= 180
      && typeof (source as Record<string, unknown>).uri === 'string'
      && Boolean(normalizeOBPGoogleMapsUrl((source as Record<string, unknown>).uri))
      && isOptionalBoundedString((source as Record<string, unknown>).placeId, 2048)
    ))
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
  if (!FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_MAPS_PLACE_CHECK) {
    throw new Error('maps_place_check_not_enabled');
  }
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
