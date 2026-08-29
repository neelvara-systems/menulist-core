import Link from 'next/link';
import { LuArrowRight, LuBookOpen, LuLogOut, LuMoonStar, LuShieldCheck } from 'react-icons/lu';
import type {
    MyCodexFounderConsoleProduct,
    MyCodexFounderConsoleSurface,
} from '@lib/mycodex/founderConsoleCatalog';
import { MYCODEX_FOUNDER_CONSOLE_BASE_PATH } from '@lib/mycodex/founderConsoleCatalog';

export function MyCodexFounderConsoleSurfaceIndex({
    description,
    surfaces,
    title,
}: {
    description: string;
    surfaces: readonly MyCodexFounderConsoleSurface[];
    title: string;
}) {
    return (
        <div className="mycodex-founder-page">
            <div className="mycodex-founder-page-heading">
                <div><span className="mycodex-founder-eyebrow">Private platform tools</span><h1>{title}</h1><p>{description}</p></div>
            </div>
            <div className="mycodex-founder-surface-grid is-index">
                {surfaces.map((surface) => (
                    <Link href={`${MYCODEX_FOUNDER_CONSOLE_BASE_PATH}/surface/${surface.key}`} key={surface.key}>
                        <span>{surface.product === 'shared' ? 'Portfolio' : surface.product === 'menulist' ? 'MenuList' : 'Answerlattice'}</span>
                        <strong>{surface.title}</strong>
                        <p>{surface.description}</p>
                        <LuArrowRight size={18} />
                    </Link>
                ))}
            </div>
        </div>
    );
}

export function MyCodexFounderConsoleProductIndex({
    products,
}: {
    products: Readonly<Record<Exclude<MyCodexFounderConsoleProduct, 'shared'>, readonly MyCodexFounderConsoleSurface[]>>;
}) {
    return (
        <div className="mycodex-founder-page">
            <div className="mycodex-founder-page-heading">
                <div><span className="mycodex-founder-eyebrow">Separate products, one private view</span><h1>Products</h1><p>MenuList and Answerlattice retain their own data and operating rules.</p></div>
            </div>
            <div className="mycodex-founder-product-grid">
                {(['menulist', 'answerlattice'] as const).map((product) => (
                    <Link href={`${MYCODEX_FOUNDER_CONSOLE_BASE_PATH}/products/${product}`} key={product}>
                        <span className={`product-mark is-${product}`}>{product === 'menulist' ? 'ML' : 'AL'}</span>
                        <div><strong>{product === 'menulist' ? 'MenuList' : 'Answerlattice'}</strong><p>{products[product].length} governed platform tools</p></div>
                        <LuArrowRight size={20} />
                    </Link>
                ))}
            </div>
        </div>
    );
}

export function MyCodexFounderConsoleSettings() {
    return (
        <div className="mycodex-founder-page">
            <div className="mycodex-founder-page-heading">
                <div><span className="mycodex-founder-eyebrow">Private preferences</span><h1>Settings</h1><p>MyCodex stores presentation preferences on this browser. Product data stays in its owning system.</p></div>
            </div>
            <div className="mycodex-founder-settings-grid">
                <article><LuShieldCheck size={22} /><div><strong>Access</strong><p>Current persisted PLATFORM role. MyCodex does not grant product authority.</p></div></article>
                <article><LuMoonStar size={22} /><div><strong>Appearance</strong><p>Use the theme control in the header or the document reader settings.</p></div></article>
                <Link href="/__mycodex"><LuBookOpen size={22} /><div><strong>Documents</strong><p>Open the private reader, saved items, and reading queue.</p></div><LuArrowRight size={18} /></Link>
                <Link href="/api/auth/signout"><LuLogOut size={22} /><div><strong>End session</strong><p>Sign out from the protected owner account.</p></div><LuArrowRight size={18} /></Link>
            </div>
        </div>
    );
}
