
import { motion } from 'framer-motion';

function SVGBg() {
    const animationVariants = {
        wave1: { x: [-20, 20], transition: { x: { repeat: Infinity, repeatType: "mirror", duration: 2, ease: "easeInOut", }, }, },
        wave2: { x: [20, -20], transition: { x: { repeat: Infinity, repeatType: "mirror", duration: 4, ease: "easeInOut", }, }, },
        wave3: { x: [-10, 10], transition: { x: { repeat: Infinity, repeatType: "mirror", duration: 6, ease: "easeInOut", }, }, },
    };

    return (
        <svg
            style={{
                width: '100%',
                position: 'absolute',
                bottom: 0,
                left: "0%",
                height: 'auto',
                filter: "blur(15px)",
            }}
            xmlns="http://www.w3.org/2000/svg" width="2527" height="867" viewBox="0 0 2527 867" fill="none">
            <g clipPath="url(#clip0_27343_2783)">
                <motion.path variants={animationVariants} animate="wave1" d="M3359.05 -449.001C2904.14 -153.567 2359.39 272.531 1961.09 831.967C1169.58 1941.54 1417.64 2929.22 1604.64 3406.64L1721.18 3406.64C1471.91 2929.14 1141.27 1941.14 2195.61 831.345C2726.75 272.25 3453.45 -153.628 4060.1 -448.981L3359.05 -448.981L3359.05 -449.001Z" fill="url(#paint0_linear_27343_2783)" />
                <motion.path variants={animationVariants} animate="wave2" d="M3359.04 -449.001C2904.14 -153.567 2359.39 272.531 1961.09 831.967C1169.57 1941.54 1417.64 2929.22 1604.64 3406.64L1488.11 3406.64C1363.43 2929.3 1197.93 1941.96 1726.62 832.61C1992.09 272.833 2354.87 -153.487 2657.99 -449.001L3359.04 -449.001Z" fill="url(#paint1_linear_27343_2783)" />
                <motion.path variants={animationVariants} animate="wave3" d="M2657.98 -449.001C2354.81 -153.487 1992.08 272.833 1726.62 832.61C1197.92 1941.96 1363.42 2929.3 1488.1 3406.64L1371.57 3406.64C1309.15 2929.4 1226.22 1942.36 1492.1 833.252C1624.73 273.134 1805.55 -153.407 1956.92 -449.001L2657.98 -449.001Z" fill="url(#paint2_linear_27343_2783)" />
                <motion.path variants={animationVariants} animate="wave1" d="M1956.93 -449.001C1956.93 -448.994 1956.93 -448.987 1956.92 -448.98L1255.93 -448.98L1255.92 3406.64L1371.58 3406.64C1309.16 2929.4 1226.23 1942.36 1492.11 833.253C1624.74 273.147 1805.5 -153.387 1956.92 -448.98L1956.99 -448.98L1956.93 -449.001Z" fill="url(#paint3_linear_27343_2783)" />
                <motion.path variants={animationVariants} animate="wave2" d="M-846.946 -449.001C-392.039 -153.567 152.706 272.531 551.009 831.967C1342.52 1941.54 1094.46 2929.22 907.456 3406.64L790.925 3406.64C1040.19 2929.14 1370.83 1941.14 316.493 831.345C-214.647 272.25 -941.354 -153.628 -1548 -448.981L-846.946 -448.981L-846.946 -449.001Z" fill="url(#paint4_linear_27343_2783)" />
                <motion.path variants={animationVariants} animate="wave3" d="M-846.941 -449.001C-392.035 -153.567 152.71 272.531 551.013 831.967C1342.53 1941.54 1094.46 2929.22 907.46 3406.64L1023.99 3406.64C1148.67 2929.3 1314.17 1941.96 785.476 832.61C520.01 272.833 157.228 -153.487 -145.887 -449.001L-846.941 -449.001Z" fill="url(#paint5_linear_27343_2783)" />
                <motion.path variants={animationVariants} animate="wave1" d="M-145.879 -449.001C157.288 -153.487 520.019 272.833 785.485 832.61C1314.18 1941.96 1148.68 2929.3 1024 3406.64L1140.53 3406.64C1202.95 2929.4 1285.88 1942.36 1020 833.252C887.372 273.134 706.551 -153.407 555.175 -449.001L-145.879 -449.001Z" fill="url(#paint6_linear_27343_2783)" />
                <motion.path variants={animationVariants} animate="wave2" d="M555.166 -449.001C555.169 -448.994 555.172 -448.987 555.176 -448.98L1256.17 -448.98L1256.18 3406.64L1140.52 3406.64C1202.94 2929.4 1285.87 1942.36 1019.99 833.253C887.365 273.147 706.602 -153.387 555.176 -448.98L555.114 -448.98L555.166 -449.001Z" fill="url(#paint7_linear_27343_2783)" />
            </g>
            <defs>
                <linearGradient id="paint0_linear_27343_2783" x1="1893.38" y1="4713.43" x2="3862.16" y2="618.619" gradientUnits="userSpaceOnUse">
                    <stop offset="0.659397" stopColor="#3b82f6" />
                    <stop offset="0.709823" stopColor="#3b82f6" />
                    <stop offset="0.793779" stopColor="#3abff8" />
                    <stop offset="0.887984" stopColor="#3abff8" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="paint1_linear_27343_2783" x1="1722.96" y1="4713.43" x2="4006.98" y2="1126.36" gradientUnits="userSpaceOnUse">
                    <stop offset="0.659397" stopColor="#3b82f6" />
                    <stop offset="0.709823" stopColor="#3b82f6" />
                    <stop offset="0.793779" stopColor="#3abff8" />
                    <stop offset="0.887984" stopColor="#3abff8" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="paint2_linear_27343_2783" x1="1552.5" y1="4713.43" x2="4068.76" y2="2043.24" gradientUnits="userSpaceOnUse">
                    <stop offset="0.659397" stopColor="#3b82f6" />
                    <stop offset="0.709823" stopColor="#3b82f6" />
                    <stop offset="0.793779" stopColor="#3abff8" />
                    <stop offset="0.887984" stopColor="#3abff8" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="paint3_linear_27343_2783" x1="1382.76" y1="4713.43" x2="3514.07" y2="3538.62" gradientUnits="userSpaceOnUse">
                    <stop offset="0.659397" stopColor="#3b82f6" />
                    <stop offset="0.709823" stopColor="#3b82f6" />
                    <stop offset="0.793779" stopColor="#3abff8" />
                    <stop offset="0.887984" stopColor="#3abff8" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="paint4_linear_27343_2783" x1="618.719" y1="4713.43" x2="-1350.06" y2="618.619" gradientUnits="userSpaceOnUse">
                    <stop offset="0.659397" stopColor="#3b82f6" />
                    <stop offset="0.709823" stopColor="#3b82f6" />
                    <stop offset="0.793779" stopColor="#3abff8" />
                    <stop offset="0.887984" stopColor="#3abff8" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="paint5_linear_27343_2783" x1="789.139" y1="4713.43" x2="-1494.88" y2="1126.36" gradientUnits="userSpaceOnUse">
                    <stop offset="0.659397" stopColor="#3b82f6" />
                    <stop offset="0.709823" stopColor="#3b82f6" />
                    <stop offset="0.793779" stopColor="#3abff8" />
                    <stop offset="0.887984" stopColor="#3abff8" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="paint6_linear_27343_2783" x1="959.601" y1="4713.43" x2="-1556.66" y2="2043.24" gradientUnits="userSpaceOnUse">
                    <stop offset="0.659397" stopColor="#3b82f6" />
                    <stop offset="0.709823" stopColor="#3b82f6" />
                    <stop offset="0.793779" stopColor="#3abff8" />
                    <stop offset="0.887984" stopColor="#3abff8" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="paint7_linear_27343_2783" x1="1129.34" y1="4713.43" x2="-1001.97" y2="3538.62" gradientUnits="userSpaceOnUse">
                    <stop offset="0.659397" stopColor="#3b82f6" />
                    <stop offset="0.709823" stopColor="#3b82f6" />
                    <stop offset="0.793779" stopColor="#3abff8" />
                    <stop offset="0.887984" stopColor="#3abff8" stopOpacity="0" />
                </linearGradient>
                <clipPath id="clip0_27343_2783">
                    <rect width="2527" height="867" fill="white" />
                </clipPath>
            </defs>
        </svg>
    )
}

export default SVGBg