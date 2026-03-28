import Link from 'next/link';

interface WebsiteButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost';
  className?: string;
}

export default function WebsiteButton({ href, children, variant = 'primary', className = '' }: WebsiteButtonProps) {
  return (
    <Link
      href={href}
      className={`ws-btn ws-btn--${variant} ${className}`}
    >
      {children}
    </Link>
  );
}
