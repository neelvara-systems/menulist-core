'use client';

import { useTranslations } from 'next-intl';
import { LuShieldCheck } from 'react-icons/lu';

interface WebsiteOwnerApprovalHintProps {
  text?: string;
  className?: string;
}

export default function WebsiteOwnerApprovalHint({
  text,
  className,
}: WebsiteOwnerApprovalHintProps) {
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
      <span aria-hidden="true" style={{ display: 'inline-flex', color: 'var(--ws-brand-secondary)', opacity: 0.95 }}>
        <LuShieldCheck size={14} />
      </span>
      <span>{text ?? t('ownerApprovalLine')}</span>
    </p>
  );
}
