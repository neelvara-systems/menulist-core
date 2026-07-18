import { BATCH_IMAGE_GENERATION_JOB_STATUS, type BatchImageGenerationJobStatusType } from '@constant/AI';
import { assertImageBatchJobUpdateSucceeded, updateImageBatchProcessingJob } from '@database/imageBatchProcessing';
import useDeviceType from '@hook/useDeviceType';
import { useAppDispatch } from '@hook/useAppDispatch';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { mergeImageBatchSelectionState } from '@lib/ai/imageBatchClientBoundary';
import {
    normalizeImageBatchProjectSelections,
    type ImageBatchProjectSelection,
} from '@lib/ai/imageBatchProjectSelection';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { BatchImageGenerationJobType, Project } from '@template/main-app/projects/types';
import { getISOStringDate, toDate, type DateLike } from '@util/dateTime';
import { useDateFormatters } from '@util/formatters';
import { Alert, Button, Card, Checkbox, Divider, Flex, Image, message, Modal, Result, Spin, Tag, theme, Typography } from 'antd';
import { FC, Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { LuAlertCircle, LuCheck, LuEye, LuLoader, LuRefreshCcw, LuTrash, LuUploadCloud, LuX } from 'react-icons/lu';
import styles from './BatchImageGenerationResultView.module.scss';

const { Text, Title } = Typography;

const IMAGE_BATCH_RESULT_CANCEL_FAILED = 'image_batch_result_cancel_failed';
const IMAGE_BATCH_RESULT_UPLOAD_FAILED = 'image_batch_result_upload_failed';
const IMAGE_BATCH_RESULT_DISCARD_FAILED = 'image_batch_result_discard_failed';
const IMAGE_BATCH_RESULT_RETRY_FAILED = 'image_batch_result_retry_failed';
const IMAGE_BATCH_JOB_FAILED_OWNER_COPY = 'Image generation could not finish. Try again with fewer items or start a new batch.';

interface BatchImageGenerationResultViewProps {
    activeBatchImageJob: BatchImageGenerationJobType;
    projectData: Project;
    onBatchImagesPersist: (selections: ImageBatchProjectSelection[]) => Promise<void>;
    onComplete: () => void;
    onRetry: (failedJob: BatchImageGenerationJobType) => Promise<void>;
}

const BatchImageGenerationResultView: FC<BatchImageGenerationResultViewProps> = ({ activeBatchImageJob: initialActiveBatchImageJob, projectData, onBatchImagesPersist, onComplete, onRetry }) => {
    const [isDiscardModalVisible, setIsDiscardModalVisible] = useState(false);
    const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
    const { token } = theme.useToken();
    const { isMobile } = useDeviceType();
    const dispatch = useAppDispatch()
    const { formatTimeOnly } = useDateFormatters()
    const [activeJobData, setActiveJobData] = useState<BatchImageGenerationJobType | null>(null);
    const ownerActionInFlightRef = useRef(false);
    const beginOwnerAction = (): boolean => {
        if (ownerActionInFlightRef.current) {
            message.info('This batch action is already in progress.');
            return false;
        }
        ownerActionInFlightRef.current = true;
        return true;
    };
    const formatJobTime = (value: unknown, fallback = 'N/A') => {
        const date = toDate(value as DateLike);
        return Number.isNaN(date.getTime()) ? fallback : formatTimeOnly(date);
    };

    const totalGeneratedImages = useMemo(() => {
        if (!activeJobData?.itemsList) return 0;
        return activeJobData.itemsList.reduce((acc, item) => acc + (item.images?.length || 0), 0);
    }, [activeJobData]);

    const totalSelectedImages = useMemo(() => {
        if (!activeJobData?.itemsList) return 0;
        return activeJobData.itemsList.reduce((acc, item) => {
            return acc + (item.images?.filter(img => img.isSelected).length || 0);
        }, 0);
    }, [activeJobData]);

    const getBatchResultLogContext = (
        action: string,
        targetStatus?: BatchImageGenerationJobStatusType,
    ) => ({
        action,
        currentStatus: activeJobData?.status,
        targetStatus,
        itemCount: activeJobData?.itemsList?.length || 0,
        generatedImageCount: totalGeneratedImages,
        selectedImageCount: totalSelectedImages,
        ...getBoundedRuntimeStringContext('jobId', activeJobData?.id),
        ...getBoundedRuntimeStringContext('projectId', activeJobData?.projectId || projectData?.projectId),
    });

    const handleSelectAllImages = (selectAll: boolean) => {
        if (!activeJobData) return;
        const updatedJobData = {
            ...activeJobData,
            itemsList: activeJobData.itemsList.map(item => ({
                ...item,
                images: item.images.map(img => ({ ...img, isSelected: selectAll }))
            }))
        };
        setActiveJobData(updatedJobData);
    };

    useEffect(() => {
        if (initialActiveBatchImageJob) {
            setActiveJobData((previousJob) => (
                mergeImageBatchSelectionState(previousJob, initialActiveBatchImageJob)
            ));
        }
    }, [initialActiveBatchImageJob]);

    const handleImageSelect = (itemIndex: number, imageIndex: number) => {
        setActiveJobData(prevJobData => {
            if (!prevJobData) return null;
            const updatedItemsList = prevJobData.itemsList.map((item, i) => {
                if (i === itemIndex) {
                    const updatedImages = item.images.map((img, j) => {
                        if (j === imageIndex) {
                            return { ...img, isSelected: !img.isSelected };
                        }
                        return img;
                    });
                    return { ...item, images: updatedImages };
                }
                return item;
            });
            return { ...prevJobData, itemsList: updatedItemsList };
        });
    };

    const uploadImages = async (): Promise<void> => {
        const rawSelections = (activeJobData?.itemsList || [])
            .map((item) => ({
                itemId: item.id,
                images: item.images.filter((image) => image.isSelected),
            }))
            .filter((selection) => selection.images.length > 0);
        const selections = normalizeImageBatchProjectSelections(rawSelections, projectData.projectId);
        if (!selections) throw new Error('image_batch_result_selected_image_invalid');
        await onBatchImagesPersist(selections);
    };

    const handleCancelJob = async (action: "cancel" | "upload") => {
        if (!beginOwnerAction()) return;
        dispatch(startLoader("cancelling batch job"))
        try {
            if (!activeJobData) throw new Error('image_batch_result_job_missing');
            if (Boolean(activeJobData?.itemsList?.length)) {
                if (action === "upload") {
                    await uploadImages();
                }
            }
            const cancelResult = await updateImageBatchProcessingJob({
                id: activeJobData.id,
                status: BATCH_IMAGE_GENERATION_JOB_STATUS.CANCELLED,
                selectedImagesPersisted: action === "upload",
                statusHistory: [
                    ...activeJobData.statusHistory,
                    {
                        status: BATCH_IMAGE_GENERATION_JOB_STATUS.CANCELLED,
                        reason: action === "upload" ? "User Cancelled with upload" : "User Cancelled",
                        createdOn: getISOStringDate(),
                    },
                ],
            }, activeJobData.projectId);
            assertImageBatchJobUpdateSucceeded(
                cancelResult,
                activeJobData.id,
                BATCH_IMAGE_GENERATION_JOB_STATUS.CANCELLED,
                'image_batch_result_cancel_update_rejected',
            );
            message.success('Batch job cancelled successfully');
            onComplete()
        } catch (error) {
            logRuntimeFailure(IMAGE_BATCH_RESULT_CANCEL_FAILED, error, getBatchResultLogContext(action, BATCH_IMAGE_GENERATION_JOB_STATUS.CANCELLED));
            message.error('Failed to cancel batch job');
        } finally {
            ownerActionInFlightRef.current = false;
            dispatch(stopLoader("cancelling batch job"))
        }
    };

    const onUploadGeneratedImages = async () => {
        if (!beginOwnerAction()) return;
        dispatch(startLoader("associating image"))

        try {
            if (!activeJobData) throw new Error('image_batch_result_job_missing');
            await uploadImages();
            const uploadResult = await updateImageBatchProcessingJob({
                id: activeJobData.id,
                status: BATCH_IMAGE_GENERATION_JOB_STATUS.FINISHED,
                selectedImagesPersisted: true,
                statusHistory: [
                    ...activeJobData.statusHistory,
                    {
                        status: BATCH_IMAGE_GENERATION_JOB_STATUS.FINISHED,
                        reason: "User Uploaded",
                        createdOn: getISOStringDate(),
                    },
                ],
            }, activeJobData.projectId);
            assertImageBatchJobUpdateSucceeded(
                uploadResult,
                activeJobData.id,
                BATCH_IMAGE_GENERATION_JOB_STATUS.FINISHED,
                'image_batch_result_upload_update_rejected',
            );
            message.success('Images uploaded successfully');
            onComplete()
        } catch (error: unknown) {
            logRuntimeFailure(IMAGE_BATCH_RESULT_UPLOAD_FAILED, error, getBatchResultLogContext('upload', BATCH_IMAGE_GENERATION_JOB_STATUS.FINISHED));
            message.error('Failed to update batch job status');
        } finally {
            ownerActionInFlightRef.current = false;
            dispatch(stopLoader("associating image"))
        }
    }

    const onDiscardGeneratedImages = async () => {
        if (!beginOwnerAction()) return;
        try {
            dispatch(startLoader("discarding image batch job"))
            if (!activeJobData) throw new Error('image_batch_result_job_missing');
            const discardResult = await updateImageBatchProcessingJob({
                id: activeJobData.id,
                status: BATCH_IMAGE_GENERATION_JOB_STATUS.DISCARDED,
                selectedImagesPersisted: false,
                statusHistory: [
                    ...activeJobData.statusHistory,
                    {
                        status: BATCH_IMAGE_GENERATION_JOB_STATUS.DISCARDED,
                        reason: "User Discarded",
                        createdOn: getISOStringDate(),
                    },
                ],
            }, activeJobData.projectId);
            assertImageBatchJobUpdateSucceeded(
                discardResult,
                activeJobData.id,
                BATCH_IMAGE_GENERATION_JOB_STATUS.DISCARDED,
                'image_batch_result_discard_update_rejected',
            );
            message.success('Batch closed without adding images');
            setIsDiscardModalVisible(false);
            onComplete()
        } catch (error: unknown) {
            logRuntimeFailure(IMAGE_BATCH_RESULT_DISCARD_FAILED, error, getBatchResultLogContext('discard', BATCH_IMAGE_GENERATION_JOB_STATUS.DISCARDED));
            message.error('Failed to update batch job status');
        } finally {
            ownerActionInFlightRef.current = false;
            dispatch(stopLoader("discarding image batch job"))
        }
    }

    const onRetryJob = async () => {
        if (!beginOwnerAction()) return;
        let retryHandoffStarted = false;
        try {
            dispatch(startLoader("retrying image batch job"))
            if (!activeJobData) throw new Error('image_batch_result_job_missing');
            const hasSelectedImages = activeJobData.itemsList.some((item) => item.images.some((image) => image.isSelected));
            if (hasSelectedImages) await uploadImages();
            const resolvedStatus = hasSelectedImages
                ? BATCH_IMAGE_GENERATION_JOB_STATUS.FINISHED
                : BATCH_IMAGE_GENERATION_JOB_STATUS.DISCARDED;
            const resolvedResult = await updateImageBatchProcessingJob({
                id: activeJobData.id,
                selectedImagesPersisted: hasSelectedImages,
                status: resolvedStatus,
                statusHistory: [
                    ...activeJobData.statusHistory,
                    {
                        createdOn: getISOStringDate(),
                        reason: hasSelectedImages
                            ? 'Saved available images before retry'
                            : 'Closed failed job before retry',
                        status: resolvedStatus,
                    },
                ],
            }, activeJobData.projectId);
            assertImageBatchJobUpdateSucceeded(
                resolvedResult,
                activeJobData.id,
                resolvedStatus,
                'image_batch_result_retry_resolution_rejected',
            );
            retryHandoffStarted = true;
            await onRetry(activeJobData);
        } catch (error: unknown) {
            logRuntimeFailure(IMAGE_BATCH_RESULT_RETRY_FAILED, error, getBatchResultLogContext('retry', BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED));
            if (!retryHandoffStarted) {
                message.error('Could not prepare this retry. Your available images were not removed.');
            }
        } finally {
            ownerActionInFlightRef.current = false;
            dispatch(stopLoader("retrying image batch job"))
        }
    }

    //'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'finished' | 'discarded';

    const renderJobStatus = () => {
        switch (activeJobData?.status) {
            case BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED:
                return (
                    <Tag color="processing">
                        Queued
                        <LuLoader color={token.colorInfo} />
                    </Tag>
                );
            case BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING:
                return (
                    <Tag color="processing">
                        Generating images...
                        <LuLoader color={token.colorInfo} />
                    </Tag>
                );
            case BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED:
                return (
                    <Tag color="success">
                        Completed
                        <LuCheck color={token.colorSuccess} />
                    </Tag>
                );
            case BATCH_IMAGE_GENERATION_JOB_STATUS.CANCELLED:
                return (
                    <Tag color="error">
                        Cancelled
                        <LuX color={token.colorError} />
                    </Tag>
                );
            case BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED:
                return (
                    <Tag color="error">
                        Failed
                        <LuAlertCircle color={token.colorError} />
                    </Tag>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <Flex vertical gap={16} style={{ padding: "20px 0 0" }}>
                {/* <Title level={5} style={{ margin: 0 }}>Batch Image Generation {activeJobData?.id ? "(" + "Job is " + activeJobData.status + ")" : ""}</Title> */}
                {activeJobData && (
                    (activeJobData.status === BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED ||
                        activeJobData.status === BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING ||
                        activeJobData.status === BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED ||
                        activeJobData.status === BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED) ? (
                        <>
                            {activeJobData.status === BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED && (
                                <Result
                                    className={styles.queuedBackground}
                                    style={{ padding: "20px 0" }} // Added some padding for better visual
                                    status="info"
                                    title={<Flex align="center" gap={8} vertical>
                                        <Text strong style={{ fontSize: 20, color: "black" }}>Batch Job Queued</Text>
                                        <Text style={{ fontSize: 14, color: "black" }}>{`Waiting to start processing. ${activeJobData.totalImages} images requested.`}</Text>
                                    </Flex>}
                                />
                            )}
                            {activeJobData.status === BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING && (
                                <Result
                                    className={styles.processingBackground}
                                    icon={<Spin size="large" />}
                                    style={{ padding: "20px 0" }}
                                    title={<Flex align="center" gap={8} vertical>
                                        <Text strong style={{ fontSize: 20, color: "black" }}>Batch Job Processing...</Text>
                                        <Text style={{ fontSize: 14, color: "black" }}>{`Generating images: ${activeJobData.generatedCount} of ${activeJobData.totalImages} completed.`}</Text>
                                    </Flex>}
                                />
                            )}
                            {activeJobData.status === BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED && (
                                <Result
                                    rootClassName={styles.completedBackground}
                                    style={{ padding: "20px 0" }} // Added some padding for better visual
                                    status="success"
                                    title={<Flex align="center" gap={8} vertical>
                                        <Text strong style={{ fontSize: 20 }}>Batch Job Completed Successfully!</Text>
                                        <Text>{`Generated ${activeJobData.generatedCount} of ${activeJobData.totalImages} images. Completed on ${formatJobTime(activeJobData.modifiedOn)}.`}</Text>
                                    </Flex>}
                                />
                            )}
                            {activeJobData.status === BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED && (
                                <Result
                                    className={styles.failedBackground}
                                    style={{ padding: "20px 0" }} // Added some padding for better visual
                                    status="error"
                                    title={<Flex align="center" gap={8} vertical>
                                        <Text strong style={{ fontSize: 20, color: "black" }}>Batch Job Failed</Text>
                                        <Text style={{ fontSize: 14, color: "black" }}>{`The job failed on ${formatJobTime(activeJobData.modifiedOn)}. ${IMAGE_BATCH_JOB_FAILED_OWNER_COPY}`}</Text>
                                    </Flex>}
                                />
                            )}
                        </>
                    ) : (
                        <Card size="small">
                            <Flex vertical gap={8}>
                                <Flex align="center" justify="space-between">
                                    <Flex align="center" gap={8} vertical>
                                        <Text type='secondary'>Job Status:</Text>
                                        {renderJobStatus()}
                                    </Flex>
                                </Flex>
                                <Flex justify="space-between" align="center">
                                    <Text type='secondary'>Generated: <Text strong>{activeJobData.generatedCount} images out of {activeJobData.totalImages}</Text></Text>
                                    {activeJobData.status === BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING && (
                                        <Text type='secondary'>Remaining: <Text strong>{activeJobData.totalImages - activeJobData.generatedCount} images</Text></Text>
                                    )}
                                </Flex>
                                <Flex justify="space-between" align="center">
                                    <Text type='secondary'>Started On: <Text strong>{formatJobTime(activeJobData.createdOn, '')}</Text></Text>
                                    <Text type='secondary'>{activeJobData.status === BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING ? "Last Updated On" : "Completed On"}: <Text strong>{formatJobTime(activeJobData.modifiedOn, '')}</Text></Text>
                                </Flex>
                            </Flex>
                        </Card>
                    )
                )}

                <Divider orientation="left" style={{ margin: 0 }}>Generated Images</Divider>

                {Boolean(activeJobData?.itemsList?.length) &&
                    <Card size='small'>
                        {activeJobData?.itemsList?.length > 1 && <Flex justify="flex-start" align="center" style={{ paddingLeft: 13, paddingBottom: 13 }}>
                            <Checkbox
                                checked={activeJobData?.itemsList?.every(item => item.images.every(img => img.isSelected)) ?? false}
                                onChange={(e) => handleSelectAllImages(e.target.checked)}
                            >&nbsp;&nbsp;&nbsp;Select All</Checkbox>
                        </Flex>}
                        <Flex gap={8} style={{ width: '100%' }} wrap>
                            {activeJobData?.itemsList?.map((item, itemIndex) => (
                                item.images.map((image, imageIndex) => (
                                    <Card
                                        key={`${item.id}-${image.uid || imageIndex}`}
                                        onClick={(e) => {
                                            handleImageSelect(itemIndex, imageIndex);
                                            e.stopPropagation();
                                        }}
                                        variant="outlined"
                                        size='small'
                                        hoverable
                                        style={{ width: isMobile ? '100%' : "calc(50% - 8px)" }}
                                    >
                                        <Flex align="center" gap={16} style={{ width: '100%' }}>
                                            <Checkbox checked={image.isSelected} />
                                            <Image
                                                preview={{ mask: <LuEye size={24} /> }}
                                                src={image.url}
                                                alt={item.name}
                                                width={60}
                                                height={60}
                                                style={{ objectFit: 'cover', borderRadius: '4px', minWidth: 60 }}
                                            />
                                            <Text style={{ wordWrap: 'break-word', whiteSpace: 'normal' }} >{item.name}</Text>
                                        </Flex>
                                    </Card>
                                ))
                            ))}
                        </Flex>
                    </Card>}

                <Flex justify="flex-end" gap={8} style={{ position: 'sticky', bottom: 0, width: '100%', zIndex: 1 }} vertical={isMobile}>
                    {(activeJobData?.status === BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING || activeJobData?.status === BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED) &&
                        <Button danger icon={<LuX />} onClick={() => setIsCancelModalVisible(true)}>Cancel Job</Button>}
                    {(activeJobData?.status === BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED) &&
                        <>
                            <Button danger icon={<LuX />} onClick={() => handleCancelJob("cancel")}>Cancel Job</Button>
                            <Button type="primary" ghost icon={<LuRefreshCcw />} onClick={onRetryJob}>
                                {totalGeneratedImages > 0 ? 'Save Available & Retry' : 'Retry Job'}
                            </Button>
                        </>}
                    {activeJobData?.status === BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED && (
                        <Flex gap={8}>
                            <Button danger icon={<LuTrash />} onClick={() => setIsDiscardModalVisible(true)}>Discard All</Button>
                            <Button
                                type="primary"
                                icon={<LuUploadCloud />}
                                onClick={onUploadGeneratedImages}
                                disabled={!activeJobData?.itemsList?.some(item => item.images.some(img => img.isSelected))}
                            >
                                Upload {totalSelectedImages} Image{totalSelectedImages !== 1 ? 's' : ''}
                            </Button>
                        </Flex>
                    )}
                </Flex>
            </Flex>

            <Modal
                title="Cancel Batch Job"
                open={isCancelModalVisible}
                onCancel={() => setIsCancelModalVisible(false)}
                footer={[
                    <Button key="confirm" ghost danger icon={<LuX />} onClick={() => handleCancelJob("cancel")}>Yes, Cancel</Button>,
                    <Fragment key="upload">
                        {Boolean(activeJobData?.itemsList?.some(item => item.images.some(img => img.isSelected))) && (
                            <Button key="upload" type="primary" icon={<LuUploadCloud />} onClick={() => handleCancelJob("upload")}>Upload Selected & Cancel</Button>
                        )}
                    </Fragment>
                ]}
            >
                <Alert
                    message="Cancel Batch Job"
                    description="Are you sure you want to cancel this batch image generation job? This action cannot be undone."
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                {Boolean(activeJobData?.itemsList?.some(item => item.images.some(img => img.isSelected))) && <Alert
                    message="Note"
                    description={<>
                        <Typography.Paragraph>
                            You have two options:
                        </Typography.Paragraph>
                        <Flex vertical gap={8} style={{ paddingLeft: 16 }}>
                            <Typography.Text>
                                <strong>Upload & Cancel</strong> - Save the selected images generated and stop the job
                            </Typography.Text>
                            <Typography.Text>
                                <strong>Cancel Only</strong> - Add no images and stop the job
                            </Typography.Text>
                        </Flex>
                    </>}
                    type="info"
                    showIcon
                />}
            </Modal>

            {/* Single confirmation modal for closing a batch without adding images. */}
            <Modal
                title="Discard All Images?"
                open={isDiscardModalVisible}
                onCancel={() => setIsDiscardModalVisible(false)}
                footer={[
                    <Button key="cancel" onClick={() => setIsDiscardModalVisible(false)}>Keep Images</Button>,
                    <Button key="discard" type="primary" danger icon={<LuTrash />} onClick={onDiscardGeneratedImages}>Yes, Discard All</Button>
                ]}
            >
                <Flex vertical gap={16}>
                    <Alert
                        message="No images will be added to your menu"
                        description={
                            <Flex vertical gap={4} style={{ marginTop: 8 }}>
                                <Text><strong>{totalGeneratedImages} generated image{totalGeneratedImages !== 1 ? 's' : ''}</strong> will leave this review.</Text>
                                <Text type="secondary">Your current menu images will not change.</Text>
                            </Flex>
                        }
                        type="warning"
                        showIcon
                    />
                    {totalSelectedImages > 0 && (
                        <Alert
                            message={`You have ${totalSelectedImages} image${totalSelectedImages !== 1 ? 's' : ''} selected`}
                            description="Consider uploading them instead of discarding everything."
                            type="warning"
                            showIcon
                        />
                    )}
                </Flex>
            </Modal>

        </>
    );
};

export default BatchImageGenerationResultView;
