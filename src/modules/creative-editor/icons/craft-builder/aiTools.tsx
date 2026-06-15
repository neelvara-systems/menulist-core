import { getCraftIconPalette } from "./palette";

type CraftIconProps = { active?: boolean };

const CraftAiToolsIcon = ({ active = false }: CraftIconProps) => {

    const token = getCraftIconPalette(active);
    return (

        <svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" viewBox="0 0 24 24" width="256" height="256">
            <circle cx="12" cy="4" r="2" fill={active ? token.colorPrimary : token.colorTextBase} ></circle>
            <path
                fill={active ? token.colorPrimaryBgHover : token.colorTextDescription}
                d="M12 6a1.98 1.98 0 0 1-1-.277V8a1 1 0 0 0 2 0V5.723A1.98 1.98 0 0 1 12 6z" >
            </path>
            <path
                fill={active ? token.colorPrimaryBorderHover : token.colorTextHeading}
                d="M17 22H7a3.003 3.003 0 0 1-3-3v-9a3.003 3.003 0 0 1 3-3h10a3.003 3.003 0 0 1 3 3v9a3.003 3.003 0 0 1-3 3z" >
            </path>
            <path
                fill={active ? token.colorTextBase : token.colorBorder}
                d="M14.97 12.243 16.28 7H7.72l1.31 5.243A1 1 0 0 0 10 13h4a1 1 0 0 0 .97-.757z" >
            </path>
            <path
                fill={active ? token.colorTextBase : token.colorTextHeading}
                d="M2 18a1 1 0 0 1-1-1v-2a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1zm20 0a1 1 0 0 1-1-1v-2a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1z" >
            </path>
            <circle cx="9" cy="16" r="1" fill={token.colorBgBase} ></circle>
            <circle cx="15" cy="16" r="1" fill={token.colorBgBase} ></circle>
        </svg>
    );
};

export default CraftAiToolsIcon;
