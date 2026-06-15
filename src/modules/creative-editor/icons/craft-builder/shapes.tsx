import { getCraftIconPalette } from "./palette";

type CraftIconProps = { active?: boolean };

const CraftShapesIcon = ({ active = false }: CraftIconProps) => {
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
        fill={active ? token.colorPrimaryHover : token.colorTextHeading}
        d="M21 22h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1Z"
      ></path>
      <path
        fill={active ? token.colorTextBase : token.colorTextDescription}
        d="m7.914 17.5 2.793-2.793a1 1 0 0 0-1.414-1.414L6.5 16.086l-2.793-2.793a1 1 0 0 0-1.414 1.414L5.086 17.5l-2.793 2.793a1 1 0 1 0 1.414 1.414L6.5 18.914l2.793 2.793a1 1 0 0 0 1.414-1.414zM21 11h-7a1 1 0 0 1-.895-1.447l3.5-7a1.041 1.041 0 0 1 1.79 0l3.5 7A1 1 0 0 1 21 11z"
      ></path>
      <path
        fill={active ? token.colorPrimaryHover : token.colorTextHeading}
        d="M6.5 11A4.5 4.5 0 1 1 11 6.5 4.505 4.505 0 0 1 6.5 11Z"
      ></path>
    </svg>
  );
};

export default CraftShapesIcon;
