import { getCraftIconPalette } from "./palette";

type CraftIconProps = { active?: boolean };

const CraftTemplateIcon = ({ active = false }: CraftIconProps) => {
  const token = getCraftIconPalette(active);
  return (
    // <svg
    //   xmlns="http://www.w3.org/2000/svg"
    //   data-name="Layer 1"
    //   viewBox="0 0 24 24"
    //   width="256"
    //   height="256"
    // >
    //   <path
    //     fill={active ? token.colorPrimaryBgHover : token.colorTextDescription}
    //     d="M10,14H3a.99974.99974,0,0,1-1-1V3A.99974.99974,0,0,1,3,2h7a.99974.99974,0,0,1,1,1V13A.99974.99974,0,0,1,10,14Z"
    //   >
    // </path>
    //   <path
    //     fill={active ? token.colorPrimary : token.colorTextHeading}
    //     d="M10,22H3a.99974.99974,0,0,1-1-1V17a.99974.99974,0,0,1,1-1h7a.99974.99974,0,0,1,1,1v4A.99974.99974,0,0,1,10,22Z"
    //   >
    // </path>
    //   <path
    //     fill={active ? token.colorPrimaryBgHover : token.colorTextDescription}
    //     d="M21,22H14a.99974.99974,0,0,1-1-1V13a.99974.99974,0,0,1,1-1h7a.99974.99974,0,0,1,1,1v8A.99974.99974,0,0,1,21,22Z"
    //   >
    // </path>
    //   <path
    //     fill={active ? token.colorPrimary : token.colorTextHeading}
    //     d="M21,10H14a.99974.99974,0,0,1-1-1V3a.99974.99974,0,0,1,1-1h7a.99974.99974,0,0,1,1,1V9A.99974.99974,0,0,1,21,10Z"
    //   >
    // </path>
    // </svg>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" id="grid">
      <rect width="9" height="9" x="2" y="2"
        fill={active ? token.colorTextBase : token.colorTextDescription}
        rx="1">
      </rect>
      <rect width="9" height="9" x="2" y="13"
        fill={active ? token.colorPrimary : token.colorTextHeading}
        rx="1">
      </rect>
      <rect width="9" height="9" x="13" y="2"
        fill={active ? token.colorPrimary : token.colorTextHeading}
        rx="1">
      </rect>
      <rect width="9" height="9" x="13" y="13"
        fill={active ? token.colorTextBase : token.colorTextDescription}
        rx="1">
      </rect>
    </svg>
  );
};

export default CraftTemplateIcon;
