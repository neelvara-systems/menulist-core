/**
 * TopicsGapsSection Component
 * Knowledge base performance: top questions and gaps
 */

import React from 'react';
import { Row, Col, Space, Typography } from 'antd';
import { TopQuestions, type TopQuestionsProps } from './TopQuestions';
import { KnowledgeGaps, type KnowledgeGapsProps } from './KnowledgeGaps';
import { RefreshButton } from './RefreshButton';
import { ExportButton } from './ExportButton';

const { Title } = Typography;

export interface TopicsGapsSectionProps {
  title?: string;
  topQuestionsData: TopQuestionsProps['data'];
  knowledgeGapsData: KnowledgeGapsProps['data'];
  loading?: boolean;
  onRefresh?: () => Promise<void>;
  onExport?: () => void;
  className?: string;
}

export const TopicsGapsSection: React.FC<TopicsGapsSectionProps> = ({
  title = 'Topics & Knowledge Gaps',
  topQuestionsData,
  knowledgeGapsData,
  loading = false,
  onRefresh,
  onExport,
  className,
}) => {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large" className={className}>
      {/* Header */}
      <Space
        style={{
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          {title}
        </Title>
        <Space>
          {onExport && (
            <ExportButton
              data={[...topQuestionsData, ...knowledgeGapsData]}
              filename="topics-and-gaps"
              formats={['csv', 'json']}
              loading={loading}
            />
          )}
          {onRefresh && <RefreshButton onRefresh={onRefresh} loading={loading} />}
        </Space>
      </Space>

      {/* Two Column Layout */}
      <Row gutter={[16, 16]}>
        {/* Top Questions */}
        <Col xs={24} lg={12}>
          <TopQuestions
            data={topQuestionsData}
            loading={loading}
            maxItems={10}
            showCategory={true}
          />
        </Col>

        {/* Knowledge Gaps */}
        <Col xs={24} lg={12}>
          <KnowledgeGaps
            data={knowledgeGapsData}
            loading={loading}
            maxItems={10}
            showExamples={true}
          />
        </Col>
      </Row>
    </Space>
  );
};

export default TopicsGapsSection;
