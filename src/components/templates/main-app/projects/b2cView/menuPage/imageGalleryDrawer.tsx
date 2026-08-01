import { SearchOutlined } from '@ant-design/icons';
import { getBusinessAssetsByType } from '@database/static/static';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { AssetsCategoryType } from '@type/assets';
import { Divider, Drawer, Flex, Input, Upload, theme, type UploadProps } from 'antd';
import Image from 'next/image';
import { useContext, useEffect, useState } from 'react';
import { LuUpload } from 'react-icons/lu';

interface ImageGalleryDrawerProps {
    open: boolean;
    onClose: () => void;
    onImageSelect: (imageUrl: string) => void;
    uploadProps?: UploadProps;
}

export default function ImageGalleryDrawer({ open, onClose, onImageSelect, uploadProps }: ImageGalleryDrawerProps) {
    const { token } = theme.useToken();
    const [imagesList, setImagesList] = useState<AssetsCategoryType[]>([])
    const [filteredImages, setFilteredImages] = useState<AssetsCategoryType[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const { assetsList, setAssetsList } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)

    const prepareImages = (images: AssetsCategoryType[]) => {
        const allImages: AssetsCategoryType[] = images.flatMap((list) => list.items || []);
        setImagesList(allImages);
        setFilteredImages(allImages);
    }

    useEffect(() => {
        let cancelled = false;
        if (assetsList?.images?.length > 0) {
            prepareImages(assetsList.images)
        } else {
            getBusinessAssetsByType("images", '').then((res: AssetsCategoryType[]) => {
                if (!cancelled && Array.isArray(res)) {
                    setAssetsList((current) => ({
                        ...current,
                        images: res
                    }));
                    prepareImages(res)
                }
            }).catch((error: unknown) => {
                if (!cancelled) {
                    logRuntimeFailure('project_image_gallery_load_failed', error);
                }
            })
        }
        return () => {
            cancelled = true;
        };
    }, [])

    // Filter images based on search term
    const handleSearch = (value: string) => {
        setSearchTerm(value);
        if (!value.trim()) {
            setFilteredImages(imagesList);
            return;
        }

        const searchTermLower = value.toLowerCase();
        const filtered = imagesList.filter((image) => {
            const nameLower = (image.name || '').toLowerCase();
            const tagsLower = (image.tags || '').toLowerCase();

            return nameLower.includes(searchTermLower) || tagsLower.includes(searchTermLower);
        });

        setFilteredImages(filtered);
    }

    return (
        <Drawer
            title="Background Image Gallery"
            placement="right"
            onClose={onClose}
            open={open}
            width={450}
            styles={{ header: { flexDirection: "row-reverse" } }}
            maskClosable={true}
            mask={false}
        >
            <Flex vertical gap={24}>
                <Upload.Dragger {...uploadProps} style={{ padding: '24px' }}>
                    <Flex vertical align="center" gap={8}>
                        <LuUpload size={24} />
                        <span>Click or drag image to upload</span>
                        <span style={{ fontSize: '12px', color: '#666' }}>PNG, JPG up to 2MB</span>
                    </Flex>
                </Upload.Dragger>

                <Divider>or choose from gallery</Divider>
                <Flex vertical gap={16} style={{ width: '100%' }}>
                    <Flex style={{
                        width: '100%',
                        position: 'sticky',
                        top: '-16px',
                        zIndex: 2
                    }}>
                        <Input
                            placeholder="Search by tags or name..."
                            prefix={<SearchOutlined />}
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            allowClear
                            size="large"
                            style={{ width: '100%' }}
                        />
                    </Flex>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(129px, 2fr))',
                        gap: '12px',
                        width: '100%',
                        alignItems: "flex-start"
                    }}>
                        {filteredImages.map((imageData: AssetsCategoryType) => {
                            return (
                                <div
                                    key={String(imageData.id || imageData.preview)}
                                    onClick={() => onImageSelect(imageData.preview)}
                                    style={{
                                        borderRadius: 8,
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        border: `1px solid ${token.colorBorderSecondary}`,
                                        height: 'auto',
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <div style={{
                                        position: 'relative',
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Image
                                            src={imageData.preview}
                                            alt={imageData.tags || 'Gallery image'}
                                            style={{
                                                objectFit: 'cover',
                                                maxWidth: '100%',
                                                maxHeight: '100%',
                                                width: 'auto',
                                                height: 'auto'
                                            }}
                                            width={300}
                                            height={300}
                                            unoptimized
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Flex>
            </Flex>
        </Drawer>
    );
}
