import MediaAspectRatioSelector from '@/components/shared/media/MediaAspectRatioSelector';
import type { MediaAspectRatioValue, MediaImageType } from '@lib/media/imageProfiles';
import React from 'react';

interface AspectRatioSelectorProps {
  allowedAspectRatios?: MediaAspectRatioValue[];
  imageType?: MediaImageType;
  selectedAspectRatio: string;
  onChange: (aspectRatio: MediaAspectRatioValue) => void;
}

const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({
  allowedAspectRatios,
  imageType,
  selectedAspectRatio,
  onChange,
}) => (
  <MediaAspectRatioSelector
    allowedAspectRatios={allowedAspectRatios}
    imageType={imageType}
    onChange={onChange}
    selectedAspectRatio={selectedAspectRatio}
  />
);

export default AspectRatioSelector;
