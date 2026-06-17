"use client";

import { useMemo, useState } from "react";
import { LuBookmark, LuPackageCheck, LuRefreshCw, LuSearch } from "react-icons/lu";
import {
    CAMPAIGNCUE_DEFAULT_OUTPUT_PICKER_ITEM_ID,
    CAMPAIGNCUE_OUTPUT_PICKER_GROUPS,
    CAMPAIGNCUE_OUTPUT_PICKER_ITEMS,
    campaignCueOutputItemMatchesTemplate,
    formatCampaignCueOutputTypeLabel,
    getCampaignCueOutputPickerItem,
    type CampaignCueOutputPickerItem,
} from "@constant/campaigncue/outputPicker";
import { CAMPAIGNCUE_PACK_TEMPLATE_OWNER_COPY } from "@constant/campaigncue/packTemplates";
import { searchCampaignCuePackTemplates } from "@lib/campaigncue/pack-templates/catalog";
import type { CampaignCuePackTemplateSummary } from "@type/campaigncuePackTemplates";
import styles from "./CampaignCueWorkspaceApp.module.scss";

interface PackTemplatePickerProps {
    businessCategory: string;
    canSaveCurrent: boolean;
    error?: string;
    loading: boolean;
    onCreateFromOutputIntent: (intent: CampaignCueOutputPickerItem) => void;
    onOpenTemplate: (template: CampaignCuePackTemplateSummary, intent?: CampaignCueOutputPickerItem) => void;
    onRefresh: () => void;
    onSaveCurrent: () => void;
    saving: boolean;
    showOutputPicker: boolean;
    templates: CampaignCuePackTemplateSummary[];
}

export default function PackTemplatePicker({
    businessCategory,
    canSaveCurrent,
    error,
    loading,
    onCreateFromOutputIntent,
    onOpenTemplate,
    onRefresh,
    onSaveCurrent,
    saving,
    showOutputPicker,
    templates,
}: PackTemplatePickerProps) {
    const [query, setQuery] = useState("");
    const [selectedOutputId, setSelectedOutputId] = useState(CAMPAIGNCUE_DEFAULT_OUTPUT_PICKER_ITEM_ID);
    const selectedOutput = getCampaignCueOutputPickerItem(selectedOutputId)
        || CAMPAIGNCUE_OUTPUT_PICKER_ITEMS[0];
    const searchedTemplates = useMemo(() => searchCampaignCuePackTemplates({
        query,
        templates,
    }), [query, templates]);
    const filteredTemplates = useMemo(() => (
        !showOutputPicker || selectedOutput.id === CAMPAIGNCUE_DEFAULT_OUTPUT_PICKER_ITEM_ID
            ? searchedTemplates
            : searchedTemplates.filter((template) => campaignCueOutputItemMatchesTemplate(selectedOutput, template))
    ), [searchedTemplates, selectedOutput, showOutputPicker]);
    const visibleTemplates = query.trim() || (showOutputPicker && selectedOutput.id !== CAMPAIGNCUE_DEFAULT_OUTPUT_PICKER_ITEM_ID)
        ? filteredTemplates.slice(0, 6)
        : filteredTemplates.slice(0, 1);
    const groupedOutputItems = useMemo(() => CAMPAIGNCUE_OUTPUT_PICKER_GROUPS.map((group) => ({
        group,
        items: CAMPAIGNCUE_OUTPUT_PICKER_ITEMS.filter((item) => item.groupId === group.id),
    })).filter((group) => group.items.length), []);
    const platformCount = templates.filter((template) => template.templateType === "platform").length;
    const workspaceCount = templates.filter((template) => template.templateType === "workspace").length;
    const selectedOutputHasAction = showOutputPicker && selectedOutput.id !== CAMPAIGNCUE_DEFAULT_OUTPUT_PICKER_ITEM_ID;

    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <div>
                    <span className={styles.eyebrow}>Reusable campaign bases</span>
                    <h2>Pack templates for this business category</h2>
                    <p>
                        Loaded from the {businessCategory} catalog. Search is local, so typing here does not create more Firebase reads.
                    </p>
                </div>
                <div className={styles.topActions}>
                    <button className={styles.ghostButton} onClick={onRefresh} type="button">
                        <LuRefreshCw size={16} />
                        Refresh
                    </button>
                    <button
                        className={styles.button}
                        disabled={!canSaveCurrent || saving}
                        onClick={onSaveCurrent}
                        title={canSaveCurrent ? undefined : CAMPAIGNCUE_PACK_TEMPLATE_OWNER_COPY.saveBlocked}
                        type="button"
                    >
                        <LuBookmark size={16} />
                        {saving ? "Saving..." : "Save current pack"}
                    </button>
                </div>
            </div>

            {showOutputPicker ? (
                <div className={styles.provider}>
                    <div className={styles.row}>
                        <div className={styles.titleBlock}>
                            <span className={styles.eyebrow}>Campaign outputs</span>
                            <h3>Choose what this pack should help with</h3>
                            <p>These are business-use outputs, not a generic design-format library.</p>
                        </div>
                        {selectedOutputHasAction ? (
                            <button className={styles.ghostButton} onClick={() => onCreateFromOutputIntent(selectedOutput)} type="button">
                                <LuPackageCheck size={16} />
                                {selectedOutput.actionLabel}
                            </button>
                        ) : null}
                    </div>
                    <div className={styles.outputPickerGroups}>
                        {groupedOutputItems.map(({ group, items }) => (
                            <div className={styles.outputPickerGroup} key={group.id}>
                                <div className={styles.titleBlock}>
                                    <h4>{group.title}</h4>
                                    <p>{group.description}</p>
                                </div>
                                <div className={styles.outputPickerActions}>
                                    {items.map((item) => {
                                        const selected = item.id === selectedOutput.id;
                                        return (
                                            <button
                                                aria-pressed={selected}
                                                className={selected ? styles.outputChoiceSelected : styles.outputChoice}
                                                key={item.id}
                                                onClick={() => setSelectedOutputId(item.id)}
                                                type="button"
                                            >
                                                <LuPackageCheck size={16} />
                                                <span>{item.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className={styles.muted}>{selectedOutput.description}</p>
                </div>
            ) : null}

            <div className={styles.provider}>
                <div className={styles.formGrid}>
                    <div className={styles.fieldWide}>
                        <label>Search templates</label>
                        <div className={styles.rowStart}>
                            <LuSearch size={18} />
                            <input
                                className={styles.input}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Festival, WhatsApp, Google, birthday, local offer..."
                                type="search"
                                value={query}
                            />
                        </div>
                    </div>
                </div>
                <div className={styles.chips}>
                    <span className={styles.chip}>Platform {platformCount}</span>
                    <span className={styles.chip}>Saved {workspaceCount}</span>
                    {showOutputPicker ? <span className={styles.chip}>{selectedOutput.title}</span> : null}
                    <span className={styles.chip}>{CAMPAIGNCUE_PACK_TEMPLATE_OWNER_COPY.noExtraReads}</span>
                </div>
            </div>

            {error ? (
                <div className={styles.empty}>
                    <p>{error}</p>
                </div>
            ) : null}

            {loading ? (
                <div className={styles.empty}>
                    <p>Loading campaign pack templates...</p>
                </div>
            ) : null}

            {!loading && !filteredTemplates.length ? (
                <div className={styles.empty}>
                    <p>
                        {selectedOutputHasAction
                            ? `No saved or platform pack matches ${selectedOutput.title.toLowerCase()} yet. You can still create this output pack from the current campaign cue.`
                            : CAMPAIGNCUE_PACK_TEMPLATE_OWNER_COPY.empty}
                    </p>
                    {selectedOutputHasAction ? (
                        <button className={styles.ghostButton} onClick={() => onCreateFromOutputIntent(selectedOutput)} type="button">
                            <LuPackageCheck size={16} />
                            {selectedOutput.actionLabel}
                        </button>
                    ) : null}
                </div>
            ) : null}

            {!loading && filteredTemplates.length ? (
                <div className={styles.grid}>
                    {visibleTemplates.map((template) => (
                        <article className={styles.provider} key={`${template.templateType}:${template.templateId}`}>
                            <div className={styles.rowStart}>
                                <div className={styles.iconBox}>
                                    <LuPackageCheck size={18} />
                                </div>
                                <div className={styles.titleBlock}>
                                    <h3>{template.title}</h3>
                                    <p>{template.description}</p>
                                </div>
                            </div>
                            <div className={styles.chips}>
                                <span className={styles.chip}>{template.templateType === "platform" ? "Platform" : "Saved"}</span>
                                <span className={styles.chip}>{template.templateKind.replace(/_/g, " ")}</span>
                                {template.eventTags.slice(0, 2).map((tag) => (
                                    <span className={styles.chip} key={tag}>{tag.replace(/_/g, " ")}</span>
                                ))}
                                {template.outputTypes.slice(0, 2).map((outputType) => (
                                    <span className={styles.chip} key={outputType}>{formatCampaignCueOutputTypeLabel(outputType)}</span>
                                ))}
                            </div>
                            <p>
                                {template.channels.slice(0, 4).join(", ")}
                                {template.channels.length > 4 ? "..." : ""}
                            </p>
                            <button className={styles.ghostButton} onClick={() => onOpenTemplate(template, selectedOutput)} type="button">
                                <LuPackageCheck size={16} />
                                Use pack base
                            </button>
                        </article>
                    ))}
                </div>
            ) : null}
        </section>
    );
}
