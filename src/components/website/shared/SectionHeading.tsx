import WebsiteHeadline from './WebsiteHeadline';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  as?: 'h1' | 'h2' | 'h3';
  highlightedText?: string | string[];
  fontSize?: string;
}

export default function SectionHeading({ title, subtitle, centered = true, as: Tag = 'h2', highlightedText, fontSize }: SectionHeadingProps) {
  return (
    <div className={centered ? 'text-center' : ''} style={{ maxWidth: 'var(--ws-max-w-text)', margin: centered ? '0 auto' : undefined }}>
      <WebsiteHeadline as={Tag} text={title} highlightedText={highlightedText} fontSize={fontSize} />
      {subtitle && (
        <p className="ws-body" style={{ marginTop: 'var(--ws-space-4)' }}>{subtitle}</p>
      )}
    </div>
  );
}
