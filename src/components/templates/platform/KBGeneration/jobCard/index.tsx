import { LoadingOutlined } from '@ant-design/icons';
import DateTimeDisplay from '@atoms/DateTimeDisplay';
import KbSourceFile from '@atoms/KbSourceFile';
import { assertIngestionJobDeleteSucceeded, assertIngestionJobWriteSucceeded, cancelJob, deleteIngestionJob, retryJob } from '@database/kb-generation/jobs';
import { useAppDispatch } from '@hook/useAppDispatch';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { getIngestionJobStatusData, INGESTION_JOB_STATUS, IngestionJob } from '@type/knowledgeBase';
import { Alert, Button, Card, Col, Descriptions, Flex, message, Popconfirm, Row, Spin, Steps, theme, Typography } from 'antd';
import React from 'react';
import { LuBan, LuFileQuestion, LuRefreshCw, LuTrash } from 'react-icons/lu';
import JobProcessingProgress from './JobProcessingProgress';
import JobPublishingProgress from './JobPublishingProgress';
import JobStatusTag from './jobStatusTag';

const { Text, Title } = Typography;

interface JobCardProps {
  job: IngestionJob;
  onReviewClick: () => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onReviewClick }) => {
  let { id, status, createdOn, modifiedOn, sourceFiles, categories, articlesEmbeddedCount, articlesToEmbedCount } = job;

  const totalCategoriesCount = categories ? Object.keys(categories).length : 0;
  const totalSectionsCount = categories ? Object.values(categories).reduce((acc, cat) => acc + (cat.sections?.length || 0), 0) : 0;
  const totalArticlesCount = categories
    ? Object.values(categories).reduce((acc, cat) => {
      const categoryArticles = cat.articles?.length || 0;
      const sectionArticles = cat.sections?.reduce((sectionAcc, section) => sectionAcc + (section.articles?.length || 0), 0) || 0;
      return acc + categoryArticles + sectionArticles;
    }, 0)
    : 0;

  const dispatch = useAppDispatch();
  const { token } = theme.useToken();

  const handleSourceOpen = (sourceUrl: string, fileName: string, fileType: string) => {
    try {
      const opened = window.open(sourceUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        throw new Error('answerlattice_kb_source_open_blocked');
      }
    } catch (error) {
      logRuntimeFailure('answerlattice_kb_source_open_failed', error, {
        surface: 'kb_generation_job_card',
        ...getBoundedRuntimeStringContext('jobId', id),
        ...getBoundedRuntimeStringContext('sourceUrl', sourceUrl),
        ...getBoundedRuntimeStringContext('sourceName', fileName),
        ...getBoundedRuntimeStringContext('sourceType', fileType),
      });
      message.error('Unable to open source');
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(startLoader('Deleting job...'));
    try {
      const result = await deleteIngestionJob(id);
      assertIngestionJobDeleteSucceeded(result, id, 'kb_generation_job_card_delete_rejected');
      message.success('Job deleted successfully');
    } catch (error) {
      message.error('Failed to delete job');
    } finally {
      dispatch(stopLoader('Deleting job...'));
    }
  };

  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(startLoader('Retrying job...'));
    try {
      const result = await retryJob(id);
      assertIngestionJobWriteSucceeded(result, id, 'kb_generation_job_card_retry_rejected');
      message.success('Job retry initiated');
    } catch (error) {
      message.error('Failed to retry job');
    } finally {
      dispatch(stopLoader('Retrying job...'));
    }
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(startLoader('Cancelling job...'));
    try {
      const result = await cancelJob(id);
      assertIngestionJobWriteSucceeded(result, id, 'kb_generation_job_card_cancel_rejected');
      message.success('Job cancelled');
    } catch (error) {
      message.error('Failed to cancel job');
    } finally {
      dispatch(stopLoader('Cancelling job...'));
    }
  };

  const statusOptions = getIngestionJobStatusData(token);
  const statusConfig = statusOptions[status] || {
    title: 'Job status unavailable',
    color: 'default',
    icon: LuFileQuestion,
    label: 'Unknown',
    gradient: `linear-gradient(135deg, ${token.colorBgBase} 0%, ${token.colorBgBase} 100%)`,
  };
  const jobCardStyle: React.CSSProperties = { background: statusConfig.gradient, width: '100%', borderRadius: 28, };

  const stepItems = [
    { key: INGESTION_JOB_STATUS.PENDING, title: 'Created' },
    { key: INGESTION_JOB_STATUS.PROCESSING, title: 'Processing' },
    { key: INGESTION_JOB_STATUS.NEEDS_REVIEW, title: 'Review' },
    { key: INGESTION_JOB_STATUS.PUBLISHING, title: 'Publishing' },
    { key: INGESTION_JOB_STATUS.PUBLISHED, title: 'Published' },
  ];
  const currentIndex = Math.max(0, (stepItems).findIndex(item => item.key === status));

  return (
    <Card hoverable style={jobCardStyle} onClick={status === INGESTION_JOB_STATUS.NEEDS_REVIEW ? onReviewClick : undefined}>
      <Flex vertical>

        <Flex justify='flex-start' align='center' gap={16} style={{ marginBottom: 16 }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          <Title level={4} style={{ margin: 0 }}>{statusConfig.title}</Title>
          <JobStatusTag status={status} />
        </Flex>

        {status === INGESTION_JOB_STATUS.PROCESSING && totalArticlesCount > 0 && (
          <JobProcessingProgress job={job} totalArticlesCount={articlesToEmbedCount} status={status} />
        )}

        {status === INGESTION_JOB_STATUS.PUBLISHING && articlesToEmbedCount && articlesToEmbedCount > 0 && (
          <JobPublishingProgress status={status} articlesToEmbedCount={articlesToEmbedCount} articlesEmbeddedCount={articlesEmbeddedCount} />
        )}

        <Flex gap={16}>
          <Flex gap={8}>
            <Text type="secondary">Started On</Text>
            <DateTimeDisplay value={createdOn} mode="datetime" />
          </Flex>
          <Flex gap={8}>
            <Text type="secondary">Last Modified On</Text>
            <DateTimeDisplay value={modifiedOn} mode="datetime" />
          </Flex>
        </Flex>

        <Flex style={{ margin: "54px 0" }}>
          {status === INGESTION_JOB_STATUS.FAILED || status === INGESTION_JOB_STATUS.CANCELLED ? (
            <Alert
              style={{ width: "100%" }}
              message={status === INGESTION_JOB_STATUS.FAILED ? "Job Failed" : "Job Cancelled"}
              description={status === INGESTION_JOB_STATUS.FAILED ? "Something went wrong during the job." : "The job was cancelled by a user."}
              type={status === INGESTION_JOB_STATUS.FAILED ? "error" : "warning"}
              showIcon
            />
          ) : (
            <Steps size="small" current={currentIndex} items={stepItems} />
          )}
        </Flex>

        {status !== INGESTION_JOB_STATUS.FAILED && status !== INGESTION_JOB_STATUS.CANCELLED && <Row gutter={24}>

          {/* Col 1: Output Stats */}
          <Col span={9}>
            <Card style={{ background: 'transparent', borderRadius: 8 }} >
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="Source Files"><Title level={4} style={{ marginLeft: "auto" }}>{sourceFiles.length}</Title></Descriptions.Item>
                <Descriptions.Item label="Articles Generated"><Title level={4} style={{ marginLeft: "auto" }}>{totalArticlesCount}</Title></Descriptions.Item>
                <Descriptions.Item label="Categories Proposed"><Title level={4} style={{ marginLeft: "auto" }}>{totalCategoriesCount}</Title></Descriptions.Item>
                <Descriptions.Item label="Sections Proposed"><Title level={4} style={{ marginLeft: "auto" }}>{totalSectionsCount}</Title></Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* Col 3: Source Files */}
          <Col span={15}>
            <Title level={5} style={{ margin: '0 0 8px 0' }}>Source Files</Title>
            <Row gutter={[8, 8]}>
              {sourceFiles.map((file) => (
                <Col span={12} key={file.fileName}>
                  <Card style={{ background: 'transparent', borderRadius: 8 }} styles={{ body: { padding: 5 } }}>
                    <KbSourceFile
                      file={{ ...file, name: file.fileName }}
                      onClickSource={(url) => handleSourceOpen(url, file.fileName, file.type)}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>

        </Row>}

        <Flex gap={8} style={{ width: '100%' }} justify='flex-end'>
          <Popconfirm
            key="delete"
            title="Delete the job"
            description="Are you sure you want to delete this job and all its articles? This action cannot be undone."
            onConfirm={handleDelete}
            okText="Yes"
            cancelText="No"
          >
            <Button danger type='text' icon={<LuTrash />} onClick={(e) => e.stopPropagation()} >Delete Job</Button>
          </Popconfirm>
          {status === INGESTION_JOB_STATUS.FAILED && (
            <Popconfirm title="Retry this job?" description="The job will be reprocessed from the same source files." onConfirm={handleRetry} okText="Retry">
              <Button type='default' icon={<LuRefreshCw />} onClick={(e) => e.stopPropagation()}>Retry Job</Button>
            </Popconfirm>
          )}
          {(status === INGESTION_JOB_STATUS.PENDING || status === INGESTION_JOB_STATUS.PROCESSING) && (
            <Popconfirm title="Cancel this job?" onConfirm={handleCancel} okText="Cancel Job" okButtonProps={{ danger: true }}>
              <Button type='text' icon={<LuBan />} onClick={(e) => e.stopPropagation()}>Cancel</Button>
            </Popconfirm>
          )}
          {status === INGESTION_JOB_STATUS.NEEDS_REVIEW && (<Button type="primary" onClick={onReviewClick} icon={<LuFileQuestion />} >Review Job</Button>)}
        </Flex>
      </Flex>
    </Card>
  );
};

export default JobCard;
