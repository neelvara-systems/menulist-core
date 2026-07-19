import { Button, Card, Form, Input, List, Typography } from 'antd';
import {
  ANSWERLATTICE_FEEDBACK_POPULAR_REQUESTS,
  ANSWERLATTICE_FEEDBACK_TEXT_MAX_LENGTH,
} from '@lib/answerlattice/feedbackBoundary';
import { useTranslations } from 'next-intl';
import { LuThumbsDown, LuThumbsUp } from 'react-icons/lu';

const { Text } = Typography;

const popularRequests = [...ANSWERLATTICE_FEEDBACK_POPULAR_REQUESTS];

const toVotedRequests = (nextVotes: { [key: string]: boolean | null }) => (
  Object.entries(nextVotes)
    .filter(([, interested]) => interested !== null)
    .map(([feature, interested]) => ({ feature, interested: interested as boolean }))
);

const FeatureRequests = () => {
  const t = useTranslations('HelpCenter');
  const form = Form.useFormInstance();
  const watchedVotes = Form.useWatch('votedPopularRequests', form);
  const votes = (Array.isArray(watchedVotes) ? watchedVotes : []).reduce<Record<string, boolean>>(
    (result, vote) => {
      if (vote && typeof vote === 'object' && typeof vote.feature === 'string' && typeof vote.interested === 'boolean') {
        result[vote.feature] = vote.interested;
      }
      return result;
    },
    {},
  );

  const handleVote = (feature: string, interested: boolean | null) => {
    const next = {
      ...votes,
      [feature]: votes[feature] === interested ? null : interested,
    };
    form.setFieldsValue({ votedPopularRequests: toVotedRequests(next) });
  };

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
          maxLength={ANSWERLATTICE_FEEDBACK_TEXT_MAX_LENGTH}
          showCount
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
                  aria-label={`Not interested: ${item}`}
                  title={`Not interested: ${item}`}
                  style={{ minWidth: 44, width: 44, height: 44 }}
                />,
                <Button
                  key={`interested-${item}`}
                  type={votes[item] === true ? 'primary' : 'text'}
                  ghost={votes[item] === true}
                  shape="circle"
                  icon={<LuThumbsUp />}
                  onClick={() => handleVote(item, true)}
                  aria-label={`Interested: ${item}`}
                  title={`Interested: ${item}`}
                  style={{ minWidth: 44, width: 44, height: 44 }}
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
