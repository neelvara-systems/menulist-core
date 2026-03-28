"use client";
import {
    motion,
    MotionValue,
    useScroll,
    useSpring,
    useTransform,
} from "framer-motion";
import React from "react";


const products = [
    {
        title: "Moonbeam",
        link: "https://gomoonbeam.com",
        thumbnail: "https://firebasestorage.googleapis.com/v0/b/ecomsai.appspot.com/o/craftBuilder%2FScreenshot%202024-06-01%20at%2010.45.15%E2%80%AFPM.png?alt=media&token=47795693-f302-4251-8035-7ac16c55ec3d"
    },
    {
        title: "Cursor",
        link: "https://cursor.so",
        thumbnail: "https://firebasestorage.googleapis.com/v0/b/ecomsai.appspot.com/o/craftBuilder%2FScreenshot%202024-06-01%20at%2010.45.15%E2%80%AFPM.png?alt=media&token=47795693-f302-4251-8035-7ac16c55ec3d"
    },
    {
        title: "Rogue",
        link: "https://userogue.com",
        thumbnail: "https://firebasestorage.googleapis.com/v0/b/ecomsai.appspot.com/o/craftBuilder%2FScreenshot%202024-06-01%20at%2010.45.15%E2%80%AFPM.png?alt=media&token=47795693-f302-4251-8035-7ac16c55ec3d"
    },

    {
        title: "Editorially",
        link: "https://editorially.org",
        thumbnail: "https://firebasestorage.googleapis.com/v0/b/ecomsai.appspot.com/o/craftBuilder%2FScreenshot%202024-06-01%20at%2010.45.15%E2%80%AFPM.png?alt=media&token=47795693-f302-4251-8035-7ac16c55ec3d"
    },
    {
        title: "Editrix AI",
        link: "https://editrix.ai",
        thumbnail: "https://firebasestorage.googleapis.com/v0/b/ecomsai.appspot.com/o/craftBuilder%2FScreenshot%202024-06-01%20at%2010.45.15%E2%80%AFPM.png?alt=media&token=47795693-f302-4251-8035-7ac16c55ec3d"
    },
    {
        title: "Pixel Perfect",
        link: "https://app.pixelperfect.quest",
        thumbnail: "https://firebasestorage.googleapis.com/v0/b/ecomsai.appspot.com/o/craftBuilder%2FScreenshot%202024-06-01%20at%2010.45.15%E2%80%AFPM.png?alt=media&token=47795693-f302-4251-8035-7ac16c55ec3d"
    },

    {
        title: "Algochurn",
        link: "https://algochurn.com",
        thumbnail: "https://firebasestorage.googleapis.com/v0/b/ecomsai.appspot.com/o/craftBuilder%2FScreenshot%202024-06-01%20at%2010.45.15%E2%80%AFPM.png?alt=media&token=47795693-f302-4251-8035-7ac16c55ec3d"
    },
    {
        title: "Aceternity UI",
        link: "https://ui.aceternity.com",
        thumbnail: "https://firebasestorage.googleapis.com/v0/b/ecomsai.appspot.com/o/craftBuilder%2FScreenshot%202024-06-01%20at%2010.45.15%E2%80%AFPM.png?alt=media&token=47795693-f302-4251-8035-7ac16c55ec3d"
    },
    {
        title: "Tailwind Master Kit",
        link: "https://tailwindmasterkit.com",
        thumbnail: "https://firebasestorage.googleapis.com/v0/b/ecomsai.appspot.com/o/craftBuilder%2FScreenshot%202024-06-01%20at%2010.45.15%E2%80%AFPM.png?alt=media&token=47795693-f302-4251-8035-7ac16c55ec3d"
    },
    {
        title: "SmartBridge",
        link: "https://smartbridgetech.com",
        thumbnail: "https://firebasestorage.googleapis.com/v0/b/ecomsai.appspot.com/o/craftBuilder%2FScreenshot%202024-06-01%20at%2010.45.15%E2%80%AFPM.png?alt=media&token=47795693-f302-4251-8035-7ac16c55ec3d"
    },
    {
        title: "Renderwork Studio",
        link: "https://renderwork.studio",
        thumbnail: "https://firebasestorage.googleapis.com/v0/b/ecomsai.appspot.com/o/craftBuilder%2FScreenshot%202024-06-01%20at%2010.45.15%E2%80%AFPM.png?alt=media&token=47795693-f302-4251-8035-7ac16c55ec3d"
    },

    {
        title: "Creme Digital",
        link: "https://cremedigital.com",
        thumbnail: "https://firebasestorage.googleapis.com/v0/b/ecomsai.appspot.com/o/craftBuilder%2FScreenshot%202024-06-01%20at%2010.45.15%E2%80%AFPM.png?alt=media&token=47795693-f302-4251-8035-7ac16c55ec3d"
    },
    {
        title: "Golden Bells Academy",
        link: "https://goldenbellsacademy.com",
        thumbnail: "https://firebasestorage.googleapis.com/v0/b/ecomsai.appspot.com/o/craftBuilder%2FScreenshot%202024-06-01%20at%2010.45.15%E2%80%AFPM.png?alt=media&token=47795693-f302-4251-8035-7ac16c55ec3d"
    },
    {
        title: "Invoker Labs",
        link: "https://invoker.lol",
        thumbnail: "https://firebasestorage.googleapis.com/v0/b/ecomsai.appspot.com/o/craftBuilder%2FScreenshot%202024-06-01%20at%2010.45.15%E2%80%AFPM.png?alt=media&token=47795693-f302-4251-8035-7ac16c55ec3d"
    },
    {
        title: "E Free Invoice",
        link: "https://efreeinvoice.com",
        thumbnail: "https://firebasestorage.googleapis.com/v0/b/ecomsai.appspot.com/o/craftBuilder%2FScreenshot%202024-06-01%20at%2010.45.15%E2%80%AFPM.png?alt=media&token=47795693-f302-4251-8035-7ac16c55ec3d"
    },
];

export const HeroParallax = ({ children }: {
    children: React.ReactNode;
}) => {
    const firstRow = products.slice(0, 5);
    const secondRow = products.slice(5, 10);
    const thirdRow = products.slice(10, 15);
    const ref = React.useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"],
    });

    const springConfig = { stiffness: 300, damping: 30, bounce: 100 };

    const translateX = useSpring(
        useTransform(scrollYProgress, [0, 1], [0, 1000]),
        springConfig
    );
    const translateXReverse = useSpring(
        useTransform(scrollYProgress, [0, 1], [0, -1000]),
        springConfig
    );
    const rotateX = useSpring(
        useTransform(scrollYProgress, [0, 0.2], [15, 0]),
        springConfig
    );
    const opacity = useSpring(
        useTransform(scrollYProgress, [0, 0.2], [0.2, 1]),
        springConfig
    );
    const rotateZ = useSpring(
        useTransform(scrollYProgress, [0, 0.2], [20, 0]),
        springConfig
    );
    const translateY = useSpring(
        useTransform(scrollYProgress, [0, 0.2], [-700, 500]),
        springConfig
    );
    return (
        <div
            ref={ref}
            className="h-[300vh] overflow-hidden  antialiased relative flex flex-col self-auto [perspective:1000px] [transform-style:preserve-3d]"
        >
            {children}
            <motion.div
                style={{
                    rotateX,
                    rotateZ,
                    translateY,
                    opacity,
                }}
                className=""
            >
                <motion.div className="flex flex-row-reverse space-x-reverse space-x-20 mb-20">
                    {firstRow.map((product) => (
                        <ProductCard
                            product={product}
                            translate={translateX}
                            key={product.title}
                        />
                    ))}
                </motion.div>
                <motion.div className="flex flex-row  mb-20 space-x-20 ">
                    {secondRow.map((product) => (
                        <ProductCard
                            product={product}
                            translate={translateXReverse}
                            key={product.title}
                        />
                    ))}
                </motion.div>
                <motion.div className="flex flex-row-reverse space-x-reverse space-x-20">
                    {thirdRow.map((product) => (
                        <ProductCard
                            product={product}
                            translate={translateX}
                            key={product.title}
                        />
                    ))}
                </motion.div>
            </motion.div>
        </div>
    );
};

export const ProductCard = ({
    product,
    translate,
}: {
    product: {
        title: string;
        link: string;
        thumbnail: string;
    };
    translate: MotionValue<number>;
}) => {
    return (
        <motion.div
            style={{
                x: translate,
            }}
            whileHover={{
                y: -20,
            }}
            key={product.title}
            className="group/product h-96 w-[30rem] relative shrink-0"
        >
            <a
                href={product.link}
                className="block group-hover/product:shadow-2xl "
            >
                <img
                    src={product.thumbnail}
                    height="600"
                    width="600"
                    className="object-cover object-left-top absolute h-full w-full inset-0"
                    alt={product.title}
                />
            </a>
            <div className="absolute inset-0 h-full w-full opacity-0 group-hover/product:opacity-80 bg-black pointer-events-none"></div>
            <h2 className="absolute bottom-4 left-4 opacity-0 group-hover/product:opacity-100 text-white">
                {product.title}
            </h2>
        </motion.div>
    );
};
