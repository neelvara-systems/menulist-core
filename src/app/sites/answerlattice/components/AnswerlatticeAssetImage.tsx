import type { AnswerlatticeWebsiteAsset } from '../answerlatticeWebsiteAssets';

type AnswerlatticeAssetImageProps = {
    asset: AnswerlatticeWebsiteAsset;
    assetSlotId?: string;
    assetRole?: string;
    className?: string;
    imageClassName?: string;
    priority?: boolean;
    reveal?: boolean;
};

export default function AnswerlatticeAssetImage({
    asset,
    assetSlotId,
    assetRole,
    className = '',
    imageClassName = '',
    priority = false,
    reveal = true,
}: AnswerlatticeAssetImageProps) {
    return (
        <figure
            className={`w-full max-w-full overflow-hidden bg-[#09091a] ${className}`.trim()}
            data-answerlattice-reveal={reveal ? true : undefined}
            data-answerlattice-asset-slot={assetSlotId}
            data-answerlattice-asset-role={assetRole}
            data-answerlattice-asset-src={asset.src}
            data-answerlattice-asset-width={asset.width}
            data-answerlattice-asset-height={asset.height}
            style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
        >
            <img
                src={asset.src}
                width={asset.width}
                height={asset.height}
                alt={asset.alt}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                className={`block h-full w-full object-cover ${imageClassName}`.trim()}
            />
        </figure>
    );
}
