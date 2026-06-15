import { getCraftIconPalette } from "./palette";

type CraftIconProps = { active?: boolean };

const CraftIllustrationsIcon = ({ active = false }: CraftIconProps) => {
    const token = getCraftIconPalette(active);
    return (
        <svg xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" viewBox="0 0 24 24" id="object">
            <path
                fill={active ? token.colorPrimary : token.colorTextHeading}
                d="M11 10h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z">
            </path>
            <path
                fill={active ? token.colorTextBase : token.colorTextDescription}
                d="M10 11a1 1 0 0 1 1-1h3V8a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h2v-3zM4 22a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM4 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm16 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 16a2 2 0 1 1 0-4 2 2 0 0 1 0 4z">
            </path>
            <path
                fill={active ? token.colorPrimary : token.colorTextHeading}
                d="M18.278 5a1.936 1.936 0 0 1 0-2H5.722a1.936 1.936 0 0 1 0 2h12.556zM20 18c.352.002.697.098 1 .278V5.722a1.936 1.936 0 0 1-2 0v12.556c.303-.18.648-.276 1-.278zM4 18c.352.002.697.098 1 .278V5.722a1.936 1.936 0 0 1-2 0v12.556c.303-.18.648-.276 1-.278zm14.278 1H5.722a1.936 1.936 0 0 1 0 2h12.556a1.936 1.936 0 0 1 0-2z">
            </path>
        </svg>
    );
};

export default CraftIllustrationsIcon;
