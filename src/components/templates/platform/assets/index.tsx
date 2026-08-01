'use client'
import ImageRenderer from "@atoms/imageRenderer";
import { deleteAssetsCategory, deleteAssetsItem, deleteAssetsSubCategory, getAllAssetsByType } from "@database/static/static";
import { useAppDispatch } from "@hook/useAppDispatch";
import { startLoader, stopLoader } from "@reduxSlices/loader";
import { showSuccessToast } from "@reduxSlices/toast";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { AssetsCategoryType, CraftBuilderAssetsTypesType } from "@type/assets";
import { sortByActive } from "@util/sorting";
import { removeObjRef } from "@util/utils";
import { Badge, Button, Empty, Flex, Layout, theme, Typography } from "antd";
import { Fragment, useEffect, useState } from "react";
import { FcAddImage } from "react-icons/fc";
import { LuPen, LuPlus } from "react-icons/lu";
import DetailsModal, {
    type PlatformAssetModalResponse,
    type PlatformAssetModalState,
    type PlatformAssetModalType,
} from "./detailsModal";
import styles from './styles.module.scss';
const { Text } = Typography;

export const emptyDetailsData: AssetsCategoryType = { active: true, name: "", preview: "", tags: "", subCategories: [], items: [], previewType: "svg" }

const isDeletedAssetResponse = (
    data: PlatformAssetModalResponse,
): data is Extract<PlatformAssetModalResponse, { type: "deleted" }> => (
    "type" in data && data.type === "deleted"
);

function AssetsUploader() {

    const { token } = theme.useToken();
    const [categories, setCategories] = useState<AssetsCategoryType[]>([])
    const [showCategoryModal, setShowDetailsModal] = useState<PlatformAssetModalState>({ active: false, data: null, type: "" })
    const [activeCategory, setActiveCategory] = useState(emptyDetailsData)
    const [activeSubCategory, setActiveSubCategory] = useState(emptyDetailsData)
    const [activeAssetsType, setActiveAssetsType] = useState<CraftBuilderAssetsTypesType>('images')
    const dispatch = useAppDispatch()

    useEffect(() => {
        if (activeAssetsType) {
            setActiveCategory(emptyDetailsData)
            setActiveSubCategory(emptyDetailsData)
            const getCategories = async () => {
                dispatch(startLoader("getAllAssetsByType"))
                try {
                    const catList = await getAllAssetsByType(activeAssetsType)
                    setCategories(catList)
                } catch (error) {
                    logRuntimeFailure('platform_assets_load_failed', error, {
                        ...getBoundedRuntimeStringContext('assetType', activeAssetsType),
                    });
                } finally {
                    dispatch(stopLoader("getAllAssetsByType"))
                }
            }
            void getCategories()
        }
    }, [activeAssetsType])

    const handleModalResponse = (data: PlatformAssetModalResponse) => {
        if (data) {
            const categoriesCpy = removeObjRef(categories)
            if (isDeletedAssetResponse(data)) {
                const nextCategories = categoriesCpy.filter((category) => category.id != data.catId);
                setCategories(nextCategories);
                setShowDetailsModal({ active: false, data: null, type: "" });
                return;
            } else {
                let i = categoriesCpy.findIndex(c => c.id == data.id);
                if (i != -1) {
                    categoriesCpy[i] = data
                } else {
                    categoriesCpy.push(data)
                }
            }

            const activeCatIndex = categoriesCpy.findIndex(c => c.id == activeCategory.id);
            if (activeCatIndex != -1) {
                setActiveCategory(categoriesCpy[activeCatIndex])
                if ((categoriesCpy[activeCatIndex].subCategories || []).length) {
                    if (activeSubCategory.id) {
                        const scIndex = (categoriesCpy[activeCatIndex].subCategories || []).findIndex(sc => sc.id == activeSubCategory.id)
                        if (scIndex != -1) {
                            setActiveSubCategory((categoriesCpy[activeCatIndex].subCategories || [])[scIndex])
                        }
                    } else {
                        setActiveSubCategory((categoriesCpy[activeCatIndex].subCategories || [])[0])
                    }
                }
            }
            setCategories(categoriesCpy)
        }
        setShowDetailsModal({ active: false, data: null, type: "" })
    }

    const onDelete = async (activeDetails: AssetsCategoryType) => {
        dispatch(startLoader("onDelete"))
        try {
            if (showCategoryModal.type == 'Category') {
                await deleteAssetsCategory(activeAssetsType, activeDetails);
                handleModalResponse({ type: "deleted", catId: activeCategory.id, subCatId: activeSubCategory.id });
                dispatch(showSuccessToast("Category deleted !"))
            } else if (showCategoryModal.type == 'Sub Category') {
                await deleteAssetsSubCategory(activeAssetsType, activeDetails, activeCategory);
                handleModalResponse({
                    ...activeCategory,
                    subCategories: (activeCategory.subCategories || []).filter((category) => category.id != activeDetails.id),
                });
                dispatch(showSuccessToast("Category deleted !"))
            } else if (showCategoryModal.type == 'Item') {
                await deleteAssetsItem(activeAssetsType, activeDetails, activeCategory, activeSubCategory);
                const activeCategoryCpy = removeObjRef(activeCategory);
                if (Boolean(activeSubCategory?.id)) {
                    activeCategoryCpy.subCategories = (activeCategoryCpy.subCategories || []).map((subcategory) => (
                        subcategory.id === activeSubCategory.id
                            ? { ...subcategory, items: (subcategory.items || []).filter((item) => item.id != activeDetails.id) }
                            : subcategory
                    ));
                } else {
                    activeCategoryCpy.items = (activeCategoryCpy.items || []).filter((item) => item.id != activeDetails.id);
                }
                handleModalResponse({ ...activeCategoryCpy });
                dispatch(showSuccessToast("Item deleted !"))
            }
        } catch (error) {
            logRuntimeFailure('platform_assets_delete_failed', error, {
                ...getBoundedRuntimeStringContext('assetType', activeAssetsType),
                ...getBoundedRuntimeStringContext('entityType', showCategoryModal.type),
                hasEntityId: activeDetails?.id !== undefined,
            });
        } finally {
            dispatch(stopLoader("onDelete"))
        }
    }

    const renderDetailsRow = (
        item: AssetsCategoryType,
        onClick: (item: AssetsCategoryType) => void,
        activeId: string | number | undefined,
        type: PlatformAssetModalType,
    ) => {
        const isActive = activeId == item.id;
        return <Flex className={styles.itemDetails}>
            <Badge color={item.active ? "green" : "red"} dot styles={{ root: { width: "100%" } }}>
                <Button className={styles[type]} onClick={() => onClick(item)} type={isActive ? "primary" : "dashed"}>
                    {Boolean(item.preview) ? <ImageRenderer width={100} height={100} src={item.preview} /> : <Empty description="" image={<FcAddImage style={{ width: 50 }} />} />}
                    <Text strong ellipsis type={item.active ? "secondary" : "danger"} style={{ width: type == "Item" ? 130 : 200 }} >{item.name}</Text>
                </Button>
                {/* {type == "Item" && <Popconfirm title="Are you sure to delete" onConfirm={() => onDelete(item)}>
                    <Button className={styles.deleteBtn} size="large" ghost danger type="primary" icon={<MdOutlineDelete />} />
                </Popconfirm>} */}
            </Badge>
            {isActive && <Button onClick={() => setShowDetailsModal({ active: true, data: item, type })} shape="circle" className={styles.action} icon={<LuPen />} />}
        </Flex>
    }

    return (
        <Layout className={styles.assetsWrap}>
            {Boolean(activeAssetsType) ? <>
                <Flex>
                    <Flex className={styles.listWrap} vertical style={{ borderColor: token.colorBorder }} gap={10}>
                        <Flex justify="space-between" align="center">
                            <Text style={{ borderBottom: `1px dashed ${token.colorBorder}`, paddingBottom: 5 }} strong>Category</Text>
                            <Button style={{ minWidth: "max-content" }} onClick={() => setShowDetailsModal({ active: true, data: null, type: "Category" })} icon={<LuPlus />} shape="circle" />
                        </Flex>
                        <Flex vertical gap={10}>
                            {Boolean(categories.length) ? <>
                                {sortByActive(categories).map((category: AssetsCategoryType, i: number) => {
                                    return <Fragment key={i}>
                                        {renderDetailsRow(category, (item) => { setActiveCategory(item); setActiveSubCategory(emptyDetailsData) }, activeCategory.id, "Category")}
                                    </Fragment>
                                })}
                            </> : <>
                                <Empty />
                            </>}
                            <Button style={{ minWidth: "max-content" }} onClick={() => setShowDetailsModal({ active: true, data: null, type: "Category" })} icon={<LuPlus />}>Add</Button>
                        </Flex>
                    </Flex>
                    <Flex className={`${styles.listWrap} ${styles.itemListWrap}`} vertical gap={10}>
                        <Flex justify="space-between" align="center">
                            <Text style={{ borderBottom: `1px dashed ${token.colorBorder}`, paddingBottom: 5 }} strong>Items</Text>
                            {Boolean(activeCategory.id) && (!Boolean(activeCategory.subCategories?.length) || Boolean(activeSubCategory?.id)) && <Button style={{ minWidth: "max-content" }} onClick={() => setShowDetailsModal({ active: true, data: null, type: "Item" })} icon={<LuPlus />} shape="circle" />}
                        </Flex>
                        {Boolean(activeCategory?.id) ? <Flex gap={10} className={styles.items}>
                            {(Boolean(activeCategory.items?.length) || Boolean(activeSubCategory.items?.length)) ? <>
                                {sortByActive((Boolean(activeCategory.items?.length) ? activeCategory.items : activeSubCategory.items) || []).map((item: AssetsCategoryType, i: number) => {
                                    return <Fragment key={i}>
                                        {renderDetailsRow(item, (selectedItem) => setShowDetailsModal({ active: true, data: selectedItem, type: "Item" }), undefined, "Item")}
                                    </Fragment>
                                })}
                            </> : <>
                                <Empty />
                            </>}
                        </Flex> : <>
                            <Empty />
                        </>}
                        {Boolean(activeCategory.id) && (!Boolean(activeCategory.subCategories?.length) || Boolean(activeSubCategory?.id)) && <Button style={{ minWidth: "max-content" }} onClick={() => setShowDetailsModal({ active: true, data: null, type: "Item" })} icon={<LuPlus />}>Add Item</Button>}
                    </Flex>
                </Flex>

                <DetailsModal
                    activeAssetsType={activeAssetsType}
                    activeCategory={activeCategory}
                    activeSubCategory={activeSubCategory}
                    modalData={showCategoryModal}
                    onClose={setShowDetailsModal}
                    onSubmit={handleModalResponse}
                />
            </> : <>
                <Empty description="Select Asset Type" />
            </>}
        </Layout>
    )
}

export default AssetsUploader
