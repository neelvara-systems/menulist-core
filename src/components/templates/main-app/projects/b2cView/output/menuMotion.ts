export const menuSpringTransition = {
    type: 'spring',
    damping: 25,
    stiffness: 300,
};

export const menuFadeTransition = {
    duration: 0.16,
    ease: 'easeOut',
};

export const menuPanelMotion = {
    initial: { opacity: 0, y: 14, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 14, scale: 0.97 },
};

export const menuBottomSheetMotion = {
    initial: { opacity: 1, y: '100%' },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 1, y: '100%' },
};

export const menuDialogMotion = {
    initial: { opacity: 0, y: 50, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 50, scale: 0.95 },
};

export const menuSearchStateMotion = {
    initial: { opacity: 0, y: 12, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 10, scale: 0.98 },
};
