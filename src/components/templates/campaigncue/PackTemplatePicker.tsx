"use client";

import { useMemo, useState } from "react";
import { LuBookmark, LuPackageCheck, LuRefreshCw, LuSearch } from "react-icons/lu";
import { CAMPAIGNCUE_PACK_TEMPLATE_OWNER_COPY } from "@constant/campaigncue/packTemplates";
import { searchCampaignCuePackTemplates } from "@lib/campaigncue/pack-templates/catalog";
import type { CampaignCuePackTemplateSummary } from "@type/campaigncuePackTemplates";
import styles from "./CampaignCueWorkspaceApp.module.scss";

interface PackTemplatePickerProps {
    businessCategory: string;
    canSaveCurrent: boolean;
    error?: string;
    loading: boolean;
    onOpenTemplate: (template: CampaignCuePackTemplateSummary) => void;
    onRefresh: () => void;
    onSaveCurrent: () => void;
    saving: boolean;
    templates: CampaignCuePackTemplateSummary[];
}

export default function PackTemplatePicker({
    businessCategory,
    canSaveCurrent,
    error,
    loading,
    onOpenTemplate,
    onRefresh,
    onSaveCurrent,
    saving,
    templates,
}: PackTemplatePickerProps) {
    const [query, setQuery] = useState("");
    const filteredTemplates = useMemo(() => searchCampaignCuePackTemplates({
        query,
        templates,
    }), [query, templates]);
    const visibleTemplates = query.trim()
        ? filteredTemplates.slice(0, 6)
        : filteredTemplates.slice(0, 1);
    const platformCount = templates.filter((template) => template.templateType === "platform").length;
    const workspaceCount = templates.filter((template) => template.templateType === "workspace").length;

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
                    <p>{CAMPAIGNCUE_PACK_TEMPLATE_OWNER_COPY.empty}</p>
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
                            </div>
                            <p>
                                {template.channels.slice(0, 4).join(", ")}
                                {template.channels.length > 4 ? "..." : ""}
                            </p>
                            <button className={styles.ghostButton} onClick={() => onOpenTemplate(template)} type="button">
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
