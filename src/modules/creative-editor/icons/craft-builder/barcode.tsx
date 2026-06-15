import { getCraftIconPalette } from "./palette";

type CraftIconProps = { active?: boolean };

const CraftBarcodeIcon = ({ active = false }: CraftIconProps) => {
  const token = getCraftIconPalette(active);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="256" height="256">
      <g data-name="Layer 2">
        <path
          fill={active ? token.colorTextBase : token.colorTextHeading}
          d="M2 12V8a3 3 0 0 1 3-3h4a1 1 0 0 1 0 2H5a1 1 0 0 0-1 1v4a1 1 0 0 1-2 0Zm25-7h-4a1 1 0 0 0 0 2h4a1 1 0 0 1 1 1v4a1 1 0 0 0 2 0V8a3 3 0 0 0-3-3Zm2 14a1 1 0 0 0-1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 0 0 2h4a3 3 0 0 0 3-3v-4a1 1 0 0 0-1-1ZM9 25H5a1 1 0 0 1-1-1v-4a1 1 0 0 0-2 0v4a3 3 0 0 0 3 3h4a1 1 0 0 0 0-2Zm14-14a1 1 0 0 1 2 0v10a1 1 0 0 1-2 0Zm-8 0a1 1 0 0 1 2 0v10a1 1 0 0 1-2 0Zm-8 0a1 1 0 0 1 2 0v10a1 1 0 0 1-2 0Z">
        </path>
        <path
          fill={active ? token.colorPrimary : token.colorTextDescription}
          d="M21 11v5a1 1 0 0 1-2 0v-5a1 1 0 0 1 2 0Zm-1 8a1 1 0 0 0-1 1v1a1 1 0 0 0 2 0v-1a1 1 0 0 0-1-1Zm-8-9a1 1 0 0 0-1 1v5a1 1 0 0 0 2 0v-5a1 1 0 0 0-1-1Zm0 9a1 1 0 0 0-1 1v1a1 1 0 0 0 2 0v-1a1 1 0 0 0-1-1Z" >
        </path>
      </g>
    </svg>
  );
};

export default CraftBarcodeIcon;
