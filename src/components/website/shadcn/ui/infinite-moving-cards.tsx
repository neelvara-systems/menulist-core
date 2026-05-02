"use client";

import useIsMobile from "@hook/useIsMobile";
import { cn } from "@shadcnlib/utils";
import Image from "next/image";
import React, { useEffect, useState } from "react";

export const InfiniteMovingCards = ({ items, direction = "left", speed = "normal", pauseOnHover = true, className, setActiveCard, activeCard }: {
    items: {
        name: string;
        hint: string;
        imageUrl: string;
    }[];
    direction?: "left" | "right";
    speed?: "fast" | "normal" | "slow";
    pauseOnHover?: boolean;
    className?: string;
    setActiveCard?: (name: string | null) => void;
    activeCard?: string | null;
}) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const scrollerRef = React.useRef<HTMLUListElement>(null);
    const isMobile = useIsMobile();

    useEffect(() => {
        addAnimation();
    }, []);

    const [start, setStart] = useState(false);

    function addAnimation() {
        if (containerRef.current && scrollerRef.current) {
            const scrollerContent = Array.from(scrollerRef.current.children);

            scrollerContent.forEach((item) => {
                const duplicatedItem = item.cloneNode(true);
                if (scrollerRef.current) {
                    scrollerRef.current.appendChild(duplicatedItem);
                }
            });

            getDirection();
            getSpeed();
            setStart(true);
        }
    }

    const getDirection = () => {
        if (containerRef.current) {
            if (direction === "left") {
                containerRef.current.style.setProperty(
                    "--animation-direction",
                    "forwards"
                );
            } else {
                containerRef.current.style.setProperty(
                    "--animation-direction",
                    "reverse"
                );
            }
        }
    };

    const getSpeed = () => {
        if (containerRef.current) {
            if (speed === "fast") {
                containerRef.current.style.setProperty("--animation-duration", "10s");
            } else if (speed === "normal") {
                containerRef.current.style.setProperty("--animation-duration", "20s");
            } else {
                containerRef.current.style.setProperty("--animation-duration", "60s");
            }
        }
    };

    const handleCardClick = (name: string | null) => {
        if (name === null) {
            setActiveCard(null);
        } else {
            if (activeCard === name) {
                setActiveCard(null); // Deactivate if the same card is clicked again
            } else {
                setActiveCard(name); // Activate the clicked card
            }
        }
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                "scroller relative z-20 max-w-100vw overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
                className
            )}
            onClick={() => handleCardClick(null)}
        >
            <ul
                ref={scrollerRef}
                className={cn(
                    "flex w-max min-w-full h-full shrink-0 flex-nowrap gap-4",
                    start && "animate-scroll",
                    {
                        "hover:[animation-play-state:paused]": pauseOnHover && !isMobile,
                        "[animation-play-state:paused]": activeCard && isMobile,
                    }
                )}
            >
                {items.map((item) => {
                    const isCardActive = isMobile && activeCard === item.name;
                    return (
                        <li
                            key={item.name}
                            className="group rounded-lg border border-border bg-card/50 dark:bg-card/30 shadow-sm relative w-[200px] h-[300px] overflow-hidden bg-gradient-to-b from-blue-500/50 to-transparent shadow-[0_0_40px_-10px_rgba(59,130,246,0.4)]"
                            onClick={(e) => { e.stopPropagation(); handleCardClick(item.name); }}
                        >
                            <Image
                                src={item.imageUrl}
                                alt={`MenuList digital menu template: ${item.name} style - ${item.hint}`}
                                fill
                                sizes="200px"
                                style={{ objectFit: 'cover' }}
                                className="transform transition-transform duration-500 group-hover:scale-110"
                                data-ai-hint={item.hint}
                            />
                            <div
                                className={cn(
                                    "absolute bottom-0 left-0 w-full p-4 text-center text-white bg-black/30 backdrop-blur-md transform transition-all duration-300 ease-in-out",
                                    isCardActive
                                        ? "opacity-100 translate-y-0"
                                        : "opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0"
                                )}
                            >
                                <h3 className="text-lg font-semibold">{item.name}</h3>
                                <p className="text-sm mt-1 text-gray-300">{item.hint}</p>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
