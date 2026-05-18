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
      className={`ws-caption${className ? ` ${className}` : ''}`}
      style={{
        marginTop: 'var(--ws-space-2)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--ws-space-2)',
      }}
    >
      <span aria-hidden="true" style={{ display: 'inline-flex', color: 'var(--ws-text-muted)' }}>
        <LuSmartphone size={14} />
      </span>
      <span>{text ?? t('mobileSupportLine')}</span>
    </p>
  );
}
