'use client';

import React, { useState } from 'react';
import { LuStar } from 'react-icons/lu';
import styles from './StarRating.module.scss';

interface StarRatingProps {
    disabled?: boolean;
    onChange: (rating: number) => void;
    size?: number;
    value: number;
}

export const StarRating: React.FC<StarRatingProps> = ({
    disabled = false,
    onChange,
    size = 28,
    value,
}) => {
    const [hoverValue, setHoverValue] = useState<number | null>(null);
    const displayValue = hoverValue ?? value;

    return (
        <div
            aria-label="Rating"
            className={styles.group}
            role="radiogroup"
        >
            {[1, 2, 3, 4, 5].map((star) => {
                const isActive = star <= displayValue;

                return (
                    <button
                        key={star}
                        aria-checked={value === star}
                        aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                        className={[
                            styles.button,
                            disabled ? styles.buttonDisabled : '',
                            isActive ? styles.buttonActive : '',
                        ].filter(Boolean).join(' ')}
                        disabled={disabled}
                        onClick={() => !disabled && onChange(star)}
                        onMouseEnter={() => !disabled && setHoverValue(star)}
                        onMouseLeave={() => setHoverValue(null)}
                        role="radio"
                        type="button"
                    >
                        <LuStar
                            fill={isActive ? 'currentColor' : 'none'}
                            size={size}
                            strokeWidth={2}
                        />
                    </button>
                );
            })}
        </div>
    );
};

export const StarDisplay: React.FC<{
    rating: number;
    size?: number;
}> = ({ rating, size = 16 }) => {
    return (
        <div aria-label={`${rating} star rating`} className={styles.display}>
            {[1, 2, 3, 4, 5].map((star) => {
                const isActive = star <= rating;

                return (
                    <LuStar
                        key={star}
                        className={isActive ? styles.displayActive : styles.displayInactive}
                        fill={isActive ? 'currentColor' : 'none'}
                        size={size}
                        strokeWidth={2}
                    />
                );
            })}
        </div>
    );
};

export default StarRating;
