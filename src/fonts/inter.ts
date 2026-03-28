import { Inter } from "next/font/google";

export const interFont = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--primary-font',
    weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900']
});