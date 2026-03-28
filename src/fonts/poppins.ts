import { Poppins } from "next/font/google";

export const poppinsFont = Poppins({
    subsets: ['latin'],
    display: 'swap',
    variable: '--poppins-font',
    weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900']
});