import { getCraftIconPalette } from "./palette";

type CraftIconProps = { active?: boolean };

const CraftStylesIcon = ({ active = false }: CraftIconProps) => {
  const token = getCraftIconPalette(active);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="256"
      height="256"
    >
      <path
        fill={active ? token.colorPrimary : token.colorTextHeading}
        d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
      />
      <path
        fill={active ? token.colorTextBase : token.colorBgBase}
        d="M7 7h4v4H7V7Zm6 0h4v4h-4V7ZM7 13h4v4H7v-4Zm6 0h4v4h-4v-4Z"
      />
      <circle cx="9" cy="9" r="1.2" fill={active ? token.colorPrimaryBorder : token.colorBorder} />
      <circle cx="15" cy="15" r="1.2" fill={active ? token.colorPrimaryBorder : token.colorBorder} />
    </svg>
  );
};

export default CraftStylesIcon;
