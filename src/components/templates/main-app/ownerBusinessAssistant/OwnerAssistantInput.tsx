import { Button, Input, Space } from 'antd';
import { useState } from 'react';
import { LuSend } from 'react-icons/lu';

export function OwnerAssistantInput({ onAsk, loading, disabled }: {
  onAsk: (question: string) => void;
  loading?: boolean;
  disabled?: boolean;
}) {
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
        placeholder={disabled ? 'Available after the latest check' : 'Ask about today, this week, menu attention, or next checks'}
        disabled={disabled}
        maxLength={800}
      />
      <Button type="primary" icon={<LuSend />} onClick={submit} loading={loading} disabled={disabled} />
    </Space.Compact>
  );
}
