import WebsiteLink from './WebsiteLink';

interface WebsiteButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost';
  className?: string;
  ariaLabel?: string;
}

export default function WebsiteButton({ href, children, variant = 'primary', className = '', ariaLabel }: WebsiteButtonProps) {
  return (
    <WebsiteLink
      href={href}
      aria-label={ariaLabel}
      className={`ws-btn ws-btn--${variant} ${className}`}
    >
      {children}
    </WebsiteLink>
  );
}
