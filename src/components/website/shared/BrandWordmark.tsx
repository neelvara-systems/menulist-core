'use client';

import type { CSSProperties } from 'react';
import LogoMark from './LogoMark';

export const BRAND_DISPLAY_NAME = 'MenuList AI';

interface BrandWordmarkProps {
  showLogo?: boolean;
  showText?: boolean;
  iconHeight?: number;
  className?: string;
  logoClassName?: string;
  textClassName?: string;
  style?: CSSProperties;
  textStyle?: CSSProperties;
  ariaLabel?: string;
}

export default function BrandWordmark({
  showLogo = true,
  showText = true,
  iconHeight = 26,
  className,
  logoClassName,
  textClassName,
  style,
  textStyle,
  ariaLabel = BRAND_DISPLAY_NAME,
}: BrandWordmarkProps) {
  return (
    <span className={className} style={style} aria-label={ariaLabel}>
      {showLogo ? <LogoMark height={iconHeight} className={logoClassName} /> : null}
      {showText ? (
        <span className={textClassName} style={textStyle}>
          {BRAND_DISPLAY_NAME}
        </span>
      ) : null}
    </span>
  );
}
