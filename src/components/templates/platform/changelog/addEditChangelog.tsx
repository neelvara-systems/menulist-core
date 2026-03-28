'use client';

import PasteUpload, { PastedFile } from '@atoms/PasteUpload';
import TiptapEditor from '@atoms/TiptapEditor';
import { CHANGELOG_TAG_CONFIG, CHANGELOG_TAG_OPTIONS } from '@constant/changelog';
import { addChangelogEntry, updateChangelogEntry } from '@database/changelog';
import { useAppDispatch } from '@hook/useAppDispatch';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { ChangelogEntry } from '@type/changelog';
import { getBase64, getYouTubeID } from '@util/utils';
import { Button, DatePicker, Drawer, Flex, Form, Input, Select, Switch, TimePicker, Typography, message } from 'antd';
import { RcFile } from 'antd/es/upload';
import dayjs from 'dayjs';
import { Timestamp } from 'firebase/firestore';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import KbTreeSelect from './KbTreeSelect';

const { Title } = Typography;

interface AddEditChangelogProps {
    open: boolean;
    onClose: () => void;
    onSave: (entry: any) => void;
    initialData?: ChangelogEntry | null;
}

const AddEditChangelog: React.FC<AddEditChangelogProps> = ({ open, onClose, onSave, initialData }) => {
    const [form] = Form.useForm();
    const dispatch = useAppDispatch();
    const [isSaving, setIsSaving] = useState(false);
    const [attachments, setAttachments] = useState<any[]>([]);
    const isFormActive = useRef(false);
    const { cachedKBCategories } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

    const kbLookup = useMemo(() => {
        const lookup = new Map<string, { categoryId: string, sectionId?: string, articleId?: string }>();
        if (!cachedKBCategories?.kBCategories) return lookup;

        for (const cat of Object.values(cachedKBCategories.kBCategories) as any[]) {
            lookup.set(`cat-${cat.id}`, { categoryId: cat.id });
            for (const sec of cat.sections || []) {
                lookup.set(`sec-${sec.id}`, { categoryId: cat.id, sectionId: sec.id });
                for (const art of sec.articles || []) {
                    lookup.set(`art-${art.id}`, { categoryId: cat.id, sectionId: sec.id, articleId: art.id });
                }
            }
            for (const art of cat.articles || []) {
                if (!lookup.has(`art-${art.id}`)) { // Avoid overwriting article from a section
                    lookup.set(`art-${art.id}`, { categoryId: cat.id, articleId: art.id });
                }
            }
        }
        return lookup;
    }, [cachedKBCategories]);

    const [kbSources, setKbSources] = useState<{ categoryId: string, sectionId?: string, articleId?: string }[]>([]);
    const [youtubeLink, setYoutubeLink] = useState('');
    const [youtubeLinks, setYoutubeLinks] = useState<string[]>([]);




    useEffect(() => {
        isFormActive.current = open;
    }, [open]);

    const handleAddYoutubeLink = () => {
        const trimmedLink = youtubeLink.trim();
        if (!trimmedLink) return;

        if (youtubeLinks.includes(trimmedLink)) {
            message.warning('This YouTube link has already been added.');
            return;
        }

        if (getYouTubeID(trimmedLink)) {
            setYoutubeLinks(prev => [...prev, trimmedLink]);
            setYoutubeLink(''); // Clear input after adding
        } else {
            message.error('Invalid YouTube link. Please check the URL and try again.');
        }
    };



    const handleKbSourceChange = (value: string[]) => {
        const sources = value.map(val => kbLookup.get(val))
            .filter(Boolean) as { categoryId: string, sectionId?: string, articleId?: string }[];
        setKbSources(sources);
    };

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

    useEffect(() => {
        if (open && initialData && initialData.id) {
            const releasedOnDate = dayjs(initialData.releasedOn.toDate());
            setAttachments(initialData.files || []);
            setYoutubeLinks((initialData.youtubeLinks || []).filter(link => getYouTubeID(link)));
            setKbSources(initialData.kbSources || []);

            form.setFieldsValue({
                title: initialData.title,
                description: initialData.description,
                tags: initialData.tags,
                published: initialData.published,
                releaseDate: releasedOnDate,
                releaseTime: releasedOnDate,
                version: initialData.version,
                // Set form values for TreeSelect
                kbSources: (initialData.kbSources || []).map(s => s.articleId ? `art-${s.articleId}` : s.sectionId ? `sec-${s.sectionId}` : `cat-${s.categoryId}`)
                // The above line is now correct as it's just for setting the initial form value.
            });
        } else {
            form.resetFields();
            setAttachments([]);
            setKbSources([]);
            setYoutubeLinks([]);
        }
    }, [initialData, form, open]);

    const handleSave = async (values: any) => {
        const { title, description, tags, releaseDate, releaseTime, published, version } = values;

        const combinedDateTime = releaseDate
            .hour(releaseTime.hour())
            .minute(releaseTime.minute())
            .second(releaseTime.second());

        const files = [];
        for (const file of attachments) {
            if (file.originFileObj) {
                const base64 = await getBase64(file.originFileObj as RcFile);
                files.push({ name: file.name, size: file.size, type: file.type, url: base64, uid: file.uid });
            } else {
                files.push(file); // Keep existing files
            }
        }

        const entryPayload = {
            files,
            title,
            description: description || '',
            tags: tags || [],
            releasedOn: Timestamp.fromDate(combinedDateTime.toDate()),
            published: published || false,
            version: version || null,
            kbSources: kbSources,
            youtubeLinks: youtubeLinks,
        };

        dispatch(startLoader('Saving Changelog...'));
        setIsSaving(true);
        try {
            let result;
            if (initialData) {
                result = await updateChangelogEntry(initialData.id, entryPayload);
                message.success('Changelog entry updated successfully!');
                const updatedEntry = { ...initialData, ...entryPayload };
                // Convert timestamp back to a plain object for state update if needed
                if (updatedEntry.releasedOn) {
                    updatedEntry.releasedOn = Timestamp.fromDate(updatedEntry.releasedOn.toDate());
                }
                onSave(updatedEntry);
            } else {
                result = await addChangelogEntry(entryPayload);
                message.success('Changelog entry saved successfully!');
                onSave(result);
            }
            form.resetFields();
            setAttachments([]);
            setKbSources([]);
            onClose();
        } catch (error) {
            message.error('Failed to save changelog entry. Please try again.');
        } finally {
            dispatch(stopLoader('Saving Changelog...'));
            setIsSaving(false);
        }
    };

    return (
        <Drawer
            title={<Title level={4}>{initialData ? 'Edit Changelog Entry' : 'Add New Changelog Entry'}</Title>}
            width={720}
            onClose={onClose}
            open={open}
            footer={
                <Flex justify='flex-end' gap={16} style={{ width: '100%' }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button onClick={() => form.submit()} type="primary" loading={isSaving}>Save</Button>
                </Flex>
            }
        >
            <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ published: true }}>

                <Flex justify='space-between' gap={16} align='flex-end'>
                    <Form.Item style={{ flex: 1 }} name="title" label="Title" rules={[{ required: true, message: 'Please enter a title' }]}>
                        <Input size='large' placeholder="e.g., New Feature: Dark Mode" />
                    </Form.Item>
                    <Form.Item name="published" label="Published" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Flex>

                <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Please provide a description' }]}>
                    <TiptapEditor
                        value={form.getFieldValue('description')}
                        onChange={(content) => form.setFieldsValue({ description: content })}
                        placeholder="Describe the change in detail..."
                    />
                </Form.Item>

                <Flex gap={16}>
                    <Form.Item name="tags" label="Tags" style={{ flex: 1 }}>
                        <Select
                            mode="multiple"
                            allowClear
                            placeholder="Select tags to categorize this entry"
                            style={{ width: '100%' }}
                        >
                            {CHANGELOG_TAG_OPTIONS.map(tag => {
                                const config = CHANGELOG_TAG_CONFIG[tag];
                                if (!config) return <Select.Option key={tag} value={tag}>{tag}</Select.Option>;
                                const Icon = config.icon;
                                return (
                                    <Select.Option key={tag} value={tag}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <Icon style={{ marginRight: 8 }} />
                                            {tag}
                                        </div>
                                    </Select.Option>
                                );
                            })}
                        </Select>
                    </Form.Item>
                    <Form.Item name="version" label="Version (e.g., 1.0.0)">
                        <Input placeholder="Enter version" />
                    </Form.Item>
                </Flex>

                <Flex gap={16}>
                    <Form.Item name="releaseDate" label="Release Date" rules={[{ required: true, message: 'Please select a date' }]} style={{ flex: 1 }}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="releaseTime" label="Release Time" rules={[{ required: true, message: 'Please select a time' }]} style={{ flex: 1 }}>
                        <TimePicker style={{ width: '100%' }} format="HH:mm" />
                    </Form.Item>
                </Flex>

                <Form.Item name="kbSources" label="Link to Knowledge Base Article">
                    <KbTreeSelect onChange={handleKbSourceChange} />
                </Form.Item>

                <Form.Item label="Embed YouTube Video">
                    <Flex vertical gap="middle">
                        <Flex gap="small">
                            <Input
                                placeholder="Paste YouTube link here"
                                value={youtubeLink}
                                onChange={(e) => setYoutubeLink(e.target.value)}
                                onPressEnter={(e) => { e.preventDefault(); handleAddYoutubeLink(); }}
                            />
                            <Button onClick={handleAddYoutubeLink}>Add Link</Button>
                        </Flex>
                        <Flex wrap gap="middle">
                            {youtubeLinks.map((link, index) => {
                                const videoId = getYouTubeID(link);
                                return (
                                    <div key={index} style={{ position: 'relative', width: 200, height: 150 }}>
                                        <iframe
                                            style={{
                                                border: '1px solid',
                                                borderRadius: '10px',
                                            }}
                                            width="100%"
                                            height="100%"
                                            src={`https://www.youtube.com/embed/${videoId}`}
                                            title="YouTube video player"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                        <Button
                                            danger
                                            size='small'
                                            onClick={() => setYoutubeLinks(prev => prev.filter(l => l !== link))}
                                            style={{ position: 'absolute', top: 5, right: 5, zIndex: 10 }}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                );
                            })}
                        </Flex>
                    </Flex>
                </Form.Item>

                <Form.Item label="Attachments">
                    <PasteUpload
                        isPastingEnabled={isFormActive}
                        onPaste={onPasteFiles}
                        fileList={attachments}
                        onChange={({ fileList }) => setAttachments(fileList)}
                        onRemove={(file) => {
                            setAttachments((prev) => prev.filter((item) => item.uid !== file.uid));
                            return true;
                        }}
                        multiple
                        listType='picture'
                    />
                </Form.Item>

            </Form>
        </Drawer>
    );
};

export default AddEditChangelog;
