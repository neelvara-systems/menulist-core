import { UserUploadedFileType } from "@type/common";
import type { InheritanceState } from "@type/multiOutlet.types";
import { removeObjRef } from "@util/utils";
import { Card, Splitter, message as antdMessage } from "antd";
import {
    ExtractedDataItem,
    ItemForDropdown,
    Project,
    ProjectFileType,
} from "../../types";
import { FileImagePreview } from "../components/FileImagePreview";
import EditorContent from "../EditorContent";

interface AdvancedViewProps {
    projectData: Project;
    fileProcessingId: string | null;
    splitterRefs: React.MutableRefObject<any>;
    searchTerm: string;
    filters: any;
    setPreviewFile: (file: ProjectFileType | null) => void;
    confirmFileDeletion: (file: ProjectFileType) => void;
    onRetryTranslations: (file: ProjectFileType) => void;
    setIsDescModalOpen: (state: {
        active: boolean;
        sourceFile?: ProjectFileType;
    }) => void;
    setIsImageModalOpen: (state: {
        active: boolean;
        item?: ExtractedDataItem;
        from?: string;
    }) => void;
    setProjectData: React.Dispatch<React.SetStateAction<Project>>;
    onImageUpload: (
        selectedItem: ItemForDropdown,
        imagesToUpload: UserUploadedFileType[],
    ) => void;
    selectedItemId: string | null;
    setSelectedItemId: (id: string | null) => void;
    // Multi-outlet props
    itemStates?: Record<string, InheritanceState>;
    isMasterLinked?: boolean;
}

export const AdvancedView = ({
    projectData,
    fileProcessingId,
    splitterRefs,
    searchTerm,
    filters,
    setPreviewFile,
    confirmFileDeletion,
    onRetryTranslations,
    setIsDescModalOpen,
    setIsImageModalOpen,
    setProjectData,
    onImageUpload,
    selectedItemId,
    setSelectedItemId,
    // Multi-outlet props
    itemStates,
    isMasterLinked,
}: AdvancedViewProps) => {
    return (
        <>
            {projectData?.files?.map((file: ProjectFileType, index: number) => (
                <Card
                    key={index}
                    size="small"
                    style={{ width: "100%" }}
                    ref={(el: any) => (splitterRefs.current[file.uid] = el)}
                >
                    <Splitter
                        style={{
                            width: "100%",
                            maxHeight: "calc(100vh - 80px)",
                            height: "max-content",
                            overflow: "auto",
                        }}
                    >
                        <Splitter.Panel
                            defaultSize={300}
                            min={300}
                            max="50%"
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                position: "relative",
                            }}
                        >
                            <FileImagePreview
                                file={file}
                                fileProcessingId={fileProcessingId}
                                onPreview={setPreviewFile}
                                onDelete={(file) => {
                                    if (file.extractedData) {
                                        confirmFileDeletion(file);
                                    } else {
                                        antdMessage.info("File cannot be deleted until processed.");
                                    }
                                }}
                                onRetryTranslations={onRetryTranslations}
                                onRetryDescription={(file) =>
                                    setIsDescModalOpen({ active: true, sourceFile: file })
                                }
                            />
                        </Splitter.Panel>
                        <Splitter.Panel style={{ paddingLeft: 10 }}>
                            <EditorContent
                                setIsImageModalOpen={(item: ExtractedDataItem, from?: string) =>
                                    setIsImageModalOpen({
                                        active: true,
                                        item: removeObjRef(item),
                                        from,
                                    })
                                }
                                file={file}
                                setUpdatedFileData={(newData: ProjectFileType) => {
                                    setProjectData((prev) => ({
                                        ...prev,
                                        files: prev.files.map((f) =>
                                            f.uid === newData.uid ? newData : f,
                                        ),
                                    }));
                                }}
                                selectedLanguages={projectData.languages}
                                projectData={projectData}
                                onImageUpload={onImageUpload}
                                searchTerm={searchTerm}
                                filters={filters}
                                selectedItemId={selectedItemId}
                                setSelectedItemId={setSelectedItemId}
                                // Multi-outlet props
                                itemStates={itemStates}
                                isMasterLinked={isMasterLinked}
                            />
                        </Splitter.Panel>
                    </Splitter>
                </Card>
            ))}
        </>
    );
};
