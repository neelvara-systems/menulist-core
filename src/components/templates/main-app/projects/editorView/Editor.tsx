import LoadingMessage from "@antdComponent/loadingMessage";
import { FEATURE_FLAGS } from "@config/features";
import { AI_ACTIONS_TYPES } from "@constant/common";
import { LANGUAGE_CONSTANTS } from "@constant/languages";
import GlobalLanguagesList from "@data/languages";
import { updateProject, updateProjectMetadata } from "@database/projects";
import { useAppDispatch } from "@hook/useAppDispatch";
import { useOfferingLabels } from "@hook/useOfferingLabels";
import { getStoreContextName } from "@lib/businessIdentity/names";
import { getProjectDefaultLanguage } from "@lib/localization/projectContent";
import { resolveProjectForRender } from "@lib/multiOutlet";
import { stripResolvedOutletProjectForSave } from "@lib/multiOutlet/outletProjectPersistence";
import { triggerPosSyncDebounced } from "@lib/posSync/eventBuilder";
import { getCanonicalProjectSourceLanguage } from "@lib/localization/languagePolicy";
import {
    PlatformGlobalDataContext,
    PlatformGlobalDataProviderType,
} from "@providers/platformProviders/platformGlobalDataProvider";
import {
    ProjectsDataContext,
    ProjectsDataProviderType,
} from "@providers/projectsDataProvider";
import { startLoader, stopLoader } from "@reduxSlices/loader";
import { AICapacityError } from "@services/ai/capacityError";
import translateProjectPublicContent from "@services/ai/projectPublicContent/translateProjectPublicContent";
import { UserUploadedFileType } from "@type/common";
import { DEFAULT_OUTLET_POLICY, type InheritanceState, type OutletPolicy } from "@type/multiOutlet.types";
import { isSameObjects, removeObjRef } from "@util/utils";
import {
    message as antdMessage,
    Modal as AntdModal,
    Badge,
    Button,
    Card,
    Flex,
    Image,
    Input,
    message,
    Segmented,
    theme,
    Tooltip,
    Typography
} from "antd";
import {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    LuArrowLeft,
    LuArrowRight,
    LuKeyboard,
    LuLayoutGrid,
    LuLayoutList,
    LuSearch,
} from "react-icons/lu";
import { AUTOSAVE_DEBOUNCE_MS, AUTOSAVE_MIN_INTERVAL_MS } from "../constants";
import {
    ExtractedDataItem,
    ItemForDropdown,
    Project,
    ProjectFileType,
    ProjectMetadata,
    ProjectSummaryData,
} from "../types";
import { associateItemImagesWithProject } from "./utils/associateItemImages";
import { translateFile } from "../utils/translationsUtils";
import AiDisclaimerAlert from "./AiDisclaimerAlert";
import BulkStatusMenuModal from "./BulkStatusMenuModal";
import CommandCenterModal from "./CommandCenterModal";
import DecisionBlocksSettingsModal from "./DecisionBlocksSettingsModal";
import DescriptionGenerationModal from "./DescriptionGenerationModal";
import EditCategoryModal from "./editCategoryModal";
import EditItemModal from "./editItemModal";
import EditorActionsPopover, { EditorAction } from "./EditorActionsPopover";
import EditorFiltersPopover, { EditorFilters } from "./EditorFiltersPopover";
import EditorQualityBanner from "./EditorQualityBanner";
import EditorWelcomeBanner from "./EditorWelcomeBanner";
import {
    NavigableItem,
    useEditorKeyboardShortcuts,
} from "./hooks/useEditorKeyboardShortcuts";
import ImageUploadModal from "./ImageUploadModal";
import KeyboardShortcutsHelp from "./KeyboardShortcutsHelp";
import LanguageSelectorModal from "./LanguageSelectorModal";
import ReorderMenuModal from "./ReorderMenuModal";
import StoreCustomizationModal from "./StoreCustomizationModal";
import { filterItemsWithFiles, ItemWithFile } from "./utils/itemFilters";
import { AdvancedView } from "./views/AdvancedView";
import { FocusView } from "./views/FocusView";
import { TraditionalView } from "./views/TraditionalView";

const { Text } = Typography;

type EditorProps = {
    selectedProject: ProjectMetadata;
    onRemove: (id: string) => void;
    addFileButton: React.ReactNode;
};

function Editor({ selectedProject, onRemove, addFileButton }: EditorProps) {
    const { token } = theme.useToken();
    const labels = useOfferingLabels();
    const [previewFile, setPreviewFile] = useState<ProjectFileType | null>(null);
    const [fileProcessingId, setFileProcessingId] = useState<string | null>(null);
    const splitterRefs = useRef<any>({});
    const [hasChanges, setHasChanges] = useState(false);
    const hasChangesRef = useRef(false);
    const lastAutoSaveRef = useRef<number | null>(null);
    const hasShownConfidenceNudgeRef = useRef(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
    const { tenantDetails, storeDetails, userPermissions, isMasterUser } = useContext<PlatformGlobalDataProviderType>(
        PlatformGlobalDataContext,
    );
    const storeContextName = useMemo(() => getStoreContextName(storeDetails as any, 'Business'), [storeDetails]);
    const { activeProject, setActiveProject, setCurrentView } =
        useContext<ProjectsDataProviderType>(ProjectsDataContext);
    const [projectData, setProjectData] = useState<Project>(
        removeObjRef(activeProject),
    );
    const [isDescModalOpen, setIsDescModalOpen] = useState<{
        active: boolean;
        sourceFile?: ProjectFileType;
    }>({ active: false, sourceFile: undefined });
    const [isImageModalOpen, setIsImageModalOpen] = useState<{
        active: boolean;
        item: ExtractedDataItem | null;
        from?: string;
    }>({ active: false, item: null });
    const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
    const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
    const [isDecisionBlocksModalOpen, setIsDecisionBlocksModalOpen] =
        useState(false);
    const [isStoreCustomizationModalOpen, setIsStoreCustomizationModalOpen] =
        useState(false);
    const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
    const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
    const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const showItemPrices = projectData?.config?.design?.menu?.showItemPrices ?? true;

    // Multi-outlet state (Feature #4)
    const [itemStates, setItemStates] = useState<
        Record<string, InheritanceState>
    >({});
    const [categoryStates, setCategoryStates] = useState<
        Record<string, InheritanceState>
    >({});
    const [masterPrices, setMasterPrices] = useState<Record<string, string>>({});
    const [isMasterLinked, setIsMasterLinked] = useState(false);
    const [masterProjectLanguages, setMasterProjectLanguages] = useState<string[]>([]);
    const outletPolicy = useMemo<OutletPolicy | null>(() => {
        if (!isMasterLinked || isMasterUser) return null;
        return {
            ...DEFAULT_OUTLET_POLICY,
            ...((userPermissions as any)?.outletPolicy || {}),
        };
    }, [isMasterLinked, isMasterUser, userPermissions]);

    const [translationProgress, setTranslationProgress] = useState<
        { currentFile: number; totalFiles: number; fileName?: string } | undefined
    >();
    const cancelTranslationRef = useRef(false);

    // Refs for keyboard shortcuts
    const searchInputRef = useRef<any>(null);

    // Search and Filter state
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState<EditorFilters>({
        category: null,
        priceRange: { min: null, max: null },
        hasImage: null,
        activeStatus: null,
        timeSlotPreset: null,
    });

    // View mode state
    const [editorView, setEditorView] = useState<
        "advanced" | "traditional" | "focus"
    >("advanced");

    // Wrapper functions to fix type mismatch between Dispatch and simple function signatures
    const handleSetIsDescModalOpen = (state: {
        active: boolean;
        sourceFile?: ProjectFileType;
    }) => setIsDescModalOpen(state);
    const handleSetIsImageModalOpen = (state: {
        active: boolean;
        item?: ExtractedDataItem;
        from?: string;
    }) => setIsImageModalOpen(state as any);

    const dispatch = useAppDispatch();

    // Detect unsaved changes
    useEffect(() => {
        const comparableProjectData = projectData?.masterProjectId
            ? stripResolvedOutletProjectForSave(projectData, activeProject)
            : projectData;
        const changesFound = !isSameObjects(activeProject, comparableProjectData);
        setHasChanges(changesFound);
        hasChangesRef.current = changesFound;
    }, [activeProject, projectData]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (hasChanges) {
                event.preventDefault();
                event.returnValue = "";
            }
        };
        if (hasChanges) {
            window.addEventListener("beforeunload", handleBeforeUnload);
        } else {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        }

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [hasChanges]);

    useEffect(() => {
        if (fileProcessingId && splitterRefs.current[fileProcessingId]) {
            splitterRefs.current[fileProcessingId]?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }
    }, [fileProcessingId]);

    useEffect(() => {
        if ((!activeProject?.files || activeProject.files.length === 0) && !activeProject?.masterProjectId) {
            setCurrentView(1);
        } else {
            setProjectData(removeObjRef(activeProject));
        }

        if (!activeProject?.masterProjectId) {
            setIsMasterLinked(false);
            setItemStates({});
            setCategoryStates({});
            setMasterProjectLanguages([]);
            setMasterPrices({});
        }
    }, [activeProject]);

    // Multi-outlet: Load resolved project data for inheritance states
    // Uses activeProject from context (already fetched) - only fetches master if linked
    useEffect(() => {
        if (
            !FEATURE_FLAGS.ENABLE_MULTI_OUTLET ||
            !activeProject?.projectId ||
            !activeProject?.masterProjectId
        )
            return;

        const loadResolvedProject = async () => {
            try {
                // Pass existing project data to avoid redundant Firestore reads
                const resolved = await resolveProjectForRender({
                    storeProject: activeProject,
                });
                if (resolved._resolved) {
                    setIsMasterLinked(resolved._resolved.isMasterLinked);
                    setItemStates(resolved._resolved.itemStates || {});
                    setCategoryStates(resolved._resolved.categoryStates || {});
                    setMasterProjectLanguages(resolved._resolved.masterProjectLanguages || []);
                    setMasterPrices(resolved._resolved.masterPrices || {});
                }
                setProjectData(removeObjRef(resolved));
            } catch (error) {
                console.error("[Multi-outlet] Failed to load resolved project:", error);
            }
        };

        loadResolvedProject();
    }, [activeProject]);

    let totalCategories = 0;
    let totalItems = 0;

    projectData?.files?.forEach((file) => {
        if (file.extractedData?.data) {
            const { categories, items } = file.extractedData.data;
            totalCategories += categories?.length || 0;
            totalItems += items?.length || 0;
        }
    });

    const onContinueClick = async () => {
        const validationErrors = validateProject(projectData);

        // Publish-Gate: Run MCE validation if enabled (separate from MCE core which is silent)
        // MCE core stamps _mce metadata silently on every save.
        // Publish-Gate is the ONLY place owner sees validation feedback.
        // @see __docs__/menu-correctness-engine/menu-correctness-engine_impl.md §2.4
        if (FEATURE_FLAGS.ENABLE_MCE) {
            try {
                const { mceValidate } = await import("@lib/mce");
                const mceResult = mceValidate({
                    projectData: projectData as Record<string, any>,
                    isOutlet: !!projectData.masterProjectId,
                    masterProjectId: projectData.masterProjectId,
                });

                if (!mceResult.verified) {
                    for (const error of mceResult.errors) {
                        validationErrors.push(error.message);
                    }
                }
            } catch (e) {
                // Silent fail — Publish-Gate failure never blocks owner
                console.warn("[MCE Publish-Gate] Validation failed (non-blocking):", e);
            }
        }

        if (validationErrors.length > 0) {
            AntdModal.error({
                title: "Please fix these issues before continuing",
                content: (
                    <ul>
                        {validationErrors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                        ))}
                    </ul>
                ),
            });
            return;
        }

        // Quality Signals Publish Intercept — soft suggestion, NEVER blocks publishing
        // Shows actionable signals before publishing so owner can fix them first
        if (FEATURE_FLAGS.ENABLE_MENU_QUALITY_SIGNALS) {
            try {
                const { computeQualitySignals, getActionableSignals } = await import("@lib/mce/qualitySignals");
                const signals = computeQualitySignals(projectData.files, projectData.languages, {
                    projectPublicContent: projectData,
                    showCategoryIcons: projectData?.config?.design?.menu?.showCategoryIcons ?? true,
                    showItemPrices,
                });
                const actionable = getActionableSignals(signals);
                if (actionable.length > 0) {
                    const proceed = await new Promise<boolean>((resolve) => {
                        AntdModal.confirm({
                            title: "Before publishing",
                            content: (
                                <ul style={{ paddingLeft: 16, margin: '8px 0' }}>
                                    {actionable.map((s) => (
                                        <li key={s.id} style={{ marginBottom: 4 }}>
                                            {s.label}
                                            {s.helpText && (
                                                <div style={{ fontSize: 12, color: '#888' }}>{s.helpText}</div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ),
                            okText: "Publish Anyway",
                            cancelText: "Go Back",
                            onOk: () => resolve(true),
                            onCancel: () => resolve(false),
                        });
                    });
                    if (!proceed) return;
                }
            } catch {
                // Silent fail — quality signals never block publish
            }
        }

        await syncChanges();
        setCurrentView(3);
    };

    const onBackClick = async () => {
        await syncChanges();
        setCurrentView(1);
    };

    const validateProject = (data: Project): string[] => {
        const errors: string[] = [];
        const activeLang = data.languages?.[0] || "en";

        data.files?.forEach((file, fileIndex) => {
            const fileLabel = file.name || `File ${fileIndex + 1}`;
            const items = file.extractedData?.data?.items || [];

            items.forEach((item, itemIndex) => {
                const itemName = item.name?.[activeLang] || "";
                const itemLabel = itemName || `Item ${itemIndex + 1}`;

                if (!itemName) {
                    errors.push(
                        `${fileLabel} → ${itemLabel}: Name is required (${activeLang})`,
                    );
                }
                if (!item.category) {
                    errors.push(`${fileLabel} → ${itemLabel}: Category is required`);
                }
                if (typeof item.price === "number" && item.price < 0) {
                    errors.push(`${fileLabel} → ${itemLabel}: Price cannot be negative`);
                }
            });
        });

        return errors;
    };

    const getProjectWithLinkedFieldOverrides = useCallback((data: Project) => {
        if (!data?.masterProjectId) return data;

        const updatedProject = removeObjRef(data);
        if (outletPolicy?.imageOverride !== true && outletPolicy?.descriptionOverride !== true) {
            return updatedProject;
        }

        const nextItemOverrides = {
            ...(updatedProject.overrides?.items || {}),
        };

        updatedProject.files?.forEach((file: any) => {
            file.extractedData?.data?.items?.forEach((item: any) => {
                const inheritanceState = itemStates[item.id];
                if (inheritanceState !== 'inherited' && inheritanceState !== 'overridden') return;

                nextItemOverrides[item.id] = {
                    ...(nextItemOverrides[item.id] || {}),
                    ...(outletPolicy?.imageOverride === true && Array.isArray(item.images) ? { images: item.images } : {}),
                    ...(outletPolicy?.descriptionOverride === true && item.description ? { description: item.description } : {}),
                };
            });
        });

        updatedProject.overrides = {
            items: nextItemOverrides,
            categories: updatedProject.overrides?.categories || {},
            attributes: updatedProject.overrides?.attributes || {},
        };

        return updatedProject;
    }, [itemStates, outletPolicy?.descriptionOverride, outletPolicy?.imageOverride]);

    const getProjectForPersistence = useCallback((data: Project) => (
        data?.masterProjectId
            ? stripResolvedOutletProjectForSave(getProjectWithLinkedFieldOverrides(data), activeProject)
            : data
    ), [activeProject, getProjectWithLinkedFieldOverrides]);

    const persistEditorProject = useCallback(async (data: Project) => {
        const projectToSave = getProjectForPersistence(data);
        return updateProject({
            ...projectToSave,
            projectId: data.projectId || activeProject?.projectId,
        });
    }, [activeProject?.projectId, getProjectForPersistence]);

    const applyPersistedEditorProject = useCallback((displayProject: Project, persistedProject?: Project | null) => {
        const cleanDisplayProject = removeObjRef(displayProject);
        const cleanPersistedProject = removeObjRef(persistedProject || getProjectForPersistence(displayProject));
        setProjectData(displayProject.masterProjectId ? cleanDisplayProject : cleanPersistedProject);
        setActiveProject(cleanPersistedProject);
        setHasChanges(false);
        hasChangesRef.current = false;
    }, [getProjectForPersistence, setActiveProject]);

    // Helper function to get all unique categories from all files
    const getAllCategories = () => {
        const categories =
            projectData?.files?.flatMap(
                (file) => file.extractedData?.data?.categories || [],
            ) || [];

        // Remove duplicates based on id
        const uniqueCategories: any[] = [];
        const seenIds = new Set();

        for (const category of categories) {
            if (!seenIds.has(category.id)) {
                seenIds.add(category.id);
                uniqueCategories.push(category);
            }
        }

        return uniqueCategories;
    };

    const syncChanges = useCallback(
        async (updatedData: Project = projectData) => {
            const projectToSave = updatedData?.masterProjectId
                ? stripResolvedOutletProjectForSave(updatedData, activeProject)
                : updatedData;
            // Only sync when there are real changes to avoid unnecessary writes
            if (!activeProject || isSameObjects(activeProject, projectToSave)) {
                return;
            }

            setIsSaving(true);
            dispatch(startLoader("syncing changes"));
            try {
                const updatedProject = await updateProject({
                    ...projectToSave,
                    projectId: selectedProject.projectId,
                });
                if (updatedProject) {
                    setHasChanges(false);
                    hasChangesRef.current = false;
                    setProjectData(updatedData.masterProjectId ? updatedData : updatedProject);
                    setActiveProject(updatedProject);
                    setLastSavedAt(Date.now());
                    triggerPosSyncDebounced(
                        storeDetails?.storeId,
                        storeDetails?.tenantId,
                        selectedProject.projectId,
                        storeDetails?.posSync,
                    );

                    // Behavior Engineering: One-time confidence reinforcement per editor session.
                    // Reinforces Loop 2 ("Update Once, Done Everywhere") — owner sees that
                    // saving automatically updates what customers see via their link.
                    // @see __docs__/behavior-engineering/behavior-engineering_spec.md §Loop 2
                    if (
                        FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES &&
                        !hasShownConfidenceNudgeRef.current
                    ) {
                        hasShownConfidenceNudgeRef.current = true;
                        antdMessage.info({
                            content: 'Saved. Customers with your link see the latest.',
                            duration: 3,
                        });
                    }
                }
            } catch (error) {
                console.error("Syncing changes failed:", error);
            } finally {
                dispatch(stopLoader("syncing changes"));
                setIsSaving(false);
            }
        },
        [
            activeProject,
            dispatch,
            projectData,
            selectedProject.projectId,
            setActiveProject,
        ],
    );

    const handleRepairProjectPublicContent = useCallback(() => {
        if (!projectData?.projectId) return;

        AntdModal.confirm({
            title: 'Repair project details?',
            content: 'This will fill missing project name, description, and note translations. Existing text stays unchanged.',
            okText: 'Repair',
            cancelText: 'Cancel',
            onOk: async () => {
                setIsSaving(true);
                dispatch(startLoader('repairing project details'));
                try {
                    const updated = removeObjRef(projectData);
                    const translatedProjectContent = await translateProjectPublicContent({
                        projectDetails: updated,
                        projectId: updated.projectId,
                        storeDetails,
                    });

                    if (!translatedProjectContent) {
                        message.info('No missing project detail translations found.');
                        return;
                    }

                    const projectMetadataTranslationUpdate: Partial<ProjectSummaryData> = {};

                    if (translatedProjectContent.name) {
                        updated.name = translatedProjectContent.name as any;
                        projectMetadataTranslationUpdate.name = translatedProjectContent.name;
                    }
                    if (translatedProjectContent.description) {
                        updated.description = translatedProjectContent.description as any;
                        projectMetadataTranslationUpdate.description = translatedProjectContent.description;
                    }
                    if (translatedProjectContent.specialNote) {
                        updated.menuSettings = {
                            ...(updated.menuSettings || {}),
                            specialNote: translatedProjectContent.specialNote,
                        };
                    }
                    if (translatedProjectContent.specialMenuDisplayName) {
                        updated._specialMenu = {
                            ...(updated._specialMenu || {}),
                            displayName: translatedProjectContent.specialMenuDisplayName,
                        };
                        (updated as any).specialMenuDisplayName = translatedProjectContent.specialMenuDisplayName;
                        projectMetadataTranslationUpdate.specialMenuDisplayName = translatedProjectContent.specialMenuDisplayName;
                    }

                    const savedProject = await updateProject({ ...updated, projectId: updated.projectId });
                    if (Object.keys(projectMetadataTranslationUpdate).length > 0) {
                        await updateProjectMetadata(updated.projectId, projectMetadataTranslationUpdate);
                    }

                    const nextProject = removeObjRef(savedProject || updated);
                    setProjectData(nextProject);
                    setActiveProject(nextProject);
                    setHasChanges(false);
                    hasChangesRef.current = false;
                    message.success('Project detail translations added.');
                } catch (error) {
                    if (error instanceof AICapacityError) {
                        message.info('Get more enhancements to continue. Visit Billing to add an enhancement pack.');
                    } else {
                        message.error('Could not repair project details.');
                    }
                } finally {
                    dispatch(stopLoader('repairing project details'));
                    setIsSaving(false);
                }
            },
        });
    }, [dispatch, projectData, setActiveProject, storeDetails]);

    // ============================
    // FILTERED ITEMS FOR KEYBOARD NAVIGATION
    // Uses shared filter utility - single source of truth
    // ============================
    const filteredItemsForNavigation = useMemo((): NavigableItem[] => {
        const allItems: ItemWithFile[] = [];
        const defaultLang = getProjectDefaultLanguage(projectData, storeDetails);
        const categoryActiveById: Record<string, boolean> = {};

        // Collect all items with file references
        projectData?.files?.forEach((file) => {
            file.extractedData?.data?.categories?.forEach((category) => {
                categoryActiveById[category.id] = category.active !== false;
            });
            file.extractedData?.data?.items?.forEach((item) => {
                allItems.push({ item, file });
            });
        });

        // Apply filters using shared utility
        return filterItemsWithFiles(allItems, {
            searchTerm,
            filters,
            activeLanguage: defaultLang,
            categoryActiveById,
        });
    }, [projectData, searchTerm, filters]);

    // ============================
    // KEYBOARD SHORTCUTS (extracted to hook)
    // Toggle via: FEATURE_FLAGS.ENABLE_EDITOR_KEYBOARD_SHORTCUTS in @config/features.ts
    // ============================
    const {
        selectedItemId,
        setSelectedItemId,
        selectedCategoryId: keyboardSelectedCategoryId,
        editCategoryModalState,
        setEditCategoryModalState,
        editItemModalState,
        setEditItemModalState,
        handleModalFileUpdate,
    } = useEditorKeyboardShortcuts({
        enabled: FEATURE_FLAGS.ENABLE_EDITOR_KEYBOARD_SHORTCUTS,
        projectData,
        setProjectData,
        isSaving,
        syncChanges,
        searchInputRef,
        editorView,
        setEditorView,
        filteredItems: filteredItemsForNavigation,
        setIsLanguageModalOpen,
        setIsDescModalOpen: handleSetIsDescModalOpen,
        setIsImageModalOpen: (state) => setIsImageModalOpen(state),
        setIsBulkStatusModalOpen,
        setIsReorderModalOpen,
        setIsShortcutsHelpOpen,
    });

    // ============================
    // AUTO-SAVE (view 2 editor)
    // ============================

    useEffect(() => {
        // If there are no changes, do nothing
        if (!hasChanges) return;

        const now = Date.now();
        const last = lastAutoSaveRef.current;
        const timeSinceLast = last ? now - last : Number.POSITIVE_INFINITY;

        // Compute when to run the next auto-save:
        // - wait for AUTOSAVE_DEBOUNCE_MS after last change
        // - but also respect AUTOSAVE_MIN_INTERVAL_MS between writes
        const baseDelay = AUTOSAVE_DEBOUNCE_MS;
        const minIntervalDelay =
            timeSinceLast >= AUTOSAVE_MIN_INTERVAL_MS
                ? 0
                : AUTOSAVE_MIN_INTERVAL_MS - timeSinceLast;

        const delay = Math.max(baseDelay, minIntervalDelay);

        const timeoutId = window.setTimeout(async () => {
            // Re-check latest flag to avoid saving after changes were already synced
            if (!hasChangesRef.current) return;

            await syncChanges();
            lastAutoSaveRef.current = Date.now();
        }, delay);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [projectData, hasChanges]);

    const handleLanguageToggle = async (
        updatedLanguages: NonNullable<Project["languages"]>,
    ) => {
        try {
            // Defensive check: Prevent exceeding MAX_LANGUAGES_PER_PROJECT
            if (updatedLanguages.length > LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT) {
                antdMessage.warning(
                    `Maximum ${LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT} languages allowed per project.`
                );
                return;
            }

            let prevData = removeObjRef(projectData);
            const projectMetadataTranslationUpdate: Partial<ProjectSummaryData> = {};
            const newLanguages = updatedLanguages.filter(
                (lang) => !prevData.languages?.includes(lang),
            );
            const removedLanguages =
                prevData.languages?.filter(
                    (lang) => !updatedLanguages.includes(lang),
                ) || [];

            prevData.languages = updatedLanguages;

            if (newLanguages.length > 0) {
                // Start translation with progress tracking
                setIsTranslating(true);
                cancelTranslationRef.current = false;
                const totalFiles =
                    prevData.files?.filter((f) => f.extractedData?.data)?.length || 0;

                const sourceLanguage = getCanonicalProjectSourceLanguage(prevData.languages);
                const sourceLang = GlobalLanguagesList.find(
                    (lang) => lang.code === sourceLanguage,
                );
                const languageToAdd = newLanguages[0];
                const targetLang = GlobalLanguagesList.find(
                    (lang) => lang.code === languageToAdd,
                );

                let wasCancelled = false;
                if (prevData.files) {
                    let fileIndex = 0;
                    for (const file of prevData.files) {
                        // Check if cancelled
                        if (cancelTranslationRef.current) {
                            wasCancelled = true;
                            break;
                        }

                        if (file.extractedData?.data) {
                            fileIndex++;
                            setTranslationProgress({
                                currentFile: fileIndex,
                                totalFiles,
                                fileName: file.name || `File ${fileIndex}`,
                            });

                            file.extractedData.data.languages = [
                                ...file.extractedData.data.languages,
                                { code: targetLang?.code, name: targetLang?.name },
                            ];
                            setFileProcessingId(file.uid);
                            const {
                                updatedProject,
                                message: resultMessage,
                                messageType,
                            } = await translateFile(
                                prevData,
                                file,
                                targetLang,
                                sourceLang,
                                AI_ACTIONS_TYPES.LANGUAGE_ADDITION,
                                // Multi-outlet: Pass governance to filter out inherited items
                                isMasterLinked ? { itemStates, categoryStates } : undefined
                            );
                            if (messageType === "error" && resultMessage) {
                                antdMessage.error(resultMessage);
                            }
                            prevData = updatedProject;
                            if (isMasterLinked) {
                                setProjectData(removeObjRef(updatedProject));
                            } else {
                                setActiveProject(updatedProject);
                            }
                            setFileProcessingId(null);
                        }
                    }
                }

                setIsTranslating(false);
                setTranslationProgress(undefined);

                if (wasCancelled) {
                    antdMessage.warning(
                        "Translation cancelled. Partial translations saved.",
                    );
                }

                if (!wasCancelled) {
                    const translatedProjectContent = await translateProjectPublicContent({
                        projectDetails: prevData,
                        projectId: prevData.projectId,
                        storeDetails,
                        targetLanguageCodes: newLanguages,
                    });

                    if (translatedProjectContent) {
                        if (translatedProjectContent.name) {
                            prevData.name = translatedProjectContent.name as any;
                            projectMetadataTranslationUpdate.name = translatedProjectContent.name;
                        }
                        if (translatedProjectContent.description) {
                            prevData.description = translatedProjectContent.description as any;
                            projectMetadataTranslationUpdate.description = translatedProjectContent.description;
                        }
                        if (translatedProjectContent.specialNote) {
                            prevData.menuSettings = {
                                ...(prevData.menuSettings || {}),
                                specialNote: translatedProjectContent.specialNote,
                            };
                        }
                        if (translatedProjectContent.specialMenuDisplayName) {
                            prevData._specialMenu = {
                                ...(prevData._specialMenu || {}),
                                displayName: translatedProjectContent.specialMenuDisplayName,
                            };
                            (prevData as any).specialMenuDisplayName = translatedProjectContent.specialMenuDisplayName;
                            projectMetadataTranslationUpdate.specialMenuDisplayName = translatedProjectContent.specialMenuDisplayName;
                        }
                    }
                }
            }

            // Save to database
            const persistedProject = await persistEditorProject(prevData);
            if (Object.keys(projectMetadataTranslationUpdate).length > 0) {
                await updateProjectMetadata(prevData.projectId, projectMetadataTranslationUpdate);
            }
            applyPersistedEditorProject(prevData, persistedProject || undefined);
            setIsLanguageModalOpen(false);

            if (newLanguages.length > 0) {
                antdMessage.success("Language added and translations saved!");
            } else if (removedLanguages.length > 0) {
                antdMessage.success("Language removed successfully!");
            }
        } catch (error) {
            setIsTranslating(false);
            setTranslationProgress(undefined);
            if (error instanceof AICapacityError) {
                antdMessage.info('Get more enhancements to continue. Visit Billing to add an enhancement pack.');
            } else {
                antdMessage.error("Translation failed. Please try again.");
                console.error("Translation failed:", error);
            }
        }
    };

    const handleCancelTranslation = () => {
        cancelTranslationRef.current = true;
    };

    const onRetryTranslations = async (file: any) => {
        try {
            let prevData = removeObjRef(projectData);
            const sourceLanguage = getCanonicalProjectSourceLanguage(projectData.languages);
            const sourceLang = GlobalLanguagesList.find(
                (lang) => lang.code === sourceLanguage,
            );
            dispatch(startLoader("retrying translations"));

            // Skip primary language (index 0) — it's the source, not a translation target
            for (const lang of projectData.languages.slice(1)) {
                const targetLanguage = GlobalLanguagesList.find(
                    (gl) => gl.code === lang,
                );
                if (targetLanguage) {
                    setFileProcessingId(file.uid);
                    const {
                        updatedProject,
                        message: resultMessage,
                        messageType,
                    } = await translateFile(
                        prevData,
                        file,
                        targetLanguage,
                        sourceLang,
                        AI_ACTIONS_TYPES.IMAGE_TRANSLATION,
                        // Multi-outlet: Pass governance to filter out inherited items
                        isMasterLinked ? { itemStates, categoryStates } : undefined
                    );
                    if (messageType && resultMessage) {
                        antdMessage[messageType as "success" | "error" | "warning"](
                            resultMessage,
                        );
                    }
                    prevData = updatedProject;
                    if (isMasterLinked) {
                        setProjectData(removeObjRef(updatedProject));
                    } else {
                        setActiveProject(updatedProject);
                    }
                    setFileProcessingId(null);
                }
            }

            // Save to database
            const persistedProject = await persistEditorProject(prevData);
            dispatch(stopLoader("retrying translations"));
            applyPersistedEditorProject(prevData, persistedProject || undefined);
            antdMessage.success("Translations updated and saved!");
        } catch (error) {
            if (error instanceof AICapacityError) {
                antdMessage.info('Get more enhancements to continue. Visit Billing to add an enhancement pack.');
            } else {
                antdMessage.error("Something went wrong, please try again!");
                console.error("Translation failed:", error);
            }
            dispatch(stopLoader("retrying translations"));
        }
    };

    const confirmFileDeletion = (file: ProjectFileType) => {
        AntdModal.confirm({
            title: "Delete processed image?",
            content:
                "This image has already been processed and tokens may have been used. Are you sure you want to delete it? This action only removes it locally until you save.",
            okText: "Yes, delete",
            okType: "danger",
            cancelText: "No, keep it",
            onOk: () => {
                onRemove(file.uid); // Call the existing remove handler
            },
        });
    };

    const onImageUpload = async (
        selectedItem: ItemForDropdown,
        imagesToUpload: UserUploadedFileType[],
    ) => {
        dispatch(startLoader("associating image"));
        const updatedProjectData = await associateItemImagesWithProject(
            projectData,
            selectedItem,
            imagesToUpload,
        );

        if (updatedProjectData) {
            const persistedProject = await persistEditorProject({
                ...updatedProjectData,
                projectId: activeProject.projectId,
            });
            applyPersistedEditorProject(updatedProjectData, persistedProject || undefined);
            message.success("Image added successfully!");
            dispatch(stopLoader("associating image"));
        } else {
            dispatch(stopLoader("associating image"));
            message.error("Failed to add image");
        }
    };

    const handleActionClick = (action: EditorAction) => {
        switch (action) {
            case "language":
                if (projectData?.masterProjectId && outletPolicy?.canAddLanguages === false) {
                    antdMessage.info("Language changes are not enabled for this store.");
                    return;
                }
                setIsLanguageModalOpen(true);
                break;
            case "description":
                setIsDescModalOpen({ active: true });
                break;
            case "images":
                setIsImageModalOpen({ active: true, item: null });
                break;
            case "activeInactive":
                setIsBulkStatusModalOpen(true);
                break;
            case "reorder":
                setIsReorderModalOpen(true);
                break;
            case "decisionBlocks":
                setIsDecisionBlocksModalOpen(true);
                break;
            case "storeCustomization":
                setIsStoreCustomizationModalOpen(true);
                break;
            case "commandCenter":
                setIsCommandCenterOpen(true);
                break;
        }
    };

    return (
        <Flex vertical style={{ width: "100%", paddingBottom: 24, height: "100%" }}>
            <LoadingMessage open={Boolean(fileProcessingId)} />
            <EditorWelcomeBanner isMasterLinked={isMasterLinked} />
            <Card
                size="small"
                styles={{
                    body: {
                        padding: "0px",
                        maxHeight: "calc(100vh - 100px)",
                        overflow: "auto",
                    },
                }}
            >
                <Flex
                    style={{
                        width: "100%",
                        position: "sticky",
                        top: 0,
                        zIndex: 9,
                        background: token.colorBgBase,
                        padding: "10px",
                    }}
                >
                    {/* Single Row: Back, Add File, Search, Filter on left | View Switcher & Actions on right */}
                    <Flex
                        gap={8}
                        align="center"
                        justify="space-between"
                        style={{ flex: 1 }}
                    >
                        <Flex gap={8}>
                            <Button
                                shape="circle"
                                icon={<LuArrowLeft />}
                                onClick={onBackClick}
                            />
                            {addFileButton}
                            <Input
                                ref={searchInputRef}
                                placeholder="Search items, categories, or descriptions..."
                                prefix={
                                    <LuSearch style={{ color: token.colorTextPlaceholder }} />
                                }
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                allowClear
                                width={340}
                                style={{ flex: 1, maxWidth: 340, minWidth: 340 }}
                            />
                            <EditorFiltersPopover
                                categories={getAllCategories()}
                                activeLanguage={getProjectDefaultLanguage(projectData, storeDetails)}
                                filters={filters}
                                onFiltersChange={setFilters}
                                showItemPrices={showItemPrices}
                            />
                        </Flex>
                        <Flex gap={8}>
                            <Segmented
                                value={editorView}
                                onChange={(value) =>
                                    setEditorView(value as "advanced" | "traditional" | "focus")
                                }
                                options={[
                                    {
                                        label: (
                                            <Tooltip title="Advanced View - Side-by-side image and editor (Ctrl+\\)">
                                                <div style={{ padding: "4px 8px" }}>
                                                    <LuLayoutGrid size={16} />
                                                </div>
                                            </Tooltip>
                                        ),
                                        value: "advanced",
                                    },
                                    {
                                        label: (
                                            <Tooltip title="Traditional View - Category-based editing (Ctrl+\\)">
                                                <div style={{ padding: "4px 8px" }}>
                                                    <LuLayoutList size={16} />
                                                </div>
                                            </Tooltip>
                                        ),
                                        value: "traditional",
                                    },
                                    // TODO: Enable Focus Mode in future
                                    // {
                                    //     label: (
                                    //         <Tooltip title="Focus Mode - Full-width tabs">
                                    //             <div style={{ padding: '4px 8px' }}>
                                    //                 <LuMaximize2 size={16} />
                                    //             </div>
                                    //         </Tooltip>
                                    //     ),
                                    //     value: 'focus'
                                    // }
                                ]}
                            />
                            <EditorActionsPopover onActionClick={handleActionClick} isMasterLinked={isMasterLinked} />
                            {FEATURE_FLAGS.ENABLE_EDITOR_KEYBOARD_SHORTCUTS && (
                                <Tooltip title="Keyboard Shortcuts (Shift+?)">
                                    <Button
                                        icon={<LuKeyboard />}
                                        onClick={() => setIsShortcutsHelpOpen(true)}
                                    ></Button>
                                </Tooltip>
                            )}
                        </Flex>
                    </Flex>
                </Flex>

                {/* Quality Signals Banner */}
                <EditorQualityBanner
                    projectData={projectData}
                    onAction={(actionRoute) => {
                        if (actionRoute === 'descriptions') {
                            setIsDescModalOpen({ active: true, sourceFile: projectData?.files?.[0] });
                        } else if (actionRoute === 'images') {
                            // Scroll to first item missing image — for now just focus editor
                        } else if (actionRoute === 'projectContent') {
                            handleRepairProjectPublicContent();
                        }
                    }}
                />

                {/* Conditional View Rendering */}
                {editorView === "advanced" && (
                    <AdvancedView
                        projectData={projectData}
                        fileProcessingId={fileProcessingId}
                        splitterRefs={splitterRefs}
                        searchTerm={searchTerm}
                        filters={filters}
                        setPreviewFile={setPreviewFile}
                        confirmFileDeletion={confirmFileDeletion}
                        onRetryTranslations={onRetryTranslations}
                        setIsDescModalOpen={handleSetIsDescModalOpen}
                        setIsImageModalOpen={handleSetIsImageModalOpen}
                        setProjectData={setProjectData}
                        onImageUpload={onImageUpload}
                        selectedItemId={selectedItemId}
                        setSelectedItemId={setSelectedItemId}
                        itemStates={itemStates}
                        isMasterLinked={isMasterLinked}
                    />
                )}

                {editorView === "traditional" && (
                    <TraditionalView
                        projectData={projectData}
                        searchTerm={searchTerm}
                        filters={filters}
                        setIsImageModalOpen={handleSetIsImageModalOpen}
                        setProjectData={setProjectData}
                        onImageUpload={onImageUpload}
                        setPreviewFile={setPreviewFile}
                        selectedItemId={selectedItemId}
                        setSelectedItemId={setSelectedItemId}
                        keyboardSelectedCategoryId={keyboardSelectedCategoryId}
                        itemStates={itemStates}
                        isMasterLinked={isMasterLinked}
                    />
                )}

                {editorView === "focus" && (
                    <FocusView
                        projectData={projectData}
                        fileProcessingId={fileProcessingId}
                        searchTerm={searchTerm}
                        filters={filters}
                        setPreviewFile={setPreviewFile}
                        confirmFileDeletion={confirmFileDeletion}
                        onRetryTranslations={onRetryTranslations}
                        setIsDescModalOpen={handleSetIsDescModalOpen}
                        setIsImageModalOpen={handleSetIsImageModalOpen}
                        setProjectData={setProjectData}
                        onImageUpload={onImageUpload}
                        itemStates={itemStates}
                        isMasterLinked={isMasterLinked}
                    />
                )}
            </Card>

            <AiDisclaimerAlert />

            {previewFile && (
                <Image
                    alt={previewFile.name}
                    src={previewFile.url}
                    style={{ display: "none" }}
                    preview={{
                        onVisibleChange: (visible) => {
                            if (!visible) setPreviewFile(null);
                        },
                        visible: true,
                        src: previewFile.url,
                    }}
                />
            )}
            <Flex
                justify="center"
                align="center"
                style={{
                    zIndex: 14,
                    position: "fixed",
                    width: "max-content",
                    right: "50%",
                    transform: "translateX(50%)",
                    bottom: 24,
                    background: token.colorBgContainer,
                    padding: "8px 12px",
                    borderRadius: 8,
                    boxShadow: token.boxShadow,
                }}
            >
                {/* Save status indicator - Enhanced with Badge for better visibility */}
                <Flex align="center" gap={8} style={{ marginRight: 12 }}>
                    <Badge
                        status={isSaving ? "processing" : hasChanges ? "warning" : "success"}
                        text={
                            <Text
                                type={hasChanges ? "warning" : "secondary"}
                                style={{ fontSize: 12 }}
                            >
                                {isSaving
                                    ? "Saving…"
                                    : hasChanges
                                        ? "Unsaved changes"
                                        : "All changes saved"}
                            </Text>
                        }
                    />
                    {lastSavedAt && !isSaving && !hasChanges && (
                        <Tooltip title={`Last saved at ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Visible to customers now`}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Live
                            </Text>
                        </Tooltip>
                    )}
                </Flex>

                <Tooltip title="Save & Continue">
                    <Button
                        disabled={isSaving}
                        onClick={onContinueClick}
                        type="primary"
                        icon={<LuArrowRight />}
                        shape="round"
                        size="large"
                    >
                        {tenantDetails?.businessEntityType == "B2B"
                            ? "View JSON"
                            : `View ${labels.offeringTitle}`}
                    </Button>
                </Tooltip>
            </Flex>

            <DescriptionGenerationModal
                businessType={tenantDetails?.businessType}
                modalData={isDescModalOpen}
                onClose={() => setIsDescModalOpen({ active: false })}
                setFileProcessingId={setFileProcessingId}
                setActiveProject={setActiveProject}
                setProjectData={setProjectData}
                setHasChanges={setHasChanges}
                persistProject={persistEditorProject}
                projectData={projectData}
                // Multi-outlet: Pass governance for description generation filtering
                itemStates={isMasterLinked ? itemStates : undefined}
                isMasterLinked={isMasterLinked}
                allowInheritedDescriptionOverride={outletPolicy?.descriptionOverride === true}
            />

            <ImageUploadModal
                open={isImageModalOpen.active}
                onClose={() => setIsImageModalOpen({ active: false, item: null })}
                projectData={projectData}
                onProjectDataUpdate={async (updatedProject) => {
                    const persistedProject = await persistEditorProject({
                        ...updatedProject,
                        projectId: activeProject.projectId,
                    });
                    applyPersistedEditorProject(updatedProject, persistedProject || undefined);
                }}
                itemToUpdate={isImageModalOpen.item}
                onImageUpload={onImageUpload}
                from={isImageModalOpen.from}
                // Multi-outlet: Pass governance for image generation filtering
                itemStates={isMasterLinked ? itemStates : undefined}
                isMasterLinked={isMasterLinked}
                allowInheritedImageOverride={outletPolicy?.imageOverride === true}
            />

            <ReorderMenuModal
                open={isReorderModalOpen}
                projectData={projectData}
                onClose={() => setIsReorderModalOpen(false)}
                onApply={(updatedProject) => {
                    setProjectData(updatedProject);
                    setActiveProject(updatedProject);
                    setHasChanges(true);
                    hasChangesRef.current = true;
                }}
            />
            <BulkStatusMenuModal
                open={isBulkStatusModalOpen}
                projectData={projectData}
                onClose={() => setIsBulkStatusModalOpen(false)}
                onApply={(updatedProject) => {
                    setProjectData(updatedProject);
                    setActiveProject(updatedProject);
                    setHasChanges(true);
                    hasChangesRef.current = true;
                }}
            />

            <DecisionBlocksSettingsModal
                open={isDecisionBlocksModalOpen}
                projectData={projectData}
                businessType={tenantDetails?.businessType}
                onClose={() => setIsDecisionBlocksModalOpen(false)}
                onApply={(updatedProject) => {
                    setProjectData(updatedProject);
                    setActiveProject(updatedProject);
                    setHasChanges(true);
                    hasChangesRef.current = true;
                }}
            />

            <LanguageSelectorModal
                projectData={projectData}
                handleLanguageToggle={handleLanguageToggle}
                open={isLanguageModalOpen}
                onClose={() => setIsLanguageModalOpen(false)}
                isTranslating={isTranslating}
                translationProgress={translationProgress}
                onCancelTranslation={handleCancelTranslation}
                storeDetails={storeDetails}
                // Multi-outlet: Pass master project languages for outlet language activation
                masterProjectLanguages={isMasterLinked ? masterProjectLanguages : undefined}
                isMasterLinked={isMasterLinked}
            />

            <KeyboardShortcutsHelp
                open={isShortcutsHelpOpen}
                onClose={() => setIsShortcutsHelpOpen(false)}
            />

            {/* Edit Category Modal (for keyboard shortcuts) */}
            {editCategoryModalState.file && (
                <EditCategoryModal
                    modalData={{
                        active: editCategoryModalState.active,
                        category: editCategoryModalState.category,
                        status: editCategoryModalState.status,
                    }}
                    onClose={() =>
                        setEditCategoryModalState({
                            active: false,
                            category: null,
                            status: "edit",
                            file: null,
                        })
                    }
                    selectedLanguages={projectData.languages || ["en"]}
                    setUpdatedFileData={handleModalFileUpdate}
                    fileData={editCategoryModalState.file}
                    projectData={projectData}
                    inheritanceState={editCategoryModalState.category?.id ? categoryStates[editCategoryModalState.category.id] : undefined}
                    isMasterLinked={isMasterLinked}
                />
            )}

            {/* Edit Item Modal (for keyboard shortcuts) */}
            {editItemModalState.file && (
                <EditItemModal
                    modalData={{
                        active: editItemModalState.active,
                        item: editItemModalState.item,
                        status: editItemModalState.status,
                    }}
                    onClose={() =>
                        setEditItemModalState({
                            active: false,
                            item: null,
                            status: "edit",
                            file: null,
                        })
                    }
                    selectedLanguages={projectData.languages || ["en"]}
                    projectData={projectData}
                    onImageUpload={onImageUpload}
                    openAddImageModal={(itemData) =>
                        setIsImageModalOpen({ active: true, item: itemData, from: "item" })
                    }
                    onProjectDataUpdate={async (updatedProject) => {
                        const persistedProject = await persistEditorProject(updatedProject);
                        applyPersistedEditorProject(updatedProject, persistedProject || undefined);
                    }}
                    setUpdatedFileData={handleModalFileUpdate}
                    fileData={editItemModalState.file}
                    inheritanceState={editItemModalState.item?.id ? itemStates[editItemModalState.item.id] : undefined}
                    isMasterLinked={isMasterLinked}
                    outletPolicy={outletPolicy}
                />
            )}

            {/* Menu Command Center Modal (Bulk Operations) */}
            {FEATURE_FLAGS.ENABLE_MENU_COMMAND_CENTER && (
                <CommandCenterModal
                    open={isCommandCenterOpen}
                    projectData={projectData}
                    isMasterLinked={isMasterLinked}
                    itemStates={itemStates}
                    categoryStates={categoryStates}
                    masterPrices={masterPrices}
                    storeName={storeContextName}
                    onClose={() => setIsCommandCenterOpen(false)}
                    onApply={(updatedProject) => {
                        setProjectData(updatedProject);
                        setActiveProject(updatedProject);
                        setHasChanges(true);
                        hasChangesRef.current = true;
                    }}
                />
            )}

            {/* Store Customization Modal (Outlet-only - FR-5 overrides) */}
            {FEATURE_FLAGS.ENABLE_MULTI_OUTLET && isMasterLinked && (
                <StoreCustomizationModal
                    open={isStoreCustomizationModalOpen}
                    onClose={() => setIsStoreCustomizationModalOpen(false)}
                    projectData={projectData}
                    setProjectData={setProjectData}
                    itemStates={itemStates}
                    categoryStates={categoryStates}
                    masterPrices={masterPrices}
                    outletPolicy={outletPolicy}
                />
            )}
        </Flex>
    );
}

export default Editor;
