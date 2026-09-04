export type AssetBrand = 'menulist' | 'answerlattice';

export type AssetType =
  | 'static-image'
  | 'og-image'
  | 'loop-video'
  | 'product-demo-clip'
  | 'abstract-motion-video';

export type AssetOutputFormat = 'webp' | 'png' | 'jpg' | 'svg' | 'webm' | 'mp4';

export type AssetOutputRole = 'primary' | 'fallback' | 'poster' | 'social' | 'og';

export type AssetRatio = '16:9' | '6:5' | '4:5' | '4:3' | '1:1' | '9:16' | '1200x630' | 'icon' | 'splash';

export type AssetApproval = 'automatic' | 'founder-review' | 'founder-required';

export type AssetAutonomyLevel = 1 | 2 | 3;

export type AssetStatus = 'missing' | 'draft' | 'generated' | 'approved' | 'stale' | 'retired';

export type AssetOutput = {
  format: AssetOutputFormat;
  role: AssetOutputRole;
  ratio?: AssetRatio;
  maxKb: number;
};

export type AssetSlot = {
  id: string;
  brand: AssetBrand;
  productBoundary: 'internal-product-architecture';
  page: string;
  route: string;
  placement: string;
  type: AssetType;
  required: boolean;
  blocking: boolean;
  intent: string;
  narrativeRules: string[];
  rejectionRules: string[];
  outputs: AssetOutput[];
  destination: string;
  component?: string;
  approval: AssetApproval;
  autonomyLevel: AssetAutonomyLevel;
  sources: string[];
  mobile: {
    required: boolean;
    maxKb?: number;
    notes: string;
  };
};

export type AssetReviewDecision = 'approved' | 'needs-review' | 'blocked' | 'not-reviewed';

export type AssetManifestEntry = {
  status: AssetStatus;
  brand: AssetBrand;
  version: number;
  slot: string;
  files: Partial<Record<AssetOutputRole, string>> & Record<string, string | undefined>;
  brief?: string;
  sourceFingerprint?: {
    files?: Record<string, string>;
    notes?: string;
  };
  review: {
    decision: AssetReviewDecision;
    strategicFit: number;
    brandFit: number;
    narrativeClarity: number;
    performance: 'pass' | 'warning' | 'fail' | 'not-reviewed';
    reviewer?: string;
    reviewedAt?: string;
    notes?: string;
  };
  notes?: string;
};

export type AssetManifest = {
  version: number;
  updatedAt: string;
  productBoundary: {
    publicRuntime: false;
    publicMarketing: false;
    internalOnly: true;
    architecture: 'separate-product-style';
  };
  assets: Record<string, AssetManifestEntry>;
};
