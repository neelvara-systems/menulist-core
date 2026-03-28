"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from './card';

const ShowcaseCards = ({ cardsList }: { cardsList: any[] }) => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(sectionRef, { once: true, amount: 0.4 });

    const [activeStep, setActiveStep] = useState(1);
    const [isPaused, setIsPaused] = useState(false); // This will be true when a user hovers over any card

    const handleStepClick = (index: number) => {
        setActiveStep(index + 1);
    };

    // Effect to handle the auto-playing sequence
    useEffect(() => {
        // Don't start the timer if the component is not in view or if the user is hovering
        if (!isInView || isPaused) {
            return;
        }

        const currentStepData = cardsList.find(s => s.step === activeStep);
        const duration = currentStepData?.duration || 5000;

        const timer = setTimeout(() => {
            // Advance to the next step, looping back to 1 after the last step
            setActiveStep((prevStep) => (prevStep % cardsList.length) + 1);
        }, duration);

        // Cleanup the timer if the component unmounts or dependencies change
        return () => clearTimeout(timer);
    }, [activeStep, isPaused, isInView]);

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div ref={sectionRef} className="relative">
                <div className=" md:flex relative items-center justify-center h-[650px] w-full -mt-16">
                    {cardsList.map((step, index) => {
                        const position = (index - (activeStep - 1) + 3) % 3;
                        // position: 0 = center, 1 = right, 2 = left

                        const getTransform = () => {
                            switch (position) {
                                case 0:
                                    return 'translateX(0%) scale(1) rotate(0deg)';
                                case 1:
                                    return 'translateX(50%) scale(0.8) rotate(8deg)';
                                case 2:
                                    return 'translateX(-50%) scale(0.8) rotate(-8deg)';
                                default:
                                    return 'scale(0.5)';
                            }
                        };

                        return (
                            <motion.div
                                key={step.step}
                                className="absolute w-full max-w-md lg:max-w-lg"
                                animate={{
                                    transform: getTransform(),
                                    zIndex: position === 0 ? 3 : 2,
                                    opacity: position === 0 ? 1 : 0.5,
                                }}
                                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                            >
                                <Card className={`h-full border-primary/20 bg-card/80 backdrop-blur-sm transition-all hover:border-primary/40`}>
                                    <CardHeader className="flex flex-row items-center gap-4 pb-4">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10`}>
                                            {step.icon}
                                        </div>
                                        <CardTitle className="text-lg font-semibold text-foreground">{step.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: step.description }} />
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
            <div className="w-full flex items-center justify-center space-x-3 mt-10">
                {cardsList.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => handleStepClick(index)}
                        className={`border border-primary rounded-full h-2.5 transition-all duration-300 ease-in-out ${activeStep === index + 1
                            ? 'w-8 bg-gradient-to-r from-primary to-primary-600'
                            : 'w-2.5 bg-slate-600 hover:bg-slate-500'
                            }`}
                        aria-label={`Go to step ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default ShowcaseCards;