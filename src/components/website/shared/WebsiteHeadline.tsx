import type { CSSProperties, ReactNode } from 'react';

type HeadlineTag = 'h1' | 'h2' | 'h3';
type HeadlineSize = 'hero' | 'section' | 'compact';

type HeadlinePart = {
  text: string;
  highlight?: boolean;
};

type HeadlineStyle = CSSProperties & {
  '--ws-headline-size'?: string;
};

interface WebsiteHeadlineProps {
  as?: HeadlineTag;
  size?: HeadlineSize;
  text?: string;
  highlightedText?: string;
  parts?: HeadlinePart[];
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  fontSize?: string;
  ariaLabel?: string;
}

const legacyClassByTag: Record<HeadlineTag, string> = {
  h1: 'ws-h1',
  h2: 'ws-h2',
  h3: 'ws-h3',
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderHighlightedText(text: string, highlightedText?: string) {
  if (!highlightedText) return text;

  const parts = text.split(new RegExp(`(${escapeRegExp(highlightedText)})`, 'gi'));
  return parts.map((part, index) =>
    part.toLowerCase() === highlightedText.toLowerCase()
      ? <span key={`${part}-${index}`} className="ws-headline__highlight">{part}</span>
      : part
  );
}

function renderParts(parts: HeadlinePart[]) {
  return parts.map((part, index) =>
    part.highlight
      ? <span key={`${part.text}-${index}`} className="ws-headline__highlight">{part.text}</span>
      : part.text
  );
}

export default function WebsiteHeadline({
  as: Tag = 'h2',
  size,
  text,
  highlightedText,
  parts,
  children,
  className,
  style,
  fontSize,
  ariaLabel,
}: WebsiteHeadlineProps) {
  const resolvedSize = size || (Tag === 'h1' ? 'hero' : Tag === 'h3' ? 'compact' : 'section');
  const classes = [
    'ws-headline',
    legacyClassByTag[Tag],
    `ws-headline--${resolvedSize}`,
    fontSize ? 'ws-headline--custom' : '',
    className || '',
  ].filter(Boolean).join(' ');
  const headlineStyle: HeadlineStyle = { ...style };

  if (fontSize) {
    headlineStyle['--ws-headline-size'] = fontSize;
  }

  return (
    <Tag className={classes} style={headlineStyle} aria-label={ariaLabel}>
      {parts ? renderParts(parts) : text ? renderHighlightedText(text, highlightedText) : children}
    </Tag>
  );
}
