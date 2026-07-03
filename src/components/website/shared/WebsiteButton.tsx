import WebsiteLink from './WebsiteLink';

interface WebsiteButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost';
  className?: string;
  ariaLabel?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

export default function WebsiteButton({ href, children, variant = 'primary', className = '', ariaLabel, onClick }: WebsiteButtonProps) {
  return (
    <WebsiteLink
      href={href}
      aria-label={ariaLabel}
      className={`ws-btn ws-btn--${variant} ${className}`}
      onClick={onClick}
    >
      {children}
    </WebsiteLink>
  );
}
