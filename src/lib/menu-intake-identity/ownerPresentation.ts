import {
  getSuggestionValue,
  type ExtractedBusinessProfile,
} from '@data/shared/extractedBusinessProfile';
import type { MenuIntakeIdentityResponse } from './client';

export type OwnerDetectedDetail = {
  key: string;
  label: string;
  value: string;
  color?: string;
};

const CONCERN_LABELS: Record<string, string> = {
  address_differs: 'Address may be for another location',
  business_name_differs: 'Business name does not match this menu',
  business_type_differs: 'Business type looks different',
  different_business: 'Upload may belong to another business',
  different_outlet: 'Upload may belong to another outlet',
  empty_extraction_risk: 'Menu may not extract clearly',
  menu_insufficient: 'Menu looks incomplete',
  menu_partial: 'Only part of the menu may be visible',
  menu_structure_differs: 'Menu structure looks mostly different',
  mixed_non_menu_files: 'Some files are not menu pages',
  no_valid_menu_files: 'No clear menu page was found',
  phone_number_differs: 'Phone number does not match this location',
};

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function addDetail(details: OwnerDetectedDetail[], key: string, label: string, value: unknown, color?: string) {
  const normalized = Array.isArray(value)
    ? value.map(cleanText).filter(Boolean).join(', ')
    : cleanText(value);
  if (!normalized) return;
  details.push({
    key,
    label,
    value: normalized,
    ...(color ? { color } : {}),
  });
}

export function buildOwnerDetectedUploadDetails(
  result: MenuIntakeIdentityResponse | null | undefined,
): OwnerDetectedDetail[] {
  if (!result?.identity) return [];

  const details: OwnerDetectedDetail[] = [];
  addDetail(details, 'businessName', 'Uploaded menu', result.identity.businessName);
  addDetail(details, 'phoneNumber', 'Phone', result.identity.phoneNumber);
  addDetail(details, 'address', 'Address', result.identity.address);
  addDetail(details, 'businessType', 'Business type', result.identity.businessType);
  addDetail(details, 'currency', 'Currency', result.identity.currencyHint);
  addDetail(details, 'languages', 'Languages', result.identity.languages);
  return details;
}

export function buildOwnerUploadConcernDetails(
  result: MenuIntakeIdentityResponse | null | undefined,
): string[] {
  const reasonLabels = (result?.decision?.reasons || [])
    .map((reason) => CONCERN_LABELS[reason])
    .filter((reason): reason is string => Boolean(reason));

  return Array.from(new Set(reasonLabels)).slice(0, 4);
}

export function buildExtractedProfileHighlights(
  profile: ExtractedBusinessProfile | null | undefined,
): OwnerDetectedDetail[] {
  const details: OwnerDetectedDetail[] = [];
  addDetail(details, 'businessName', 'Business name', getSuggestionValue(profile?.identity?.businessName, 'medium'));
  addDetail(details, 'projectName', 'Menu name', getSuggestionValue(profile?.project?.projectName, 'medium'));
  addDetail(
    details,
    'brandAccentColor',
    'Brand color',
    getSuggestionValue(profile?.visualBrand?.brandAccentColor, 'medium'),
    getSuggestionValue(profile?.visualBrand?.brandAccentColor, 'medium'),
  );
  addDetail(
    details,
    'imageBackgroundColor',
    'Image background',
    getSuggestionValue(profile?.visualBrand?.imageBackgroundColor, 'medium'),
    getSuggestionValue(profile?.visualBrand?.imageBackgroundColor, 'medium'),
  );
  return details;
}
