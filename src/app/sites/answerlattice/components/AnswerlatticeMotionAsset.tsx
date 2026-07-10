import type { AnswerlatticeWebsiteMotionAsset } from '../answerlatticeWebsiteAssets';

type AnswerlatticeMotionAssetProps = {
    asset: AnswerlatticeWebsiteMotionAsset;
    assetSlotId: string;
    assetRole: string;
    className?: string;
    priority?: boolean;
    reveal?: boolean;
};

export default function AnswerlatticeMotionAsset({
    asset,
    assetSlotId,
    assetRole,
    className = '',
    priority = false,
    reveal = true,
}: AnswerlatticeMotionAssetProps) {
    return (
        <figure
            className={`al-motion-asset ${className}`.trim()}
            role="img"
            aria-label={asset.alt}
            data-answerlattice-reveal={reveal ? true : undefined}
            data-answerlattice-asset-slot={assetSlotId}
            data-answerlattice-asset-role={assetRole}
            data-answerlattice-asset-src={asset.src}
            data-answerlattice-asset-width={asset.width}
            data-answerlattice-asset-height={asset.height}
            style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
        >
            <video
                className="al-motion-asset__video"
                autoPlay
                muted
                loop
                playsInline
                preload={priority ? 'auto' : 'metadata'}
                poster={asset.poster}
                aria-hidden="true"
            >
                <source src={asset.src} type="video/webm" />
                <source src={asset.fallbackSrc} type="video/mp4" />
            </video>
            <img
                src={asset.poster}
                width={asset.width}
                height={asset.height}
                alt={asset.alt}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                className="al-motion-asset__poster"
            />
        </figure>
    );
}
