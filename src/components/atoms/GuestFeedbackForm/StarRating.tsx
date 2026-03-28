'use client';

/**
 * StarRating Component
 * 
 * Interactive 5-star rating input for guest feedback form.
 * Mobile-first design with large touch targets.
 * 
 * @see __docs__/projects/internal-feedback-system/
 */

import React, { useState } from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';

interface StarRatingProps {
    /** Current rating value (1-5) */
    value: number;
    /** Callback when rating changes */
    onChange: (rating: number) => void;
    /** Disable interaction */
    disabled?: boolean;
    /** Size of stars in pixels */
    size?: number;
}

/**
 * Interactive star rating component
 */
export const StarRating: React.FC<StarRatingProps> = ({
    value,
    onChange,
    disabled = false,
    size = 40,
}) => {
    const [hoverValue, setHoverValue] = useState<number | null>(null);

    const handleClick = (rating: number) => {
        if (disabled) return;
        onChange(rating);
    };

    const handleMouseEnter = (rating: number) => {
        if (disabled) return;
        setHoverValue(rating);
    };

    const handleMouseLeave = () => {
        setHoverValue(null);
    };

    const displayValue = hoverValue !== null ? hoverValue : value;

    return (
        <div 
            className="flex items-center gap-1"
            role="radiogroup"
            aria-label="Rating"
        >
            {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= displayValue;
                const isActive = star <= value;

                return (
                    <button
                        key={star}
                        type="button"
                        onClick={() => handleClick(star)}
                        onMouseEnter={() => handleMouseEnter(star)}
                        onMouseLeave={handleMouseLeave}
                        disabled={disabled}
                        className={`
                            transition-all duration-150 ease-in-out
                            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400
                            rounded-sm p-1
                            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}
                        `}
                        aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                        aria-checked={isActive}
                        role="radio"
                    >
                        {isFilled ? (
                            <FaStar 
                                size={size} 
                                className="text-yellow-400 drop-shadow-sm"
                            />
                        ) : (
                            <FaRegStar 
                                size={size} 
                                className="text-gray-300"
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
};

/**
 * Read-only star display (for inbox cards)
 */
export const StarDisplay: React.FC<{
    rating: number;
    size?: number;
}> = ({ rating, size = 16 }) => {
    return (
        <div className="flex items-center gap-0.5" aria-label={`${rating} star rating`}>
            {[1, 2, 3, 4, 5].map((star) => (
                <span key={star}>
                    {star <= rating ? (
                        <FaStar size={size} className="text-yellow-400" />
                    ) : (
                        <FaRegStar size={size} className="text-gray-300" />
                    )}
                </span>
            ))}
        </div>
    );
};

export default StarRating;
