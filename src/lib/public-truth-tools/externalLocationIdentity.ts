import { normalizeOBPGoogleMapsUrl } from '@lib/obp/publicLinks';
import type {
  ExternalLocationIdentityBinding,
  ExternalLocationIdentityProvider,
} from '@type/platform/store';

export const EXTERNAL_LOCATION_IDENTITY_SCHEMA_VERSION = 'menulist.external-location-identity.v1' as const;

const MAX_PROVIDER_LOCATION_ID_LENGTH = 2048;

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
  const record = candidate as Record<string, unknown>;
  const sources = Array.isArray(record.sources)
    ? record.sources.slice(0, 8).filter((source) => source && typeof source === 'object' && !Array.isArray(source))
    : [];
  const attributableSource = sources.find((source) => {
    const sourceRecord = source as Record<string, unknown>;
    return normalizeProviderLocationId(sourceRecord.placeId)
      && normalizeOBPGoogleMapsUrl(sourceRecord.uri);
  }) as Record<string, unknown> | undefined;
  const providerLocationId = normalizeProviderLocationId(attributableSource?.placeId);
  const providerUri = normalizeOBPGoogleMapsUrl(attributableSource?.uri);
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
  const record = value as Record<string, unknown>;
  if (!isExternalLocationIdentityProvider(record.provider)) return null;
  if (record.confirmationStatus !== 'owner_confirmed') return null;
  if (
    record.source !== 'owner_maps_link'
    && record.source !== 'maps_place_check'
    && record.source !== 'gbp_connection'
  ) {
    return null;
  }
  if (
    (record.provider === 'google_maps' && record.source === 'gbp_connection')
    || (record.provider === 'google_business_profile' && record.source !== 'gbp_connection')
  ) {
    return null;
  }

  const providerLocationId = normalizeProviderLocationId(record.providerLocationId);
  const providerUri = record.provider === 'google_maps'
    ? normalizeOBPGoogleMapsUrl(record.providerUri)
    : null;
  const confirmedAt = normalizeIsoTimestamp(record.confirmedAt);
  const resolution = record.resolution;

  if (
    !confirmedAt
    || (resolution !== 'provider_uri' && resolution !== 'provider_location_id')
  ) {
    return null;
  }
  if (
    record.source === 'owner_maps_link'
    && (
      record.provider !== 'google_maps'
      || providerLocationId
      || !providerUri
      || resolution !== 'provider_uri'
    )
  ) {
    return null;
  }
  if (
    record.source === 'maps_place_check'
    && (
      record.provider !== 'google_maps'
      || !providerLocationId
      || !providerUri
      || resolution !== 'provider_location_id'
    )
  ) {
    return null;
  }
  if (
    record.source === 'gbp_connection'
    && (
      record.provider !== 'google_business_profile'
      || !providerLocationId
      || resolution !== 'provider_location_id'
    )
  ) {
    return null;
  }

  return {
    provider: record.provider,
    ...(providerLocationId ? { providerLocationId } : {}),
    ...(providerUri ? { providerUri } : {}),
    resolution,
    confirmationStatus: 'owner_confirmed',
    source: record.source,
    confirmedAt,
  };
}
