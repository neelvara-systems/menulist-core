import type { AnswerlatticeWebsiteAsset } from '../answerlatticeWebsiteAssets';

type AnswerlatticeAssetImageProps = {
    asset: AnswerlatticeWebsiteAsset;
    className?: string;
    imageClassName?: string;
    priority?: boolean;
};

export default function AnswerlatticeAssetImage({
    asset,
    className = '',
    imageClassName = '',
    priority = false,
}: AnswerlatticeAssetImageProps) {
    return (
        <figure
            className={`w-full max-w-full overflow-hidden bg-[#09091a] ${className}`.trim()}
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
