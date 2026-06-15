import { getCraftIconPalette } from "./palette";

type CraftIconProps = { active?: boolean };

const CraftBrandKitIcon = ({ active = false }: CraftIconProps) => {
    const token = getCraftIconPalette(active);
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            data-name="Layer 1"
            viewBox="0 0 24 24"
            width="256"
            height="256"
        >
            <path
                fill={active ? token.colorPrimary : token.colorTextHeading}
                d="M12.372 23A11 11 0 0 1 1.377 11.657a11.001 11.001 0 0 1 20.837-4.573 3.98 3.98 0 0 1 .18 3.105 3.846 3.846 0 0 1-2.062 2.247 4.998 4.998 0 0 0-2.86 5.561 4.206 4.206 0 0 1-.614 3.176 3.84 3.84 0 0 1-2.5 1.645 10.963 10.963 0 0 1-1.986.182Z"
            ></path>
            <circle cx="12.372" cy="6" r="1" fill={active ? token.colorTextBase : token.colorBgBase}></circle>
            <circle cx="12.372" cy="12" r="1" fill={active ? token.colorTextBase : token.colorBgBase}></circle>
            <circle cx="12.372" cy="18" r="1" fill={active ? token.colorTextBase : token.colorBgBase}></circle>
            <circle cx="6.372" cy="12" r="1" fill={active ? token.colorTextBase : token.colorBgBase}></circle>
            <circle cx="8.129" cy="7.757" r="1" fill={active ? token.colorTextBase : token.colorBgBase}></circle>
            <circle cx="8.129" cy="16.243" r="1" fill={active ? token.colorTextBase : token.colorBgBase}></circle>
            <circle cx="16.615" cy="7.757" r="1" fill={active ? token.colorTextBase : token.colorBgBase}></circle>
        </svg>
    );
};

export default CraftBrandKitIcon;
