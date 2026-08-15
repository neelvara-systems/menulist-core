export const PHOTO_GAP_CHECK_IDS = [
  'logo',
  'cover_image',
  'location_or_team_photo',
  'product_or_service_photos',
  'photo_context',
  'public_page_images',
  'current_customer_link',
  'external_photo_verification',
] as const;

export type PhotoGapCheckId = (typeof PHOTO_GAP_CHECK_IDS)[number];

export type PhotoGapCheckMode = 'self_report';

export type PhotoGapCheckResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_applicable'
  | 'not_checked';

export type PhotoGapCheckStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type PhotoGapBusinessType =
  | 'restaurant'
  | 'salon'
  | 'clinic'
  | 'shop'
  | 'local_service'
  | 'other';

export type PhotoGapEvidence =
  | 'owner_selected'
  | 'business_type_context'
  | 'valid_public_url'
  | 'invalid_public_url'
  | 'not_provided'
  | 'not_checked';

export interface PhotoGapCheckInput {
  mode: PhotoGapCheckMode;
  businessName: string;
  cityOrArea: string;
  businessType: PhotoGapBusinessType;
  currentCustomerLink: string;
  logoPresent: boolean;
  coverImagePresent: boolean;
  locationOrTeamPhotoPresent: boolean;
  productOrServicePhotosPresent: boolean;
  photosLookCurrent: boolean;
  publicPageHasImages: boolean;
}

export interface PhotoGapCheckItem {
  id: PhotoGapCheckId;
  result: PhotoGapCheckResult;
  evidence: PhotoGapEvidence;
  evidenceText: string;
  required: boolean;
}

export interface PhotoGapCheckReport {
  generatedAt: string;
  status: PhotoGapCheckStatus;
  businessName: string;
  cityOrArea: string;
  businessType: PhotoGapBusinessType;
  checks: PhotoGapCheckItem[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    href: string;
    type: 'create_customer_link' | 'complete_visual_profile' | 'review_current_link' | 'manual_review';
  };
  boundaries: {
    imageUploaded: false;
    imageAnalyzed: false;
    externalUrlFetched: false;
    googleProfileInspected: false;
    instagramInspected: false;
    reportStored: false;
    externalPlatformUpdated: false;
    aiOrSearchChecked: false;
    rankingPromise: false;
  };
}
