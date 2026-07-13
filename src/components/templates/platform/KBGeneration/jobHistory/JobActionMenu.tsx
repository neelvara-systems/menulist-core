import { assertIngestionJobDeleteSucceeded, deleteIngestionJob } from '@database/kb-generation/jobs';
import { useAppDispatch } from '@hook/useAppDispatch';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { INGESTION_JOB_STATUS, type IngestionJob } from '@type/knowledgeBase';
import { Button, Dropdown, message, Popconfirm } from 'antd';
import { LuEye, LuMoreVertical, LuTrash } from 'react-icons/lu';

interface JobActionMenuProps {
    jobId: string;
    status: IngestionJob['status'];
    onCardClick: () => void;
}

const JobActionMenu: React.FC<JobActionMenuProps> = ({ jobId, status, onCardClick }) => {
    const dispatch = useAppDispatch();

    const handleDelete = async () => {
        dispatch(startLoader('Deleting job...'));
        try {
            const result = await deleteIngestionJob(jobId);
            assertIngestionJobDeleteSucceeded(result, jobId, 'kb_generation_job_history_delete_rejected');
            message.success('Job deleted successfully');
        } catch (error) {
            message.error('Failed to delete job');
            logRuntimeFailure('platform_kb_job_delete_failed', error, {
                ...getBoundedRuntimeStringContext('jobId', jobId),
            });
        } finally {
            dispatch(stopLoader('Deleting job...'));
        }
    };

    const handleMenuClick = ({ key }: { key: string }) => {
        if (key === 'view') {
            onCardClick();
        }
    };

    const canDelete = status === INGESTION_JOB_STATUS.FAILED || status === INGESTION_JOB_STATUS.CANCELLED;
    const menuItems = [
        {
            key: 'view',
            label: 'View Details',
            icon: <LuEye />
        },
        ...(canDelete ? [{
            key: 'delete',
            icon: <LuTrash />,
            label: (
                <span onClick={(e) => e.stopPropagation()}>
                    <Popconfirm
                        title="Delete the job"
                        description="Are you sure you want to delete this job? This action cannot be undone."
                        onConfirm={handleDelete}
                        okText="Yes"
                        cancelText="No"
                    >
                        Delete
                    </Popconfirm>
                </span>
            ),
        }] : []),
    ];

    return (
        <Dropdown
            menu={{ items: menuItems, onClick: handleMenuClick }}
            trigger={['click']}>
            <Button onClick={(e) => e.stopPropagation()} type="text" icon={<LuMoreVertical />} shape="circle" />
        </Dropdown>
    );
};

export default JobActionMenu;
