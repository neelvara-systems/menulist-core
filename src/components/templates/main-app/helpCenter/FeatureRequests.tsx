import { Button, Card, Form, Input, List, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LuThumbsDown, LuThumbsUp } from 'react-icons/lu';

const { Text } = Typography;

const popularRequests = [
  'Clearer setup guides',
  'More integration options',
  'Better billing controls',
  'Easier data export and reports',
  'Faster issue status updates',
];

const toVotedRequests = (nextVotes: { [key: string]: boolean | null }) => (
  Object.entries(nextVotes)
    .filter(([, interested]) => interested !== null)
    .map(([feature, interested]) => ({ feature, interested: interested as boolean }))
);

const FeatureRequests = () => {
  const t = useTranslations('HelpCenter');
  const [votes, setVotes] = useState<{ [key: string]: boolean | null }>({});
  const form = Form.useFormInstance();

  const handleVote = (feature: string, interested: boolean | null) => {
    setVotes(prev => {
      const next = {
        ...prev,
        [feature]: prev[feature] === interested ? null : interested,
      };
      form.setFieldsValue({ votedPopularRequests: toVotedRequests(next) });
      return next;
    });
  };

  useEffect(() => {
    form.setFieldsValue({ votedPopularRequests: toVotedRequests(votes) });
  }, [votes, form]);

  return (
    <>
      <Form.Item
        label={t('featureRequestLabel')}
        name="featureRequest"
        rules={[{
          validator: async (_, value) => {
            const hasRequest = String(value || '').trim().length > 0;
            const hasVote = (form.getFieldValue('votedPopularRequests') || []).length > 0;
            if (hasRequest || hasVote) return;
            throw new Error(t('featureRequestRequired'));
          },
        }]}
      >
        <Input.TextArea
          rows={4}
          placeholder={t('featureRequestPlaceholder')}
        />
      </Form.Item>

      <Form.Item name="votedPopularRequests" hidden>
        <Input />
      </Form.Item>

      <Card size="small" title={t('voteOnPopularRequests')}>
        <List
          dataSource={popularRequests}
          renderItem={(item) => (
            <List.Item
              style={{ padding: '8px 0' }}
              actions={[
                <Button
                  key={`not-interested-${item}`}
                  type={votes[item] === false ? 'primary' : 'text'}
                  danger={votes[item] === false}
                  shape="circle"
                  ghost={votes[item] === false}
                  icon={<LuThumbsDown />}
                  onClick={() => handleVote(item, false)}
                />,
                <Button
                  key={`interested-${item}`}
                  type={votes[item] === true ? 'primary' : 'text'}
                  ghost={votes[item] === true}
                  shape="circle"
                  icon={<LuThumbsUp />}
                  onClick={() => handleVote(item, true)}
                />,
              ]}
            >
              <Text>{item}</Text>
            </List.Item>
          )}
          size="small"
        />
      </Card>
    </>
  );
};

export default FeatureRequests;
