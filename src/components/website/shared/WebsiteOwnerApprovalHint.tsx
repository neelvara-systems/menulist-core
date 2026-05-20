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
      className={`ws-support-hint ws-support-hint--approval${className ? ` ${className}` : ''}`}
    >
      <span aria-hidden="true" className="ws-support-hint__icon">
        <LuShieldCheck size={14} />
      </span>
      <span className="ws-support-hint__text">{text ?? t('ownerApprovalLine')}</span>
    </p>
  );
}
