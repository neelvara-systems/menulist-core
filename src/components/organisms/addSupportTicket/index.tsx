import PasteUpload, { PastedFile } from '@atoms/PasteUpload';
import { addTicket, assertSupportTicketCreateSucceeded } from '@database/tickets';
import { useAppDispatch } from '@hook/useAppDispatch';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { SUPPORT_TICKET_CATEGORY, SUPPORT_TICKET_CATEGORY_LIST, SUPPORT_TICKET_PRIORITY_LIST, SUPPORT_TICKET_STATUS, SupportTicketType } from '@type/supportTicket';
import { getBase64 } from '@util/utils';
import type { UploadProps } from 'antd';
import { Button, Card, Flex, Form, Grid, Input, message, Modal, Select, Typography } from 'antd';
import { RcFile } from 'antd/es/upload';
import { Timestamp } from 'firebase/firestore';
import { useSession } from 'next-auth/react';
import React, { useContext, useMemo, useRef, useState } from 'react';
import { getBoundedSupportTicketStringContext, logSupportTicketFailure } from './supportTicketDiagnostics';

const { Text, Title, Paragraph } = Typography;

interface AddTicketModalProps {
    visible?: boolean;
    onClose?: any;
    onTicketSubmitted: (ticket: SupportTicketType) => void;
    mode?: "modal" | "form";
    showHeader?: boolean;
}

const AddSupportTicket: React.FC<AddTicketModalProps> = ({ visible = false, onClose = () => { }, onTicketSubmitted, mode = "modal", showHeader = true }) => {
    const [form] = Form.useForm();
    const [attachments, setAttachments] = useState<any[]>([]);
    const isFormActive = useRef(false);
    const dispatch = useAppDispatch();
    const { data: session } = useSession();
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const screens = Grid.useBreakpoint();
    const isNarrow = screens.md !== true;

    const onPasteFiles = (pastedFiles: PastedFile[]) => {
        setAttachments((prevAttachments) => {
            const existingFiles = new Set(prevAttachments.map(f => `${f.name}|${f.size}`));
            const uniqueNewFiles = pastedFiles.filter(file => !existingFiles.has(`${file.name}|${file.size}`));

            if (prevAttachments.length + uniqueNewFiles.length > 4) {
                message.error('File Limit Exceeded, You can only upload a maximum of 4 files.');
                const remainingSlots = 4 - prevAttachments.length;
                return [...prevAttachments, ...uniqueNewFiles.slice(0, remainingSlots)];
            }

            return [...prevAttachments, ...uniqueNewFiles];
        });
    }

    const handleFormSubmit = async (values: any) => {
        if (!session?.user) {
            message.error('Authentication Error, You must be logged in to create a ticket.');
            return;
        }
        dispatch(startLoader("Submitting ticket..."));
        try {
            const documents = [];
            for (const file of attachments) {
                const base64 = await getBase64(file.originFileObj as RcFile);
                documents.push({ name: file.name, size: file.size, type: file.type, url: base64, uid: file.uid });
            }

            const payload: SupportTicketType = {
                ...values,
                documents,
                status: SUPPORT_TICKET_STATUS.OPEN,
                createdBy: {
                    id: session.user.id,
                    name: session.user.name,
                    email: session.user.email,
                },
                statuses: [
                    {
                        status: SUPPORT_TICKET_STATUS.OPEN,
                        timestamp: Timestamp.now(),
                        createdBy: {
                            id: session.user.id,
                            name: session.user.name,
                            email: session.user.email
                        },
                        remark: values.message || `Ticket created by admin.`,
                    },
                ],
                clientDetails: {
                    tenantName: storeDetails?.tenantName,
                    storeName: storeDetails?.name,
                    email: storeDetails?.email,
                    phone: storeDetails?.phoneNumber,
                },
            };
            const newTicket = await addTicket(payload);
            assertSupportTicketCreateSucceeded(
                newTicket,
                'support_ticket_submit_create_rejected',
            );
            message.success(`Ticket submitted successfully. Ticket ID is #${newTicket.displayId}.`);
            form.resetFields();
            setAttachments([]);
            onTicketSubmitted(newTicket);
            onClose();
        } catch (error) {
            logSupportTicketFailure('support_ticket_submit_failed', error, {
                attachmentCount: attachments.length,
                ...getBoundedSupportTicketStringContext('tenantId', storeDetails?.tenantId),
                ...getBoundedSupportTicketStringContext('storeId', storeDetails?.storeId),
                ...getBoundedSupportTicketStringContext('category', values?.category),
                ...getBoundedSupportTicketStringContext('priority', values?.priority),
            });
            message.error('Submission failed. Please try again.');
        } finally {
            dispatch(stopLoader("Submitting ticket..."));
        }
    };

    const props: UploadProps = useMemo(() => ({
        name: "file",
        multiple: true,
        maxCount: 4,
        fileList: attachments,
        beforeUpload: () => false, // Prevent auto-upload
        onChange: (info) => {
            const { fileList } = info;
            const uniqueFilesMap = new Map();
            fileList.forEach(file => {
                uniqueFilesMap.set(`${file.name}|${file.size}`, file);
            });
            const uniqueFiles = Array.from(uniqueFilesMap.values());
            setAttachments(uniqueFiles);
        },
        listType: "picture",
        // previewFile: (file) => {
        //     if (file instanceof File) {
        //         return getBase64(file as RcFile);
        //     }
        //     return '';
        // },
    }), [attachments]);


    const RenderFormContent = () => {
        return <div
            onMouseEnter={() => isFormActive.current = true}
            onMouseLeave={() => isFormActive.current = false}
        >
            <Card style={{ width: '100%', minWidth: isNarrow ? 0 : 'max-content' }}>
                {showHeader && (
                    <Flex vertical>
                        <Title level={4}>Need help? Let&apos;s get this sorted.</Title>
                        <Paragraph>We&apos;re here to help. Tell us what&apos;s going on, and we&apos;ll get back to you as soon as possible.</Paragraph>
                    </Flex>
                )}
                <Form form={form} layout="vertical" name="submit_ticket" onFinish={handleFormSubmit}>
                    <Flex gap={isNarrow ? "small" : "middle"} align={isNarrow ? "stretch" : "start"} vertical={isNarrow}>
                        <Form.Item name="category" style={{ flex: 1, width: isNarrow ? '100%' : undefined }} label="What is this about?" initialValue={SUPPORT_TICKET_CATEGORY.TECHNICAL_ISSUE} rules={[{ required: true, message: 'Please select a category!' }]}>
                            <Select placeholder="Select a category" options={SUPPORT_TICKET_CATEGORY_LIST} />
                        </Form.Item>
                        <Form.Item name="priority" style={{ flex: 1, width: isNarrow ? '100%' : undefined }} label="How urgent is this?" initialValue="NORMAL" rules={[{ required: true, message: 'Please select a priority!' }]}>
                            <Select placeholder="Select a priority" options={SUPPORT_TICKET_PRIORITY_LIST} />
                        </Form.Item>
                    </Flex>

                    <Form.Item name="subject" label="What’s happening?" rules={[{ required: true, message: 'Please enter a subject!' }]}>
                        <Input placeholder="e.g., “Menu not showing on my website” or “Payment failed on checkout”" />
                    </Form.Item>

                    <Form.Item name="message" label="Tell us more:" rules={[{ required: true, message: 'Please provide details about your issue!' }]}>
                        <Input.TextArea rows={6} placeholder="Tell us what happened, when it started, and what you tried so far." />
                    </Form.Item>

                    <Form.Item label="Add a screenshot or file (optional)">
                        <PasteUpload {...props} onPaste={onPasteFiles} isPastingEnabled={isFormActive} />
                        <Text type="secondary" italic>Screenshots help us fix issues faster.</Text>
                    </Form.Item>

                    <Form.Item style={{ width: '100%' }}>
                        <Flex align='center' justify='center' gap='small' vertical>
                            {/* <Text>Submit your request — we’ll respond within about 4 business hours.</Text> */}
                            <Button block={isNarrow} type="primary" htmlType="submit" size="large">Send Request</Button>
                            <Text type="secondary" italic style={{ textAlign: 'center' }}>Your request will appear in your ticket history so you can track progress anytime</Text>
                        </Flex>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    }

    return (
        <>
            {mode == "modal" ? <>
                <Modal
                    title="Create a New Support Ticket"
                    open={visible}
                    onCancel={onClose}
                    footer={null}
                    width={800}
                >
                    <RenderFormContent />
                </Modal>
            </> : <>
                <Flex style={{ margin: '0 auto', width: '100%' }} gap={isNarrow ? "small" : "large"} justify="flex-start" align="flex-start">
                    <RenderFormContent />
                </Flex>
            </>}
        </>
    );
};

export default AddSupportTicket;
