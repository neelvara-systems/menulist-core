'use client';

import { useTranslations } from 'next-intl';
import { LuSmartphone } from 'react-icons/lu';

interface WebsiteMobileSupportHintProps {
  text?: string;
  className?: string;
}

export default function WebsiteMobileSupportHint({
  text,
  className,
}: WebsiteMobileSupportHintProps) {
  const t = useTranslations('Website');

  return (
    <p
      className={`ws-support-hint ws-support-hint--mobile${className ? ` ${className}` : ''}`}
    >
      <span aria-hidden="true" className="ws-support-hint__icon">
        <LuSmartphone size={14} />
      </span>
      <span className="ws-support-hint__text">{text ?? t('mobileSupportLine')}</span>
    </p>
  );
}
