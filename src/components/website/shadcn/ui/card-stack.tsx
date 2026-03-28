"use client";
import { Badge } from '@shadcncomponents/badge';
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
// HowItWorksCard was part of the old landing page — this component is unused
// TODO: Delete this file if CardStack is confirmed unused
type StepData = { step: number;[key: string]: any };
const HowItWorksCard = ({ data, isActive, isSequencePaused, onMouseEnter, onMouseLeave }: any) => null;

export const CardStack = ({ items, setIsPaused, activeStep, isPaused }: {
    items: StepData[];
    setIsPaused: (value: boolean) => void;
    activeStep: number;
    isPaused: boolean;
}) => {
    const CARD_OFFSET = 10;
    const SCALE_FACTOR = 0.06;
    const [cards, setCards] = useState<StepData[]>(items);

    useEffect(() => {
        const reorderedCards = [...items];
        const activeCardIndex = reorderedCards.findIndex(
            (card) => card.step === activeStep
        );

        if (activeCardIndex > -1) {
            const activeCard = reorderedCards.splice(activeCardIndex, 1)[0];
            reorderedCards.unshift(activeCard);
        }

        setCards(reorderedCards);
    }, [activeStep, items]);

    return (
        <div className="relative h-[570px] w-full">
            {cards.map((card, index) => {
                return (
                    <motion.div
                        key={card.step}
                        className="absolute h-full dark:bg-black bg-white w-full md:w-96 rounded-3xl p-4 shadow-xl border border-neutral-200 dark:border-white/[0.1]  shadow-black/[0.1] dark:shadow-white/[0.05] flex flex-col justify-between"
                        style={{
                            transformOrigin: "top center",
                        }}
                        animate={{
                            top: index * -CARD_OFFSET,
                            scale: 1 - index * SCALE_FACTOR, // decrease scale for cards that are behind
                            zIndex: cards.length - index, //  decrease z-index for the cards that are behind
                        }}
                    >
                        <Badge variant="default" className="absolute top-4 right-4 z-10 px-2 text-xs font-semibold shadow-lg bg-blue-100 text-blue-800 shadow-blue-500/5 dark:bg-blue-500/10 dark:text-blue-300 dark:shadow-blue-500/10">
                            {activeStep}
                        </Badge>
                        <HowItWorksCard
                            key={card.step}
                            data={card}
                            isActive={activeStep === card.step}
                            isSequencePaused={isPaused}
                            onMouseEnter={() => setIsPaused(true)}
                            onMouseLeave={() => setIsPaused(false)}
                        />
                    </motion.div>
                );
            })}
        </div>
    );
};
