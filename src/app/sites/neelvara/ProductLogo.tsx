import type { NEELVARA_PRODUCT_LINEUP } from './siteConfig';

export type NeelvaraProductName = typeof NEELVARA_PRODUCT_LINEUP[number]['name'];

export default function ProductLogo({ name }: { name: NeelvaraProductName }) {
    if (name === 'MenuList') {
        return (
            <img
                alt=""
                className="nv-product-logo-svg"
                height="32"
                src="/favicon-32x32.png"
                width="32"
            />
        );
    }

    return (
        <img
            alt=""
            className="nv-product-logo-svg nv-product-logo-svg-answerlattice"
            height="27"
            src="/answerlattice-logo.svg"
            width="44"
        />
    );
}
