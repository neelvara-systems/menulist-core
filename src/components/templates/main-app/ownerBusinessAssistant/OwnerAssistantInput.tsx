import { Button, Input, Space } from 'antd';
import { useState } from 'react';
import { LuSend } from 'react-icons/lu';
import { useTranslations } from 'next-intl';

export function OwnerAssistantInput({ onAsk, loading, disabled }: {
  onAsk: (question: string) => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations('Dashboard.owner');
  const [value, setValue] = useState('');

  const submit = () => {
    const question = value.trim();
    if (!question) return;
    onAsk(question);
    setValue('');
  };

  return (
    <Space.Compact style={{ width: '100%' }}>
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onPressEnter={submit}
        placeholder={disabled
          ? t('businessHealth.assistant.placeholderPending')
          : t('businessHealth.assistant.placeholderReady')}
        disabled={disabled}
        maxLength={800}
      />
      <Button
        aria-label={t('businessHealth.assistant.send')}
        title={t('businessHealth.assistant.send')}
        type="primary"
        icon={<LuSend />}
        onClick={submit}
        loading={loading}
        disabled={disabled}
      />
    </Space.Compact>
  );
}
