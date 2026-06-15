import { getCraftIconPalette } from "./palette";

type CraftIconProps = { active?: boolean };

const CraftBackgroundIcon = ({ active = false }: CraftIconProps) => {

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
                fill={active ? token.colorPrimaryBgHover : token.colorTextDescription}
                d="M17.92 11.27a2.559 2.559 0 0 0-3.62 0l-.91.91-6.72 6.73-.99.99a2.956 2.956 0 0 0 1.75 1.04c.187.04.378.06.57.06h10a2.996 2.996 0 0 0 3-2.992V14.36l-3.08-3.09z"
            ></path>
            <path
                fill={active ? token.colorPrimaryBorderHover : token.colorTextLabel}
                d="M7.579 18H5a3.04 3.04 0 0 0 .68 1.9l.99-.99.909-.91z"
            ></path>
            <path
                fill={active ? token.colorPrimaryBgHover : token.colorTextDescription}
                d="M18 5v6.35l3 3.01V8a3.009 3.009 0 0 0-3-3zM11.1 9.89l-.71-.71-.81-.81a2.927 2.927 0 0 0-4.12.02L2 12.01V15a3.04 3.04 0 0 0 .68 1.9 2.956 2.956 0 0 0 1.75 1.04c.32-.3.62-.58.65-.61l6.02-6.02c.39-.393.39-1.027 0-1.42z"
            ></path>
            <path
                fill={active ? token.colorTextHeading : "#dee1ec"}
                d="M15 2H5a3.009 3.009 0 0 0-3 3v7.01l3.46-3.62a2.927 2.927 0 0 1 4.12-.02l.81.81.71.71c.39.393.39 1.027 0 1.42l-6.02 6.02c-.03.03-.33.31-.65.61.187.04.378.06.57.06h10a2.996 2.996 0 0 0 3-2.992V5a3.009 3.009 0 0 0-3-3z"
            ></path>
            <path
                fill={active ? token.colorPrimaryBorderHover : token.colorBgSpotlight}
                d="M14.92 8.27c-1-1-2.62-1-3.619-.001l-.001.001-.91.91-6.72 6.73-.99.99a2.956 2.956 0 0 0 1.75 1.04c.187.04.378.06.57.06h10a2.996 2.996 0 0 0 3-2.992V11.36l-3.08-3.09z"
            ></path>
        </svg>
    );
};

export default CraftBackgroundIcon;
