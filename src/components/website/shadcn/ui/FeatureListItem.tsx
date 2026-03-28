"use client";

import { motion } from 'framer-motion';
import React from 'react';
import { useInView } from 'react-intersection-observer';
import { Card, CardContent, CardHeader, CardTitle } from './card';

interface FeatureListItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  active?: boolean;
  inactive?: boolean;
  onClick?: () => void;
}

export const FeatureListItem = ({ icon, title, description, active, inactive, onClick }: FeatureListItemProps) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0,
  });

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'easeInOut', duration: 0 }
    },
  };

  return (

    <motion.div key={title} variants={variants} onClick={onClick}>
      <Card className={`h-full border-primary/20 bg-card/80 backdrop-blur-sm transition-all hover:border-primary/40 ${active ? 'bg-green-700/10 border-green-700/30' : ''} ${inactive ? 'bg-red-700/10 border-red-700/30' : ''} ${onClick ? 'cursor-pointer' : ''} ${onClick && !active ? 'hover:bg-card/50' : ''}`}>
        <CardHeader className="flex flex-row items-center gap-4 pb-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ${active ? 'bg-green-700/10 border-green-700/30' : ''} ${inactive ? 'bg-red-700/10 border-red-700/30' : ''}`}>
            {icon}
          </div>
          <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: description }} />
        </CardContent>
      </Card>
    </motion.div>

    // <motion.div
    //   ref={ref}
    //   initial="hidden"
    //   animate={inView ? "visible" : "hidden"}
    //   variants={variants}
    //   onClick={onClick}
    //   className={`flex items-start p-4 rounded-lg bg-card/30 border border-transparent hover:border-border/50 transition-all group ${active ? 'bg-primary/10 border-primary/30' : ''} ${onClick ? 'cursor-pointer' : ''} ${onClick && !active ? 'hover:bg-card/50' : ''}`}
    // >
    //   <div key={title} className="flex items-start gap-4">
    //     <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
    //       {icon}
    //     </div>
    //     <div>
    //       <h3 className="text-lg font-semibold text-foreground">{title}</h3>
    //       <p className="mt-1 text-muted-foreground">{description}</p>
    //     </div>
    //   </div>
    // </motion.div>
  );
};