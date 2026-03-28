import { BACKGROUND_TYPES } from "@constant/common";

export const GRADIENT_INITIAL_VALUE = {
    type: BACKGROUND_TYPES.GRADIENT,
    props: {
        type: "linear",
        direction: "to right"
    },
    value: "linear-gradient(to right, #9796F0, #FBC7D4)",
    colors: ['#9796F0', '#FBC7D4'],
}

export const COLOR_INITIAL_VALUE = {
    type: BACKGROUND_TYPES.COLOR,
    value: "#D3CCE3",
    colors: ['#D3CCE3'],
}

export const IMAGE_INITIAL_VALUE = {
    type: BACKGROUND_TYPES.IMAGE,
    value: '#D3CCE3',
    src: 'https://orra.respark.in/assets/images/female/bg.png',
    isMobile: true,
    isDesktop: false,
    colors: ['#D3CCE3']
}