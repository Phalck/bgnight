'use client';

import { useState } from 'react';
import styles from './StarRating.module.css';

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function StarRating({ value, onChange, readOnly = false, size = 'medium' }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);
  
  const stars = [1, 2, 3, 4, 5];
  
  const handleClick = (rating: number) => {
    if (readOnly || !onChange) return;
    onChange(rating);
  };
  
  const handleMouseEnter = (rating: number) => {
    if (readOnly) return;
    setHoverValue(rating);
  };
  
  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverValue(0);
  };
  
  const displayValue = hoverValue || value;
  
  const sizeClass = styles[size];
  
  return (
    <div 
      className={`${styles.container} ${readOnly ? styles.readOnly : ''} ${sizeClass}`}
      onMouseLeave={handleMouseLeave}
    >
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          className={`${styles.star} ${star <= displayValue ? styles.filled : styles.empty}`}
          onClick={() => handleClick(star)}
          onMouseEnter={() => handleMouseEnter(star)}
          disabled={readOnly}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
