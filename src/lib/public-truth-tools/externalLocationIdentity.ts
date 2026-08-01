import { normalizeOBPGoogleMapsUrl } from '@lib/obp/publicLinks';
import type {
  ExternalLocationIdentityBinding,
  ExternalLocationIdentityProvider,
} from '@type/platform/store';

export const EXTERNAL_LOCATION_IDENTITY_SCHEMA_VERSION = 'menulist.external-location-identity.v1' as const;

const MAX_PROVIDER_LOCATION_ID_LENGTH = 2048;

const readOwnDataField = (value: unknown, key: string): unknown => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && 'value' in descriptor ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
};

const snapshotSources = (value: unknown): unknown[] => {
  if (!Array.isArray(value)) return [];
  try {
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
    const length = lengthDescriptor && 'value' in lengthDescriptor
      ? lengthDescriptor.value
      : undefined;
    if (!Number.isSafeInteger(length) || length < 0) return [];
    const sources: unknown[] = [];
    for (let index = 0; index < Math.min(length, 8); index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (descriptor && 'value' in descriptor) sources.push(descriptor.value);
    }
    return sources;
  } catch {
    return [];
  }
};

const normalizeIsoTimestamp = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toISOString();
};

const normalizeProviderLocationId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/^places\//i, '');
  if (
    !normalized
    || normalized.length > MAX_PROVIDER_LOCATION_ID_LENGTH
    || !/^[^\s/\\]+$/.test(normalized)
  ) {
    return null;
  }
  return normalized;
};

const isExternalLocationIdentityProvider = (
  value: unknown,
): value is ExternalLocationIdentityProvider => (
  value === 'google_maps' || value === 'google_business_profile'
);

export function buildOwnerGoogleMapsLinkIdentityBinding(
  googleMapsUrl: unknown,
  confirmedAt: string,
): ExternalLocationIdentityBinding | null {
  const providerUri = normalizeOBPGoogleMapsUrl(googleMapsUrl);
  const normalizedConfirmedAt = normalizeIsoTimestamp(confirmedAt);
  if (!providerUri || !normalizedConfirmedAt) return null;

  return {
    provider: 'google_maps',
    providerUri,
    resolution: 'provider_uri',
    confirmationStatus: 'owner_confirmed',
    source: 'owner_maps_link',
    confirmedAt: normalizedConfirmedAt,
  };
}

export function buildMapsPlaceCheckIdentityBinding(
  candidate: unknown,
  confirmedAt: string,
): ExternalLocationIdentityBinding | null {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const sources = snapshotSources(readOwnDataField(candidate, 'sources'))
    .filter((source) => source && typeof source === 'object' && !Array.isArray(source));
  const attributableSource = sources.find((source) => {
    return normalizeProviderLocationId(readOwnDataField(source, 'placeId'))
      && normalizeOBPGoogleMapsUrl(readOwnDataField(source, 'uri'));
  });
  const providerLocationId = normalizeProviderLocationId(
    readOwnDataField(attributableSource, 'placeId'),
  );
  const providerUri = normalizeOBPGoogleMapsUrl(readOwnDataField(attributableSource, 'uri'));
  const normalizedConfirmedAt = normalizeIsoTimestamp(confirmedAt);

  if (!providerLocationId || !providerUri || !normalizedConfirmedAt) return null;

  return {
    provider: 'google_maps',
    providerLocationId,
    providerUri,
    resolution: 'provider_location_id',
    confirmationStatus: 'owner_confirmed',
    source: 'maps_place_check',
    confirmedAt: normalizedConfirmedAt,
  };
}

export function normalizeExternalLocationIdentityBinding(
  value: unknown,
): ExternalLocationIdentityBinding | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const provider = readOwnDataField(value, 'provider');
  const confirmationStatus = readOwnDataField(value, 'confirmationStatus');
  const source = readOwnDataField(value, 'source');
  if (!isExternalLocationIdentityProvider(provider)) return null;
  if (confirmationStatus !== 'owner_confirmed') return null;
  if (
    source !== 'owner_maps_link'
    && source !== 'maps_place_check'
    && source !== 'gbp_connection'
  ) {
    return null;
  }
  if (
    (provider === 'google_maps' && source === 'gbp_connection')
    || (provider === 'google_business_profile' && source !== 'gbp_connection')
  ) {
    return null;
  }

  const providerLocationId = normalizeProviderLocationId(readOwnDataField(value, 'providerLocationId'));
  const providerUri = provider === 'google_maps'
    ? normalizeOBPGoogleMapsUrl(readOwnDataField(value, 'providerUri'))
    : null;
  const confirmedAt = normalizeIsoTimestamp(readOwnDataField(value, 'confirmedAt'));
  const resolution = readOwnDataField(value, 'resolution');

  if (
    !confirmedAt
    || (resolution !== 'provider_uri' && resolution !== 'provider_location_id')
  ) {
    return null;
  }
  if (
    source === 'owner_maps_link'
    && (
      provider !== 'google_maps'
      || providerLocationId
      || !providerUri
      || resolution !== 'provider_uri'
    )
  ) {
    return null;
  }
  if (
    source === 'maps_place_check'
    && (
      provider !== 'google_maps'
      || !providerLocationId
      || !providerUri
      || resolution !== 'provider_location_id'
    )
  ) {
    return null;
  }
  if (
    source === 'gbp_connection'
    && (
      provider !== 'google_business_profile'
      || !providerLocationId
      || resolution !== 'provider_location_id'
    )
  ) {
    return null;
  }

  return {
    provider,
    ...(providerLocationId ? { providerLocationId } : {}),
    ...(providerUri ? { providerUri } : {}),
    resolution,
    confirmationStatus: 'owner_confirmed',
    source,
    confirmedAt,
  };
}
