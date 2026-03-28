"use client";

import { motion } from 'framer-motion';
import React from 'react';

const Glow = ({ className, transition }: { className: string, transition: any }) => (
  <motion.div
    className={`absolute rounded-full bg-primary/20 blur-[150px] ${className}`}
    animate={{
      x: [0, Math.random() * 200 - 100, 0],
      y: [0, Math.random() * 200 - 100, 0],
      rotate: [0, Math.random() * 90, 0],
      scale: [1, 1.1, 1],
    }}
    transition={transition}
  />
);

const BackgroundGlows = () => {
  const glows = [
    {
      className: "w-[600px] h-[600px] -top-80 -left-80",
      transition: { duration: 15, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }
    },
    {
      className: "w-[500px] h-[500px] top-1/4 -right-96",
      transition: { duration: 18, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: 3 }
    },
    {
      className: "w-[400px] h-[400px] bottom-0 left-1/4",
      transition: { duration: 12, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: 1 }
    },
    {
      className: "w-[350px] h-[350px] -bottom-80 right-1/4",
      transition: { duration: 20, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: 4 }
    }
  ];

  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
      {glows.map((glow, index) => (
        <Glow key={index} className={glow.className} transition={glow.transition} />
      ))}
    </div>
  );
};

export default BackgroundGlows;
