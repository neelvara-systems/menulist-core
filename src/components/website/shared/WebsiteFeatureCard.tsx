import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';

interface WebsiteFeatureCardProps {
  icon: IconType;
  title: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
}

export default function WebsiteFeatureCard({
  icon: Icon,
  title,
  subtitle,
  description,
  footer,
  children,
  className = '',
  compact = false,
}: WebsiteFeatureCardProps) {
  return (
    <div className={`ws-card ws-feature-card ${compact ? 'ws-feature-card--compact' : ''} ${className}`}>
      <div className="ws-feature-card__header">
        <div className="ws-feature-card__heading">
          <h3 className="ws-feature-card__title">{title}</h3>
          {subtitle ? <p className="ws-feature-card__subtitle">{subtitle}</p> : null}
        </div>
        <div className="ws-feature-card__icon" aria-hidden="true">
          <Icon size={compact ? 20 : 22} />
        </div>
      </div>

      {description ? <p className="ws-feature-card__description">{description}</p> : null}
      {children ? <div className="ws-feature-card__body">{children}</div> : null}

      {footer ? <p className="ws-feature-card__footer">{footer}</p> : null}
    </div>
  );
}
