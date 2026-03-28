interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  as?: 'h1' | 'h2' | 'h3';
  highlightedText?: string;
}

export default function SectionHeading({ title, subtitle, centered = true, as: Tag = 'h2', highlightedText }: SectionHeadingProps) {
  const headingClass = Tag === 'h1' ? 'ws-h1' : Tag === 'h2' ? 'ws-h2' : 'ws-h3';

  const renderTitle = () => {
    if (!highlightedText) return title;
    const parts = title.split(new RegExp(`(${highlightedText})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === highlightedText.toLowerCase()
        ? <span key={i} className="ws-highlight">{part}</span>
        : part
    );
  };

  return (
    <div className={centered ? 'text-center' : ''} style={{ maxWidth: 'var(--ws-max-w-text)', margin: centered ? '0 auto' : undefined }}>
      <Tag className={headingClass}>{renderTitle()}</Tag>
      {subtitle && (
        <p className="ws-body" style={{ marginTop: 'var(--ws-space-4)' }}>{subtitle}</p>
      )}
    </div>
  );
}
