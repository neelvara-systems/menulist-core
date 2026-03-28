"use client";

import { useInView } from '@shadcnhooks/useInView';
import { motion } from 'framer-motion';
import React from 'react';

interface SectionHeadingProps {
    text: string;
    highlightedText: string;
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'p';
    className?: string;
    subheading?: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ text, highlightedText, as: Tag = 'h2', className = '', subheading }) => {
    const [ref, isInView] = useInView<any>({ threshold: 0.1, triggerOnce: true });
    const parts = text.split(new RegExp(`(${highlightedText})`, 'gi'));

    const MotionTag = motion[Tag];

    const variants = {
        hidden: { opacity: 0, y: -20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <>
            <MotionTag
                ref={ref}
                className={`text-3xl md:text-4xl lg:text-5xl font-extrabold text-center ${className}`}
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
                variants={variants}
            >
                {parts.map((part, index) =>
                    part.toLowerCase() === highlightedText.toLowerCase() ? (
                        <span key={index} className="font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                            {part}
                        </span>
                    ) : (
                        part
                    )
                )}
            </MotionTag>
            <motion.p
                className={`mt-4 text-lg text-muted-foreground max-w-3xl mx-auto mb-12 ${className ? className : 'text-center'}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                animate={isInView ? "visible" : "hidden"}
                variants={variants}
            >
                {subheading}
            </motion.p>
        </>
    );
};

export default SectionHeading;
