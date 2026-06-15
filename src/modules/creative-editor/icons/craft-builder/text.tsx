import { getCraftIconPalette } from "./palette";

type CraftIconProps = { active?: boolean };

const CraftTextIcon = ({ active = false }: CraftIconProps) => {
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
        d="M4.7 22c-.3 0-.5-.1-.7-.3L2.3 20c-.2-.2-.3-.6-.3-.9L4.4 7.5c.1-.4.4-.7.8-.8l6.9-1.1c.3-.1.6.1.9.3l5.2 5.2c.2.2.3.6.3.9l-1.1 6.9c-.1.4-.4.7-.8.8L4.9 22h-.2z"
      ></path>
      <path
        fill={active ? token.colorTextHeading : token.colorBorder}
        d="m21.7 9.3-7-7c-.4-.4-1-.4-1.4 0-.1.1-.1.2-.2.3l-1.5 3.1.5-.1c.3-.1.6.1.9.3l5.2 5.2c.2.2.3.6.3.9l-.1.5 3.1-1.5c.5-.2.7-.8.5-1.3-.1-.2-.2-.3-.3-.4zm-8.9 1.9c-1.2-1.2-3.1-1.2-4.2 0-.9.9-1.1 2.3-.6 3.4l-5.5 5.5 1.4 1.4L9.4 16c1.5.7 3.3.1 4-1.4.5-1.1.3-2.5-.6-3.4z"
      ></path>
    </svg>
  );
};

export default CraftTextIcon;
