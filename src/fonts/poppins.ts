import localFont from "next/font/local";

export const poppinsFont = localFont({
    src: [
        { path: './local/poppins-latin-400.woff2', weight: '400', style: 'normal' },
        { path: './local/poppins-latin-500.woff2', weight: '500', style: 'normal' },
        { path: './local/poppins-latin-600.woff2', weight: '600', style: 'normal' },
        { path: './local/poppins-latin-700.woff2', weight: '700', style: 'normal' },
    ],
    display: 'swap',
    variable: '--poppins-font',
});
