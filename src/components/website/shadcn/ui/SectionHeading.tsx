"use client";

import React from 'react';

interface SectionHeadingProps {
    text: string;
    highlightedText: string;
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'p';
    className?: string;
    subheading?: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ text, highlightedText, as: Tag = 'h2', className = '', subheading }) => {
    const parts = text.split(new RegExp(`(${highlightedText})`, 'gi'));

    return (
        <>
            <Tag
                className={`text-3xl md:text-4xl lg:text-5xl font-extrabold text-center ${className}`}
            >
                {parts.map((part, index) =>
                    part.toLowerCase() === highlightedText.toLowerCase() ? (
                        <span key={index} className="font-black ws-brand-gradient-text">
                            {part}
                        </span>
                    ) : (
                        part
                    )
                )}
            </Tag>
            <p
                className={`mt-4 text-lg text-muted-foreground max-w-3xl mx-auto mb-12 ${className ? className : 'text-center'}`}
            >
                {subheading}
            </p>
        </>
    );
};

export default SectionHeading;
