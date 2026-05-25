import localFont from "next/font/local";

export const interFont = localFont({
    src: [
        {
            path: './local/inter-latin-variable.woff2',
            weight: '100 900',
            style: 'normal',
        },
    ],
    display: 'swap',
    variable: '--primary-font',
});
