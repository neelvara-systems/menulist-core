interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'accent';
  id?: string;
}

export default function SectionWrapper({ children, className = '', variant = 'default', id }: SectionWrapperProps) {
  const variantClass = variant === 'subtle' ? 'ws-section--subtle' : variant === 'accent' ? 'ws-section--accent' : '';

  return (
    <section id={id} className={`ws-section ${variantClass} ${className}`}>
      <div className="ws-container">
        {children}
      </div>
    </section>
  );
}
