import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { normalizeAnimationDimension } from '../animationPresentation';

// Define the type for a single confetti particle
interface ConfettiParticle {
    id: number;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    rotation: number;
    rotationSpeed: number;
    color: string;
    opacity: number;
    gravity: number;
    drag: number;
    spin: 1 | -1; // Spin direction can only be 1 or -1
    shape: 'square' | 'line' | 'star'; // Specific string literal types for shapes
    width?: number; // Optional for 'line' shape
    height?: number; // Optional for 'line' shape
    size?: number; // Optional for 'square' and 'star' shapes
}

// Reusable Confetti component
const Confetti = ({ totalHeight = 600, totalWidth = 350 }: { totalHeight: number, totalWidth: number }) => {
    // State to hold the array of confetti particles
    const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
    // Ref to hold the animation frame ID for cleanup
    const animationFrameId = useRef<number | null>(null);
    // Ref to store the timestamp of the last animation frame
    const lastFrameTime = useRef<number>(0);
    const nextParticleId = useRef(0);
    const resolvedHeight = normalizeAnimationDimension(totalHeight);
    const resolvedWidth = normalizeAnimationDimension(totalWidth);

    // Function to generate a random color for confetti (lighter palette)
    const getRandomColor = (): string => {
        const colors = [
            '#FFB6C1', // Light Pink
            '#FFDAB9', // Peach Puff
            '#ADD8E6', // Light Blue
            '#90EE90', // Light Green
            '#FFFFE0', // Light Yellow
            '#E0BBE4', // Lavender
            '#957DAD', // Medium Purple
            '#D291BC', // Pastel Purple
            '#FFABAB', // Light Red
            '#A7D9B4', // Mint Green
            '#FFEFD5', // Papaya Whip
            '#F0F8FF', // Alice Blue
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    // Function to create a single confetti particle
    const createConfettiParticle = (x: number, y: number, initialVx: number, initialVy: number): ConfettiParticle => {
        const shapes: ('square' | 'line' | 'star')[] = ['square', 'line', 'star'];
        const randomShape = shapes[Math.floor(Math.random() * shapes.length)];

        const baseSize = Math.random() * 8 + 5; // Base size for squares and stars
        let particle: ConfettiParticle = {
            id: nextParticleId.current++,
            x: x, // Initial X position
            y: y, // Initial Y position
            z: Math.random() * 2 + 1, // Z-index for layering
            vx: initialVx + (Math.random() - 0.5) * 5, // Horizontal velocity, adjusted by initial input
            vy: initialVy + (Math.random() * -10 - 5), // Vertical velocity (upwards initially), adjusted by initial input
            rotation: Math.random() * 360, // Initial rotation
            rotationSpeed: (Math.random() - 0.5) * 20, // Rotation speed
            color: getRandomColor(), // Random color
            opacity: 1, // Initial opacity
            gravity: 0.5, // Gravity effect
            drag: 0.98, // Air resistance
            spin: Math.random() < 0.5 ? 1 : -1, // Spin direction
            shape: randomShape, // Type of shape
        };

        if (randomShape === 'line') {
            particle.width = Math.random() * 25 + 15; // Length of the line, slightly longer
            particle.height = Math.random() * 2 + 1; // Thickness of the line
            particle.rotationSpeed = (Math.random() - 0.5) * 40; // Faster rotation for lines
        } else if (randomShape === 'star') {
            particle.size = baseSize * 1.5; // Slightly larger for stars
            particle.rotationSpeed = (Math.random() - 0.5) * 30; // Moderate rotation for stars
        } else { // 'square'
            particle.size = baseSize;
        }

        return particle;
    };

    // const totalHeight = 600// window.innerHeight;
    // const totalWidth = 350// window.innerWidth;
    // Function to trigger the confetti burst from corners
    const triggerConfetti = useCallback(() => {
        const newConfettiParticles: ConfettiParticle[] = [];
        const numParticlesPerSide = 75; // Half of the total 150 particles

        // Particles from bottom-left
        for (let i = 0; i < numParticlesPerSide; i++) {
            const startX = Math.random() * (resolvedWidth * 0.1); // Within 10% of left edge
            const startY = resolvedHeight - (Math.random() * (resolvedHeight * 0.05)); // Within 5% of bottom edge

            // Initial velocity to push towards top-center
            const initialVx = Math.random() * 8 + 5; // Positive velocity to move right
            const initialVy = Math.random() * -15 - 10; // Strong negative velocity to move up

            newConfettiParticles.push(createConfettiParticle(startX, startY, initialVx, initialVy));
        }

        // Particles from bottom-right
        for (let i = 0; i < numParticlesPerSide; i++) {
            const startX = resolvedWidth - (Math.random() * (resolvedWidth * 0.1)); // Within 10% of right edge
            const startY = resolvedHeight - (Math.random() * (resolvedHeight * 0.05)); // Within 5% of bottom edge

            // Initial velocity to push towards top-center
            const initialVx = Math.random() * -8 - 5; // Negative velocity to move left
            const initialVy = Math.random() * -15 - 10; // Strong negative velocity to move up

            newConfettiParticles.push(createConfettiParticle(startX, startY, initialVx, initialVy));
        }

        setConfetti((prevConfetti) => [...prevConfetti, ...newConfettiParticles]);
    }, [resolvedHeight, resolvedWidth]);

    // Animation loop using requestAnimationFrame
    const animateConfetti = useCallback((currentTime: number) => {
        // Calculate delta time for frame-rate independent animation
        const deltaTime = (currentTime - lastFrameTime.current) / 1000; // Convert to seconds
        lastFrameTime.current = currentTime;

        setConfetti((prevConfetti) => {
            const updatedConfetti = prevConfetti
                .map((p) => {
                    const nextParticle = { ...p };
                    // Apply gravity
                    nextParticle.vy += nextParticle.gravity * deltaTime * 60; // Scale gravity by deltaTime
                    // Apply drag
                    nextParticle.vx *= Math.pow(nextParticle.drag, deltaTime * 60);
                    nextParticle.vy *= Math.pow(nextParticle.drag, deltaTime * 60);

                    // Update position
                    nextParticle.x += nextParticle.vx * deltaTime * 60;
                    nextParticle.y += nextParticle.vy * deltaTime * 60;

                    // Update rotation
                    nextParticle.rotation += nextParticle.rotationSpeed * nextParticle.spin * deltaTime * 60;

                    // Fade out as it falls
                    // Start fading earlier for a more natural fall-off
                    if (nextParticle.y > resolvedHeight * 0.5) { // Start fading from mid-screen
                        nextParticle.opacity -= 0.02 * deltaTime * 60;
                    }

                    return nextParticle;
                })
                .filter((p) => p.opacity > 0 && p.y < resolvedHeight + 50); // Remove off-screen or faded particles

            return updatedConfetti;
        });

        // Continue animation if there are particles
        if (confetti.length > 0) {
            animationFrameId.current = requestAnimationFrame(animateConfetti);
        } else {
            animationFrameId.current = null; // Stop animation if no particles
        }
    }, [confetti.length, resolvedHeight]); // Re-run if confetti count or bounds change to stop/start animation

    // Effect to trigger confetti only once on component mount
    useEffect(() => {
        triggerConfetti();
    }, [triggerConfetti]);

    // Effect to manage the animation loop
    useEffect(() => {
        if (confetti.length > 0 && !animationFrameId.current) {
            lastFrameTime.current = performance.now(); // Initialize last frame time
            animationFrameId.current = requestAnimationFrame(animateConfetti);
        } else if (confetti.length === 0 && animationFrameId.current) {
            // Explicitly stop animation if no particles are left
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }

        // Cleanup function: cancel animation frame on component unmount
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
        };
    }, [confetti.length, animateConfetti]); // Dependencies: confetti.length for starting/stopping, animateConfetti for stability

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <style>
                {`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out forwards;
        }
        `}
            </style>
            {/* Confetti particles */}
            {confetti.map((p) => {
                const commonStyle: CSSProperties = { // Explicitly type commonStyle as CSSProperties
                    left: `${p.x}px`,
                    top: `${p.y}px`,
                    backgroundColor: p.color,
                    opacity: p.opacity,
                    transform: `rotate(${p.rotation}deg)`,
                    zIndex: p.z,
                    pointerEvents: 'none', // This is where the error was
                    position: 'absolute', // Ensure absolute positioning
                };

                if (p.shape === 'line') {
                    return (
                        <div
                            key={p.id}
                            className="rounded-full" // Rounded ends for a ribbon-like effect
                            style={{
                                ...commonStyle,
                                width: `${p.width}px`,
                                height: `${p.height}px`,
                            } as CSSProperties} // Type assertion here
                        />
                    );
                } else if (p.shape === 'star') {
                    return (
                        <div
                            key={p.id}
                            style={{
                                ...commonStyle,
                                fontSize: `${p.size}px`, // Use font-size for star character
                                color: p.color, // Color the star character
                                backgroundColor: 'transparent', // No background for the star div
                                display: 'flex', // Center the star character
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: `${p.size}px`, // Give it a bounding box
                                height: `${p.size}px`,
                            } as CSSProperties} // Type assertion here
                        >
                            &#9733; {/* Unicode star character */}
                        </div>
                    );
                } else { // 'square'
                    return (
                        <div
                            key={p.id}
                            className="rounded-full"
                            style={{
                                ...commonStyle,
                                width: `${p.size}px`,
                                height: `${p.size}px`,
                            } as CSSProperties} // Type assertion here
                        />
                    );
                }
            })}
        </div>
    );
};

export default Confetti;
