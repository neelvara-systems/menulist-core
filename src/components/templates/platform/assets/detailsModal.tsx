import DrawerElement from "@antdComponent/drawerElement";
import ImageRenderer from "@atoms/imageRenderer";
import { BUSINESS_TYPES } from "@data/shared/businessTypes";
import { addAssetsCategory, addAssetsItem, addAssetsSubCategory, deleteAssetsCategory, deleteAssetsItem, deleteAssetsSubCategory, updateAssetsCategory, updateAssetsItem, updateAssetsSubCategory } from "@database/static/static";
import { useAppDispatch } from "@hook/useAppDispatch";
import { startLoader, stopLoader } from "@reduxSlices/loader";
import { showErrorToast, showSuccessToast } from "@reduxSlices/toast";
import { AssetsCategoryType } from "@type/assets";
import { getBase64, getBase64Length, removeObjRef } from "@util/utils";
import { Button, Flex, Input, Popconfirm, Select, Switch, Tag, Typography, Upload } from "antd";
import axios from "axios";
import { useEffect, useState } from "react";
import { LuPen, LuRefreshCcw, LuSave, LuUpload, LuX } from "react-icons/lu";
import { MdOutlineDelete } from "react-icons/md";
import { emptyDetailsData } from ".";
import styles from './styles.module.scss';
const { Text } = Typography;
const { Search } = Input;

const emptyFileData = { textContent: "", name: "", size: 0, type: "", src: null, compressed: { size: 0, src: "" } }

function DetailsModal({ activeAssetsType, modalData, onClose, onSubmit, activeCategory, activeSubCategory }) {

    const [activeDetails, setActiveDetails] = useState<AssetsCategoryType>(emptyDetailsData)
    const [tagValue, setTagValue] = useState('')
    const [selectedFile, setSelectedFile] = useState(emptyFileData) //"type:image/png"
    const dispatch = useAppDispatch()
    const [showSVGModal, setShowSVGModal] = useState(false);
    const [deployedUrl, setDeployedUrl] = useState('');

    useEffect(() => {
        setTagValue("");
        setSelectedFile(emptyFileData)
        setDeployedUrl("")
        setActiveDetails(modalData.data || emptyDetailsData)
    }, [modalData])

    const onChangeValue = (from, value) => {
        const categoryDataCopy = removeObjRef(activeDetails);
        categoryDataCopy[from] = value;
        setTagValue("")
        setActiveDetails(categoryDataCopy)
    }

    const onClickTag = (tag) => {
        const tags = activeDetails.tags.split(',');
        let index = tags.findIndex((t) => tag == t);
        if (index != -1) {
            tags.splice(index, 1)
        } else {
            tags.push(tag)
        }
        onChangeValue('tags', tags.join(","))
    }

    const isSvg = () => {
        return selectedFile.type.includes("svg")
    }
    const onSaveCategory = async () => {
        let updatedData = activeDetails;
        dispatch(startLoader("onSaveCategory"))
        if (Boolean(activeDetails?.id)) {
            const changedData: any = {};
            if (activeDetails.active !== modalData.data.active) changedData.active = activeDetails.active;
            if (activeDetails.name !== modalData.data.name) changedData.name = activeDetails.name;
            if (activeDetails.tags !== modalData.data.tags) changedData.tags = activeDetails.tags;
            if (selectedFile.src) {
                changedData.newPreview = isSvg() ? selectedFile.textContent : selectedFile.src;
                changedData.preview = activeDetails.preview
                changedData.previewType = selectedFile.type
            };
            updatedData = await updateAssetsCategory(activeAssetsType, changedData, activeDetails.id)
            onSubmit({ ...activeDetails, preview: updatedData?.preview || activeDetails.preview })
            dispatch(showSuccessToast("Category updated !"))
        } else {
            updatedData = await addAssetsCategory(activeAssetsType, { ...activeDetails, newPreview: isSvg() ? selectedFile.textContent : selectedFile.src, previewType: selectedFile.type })
            onSubmit(updatedData)
            dispatch(showSuccessToast("Category added !"))
        }
        dispatch(stopLoader(""))
    }

    const onSaveSubCategory = async () => {
        let updatedData = activeDetails;
        dispatch(startLoader("onSaveSubCategory"))
        if (Boolean(activeCategory?.id)) {

            const changedData: any = activeDetails;
            if (selectedFile.src) {
                changedData.newPreview = isSvg() ? selectedFile.textContent : selectedFile.src;
                changedData.preview = activeDetails.preview
                changedData.previewType = selectedFile.type
            };
            if (activeDetails.id) {
                updatedData = await updateAssetsSubCategory(activeAssetsType, changedData, activeCategory)
                const newCats = activeCategory.subCategories;
                const subcategoryIndex = activeCategory.subCategories.findIndex(subcategory => subcategory.id === activeDetails.id);
                newCats[subcategoryIndex] = { ...activeDetails, preview: updatedData?.preview || activeDetails.preview, previewType: updatedData?.previewType || activeDetails.previewType }
                onSubmit({ ...activeCategory, subCategories: newCats });
                dispatch(showSuccessToast("Sub Category updated !"))
            } else {
                updatedData = await addAssetsSubCategory(activeAssetsType, { ...changedData, id: new Date().getTime(), previewType: selectedFile.type }, activeCategory.id)
                onSubmit({ ...activeCategory, subCategories: [...activeCategory.subCategories, updatedData] });
                dispatch(showSuccessToast("Sub Category added !"))
            }
        }
        dispatch(stopLoader(""))
    }

    const onSaveItem = async () => {
        let updatedData = activeDetails;
        const changedData: any = activeDetails;
        dispatch(startLoader("onSaveItem"))
        if (selectedFile.src) {
            changedData.newPreview = isSvg() ? selectedFile.textContent : selectedFile.src;
            changedData.preview = activeDetails.preview
            changedData.previewType = selectedFile.type
        };
        const activeCategoryCpy = removeObjRef(activeCategory);
        if (activeDetails.id) {
            updatedData = await updateAssetsItem(activeAssetsType, changedData, activeCategory, activeSubCategory)
            if (Boolean(activeSubCategory?.id)) {
                const subcategoryIndex = activeCategoryCpy.subCategories.findIndex(subcategory => subcategory.id === activeSubCategory.id);
                const iIndex = activeCategoryCpy.subCategories[subcategoryIndex].items.findIndex(i => i.id == activeDetails.id)
                activeCategoryCpy.subCategories[subcategoryIndex].items[iIndex] = { ...activeDetails, preview: updatedData?.preview || activeDetails.preview }
            } else {
                const iIndex = activeCategoryCpy.items.findIndex(i => i.id == activeDetails.id)
                activeCategoryCpy.items[iIndex] = { ...activeDetails, preview: updatedData?.preview || activeDetails.preview, previewType: updatedData?.previewType || activeDetails.previewType }
            }
            onSubmit({ ...activeCategoryCpy });
            dispatch(showSuccessToast("Item updated !"))
        } else {
            updatedData = await addAssetsItem(activeAssetsType, { ...changedData, id: new Date().getTime(), previewType: selectedFile.type }, activeCategory, activeSubCategory)
            if (Boolean(activeSubCategory?.id)) {
                const subcategoryIndex = activeCategoryCpy.subCategories.findIndex(subcategory => subcategory.id === activeSubCategory.id);
                activeCategoryCpy.subCategories[subcategoryIndex].items.push(updatedData)
            } else {
                activeCategoryCpy.items.push(updatedData)
            }
            onSubmit({ ...activeCategoryCpy });
            dispatch(showSuccessToast("Item added !"))
        }
        dispatch(stopLoader(""))
    }

    const onSave = async () => {
        if (modalData.type == 'Category') onSaveCategory()
        else if (modalData.type == 'Sub Category') onSaveSubCategory()
        else if (modalData.type == 'Item') onSaveItem()
    }

    const onDelete = async () => {
        dispatch(startLoader("onDelete"))
        if (modalData.type == 'Category') {
            await deleteAssetsCategory(activeAssetsType, activeDetails);
            onSubmit({ type: "deleted", catId: activeCategory.id, subCatId: activeSubCategory.id });
            dispatch(showSuccessToast("Category deleted !"))
        } else if (modalData.type == 'Sub Category') {
            await deleteAssetsSubCategory(activeAssetsType, activeDetails, activeCategory);
            let scId = activeCategory.subCategories.findIndex(c => c.id == activeDetails.id);
            activeCategory.subCategories.splice(scId, 1);
            onSubmit({ ...activeCategory });
            dispatch(showSuccessToast("Category deleted !"))
        } else if (modalData.type == 'Item') {
            await deleteAssetsItem(activeAssetsType, activeDetails, activeCategory, activeSubCategory);
            const activeCategoryCpy = removeObjRef(activeCategory);
            if (Boolean(activeSubCategory?.id)) {
                const subcategoryIndex = activeCategoryCpy.subCategories.findIndex(subcategory => subcategory.id === activeSubCategory.id);
                const iIndex = activeCategoryCpy.subCategories[subcategoryIndex].items.findIndex(i => i.id == activeDetails.id)
                activeCategoryCpy.subCategories[subcategoryIndex].items.splice(iIndex, 1)
            } else {
                const iIndex = activeCategoryCpy.items.findIndex(i => i.id == activeDetails.id)
                activeCategoryCpy.items.splice(iIndex, 1)
            }
            onSubmit({ ...activeCategoryCpy });
            dispatch(showSuccessToast("Item deleted !"))
        }
        dispatch(stopLoader(""))
    }

    const onAddTag = () => {
        const tag = tagValue.trim()
        if (Boolean(tag) && (!activeDetails.tags.includes(tag))) {
            onChangeValue('tags', (activeDetails.tags + `${activeDetails.tags.length ? "," : ""}${tag}`))
        }
    }

    const onCloseSvgModal = (data: any) => {
        if (data) {
            const { src, textContent } = data;
            if (src) {
                setSelectedFile({ ...selectedFile, src, size: getBase64Length(src), textContent })
            }
        }
        setShowSVGModal(false)
    }

    const handleFileChange = (info: any) => {
        const file = info.file;
        if (file.status === 'done') {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const { originFileObj } = file;
                const content = e.target?.result as string;
                const base64 = await getBase64(originFileObj);
                const data = {
                    name: originFileObj.name,
                    size: originFileObj.size,
                    type: originFileObj.type.includes("svg") ? 'image/svg+xml' : originFileObj.type,
                    src: base64,
                    textContent: content,
                    compressed: {
                        size: getBase64Length(base64),
                        src: base64
                    }
                }
                setSelectedFile(data)
            };
            reader.readAsText(file.originFileObj);
        }
    };

    // const uploadSVGToFirebase = async () => {
    //     dispatch(toggleLoader("uploadingToFirebase"));
    //     try {
    //         const fileName = `svg_${new Date().getTime()}.svg`;
    //         const storageRef = ref(firebaseStorage, `myassets/${fileName}`);

    //         await uploadString(storageRef, selectedFile.textContent, 'raw', { contentType: 'image/svg+xml' });
    //         const downloadURL = await getDownloadURL(storageRef);
    //         console.log("downloadURL", downloadURL)
    //         debugger
    //         setSelectedFile({
    //             ...selectedFile,
    //             src: downloadURL,
    //             name: fileName,
    //             type: 'image/svg+xml',
    //             textContent: selectedFile.textContent,
    //         });
    //         dispatch(showSuccessToast("SVG uploaded successfully!"));
    //     } catch (error) {
    //         console.error("Error uploading SVG:", error);
    //         dispatch(showErrorToast("Failed to upload SVG to Firebase."));
    //     }
    //     dispatch(toggleLoader(""));
    // };


    const getBase64FromUrl = async () => {
        if (!deployedUrl) {
            dispatch(showErrorToast("Please enter a deployed URL"));
            return;
        }

        dispatch(startLoader("fetchingBase64"));
        try {
            const response = await axios.get(deployedUrl, {
                responseType: 'arraybuffer',
                validateStatus: function (status) {
                    return status >= 200 && status < 300; // default
                },
            });
            const mimeType = response.headers['content-type'];

            let content, base64, dataUrl;

            if (mimeType.includes('svg')) {
                // For SVG files, read as text
                content = new TextDecoder().decode(response.data);
                base64 = btoa(content);
                dataUrl = `data:${mimeType};base64,${base64}`;
            } else {
                // For other image types, process as before
                base64 = Buffer.from(response.data, 'binary').toString('base64');
                dataUrl = `data:${mimeType};base64,${base64}`;
                content = null;
            }


            setSelectedFile({
                ...selectedFile,
                src: dataUrl,
                size: response.data.length,
                type: mimeType,
                name: deployedUrl.split('/').pop() || 'fetchedImage',
                textContent: content,
                compressed: {
                    size: getBase64Length(dataUrl),
                    src: dataUrl
                }
            });
            dispatch(showSuccessToast("Image fetched successfully!"));
        } catch (error) {
            console.error("Error fetching image:", error);
            if (error.response) {
                if (error.response.status === 404) {
                    dispatch(showErrorToast("Image not found. Please check the URL."));
                } else {
                    dispatch(showErrorToast(`Failed to fetch image. Server responded with status ${error.response.status}.`));
                }
            } else if (error.request) {
                dispatch(showErrorToast("No response received from the server. Please check your internet connection."));
            } else {
                dispatch(showErrorToast("An unexpected error occurred while fetching the image."));
            }
        }
        dispatch(stopLoader(""));
    };


    const ImageUploader = ({ icon, text }) => {
        return <Upload
            accept="image/*"
            onChange={handleFileChange}
            showUploadList={false}
        >
            <Button icon={icon} size="large" type="primary">
                {text}
            </Button>
        </Upload>
    }

    const FetchFromUrl = () => {
        return <Flex gap={10}>
            <Input
                placeholder="Enter deployed URL"
                value={deployedUrl}
                onChange={(e) => setDeployedUrl(e.target.value)}
            />
            <Button onClick={getBase64FromUrl} icon={<LuRefreshCcw />}>
                Fetch from URL
            </Button>
        </Flex>
    }

    return (
        <DrawerElement
            title={`${activeDetails.id ? "Update" : "Add"} ${modalData.type}`}
            open={Boolean(modalData.active)}
            onClose={() => onClose({ active: false, data: null, type: "" })}
            footerActions={[
                <Button key="Cancel" icon={<LuX />} type="default" onClick={() => onClose({ active: false, data: null, type: "" })}>Cancel</Button>,
                <>
                    {activeDetails.id && <Popconfirm title="Are you sure to delete" onConfirm={onDelete}>
                        <Button icon={<MdOutlineDelete />} ghost danger type="primary">Dalete</Button>
                    </Popconfirm>}
                </>,
                <Button key="Save" icon={<LuSave />} type="primary" onClick={onSave}>Save</Button>
            ]}
            width={500}
        >
            <Flex vertical gap={20}>
                <Flex gap={20}>
                    <Flex vertical gap={10} style={{ width: "100%" }}>
                        <Text strong>Name</Text>
                        <Input size="large" placeholder={`${modalData.type} name`} value={activeDetails.name} onChange={(e) => onChangeValue('name', e.target.value)} />
                    </Flex>
                    <Flex vertical gap={10} style={{ width: 70 }} >
                        <Text strong>Active</Text>
                        <Switch defaultChecked={activeDetails.active} value={activeDetails.active} onChange={(e) => onChangeValue('active', !activeDetails.active)} />
                    </Flex>
                </Flex>
                {modalData.type == 'Category' ? <>
                    <Flex vertical gap={10} style={{ width: "100%" }}>
                        <Text strong>Business Types</Text>
                        <Select
                            mode="multiple"
                            allowClear
                            style={{ width: '100%' }}
                            placeholder="Select business types"
                            options={BUSINESS_TYPES}
                            value={activeDetails.tags ? activeDetails.tags.split(',') : []}
                            onChange={(values) => onChangeValue('tags', values.join(','))}
                            size="large"
                        />
                    </Flex>
                </> :
                    <Flex vertical gap={10} style={{ width: "100%" }}  >
                        <Text strong>Tags</Text>
                        {Boolean(activeDetails.tags) && <Flex gap={5} wrap="wrap">
                            {activeDetails.tags.split(",").map((tag) => {
                                return <Tag onClick={() => onClickTag(tag)} style={{ fontSize: 14, lineHeight: 2 }} key={tag} >{tag}</Tag>
                            })}
                        </Flex>}
                        <Flex>
                            <Search size="large" onPressEnter={onAddTag} onSearch={onAddTag}
                                defaultValue={tagValue} value={tagValue} onChange={(e) => setTagValue(e.target.value)} enterButton="Add Tag" />
                        </Flex>
                    </Flex>}
                <Flex vertical gap={10} style={{ width: "100%" }}>
                    <Text strong>Preview</Text>
                    {(selectedFile.src || activeDetails.preview) ? <>
                        <Flex className={styles.previewImageWrap} vertical gap={10} align="center" justify="center" style={{ position: "relative" }}>
                            <ImageRenderer src={(selectedFile.src || activeDetails.preview)} width={200} height={200} />
                            {Boolean(selectedFile.src) ? <>
                                <Flex gap={10}>
                                    <Button icon={<LuX />} onClick={() => setSelectedFile(emptyFileData)} >Revert Image</Button>
                                    {selectedFile.type.includes("svg") && <Button icon={<LuPen />} onClick={() => setShowSVGModal(true)} >Edit SVG</Button>}
                                </Flex>
                                <Flex gap={10} vertical>
                                    <Text>File Name: {selectedFile.name}</Text>
                                    <Text>File Size: {(Number(selectedFile.size) / 1024).toFixed()} KB || {selectedFile.type}</Text>
                                </Flex>
                            </> :
                                <Flex vertical gap={10}>
                                    <ImageUploader icon={<LuRefreshCcw />} text="Replace Preview Image" />
                                    {/* <FetchFromUrl /> */}
                                </Flex>
                            }
                        </Flex>
                    </> :
                        <Flex vertical gap={10}>
                            <ImageUploader icon={<LuUpload />} text="Select Preview Image" />
                            {/* <FetchFromUrl /> */}
                        </Flex>
                    }
                </Flex>
            </Flex>
            {/* {Boolean(showSVGModal) && <SVGEditor active={showSVGModal} svgSrc={selectedFile.textContent} onCloseModal={onCloseSvgModal} />} */}
        </DrawerElement>
    )
}

export default DetailsModal
