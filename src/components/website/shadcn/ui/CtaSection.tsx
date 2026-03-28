import { motion } from 'framer-motion';
import React from 'react';

interface CtaSectionProps {
    heading: string;
    subheading: string;
    primaryButton: React.ReactNode;
    secondaryButton?: React.ReactNode;
    safetyNet?: React.ReactNode;
}

const CtaSection: React.FC<CtaSectionProps> = ({ heading, subheading, primaryButton, secondaryButton, safetyNet }) => {
    return (
        <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            viewport={{ once: true, amount: 0.3 }}
            className="py-16 sm:py-24"
        >
            <div className="container mx-auto">
                <div className="relative isolate overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-900/50 px-6 py-16 text-center shadow-sm sm:px-16 border border-gray-200 dark:border-blue-500/30">
                    <div
                        className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent_40%)] -z-10 animate-pulse-slow"
                        aria-hidden="true"
                    />

                    <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                        {heading}
                    </h2>
                    <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
                        {subheading}
                    </p>
                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                        {primaryButton}
                        {secondaryButton}
                    </div>
                    {safetyNet || null}
                </div>
            </div>
        </motion.section>
    );
};

export default CtaSection;
