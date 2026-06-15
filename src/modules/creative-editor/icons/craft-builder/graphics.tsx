import { getCraftIconPalette } from "./palette";

type CraftIconProps = { active?: boolean };

const CraftGraphicsIcon = ({ active = false }: CraftIconProps) => {
  const token = getCraftIconPalette(active);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      enableBackground="new 0 0 24 24"
      viewBox="0 0 24 24"
      width="256"
      height="256"
    >
      <path
        fill={active ? token.colorPrimaryBorderHover : token.colorBorder}
        // fill={token.colorPrimaryBgHover}
        d="M21 13H5a1 1 0 0 1-1-.999v-1a3.003 3.003 0 0 1 3-3h12a3.003 3.003 0 0 1 3 3v1a1 1 0 0 1-.999 1H21z"
      ></path>
      <path
        // fill="#b2b1ff"
        fill={active ? token.colorPrimary : token.colorTextHeading}
        d="M6 13v6a3.003 3.003 0 0 0 3 3h8a3.003 3.003 0 0 0 3-3v-6H6z"
      ></path>
      <path
        // fill="#6563ff"
        fill={active ? token.colorTextBase : token.colorBorder}
        d="M15.5 2c-.942 0-1.844.382-2.5 1.059A3.498 3.498 0 1 0 10.5 9H12v13h2V9h1.5a3.5 3.5 0 1 0 0-7zM9 5.5a1.5 1.5 0 1 1 3 0V7h-1.5C9.672 7 9 6.328 9 5.5zM15.5 7H14V5.5A1.5 1.5 0 1 1 15.5 7z"
      ></path>
    </svg>
    // <svg
    //   xmlns="http://www.w3.org/2000/svg"
    //   enableBackground="new 0 0 24 24"
    //   viewBox="0 0 24 24"
    //   width="256"
    //   height="256"
    // >
    //   <path
    // fill={active ? token.colorPrimaryBgHover:token.colorPrimaryBgHover}
    //     // fill="#dee1ec"
    //     d="M21 18a1 1 0 0 1-1.8.6A9.044 9.044 0 0 0 12 15H8a1 1 0 0 1-1-.999V8a1 1 0 0 1 .999-1H12a9.044 9.044 0 0 0 7.2-3.6 1 1 0 0 1 1.8.597V18z"
    //   ></path>
    //   <path
    // fill={active ? token.colorPrimary:token.colorPrimary}
    //     d="M9 15H6a3 3 0 0 1-3-3v-2a3 3 0 0 1 3-3h3v8zm11 5a1 1 0 0 1-1-.999V3a1 1 0 0 1 2 0v16a1 1 0 0 1-.999 1H20z"
    //   ></path>
    //   <path
    // fill={active ? token.colorPrimaryBorder:token.colorPrimaryBorder}
    //     d="M9 15H6.484L4.08 20.606A1 1 0 0 0 5 22h4c.4 0 .762-.238.919-.606l2.723-6.355c-.213-.016-.426-.038-.642-.039H9z"
    //   ></path>
    // </svg>
  );
};

export default CraftGraphicsIcon;
