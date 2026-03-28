export const ANIMATIONS_TYPES = {
    "fadeIn": "Fade In",
    "fadeOut": "Fade Out",
    "fadeInUp": "Fade In Up",
    "fadeInDown": "Fade In Down",
    "fadeInLeft": "Fade In Left",
    "fadeInRight": "Fade In Right",
    "fadeOutUp": "Fade Out Up",
    "fadeOutDown": "Fade Out Down",
    "fadeOutLeft": "Fade Out Left",
    "fadeOutRight": "Fade Out Right",
    "bounce": "Bounce",
    "flash": "Flash",
    "pulse": "Pulse",
    "rubberBand": "Rubber Band",
    "shakeX": "ShakeX",
    "shakeY": "ShakeY",
    "headShake": "Head Shake",
    "swing": "Swing",
    "hinge": "Hinge",
}

export const ANIMATIONS_FUNCTIONS = {
    "ease-in-out": "ease-in-out"
}

export const TIMING_FUNCTIONS = {
    "ease": "ease",
    "linear": "linear",
    // "easeIn": "ease-in",
    // "easeOut": "ease-out",
    "easeInOut": "ease-in-out",
    // "custom1": { // Example custom cubic Bézier curve
    //     "type": "cubic-bezier",
    //     "params": [0.4, 0, 0.2, 1]
    // }
}

export const ANIMATIONS_LIST = {
    [ANIMATIONS_TYPES.fadeIn]: {
        "name": "fadeIn",
        "duration": "1s",
        "timingFunction": "ease-in-out"
    },
    [ANIMATIONS_TYPES.fadeOut]: {
        "name": "fadeOut",
        "duration": "1s",
        "timingFunction": "ease-in-out"
    },
    [ANIMATIONS_TYPES.fadeInUp]: {
        "name": "fadeInUp",
        "duration": "1s",
        "timingFunction": "ease-in-out"
    },
    [ANIMATIONS_TYPES.fadeInDown]: {
        "name": "fadeInDown",
        "duration": "1s",
        "timingFunction": "ease-in-out"
    },
    [ANIMATIONS_TYPES.fadeInLeft]: {
        "name": "fadeInLeft",
        "duration": "1s",
        "timingFunction": "ease-in-out"
    },
    [ANIMATIONS_TYPES.fadeInRight]: {
        "name": "fadeInRight",
        "duration": "1s",
        "timingFunction": "ease-in-out"
    },
    [ANIMATIONS_TYPES.fadeOutUp]: {
        "name": "fadeOutUp",
        "duration": "1s",
        "timingFunction": "ease-in-out"
    },
    [ANIMATIONS_TYPES.fadeOutDown]: {
        "name": "fadeOutDown",
        "duration": "1s",
        "timingFunction": "ease-in-out"
    },
    [ANIMATIONS_TYPES.fadeOutLeft]: {
        "name": "fadeOutLeft",
        "duration": "1s",
        "timingFunction": "ease-in-out"
    },
    [ANIMATIONS_TYPES.fadeOutRight]: {
        "name": "fadeOutRight",
        "duration": "1s",
        "timingFunction": "ease-in-out"
    },
    [ANIMATIONS_TYPES.bounce]: {
        "name": "bounce",
        "duration": "1s",
        "timingFunction": "ease-in-out"
    },
    [ANIMATIONS_TYPES.flash]: {
        "name": "flash",
        "duration": "1s",
        "timingFunction": "linear",
        "animationIterationCount": "infinite"
    },
    [ANIMATIONS_TYPES.pulse]: {
        "name": "pulse",
        "duration": "1s",
        "timingFunction": "ease-in-out"
    },
    [ANIMATIONS_TYPES.rubberBand]: {
        "name": "rubberBand",
        "duration": "1s",
        "timingFunction": "ease-in-out"
    },
    [ANIMATIONS_TYPES.shakeX]: {
        "name": "shakeX",
        "duration": "1s",
        "timingFunction": "ease-in-out"
    },
    [ANIMATIONS_TYPES.shakeY]: {
        "name": "shakeY",
        "duration": "1s",
        "timingFunction": "ease-in-out"
    },
    [ANIMATIONS_TYPES.headShake]: {
        "name": "headShake",
        "duration": "1s",
        "timingFunction": "ease-in-out"
    },
    [ANIMATIONS_TYPES.swing]: {
        "name": "swing",
        "duration": "1s",
        "timingFunction": "ease-in-out"
    },
    [ANIMATIONS_TYPES.hinge]: {
        "name": "hinge",
        "duration": "2s",
        "timingFunction": "ease-in-out"
    },
    // ... (many more animations available in animate.css)
}



// [
//     {
//         "value": "fade-in",
//         "label": "Fade In ",
//         "hoverClass": "hover-pulse"
//     },
//     {
//         "value": "slide-up",
//         "label": "Slide Up",
//         "hoverClass": "hover-grow"
//     },
//     {
//         "value": "slide-down",
//         "label": "Slide Down",
//         "hoverClass": "hover-wobble"
//     },
//     {
//         "value": "slide-left",
//         "label": "Slide Left",
//         "hoverClass": "hover-flash"
//     },
//     {
//         "value": "slide-right",
//         "label": "Slide Right",
//         "hoverClass": "hover-jello"
//     },
//     {
//         "value": "zoom-in",
//         "label": "Zoom In",
//         "hoverClass": null // No hover animation for zoom-in
//     },
//     {
//         "value": "zoom-out",
//         "label": "Zoom Out",
//         "hoverClass": null // No hover animation for zoom-out
//     },
//     {
//         "value": "pulse",
//         "label": "Pulse",
//         "hoverClass": null // Pulse can be used as a hover animation on its own
//     },
//     {
//         "value": "shake",
//         "label": "Shake",
//         "hoverClass": "hover-spin"
//     },
//     {
//         "value": "bounce",
//         "label": "Bounce",
//         "hoverClass": null // Bounce can be used as a hover animation on its own
//     },
//     {
//         "value": "float",
//         "label": "Float",
//         "hoverClass": "hover-light-speed-in"
//     },
//     {
//         "value": "spin",
//         "label": "Spin",
//         "hoverClass": null // Spin can be used as a hover animation on its own
//     }
// ]
